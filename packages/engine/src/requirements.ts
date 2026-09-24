/**
 * DATA REQUIREMENTS FOR DECISIONS — what must be known to take each decision responsibly. A critical requirement that is
 * missing blocks the decision with INSUFFICIENT EVIDENCE, unless a purchasable study supplies it (then: INVESTIGATE).
 */
import type { Observation } from "./model.js";
import type { SystemSnapshots } from "./context/types.js";

export interface Requirement { readonly item: string; readonly metrics: readonly string[]; readonly critical: boolean; readonly suppliedByStudy?: string }
export interface RequirementCheck { readonly item: string; readonly critical: boolean; readonly satisfied: boolean; readonly how: string }
export interface RequirementsResult { readonly interventionId: string; readonly checks: readonly RequirementCheck[]; readonly missingCritical: readonly string[]; readonly verdict: "SUFFICIENT" | "INVESTIGATE" | "INSUFFICIENT_EVIDENCE"; readonly note: string }

export const REQUIREMENTS: Record<string, Requirement[]> = {
  "I-001": [{ item: "booking funnel by device", metrics: ["conv.mobile", "conv.desktop", "sessions.mobile_share"], critical: true }, { item: "booking value", metrics: ["booking_value_avg"], critical: true }, { item: "page speed", metrics: ["page_speed_mobile_ms"], critical: false }],
  "I-002": [{ item: "channel mix and commission", metrics: ["ota_share", "ota_commission_rate"], critical: true }, { item: "rate parity evidence", metrics: ["competitor.rate_gap"], critical: false, suppliedByStudy: "OTA vs direct price-parity study" }],
  "I-003": [{ item: "guest base and consent", metrics: ["crm.past_guests", "crm.repeat_rate"], critical: true }, { item: "email engagement", metrics: ["crm.email_open_rate"], critical: false }],
  "I-004": [{ item: "booking conversion", metrics: ["conv.mobile", "conv.desktop"], critical: true }, { item: "capacity headroom", metrics: ["ops.peak_occupancy"], critical: true }, { item: "acquisition economics (spend, clicks)", metrics: ["ads.meta_spend", "ads.clicks"], critical: true }, { item: "contribution margin", metrics: ["contribution_margin"], critical: true, suppliedByStudy: "cost-base review" }, { item: "demand quality", metrics: ["ads.conversions"], critical: false }, { item: "attribution confidence", metrics: ["ads.attribution.holdout"], critical: true, suppliedByStudy: "4-week geo-holdout test" }],
  "I-005": [{ item: "booking conversion", metrics: ["conv.mobile", "conv.desktop"], critical: true }, { item: "capacity headroom", metrics: ["ops.peak_occupancy"], critical: true }, { item: "acquisition economics (spend, clicks)", metrics: ["ads.google_spend", "ads.clicks"], critical: true }, { item: "contribution margin", metrics: ["contribution_margin"], critical: true, suppliedByStudy: "cost-base review" }, { item: "attribution confidence", metrics: ["ads.attribution.holdout"], critical: true, suppliedByStudy: "4-week search-term holdout test" }],
};

export function checkRequirements(interventionId: string, observations: readonly Observation[], systems: SystemSnapshots, qualityOf: (source: string) => number): RequirementsResult {
  const reqs = REQUIREMENTS[interventionId] ?? [];
  const has = (m: string) => {
    if (m === "ads.attribution.holdout") return (systems.ads ?? []).some((a) => a.attributionModel === "holdout_test");
    const o = observations.find((x) => x.metric === m); return Boolean(o) && qualityOf(o!.source) >= 0.5;
  };
  const checks: RequirementCheck[] = reqs.map((r) => { const ok = r.metrics.every(has); const stale = r.metrics.some((m) => { const o = observations.find((x) => x.metric === m); return o && qualityOf(o.source) < 0.5; }); return { item: r.item, critical: r.critical, satisfied: ok, how: ok ? `present (${r.metrics.join(", ")})` : stale ? `present but stale or incomplete (${r.metrics.join(", ")})` : r.suppliedByStudy ? `missing — obtainable by: ${r.suppliedByStudy}` : `missing (${r.metrics.join(", ")})` }; });
  const missing = checks.filter((c) => c.critical && !c.satisfied);
  const allStudyable = missing.every((m) => reqs.find((r) => r.item === m.item)?.suppliedByStudy || m.how.startsWith("present but stale"));
  const verdict: RequirementsResult["verdict"] = !missing.length ? "SUFFICIENT" : allStudyable ? "INVESTIGATE" : "INSUFFICIENT_EVIDENCE";
  return { interventionId, checks, missingCritical: missing.map((m) => m.item), verdict, note: !missing.length ? "all critical data present" : verdict === "INVESTIGATE" ? `INSUFFICIENT EVIDENCE for a responsible decision: ${missing.map((m) => m.item).join(", ")} — obtainable by ${[...new Set(missing.map((m) => m.how.startsWith("present but stale") ? "refreshing the stale source" : reqs.find((r) => r.item === m.item)?.suppliedByStudy))].join(", ")}` : `INSUFFICIENT EVIDENCE: ${missing.map((m) => m.item).join(", ")} — no study supplies it; connect the system that holds it` };
}
