import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withMandate, type SqlClient } from "@anesis/db";
import { EventBus } from "@anesis/events";
import { asId } from "@anesis/core/unsafe";
import type { AgentId, CorrelationId, MandateId } from "@anesis/core";
import { AgentRuntime, registerRetentionHandler, retentionSweeper } from "../index.js";
import type { Agent } from "../types.js";
import { closeTestDbs, makeDb, q, seedMandateWithObjective } from "./harness.js";

afterEach(closeTestDbs);

const M = asId<MandateId>("M");
const CORR = asId<CorrelationId>("corr-ret");

// Agent de test T2 : programme une action durable au daily.tick (aucun sleep en mémoire).
const t2Agent: Agent = {
  id: "reputation" as AgentId,
  ticks: ["daily.tick"],
  run: async (ctx) => {
    await ctx.startRun();
    await ctx.scheduleRetention({ name: "test_action", input: { x: 1 }, compensation: "undo" });
    // le run est mis en sleeping_retention ; rien n'est exécuté ici
  },
};

// Handler : reconstruit l'intention T2 (effet no-op ; le tool_call écrit par actAfterRetention = preuve).
registerRetentionHandler("test_action", () => ({
  name: "test_action",
  tier: "T2",
  input: {},
  reversible: false,
  compensation: "undo",
  effect: async () => undefined,
}));

/** Fait « voyager dans le temps » la retenue : la rend échue pour que le balayeur la mûrisse. */
async function matureRetentions(pg: SqlClient): Promise<void> {
  await withMandate(pg, "M", async () => {
    await pg.query("update retentions set due_at = now() - interval '1 minute'");
  });
}

describe("Retenue durable T2 (§1b) — programmation + balayeur, sans sleep", () => {
  let pg: SqlClient;
  let bus: EventBus;
  let rt: AgentRuntime;

  beforeEach(async () => {
    pg = await makeDb();
    await seedMandateWithObjective(pg, "M");
    bus = new EventBus(pg);
    rt = new AgentRuntime(pg, bus, { sleep: async () => {} });
    rt.register(t2Agent);
    rt.register(retentionSweeper);
  });

  it("programme la retenue (run en attente, RIEN exécuté), puis le balayeur l'exécute à échéance", async () => {
    await rt.fireTick("daily.tick", M, CORR);

    // Programmée, pas exécutée : run en sleeping_retention, aucune action.
    const ret = await q(pg, "M", "select status from retentions where action_name='test_action'");
    expect(ret).toHaveLength(1);
    expect(ret[0]?.status).toBe("pending");
    expect(Number((await q(pg, "M", "select count(*)::int as n from tool_calls"))[0]?.n)).toBe(0);
    const run1 = await q(pg, "M", "select status from agent_runs where agent_id='reputation'");
    expect(run1[0]?.status).toBe("sleeping_retention");

    // Échéance atteinte → le balayeur (hourly.tick) exécute.
    await matureRetentions(pg);
    await rt.fireTick("hourly.tick", M, CORR);

    const tc = await q(pg, "M", "select tier, retention_started_at from tool_calls where name='test_action'");
    expect(tc).toHaveLength(1);
    expect(tc[0]?.tier).toBe("T2");
    expect(tc[0]?.retention_started_at).not.toBeNull(); // fenêtre observée (durable)
    const retAfter = await q(pg, "M", "select status from retentions where action_name='test_action'");
    expect(retAfter[0]?.status).toBe("executed");
    const run2 = await q(pg, "M", "select status from agent_runs where agent_id='reputation'");
    expect(run2[0]?.status).toBe("completed");
  });

  it("arrêt d'urgence : la retenue échue n'est PAS exécutée (run annulé, exclu du balayage)", async () => {
    await rt.fireTick("daily.tick", M, CORR);
    // L'arrêt d'urgence annule le run en sleeping_retention.
    await withMandate(pg, "M", async () => {
      await pg.query("update agent_runs set status='cancelled', ended_at=now() where agent_id='reputation'");
    });
    await matureRetentions(pg);
    await rt.fireTick("hourly.tick", M, CORR);

    expect(Number((await q(pg, "M", "select count(*)::int as n from tool_calls where name='test_action'"))[0]?.n)).toBe(0);
    const ret = await q(pg, "M", "select status from retentions where action_name='test_action'");
    expect(ret[0]?.status).toBe("pending"); // jamais mûrie
  });
});
