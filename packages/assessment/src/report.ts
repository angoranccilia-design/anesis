/**
 * PHASE 3 — Rapport. Le LLM rédige le texte dans la langue demandée, mais reçoit le score DÉJÀ FIGÉ
 * et n'a le droit que de le décrire — jamais de le recalculer. C'est le seul fichier autorisé à
 * dépendre d'un LLM ; il le reçoit par injection (`Describe`) pour rester testable.
 */
import type { Money } from "@anesis/core";
import type { Assessment, DecisionCode } from "./score.js";

export type ReportLanguage = "en-GB" | "fr";

export interface AssessmentReport {
  readonly language: ReportLanguage;
  readonly text: string;
  // Chiffres FIGÉS, recopiés du score — le rapport ne les recalcule jamais.
  readonly leakIndex: number;
  readonly monthlyLoss: Money;
  readonly decisionCode: DecisionCode;
}

/** Le describer (LLM) reçoit un prompt déjà chiffré ; il ne fait que rédiger. */
export type Describe = (input: { assessment: Assessment; language: ReportLanguage; prompt: string }) => Promise<string>;

export function buildPrompt(a: Assessment, language: ReportLanguage): string {
  return [
    `Language: ${language}.`,
    `Write a Revenue Leak Audit narrative for a hospitality property owner, describing the FIXED figures below.`,
    `Leak Index: ${a.leakIndex}/100 — describe, do not recompute.`,
    `Estimated monthly revenue leak: £${(a.monthlyLoss.pence / 100).toFixed(2)} — describe, do not recompute.`,
    `Decision: ${a.decision} (${a.decisionCode}).`,
    `You may ONLY describe these numbers; you must never change or recalculate them.`,
  ].join("\n");
}

export async function report(a: Assessment, language: ReportLanguage, describe: Describe): Promise<AssessmentReport> {
  const prompt = buildPrompt(a, language);
  const text = await describe({ assessment: a, language, prompt });
  // Les chiffres du rapport sont RECOPIÉS du score figé, jamais issus du texte du LLM.
  return { language, text, leakIndex: a.leakIndex, monthlyLoss: a.monthlyLoss, decisionCode: a.decisionCode };
}
