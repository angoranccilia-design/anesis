/**
 * VALUE OF INFORMATION — expected value of perfect information (EVPI) and of the information actually
 * purchasable (EVSI = quality × EVPI). Also the Assay verdict: is the diagnosis itself worth its price?
 */
import type { AssayVerdict, Intervention, VoiResult } from "./model.js";
import { expectedValue } from "./interventions.js";
import { PARAMS, type Params } from "./benchmarks.js";

/** Decision "act or not". If it works the value is ~uniform(low, high); otherwise 0. */
export function evpi(i: Intervention): number {
  const { low: lo, high: hi } = i.effectIfWorksGbp, c = i.costGbp;
  let gainIfWorks: number;
  if (hi <= c) gainIfWorks = 0;
  else if (lo >= c) gainIfWorks = (lo + hi) / 2 - c;
  else gainIfWorks = (hi - c) ** 2 / (2 * (hi - lo));
  return i.confidence * gainIfWorks - Math.max(expectedValue(i), 0);
}

export function valueOfInformation(i: Intervention): VoiResult {
  const ev = expectedValue(i), e = evpi(i);
  const opt = i.informationOption;
  const evsi = opt ? opt.quality * e : 0, cost = opt ? opt.costGbp : 0;
  let decision: VoiResult["decision"], reason: string;
  if (opt && evsi > cost) {
    decision = "COLLECT_MORE_INFORMATION";
    reason = `the purchasable information (${opt.name}) is worth £${evsi.toFixed(0)} against a cost of £${cost.toFixed(0)}: resolve the doubt before committing £${i.costGbp.toLocaleString("en-GB")}`;
  } else if (ev > 0) {
    decision = "PROCEED";
    reason = opt
      ? `expected value £${ev.toFixed(0)} > 0 and the information option (${opt.name}, £${cost}) is worth only £${evsi.toFixed(0)}: acting beats studying`
      : `expected value £${ev.toFixed(0)} > 0 and no cheaper information is available`;
  } else {
    decision = "DO_NOT_ACT";
    reason = `expected value £${ev.toFixed(0)} ≤ 0 and information would not change that (EVSI £${evsi.toFixed(0)})`;
  }
  return { interventionId: i.id, expectedValueGbp: ev, evpiGbp: e, evsiGbp: evsi, informationCostGbp: cost, decision, reason };
}

/** Value of the diagnosis = value of the informed plan − value of what the owner would do anyway. */
export function assayVerdict(all: readonly Intervention[], ownerPlan: string | null, informedPlanValueGbp: number, budgetGbp: number, P: Params = PARAMS): AssayVerdict {
  let ownerValue = 0, ownerNote = "the owner had no declared plan";
  if (ownerPlan) {
    const o = all.find((i) => i.id === ownerPlan);
    if (o) {
      const s = Math.min(1, budgetGbp / o.costGbp);
      ownerValue = (o.confidence * (o.effectIfWorksGbp.low + o.effectIfWorksGbp.high) / 2 - o.costGbp) * s;
      ownerNote = `the owner's plan (${o.id}) has expected value £${ownerValue.toFixed(0)} at this budget`;
    }
  }
  const value = Math.max(0, informedPlanValueGbp - ownerValue);
  const ratio = value / P.thesisPriceGbp;
  const verdict: AssayVerdict["verdict"] = ratio >= P.valueMultipleToAccept ? "PROCEED" : ratio >= 1 ? "MORE_INFORMATION_REQUIRED" : "DECLINE";
  const reason = `${ownerNote}; the informed plan is worth £${informedPlanValueGbp.toFixed(0)}; the diagnosis adds £${value.toFixed(0)} = ${ratio.toFixed(1)}× the Thesis price (£${P.thesisPriceGbp.toLocaleString("en-GB")}); rule: ≥ ${P.valueMultipleToAccept}× to proceed, ≥ 1× to seek more information, otherwise decline`;
  return { ownerPlanValueGbp: ownerValue, informedPlanValueGbp, valueOfDiagnosisGbp: value, thesisPriceGbp: P.thesisPriceGbp, ratio, verdict, reason };
}
