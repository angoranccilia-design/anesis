/**
 * Candidate interventions derived from the constraints. Effect ranges are fractions of the constraint gap
 * (declared assumptions); confidence is a declared prior, adjusted only by calibration from learning records.
 */
import type { Constraint, Diagnosis, Intervention, Range } from "./model.js";

export interface CalibrationFactor { readonly factor: number; readonly cycles: number }
export type Calibration = Readonly<Record<string, CalibrationFactor>>;

const scale = (r: Range, lo: number, hi: number): Range => ({ low: r.low * lo, high: r.high * hi });
const midOf = (r: Range): number => (r.low + r.high) / 2;

export interface FunnelInputs { readonly mobileShare: number; readonly convMobile: number; readonly convDesktop: number; readonly bookingValue: number }

export function interventions(d: Diagnosis, inputs: FunnelInputs, cal: Calibration = {}): Intervention[] {
  const c = (id: string): Constraint => { const x = d.constraints.find((k) => k.id === id); if (!x) throw new Error(`missing ${id}`); return x; };
  const C1 = c("C-001"), C2 = c("C-002"), C3 = c("C-003"), C4 = c("C-004");
  // Paid acquisition: £24,000 at a blended £1.10 CPC buys sessions that convert at the CURRENT blended rate.
  const paidSessions = 24_000 / 1.10;
  const blended = inputs.mobileShare * inputs.convMobile + (1 - inputs.mobileShare) * inputs.convDesktop;
  const blendedBench = inputs.mobileShare * C1.benchmark + (1 - inputs.mobileShare) * inputs.convDesktop;
  const paidRevenue = paidSessions * blended * inputs.bookingValue;
  const uplift = blendedBench / blended;
  const base: Intervention[] = [
    {
      id: "I-001", name: "Fix the mobile booking journey (checkout, speed, rate display)", actsOn: "conversion", addresses: ["C-001", "C-002"],
      costGbp: 8_000, effectIfWorksGbp: scale(C1.gapGbp, 0.6, 0.9), confidence: 0.68,
      confidenceBasis: "declared prior — booking-journey fixes on a clearly sub-benchmark mobile funnel; to be calibrated",
      risk: "Low", reversibility: "High", timeToImpactWeeks: 6, mustFollow: [],
      informationOption: { name: "UX audit + booking-engine analytics review", costGbp: 3_000, quality: 0.6 },
      evidence: C1.evidence, calibration: null,
    },
    {
      id: "I-002", name: "Improve the direct-value proposition (member rate, perks, parity)", actsOn: "direct_capture", addresses: ["C-002"],
      costGbp: 4_500, effectIfWorksGbp: scale(C2.gapGbp, 0.5, 0.8), confidence: 0.55,
      confidenceBasis: "declared prior — depends on a working direct funnel", risk: "Low", reversibility: "High", timeToImpactWeeks: 10,
      mustFollow: ["I-001"], informationOption: { name: "OTA vs direct price-parity study", costGbp: 1_500, quality: 0.7 },
      evidence: C2.evidence, calibration: null,
    },
    {
      id: "I-003", name: "CRM reactivation programme (segmented email, pre-arrival, post-stay)", actsOn: "retention", addresses: ["C-003"],
      costGbp: 3_500, effectIfWorksGbp: scale(C3.gapGbp, 0.5, 0.7), confidence: 0.60,
      confidenceBasis: "declared prior — reactivation on a consented base", risk: "Low", reversibility: "High", timeToImpactWeeks: 12,
      mustFollow: [], informationOption: { name: "CRM data-quality check", costGbp: 1_000, quality: 0.5 },
      evidence: C3.evidence, calibration: null,
    },
    {
      id: "I-004", name: "Increase paid acquisition (+£2,000/month Meta & Google)", actsOn: "demand", addresses: ["C-004"],
      costGbp: 24_000, effectIfWorksGbp: { low: paidRevenue * 0.7, high: paidRevenue * 1.1 }, confidence: 0.40,
      confidenceBasis: `declared prior — paid traffic lands on the current mobile funnel; if it works, £${paidRevenue.toFixed(0)} at the current blended conversion (${(blended * 100).toFixed(2)} %), ${(uplift * 100 - 100).toFixed(0)} % more once C-001 reaches benchmark`,
      risk: "Medium", reversibility: "Medium", timeToImpactWeeks: 4,
      mustFollow: ["I-001"], informationOption: { name: "4-week geo-holdout test", costGbp: 4_000, quality: 0.8 },
      evidence: [...C4.evidence, ...C1.evidence], calibration: null,
    },
  ];
  return base.map((i) => {
    const f = cal[i.id];
    if (!f || f.factor === 1) return i;
    return { ...i, effectIfWorksGbp: { low: i.effectIfWorksGbp.low * f.factor, high: i.effectIfWorksGbp.high * f.factor }, calibration: { factor: f.factor, cycles: f.cycles } };
  });
}

export const expectedValue = (i: Intervention): number => i.confidence * midOf(i.effectIfWorksGbp) - i.costGbp;
