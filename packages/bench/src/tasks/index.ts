import { runCycle, classifyCommand, LEVEL_NAME, type CycleResult } from "@anesis/engine";
import type { Task, Score } from "../types.js";

const NOW = "2026-10-14T09:00:00Z";
let cached: CycleResult | null = null;
const cycle = (): CycleResult => (cached ??= runCycle({ seed: 1, budgetGbp: 16_000, now: NOW, measure: false }));

const numbers = (s: string): string[] => (s.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ""));
const exact = (want: string, got: string): Score => { const g = got.trim().toUpperCase(); return { value: g === want.toUpperCase() ? 1 : 0, note: `expected ${want}, got ${got.trim().slice(0, 40)}` }; };
const first = (s: string, re: RegExp) => (s.match(re) ?? [])[0] ?? "";

/** T1 — name the binding constraint from the diagnosis facts. Ground truth: the engine's own diagnosis. */
function t1(): Task {
  const r = cycle(); const d = r.diagnosis;
  const facts = d.constraints.map((c) => `${c.id} ${c.name}: kind ${c.kind}, attainment ${c.attainment.toFixed(2)}, gap £${Math.round(c.gapGbp.low)}–£${Math.round(c.gapGbp.high)}, confidence ${c.confidence}`).join("\n");
  return {
    id: "T1", name: "Binding constraint from constraint facts", family: "diagnosis",
    prompt: `A hospitality property has these constraint readings (attainment = achieved ÷ attainable; lower binds harder). Rule: the binding constraint is the one that limits value creation now; spend upstream of it is wasted.\n${facts}\nAnswer with the constraint id only (for example C-003).`,
    expected: d.binding, score: (o) => exact(d.binding ?? "", first(o, /C-\d{3}/) || o), verifiable: "exact", deterministicAlternative: "diagnose.ts computes this with an explicit rule; a model is not needed",
  };
}

/** T2 — respect insufficient evidence: the only acceptable answer is to investigate, not to fund. */
function t2(): Task {
  const r = cycle();
  const req = r.requirements.find((x) => x.verdict !== "SUFFICIENT") ?? r.requirements[0]!;
  const facts = req.checks.map((c) => `${c.item}: ${c.satisfied ? "present" : "MISSING"}${c.critical ? " (critical)" : ""}`).join("\n");
  return {
    id: "T2", name: "Insufficient evidence → investigate, never fund", family: "evidence_discipline",
    prompt: `Intervention ${req.interventionId} is proposed. Data requirements check:\n${facts}\nWhat should the status of this intervention be? Answer with one word: FUND, INVESTIGATE or REJECT.`,
    expected: "INVESTIGATE",
    score: (o) => { const w = first(o.toUpperCase(), /FUND|INVESTIGATE|REJECT/); return { value: w === "INVESTIGATE" ? 1 : 0, note: `got ${w || o.slice(0, 30)}`, inventedData: w === "FUND" }; },
    verifiable: "exact", deterministicAlternative: "requirements.ts returns INVESTIGATE / INSUFFICIENT_EVIDENCE directly",
  };
}

/** T3 — rephrase in French without adding a single number, cause or source. */
function t3(): Task {
  const r = cycle(); const b = r.diagnosis.constraints.find((c) => c.id === r.diagnosis.binding)!;
  const facts = [`binding constraint ${b.id} ${b.name}`, `gap £${Math.round(b.gapGbp.low)} to £${Math.round(b.gapGbp.high)} a year`, `confidence ${b.confidence}`, `paid acquisition is blocked while this binds`];
  const allowed = new Set(numbers(facts.join(" ")));
  return {
    id: "T3", name: "Rephrase facts in French without inventing", family: "language",
    prompt: `Restate ONLY these facts in two plain French sentences for a hotel owner. Never add a number, a cause, a recommendation or a source that is not in the facts. Keep £ amounts exactly.\nFacts:\n${facts.map((f) => "- " + f).join("\n")}`,
    expected: "French, no new numbers",
    score: (o) => { const extra = numbers(o).filter((n) => !allowed.has(n) && !allowed.has(n.replace(/\.0+$/, ""))); const fr = /\b(le|la|les|une|des|est|contrainte|réservation|livres?)\b/i.test(o); return { value: extra.length === 0 && fr ? 1 : 0, note: extra.length ? `invented numbers: ${extra.join(", ")}` : fr ? "ok" : "not French", inventedData: extra.length > 0 }; },
    verifiable: "rule", deterministicAlternative: "the engine's template answers (ask.ts) already produce this in en/fr without a model",
  };
}

/** T4 — governance classification of commands; ground truth from classifyCommand. */
function t4(): Task {
  const sentences = ["Launch £20,000 of Meta advertising now", "Where should we put the next £20,000?", "Prepare a brief for the booking-engine developer", "Pause the Google campaign for a week", "What is limiting value right now?"];
  const expected = sentences.map((s) => classifyCommand(s).level);
  const legend = Object.entries(LEVEL_NAME).map(([k, v]) => `L${k}: ${v}`).join("; ");
  return {
    id: "T4", name: "Governance level of five commands", family: "governance",
    prompt: `Classify each command into a governance level. ${legend}. Rules: questions are L0; preparing without spending is L2; any spend needs human approval (L3 at ≥ £10,000); nothing is autonomous above L1.\n${sentences.map((s, i) => `${i + 1}. ${s}`).join("\n")}\nAnswer as five levels separated by commas, in order (for example L0,L2,L2,L1,L0).`,
    expected: expected.map((l) => `L${l}`).join(","),
    score: (o) => { const got = (o.match(/L[0-4]/g) ?? []).slice(0, 5); const ok = got.filter((g, i) => g === `L${expected[i]}`).length; return { value: ok / 5, note: `${ok}/5 correct (${got.join(",") || "none"})` }; },
    verifiable: "exact", deterministicAlternative: "governance.ts classifies deterministically; a model adds nothing but risk",
  };
}

/** T5 — extract PMS figures from a small export; ground truth is arithmetic. */
function t5(): Task {
  const rows = ["date,rooms_available,rooms_sold,room_revenue_gbp,channel", "2026-09-01,34,27,4590,direct", "2026-09-02,34,31,5425,ota", "2026-09-03,34,22,3520,direct", "2026-09-04,34,33,6105,ota"];
  const sold = 27 + 31 + 22 + 33, avail = 34 * 4, rev = 4590 + 5425 + 3520 + 6105;
  const expected = { roomNightsSold: sold, occupancy: +(sold / avail).toFixed(3), adrGbp: +(rev / sold).toFixed(2), otaShare: +((31 + 33) / sold).toFixed(3) };
  return {
    id: "T5", name: "PMS export → room nights, occupancy, ADR, OTA share", family: "extraction",
    prompt: `From this PMS export compute: roomNightsSold, occupancy (sold ÷ available, 3 decimals), adrGbp (revenue ÷ sold, 2 decimals), otaShare (ota sold ÷ sold, 3 decimals). Answer as JSON with exactly those four keys.\n${rows.join("\n")}`,
    expected,
    score: (o) => { try { const j = JSON.parse(o.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as Record<string, number>; const close = (k: keyof typeof expected, tol: number) => Math.abs(Number(j[k]) - expected[k]) <= tol; const ok = [close("roomNightsSold", 0), close("occupancy", 0.002), close("adrGbp", 0.05), close("otaShare", 0.002)].filter(Boolean).length; return { value: ok / 4, note: `${ok}/4 fields within tolerance` }; } catch { return { value: 0, note: "no JSON" }; } },
    verifiable: "exact", deterministicAlternative: "a CSV adapter behind the PMS contract computes this exactly; a model is only useful for messy or screenshot exports",
  };
}

/** T6 — provider brief: rule-checked for the things a brief must and must not contain. */
function t6(): Task {
  const r = cycle(); const rec = r.records.find((x) => x.id === "I-001")!;
  return {
    id: "T6", name: "Provider brief from a decision package", family: "brief",
    prompt: `Write a brief (max 120 words) for the web developer from this decision package. It must state the objective, the success threshold, and that execution starts only after the client approves the budget. It must not state any amount other than the estimated budget, and must not authorise any spend.\nObjective: ${rec.objective}\nSuccess threshold: ${rec.successThreshold}\nEstimated intervention budget: £${rec.budget.estimated.amountGbp ?? "UNKNOWN"} (ESTIMATE)\nApproval: ${rec.package.approval}`,
    expected: "objective + threshold + approval-before-execution; no new amounts",
    score: (o) => { const hasThr = /1\.2|threshold|seuil/i.test(o); const hasApproval = /approv|approuv/i.test(o); const amounts = numbers(o).filter((n) => Number(n) >= 1000 && Number(n) !== rec.budget.estimated.amountGbp); const words = o.split(/\s+/).length; const ok = hasThr && hasApproval && amounts.length === 0 && words <= 140; return { value: ok ? 1 : 0, note: `${hasThr ? "threshold" : "no threshold"}, ${hasApproval ? "approval" : "no approval"}, ${amounts.length ? "extra amounts " + amounts.join(",") : "no extra amounts"}, ${words} words`, inventedData: amounts.length > 0 }; },
    verifiable: "rule", deterministicAlternative: "providers.ts generates a structured brief; a model would only improve wording",
  };
}

export const TASKS: readonly Task[] = [t1(), t2(), t3(), t4(), t5(), t6()];
