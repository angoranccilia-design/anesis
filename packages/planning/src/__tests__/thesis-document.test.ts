import { describe, expect, it } from "vitest";
import { gbp, iso, type LossLineId, type MandateId, type ThesisId, type UnderwritingThesis } from "@anesis/core";
import { asId } from "@anesis/core/unsafe";
import { deriveThesisDocument, renderThesisMarkdown } from "../thesis-document.js";

const TH = asId<ThesisId>("th-1");
const thesis: UnderwritingThesis = {
  id: TH,
  mandateId: asId<MandateId>("m-1"),
  leakIndex: 71,
  createdAt: iso("2026-08-01T00:00:00.000Z"),
  lossLines: [
    { id: asId<LossLineId>("ll-ota"), thesisId: TH, pillar: "ota", annualLoss: gbp(4_200_000), rootCause: "OTA over-reliance erodes margin" },
    { id: asId<LossLineId>("ll-speed"), thesisId: TH, pillar: "speed", annualLoss: gbp(1_900_000), rootCause: "Slow replies depress conversion" },
    { id: asId<LossLineId>("ll-x"), thesisId: TH, pillar: "mystery", annualLoss: gbp(500_000), rootCause: "Cause to be scoped" },
  ],
};

const opts = { propertyName: "The Cotswold Mill", region: "Cotswolds", now: iso("2026-08-02T00:00:00.000Z") };

describe("document Thèse d'Acquisition (Porte 2)", () => {
  it("récupérable par poste = perte × fraction du pilier ; pilier inconnu → null", () => {
    const doc = deriveThesisDocument(thesis, opts);
    const byPillar = Object.fromEntries(doc.lines.map((l) => [l.pillar, l]));
    expect(byPillar.ota!.recoverableAnnual).toEqual(gbp(2_520_000)); // 4.2m × 0.6
    expect(byPillar.speed!.recoverableAnnual).toEqual(gbp(950_000)); // 1.9m × 0.5
    expect(byPillar.mystery!.recoverableAnnual).toBeNull(); // hors config → signalé, jamais inventé
  });

  it("totaux : perte chiffrée et récupérable prudent", () => {
    const doc = deriveThesisDocument(thesis, opts);
    expect(doc.pricedAnnualTotal).toEqual(gbp(6_600_000));
    expect(doc.recoverableAnnualTotal).toEqual(gbp(3_470_000)); // 2.52m + 0.95m + 0
  });

  it("chaque poste porte une méthode de mesure ; plan à 90 jours en 3 phases", () => {
    const doc = deriveThesisDocument(thesis, opts);
    expect(doc.lines.every((l) => l.measurement.length > 0)).toBe(true);
    expect(doc.ninetyDayPlan).toHaveLength(3);
    expect(doc.ninetyDayPlan[0]!.weeks).toBe("Weeks 1–2");
  });

  it("termes proposés via makeCommercialTerms : le taux suit la durée (12 mois → 10 %)", () => {
    const doc = deriveThesisDocument(thesis, { ...opts, formula: "domination", termMonths: 12 });
    expect(doc.terms).toEqual({
      formula: "domination",
      termMonths: 12,
      incentiveRate: 0.1,
      photoSessions: 4,
      monthlySubscription: { currency: "GBP", pence: 540_000 },
    });
    // même formule, 6 mois → 15 %
    expect(deriveThesisDocument(thesis, { ...opts, formula: "domination", termMonths: 6 }).terms!.incentiveRate).toBe(0.15);
  });

  it("sans formule/durée : pas de termes (null)", () => {
    expect(deriveThesisDocument(thesis, opts).terms).toBeNull();
  });

  it("rendu Markdown : en-GB, £, conditionnel, jamais $ ni mandat signé", () => {
    const md = renderThesisMarkdown(deriveThesisDocument(thesis, { ...opts, formula: "growth", termMonths: 6 }));
    expect(md).toContain("![Anesis Acquisition](https://anesisacquisition.com/logo.png)"); // logo en en-tête
    expect(md).toContain("# Acquisition Thesis — The Cotswold Mill");
    expect(md).toContain("Anesis Revenue Leak Index: 71/100");
    expect(md).toContain("£34,700"); // recoverable total en £ (pence/100)
    expect(md).toContain("Growth");
    expect(md).toContain("15%");
    expect(md).toContain("conditional");
    expect(md).not.toContain("$");
  });
});
