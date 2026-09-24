import { describe, it, expect } from "vitest";
import { runCycle, compareRuns, deterministicView } from "../cycle.js";
import { EngineBus } from "../bus.js";

describe("full decision cycle", () => {
  it("is deterministic: same seed and inputs give the same result apart from real event timestamps", () => {
    const a = runCycle({ seed: 11, budgetGbp: 16_000, now: "2026-01-01T00:00:00Z" });
    const b = runCycle({ seed: 11, budgetGbp: 16_000, now: "2026-01-01T00:00:00Z" });
    expect(deterministicView(a)).toEqual(deterministicView(b));
    expect(compareRuns(a, b)).toEqual([]);
  });
  it("a changed assumption is visible in the comparison", () => {
    const a = runCycle({ seed: 11, budgetGbp: 16_000, now: "2026-01-01T00:00:00Z", measure: false });
    const b = runCycle({ seed: 11, budgetGbp: 16_000, now: "2026-01-01T00:00:00Z", measure: false, benchmarks: { "conv.mobile.p50": 0.020 } });
    const diff = compareRuns(a, b);
    expect(diff.some((d) => d.field === "benchmarks")).toBe(true);
    expect(diff.some((d) => d.field === "diagnosis.deduplicatedGbp")).toBe(true);
  });
  it("emits an ordered event stream with real timestamps and engine states, ending IDLE", () => {
    const bus = new EngineBus();
    const seen: string[] = []; bus.subscribe((e) => seen.push(e.type));
    const before = Date.now();
    const r = runCycle({ seed: 1, budgetGbp: 16_000, bus });
    expect(seen[0]).toBe("CYCLE_STARTED"); expect(seen.at(-1)).toBe("CYCLE_COMPLETE");
    expect(bus.state).toBe("IDLE");
    const states = new Set(r.events.map((e) => e.state));
    for (const s of ["OBSERVING", "DIAGNOSING", "INVESTIGATING", "COMPARING", "DECIDING", "BLOCKING", "MEASURING", "LEARNING", "IDLE"]) expect(states.has(s as never)).toBe(true);
    for (const e of r.events) { expect(Date.parse(e.at)).toBeGreaterThanOrEqual(before - 1); }
    expect(r.events.map((e) => e.seq)).toEqual(r.events.map((_, i) => i + 1));
  });
  it("labels the data as simulated in the stream", () => {
    const r = runCycle({ seed: 1, budgetGbp: 16_000, now: "2026-01-01T00:00:00Z", measure: false });
    expect(r.events.some((e) => e.detail.includes("SIMULATED PROPERTY DATA"))).toBe(true);
  });
});
