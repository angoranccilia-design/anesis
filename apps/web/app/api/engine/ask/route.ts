import { NextResponse } from "next/server";
import { answer, classify, detectLanguage, SPEECH_LOCALE, type Lang } from "@/lib/engine/ask";
import { authoriseIntent } from "@/lib/engine/governance";
import { executeRun, getRun, latestRun, resetAll } from "@/lib/engine/store";
import { llmEnabled, rephrase } from "@/lib/engine/llm";
export const dynamic = "force-dynamic";

/**
 * POST /api/engine/ask — one entry point for typed and spoken questions and commands.
 * The intent is classified, authorised by @anesis/policy, then either executed (T0: run, reset, ask)
 * or refused with the tier that would be required (T3: fund / execute — never executed here).
 */
export async function POST(req: Request) {
  const { question, runId, channel, language } = (await req.json()) as { question: string; runId?: string; channel?: "text" | "voice"; language?: Lang | "auto" };
  const intent = classify(question ?? "");
  const lang: Lang = language && language !== "auto" ? language : detectLanguage(question ?? "");
  const fr = lang === "fr";
  const locale = SPEECH_LOCALE[lang];
  const auth = authoriseIntent(intent, { question, channel: channel ?? "text" });
  if (auth.outcome.kind !== "allow") {
    return NextResponse.json({ intent, tier: auth.tier, outcome: auth.outcome, executed: false, language: lang, locale,
      answer: fr
        ? { intent, language: lang, headline: `Non exécuté : « ${intent} » est une action de niveau ${auth.tier} et requiert ${auth.outcome.kind === "require_approval" ? "une approbation humaine enregistrée avant exécution" : auth.outcome.kind}.`, facts: ["La voix et le texte passent par la même politique. Cette application n'exécute jamais une intervention ; elle recommande et enregistre."], refs: [], sufficient: true }
        : { intent, language: lang, headline: `Not executed: "${intent}" is a tier ${auth.tier} action and requires ${auth.outcome.kind === "require_approval" ? "a human approval recorded before execution" : auth.outcome.kind}.`, facts: ["Voice and text go through the same policy. This application never executes an intervention; it recommends and records."], refs: [], sufficient: true } });
  }
  if (intent === "run_cycle") { const run = executeRun({ label: `${channel === "voice" ? "voice" : "ask"}: ${question}` }); return NextResponse.json({ intent, tier: auth.tier, executed: true, runId: run.id, language: lang, locale, answer: answer(fr ? "que faire" : "what should I do", run.result, lang) }); }
  if (intent === "reset") { resetAll(); return NextResponse.json({ intent, tier: auth.tier, executed: true, language: lang, locale, answer: { intent, language: lang, headline: fr ? "État du moteur réinitialisé : cycles et mémoire effacés." : "Engine state reset: runs and memory cleared.", facts: [], refs: [], sufficient: true } }); }
  const run = runId ? getRun(runId) : latestRun();
  const a = answer(question, run?.result, lang);
  const phrased = await rephrase(question, a, lang).catch(() => null);
  return NextResponse.json({ intent, tier: auth.tier, executed: true, runId: run?.id ?? null, language: lang, locale, answer: a, llm: { enabled: llmEnabled(), text: phrased } });
}
