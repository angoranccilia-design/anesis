/**
 * Ask Anesis — answers come from the structured state of a run, never from free generation.
 * Each answer names the records it relies on (evidence ids). When the state does not contain what is
 * asked, the answer is "Insufficient evidence" with what would be needed. No LLM is involved here;
 * the optional LLM adapter (llm.ts) may rephrase or translate an answer's facts, never add to them.
 *
 * Languages: the question's language is detected. English and French templates are complete.
 * Other detected languages (es, de, it, pt, nl) get the English facts plus a notice in that language;
 * full translation for them is only available through the language layer when it is enabled.
 */
import type { CycleResult } from "@anesis/engine";
import type { IntentKind } from "./governance.js";

export type Lang = "en" | "fr" | "es" | "de" | "it" | "pt" | "nl";
export const SPEECH_LOCALE: Record<Lang, string> = { en: "en-GB", fr: "fr-FR", es: "es-ES", de: "de-DE", it: "it-IT", pt: "pt-PT", nl: "nl-NL" };

export interface Answer {
  readonly intent: IntentKind;
  readonly language: Lang;
  readonly headline: string;
  readonly facts: readonly string[];
  readonly refs: readonly string[];
  readonly sufficient: boolean;
  readonly notice?: string;            // e.g. "answered in English: full templates exist for English and French"
}

const STOP: Record<Lang, string[]> = {
  en: ["the", "what", "why", "is", "are", "would", "should", "how", "with", "your", "did", "do", "this", "and", "of", "to"],
  fr: ["l", "d", "maintenant", "ne", "dois", "devrais", "est-elle", "est-il", "le", "la", "les", "pourquoi", "quoi", "est", "que", "qu", "quel", "quelle", "comment", "avec", "des", "du", "de", "et", "un", "une", "pas", "ce", "cette", "tu", "vous", "je", "faire", "on"],
  es: ["el", "los", "las", "por", "qué", "que", "es", "cómo", "con", "del", "una", "y", "para", "hacer"],
  de: ["der", "die", "das", "warum", "was", "ist", "wie", "mit", "und", "nicht", "ich", "sie", "wird", "sollte"],
  it: ["il", "lo", "gli", "perché", "cosa", "che", "è", "come", "con", "della", "del", "e", "non", "una"],
  pt: ["o", "os", "as", "por", "porque", "que", "é", "como", "com", "da", "do", "e", "uma", "não"],
  nl: ["de", "het", "waarom", "wat", "is", "hoe", "met", "van", "en", "niet", "een", "zou"],
};
export function detectLanguage(q: string, fallback: Lang = "en"): Lang {
  const words = q.toLowerCase().replace(/[’']/g, " ").replace(/[^\p{L}\s-]/gu, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return fallback;
  let best: Lang = fallback, bestScore = 0;
  for (const [lang, stop] of Object.entries(STOP) as [Lang, string[]][]) {
    let score = words.filter((w) => stop.includes(w)).length;
    if (lang === "fr" && /[àâçéèêëîïôûùœ]/.test(q)) score += 1.5;
    if (lang === "es" && /[ñ¿¡]/.test(q)) score += 2;
    if (lang === "de" && /[äöüß]/.test(q)) score += 2;
    if (lang === "pt" && /[ãõç]/.test(q)) score += 1.5;
    if (score > bestScore) { best = lang; bestScore = score; }
  }
  return bestScore === 0 ? fallback : best;
}

const gbp = (x: number) => `£${Math.round(x).toLocaleString("en-GB")}`;
const pct = (x: number) => `${(x * 100).toFixed(x < 0.1 ? 2 : 0)} %`;
const isRate = (m: string) => /conv|share|rate/.test(m);
const fmtMetric = (m: string, v: number) => (isRate(m) ? pct(v) : String(v));

export function classify(q: string): IntentKind {
  const s = q.toLowerCase();
  if (/\b(run|start|launch|execute)\b.*\b(cycle|decision|analysis)\b|full decision cycle|\b(lance|lancer|démarre|exécute|relance)\b.*\b(cycle|décision|analyse)\b|cycle de décision complet/.test(s)) return "run_cycle";
  if (/\breset\b|start again|clear (the )?memory|réinitialis|remise à zéro|efface la mémoire/.test(s)) return "reset";
  if (/\bcompare\b|\bcompar/.test(s)) return "compare";
  if (/\b(fund|spend|approve|go ahead with|pay for)\b|\b(finance|financer|dépense|dépenser|approuve|approuver|valide|valider|paie|payer)\b/.test(s)) return "fund";
  if (/\b(change|set|assume|what if)\b.*\b(assumption|benchmark|budget|conversion|seed)\b|\b(change|modifie|suppose|et si)\b.*\b(hypothèse|référence|budget|conversion|graine)\b/.test(s)) return "change_assumptions";
  return "ask";
}

type Topic = "blocked" | "wouldChange" | "limiting" | "addressable" | "confidence" | "measurement" | "learning" | "exposure" | "recommend" | "evidence" | "none";
function topic(s: string): Topic {
  if (/why.*(block|not fund|reject)|blocked|pourquoi.*(bloqu|pas financ|rejet|refus)|bloqué/.test(s)) return "blocked";
  if (/what would change|change (your|the) (mind|decision)|threshold|qu'est-ce qui (changerait|ferait changer)|changer (d'avis|la décision)|seuil/.test(s)) return "wouldChange";
  if (/limiting|binding|constraint|bottleneck|what limits|limitant|contrainte|goulot|qu'est-ce qui limite|ce qui limite|limita|begrenzt|beperkt/.test(s)) return "limiting";
  if (/how (much|big).*(loss|leak|gap|addressable)|deduplicat|total addressable|how much (is|are) (we|they) losing|combien.*(perd|fuite|écart|adressable)|dédupli|valeur adressable/.test(s)) return "addressable";
  if (/confiden|how sure|certain|sûr|certitude|fiab/.test(s)) return "confidence";
  if (/measur|result|did it work|incremental|counterfactual|synthetic|mesur|résultat|ça a marché|incrémental|contrefactuel|synthétique/.test(s)) return "measurement";
  if (/learn|calibrat|memory|appris|apprentissage|calibr|mémoire/.test(s)) return "learning";
  if (/exposure|risk|anticipat|next (6|six|12|18)|exposition|risque|anticip|prochains? (6|six|12|18)/.test(s)) return "exposure";
  if (/what should|recommend|next £|next 20|do with|decision|fund|spend|que (faire|dois|devrais)|recommand|prochain|décision|financ|dépens|investir/.test(s)) return "recommend";
  if (/evidence|source|where (does|did).*(number|come)|provenance|preuve|d'où (vient|viennent)/.test(s)) return "evidence";
  return "none";
}

const T = {
  en: {
    noRun: "Insufficient evidence: no decision cycle has been run yet.", noRunFact: "Run a full decision cycle first; every answer is read from its records.",
    noBlocked: "Insufficient evidence: no blocked action matches the question.", isFunded: (id: string, n: string) => `${id} (${n}) is funded, not blocked.`,
    fundedFact: (a: string, r: string) => `Allocated ${a}; risk-adjusted value ${r}.`, isBlocked: (id: string, n: string) => `${id} (${n}) is blocked.`,
    reason: "Reason", unblock: "It unblocks when", noCond: "No unblocking condition is recorded.",
    wouldChange: (id: string, n: number) => `${id} would change under ${n} recorded conditions.`,
    limiting: (id: string, n: string) => `The limiting constraint is ${id}: ${n}.`, noLimiting: "No binding constraint is recorded.",
    observedVs: (m: string, o: string, b: string, a: string) => `${m} observed ${o} against benchmark ${b} (attainment ${a}).`,
    gap: (lo: string, hi: string, st: string, c: number) => `Gap before deduplication: ${lo} to ${hi} a year (${st}, confidence ${c}).`,
    dedup: (lo: string, hi: string) => `Deduplicated addressable value: ${lo} to ${hi} a year.`, naive: (x: string) => `Naive sum of constraint midpoints: ${x}.`,
    dedupRule: (r: string) => `Deduplication rule: ${r}.`, aap: (a: string, b: string, c: string) => `Actual ${a}; attainable ${b}; potential under benchmark assumptions ${c}.`,
    benchNote: "All benchmarks are placeholders (status BENCHMARK) until documented sources replace them.",
    conf: (id: string, p: string) => `${id}: confidence ${p}.`, basis: (b: string) => `Basis: ${b}.`, calibrated: (f: number, n: number) => `Calibrated ×${f} from ${n} measured cycle(s).`,
    notCalibrated: "No calibration has been applied: no measured cycle covers this intervention type yet.",
    decConf: (p: string, b: string) => `Decision confidence ${p} (${b}).`,
    noMeasure: "Insufficient evidence: nothing has been measured in this run.", planNoOutcome: "A plan is registered but no outcome window has elapsed.", nothingRegistered: "Nothing was funded, so nothing was registered for measurement.",
    meas: (s: string, ps: string) => `Measurement ${s}; plan ${ps}.`,
    measFact: (pt: string, lo: string, hi: string, o: string, cf: string) => `Incremental ${pt} (90 % interval ${lo} to ${hi}); observed ${o} vs counterfactual ${cf}.`,
    method: (m: string, w: string) => `Method: ${m} — ${w}.`, placebo: (n: string, r: number, of: number) => `Placebo: ${n} (rank ${r} of ${of}).`, intact: (p: string, i: boolean) => `Pre-registered plan ${p} intact: ${i}.`,
    truth: (x: string) => `The simulated truth was ${x} (hidden from the estimator).`,
    noLearning: "No learning record in this run.", learningOnly: "Learning records are created only after a measurement.",
    learned: (id: string, applied: boolean) => `${id}: ${applied ? "calibration updated" : "no calibration change"}.`,
    learnFact: (e: string, o: string, err: string) => `Expected ${e}, observed ${o}, forecast error ${err}.`,
    exposures: (n: number) => `${n} forward exposures are modelled.`, expFact: (id: string, n: string, p: number, b: string, lo: string, hi: string, h: number) => `${id} ${n}: probability ${p} (${b}); value at risk ${lo} to ${hi} over ${h} months.`,
    fund: (ids: string, a: string, b: string, r: string) => `Fund ${ids} (${a} of ${b}); keep ${r} in reserve.`, fundNothing: "Fund nothing: no intervention clears the allocation rules.",
    line: (id: string, n: string, c: string, ev: string, p: string) => `${id} ${n}: cost ${c}, expected value ${ev}, confidence ${p}.`, blockedLine: (id: string, why: string) => `${id} BLOCKED: ${why}.`,
    gov: (l: number, r: string) => `Governance level ${l}: ${r}.`, assay: (v: string, r: string) => `Assay verdict ${v}: ${r}.`,
    evidence: (n: number) => `${n} observations, all SIMULATED PROPERTY DATA.`, evFact1: "Every number on screen resolves to an observation id with source, timestamp, transformation, assumptions, confidence and status.", evFact2: "No VERIFIED observation exists in this environment: no property system is connected.",
    unknown: "Insufficient evidence: the question does not map to a recorded fact.", tryThese: "Try: what limits this property; why is paid acquisition blocked; what would change the decision; how confident are you; what did the measurement show; what has been learned.",
    and: " and ",
  },
  fr: {
    noRun: "Preuves insuffisantes : aucun cycle de décision n'a encore été exécuté.", noRunFact: "Lancez d'abord un cycle de décision complet ; chaque réponse est lue dans ses enregistrements.",
    noBlocked: "Preuves insuffisantes : aucune action bloquée ne correspond à la question.", isFunded: (id: string, n: string) => `${id} (${n}) est financée, pas bloquée.`,
    fundedFact: (a: string, r: string) => `Alloué ${a} ; valeur ajustée du risque ${r}.`, isBlocked: (id: string, n: string) => `${id} (${n}) est bloquée.`,
    reason: "Raison", unblock: "Elle se débloque lorsque", noCond: "Aucune condition de déblocage n'est enregistrée.",
    wouldChange: (id: string, n: number) => `${id} changerait sous ${n} conditions enregistrées.`,
    limiting: (id: string, n: string) => `La contrainte limitante est ${id} : ${n}.`, noLimiting: "Aucune contrainte limitante n'est enregistrée.",
    observedVs: (m: string, o: string, b: string, a: string) => `${m} observé ${o} contre une référence de ${b} (atteinte ${a}).`,
    gap: (lo: string, hi: string, st: string, c: number) => `Écart avant déduplication : ${lo} à ${hi} par an (${st}, confiance ${c}).`,
    dedup: (lo: string, hi: string) => `Valeur adressable dédupliquée : ${lo} à ${hi} par an.`, naive: (x: string) => `Somme naïve des milieux de contraintes : ${x}.`,
    dedupRule: (r: string) => `Règle de déduplication : ${r}.`, aap: (a: string, b: string, c: string) => `Réel ${a} ; atteignable ${b} ; potentiel sous hypothèses de référence ${c}.`,
    benchNote: "Toutes les références sont des valeurs provisoires (statut BENCHMARK) tant qu'une source documentée ne les remplace pas.",
    conf: (id: string, p: string) => `${id} : confiance ${p}.`, basis: (b: string) => `Base : ${b}.`, calibrated: (f: number, n: number) => `Calibrée ×${f} à partir de ${n} cycle(s) mesuré(s).`,
    notCalibrated: "Aucune calibration appliquée : aucun cycle mesuré ne couvre encore ce type d'intervention.",
    decConf: (p: string, b: string) => `Confiance de la décision ${p} (${b}).`,
    noMeasure: "Preuves insuffisantes : rien n'a été mesuré dans ce cycle.", planNoOutcome: "Un plan est enregistré mais aucune fenêtre de résultat n'est écoulée.", nothingRegistered: "Rien n'a été financé, donc rien n'a été enregistré pour mesure.",
    meas: (s: string, ps: string) => `Mesure ${s} ; plan ${ps}.`,
    measFact: (pt: string, lo: string, hi: string, o: string, cf: string) => `Incrémental ${pt} (intervalle à 90 % de ${lo} à ${hi}) ; observé ${o} contre contrefactuel ${cf}.`,
    method: (m: string, w: string) => `Méthode : ${m} — ${w}.`, placebo: (n: string, r: number, of: number) => `Placebo : ${n} (rang ${r} sur ${of}).`, intact: (p: string, i: boolean) => `Plan pré-enregistré ${p} intact : ${i}.`,
    truth: (x: string) => `La vérité simulée était ${x} (cachée à l'estimateur).`,
    noLearning: "Aucun enregistrement d'apprentissage dans ce cycle.", learningOnly: "Les enregistrements d'apprentissage ne sont créés qu'après une mesure.",
    learned: (id: string, applied: boolean) => `${id} : ${applied ? "calibration mise à jour" : "calibration inchangée"}.`,
    learnFact: (e: string, o: string, err: string) => `Attendu ${e}, observé ${o}, erreur de prévision ${err}.`,
    exposures: (n: number) => `${n} expositions prospectives sont modélisées.`, expFact: (id: string, n: string, p: number, b: string, lo: string, hi: string, h: number) => `${id} ${n} : probabilité ${p} (${b}) ; valeur à risque ${lo} à ${hi} sur ${h} mois.`,
    fund: (ids: string, a: string, b: string, r: string) => `Financer ${ids} (${a} sur ${b}) ; garder ${r} en réserve.`, fundNothing: "Ne rien financer : aucune intervention ne passe les règles d'allocation.",
    line: (id: string, n: string, c: string, ev: string, p: string) => `${id} ${n} : coût ${c}, valeur attendue ${ev}, confiance ${p}.`, blockedLine: (id: string, why: string) => `${id} BLOQUÉE : ${why}.`,
    gov: (l: number, r: string) => `Niveau de gouvernance ${l} : ${r}.`, assay: (v: string, r: string) => `Verdict de l'Assay ${v} : ${r}.`,
    evidence: (n: number) => `${n} observations, toutes DONNÉES DE PROPRIÉTÉ SIMULÉES.`, evFact1: "Chaque chiffre à l'écran renvoie à une observation avec source, horodatage, transformation, hypothèses, confiance et statut.", evFact2: "Aucune observation VÉRIFIÉE n'existe dans cet environnement : aucun système de la propriété n'est connecté.",
    unknown: "Preuves insuffisantes : la question ne correspond à aucun fait enregistré.", tryThese: "Essayez : qu'est-ce qui limite cette propriété ; pourquoi l'acquisition payante est-elle bloquée ; qu'est-ce qui changerait la décision ; quelle est votre confiance ; qu'a montré la mesure ; qu'a-t-on appris.",
    and: " et ",
  },
} as const;

const NOTICE: Record<Exclude<Lang, "en" | "fr">, string> = {
  es: "Respuesta en inglés: las plantillas estructuradas existen en inglés y francés; la traducción completa requiere la capa de lenguaje, no activada aquí.",
  de: "Antwort auf Englisch: strukturierte Vorlagen gibt es auf Englisch und Französisch; eine vollständige Übersetzung erfordert die Sprachschicht, die hier nicht aktiviert ist.",
  it: "Risposta in inglese: i modelli strutturati esistono in inglese e francese; la traduzione completa richiede il livello linguistico, non attivo qui.",
  pt: "Resposta em inglês: os modelos estruturados existem em inglês e francês; a tradução completa requer a camada de linguagem, não ativada aqui.",
  nl: "Antwoord in het Engels: gestructureerde sjablonen bestaan in het Engels en Frans; volledige vertaling vereist de taallaag, hier niet ingeschakeld.",
};

export function answer(q: string, r: CycleResult | undefined, langHint?: Lang): Answer {
  const intent = classify(q);
  const detected = langHint ?? detectLanguage(q);
  const lang: "en" | "fr" = detected === "fr" ? "fr" : "en";
  const t = T[lang];
  const notice = detected !== "en" && detected !== "fr" ? NOTICE[detected] : undefined;
  const base = { intent, language: detected, notice };
  const s = q.toLowerCase();
  if (!r) return { ...base, headline: t.noRun, facts: [t.noRunFact], refs: [], sufficient: false };
  const d = r.diagnosis, binding = d.constraints.find((c) => c.id === d.binding);
  const find = (id: RegExp) => r.interventions.find((i) => id.test(i.id));
  const named = /paid|acquisition|ads|meta|google|payant|publicit|i-004/.test(s) ? find(/I-004/) : /mobile|journey|checkout|conversion|parcours|i-001/.test(s) ? find(/I-001/) : /crm|email|reactivation|repeat|réactivation|fidél|i-003/.test(s) ? find(/I-003/) : /direct|member|parity|parité|i-002/.test(s) ? find(/I-002/) : undefined;

  switch (topic(s)) {
    case "blocked": {
      const target = named ?? r.interventions.find((i) => r.allocation.lines.some((l) => l.interventionId === i.id && !l.funded));
      const line = target && r.allocation.lines.find((l) => l.interventionId === target.id);
      if (!target || !line) return { ...base, headline: t.noBlocked, facts: [], refs: [r.decision.id], sufficient: false };
      if (line.funded) return { ...base, headline: t.isFunded(target.id, target.name), facts: [t.fundedFact(gbp(line.allocatedGbp), gbp(line.riskAdjustedValueGbp))], refs: [target.id, r.decision.id], sufficient: true };
      return { ...base, headline: t.isBlocked(target.id, target.name), facts: [...line.blockedBy.map((b) => `${t.reason}: ${b}.`), line.requiredCondition ? `${t.unblock}: ${line.requiredCondition}.` : t.noCond], refs: [target.id, r.decision.id, ...(binding ? [binding.id] : [])], sufficient: true };
    }
    case "wouldChange":
      return { ...base, headline: t.wouldChange(r.decision.id, r.decision.wouldChangeIf.length), facts: r.decision.wouldChangeIf.map((c) => `${c.metric} ${c.operator} ${c.threshold}: ${c.why}.`), refs: [r.decision.id], sufficient: r.decision.wouldChangeIf.length > 0 };
    case "limiting":
      return binding
        ? { ...base, headline: t.limiting(binding.id, binding.name), facts: [t.observedVs(binding.metric, fmtMetric(binding.metric, binding.observed), fmtMetric(binding.metric, binding.benchmark), pct(binding.attainment)), d.bindingWhy, t.gap(gbp(binding.gapGbp.low), gbp(binding.gapGbp.high), binding.status, binding.confidence)], refs: [binding.id, ...binding.evidence], sufficient: true }
        : { ...base, headline: t.noLimiting, facts: [], refs: [], sufficient: false };
    case "addressable":
      return { ...base, headline: t.dedup(gbp(d.deduplicatedGbp.low), gbp(d.deduplicatedGbp.high)), facts: [t.naive(gbp(d.totalAddressableGbp)), t.dedupRule(d.dedupMethod), t.aap(gbp(d.actualGbp), gbp(d.attainableGbp), gbp(d.potentialGbp)), t.benchNote], refs: d.constraints.map((c) => c.id), sufficient: true };
    case "confidence":
      if (named) return { ...base, headline: t.conf(named.id, pct(named.confidence)), facts: [t.basis(named.confidenceBasis), named.calibration ? t.calibrated(named.calibration.factor, named.calibration.cycles) : t.notCalibrated], refs: [named.id], sufficient: true };
      return { ...base, headline: t.decConf(pct(r.decision.confidence), r.decision.confidenceBasis), facts: r.interventions.map((i) => `${i.id}: ${pct(i.confidence)} — ${i.confidenceBasis}.`), refs: [r.decision.id, ...r.interventions.map((i) => i.id)], sufficient: true };
    case "measurement": {
      const m = r.measurement;
      if (!m) return { ...base, headline: t.noMeasure, facts: [r.plan ? t.planNoOutcome : t.nothingRegistered], refs: r.plan ? [r.plan.id] : [], sufficient: false };
      return { ...base, headline: t.meas(m.status, m.planStatus), facts: [t.measFact(gbp(m.incrementalPointGbp), gbp(m.incrementalGbp.low), gbp(m.incrementalGbp.high), gbp(m.observedGbp), gbp(m.counterfactualGbp)), t.method(m.method, m.methodWhy), t.placebo(m.placebo.note, m.placebo.rank, m.placebo.of), t.intact(m.planId, m.planIntact), ...(r.outcome ? [t.truth(gbp(r.outcome.trueGainGbp))] : [])], refs: [m.planId], sufficient: true };
    }
    case "learning": {
      const l = r.learning;
      if (!l) return { ...base, headline: t.noLearning, facts: [t.learningOnly], refs: [], sufficient: false };
      return { ...base, headline: t.learned(l.id, l.calibrationApplied), facts: [t.learnFact(gbp(l.expectedGbp), gbp(l.observedGbp), pct(l.error)), l.calibrationNote + "."], refs: [l.id], sufficient: true };
    }
    case "exposure":
      return { ...base, headline: t.exposures(r.exposures.length), facts: r.exposures.map((e) => t.expFact(e.id, e.name, e.probability, e.probabilityBasis, gbp(e.valueAtRiskGbp.low), gbp(e.valueAtRiskGbp.high), e.horizonMonths)), refs: r.exposures.map((e) => e.id), sufficient: true };
    case "recommend": {
      const funded = r.allocation.lines.filter((l) => l.funded), blocked = r.allocation.lines.filter((l) => !l.funded);
      return { ...base, headline: funded.length ? t.fund(funded.map((l) => l.interventionId).join(t.and), gbp(r.allocation.allocatedGbp), gbp(r.allocation.budgetGbp), gbp(r.allocation.reserveGbp)) : t.fundNothing,
        facts: [...funded.map((l) => { const i = r.interventions.find((x) => x.id === l.interventionId)!; return t.line(i.id, i.name, gbp(i.costGbp), gbp(l.expectedValueGbp), pct(i.confidence)); }), ...blocked.map((l) => t.blockedLine(l.interventionId, l.blockedBy[0] ?? "")), t.gov(r.decision.governance.level, r.decision.governance.reason), t.assay(r.assay.verdict, r.assay.reason)],
        refs: [r.decision.id, ...funded.map((l) => l.interventionId)], sufficient: true };
    }
    case "evidence":
      return { ...base, headline: t.evidence(r.property.observations.length), facts: [t.evFact1, t.evFact2], refs: r.property.observations.slice(0, 5).map((o) => o.id), sufficient: true };
    default:
      return { ...base, headline: t.unknown, facts: [t.tryThese], refs: [r.decision.id], sufficient: false };
  }
}
