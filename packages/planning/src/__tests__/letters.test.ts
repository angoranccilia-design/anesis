import { describe, expect, it } from "vitest";
import { gbp } from "@anesis/core";
import { conditionalEngagementLetter, loiLetter } from "../letters.js";

describe("Lettre d'intention (Cycle 2)", () => {
  const base = { propertyName: "The Cotswold Mill", region: "Cotswolds", contactName: "Ms Fell" };

  it("non contraignante, sans obligation de paiement, personnalisée", () => {
    const l = loiLetter(base);
    expect(l).toContain("![Anesis Acquisition]"); // en-tête logo
    expect(l).toContain("LETTER OF INTENT");
    expect(l).toContain("Dear Ms Fell,");
    expect(l).toContain("not binding");
    expect(l).toContain("no payment");
    expect(l).not.toContain("$");
  });

  it("décrit les chiffres figés s'ils sont fournis, sinon reste prudente", () => {
    const withFig = loiLetter({ ...base, leakIndex: 71, recoverableAnnual: gbp(3_470_000) });
    expect(withFig).toContain("Anesis Revenue Leak Index at 71/100");
    expect(withFig).toContain("£34,700");
    const without = loiLetter(base);
    expect(without).toContain("measure our recoverable direct revenue");
    expect(without).not.toContain("Anesis Revenue Leak Index at");
  });
});

describe("Lettre d'engagement conditionnel (Cycle 5)", () => {
  const base = { propertyName: "Harbour House", region: "Cornwall", contactName: "Mr Pascoe", date: "5 October 2026" };

  it("strictement conditionnel : effet uniquement à l'installation UK, aucun paiement avant", () => {
    const l = conditionalEngagementLetter(base);
    expect(l).toContain("![Anesis Acquisition]"); // en-tête logo
    expect(l).toContain("LETTER OF CONDITIONAL ENGAGEMENT");
    expect(l).toContain("conditional");
    expect(l).toContain("only from the date of Anesis's official establishment in the United Kingdom");
    expect(l).toContain("No fee is payable, and none will be paid");
    expect(l).toContain("no engagement is in force, before that date");
  });

  it("ne présente jamais un mandat actif ni un paiement réalisé ; en-GB, pas de $", () => {
    const l = conditionalEngagementLetter(base);
    expect(l).not.toContain("$");
    expect(l.toLowerCase()).not.toContain("payment has been made");
    expect(l.toLowerCase()).not.toContain("mandate is active");
  });

  it("intègre la formule + durée proposées si fournies (sans les imposer)", () => {
    const l = conditionalEngagementLetter({ ...base, formula: "domination", termMonths: 12 });
    expect(l).toContain("Domination");
    expect(l).toContain("12 months");
    expect(l).toContain("either party may still decline");
  });
});
