/**
 * PROPERTY MEMORY — institutional memory of one property: structure, diagnoses, decisions, interventions,
 * outcomes, forecast errors, known constraints, seasonality. `recall` answers "have we considered this before?".
 */
import type { Decision, Diagnosis, LearningRecord, MeasurementResult, OpenIntervention } from "./model.js";
import type { PropertySpec } from "./property.js";

export interface DecisionHistoryEntry {
  readonly runId: string; readonly decisionId: string; readonly at: string; readonly question: string;
  readonly selected: readonly string[]; readonly rejected: readonly { readonly id: string; readonly reasons: readonly string[]; readonly status: string }[];
  readonly binding: string | null; readonly expectedValueGbp: number;
}
export interface MeasuredIntervention { readonly interventionId: string; readonly planId: string; readonly status: MeasurementResult["status"]; readonly planStatus: MeasurementResult["planStatus"]; readonly incrementalGbp: number; readonly expectedGbp: number; readonly at: string; readonly addresses: readonly string[] }
export interface PropertyMemory {
  readonly propertyId: string;
  readonly structure: Pick<PropertySpec, "type" | "rooms" | "adrGbp" | "occupancy" | "otaShare"> | null;
  readonly decisions: readonly DecisionHistoryEntry[];
  readonly measured: readonly MeasuredIntervention[];
  readonly learning: readonly LearningRecord[];
  readonly constraintsSeen: readonly { readonly constraintId: string; readonly binding: boolean; readonly attainment: number; readonly at: string }[];
  readonly failedHypotheses: readonly { readonly interventionId: string; readonly planId: string; readonly at: string; readonly note: string }[];
  /** Operational state of committed interventions as last seen by a cycle (audit C6): one entry per contract, replaced when the state moves. The contract store is the authority; this is what the engine remembers of it. */
  readonly executions: readonly { readonly interventionId: string; readonly contractId: string; readonly state: string; readonly budgetStatus: string; readonly approvedGbp: number | null; readonly since: string; readonly recordedAt: string }[];
}
export const emptyMemory = (propertyId: string): PropertyMemory => ({ propertyId, structure: null, decisions: [], measured: [], learning: [], constraintsSeen: [], failedHypotheses: [], executions: [] });

export function remember(m: PropertyMemory, args: { runId: string; spec: PropertySpec; diagnosis: Diagnosis; decision: Decision; statuses: Readonly<Record<string, string>>; addresses: Readonly<Record<string, readonly string[]>>; measurement: MeasurementResult | null; plan: { id: string; interventionIds: readonly string[]; expectedPointGbp: number } | null; learning: LearningRecord | null; open?: readonly OpenIntervention[]; now?: string }): PropertyMemory {
  const { runId, spec, diagnosis, decision, statuses, measurement, plan, learning } = args;
  const open = args.open ?? []; const executions = [...(m.executions ?? []).filter((e) => !open.some((o) => o.contractId === e.contractId)), ...open.map((o) => ({ interventionId: o.interventionId, contractId: o.contractId, state: o.state, budgetStatus: o.budgetStatus, approvedGbp: o.approvedGbp, since: o.since, recordedAt: args.now ?? decision.timestamp }))];
  const measured: MeasuredIntervention[] = measurement && plan ? plan.interventionIds.map((id) => ({ interventionId: id, planId: `${plan.id}`, status: measurement.status, planStatus: measurement.planStatus, incrementalGbp: measurement.incrementalPointGbp, expectedGbp: plan.expectedPointGbp, at: measurement.measuredAt, addresses: args.addresses[id] ?? [] })) : [];
  const failed = measurement && plan && measurement.planStatus === "NOT_VALIDATED" ? plan.interventionIds.map((id) => ({ interventionId: id, planId: plan.id, at: measurement.measuredAt, note: `plan ${plan.id} NOT_VALIDATED: 90 % interval includes zero (${measurement.status})` })) : [];
  return {
    ...m, structure: { type: spec.type, rooms: spec.rooms, adrGbp: spec.adrGbp, occupancy: spec.occupancy, otaShare: spec.otaShare },
    decisions: [...m.decisions, { runId, decisionId: decision.id, at: decision.timestamp, question: decision.question, selected: decision.selected, rejected: decision.rejected.map((r) => ({ ...r, status: statuses[r.id] ?? "REJECTED" })), binding: diagnosis.binding, expectedValueGbp: decision.expectedValueGbp }],
    measured: [...m.measured, ...measured], learning: learning ? [...m.learning, learning] : m.learning,
    constraintsSeen: [...m.constraintsSeen, ...diagnosis.constraints.map((c) => ({ constraintId: c.id, binding: c.id === diagnosis.binding, attainment: c.attainment, at: diagnosis.computedAt }))],
    failedHypotheses: [...m.failedHypotheses, ...failed],
    executions,
  };
}

/** Memory as the current cycle should read it: the committed interventions handed to this cycle are already visible to `recall`, before `remember` writes them. */
export function withOpen(m: PropertyMemory, open: readonly OpenIntervention[], nowIso: string): PropertyMemory {
  if (!open.length) return m;
  return { ...m, executions: [...(m.executions ?? []).filter((e) => !open.some((o) => o.contractId === e.contractId)), ...open.map((o) => ({ interventionId: o.interventionId, contractId: o.contractId, state: o.state, budgetStatus: o.budgetStatus, approvedGbp: o.approvedGbp, since: o.since, recordedAt: nowIso }))] };
}

export interface Recall { readonly interventionId: string; readonly timesConsidered: number; readonly timesSelected: number; readonly lastRejected: { readonly at: string; readonly reasons: readonly string[]; readonly status: string } | null; readonly measured: readonly MeasuredIntervention[]; readonly statement: string }

export function recall(m: PropertyMemory, interventionId: string, nowIso: string): Recall {
  const considered = m.decisions.filter((d) => d.selected.includes(interventionId) || d.rejected.some((r) => r.id === interventionId));
  const selected = considered.filter((d) => d.selected.includes(interventionId));
  const rejections = considered.flatMap((d) => d.rejected.filter((r) => r.id === interventionId).map((r) => ({ at: d.at, reasons: r.reasons, status: r.status })));
  const last = rejections.at(-1) ?? null;
  const measured = m.measured.filter((x) => x.interventionId === interventionId);
  const running = (m.executions ?? []).filter((x) => x.interventionId === interventionId && !["CLOSED", "REJECTED", "WITHDRAWN"].includes(x.state));
  const ago = (iso: string) => { const days = Math.round((Date.parse(nowIso) - Date.parse(iso)) / 86400e3); return days <= 0 ? "earlier today" : days === 1 ? "yesterday" : days < 60 ? `${days} days ago` : `${Math.round(days / 30)} months ago`; };
  const parts: string[] = [];
  if (!considered.length) parts.push(`${interventionId} has not been considered before for this property.`);
  else parts.push(`${interventionId} was considered ${considered.length} time(s) and selected ${selected.length} time(s).`);
  if (last) parts.push(`Last rejected ${ago(last.at)} (${last.status}) because: ${last.reasons[0] ?? "no reason recorded"}.`);
  for (const x of running) parts.push(`Currently ${x.state} on ${x.contractId} since ${x.since.slice(0, 10)} (budget ${x.budgetStatus}${x.approvedGbp !== null ? `, approved £${Math.round(x.approvedGbp).toLocaleString("en-GB")}` : ""}).`);
  for (const x of measured) parts.push(`Measured ${ago(x.at)}: ${x.status}, plan ${x.planStatus}, incremental £${Math.round(x.incrementalGbp).toLocaleString("en-GB")} against £${Math.round(x.expectedGbp).toLocaleString("en-GB")} expected.`);
  return { interventionId, timesConsidered: considered.length, timesSelected: selected.length, lastRejected: last, measured, statement: parts.join(" ") };
}

/** Constraints that memory shows as measured-resolved: an ESTABLISHED, VALIDATED or PARTIALLY_VALIDATED measurement of an intervention addressing them. */
export function resolvedConstraints(m: PropertyMemory): { constraintId: string; by: string; at: string }[] {
  return m.measured.filter((x) => x.status === "ESTABLISHED" && x.planStatus !== "NOT_VALIDATED").flatMap((x) => x.addresses.map((c) => ({ constraintId: c, by: x.interventionId, at: x.at })));
}
