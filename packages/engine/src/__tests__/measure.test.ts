import { describe, it, expect } from "vitest";
import { nnls, synthFit, measure } from "../measure.js";
import { preregister, verifyPlan, predictiveInterval } from "../register.js";
import { simulateProperty, COUNTRY_HOUSE_34, WEEKS_PRE } from "../property.js";
import { runCycle } from "../cycle.js";
import { calibrationFactors } from "../learn.js";

describe("pre-registration", () => {
  const r = runCycle({ seed: 1, budgetGbp: 16_000, now: "2026-01-01T00:00:00Z", measure: false });
  const funded = r.interventions.filter((i) => r.decision.selected.includes(i.id));
  const plan = preregister("MP-T", funded, "2026-01-01T00:00:00Z");
  it("hashes the plan and detects any change", () => {
    expect(verifyPlan(plan)).toBe(true);
    expect(verifyPlan({ ...plan, windowWeeks: 26 })).toBe(false);
    expect(verifyPlan({ ...plan, successRule: plan.successRule + " " })).toBe(false);
  });
  it("a change produces a new version naming the one it supersedes; the old one is untouched", () => {
    const v2 = preregister("MP-T", funded.slice(0, 1), "2026-02-01T00:00:00Z", plan);
    expect(v2.version).toBe(2); expect(v2.supersedes).toBe("MP-T@v1");
    expect(v2.sha256).not.toBe(plan.sha256); expect(verifyPlan(plan)).toBe(true);
  });
  it("the predictive interval is fixed-seed deterministic and P10 ≤ mean ≤ P90", () => {
    const a = predictiveInterval(funded), b = predictiveInterval(funded);
    expect(a).toEqual(b); expect(a.p10).toBeLessThanOrEqual(a.mean); expect(a.mean).toBeLessThanOrEqual(a.p90);
  });
});

describe("synthetic control", () => {
  it("nnls returns non-negative weights and fits an exact non-negative combination", () => {
    const A = [[1, 0], [0, 1], [1, 1]], b = [2, 3, 5];
    const x = nnls(A, b); expect(x[0]).toBeCloseTo(2, 5); expect(x[1]).toBeCloseTo(3, 5);
    const y = nnls([[1], [1]], [-1, -1]); expect(y[0]).toBe(0);
  });
  it("weights sum to one and are non-negative", () => {
    const p = simulateProperty(COUNTRY_HOUSE_34, 3, "2026-01-01T00:00:00Z");
    const f = synthFit([p.series.property, ...p.series.comparables], 0);
    expect(f.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    for (const w of f.weights) expect(w).toBeGreaterThanOrEqual(0);
    expect(f.preRmspe).toBeLessThan(0.2);
  });
  it("returns INCONCLUSIVE when there is no effect (does not force a positive)", () => {
    let inconclusive = 0, established = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const p = simulateProperty(COUNTRY_HOUSE_34, seed, "2026-01-01T00:00:00Z");
      const plan = preregister("MP-0", [], "2026-01-01T00:00:00Z");
      const m = measure(plan, p.series.property, p.series.comparables, "2026-01-01T00:00:00Z");
      if (m.status === "INCONCLUSIVE") inconclusive++; if (m.status === "ESTABLISHED") established++;
      expect(m.planStatus).not.toBe("VALIDATED");
    }
    expect(inconclusive).toBeGreaterThanOrEqual(9); // 90 % interval: a few false positives are expected and reported, not hidden
    expect(established).toBeLessThanOrEqual(2);
  });
  it("recovers a known +12 % effect within the 90 % interval for most seeds", () => {
    let covered = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const p = simulateProperty(COUNTRY_HOUSE_34, seed, "2026-01-01T00:00:00Z");
      const y = p.series.property.map((v, t) => (t >= WEEKS_PRE ? v * 1.12 : v));
      const plan = preregister("MP-0", [], "2026-01-01T00:00:00Z");
      const m = measure(plan, y, p.series.comparables, "2026-01-01T00:00:00Z");
      if (m.effectPct - 1.645 * m.sePct <= 0.12 && 0.12 <= m.effectPct + 1.645 * m.sePct) covered++;
      expect(m.status).not.toBe("INCONCLUSIVE");
    }
    expect(covered).toBeGreaterThanOrEqual(9);
  });
});

describe("learning", () => {
  it("claims calibration only when a factor actually changed; inconclusive measurements never calibrate", () => {
    const r1 = runCycle({ seed: 1, budgetGbp: 16_000, now: "2026-01-01T00:00:00Z" });
    expect(r1.measurement!.status).not.toBe("INCONCLUSIVE");
    expect(r1.learning!.calibrationApplied).toBe(true);
    expect(r1.calibrationAfter["I-001"]!.factor).not.toBe(1);
    const r5 = runCycle({ seed: 5, budgetGbp: 16_000, now: "2026-01-01T00:00:00Z" });
    expect(r5.measurement!.status).toBe("INCONCLUSIVE");
    expect(r5.learning!.calibrationApplied).toBe(false);
    expect(calibrationFactors([r5.learning!], ["I-001"])).toEqual({});
  });
  it("memory changes the next cycle's estimates and is shrunk n/(n+3)", () => {
    const r1 = runCycle({ seed: 1, budgetGbp: 16_000, now: "2026-01-01T00:00:00Z" });
    const r2 = runCycle({ seed: 1, budgetGbp: 16_000, now: "2026-01-01T00:00:00Z", memory: [r1.learning!], cycleNumber: 2 });
    const i1 = r2.interventions.find((i) => i.id === "I-001")!;
    expect(i1.calibration).toEqual({ factor: r1.calibrationAfter["I-001"]!.factor, cycles: 1 });
    expect(Math.abs(i1.calibration!.factor - 1)).toBeLessThan(Math.abs(r1.learning!.error)); // shrinkage
  });
});
