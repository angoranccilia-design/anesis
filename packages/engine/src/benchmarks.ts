/**
 * Benchmarks and decision parameters.
 *
 * Every benchmark is a PLACEHOLDER with status BENCHMARK until a documented source replaces it.
 * Every parameter is a declared, versioned assumption of the methodology, not a fact about the world.
 * The UI shows both as such; the engine never treats them as observed.
 */
export interface Benchmark { readonly key: string; readonly value: number; readonly unit: string; readonly source: string; readonly note: string; }

export const BENCHMARKS: readonly Benchmark[] = [
  { key: "conv.mobile.p50", value: 0.012, unit: "ratio", source: "SRC-BENCH", note: "placeholder — median mobile conversion, independent UK hotels; to be replaced by a documented source" },
  { key: "conv.mobile.p75", value: 0.016, unit: "ratio", source: "SRC-BENCH", note: "placeholder — upper-quartile mobile conversion" },
  { key: "conv.desktop.p50", value: 0.024, unit: "ratio", source: "SRC-BENCH", note: "placeholder — median desktop conversion" },
  { key: "crm.repeat_rate.p50", value: 0.16, unit: "ratio", source: "SRC-BENCH", note: "placeholder — median repeat-guest rate, leisure country house" },
  { key: "crm.repeat_rate.p75", value: 0.22, unit: "ratio", source: "SRC-BENCH", note: "placeholder — upper-quartile repeat-guest rate" },
  { key: "ota_share.target", value: 0.35, unit: "ratio", source: "SRC-BENCH", note: "placeholder — OTA share reachable by a well-run independent" },
  { key: "ota.shiftable.low", value: 0.15, unit: "ratio", source: "SRC-BENCH", note: "assumption — share of excess OTA nights that can move to direct within a year (low)" },
  { key: "ota.shiftable.high", value: 0.35, unit: "ratio", source: "SRC-BENCH", note: "assumption — share of excess OTA nights that can move to direct within a year (high)" },
  { key: "low_season_occupancy.target", value: 0.50, unit: "ratio", source: "SRC-BENCH", note: "placeholder — attainable low-season occupancy" },
  { key: "sessions_per_room.p50", value: 3_500, unit: "sessions/room/year", source: "SRC-BENCH", note: "placeholder — website sessions per room per year" },
  { key: "crm.reachable_share", value: 0.50, unit: "ratio", source: "SRC-BENCH", note: "assumption — share of past guests with usable consent and address" },
  { key: "substitution_to_ota", value: 0.40, unit: "ratio", source: "SRC-BENCH", note: "assumption — share of abandoning direct visitors who book the same stay through an OTA instead (drives deduplication)" },
];

export type BenchMap = Readonly<Record<string, number>>;
export function benchMap(overrides: Partial<Record<string, number>> = {}): BenchMap {
  const m: Record<string, number> = {};
  for (const b of BENCHMARKS) m[b.key] = b.value;
  for (const [k, v] of Object.entries(overrides)) if (v !== undefined) { if (!(k in m)) throw new Error(`unknown benchmark ${k}`); m[k] = v; }
  return m;
}
export function bench(m: BenchMap, key: string): number {
  const v = m[key]; if (v === undefined) throw new Error(`missing benchmark ${key}`); return v;
}

export interface Params {
  readonly valueMultipleToAccept: number; // Thesis proceeds only if value of diagnosis ≥ k × its price
  readonly thesisPriceGbp: number;
  readonly downsidePenalty: number;       // λ in risk-adjusted value
  readonly reserveShare: number;          // budget held back, never allocated
  readonly shrinkageK: number;            // calibration trusts n/(n+k) of the mean past error
  readonly reversibility: Readonly<Record<"High" | "Medium" | "Low", number>>;
  readonly strategicDependencyWeight: number; // bonus multiplier for interventions that others must follow
}
export const PARAMS: Params = {
  valueMultipleToAccept: 3.0, thesisPriceGbp: 6_500, downsidePenalty: 0.5, reserveShare: 0.10, shrinkageK: 3,
  reversibility: { High: 1.0, Medium: 0.8, Low: 0.6 }, strategicDependencyWeight: 1.15,
};
