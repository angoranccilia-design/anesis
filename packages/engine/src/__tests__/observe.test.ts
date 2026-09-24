import { describe, it, expect } from "vitest";
import { simulateProperty, checkConsistency, SOURCES, COUNTRY_HOUSE_34 } from "../property.js";

describe("observation layer", () => {
  it("produces an internally consistent simulated property for many seeds", () => {
    for (let seed = 1; seed <= 25; seed++) expect(checkConsistency(simulateProperty(COUNTRY_HOUSE_34, seed, "2026-01-01T00:00:00Z"))).toEqual([]);
  });
  it("every observation carries provenance: source, timestamp, status, transformation, evidence that resolves", () => {
    const p = simulateProperty(COUNTRY_HOUSE_34, 1, "2026-01-01T00:00:00Z");
    for (const o of p.observations) {
      expect(SOURCES.some((s) => s.id === o.source)).toBe(true);
      expect(o.timestamp).toBe("2026-01-01T00:00:00Z");
      expect(["SIMULATED", "MODELLED"]).toContain(o.status);
      expect(o.transformation.length).toBeGreaterThan(0);
      for (const e of o.evidence) expect(p.observations.some((x) => x.id === e)).toBe(true);
    }
    expect(p.observations.filter((o) => o.status === "VERIFIED")).toHaveLength(0);
  });
  it("is deterministic by seed", () => {
    const a = simulateProperty(COUNTRY_HOUSE_34, 7, "2026-01-01T00:00:00Z"), b = simulateProperty(COUNTRY_HOUSE_34, 7, "2026-01-01T00:00:00Z");
    expect(a).toEqual(b);
    expect(simulateProperty(COUNTRY_HOUSE_34, 8, "2026-01-01T00:00:00Z").series.property).not.toEqual(a.series.property);
  });
});
