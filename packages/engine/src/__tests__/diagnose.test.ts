import { describe, it, expect } from "vitest";
import { simulateProperty, COUNTRY_HOUSE_34 } from "../property.js";
import { benchMap } from "../benchmarks.js";
import { diagnose } from "../diagnose.js";
import { anticipate } from "../exposure.js";

const p = simulateProperty(COUNTRY_HOUSE_34, 1, "2026-01-01T00:00:00Z");
const d = diagnose(p, benchMap(), "2026-01-01T00:00:00Z");

describe("diagnosis", () => {
  it("orders actual ≤ attainable ≤ potential", () => {
    expect(d.actualGbp).toBeLessThanOrEqual(d.attainableGbp);
    expect(d.attainableGbp).toBeLessThanOrEqual(d.potentialGbp);
  });
  it("deduplicates: the deduplicated range midpoint is below the naive total and the method is stated", () => {
    const mid = (d.deduplicatedGbp.low + d.deduplicatedGbp.high) / 2;
    expect(mid).toBeLessThan(d.totalAddressableGbp);
    expect(d.dedupMethod).toMatch(/substitution_to_ota/);
  });
  it("identifies conversion as the limiting constraint for the reference property and explains why", () => {
    expect(d.binding).toBe("C-001");
    expect(d.bindingWhy).toMatch(/lowest in the new-guest chain/);
  });
  it("every constraint carries formula, evidence, assumptions, confidence and status", () => {
    for (const c of d.constraints) {
      expect(c.formula.length).toBeGreaterThan(10);
      expect(c.evidence.length).toBeGreaterThan(0);
      expect(c.assumptions.length).toBeGreaterThan(0);
      expect(c.confidence).toBeGreaterThan(0); expect(c.confidence).toBeLessThanOrEqual(1);
      expect(c.status).toBe("MODELLED");
      for (const e of c.evidence) expect(p.observations.some((o) => o.id === e)).toBe(true);
    }
  });
  it("a well-run property has no conversion gap and a different binding factor", () => {
    const well = simulateProperty({ ...COUNTRY_HOUSE_34, convMobile: 0.014, convDesktop: 0.024, otaShare: 0.33, repeatRate: 0.19 }, 1, "2026-01-01T00:00:00Z");
    const dw = diagnose(well, benchMap(), "2026-01-01T00:00:00Z");
    const c1 = dw.constraints.find((c) => c.id === "C-001")!;
    expect(c1.gapGbp.low).toBe(0);
    expect(c1.attainment).toBe(1);
    expect(dw.binding).not.toBe("C-001");
  });
  it("benchmark overrides change the diagnosis (assumptions are inputs, not constants)", () => {
    const d2 = diagnose(p, benchMap({ "conv.mobile.p50": 0.0068 }), "2026-01-01T00:00:00Z");
    expect(d2.constraints.find((c) => c.id === "C-001")!.gapGbp.low).toBe(0);
    expect(() => benchMap({ "not.a.benchmark": 1 })).toThrow();
  });
});

describe("forward exposure", () => {
  it("labels every probability as a modelled assumption and carries a formula", () => {
    for (const e of anticipate(p, benchMap())) {
      expect(e.probabilityBasis).toMatch(/MODELLED ASSUMPTION/);
      expect(e.formula.length).toBeGreaterThan(0);
      expect(e.valueAtRiskGbp.low).toBeLessThanOrEqual(e.valueAtRiskGbp.high);
      expect(e.status).toBe("MODELLED");
    }
  });
});
