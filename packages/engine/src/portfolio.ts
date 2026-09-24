/**
 * PORTFOLIO MEMORY — cross-property learning by partial pooling. Evidence levels are never blurred:
 * property-specific evidence, portfolio evidence and external benchmark are reported separately, and pooling is
 * OFF by default ("may use hierarchical estimation subject to empirical validation").
 */
import type { LearningRecord } from "./model.js";
import type { PropertySpec } from "./property.js";

export interface PropertyProfile { readonly id: string; readonly type: PropertySpec["type"]; readonly rooms: number; readonly bindingHistory: readonly string[]; readonly learning: readonly LearningRecord[] }

export function similarProperties(target: PropertyProfile, others: readonly PropertyProfile[]): { profile: PropertyProfile; similarity: number; why: string }[] {
  return others.filter((o) => o.id !== target.id).map((o) => {
    const typeMatch = o.type === target.type ? 1 : 0;
    const sizeMatch = Math.max(0, 1 - Math.abs(o.rooms - target.rooms) / Math.max(target.rooms, 1));
    const tb = new Set(target.bindingHistory), ob = new Set(o.bindingHistory);
    const inter = [...tb].filter((x) => ob.has(x)).length, union = new Set([...tb, ...ob]).size;
    const constraintMatch = union ? inter / union : 0;
    const similarity = 0.4 * typeMatch + 0.3 * sizeMatch + 0.3 * constraintMatch;
    return { profile: o, similarity, why: `type ${typeMatch ? "same" : "different"}; size match ${(sizeMatch * 100).toFixed(0)} %; constraint pattern overlap ${(constraintMatch * 100).toFixed(0)} %` };
  }).filter((x) => x.similarity >= 0.5).sort((a, b) => b.similarity - a.similarity);
}

export interface PooledEstimate { readonly interventionId: string; readonly propertyFactor: number | null; readonly propertyN: number; readonly portfolioFactor: number | null; readonly portfolioN: number; readonly pooledFactor: number; readonly weightOnProperty: number; readonly evidenceLevel: "property" | "portfolio" | "benchmark" | "partial_pooling"; readonly enabled: boolean; readonly formula: string }

const meanErr = (rs: readonly LearningRecord[], id: string) => { const e = rs.filter((r) => r.interventionTypes.includes(id) && r.measurementStatus !== "INCONCLUSIVE").map((r) => r.error); return e.length ? { mean: e.reduce((a, b) => a + b, 0) / e.length, n: e.length } : { mean: null, n: 0 }; };

/**
 * pooled = (n_p · f_p + κ · f_port) / (n_p + κ), κ = 3 (declared prior strength). With pooling disabled the
 * property factor is used when it exists, else 1 (benchmark). The evidence level is always reported.
 */
export function pooledCalibration(interventionId: string, property: readonly LearningRecord[], portfolio: readonly LearningRecord[], enabled = false, kappa = 3): PooledEstimate {
  const p = meanErr(property, interventionId), q = meanErr(portfolio, interventionId);
  const clamp = (x: number) => Number(Math.min(1.5, Math.max(0.5, x)).toFixed(2));
  const fp = p.mean === null ? null : clamp(1 + p.mean * (p.n / (p.n + kappa)));
  const fq = q.mean === null ? null : clamp(1 + q.mean * (q.n / (q.n + kappa)));
  if (!enabled || fq === null) return { interventionId, propertyFactor: fp, propertyN: p.n, portfolioFactor: fq, portfolioN: q.n, pooledFactor: fp ?? 1, weightOnProperty: fp === null ? 0 : 1, evidenceLevel: fp === null ? "benchmark" : "property", enabled, formula: enabled ? "no portfolio evidence: property factor or 1" : "pooling disabled: property factor or 1" };
  const w = p.n / (p.n + kappa);
  const pooled = w * (fp ?? 1) + (1 - w) * fq;
  return { interventionId, propertyFactor: fp, propertyN: p.n, portfolioFactor: fq, portfolioN: q.n, pooledFactor: Number(pooled.toFixed(2)), weightOnProperty: w, evidenceLevel: fp === null ? "portfolio" : "partial_pooling", enabled, formula: `pooled = w·f_p + (1−w)·f_port, w = n_p/(n_p+κ) = ${w.toFixed(2)}, κ = ${kappa}` };
}
