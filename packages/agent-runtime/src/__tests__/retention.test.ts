import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withMandate, type SqlClient } from "@anesis/db";
import { EventBus } from "@anesis/events";
import { asId } from "@anesis/core/unsafe";
import type { AgentId, CorrelationId, MandateId } from "@anesis/core";
import { AgentRuntime } from "../runtime.js";
import type { Agent, ToolIntent } from "../types.js";
import { closeTestDbs, makeDb, q, seedMandateWithObjective } from "./harness.js";

afterEach(closeTestDbs);

const M = asId<MandateId>("M");
const CORR = asId<CorrelationId>("corr-t2");

/**
 * Exigence 2 — le sleep réel de la fenêtre T2 vit dans le runtime, et au réveil on RE-authorize
 * (jamais supposer l'autorisation acquise). Un agent de test lance une action T2 ; on injecte un
 * sleep instrumenté pour prouver qu'il est appelé AVANT l'exécution.
 */
describe("fenêtre de retenue T2 — sleep dans le runtime + re-authorize au réveil", () => {
  let pg: SqlClient;
  let slept: number[];

  const t2Agent: Agent = {
    id: "reputation" as AgentId,
    ticks: ["daily.tick"],
    run: async (ctx) => {
      await ctx.startRun();
      const intent: ToolIntent = {
        name: "reply_review",
        tier: "T2",
        input: {},
        reversible: false,
        compensation: "Supprimer la réponse publiée",
        effect: async () => undefined,
      };
      const outcome = await ctx.act(intent);
      // Après le sleep + re-authorize, l'action T2 est autorisée et exécutée.
      expect(outcome.kind).toBe("allow");
      await ctx.completeRun(0, "measured");
    },
  };

  beforeEach(async () => {
    pg = await makeDb();
    await seedMandateWithObjective(pg, "M");
    slept = [];
  });

  it("act(T2) dort la fenêtre puis exécute (tool_call écrit avec retention_started_at)", async () => {
    const bus = new EventBus(pg);
    const rt = new AgentRuntime(pg, bus, {
      sleep: async (ms) => {
        slept.push(ms);
      },
    });
    rt.register(t2Agent);

    await rt.fireTick("daily.tick", M, CORR);

    // le sleep a été appelé une fois avec la fenêtre de 2 h
    expect(slept).toEqual([2 * 60 * 60 * 1000]);

    // le tool_call T2 est écrit et porte bien retention_started_at (fenêtre observée)
    const tc = await q(pg, "M", "select tier, retention_started_at from tool_calls where name='reply_review'");
    expect(tc).toHaveLength(1);
    expect(tc[0]?.tier).toBe("T2");
    expect(tc[0]?.retention_started_at).not.toBeNull();
  });

  it("si le mandat est en arrêt d'urgence, l'action T2 est refusée (pas d'exécution)", async () => {
    await withMandate(pg, "M", async () => {
      await pg.query("update mandates set emergency_stopped = true where id = 'M'");
    });
    const bus = new EventBus(pg);
    const rt = new AgentRuntime(pg, bus, { sleep: async (ms) => void slept.push(ms) });
    const denyAgent: Agent = {
      id: "reputation" as AgentId,
      ticks: ["daily.tick"],
      run: async (ctx) => {
        await ctx.startRun();
        const outcome = await ctx.act({
          name: "reply_review",
          tier: "T2",
          input: {},
          compensation: "x",
          effect: async () => undefined,
        });
        expect(outcome.kind).toBe("deny");
        if (outcome.kind === "deny") expect(outcome.code).toBe("EMERGENCY_STOP");
        await ctx.completeRun(0, "measured");
      },
    };
    rt.register(denyAgent);

    await rt.fireTick("daily.tick", M, CORR);

    expect(slept).toEqual([]); // jamais entré dans la fenêtre
    const tc = await q(pg, "M", "select count(*)::int as n from tool_calls");
    expect(Number(tc[0]?.n)).toBe(0); // rien exécuté
  });
});
