import { describe, expect, it } from "vitest";
import { canApproveTier, canEmergencyStopGlobal, canEmergencyStopMandate } from "../operator.js";
import { anOperator } from "./factories.js";

describe("rôles opérateurs", () => {
  const founder = anOperator({ role: "founder" });
  const operator = anOperator({ role: "operator", name: "Léa" });

  it("seul le founder approuve T3/T4/T5", () => {
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
