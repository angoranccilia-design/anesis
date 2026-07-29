import { describe, expect, it } from "vitest";
import { canApproveTier, canEmergencyStopGlobal, canEmergencyStopMandate } from "../operator.js";
import type { AgentId } from "../agent.js";
import { anOperator } from "./factories.js";

describe("rôles opérateurs", () => {
  const founder = anOperator({ role: "founder" });
  const operator = anOperator({ role: "operator", name: "Léa" });

  it("sans délégation, seul le founder approuve T3/T4/T5", () => {
    for (const t of ["T3", "T4", "T5"] as const) {
      expect(canApproveTier(founder, t)).toBe(true);
      expect(canApproveTier(operator, t)).toBe(false);
    }
  });

  it("les deux rôles 'approuvent' implicitement les niveaux non bloquants", () => {
    expect(canApproveTier(operator, "T0")).toBe(true);
    expect(canApproveTier(operator, "T2")).toBe(true);
  });

  it("l'arrêt d'urgence global est réservé au founder ; par mandat est ouvert aux deux", () => {
    expect(canEmergencyStopGlobal(founder)).toBe(true);
    expect(canEmergencyStopGlobal(operator)).toBe(false);
    expect(canEmergencyStopMandate(operator)).toBe(true);
  });
});

describe("délégation d'approbation par opérateur", () => {
  const founder = anOperator({ role: "founder" });
  const lea = anOperator({ role: "operator", name: "Léa" });

  it("un operator approuve T3/T4 pour un agent qu'il supervise, pas pour un autre", () => {
    const del = (agentId: AgentId) => ({ agentId, supervises: ["media-buyer"] as AgentId[] });
    expect(canApproveTier(lea, "T4", del("media-buyer"))).toBe(true);
    expect(canApproveTier(lea, "T3", del("media-buyer"))).toBe(true);
    expect(canApproveTier(lea, "T4", del("rate-distribution"))).toBe(false);
  });

  it("T5 art-director : un operator ne l'approuve QUE s'il est assigné comme Directrice Artistique", () => {
    expect(canApproveTier(lea, "T5", { agentId: "art-director", supervises: ["art-director"] })).toBe(true);
    expect(canApproveTier(lea, "T5", { agentId: "art-director", supervises: ["content-creator"] })).toBe(false);
  });

  it("le founder approuve tout, même avec une délégation vide ou absente", () => {
    expect(canApproveTier(founder, "T5")).toBe(true);
    expect(canApproveTier(founder, "T5", { agentId: "art-director", supervises: [] })).toBe(true);
  });

  it("un operator avec une supervision vide n'approuve rien de bloquant", () => {
    expect(canApproveTier(lea, "T3", { agentId: "media-buyer", supervises: [] })).toBe(false);
  });
});
