/**
 * LEARN — a learning record per measured cycle; calibration factors derived from records with shrinkage
 * n/(n+k). Calibration is claimed only when a factor actually differs from 1.
 */
import type { LearningRecord, MeasurementPlan, MeasurementResult } from "./model.js";
import type { Calibration } from "./interventions.js";
import { PARAMS, type Params } from "./benchmarks.js";

export function calibrationFactors(memory: readonly LearningRecord[], ids: readonly string[], P: Params = PARAMS): Calibration {
  const out: Record<string, { factor: number; cycles: number }> = {};
  for (const id of ids) {
    const errs = memory.filter((r) => r.interventionTypes.includes(id) && r.measurementStatus !== "INCONCLUSIVE").map((r) => r.error);
    if (!errs.length) continue;
    const n = errs.length, mean = errs.reduce((a, b) => a + b, 0) / n;
    const factor = Number(Math.min(1.5, Math.max(0.5, 1 + mean * (n / (n + P.shrinkageK)))).toFixed(2));
    out[id] = { factor, cycles: n };
  }
  return out;
}

export function learningRecord(id: string, propertyId: string, context: Record<string, number>, plan: MeasurementPlan, result: MeasurementResult, before: Calibration, after: Calibration, at: string): LearningRecord {
  const expected = plan.expectedPointGbp;
  const error = expected !== 0 ? (result.incrementalPointGbp - expected) / expected : 0;
  const changed = plan.interventionIds.filter((i) => (before[i]?.factor ?? 1) !== (after[i]?.factor ?? 1));
  const applied = changed.length > 0;
  const note = result.status === "INCONCLUSIVE"
    ? "measurement inconclusive: recorded, but no calibration is derived from it"
    : applied
      ? `calibration updated for ${changed.map((i) => `${i}: ${(before[i]?.factor ?? 1).toFixed(2)} → ${(after[i]?.factor ?? 1).toFixed(2)}`).join(", ")} (shrinkage n/(n+${PARAMS.shrinkageK}))`
      : "recorded; calibration factors unchanged";
  return { id, timestamp: at, propertyId, interventionTypes: plan.interventionIds, context, expectedGbp: expected, observedGbp: result.incrementalPointGbp, error, measurementStatus: result.status, calibrationApplied: applied, calibrationNote: note };
}
