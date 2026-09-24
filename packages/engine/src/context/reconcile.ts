/**
 * INTER-SYSTEM RECONCILIATION — each system tells its own story (ads say ROAS 4.2, analytics say traffic +48 %, the
 * booking engine says conversion 1.8 %, the PMS says occupancy 61 %, the RMS says ADR +7 %, the CRM says repeat −12 %).
 * Anesis holds the logic that connects them: a claim is evidence about the constraint it touches, weighted by how the
 * number was produced (platform attribution is not a holdout), and the constraint with the highest unresolved value wins.
 */
import type { Constraint, Diagnosis } from "../model.js";
import type { SystemSnapshots } from "./types.js";

export interface SystemClaim { readonly system: string; readonly claim: string; readonly factor: string; readonly direction: "up" | "down" | "flat"; readonly attributionQuality: number; readonly note: string }
export interface Reconciliation { readonly claims: readonly SystemClaim[]; readonly statement: string; readonly highestUnresolved: { readonly id: string; readonly name: string; readonly gapHighGbp: number } | null; readonly acquisitionIsLimiting: boolean; readonly conflicts: readonly string[] }

export const ATTRIBUTION_QUALITY: Record<string, number> = { holdout_test: 1.0, platform_last_click: 0.4, platform_view_through: 0.2, none: 0 };

export function reconcile(sys: SystemSnapshots, d: Diagnosis): Reconciliation {
  const claims: SystemClaim[] = [];
  for (const a of sys.ads ?? []) { const roas = a.spendGbp > 0 ? a.attributedRevenueGbp / a.spendGbp : 0; claims.push({ system: `${a.channel} ads`, claim: `ROAS ${roas.toFixed(1)} (${a.attributionModel.replace(/_/g, " ")})`, factor: "demand", direction: roas >= 3 ? "up" : roas >= 1 ? "flat" : "down", attributionQuality: ATTRIBUTION_QUALITY[a.attributionModel] ?? 0, note: a.attributionModel === "holdout_test" ? "measured incrementality" : "platform-attributed: counts bookings that may have happened anyway" }); }
  if (sys.analytics) { const ch = sys.analytics.sessionsPrior > 0 ? sys.analytics.sessions / sys.analytics.sessionsPrior - 1 : 0; claims.push({ system: "analytics", claim: `traffic ${ch >= 0 ? "+" : ""}${(ch * 100).toFixed(0)} %`, factor: "demand", direction: ch > 0.05 ? "up" : ch < -0.05 ? "down" : "flat", attributionQuality: 0.9, note: "sessions are counted, not attributed" }); }
  if (sys.bookingEngine) { const b = sys.bookingEngine; const conv = b.mobileShare * b.mobileConversion + (1 - b.mobileShare) * b.desktopConversion; claims.push({ system: "booking engine", claim: `conversion ${(conv * 100).toFixed(2)} % (mobile ${(b.mobileConversion * 100).toFixed(2)} %)`, factor: "conversion", direction: "flat", attributionQuality: 0.95, note: "funnel counts" }); }
  if (sys.pms) { const occ = sys.pms.roomNightsSold / (sys.pms.rooms * sys.pms.periodDays); claims.push({ system: "PMS", claim: `occupancy ${(occ * 100).toFixed(0)} %`, factor: "capacity", direction: occ >= 0.9 ? "up" : "flat", attributionQuality: 1, note: "system of record" }); }
  if (sys.rms) { const ch = sys.rms.adrPriorYearGbp > 0 ? sys.rms.adrGbp / sys.rms.adrPriorYearGbp - 1 : 0; claims.push({ system: "revenue management", claim: `ADR ${ch >= 0 ? "+" : ""}${(ch * 100).toFixed(0)} % vs prior year`, factor: "economic", direction: ch > 0.02 ? "up" : ch < -0.02 ? "down" : "flat", attributionQuality: 0.9, note: "rate outcome, not cause" }); }
  if (sys.crm) { const ch = sys.crm.repeatRate - sys.crm.repeatRatePrior; claims.push({ system: "CRM", claim: `repeat bookings ${ch >= 0 ? "+" : ""}${(ch * 100).toFixed(0)} pts`, factor: "retention", direction: ch > 0.01 ? "up" : ch < -0.01 ? "down" : "flat", attributionQuality: 0.8 * sys.crm.consentedShare, note: `${(sys.crm.consentedShare * 100).toFixed(0)} % of the base consented` }); }
  const withGap = d.constraints.filter((c) => c.gapGbp.high > 0).sort((a, b) => b.gapGbp.high - a.gapGbp.high);
  const top: Constraint | undefined = withGap[0];
  const demandUp = claims.filter((c) => c.factor === "demand" && c.direction === "up");
  const conv = d.constraints.find((c) => c.factor === "conversion");
  const acquisitionIsLimiting = d.binding === d.constraints.find((c) => c.factor === "demand")?.id;
  const conflicts: string[] = [];
  if (demandUp.length && conv && conv.attainment < 0.85) conflicts.push(`${demandUp.map((c) => `${c.system} (${c.claim})`).join(" and ")} report improving demand while conversion is at ${(conv.attainment * 100).toFixed(0)} % of benchmark: more demand is being converted at a sub-benchmark rate`);
  const weakAttr = claims.filter((c) => c.attributionQuality < 0.5 && c.direction === "up");
  if (weakAttr.length) conflicts.push(`${weakAttr.map((c) => c.system).join(", ")}: the improvement is platform-attributed (quality ${weakAttr.map((c) => c.attributionQuality).join("/")}); it is not evidence of incremental revenue`);
  const statement = claims.length
    ? `These readings are occurring simultaneously, but they do not constitute evidence that acquisition is the current limiting constraint${acquisitionIsLimiting ? "" : ` (the limiting constraint is ${d.binding})`}. The highest-value unresolved constraint is ${top ? `${top.name} (${top.id}, up to £${Math.round(top.gapGbp.high).toLocaleString("en-GB")} a year)` : "none with a £ gap"}.`
    : "No property-system snapshot is connected; reconciliation has nothing to reconcile.";
  return { claims, statement, highestUnresolved: top ? { id: top.id, name: top.name, gapHighGbp: top.gapGbp.high } : null, acquisitionIsLimiting, conflicts };
}
