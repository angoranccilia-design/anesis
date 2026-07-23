import { describe, expect, it } from "vitest";
import { collect } from "../collect.js";

describe("collect — confiance par estimation ICP (honnêteté sur la donnée publique)", () => {
  it("clés et ADR issus de données structurées → confiance high", () => {
    const s = collect({ structuredRoomCount: 24, listedNightlyRatePence: 16_000 });
    expect(s.keys).toMatchObject({ value: 24, confidence: "high" });
    expect(s.adrPence).toMatchObject({ value: 16_000, confidence: "high" });
  });

  it("part OTA via un simple proxy de badges → confiance low", () => {
    const s = collect({ otaBadges: ["booking.com", "expedia"] });
    expect(s.otaSharePct.confidence).toBe("low");
    expect(s.otaSharePct.value).toBeGreaterThan(0);
  });

  it("champs absents → confiance none, valeur null (jamais deviné)", () => {
    const s = collect({});
    expect(s.keys).toMatchObject({ value: null, confidence: "none" });
    expect(s.adrPence).toMatchObject({ value: null, confidence: "none" });
    expect(s.otaSharePct).toMatchObject({ value: null, confidence: "none" });
  });
});
