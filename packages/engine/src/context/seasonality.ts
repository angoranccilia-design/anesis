/**
 * SEASONALITY INTELLIGENCE — learned from the property's own weekly history plus the calendar.
 * Rule that never bends: seasonality is a pattern, not a cause. "Demand usually increases in this period"
 * is all it says; the counterfactual in measurement absorbs it, and no intervention is credited with it.
 */
import type { Holiday, OperationsSnapshot, OtaSnapshot } from "./types.js";

export type Phase = "high" | "shoulder" | "low";
export interface SeasonalWeek { readonly weekOfYear: number; readonly index: number; readonly phase: Phase }
export interface SeasonalProfile {
  readonly weeks: readonly SeasonalWeek[];          // 52
  readonly currentWeek: number;
  readonly currentPhase: Phase;
  readonly upcoming: readonly { readonly weekOfYear: number; readonly index: number; readonly phase: Phase; readonly holidays: readonly string[] }[];
  readonly weekendShare: number;
  readonly bookingWindowDays: number | null;
  readonly cancellationRate: number | null;
  readonly noShowRate: number | null;
  readonly yearsOfHistory: number;
  readonly statement: string;
  readonly causalNote: string;
  readonly formula: string;
}

export const CAUSAL_NOTE = "Seasonal variation is a recurring pattern absorbed by the synthetic-control counterfactual; it is never attributed to an intervention.";

export function seasonalProfile(weeklyPre: readonly number[], nowIso: string, holidays: readonly Holiday[], opts: { weekendShare?: number; ota?: OtaSnapshot | null; operations?: OperationsSnapshot | null } = {}): SeasonalProfile {
  const n = weeklyPre.length, years = Math.max(1, Math.floor(n / 52));
  const mean = weeklyPre.reduce((a, b) => a + b, 0) / n;
  const idx: number[] = Array.from({ length: 52 }, (_, w) => {
    const vals: number[] = []; for (let y = 0; y < years; y++) { const v = weeklyPre[n - 52 * (y + 1) + w]; if (v !== undefined) vals.push(v); }
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length / mean : 1;
  });
  const sorted = [...idx].sort((a, b) => a - b); const t1 = sorted[Math.floor(52 / 3)] ?? 1, t2 = sorted[Math.floor(2 * 52 / 3)] ?? 1;
  const weeks: SeasonalWeek[] = idx.map((v, w) => ({ weekOfYear: w + 1, index: v, phase: v >= t2 ? "high" : v >= t1 ? "shoulder" : "low" }));
  const now = new Date(nowIso); const jan1 = Date.UTC(now.getUTCFullYear(), 0, 1);
  const currentWeek = Math.min(52, Math.max(1, Math.floor((now.getTime() - jan1) / (7 * 86400e3)) + 1));
  const upcoming = Array.from({ length: 8 }, (_, k) => { const w = ((currentWeek - 1 + k) % 52) + 1; const wk = weeks[w - 1]!;
    const start = new Date(jan1 + (w - 1) * 7 * 86400e3), end = new Date(start.getTime() + 7 * 86400e3);
    const hs = holidays.filter((h) => { const d = new Date(h.date + "T00:00:00Z"); return d >= start && d < end; }).map((h) => h.name);
    return { weekOfYear: w, index: wk.index, phase: wk.phase, holidays: hs }; });
  const cur = weeks[currentWeek - 1]!;
  const next = upcoming.slice(1, 5); const nextHigh = next.filter((u) => u.phase === "high").length;
  const statement = `Current week ${currentWeek} is ${cur.phase} season (index ${cur.index.toFixed(2)} of annual mean). ` +
    (nextHigh >= 2 ? "Demand usually increases over the coming weeks." : next.every((u) => u.phase === "low") ? "Demand is usually at its lowest over the coming weeks." : "No strong seasonal shift is expected over the coming weeks.") +
    (upcoming.some((u) => u.holidays.length) ? ` Public holidays in the horizon: ${upcoming.flatMap((u) => u.holidays).join(", ")}.` : "");
  return {
    weeks, currentWeek, currentPhase: cur.phase, upcoming, weekendShare: opts.weekendShare ?? 0.58,
    bookingWindowDays: opts.ota?.channels.find((c) => c.bookingWindowDays !== null)?.bookingWindowDays ?? null,
    cancellationRate: opts.operations?.cancellationRate ?? null, noShowRate: opts.operations?.noShowRate ?? null,
    yearsOfHistory: years, statement, causalNote: CAUSAL_NOTE,
    formula: `index(w) = mean of week-w revenue over ${years} year(s) ÷ overall weekly mean; phases by terciles (low < ${t1.toFixed(2)} ≤ shoulder < ${t2.toFixed(2)} ≤ high)`,
  };
}
