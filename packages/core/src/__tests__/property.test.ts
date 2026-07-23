import { describe, expect, it } from "vitest";
import { newProspect } from "../property.js";
import { iso } from "../primitives.js";
import { asId } from "../unsafe.js";
import type { PropertyId } from "../primitives.js";

describe("newProspect (import de campagne → Property)", () => {
  const id = asId<PropertyId>("prop-1");

  it("crée une Property à l'état prospect, métriques ICP inconnues", () => {
    const p = newProspect(id, { name: "The Old Rectory", region: "South West", source: "campaign-2026-08" });
    expect(p.state).toBe("prospect");
    expect(p.keys).toBeNull();
    expect(p.avgNightlyRate).toBeNull();
    expect(p.priority).toBe(0);
    expect(p.contacts).toEqual([]);
  });

  it("conserve ville/comté/priorité fournis à l'import", () => {
    const p = newProspect(
      id,
      { name: "Fox & Hound", city: "Bath", county: "Somerset", region: "South West", source: "manual", priority: 80 },
      iso("2026-08-04T00:00:00Z"),
    );
    expect(p.city).toBe("Bath");
    expect(p.county).toBe("Somerset");
    expect(p.priority).toBe(80);
  });
});
