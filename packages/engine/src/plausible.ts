/**
 * PLAUSIBLE PERTURBATION RANGES — sensitivity is never ±20 % of anything. Each variable gets a domain the property could
 * actually visit: its own history, a statistical interval, a controllable range, or a declared operational bound. The
 * range carries its source and a confidence, and the decision-sensitivity question becomes: which uncertainty, within its
 * plausible range, is most capable of changing the actual decision?
 */
import type { PropertySpec } from "./property.js";
import type { BenchMap } from "./benchmarks.js";

export interface PlausibleRange { readonly key: string; readonly label: string; readonly kind: "spec" | "bench"; readonly central: number; readonly min: number; readonly max: number; readonly confidence: number; readonly source: string; readonly method: string }

const q = (xs: readonly number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))] ?? 0; };

/** Builds the plausible domain of each decision input from the property's history and declared operational bounds. */
export function plausibleRanges(spec: PropertySpec, bench: BenchMap, weeklyPre: readonly number[], competitorRates: readonly number[] = []): PlausibleRange[] {
  const mean = weeklyPre.reduce((a, b) => a + b, 0) / Math.max(1, weeklyPre.length);
  const idx = weeklyPre.map((v) => v / (mean || 1));
  // weekly revenue index p10–p90 bounds what occupancy × ADR has actually done over the history; split between the two conservatively
  const lo = q(idx, 0.1), hi = q(idx, 0.9);
  const adrSpan = Math.sqrt(Math.max(lo, 0.5)), adrSpanHi = Math.sqrt(hi);
  const occLo = Math.max(0.2, Math.min(spec.occupancy, spec.occupancy * Math.sqrt(Math.max(lo, 0.5)))), occHi = Math.min(0.95, spec.occupancy * Math.sqrt(hi));
  // conversion: exact binomial-style interval on 8 weeks of mobile sessions (statistical), widened by a declared operational band of ±35 % (what booking-journey changes have plausibly produced)
  const nMobile = (spec.sessionsPerYear * spec.mobileShare * 8) / 52; const p = spec.convMobile; const se = Math.sqrt(p * (1 - p) / Math.max(1, nMobile));
  const convLo = Math.max(0.001, Math.min(p - 1.96 * se, p * 0.65)), convHi = Math.min(0.06, Math.max(p + 1.96 * se, p * 1.35 * 2.2));
  // traffic volatility: 8-week rolling means of the history, p10–p90 relative to the mean
  const roll: number[] = []; for (let i = 8; i <= weeklyPre.length; i++) roll.push(weeklyPre.slice(i - 8, i).reduce((a, b) => a + b, 0) / 8 / (mean || 1));
  const trafLo = roll.length ? q(roll, 0.1) : 0.85, trafHi = roll.length ? q(roll, 0.9) : 1.15;
  const compLo = competitorRates.length ? Math.min(...competitorRates) : null, compHi = competitorRates.length ? Math.max(...competitorRates) : null;
  return [
    { key: "convMobile", label: "Mobile booking conversion", kind: "spec", central: p, min: Number(convLo.toFixed(5)), max: Number(convHi.toFixed(5)), confidence: 0.7, source: `binomial interval on ${Math.round(nMobile).toLocaleString("en-GB")} mobile sessions (8 weeks) widened to the operational band achievable by booking-journey work (declared: ×0.65 to ×2.9)`, method: "statistical interval ∪ declared operational band" },
    { key: "convDesktop", label: "Desktop conversion", kind: "spec", central: spec.convDesktop, min: Number((spec.convDesktop * 0.8).toFixed(5)), max: Number((spec.convDesktop * 1.3).toFixed(5)), confidence: 0.6, source: "declared operational band ×0.8–×1.3", method: "declared" },
    { key: "sessionsPerYear", label: "Website sessions", kind: "spec", central: spec.sessionsPerYear, min: Math.round(spec.sessionsPerYear * trafLo), max: Math.round(spec.sessionsPerYear * trafHi), confidence: 0.75, source: `p10–p90 of 8-week rolling means over ${weeklyPre.length} weeks of history (as a proxy for traffic volatility)`, method: "historical volatility" },
    { key: "adrGbp", label: "ADR", kind: "spec", central: spec.adrGbp, min: Math.round(spec.adrGbp * adrSpan), max: Math.round(compHi !== null ? Math.max(spec.adrGbp * adrSpanHi, compHi) : spec.adrGbp * adrSpanHi), confidence: 0.7, source: compHi !== null ? `history p10–p90 (√ of the weekly revenue index) and the observed comparable-set range £${compLo}–£${compHi}` : "history p10–p90 (√ of the weekly revenue index)", method: "historical + market range" },
    { key: "occupancy", label: "Occupancy", kind: "spec", central: spec.occupancy, min: Number(occLo.toFixed(3)), max: Number(occHi.toFixed(3)), confidence: 0.7, source: "history p10–p90 (√ of the weekly revenue index), seasonal range included", method: "historical + seasonal range" },
    { key: "otaShare", label: "OTA share", kind: "spec", central: spec.otaShare, min: Number(Math.max(0.05, spec.otaShare - 0.12).toFixed(3)), max: Number(Math.min(0.9, spec.otaShare + 0.08).toFixed(3)), confidence: 0.6, source: "declared: −12 / +8 points, the range direct-capture programmes and OTA drift have plausibly produced in a year", method: "declared" },
    { key: "repeatRate", label: "Repeat rate", kind: "spec", central: spec.repeatRate, min: Number(Math.max(0.01, spec.repeatRate * 0.7).toFixed(3)), max: Number(Math.min(0.5, spec.repeatRate * 1.8).toFixed(3)), confidence: 0.6, source: "declared: ×0.7–×1.8, the band CRM programmes have plausibly produced", method: "declared" },
    { key: "peakOccupancy", label: "Peak occupancy (capacity)", kind: "spec", central: spec.peakOccupancy, min: Number(Math.max(spec.occupancy, spec.peakOccupancy - 0.06).toFixed(3)), max: Number(Math.min(1, spec.peakOccupancy + 0.06).toFixed(3)), confidence: 0.7, source: "declared operational bound: ±6 points on peak nights, never above 100 %", method: "operational bound" },
    { key: "metaSpendGbp", label: "Meta spend", kind: "spec", central: spec.metaSpendGbp, min: Math.round(spec.metaSpendGbp * 0.5), max: Math.round(spec.metaSpendGbp * 2), confidence: 0.9, source: "controllable range ×0.5–×2", method: "controllable" },
    { key: "conv.mobile.p50", label: "Benchmark mobile conversion p50", kind: "bench", central: bench["conv.mobile.p50"] ?? 0.012, min: 0.009, max: 0.016, confidence: 0.4, source: "declared uncertainty of a placeholder benchmark (p25–p75 of plausible sources)", method: "declared" },
    { key: "substitution_to_ota", label: "Substitution to OTA (dedup)", kind: "bench", central: bench["substitution_to_ota"] ?? 0.4, min: 0.2, max: 0.6, confidence: 0.4, source: "declared uncertainty of the deduplication assumption", method: "declared" },
  ];
}
