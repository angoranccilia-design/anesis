/** Observed change on the property's own weekly history (SYNTHETIC series). */
import { describe, it, expect } from "vitest";
import { observedChange } from "../index.js";
const wk = (n: number, f: (i: number) => number | null) => Array.from({ length: n }, (_, i) => ({ weekStart: new Date(Date.parse("2025-01-06T00:00:00Z") + i * 7 * 86_400_000).toISOString().slice(0, 10), roomNights: 100, revenueGbp: f(i) }));
describe("observedChange", () => {
  it("flat history with a step after execution: the step is the observed change, seasonally adjusted by the prior year, and NOT_ESTABLISHED", () => {
    const o = observedChange({ weekly: wk(80, (i) => 20_000 + (i >= 69 ? 1_500 : 0)), executedAt: "2026-05-04", windowWeeks: 4 }, "2026-06-10T00:00:00Z");
    expect(o).toMatchObject({ preWeeks: 4, postWeeks: 4, complete: true, before: 20_000, after: 21_500, incrementality: "NOT_ESTABLISHED" }); expect(o.observedChange).toBeCloseTo(1_500, 6); expect(o.seasonalAdjustment.applied).toBe(true); expect(o.seasonalAdjustment.priorYearRatio).toBeCloseTo(1, 6);
  });
  it("a seasonal rise that also happened last year is removed: no change is observed", () => {
    const season = (i: number) => 20_000 + (i % 52 >= 20 && i % 52 < 30 ? 6_000 : 0);
    const o = observedChange({ weekly: wk(90, season), executedAt: wk(90, season)[72]!.weekStart, windowWeeks: 4 }, "2026-09-01T00:00:00Z");
    expect(o.seasonalAdjustment.applied).toBe(true); expect(Math.abs(o.observedChange ?? 99)).toBeLessThan(1e-6);
  });
  it("short history: no prior year, no adjustment, partial window flagged; unknown revenue weeks are ignored", () => {
    const o = observedChange({ weekly: wk(12, (i) => (i === 3 ? null : 10_000 + i * 100)), executedAt: wk(12, () => 1)[8]!.weekStart, windowWeeks: 8 }, "2025-04-01T00:00:00Z");
    expect(o.seasonalAdjustment.applied).toBe(false); expect(o.complete).toBe(false); expect(o.preWeeks).toBe(7); expect(o.postWeeks).toBe(4); expect(o.note).toMatch(/partial/);
  });
});
