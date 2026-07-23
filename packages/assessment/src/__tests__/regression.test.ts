import { describe, expect, it } from "vitest";
import { collect } from "../collect.js";
import { score } from "../score.js";
import { report, type Describe } from "../report.js";
import { QUALIFIED_RAW } from "./fixtures.js";

/**
 * LE test de non-régression — celui qui aurait attrapé le bug EN/FR d'origine.
 * Le score est calculé une fois, figé, puis décrit dans deux langues : leakIndex, perte et décision
 * doivent être STRICTEMENT identiques ; seul le texte diffère.
 */
describe("non-régression EN/FR — le chiffre ne dépend pas de la langue du rapport", () => {
  const signals = collect(QUALIFIED_RAW);
  const frozen = score(signals);

  const describe_: Describe = async ({ assessment, language }) =>
    language === "fr"
      ? `Indice de fuite ${assessment.leakIndex}/100, décision ${assessment.decision}.`
      : `Leak Index ${assessment.leakIndex}/100, decision ${assessment.decision}.`;

  it("mêmes leakIndex / perte / décision dans les deux langues, seul le texte change", async () => {
    const en = await report(frozen, "en-GB", describe_);
    const fr = await report(frozen, "fr", describe_);

    expect(en.leakIndex).toBe(fr.leakIndex);
    expect(en.monthlyLoss).toEqual(fr.monthlyLoss);
    expect(en.decisionCode).toBe(fr.decisionCode);
    expect(en.text).not.toBe(fr.text); // le texte, lui, diffère
  });

  it("un describer menteur ne peut pas altérer les chiffres figés (ils viennent du score, pas du texte)", async () => {
    const liar: Describe = async () => "Leak Index 999/100, monthly leak £9,999,999.";
    const r = await report(frozen, "en-GB", liar);
    expect(r.leakIndex).toBe(frozen.leakIndex);
    expect(r.monthlyLoss).toEqual(frozen.monthlyLoss);
  });
});
