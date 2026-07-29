/**
 * Document Thèse d'Acquisition (Porte 2) — FONCTION PURE, déterministe, sans DB ni LLM.
 * Transforme une `UnderwritingThesis` (postes de perte chiffrés) + un contexte d'établissement en un
 * document lisible : perte chiffrée et montant récupérable par poste (via `recoverableFraction` du
 * pilier), méthode de mesure, plan à 90 jours, et termes commerciaux PROPOSÉS (via `makeCommercialTerms`).
 *
 * en-GB, £. Aucun chiffre inventé : le récupérable se déduit de fractions versionnées (config), jamais
 * « à la main » ; un pilier inconnu de la config n'affiche PAS de récupérable (il est signalé). Les
 * termes sont conditionnels — aucun mandat payant n'est réputé exécuté avant l'installation UK.
 */
import {
  gbp,
  iso,
  makeCommercialTerms,
  mulMoney,
  sumMoney,
  type CommercialTerms,
  type Iso8601,
  type MandateFormula,
  type MandateTermMonths,
  type Money,
  type UnderwritingThesis,
} from "@anesis/core";
import { DEFAULT_PLANNING_CONFIG, type Pillar, type PillarPolicy, type PlanningConfig } from "./config.js";

/** Comment la récupération de chaque pilier est MESURÉE (en-GB). */
const MEASUREMENT: Record<Pillar, string> = {
  speed: "Direct-booking conversion rate on your own booking engine, before vs after.",
  reviews: "Review volume and average rating across Google and TripAdvisor, tracked monthly.",
  ota: "Share of bookings paying OTA commission, and direct-rate parity, tracked weekly.",
  retargeting: "Direct bookings recaptured from warm demand, measured against an agreed baseline.",
  social: "Direct enquiries and bookings attributable to the social channel, against a baseline.",
};

const DEFAULT_MEASUREMENT = "Measured against your own baseline, agreed in writing before we begin.";

export interface ThesisDocumentLine {
  readonly pillar: string;
  readonly rootCause: string;
  readonly pricedAnnual: Money;
  /** Récupérable annuel prudent, ou `null` si le pilier n'est pas couvert par la config (signalé). */
  readonly recoverableAnnual: Money | null;
  readonly measurement: string;
  readonly action: string;
}

export interface ThesisPlanPhase {
  readonly phase: string;
  readonly weeks: string;
  readonly focus: string;
}

export interface ThesisDocument {
  readonly propertyName: string;
  readonly region: string | null;
  readonly leakIndex: number;
  readonly lines: readonly ThesisDocumentLine[];
  readonly pricedAnnualTotal: Money;
  readonly recoverableAnnualTotal: Money;
  readonly ninetyDayPlan: readonly ThesisPlanPhase[];
  readonly terms: CommercialTerms | null;
  readonly generatedAt: Iso8601;
}

export interface ThesisDocumentOptions {
  readonly propertyName: string;
  readonly region?: string;
  /** Termes proposés : formule ET durée (indépendantes) → makeCommercialTerms. Omis → pas de section termes. */
  readonly formula?: MandateFormula;
  readonly termMonths?: MandateTermMonths;
  readonly config?: PlanningConfig;
  readonly now?: Iso8601;
}

const policyFor = (config: PlanningConfig, pillar: string): PillarPolicy | undefined =>
  (config.pillars as Record<string, PillarPolicy>)[pillar];

export function deriveThesisDocument(thesis: UnderwritingThesis, opts: ThesisDocumentOptions): ThesisDocument {
  const config = opts.config ?? DEFAULT_PLANNING_CONFIG;

  const lines: ThesisDocumentLine[] = thesis.lossLines.map((ll) => {
    const policy = policyFor(config, ll.pillar);
    return {
      pillar: ll.pillar,
      rootCause: ll.rootCause,
      pricedAnnual: ll.annualLoss,
      recoverableAnnual: policy ? mulMoney(ll.annualLoss, policy.recoverableFraction) : null,
      measurement: (MEASUREMENT as Record<string, string>)[ll.pillar] ?? DEFAULT_MEASUREMENT,
      action: policy?.taskIntent ?? "Agreed on assessment of the underlying cause.",
    };
  });

  const recoverableAnnualTotal = sumMoney(lines.map((l) => l.recoverableAnnual ?? gbp(0)));
  const pricedAnnualTotal = sumMoney(lines.map((l) => l.pricedAnnual));

  const actions = lines.map((l) => l.action);
  const ninetyDayPlan: ThesisPlanPhase[] = [
    { phase: "Diagnosis & foundations", weeks: "Weeks 1–2", focus: "Confirm the baseline from your own data and agree the measurement method for each line above." },
    { phase: "Coordinated launch", weeks: "Weeks 3–6", focus: actions.length ? actions.join("; ") + "." : "Launch the agreed recovery actions across the priced lines." },
    { phase: "Measured optimisation", weeks: "Weeks 7–12", focus: "Report recovered direct revenue in pounds against the baseline, then optimise monthly." },
  ];

  const terms =
    opts.formula != null && opts.termMonths != null ? makeCommercialTerms(opts.formula, opts.termMonths) : null;

  return {
    propertyName: opts.propertyName,
    region: opts.region ?? null,
    leakIndex: thesis.leakIndex,
    lines,
    pricedAnnualTotal,
    recoverableAnnualTotal,
    ninetyDayPlan,
    terms,
    generatedAt: opts.now ?? iso(),
  };
}

const pounds = (m: Money): string => `£${Math.round(m.pence / 100).toLocaleString("en-GB")}`;
const pct = (fraction: number): string => `${Math.round(fraction * 100)}%`;
const FORMULA_LABEL: Record<MandateFormula, string> = { growth: "Growth", domination: "Domination" };

/** Rend le document en Markdown lisible (en-GB). Le texte ne recalcule aucun chiffre. */
export function renderThesisMarkdown(doc: ThesisDocument): string {
  const out: string[] = [];
  out.push(`# Acquisition Thesis — ${doc.propertyName}`);
  out.push(doc.region ? `_${doc.region} · United Kingdom_` : `_United Kingdom_`);
  out.push("");
  out.push(`**Anesis Revenue Leak Index: ${doc.leakIndex}/100.**`);
  out.push(
    `We have priced ${pounds(doc.pricedAnnualTotal)} of annual revenue leak, of which we conservatively judge ` +
      `${pounds(doc.recoverableAnnualTotal)} to be recoverable. Every figure below is measured, not assumed.`,
  );
  out.push("");
  out.push(`## Where the money leaks`);
  for (const l of doc.lines) {
    out.push(`### ${l.pillar}`);
    out.push(`- **Priced leak:** ${pounds(l.pricedAnnual)}/yr`);
    out.push(`- **Conservatively recoverable:** ${l.recoverableAnnual ? `${pounds(l.recoverableAnnual)}/yr` : "to be scoped on assessment"}`);
    out.push(`- **Root cause:** ${l.rootCause}`);
    out.push(`- **How we measure it:** ${l.measurement}`);
    out.push(`- **What we do:** ${l.action}`);
    out.push("");
  }
  out.push(`## The 90-day plan`);
  for (const p of doc.ninetyDayPlan) {
    out.push(`- **${p.weeks} — ${p.phase}.** ${p.focus}`);
  }
  out.push("");
  out.push(`## Proposed terms`);
  if (doc.terms) {
    const t = doc.terms;
    out.push(`- **Formula:** ${FORMULA_LABEL[t.formula]}`);
    out.push(`- **Term:** ${t.termMonths} months`);
    out.push(`- **Monthly:** ${pounds(t.monthlySubscription)}`);
    out.push(`- **Incentive at end of term:** ${pct(t.incentiveRate)} of the direct revenue actually recovered (the rate follows the term, not the formula).`);
    out.push(`- **Photo/video sessions:** ${t.photoSessions}`);
    out.push("");
    out.push(
      `These terms are a proposal and are conditional; they would apply only from Anesis's official UK installation. ` +
        `Nothing here is a signed mandate or a request for payment.`,
    );
  } else {
    out.push(`To be proposed once the recovery scope is agreed. Any terms are conditional and apply only from official UK installation.`);
  }
  return out.join("\n");
}
