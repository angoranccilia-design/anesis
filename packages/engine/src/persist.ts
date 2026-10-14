/**
 * PERSISTED PROPERTY MODEL — the Anesis Commercial Constraint as a durable asset, one per property.
 *
 * Until now every cycle rebuilt the model in process memory and lost it on restart. This module defines the
 * record that survives: the property's description and its history, the calibration earned from measured
 * decisions, every cycle's decision, pre-registration, budgets and measurement, and the property memory.
 * It is pure data and pure functions (no I/O), so it is browser-safe; stores (file, database) implement
 * `ModelStore` outside the engine. Nothing here invents data: a cycle entry is a faithful extract of a real
 * `CycleResult`, and the model is only ever advanced by `appendCycle`.
 */
import type { CycleResult } from "./cycle.js";
import type { PropertySpec } from "./property.js";
import type { LearningRecord } from "./model.js";
import { emptyMemory, type PropertyMemory } from "./memory.js";

export const MODEL_SCHEMA_VERSION = 1 as const;

export interface CycleBudgetEntry {
  readonly interventionId: string; readonly decisionStatus: string; readonly budgetStatus: string;
  readonly estimatedGbp: number | null; readonly estimateStatus: "OBSERVED" | "ESTIMATE" | "UNKNOWN";
  readonly approvedGbp: number | null; readonly approvalLevel: 0 | 1 | 2 | 3 | 4; readonly owner: string;
}

export interface CycleEntry {
  readonly id: string; readonly at: string; readonly cycleNumber: number;
  readonly seed: number; readonly budgetGbp: number;
  readonly contextFetchedAt: string; readonly connected: readonly string[]; readonly verifiedMetrics: readonly string[];
  readonly bindingConstraintId: string | null; readonly bindingWhy: string;
  readonly decisionId: string; readonly question: string; readonly selected: readonly string[]; readonly governanceLevel: 0 | 1 | 2 | 3 | 4;
  readonly wouldChangeIf: number;
  readonly preregistration: { readonly planId: string; readonly version: number; readonly sha256: string; readonly expectedPointGbp: number; readonly windowWeeks: number } | null;
  readonly budgets: readonly CycleBudgetEntry[];
  readonly measurement: { readonly planId: string; readonly status: string; readonly incrementalPointGbp: number; readonly pPositive: number; readonly placeboPassed: boolean } | null;
  readonly learningId: string | null; readonly forecastError: number | null;
  readonly inProgress: readonly { readonly interventionId: string; readonly contractId: string; readonly state: string }[];   // committed interventions this cycle did not re-propose (C6)
  readonly jobKey: string | null;    // the runtime job that produced this entry; a retried job finds its entry and does not append twice
  readonly simulated: boolean;        // true while the property is simulated; false only when every metric is VERIFIED
}

export interface PropertyModel {
  readonly schemaVersion: typeof MODEL_SCHEMA_VERSION;
  readonly propertyId: string;
  readonly createdAt: string; readonly updatedAt: string;
  readonly spec: PropertySpec;                                           // latest description (25 fields)
  readonly specHistory: readonly { readonly at: string; readonly spec: PropertySpec }[];
  readonly calibration: readonly LearningRecord[];                       // learning records in order; what `calibrationFactors` reads
  readonly cycles: readonly CycleEntry[];
  readonly memory: PropertyMemory;                                       // decisions, measurements, constraints seen, failed hypotheses
}

export function newModel(spec: PropertySpec, now: string): PropertyModel {
  return { schemaVersion: MODEL_SCHEMA_VERSION, propertyId: spec.id, createdAt: now, updatedAt: now, spec, specHistory: [{ at: now, spec }], calibration: [], cycles: [], memory: emptyMemory(spec.id) };
}

/** What the next cycle needs from the model: its memory, its calibration and its cycle number. */
export function cycleInputFromModel(m: PropertyModel): { memory: LearningRecord[]; propertyMemory: PropertyMemory; cycleNumber: number; spec: PropertySpec } {
  return { memory: [...m.calibration], propertyMemory: m.memory, cycleNumber: m.cycles.length + 1, spec: m.spec };
}

/** Advances the model by one real cycle. Pure: returns a new model; the caller stores it. */
export function appendCycle(m: PropertyModel, r: CycleResult, meta: { readonly id: string; readonly at: string; readonly jobKey?: string | null }): PropertyModel {
  const spec = r.property.spec;
  const specChanged = JSON.stringify(spec) !== JSON.stringify(m.spec);
  const entry: CycleEntry = {
    id: meta.id, at: meta.at, cycleNumber: r.input.cycleNumber ?? m.cycles.length + 1, seed: r.input.seed, budgetGbp: r.input.budgetGbp,
    contextFetchedAt: r.context.fetchedAt, connected: r.context.connectors.filter((c) => c.status === "CONNECTED").map((c) => c.id), verifiedMetrics: [...r.verifiedMetrics],
    bindingConstraintId: r.diagnosis.binding, bindingWhy: r.diagnosis.bindingWhy,
    decisionId: r.decision.id, question: r.decision.question, selected: [...r.decision.selected], governanceLevel: r.decision.governance.level, wouldChangeIf: r.decision.wouldChangeIf.length,
    preregistration: r.plan ? { planId: r.plan.id, version: r.plan.version, sha256: r.plan.sha256, expectedPointGbp: r.plan.expectedPointGbp, windowWeeks: r.plan.windowWeeks } : null,
    budgets: r.records.map((x) => ({ interventionId: x.id, decisionStatus: x.decisionStatus, budgetStatus: x.budget.status, estimatedGbp: x.budget.estimated.amountGbp, estimateStatus: x.budget.estimated.status, approvedGbp: x.budget.approved.amountGbp, approvalLevel: x.approvalLevel, owner: x.owner })),
    measurement: r.measurement ? { planId: r.measurement.planId, status: r.measurement.status, incrementalPointGbp: r.measurement.incrementalPointGbp, pPositive: r.measurement.pPositive, placeboPassed: r.measurement.placebo.passed } : null,
    learningId: r.learning?.id ?? null, forecastError: r.learning?.error ?? null,
    inProgress: (r.input.openInterventions ?? []).map((o) => ({ interventionId: o.interventionId, contractId: o.contractId, state: o.state })), jobKey: meta.jobKey ?? null,
    simulated: r.property.observations.some((o) => o.status !== "VERIFIED"),
  };
  return {
    ...m, updatedAt: meta.at, spec,
    specHistory: specChanged ? [...m.specHistory, { at: meta.at, spec }] : m.specHistory,
    calibration: r.learning ? [...m.calibration, r.learning] : m.calibration,
    cycles: [...m.cycles, entry],
    memory: r.memoryAfter,
  };
}

export const serializeModel = (m: PropertyModel): string => JSON.stringify(m, null, 2);

export function parseModel(json: string): PropertyModel {
  const m = JSON.parse(json) as Partial<PropertyModel>;
  if (m.schemaVersion !== MODEL_SCHEMA_VERSION) throw new Error(`PropertyModel schema ${String(m.schemaVersion)} is not ${MODEL_SCHEMA_VERSION}; migrate before loading`);
  if (typeof m.propertyId !== "string" || !Array.isArray(m.cycles) || !Array.isArray(m.calibration) || !m.memory || !m.spec) throw new Error("PropertyModel is incomplete");
  // Fields added within schema 1 (C6): absent in models written before them, read as empty — nothing is invented.
  const memory = { ...m.memory, executions: m.memory.executions ?? [] };
  const cycles = m.cycles.map((c) => ({ ...c, inProgress: c.inProgress ?? [], jobKey: c.jobKey ?? null }));
  return { ...m, memory, cycles } as PropertyModel;
}

/** Storage seam. The engine ships an in-memory store; applications provide durable ones (file, database). */
export interface ModelStore {
  load(propertyId: string): Promise<PropertyModel | null>;
  save(model: PropertyModel): Promise<void>;
  list(): Promise<string[]>;
  remove(propertyId: string): Promise<void>;
}

export class MemoryModelStore implements ModelStore {
  private readonly models = new Map<string, string>();
  async load(id: string) { const s = this.models.get(id); return s ? parseModel(s) : null; }
  async save(m: PropertyModel) { this.models.set(m.propertyId, serializeModel(m)); }
  async list() { return [...this.models.keys()]; }
  async remove(id: string) { this.models.delete(id); }
}

/** One-line statement of what the model has accumulated — for the console and the memory API. */
export function modelSummary(m: PropertyModel, nowIso: string): string {
  const measured = m.memory.measured.length, established = m.memory.measured.filter((x) => x.status === "ESTABLISHED").length;
  const days = Math.max(0, Math.round((Date.parse(nowIso) - Date.parse(m.createdAt)) / 86_400_000));
  return `${m.propertyId}: ${m.cycles.length} cycle${m.cycles.length === 1 ? "" : "s"} over ${days} day${days === 1 ? "" : "s"}, ${m.calibration.length} learning record${m.calibration.length === 1 ? "" : "s"}, ${measured} measured intervention${measured === 1 ? "" : "s"} (${established} established), ${m.memory.failedHypotheses.length} failed hypothes${m.memory.failedHypotheses.length === 1 ? "is" : "es"}; ${m.cycles.every((c) => c.simulated) ? "all cycles on simulated data" : "includes verified data"}`;
}
