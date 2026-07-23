import { describe, expect, it } from "vitest";
import {
  AUTONOMY_TIERS,
  RETENTION_WINDOW_MS,
  TIER_POLICY,
  requiresBlockingApproval,
  requiresRetentionWindow,
  requiresReversibility,
} from "../autonomy.js";

describe("politique d'autonomie T0–T5", () => {
  it("T0/T1 ne demandent pas d'approbation bloquante", () => {
    expect(requiresBlockingApproval("T0")).toBe(false);
    expect(requiresBlockingApproval("T1")).toBe(false);
  });

  it("T2 = fenêtre de retenue (pas d'approbation bloquante), et 2h", () => {
    expect(requiresRetentionWindow("T2")).toBe(true);
    expect(requiresBlockingApproval("T2")).toBe(false);
    expect(RETENTION_WINDOW_MS).toBe(2 * 60 * 60 * 1000);
  });

  it("T3/T4/T5 = approbation humaine bloquante", () => {
    for (const t of ["T3", "T4", "T5"] as const) {
      expect(requiresBlockingApproval(t)).toBe(true);
    }
  });

  it("la réversibilité est exigée à partir de T2", () => {
    expect(requiresReversibility("T1")).toBe(false);
    for (const t of ["T2", "T3", "T4", "T5"] as const) {
      expect(requiresReversibility(t)).toBe(true);
    }
  });

  it("seul T0 est interne", () => {
    expect(TIER_POLICY.T0.external).toBe(false);
    expect(AUTONOMY_TIERS.filter((t) => TIER_POLICY[t].external)).toEqual(["T1", "T2", "T3", "T4", "T5"]);
  });
});
