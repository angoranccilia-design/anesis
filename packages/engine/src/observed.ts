/**
 * OBSERVED CHANGE on the property's own weekly history — what a real intervention can show today, without comparables.
 * Post-window mean vs pre-window mean of weekly room revenue; when the same calendar weeks exist one year earlier, the
 * year-on-year movement of the pre-window is used to adjust for seasonality. The result is an observed change and is
 * labelled NOT_ESTABLISHED: without a pre-registered counterfactual and a placebo test, nothing here is incremental.
 */
import type { WeeklyPoint } from "./context/types.js";

export interface ObservedChangeInput { readonly weekly: readonly WeeklyPoint[]; readonly executedAt: string; readonly windowWeeks: number; readonly metric?: string }
export interface ObservedChange {
  readonly metric: string; readonly unit: "GBP/week";
  readonly preWeeks: number; readonly postWeeks: number; readonly windowWeeks: number; readonly complete: boolean;
  readonly before: number | null; readonly after: number | null; readonly observedChange: number | null; readonly pctChange: number | null;
  readonly seasonalAdjustment: { readonly applied: boolean; readonly priorYearRatio: number | null; readonly note: string };
  readonly incrementality: "NOT_ESTABLISHED"; readonly method: string; readonly note: string; readonly computedAt: string;
}

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const addDays = (iso: string, d: number) => new Date(Date.parse(iso) + d * 86_400_000).toISOString().slice(0, 10);

export function observedChange(i: ObservedChangeInput, computedAt = new Date().toISOString()): ObservedChange {
  const metric = i.metric ?? "room_revenue";
  const known = i.weekly.filter((w) => w.revenueGbp !== null).map((w) => ({ weekStart: w.weekStart, v: w.revenueGbp as number })).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const start = i.executedAt.slice(0, 10);
  const post = known.filter((w) => w.weekStart >= start).slice(0, i.windowWeeks);
  const pre = known.filter((w) => w.weekStart < start).slice(-i.windowWeeks);
  const before = mean(pre.map((w) => w.v)), after = mean(post.map((w) => w.v));
  // seasonality: the same weeks one year earlier, for both windows, when the history holds them
  const yearBack = (ws: { weekStart: string }[]) => ws.map((w) => known.find((k) => k.weekStart === addDays(w.weekStart, -364))).filter((k): k is { weekStart: string; v: number } => !!k);
  const preLy = yearBack(pre), postLy = yearBack(post);
  const ratio = preLy.length === pre.length && postLy.length === post.length && pre.length > 0 && post.length > 0 && mean(preLy.map((w) => w.v))! > 0 ? mean(postLy.map((w) => w.v))! / mean(preLy.map((w) => w.v))! : null;
  const expectedAfter = before !== null && ratio !== null ? before * ratio : before;
  const change = after !== null && expectedAfter !== null ? after - expectedAfter : null;
  const complete = post.length >= i.windowWeeks && pre.length >= i.windowWeeks;
  return {
    metric, unit: "GBP/week", preWeeks: pre.length, postWeeks: post.length, windowWeeks: i.windowWeeks, complete,
    before, after, observedChange: change, pctChange: change !== null && expectedAfter ? change / expectedAfter : null,
    seasonalAdjustment: { applied: ratio !== null, priorYearRatio: ratio, note: ratio !== null ? `the same ${pre.length}+${post.length} weeks one year earlier moved by ×${ratio.toFixed(3)}; the pre-window mean is scaled by that before comparison` : "no full prior-year history for both windows: no seasonal adjustment; the change may be seasonal" },
    incrementality: "NOT_ESTABLISHED",
    method: "post-window mean of weekly room revenue vs pre-window mean (seasonally scaled when a prior year exists); property's own history only, no comparables, no placebo",
    note: !complete ? `partial: ${post.length}/${i.windowWeeks} post weeks and ${pre.length}/${i.windowWeeks} pre weeks available; the figure will move until the window is full` : "observed on the property's own history; not attributable to the intervention without a counterfactual",
    computedAt,
  };
}
