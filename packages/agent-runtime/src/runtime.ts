/**
 * Runtime d'agents ANESIS.
 *
 * Garanties tenues ici :
 *  - CHOKEPOINT : une action ne s'exécute JAMAIS sans passer par `authorize()`. Le seul endroit qui
 *    exécute un effet externe et écrit dans `tool_calls` est `RuntimeContext.act()` ci-dessous ; les
 *    agents n'y accèdent que via `ctx.act()`. (Gardé par un test structurel.)
 *  - SLEEP T2 : la fenêtre de retenue réelle vit ici (injectable). Au réveil, on RE-`authorize()` avec
 *    `retentionElapsed: true` — jamais on ne suppose l'autorisation acquise.
 *  - `human_minutes_spent` / `human_minutes_source` : renseignés dès `completeRun()`.
 *
 * Pas de transaction imbriquée : `ctx.emit()` fait un APPEND (persistance) ; la distribution se fait
 * dans une boucle de drain (`bus.replay()`) au niveau supérieur, une livraison = une transaction.
 */
import { randomUUID } from "node:crypto";
import {
  iso,
  type AgentId,
  type AgentRunId,
  type CorrelationId,
  type EventId,
  type EventPayloadMap,
  type EventType,
  type MandateId,
  type TickType,
  type ToolCallRecord,
} from "@anesis/core";
import { asId } from "@anesis/core/unsafe";
import { withMandate, type SqlClient } from "@anesis/db";
import { EventBus, makeEvent } from "@anesis/events";
import { authorize, type PolicyOutcome } from "@anesis/policy";
import type { Agent, AgentContext, ToolIntent, Trigger } from "./types.js";

export interface RuntimeOptions {
  /** Le sleep réel de la fenêtre de retenue T2 (injectable ; no-op en test). */
  sleep?: (ms: number) => Promise<void>;
  /** Coupure d'urgence globale (le worker système la fournit). */
  globalStopped?: boolean;
}

const uid = (prefix: string): string => `${prefix}-${randomUUID()}`;

class RuntimeContext implements AgentContext {
  runId: AgentRunId = asId<AgentRunId>("");

  constructor(
    private readonly rt: AgentRuntime,
    readonly agentId: AgentId,
    readonly mandateId: MandateId | null,
    readonly correlationId: CorrelationId,
    readonly trigger: Trigger,
  ) {}

  get client(): SqlClient {
    return this.rt.client;
  }

  async startRun(): Promise<AgentRunId> {
    const id = asId<AgentRunId>(uid("run"));
    await this.client.query(
      `insert into agent_runs (id, agent_id, mandate_id, trigger, status, human_minutes_spent, human_minutes_source, correlation_id)
       values ($1, $2, $3, $4::jsonb, 'started', 0, 'measured', $5)`,
      [id, this.agentId, this.mandateId, JSON.stringify(this.trigger), this.correlationId],
    );
    this.runId = id;
    return id;
  }

  async resumeRun(runId: AgentRunId): Promise<void> {
    await this.client.query("update agent_runs set status = 'started' where id = $1", [runId]);
    this.runId = runId;
  }

  async suspendForApproval(): Promise<void> {
    await this.client.query("update agent_runs set status = 'awaiting_approval' where id = $1", [this.runId]);
  }

  async completeRun(humanMinutes: number, source: "measured" | "estimated"): Promise<void> {
    await this.client.query(
      "update agent_runs set status = 'completed', human_minutes_spent = $1, human_minutes_source = $2, ended_at = now() where id = $3",
      [humanMinutes, source, this.runId],
    );
    await this.emit("agentrun.completed", { runId: this.runId, humanMinutesSpent: humanMinutes, costTokens: 0 });
  }

  async emit<T extends EventType>(type: T, payload: EventPayloadMap[T]): Promise<EventId> {
    const id = asId<EventId>(uid("evt"));
    const event = makeEvent({
      id,
      type,
      payload,
      correlationId: this.correlationId,
      mandateId: this.mandateId,
      emittedBy: this.agentId,
    });
    await this.rt.bus.append(event);
    return id;
  }

  private async isMandateStopped(): Promise<boolean> {
    if (this.mandateId === null) return false; // run système : pas de mandat à arrêter
    const { rows } = await this.client.query("select emergency_stopped from mandates where id = $1", [this.mandateId]);
    return rows[0]?.emergency_stopped === true;
  }

  private buildRecord(intent: ToolIntent, at: ToolCallRecord["at"], retentionStartedAt: ToolCallRecord["at"] | null): ToolCallRecord {
    return {
      name: intent.name,
      tier: intent.tier,
      input: intent.input,
      output: {},
      at,
      approvalId: intent.approval?.id ?? null,
      approvedBy: intent.approval?.decidedBy ?? null,
      approvedAt: intent.approval?.decidedAt ?? null,
      retentionStartedAt,
      reversible: intent.reversible ?? false,
      compensation: intent.compensation ?? null,
    };
  }

  /** SEUL point d'exécution d'une action. authorize() d'abord, toujours. */
  async act(intent: ToolIntent): Promise<PolicyOutcome> {
    // Run système (hors mandat) : restreint à T0, cohérent avec l'invariant SYSTEM_RUN_TIER du domaine.
    if (this.mandateId === null && intent.tier !== "T0") {
      return { kind: "deny", code: "SYSTEM_RUN_TIER", reason: "un run système (hors mandat) est limité à T0" };
    }
    const mandateStopped = await this.isMandateStopped();
    const pctx = {
      globalStop: this.rt.globalStopped,
      mandateStopped,
      approval: intent.approval ?? null,
      retentionElapsed: false,
    };

    const at = iso();
    let record = this.buildRecord(intent, at, null);
    let outcome = authorize(record, pctx);

    if (outcome.kind === "retain") {
      // Fenêtre de retenue T2 : le sleep réel vit ICI (runtime), pas dans policy.
      const retentionStart = at;
      await this.rt.sleep(outcome.windowMs);
      const at2 = iso();
      record = this.buildRecord(intent, at2, retentionStart);
      // RE-authorize au réveil — on ne suppose jamais l'autorisation acquise.
      outcome = authorize(record, { ...pctx, retentionElapsed: true });
    }

    if (outcome.kind === "allow") {
      await intent.effect(this.client); // effet externe réel
      await this.insertToolCall(record); // seule écriture dans tool_calls du monorepo
    }
    return outcome;
  }

  private async insertToolCall(record: ToolCallRecord): Promise<void> {
    await this.client.query(
      `insert into tool_calls (id, mandate_id, run_id, name, tier, input, output, at, approval_id, approved_by, approved_at, retention_started_at, reversible, compensation)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12, $13, $14)`,
      [
        uid("tc"),
        this.mandateId,
        this.runId,
        record.name,
        record.tier,
        JSON.stringify(record.input),
        JSON.stringify(record.output),
        record.at,
        record.approvalId,
        record.approvedBy,
        record.approvedAt,
        record.retentionStartedAt,
        record.reversible,
        record.compensation,
      ],
    );
  }
}

export class AgentRuntime {
  readonly sleep: (ms: number) => Promise<void>;
  readonly globalStopped: boolean;
  private readonly tickAgents = new Map<TickType, Agent[]>();

  constructor(
    readonly client: SqlClient,
    readonly bus: EventBus,
    opts: RuntimeOptions = {},
  ) {
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.globalStopped = opts.globalStopped ?? false;
  }

  register(agent: Agent): void {
    if (agent.events && agent.events.length > 0) {
      this.bus.subscribe({
        name: agent.id,
        types: agent.events,
        handle: async ({ event }) => {
          const ctx = new RuntimeContext(
            this,
            agent.id,
            event.mandateId as MandateId,
            event.correlationId,
            { kind: "event", type: event.type, payload: event.payload },
          );
          await agent.run(ctx);
        },
      });
    }
    for (const tick of agent.ticks ?? []) {
      const list = this.tickAgents.get(tick) ?? [];
      list.push(agent);
      this.tickAgents.set(tick, list);
    }
  }

  /** Déclenche un tick pour un mandat, puis propage toute la chaîne (drain). */
  async fireTick(tick: TickType, mandateId: MandateId, correlationId: CorrelationId): Promise<void> {
    for (const agent of this.tickAgents.get(tick) ?? []) {
      await withMandate(this.client, mandateId, async () => {
        const ctx = new RuntimeContext(this, agent.id, mandateId, correlationId, { kind: "tick", tick });
        await agent.run(ctx);
      });
    }
    await this.drain();
  }

  /**
   * Exécute une fonction dans un contexte SYSTÈME (hors mandat, restreint à T0), en transaction.
   * Utilisé par l'underwriter pour évaluer des prospects qui n'ont pas encore de mandat.
   */
  async runSystem<T>(
    agentId: AgentId,
    correlationId: CorrelationId,
    fn: (ctx: AgentContext) => Promise<T>,
  ): Promise<T> {
    await this.client.query("begin");
    try {
      const ctx = new RuntimeContext(this, agentId, null, correlationId, { kind: "system", reason: "system" });
      const result = await fn(ctx);
      await this.client.query("commit");
      return result;
    } catch (err) {
      await this.client.query("rollback");
      throw err;
    }
  }

  /** Distribue les événements en attente jusqu'au point fixe (idempotent via processed_events). */
  async drain(maxPasses = 30): Promise<void> {
    for (let i = 0; i < maxPasses; i++) {
      const before = await this.processedCount();
      await this.bus.replay();
      if ((await this.processedCount()) === before) return;
    }
    throw new Error("drain: point fixe non atteint (boucle d'événements ?)");
  }

  private async processedCount(): Promise<number> {
    const { rows } = await this.client.query("select count(*)::int as n from processed_events");
    return Number(rows[0]?.n ?? 0);
  }
}
