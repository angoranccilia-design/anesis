/**
 * Candidate interventions derived from the constraints. Effect ranges are fractions of the constraint gap
 * (declared assumptions); confidence is a declared prior, adjusted by calibration from learning records and by
 * the data quality of the evidence it rests on (quality factor ≤ 1, see DATA_PROVENANCE.md).
 */
import type { Constraint, Diagnosis, Intervention, Range } from "./model.js";

export interface CalibrationFactor { readonly factor: number; readonly cycles: number }
export type Calibration = Readonly<Record<string, CalibrationFactor>>;
export interface FunnelInputs { readonly mobileShare: number; readonly convMobile: number; readonly convDesktop: number; readonly bookingValue: number }

const scale = (r: Range, lo: number, hi: number): Range => ({ low: r.low * lo, high: r.high * hi });
const midOf = (r: Range): number => (r.low + r.high) / 2;

/** Paid channels: declared cost per click and conversion multiple vs the site's blended conversion (search intent converts better than social). */
export const PAID_CHANNELS = {
  meta: { cpcGbp: 0.85, convMultiple: 0.8, name: "Meta (Facebook / Instagram)" },
  google: { cpcGbp: 1.60, convMultiple: 1.5, name: "Google Search" },
} as const;

export function interventions(d: Diagnosis, inputs: FunnelInputs, cal: Calibration = {}, qualityFor: (constraintId: string) => number = () => 1): Intervention[] {
  const c = (id: string): Constraint => { const x = d.constraints.find((k) => k.id === id); if (!x) throw new Error(`missing ${id}`); return x; };
  const C1 = c("C-001"), C2 = c("C-002"), C3 = c("C-003"), C4 = c("C-004");
  const blended = inputs.mobileShare * inputs.convMobile + (1 - inputs.mobileShare) * inputs.convDesktop;
  const blendedBench = inputs.mobileShare * C1.benchmark + (1 - inputs.mobileShare) * inputs.convDesktop;
  const uplift = blendedBench / blended;
  const paid = (ch: keyof typeof PAID_CHANNELS, budget: number) => {
    const s = budget / PAID_CHANNELS[ch].cpcGbp; const rev = s * blended * PAID_CHANNELS[ch].convMultiple * inputs.bookingValue;
    return { sessions: s, revenue: rev };
  };
  const meta = paid("meta", 24_000), google = paid("google", 24_000);
  const base: Intervention[] = [
    { id: "I-001", name: "Fix the mobile booking journey (checkout, speed, rate display)", actsOn: "conversion", addresses: ["C-001", "C-002"], costGbp: 8_000, effectIfWorksGbp: scale(C1.gapGbp, 0.6, 0.9), confidence: 0.68, confidenceBasis: "declared prior — booking-journey fixes on a clearly sub-benchmark mobile funnel; to be calibrated", risk: "Low", reversibility: "High", timeToImpactWeeks: 6, mustFollow: [], informationOption: { name: "UX audit + booking-engine analytics review", costGbp: 3_000, quality: 0.6 }, evidence: C1.evidence, calibration: null },
    { id: "I-002", name: "Improve the direct-value proposition (member rate, perks, parity)", actsOn: "direct_capture", addresses: ["C-002"], costGbp: 4_500, effectIfWorksGbp: scale(C2.gapGbp, 0.5, 0.8), confidence: 0.55, confidenceBasis: "declared prior — depends on a working direct funnel", risk: "Low", reversibility: "High", timeToImpactWeeks: 10, mustFollow: ["I-001"], informationOption: { name: "OTA vs direct price-parity study", costGbp: 1_500, quality: 0.7 }, evidence: C2.evidence, calibration: null },
    { id: "I-003", name: "CRM reactivation programme (segmented email, pre-arrival, post-stay)", actsOn: "retention", addresses: ["C-003"], costGbp: 3_500, effectIfWorksGbp: scale(C3.gapGbp, 0.5, 0.7), confidence: 0.60, confidenceBasis: "declared prior — reactivation on a consented base", risk: "Low", reversibility: "High", timeToImpactWeeks: 12, mustFollow: [], informationOption: { name: "CRM data-quality check", costGbp: 1_000, quality: 0.5 }, evidence: C3.evidence, calibration: null },
    { id: "I-004", name: `Increase paid acquisition — ${PAID_CHANNELS.meta.name} (+£2,000/month)`, actsOn: "demand", addresses: ["C-004"], costGbp: 24_000, effectIfWorksGbp: { low: meta.revenue * 0.7, high: meta.revenue * 1.1 }, confidence: 0.40, confidenceBasis: `declared prior — ${meta.sessions.toFixed(0)} sessions at £${PAID_CHANNELS.meta.cpcGbp} CPC land on the current funnel (${(blended * 100).toFixed(2)} % × ${PAID_CHANNELS.meta.convMultiple}); ${((uplift - 1) * 100).toFixed(0)} % more once C-001 reaches benchmark`, risk: "Medium", reversibility: "Medium", timeToImpactWeeks: 4, mustFollow: ["I-001"], informationOption: { name: "4-week geo-holdout test", costGbp: 4_000, quality: 0.8 }, evidence: [...C4.evidence, ...C1.evidence], calibration: null },
    { id: "I-005", name: `Increase paid acquisition — ${PAID_CHANNELS.google.name} (+£2,000/month)`, actsOn: "demand", addresses: ["C-004"], costGbp: 24_000, effectIfWorksGbp: { low: google.revenue * 0.7, high: google.revenue * 1.1 }, confidence: 0.45, confidenceBasis: `declared prior — ${google.sessions.toFixed(0)} sessions at £${PAID_CHANNELS.google.cpcGbp} CPC with search intent (× ${PAID_CHANNELS.google.convMultiple} conversion); same funnel dependency`, risk: "Medium", reversibility: "High", timeToImpactWeeks: 4, mustFollow: ["I-001"], informationOption: { name: "4-week search-term holdout test", costGbp: 3_000, quality: 0.8 }, evidence: [...C4.evidence, ...C1.evidence], calibration: null },
  ];
  return base.map((i) => {
    const f = cal[i.id];
    const q = Math.min(...i.addresses.map(qualityFor), 1);
    const withCal = !f || f.factor === 1 ? i : { ...i, effectIfWorksGbp: { low: i.effectIfWorksGbp.low * f.factor, high: i.effectIfWorksGbp.high * f.factor }, calibration: { factor: f.factor, cycles: f.cycles } };
    return q >= 1 ? withCal : { ...withCal, confidence: Number((withCal.confidence * q).toFixed(3)), confidenceBasis: `${withCal.confidenceBasis}; × data-quality factor ${q.toFixed(2)} (stale or incomplete evidence)` };
  });
}

export const expectedValue = (i: Intervention): number => i.confidence * midOf(i.effectIfWorksGbp) - i.costGbp;
