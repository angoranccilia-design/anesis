import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withMandate, type SqlClient } from "@anesis/db";
import { EventBus, makeEvent } from "@anesis/events";
import { asId } from "@anesis/core/unsafe";
import type { ApprovalId, CorrelationId, EventId, MandateId, OperatorId } from "@anesis/core";
import { AgentRuntime, analyst, mediaBuyer, orchestrator } from "../index.js";
import { closeTestDbs, makeDb, q, seedMandateWithObjective } from "./harness.js";

afterEach(closeTestDbs);

const CORR = asId<CorrelationId>("corr-accept");
const M = asId<MandateId>("M");
const OP = asId<OperatorId>("op-cecilia");

describe("Test d'acceptation §8 — la chaîne s'exécute seule de bout en bout", () => {
  let pg: SqlClient;
  let bus: EventBus;
  let rt: AgentRuntime;

  beforeEach(async () => {
    pg = await makeDb();
    await seedMandateWithObjective(pg, "M");
    bus = new EventBus(pg);
    rt = new AgentRuntime(pg, bus, { sleep: async () => {} });
    rt.register(analyst);
    rt.register(orchestrator);
    rt.register(mediaBuyer);
  });

  it("daily.tick → Analyst → écart → Orchestrator (2 tâches) → Media Buyer T4 → approbation → exécution → weekly report", async () => {
    // ── Étapes 1-5 : le daily.tick propage jusqu'à l'attente d'approbation ──
    await rt.fireTick("daily.tick", M, CORR);

    const measurements = await q(pg, "M", "select type from events where type like 'measurement.%' order by type");
    expect(measurements.map((r) => r.type)).toEqual(["measurement.deviation_detected", "measurement.recorded"]);

    const tasks = await q(pg, "M", "select assigned_agent from tasks order by assigned_agent");
    expect(tasks.map((r) => r.assigned_agent)).toEqual(["conversion", "media-buyer"]);

    const notifs = await q(pg, "M", "select count(*)::int as n from notifications");
    expect(Number(notifs[0]?.n)).toBe(3); // 2 tâches + 1 demande d'approbation

    const approvals = await q(pg, "M", "select id, status, amount_pence from approvals");
    expect(approvals).toHaveLength(1);
    expect(approvals[0]?.status).toBe("pending");

    const mbBefore = await q(pg, "M", "select status from agent_runs where agent_id = 'media-buyer'");
    expect(mbBefore[0]?.status).toBe("awaiting_approval");

    // AUCUNE action T4 exécutée avant l'approbation.
    const tcBefore = await q(pg, "M", "select count(*)::int as n from tool_calls");
    expect(Number(tcBefore[0]?.n)).toBe(0);

    // ── Étape 6 : le founder approuve → événement human.approval_granted ──
    const approvalId = String(approvals[0]?.id);
    await withMandate(pg, "M", async () => {
      await pg.query("update approvals set status='granted', decided_by=$1, decided_at=now() where id=$2", ["op-cecilia", approvalId]);
    });
    await bus.append(
      makeEvent({
        id: asId<EventId>("evt-grant"),
        type: "human.approval_granted",
        payload: { approvalId: asId<ApprovalId>(approvalId), by: OP },
        correlationId: CORR,
        mandateId: M,
        emittedBy: OP,
      }),
    );
    await rt.drain();

    // Une action T4 exécutée, liée à l'approbation, approuvée AVANT l'exécution.
    const toolCalls = await q(pg, "M", "select tier, approval_id, approved_at, at from tool_calls");
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0]?.tier).toBe("T4");
    expect(toolCalls[0]?.approval_id).toBe(approvalId);
    expect(new Date(String(toolCalls[0]?.approved_at)).getTime()).toBeLessThanOrEqual(
      new Date(String(toolCalls[0]?.at)).getTime(),
    );

    // Run media-buyer clôturé AVEC human_minutes renseigné (donnée produit).
    const done = await q(
      pg,
      "M",
      "select human_minutes_spent, human_minutes_source from agent_runs where agent_id='media-buyer' and status='completed'",
    );
    expect(done).toHaveLength(1);
    expect(Number(done[0]?.human_minutes_spent)).toBe(3);
    expect(done[0]?.human_minutes_source).toBe("measured");

    const completed = await q(pg, "M", "select count(*)::int as n from events where type='agentrun.completed'");
    expect(Number(completed[0]?.n)).toBeGreaterThanOrEqual(1);

    // Étape 7 : l'Orchestrateur a mis à jour l'objectif.
    const obj = await q(pg, "M", "select state from objectives");
    expect(obj[0]?.state).toBe("active");

    // ── Étape 8 : weekly.tick → rapport hebdomadaire, sans qu'on le demande ──
    await rt.fireTick("weekly.tick", M, CORR);
    const report = await q(pg, "M", "select type from artifacts where type='weekly_report'");
    expect(report).toHaveLength(1);

    // Toute la chaîne partage le même correlationId.
    const corrs = await pg.query("select distinct correlation_id from events");
    expect(corrs.rows.map((r) => r.correlation_id)).toEqual([CORR]);
  });
});
