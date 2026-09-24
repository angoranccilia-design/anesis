/**
 * PROVIDER GOVERNANCE — the property already has an agency, a developer, a revenue manager. Anesis does not replace
 * them; it owns the commercial plan and hands each one a brief derived from the decision, with a success threshold
 * and a measurement, and it will judge the result by the pre-registered plan, not by the provider's own report.
 */
import type { InterventionRecord, MeasurementPlan } from "./model.js";
import type { Provider } from "./context/types.js";

export interface ProviderBrief {
  readonly providerId: string; readonly providerName: string; readonly role: Provider["role"];
  readonly interventionId: string; readonly priority: string; readonly status: InterventionRecord["decisionStatus"];
  readonly instruction: "PROCEED" | "PREPARE" | "HOLD" | "DO_NOT_START";
  readonly blocked: readonly string[]; readonly requiredIntervention: string; readonly owner: string;
  readonly successThreshold: string; readonly measurement: string; readonly deadline: string | null; readonly whatWouldUnblock: string | null;
  readonly note: string;
}

const ROLE_FOR_FACTOR: Record<string, Provider["role"][]> = { conversion: ["web_developer", "internal_team"], demand: ["meta_agency", "search_agency"], direct_capture: ["revenue_manager", "web_developer"], retention: ["crm_agency", "internal_team"] };
const DEFAULT: Provider = { id: "PV-FOUNDER", name: "Founder / general manager", role: "founder", scope: "everything not assigned", factors: [], systems: [] };

export function assignProvider(actsOn: string, providers: readonly Provider[]): Provider {
  const explicit = providers.find((p) => p.factors.includes(actsOn)); if (explicit) return explicit;
  for (const role of ROLE_FOR_FACTOR[actsOn] ?? []) { const p = providers.find((x) => x.role === role); if (p) return p; }
  return providers.find((p) => p.role === "founder") ?? DEFAULT;
}

export function providerBriefs(records: readonly InterventionRecord[], actsOn: Readonly<Record<string, string>>, providers: readonly Provider[], plan: MeasurementPlan | null, nowIso: string, weeksToImpact: Readonly<Record<string, number>>, unblock: Readonly<Record<string, string>> = {}): ProviderBrief[] {
  const binding = records.find((r) => r.decisionStatus === "FUNDED");
  return records.map((r) => {
    const p = assignProvider(actsOn[r.id] ?? "", providers);
    const instruction: ProviderBrief["instruction"] = r.decisionStatus === "FUNDED" ? "PROCEED" : r.decisionStatus === "INVESTIGATE" ? "PREPARE" : r.decisionStatus === "DEFERRED" ? "HOLD" : "DO_NOT_START";
    const weeks = (weeksToImpact[r.id] ?? 8) + (plan?.windowWeeks ?? 52);
    const deadline = r.decisionStatus === "FUNDED" ? new Date(Date.parse(nowIso) + weeks * 7 * 86400e3).toISOString().slice(0, 10) : null;
    return { providerId: p.id, providerName: p.name, role: p.role, interventionId: r.id, priority: binding ? `${binding.constraint[0]} — ${binding.problem}` : "none funded", status: r.decisionStatus, instruction, blocked: r.blockedBy, requiredIntervention: r.name, owner: r.owner, successThreshold: unblock[actsOn[r.id] ?? ""] ? `${unblock[actsOn[r.id] ?? ""]} (the level at which the dependent acquisition decision changes) — and ${r.successThreshold}` : r.successThreshold, measurement: r.measurementPlanId ? `pre-registered plan ${r.measurementPlanId}: synthetic-control counterfactual, placebo-tested; the provider's own attribution is not the measure` : "none until funded", deadline, whatWouldUnblock: r.whatWouldUnblock,
      note: instruction === "PROCEED" ? `${p.name} proceeds within the registered plan; success is judged on the counterfactual, not on the provider's report.` : instruction === "PREPARE" ? `${p.name} prepares the information purchase (${r.whatWouldUnblock ?? "test"}); no capital until the decision is re-run.` : instruction === "HOLD" ? `${p.name} holds; budget, not merit, defers this.` : `${p.name} does not start this: ${r.blockedBy[0] ?? "rejected"}.` };
  });
}

/** Provider evidence history — never a ranking: expected vs actual per intervention the provider executed. */
export interface ProviderEvidence { readonly providerId: string; readonly interventionId: string; readonly planId: string; readonly expectedGbp: number; readonly actualGbp: number; readonly forecastError: number; readonly measurementStatus: string; readonly at: string }
export interface ProviderReliability { readonly providerId: string; readonly providerName: string; readonly interventions: number; readonly measured: number; readonly meanAbsForecastError: number | null; readonly validatedShare: number | null; readonly statement: string }
export function providerReliability(providers: readonly Provider[], evidence: readonly ProviderEvidence[]): ProviderReliability[] {
  return providers.map((p) => {
    const ev = evidence.filter((e) => e.providerId === p.id); const measured = ev.filter((e) => e.measurementStatus !== "INCONCLUSIVE");
    const mae = measured.length ? measured.reduce((a, e) => a + Math.abs(e.forecastError), 0) / measured.length : null;
    const val = measured.length ? measured.filter((e) => e.measurementStatus === "ESTABLISHED").length / measured.length : null;
    return { providerId: p.id, providerName: p.name, interventions: ev.length, measured: measured.length, meanAbsForecastError: mae, validatedShare: val, statement: ev.length ? `${p.name}: ${ev.length} intervention(s), ${measured.length} measured; mean absolute forecast error ${mae === null ? "n/a" : (mae * 100).toFixed(0) + " %"}; established ${val === null ? "n/a" : (val * 100).toFixed(0) + " %"}. Evidence, not a rank.` : `${p.name}: no measured intervention yet.` };
  });
}
