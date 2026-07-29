import { describe, expect, it } from "vitest";
import { gbp } from "../primitives.js";
import {
  MANDATE_FORMULAS,
  MANDATE_TERM_MONTHS,
  incentiveRateForTerm,
  makeCommercialTerms,
  monthlySubscriptionPence,
  photoSessionsForTerm,
  type MandateFormula,
} from "../mandate-terms.js";

describe("termes commerciaux du mandat (Porte 3)", () => {
  it("le taux d'intéressement suit la DURÉE : 15 % sur 6 mois, 10 % sur 12 mois", () => {
    expect(incentiveRateForTerm(6)).toBe(0.15);
    expect(incentiveRateForTerm(12)).toBe(0.1);
  });

  it("le taux est INDÉPENDANT de la formule : même durée → même taux quelle que soit la formule", () => {
    for (const formula of MANDATE_FORMULAS) {
      expect(makeCommercialTerms(formula, 6).incentiveRate).toBe(0.15);
      expect(makeCommercialTerms(formula, 12).incentiveRate).toBe(0.1);
    }
  });

  it("les deux formules sont disponibles sur les deux durées", () => {
    for (const formula of MANDATE_FORMULAS) {
      for (const term of MANDATE_TERM_MONTHS) {
        const t = makeCommercialTerms(formula, term);
        expect(t.formula).toBe(formula);
        expect(t.termMonths).toBe(term);
      }
    }
  });

  it("séances photo/vidéo = 1 par trimestre, déduites de la durée (6→2, 12→4)", () => {
    expect(photoSessionsForTerm(6)).toBe(2);
    expect(photoSessionsForTerm(12)).toBe(4);
  });

  it("seul l'abonnement mensuel dépend encore de la formule (Croissance £3 400 / Domination £5 400)", () => {
    expect(monthlySubscriptionPence("growth")).toEqual(gbp(340_000));
    expect(monthlySubscriptionPence("domination")).toEqual(gbp(540_000));
    // et il ne bouge pas avec la durée
    expect(makeCommercialTerms("growth", 6).monthlySubscription).toEqual(gbp(340_000));
    expect(makeCommercialTerms("growth", 12).monthlySubscription).toEqual(gbp(340_000));
  });

  it("makeCommercialTerms est le seul point de passage : le taux ne peut pas diverger de la durée", () => {
    const t = makeCommercialTerms("domination", 12);
    expect(t.incentiveRate).toBe(incentiveRateForTerm(t.termMonths));
    expect(t.photoSessions).toBe(photoSessionsForTerm(t.termMonths));
  });

  it("exemple du doc : 12 mois, incrément £120 000 → bonus £12 000 à 10 %", () => {
    const incrementPence = 12_000_000; // £120 000
    const { incentiveRate } = makeCommercialTerms("growth", 12);
    expect(Math.round(incrementPence * incentiveRate)).toBe(1_200_000); // £12 000
  });

  it("MandateFormula reste un type fermé Croissance/Domination", () => {
    const all: MandateFormula[] = ["growth", "domination"];
    expect(all).toEqual([...MANDATE_FORMULAS]);
  });
});
