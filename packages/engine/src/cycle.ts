/**
 * The full decision cycle: OBSERVE → DIAGNOSE → ANTICIPATE → VALUE OF INFORMATION → PRIORITISE → DECIDE →
 * PRE-REGISTER → (simulate outcome) → MEASURE → LEARN. Deterministic for a given seed and inputs.
 * Timestamps of events are real; the data timestamp is the run's `now`.
 */
import { simulateProperty, checkConsistency, obsValue, COUNTRY_HOUSE_34, type PropertySpec, type SimulatedProperty } from "./property.js";
import { benchMap, PARAMS, type Params } from "./benchmarks.js";
import { diagnose } from "./diagnose.js";
import { anticipate } from "./exposure.js";
import { interventions } from "./interventions.js";
import { valueOfInformation, assayVerdict } from "./voi.js";
import { allocate } from "./allocate.js";
import { buildDecision, planExpectedValue } from "./decision.js";
import { preregister } from "./register.js";
import { applyOutcome, measure } from "./measure.js";
import { calibrationFactors, learningRecord } from "./learn.js";
import { EngineBus } from "./bus.js";
import { rng } from "./rng.js";
import type { Allocation, AssayVerdict, Decision, Diagnosis, EngineEvent, Exposure, Intervention, LearningRecord, MeasurementPlan, MeasurementResult, VoiResult } from "./model.js";

export interface CycleInput {
  readonly seed: number;
  readonly budgetGbp: number;
  readonly spec?: Partial<PropertySpec>;
  readonly benchmarks?: Partial<Record<string, number>>;
  readonly params?: Partial<Params>;
  readonly memory?: readonly LearningRecord[];
  readonly cycleNumber?: number;
  readonly now?: string;
  readonly measure?: boolean;           // run the simulated outcome + measurement + learning (default true)
  readonly bus?: EngineBus;
}

export interface CycleResult {
  readonly input: CycleInput;
  readonly property: SimulatedProperty;
  readonly consistency: string[];
  readonly diagnosis: Diagnosis;
  readonly exposures: Exposure[];
  readonly interventions: Intervention[];
  readonly voi: VoiResult[];
  readonly assay: AssayVerdict;
  readonly allocation: Allocation;
  readonly decision: Decision;
  readonly plan: MeasurementPlan | null;
  readonly outcome: { readonly trueGainGbp: number; readonly note: string } | null;
  readonly measurement: MeasurementResult | null;
  readonly learning: LearningRecord | null;
  readonly calibrationBefore: ReturnType<typeof calibrationFactors>;
  readonly calibrationAfter: ReturnType<typeof calibrationFactors>;
  readonly events: readonly EngineEvent[];
}

export function runCycle(input: CycleInput): CycleResult {
  const bus = input.bus ?? new EngineBus();
  const now = input.now ?? new Date().toISOString();
  const n = input.cycleNumber ?? 1;
  const P: Params = { ...PARAMS, ...input.params };
  const spec: PropertySpec = { ...COUNTRY_HOUSE_34, ...input.spec };
  const B = benchMap(input.benchmarks);
  const memory = input.memory ?? [];

  bus.emit("CYCLE_STARTED", "OBSERVING", `cycle ${n}, seed ${input.seed}, budget £${input.budgetGbp.toLocaleString("en-GB")}`);
  const property = simulateProperty(spec, input.seed, now);
  const consistency = checkConsistency(property);
  bus.emit("OBSERVATIONS_READY", "OBSERVING", `${property.observations.length} observations from ${spec.name} (SIMULATED PROPERTY DATA); consistency ${consistency.length === 0 ? "passed" : "FAILED: " + consistency.join("; ")}`, property.observations.map((o) => o.id));
  if (consistency.length) bus.emit("DATA_INCONSISTENT", "ALERT", consistency.join("; "));

  bus.emit("DIAGNOSIS_STARTED", "DIAGNOSING", "computing potential / attainable / actual and constraints");
  const diagnosis = diagnose(property, B, now);
  bus.emit("CONSTRAINTS_COMPUTED", "DIAGNOSING", `${diagnosis.constraints.length} constraints; total addressable £${diagnosis.totalAddressableGbp.toFixed(0)}; deduplicated £${diagnosis.deduplicatedGbp.low.toFixed(0)}–£${diagnosis.deduplicatedGbp.high.toFixed(0)}`, diagnosis.constraints.map((c) => c.id));
  bus.emit("LIMITING_CONSTRAINT", "DIAGNOSING", diagnosis.bindingWhy, diagnosis.binding ? [diagnosis.binding] : []);

  bus.emit("EXPOSURE_STARTED", "INVESTIGATING", "modelling forward exposure");
  const exposures = anticipate(property, B);
  for (const e of exposures) bus.emit("EXPOSURE_MODELLED", "INVESTIGATING", `${e.name}: p=${e.probability} (${e.probabilityBasis}), £${e.valueAtRiskGbp.low.toFixed(0)}–£${e.valueAtRiskGbp.high.toFixed(0)} over ${e.horizonMonths} months`, [e.id]);

  const calibrationBefore = calibrationFactors(memory, ["I-001", "I-002", "I-003", "I-004"], P);
  const funnel = { mobileShare: obsValue(property, "sessions.mobile_share").value, convMobile: obsValue(property, "conv.mobile").value, convDesktop: obsValue(property, "conv.desktop").value, bookingValue: obsValue(property, "booking_value_avg").value };
  const items = interventions(diagnosis, funnel, calibrationBefore);
  bus.emit("INTERVENTIONS_GENERATED", "COMPARING", `${items.length} candidate interventions${Object.keys(calibrationBefore).length ? "; calibration applied from " + Object.keys(calibrationBefore).length + " learning record set(s)" : "; no calibration history"}`, items.map((i) => i.id));

  const voi = items.map(valueOfInformation);
  for (const v of voi) bus.emit("VALUE_OF_INFORMATION", "INVESTIGATING", `${v.interventionId}: ${v.decision} — ${v.reason}`, [v.interventionId]);

  bus.emit("ALLOCATION_STARTED", "DECIDING", `risk-adjusted allocation of £${input.budgetGbp.toLocaleString("en-GB")} (reserve ${P.reserveShare * 100} %)`);
  const allocation = allocate(items, diagnosis, voi, input.budgetGbp, P);
  for (const l of allocation.lines) {
    if (l.funded) bus.emit("ACTION_FUNDED", "DECIDING", `${l.interventionId}: £${l.allocatedGbp.toLocaleString("en-GB")} (risk-adjusted value £${l.riskAdjustedValueGbp.toFixed(0)})`, [l.interventionId]);
    else bus.emit("ACTION_BLOCKED", "BLOCKING", `${l.interventionId} BLOCKED — ${l.blockedBy.join(" | ")} — required condition: ${l.requiredCondition}`, [l.interventionId]);
  }
  const assay = assayVerdict(items, spec.ownerPlan, planExpectedValue(items, allocation), input.budgetGbp, P);
  bus.emit("ASSAY_VERDICT", "DECIDING", `${assay.verdict}: ${assay.reason}`);
  const decision = buildDecision(`D-${String(n).padStart(3, "0")}`, `What should be done with the next £${input.budgetGbp.toLocaleString("en-GB")}?`, diagnosis, items, voi, allocation, now);
  bus.emit("DECISION_LOGGED", "DECIDING", `${decision.id}: selected ${decision.selected.join(", ") || "nothing"}; governance level ${decision.governance.level} (${decision.governance.reason})`, [decision.id]);

  const funded = items.filter((i) => decision.selected.includes(i.id));
  let plan: MeasurementPlan | null = null, outcome: CycleResult["outcome"] = null, measurement: MeasurementResult | null = null, learning: LearningRecord | null = null;
  let calibrationAfter = calibrationBefore;
  if (funded.length) {
    plan = preregister(`MP-${String(n).padStart(3, "0")}`, funded, now);
    bus.emit("PLAN_REGISTERED", "MEASURING", `${plan.id} v${plan.version} sha256 ${plan.sha256.slice(0, 12)}…; expected £${plan.expectedGbp.low.toLocaleString("en-GB")}–£${plan.expectedGbp.high.toLocaleString("en-GB")} (point £${plan.expectedPointGbp.toLocaleString("en-GB")}) over ${plan.windowWeeks} weeks`, [plan.id]);
    if (input.measure !== false) {
      const r = rng(input.seed * 7919 + 1); // outcome draw depends on the seed only: same inputs → same outcome, whatever the run counter
      const o = applyOutcome(property.series, funded, obsValue(property, "room_revenue").value, r);
      outcome = { trueGainGbp: o.trueGainGbp, note: "SIMULATED OUTCOME — hidden from the estimator; each funded intervention works with its declared confidence and, if it works, its effect is drawn inside its range" };
      bus.emit("OUTCOME_SIMULATED", "MEASURING", `${plan.windowWeeks} post-weeks simulated (truth hidden from the estimator)`);
      measurement = measure(plan, o.property, property.series.comparables, now);
      bus.emit("MEASUREMENT_COMPLETE", measurement.status === "INCONCLUSIVE" ? "ALERT" : "MEASURING", `${measurement.status} / plan ${measurement.planStatus}: incremental £${measurement.incrementalPointGbp.toFixed(0)} (90 % £${measurement.incrementalGbp.low.toFixed(0)} to £${measurement.incrementalGbp.high.toFixed(0)}); placebo rank ${measurement.placebo.rank}/${measurement.placebo.of}; plan intact ${measurement.planIntact}`, [measurement.planId]);
      const ctx = { rooms: spec.rooms, adr: spec.adrGbp, occupancy: spec.occupancy, otaShare: spec.otaShare, convMobile: spec.convMobile, repeatRate: spec.repeatRate };
      const draft = learningRecord(`LR-${String(n).padStart(3, "0")}`, spec.id, ctx, plan, measurement, calibrationBefore, calibrationBefore, now);
      calibrationAfter = calibrationFactors([...memory, draft], ["I-001", "I-002", "I-003", "I-004"], P);
      learning = learningRecord(draft.id, spec.id, ctx, plan, measurement, calibrationBefore, calibrationAfter, now);
      bus.emit("LEARNING_RECORDED", "LEARNING", `${learning.id}: forecast error ${(learning.error * 100).toFixed(0)} %; ${learning.calibrationNote}`, [learning.id]);
    }
  } else {
    bus.emit("NOTHING_FUNDED", "ALERT", "no intervention cleared the allocation rules: nothing to register or measure");
  }
  bus.emit("CYCLE_COMPLETE", "IDLE", `cycle ${n} complete`);
  return { input, property, consistency, diagnosis, exposures, interventions: items, voi, assay, allocation, decision, plan, outcome, measurement, learning, calibrationBefore, calibrationAfter, events: bus.events };
}

/** Field-by-field comparison of two runs (what changed and why it matters). */
export interface RunDiff { readonly field: string; readonly a: string; readonly b: string }
export function compareRuns(a: CycleResult, b: CycleResult): RunDiff[] {
  const out: RunDiff[] = [];
  const cmp = (field: string, x: unknown, y: unknown) => { const sx = JSON.stringify(x), sy = JSON.stringify(y); if (sx !== sy) out.push({ field, a: sx, b: sy }); };
  cmp("seed", a.input.seed, b.input.seed); cmp("budgetGbp", a.input.budgetGbp, b.input.budgetGbp);
  cmp("spec", a.input.spec ?? {}, b.input.spec ?? {}); cmp("benchmarks", a.input.benchmarks ?? {}, b.input.benchmarks ?? {});
  cmp("diagnosis.binding", a.diagnosis.binding, b.diagnosis.binding);
  cmp("diagnosis.deduplicatedGbp", a.diagnosis.deduplicatedGbp, b.diagnosis.deduplicatedGbp);
  cmp("assay.verdict", a.assay.verdict, b.assay.verdict);
  cmp("decision.selected", a.decision.selected, b.decision.selected);
  cmp("decision.rejected", a.decision.rejected.map((r) => r.id), b.decision.rejected.map((r) => r.id));
  cmp("decision.expectedValueGbp", Math.round(a.decision.expectedValueGbp), Math.round(b.decision.expectedValueGbp));
  cmp("plan.expectedGbp", a.plan?.expectedGbp ?? null, b.plan?.expectedGbp ?? null);
  cmp("measurement.status", a.measurement?.status ?? null, b.measurement?.status ?? null);
  cmp("measurement.incrementalPointGbp", a.measurement ? Math.round(a.measurement.incrementalPointGbp) : null, b.measurement ? Math.round(b.measurement.incrementalPointGbp) : null);
  return out;
}

/** Strip real timestamps so two runs with the same inputs can be compared for byte-equality. */
export function deterministicView(r: CycleResult): unknown {
  const { events, ...rest } = r;
  return { ...rest, events: events.map(({ at, ...e }) => e) };
}
