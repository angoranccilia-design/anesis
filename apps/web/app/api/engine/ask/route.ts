import { NextResponse } from "next/server";
import { answer, classify, detectLanguage, SPEECH_LOCALE, type Lang, type Previous } from "@/lib/engine/ask";
import { authoriseCommand } from "@/lib/engine/governance";
import { executeRun, getRun, latestRun, resetAll } from "@/lib/engine/store";
import { llmEnabled, rephrase } from "@/lib/engine/llm";
import { explainChange } from "@anesis/engine";
export const dynamic = "force-dynamic";

/**
 * POST /api/engine/ask — one entry point for typed and spoken questions and commands.
 * 1. The sentence is classified for risk (engine governance L0–L4, amount-aware) and authorised by @anesis/policy.
 *    L3/L4 → ACTION BLOCKED, never executed. 2. Otherwise the question is routed to a real engine function:
 *    a scenario runs a cycle, "why" walks the causal chain, "what would change your mind" reads thresholds, etc.
 */
export async function POST(req: Request) {
  const { question, runId, channel, language, previous } = (await req.json()) as { question: string; runId?: string; channel?: "text" | "voice"; language?: Lang | "auto"; previous?: Previous };
  const q = question ?? "";
  const lang: Lang = language && language !== "auto" ? language : detectLanguage(q);
  const fr = lang === "fr"; const locale = SPEECH_LOCALE[lang];
  const gov = authoriseCommand(q, { channel: channel ?? "text" });
  if (gov.outcome.kind !== "allow") {
    const headline = fr ? `ACTION BLOQUÉE — classification de risque ${gov.command.tier} (niveau L${gov.command.level}, ${gov.levelName}). ${gov.outcome.kind === "require_approval" ? "Approbation humaine requise." : gov.outcome.kind === "deny" ? "Refusé : " + gov.outcome.reason : "Fenêtre de retenue."}` : `ACTION BLOCKED — risk classification ${gov.command.tier} (level L${gov.command.level}, ${gov.levelName}). ${gov.outcome.kind === "require_approval" ? "Human approval required." : gov.outcome.kind === "deny" ? "Denied: " + gov.outcome.reason : "Retention window."}`;
    return NextResponse.json({ intent: gov.command.kind, tier: gov.command.tier, level: gov.command.level, outcome: gov.outcome, executed: false, language: lang, locale,
      answer: { intent: "fund", language: lang, headline, facts: [fr ? `Raison : ${gov.command.reason}.` : `Reason: ${gov.command.reason}.`, gov.command.amountGbp !== null ? (fr ? `Montant détecté : £${gov.command.amountGbp.toLocaleString("en-GB")}.` : `Amount detected: £${gov.command.amountGbp.toLocaleString("en-GB")}.`) : "", fr ? "La voix et le texte passent par la même politique ; cette application n'exécute jamais une intervention." : "Voice and text go through the same policy; this application never executes an intervention."].filter(Boolean), refs: [], sufficient: true } });
  }
  const intent = classify(q);
  let run = runId ? getRun(runId) : latestRun();
  let a = answer(q, run?.result, lang, previous);
  if (a.action?.type === "reset") { resetAll(); return NextResponse.json({ intent, tier: gov.command.tier, level: gov.command.level, executed: true, language: lang, locale, answer: { ...a, headline: fr ? "État du moteur réinitialisé : cycles et mémoire effacés." : "Engine state reset: runs and memory cleared." } }); }
  if (a.action?.type === "run") {
    const prev = run;
    const spec = a.action.spec ? { ...(prev?.input.spec ?? {}), ...a.action.spec } : prev?.input.spec;
    run = await executeRun({ seed: prev?.input.seed, budgetGbp: a.action.budgetGbp ?? prev?.input.budgetGbp, spec, benchmarks: prev?.input.benchmarks, label: `${channel === "voice" ? "voice" : "ask"}: ${q.slice(0, 60)}` });
    const expl = prev ? explainChange(prev.result, run.result) : undefined;
    a = answer(q, run.result, lang, previous, expl ?? [fr ? "premier cycle" : "first cycle"], run.id);
    return NextResponse.json({ intent: "run_cycle", tier: "T0", level: 0, executed: true, runId: run.id, language: lang, locale, answer: a });
  }
  const phrased = await rephrase(q, a, lang).catch(() => null);
  return NextResponse.json({ intent, tier: gov.command.tier, level: gov.command.level, executed: true, runId: run?.id ?? null, language: lang, locale, answer: a, llm: { enabled: llmEnabled(), text: phrased } });
}
