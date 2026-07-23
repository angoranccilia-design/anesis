import { describe, expect, it } from "vitest";
import { collect } from "../collect.js";
import { score } from "../score.js";
import {
  BELOW_SUBSCRIPTION_RAW,
  INSUFFICIENT_RAW,
  INHOUSE_RAW,
  LOW_ADR_RAW,
  LOW_LOSS_RAW,
  LOW_OTA_RAW,
  QUALIFIED_RAW,
  TOO_SMALL_RAW,
} from "./fixtures.js";

const assess = (raw: Parameters<typeof collect>[0]) => score(collect(raw));

describe("score — déterminisme", () => {
  it("mêmes données brutes → résultat strictement identique", () => {
    const a = assess(QUALIFIED_RAW);
    const b = assess(QUALIFIED_RAW);
    expect(b).toEqual(a);
  });
});

describe("score — codes de décision explicites", () => {
  it("QUALIFIED", () => {
    const a = assess(QUALIFIED_RAW);
    expect(a.decision).toBe("qualified");
    expect(a.decisionCode).toBe("QUALIFIED");
    expect(a.leakIndex).toBeGreaterThan(50);
    expect(a.monthlyLoss.pence).toBeGreaterThan(0);
  });

  it("TOO_SMALL", () => expect(assess(TOO_SMALL_RAW).decisionCode).toBe("TOO_SMALL"));
  it("LOW_ADR", () => expect(assess(LOW_ADR_RAW).decisionCode).toBe("LOW_ADR"));
  it("LOW_OTA_DEPENDENCE", () => expect(assess(LOW_OTA_RAW).decisionCode).toBe("LOW_OTA_DEPENDENCE"));
  it("HAS_INHOUSE_MARKETING", () => expect(assess(INHOUSE_RAW).decisionCode).toBe("HAS_INHOUSE_MARKETING"));
  it("INSUFFICIENT_RECOVERABLE_LOSS", () => {
    const a = assess(LOW_LOSS_RAW);
    expect(a.decision).toBe("declined");
    expect(a.decisionCode).toBe("INSUFFICIENT_RECOVERABLE_LOSS");
  });

  it("le seuil de perte doit dépasser l'abonnement : une perte entre £2k et £6k est refusée", () => {
    const a = assess(BELOW_SUBSCRIPTION_RAW);
    expect(a.decisionCode).toBe("INSUFFICIENT_RECOVERABLE_LOSS");
    // au-dessus de l'ancien seuil (£2,000) mais sous le nouveau (£6,000) : c'est bien le seuil qui tranche.
    expect(a.monthlyLoss.pence).toBeGreaterThan(200_000);
    expect(a.monthlyLoss.pence).toBeLessThan(600_000);
  });

  it("INSUFFICIENT_PUBLIC_DATA → revue manuelle (ni qualified ni declined)", () => {
    const a = assess(INSUFFICIENT_RAW);
    expect(a.decision).toBe("needs_review");
    expect(a.decisionCode).toBe("INSUFFICIENT_PUBLIC_DATA");
  });
});

describe("score — honnêteté sur la confiance", () => {
  it("une part OTA seulement dérivée de badges (confiance low) ne suffit pas à trancher", () => {
    // clés + ADR fiables, mais OTA seulement via badges (low) → sous le seuil de confiance → revue manuelle
    const a = score(collect({ structuredRoomCount: 30, listedNightlyRatePence: 20_000, otaBadges: ["booking.com"] }));
    expect(a.decisionCode).toBe("INSUFFICIENT_PUBLIC_DATA");
    expect(a.icp.otaSharePct.confidence).toBe("low");
  });
});
