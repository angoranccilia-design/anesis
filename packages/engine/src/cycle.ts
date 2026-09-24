/**
 * The full decision cycle: OBSERVE (internal + external context) → DIAGNOSE → ANTICIPATE (exposure, fused external
 * signals) → VALUE OF INFORMATION → PRIORITISE → DECIDE → PRE-REGISTER → (simulate outcome) → MEASURE → LEARN →
 * REMEMBER. Deterministic for a given seed, inputs, context snapshot and memory. Event timestamps are real.
 */
import { simulateProperty, checkConsistency, obsValue, COUNTRY_HOUSE_34, type PropertySpec, type SimulatedProperty } from "./property.js";
import { benchMap, PARAMS, type BenchMap, type Params } from "./benchmarks.js";
import { diagnose } from "./diagnose.js";
import { anticipate } from "./exposure.js";
import { interventions, type Calibration } from "./interventions.js";
import { valueOfInformation, assayVerdict } from "./voi.js";
import { allocate } from "./allocate.js";
import { buildDecision, planExpectedValue } from "./decision.js";
import { preregister } from "./register.js";
import { applyOutcome, measure } from "./measure.js";
import { calibrationFactors, learningRecord } from "./learn.js";
import { EngineBus } from "./bus.js";
import { rng } from "./rng.js";
import { sensitivity, ladder, decisionSensitivity, type DecisionEval, type SensitivityRow, type Threshold, type DecisionSensitivity } from "./sensitivity.js";
import { plausibleRanges, type PlausibleRange } from "./plausible.js";
import { assessCapacity, defaultGraph, type CapacityGraph, type NodeAssessment } from "./context/capacity.js";
import { compression, type CompressionReading } from "./context/compression.js";
import { reconcile, type Reconciliation } from "./context/reconcile.js";
import { observationsFromSystems, mergeObservations } from "./context/systems.js";
import { checkRequirements, type RequirementsResult } from "./requirements.js";
import { providerBriefs, providerReliability, assignProvider, type ProviderBrief, type ProviderReliability, type ProviderEvidence } from "./providers.js";
import { classifyDay } from "./context/weather.js";
import { interventionBudget, decisionPackage, HEAD_FOR_FACTOR, HEAD_TITLE, NO_TERMS } from "./economics.js";
import { emptyMemory, recall, remember, resolvedConstraints, type PropertyMemory } from "./memory.js";
import { pooledCalibration } from "./portfolio.js";
import { LEVEL_TIER } from "./governance.js";
import { emptyContext, qualityFactor, type CommercialAssessment, type ExternalContext, type ExternalSignal, type Perturbation } from "./context/types.js";
import { weatherSignals } from "./context/weather.js";
import { seasonalProfile, type SeasonalProfile } from "./context/seasonality.js";
import { eventSignals } from "./context/events.js";
import { searchSignals } from "./context/search.js";
import { macroSignals } from "./context/macro.js";
import { competitiveSignals, attribution } from "./context/competitive.js";
import { otaSignals } from "./context/ota.js";
import { operationsSignals } from "./context/operations.js";
import { fuse, type FusedVerdict } from "./context/fusion.js";
import type { DecisionSignature } from "./context/relevance.js";
import type { Observation, Allocation, AssayVerdict, ChangeCondition, Decision, Diagnosis, EngineEvent, Exposure, Intervention, InterventionRecord, LearningRecord, MeasurementPlan, MeasurementResult, VoiResult } from "./model.js";

export interface CycleInput {
  readonly seed: number;
  readonly budgetGbp: number;
  readonly spec?: Partial<PropertySpec>;
  readonly benchmarks?: Partial<Record<string, number>>;
  readonly params?: Partial<Params>;
  readonly memory?: readonly LearningRecord[];            // learning records (calibration)
  readonly propertyMemory?: PropertyMemory;               // institutional memory (decisions, measurements)
  readonly portfolio?: readonly LearningRecord[];         // other properties' learning records
  readonly enablePooling?: boolean;
  readonly context?: ExternalContext;                     // external signals snapshot (fetched by the application)
  readonly cycleNumber?: number;
  readonly now?: string;
  readonly measure?: boolean;
  readonly bus?: EngineBus;
}

export interface MostSensitiveUnknown { readonly unknown: string; readonly valueOfInformation: "HIGH" | "MEDIUM" | "LOW"; readonly recommendedNextAction: string; readonly reason: string; readonly interventionId: string | null; readonly evsiGbp: number | null }

export interface CycleResult {
  readonly input: CycleInput;
  readonly property: SimulatedProperty;
  readonly consistency: string[];
  readonly context: ExternalContext;
  readonly signals: ExternalSignal[];
  readonly assessments: CommercialAssessment[];
  readonly fused: FusedVerdict[];
  readonly seasonality: SeasonalProfile;
  readonly attribution: ReturnType<typeof attribution>;
  readonly dataQualityNotes: string[];
  readonly diagnosis: Diagnosis;
  readonly exposures: Exposure[];
  readonly interventions: Intervention[];
  readonly voi: VoiResult[];
  readonly mostSensitiveUnknown: MostSensitiveUnknown;
  readonly plausibleRanges: PlausibleRange[];
  readonly sensitivity: SensitivityRow[];
  readonly thresholds: Threshold[];
  readonly decisionSensitivity: DecisionSensitivity;
  readonly capacity: NodeAssessment[];
  readonly compression: CompressionReading;
  readonly reconciliation: Reconciliation;
  readonly requirements: RequirementsResult[];
  readonly providerBriefs: ProviderBrief[];
  readonly providerReliability: ProviderReliability[];
  readonly verifiedMetrics: string[];
  readonly assay: AssayVerdict;
  readonly allocation: Allocation;
  readonly decision: Decision;
  readonly records: InterventionRecord[];
  readonly plan: MeasurementPlan | null;
  readonly outcome: { readonly trueGainGbp: number; readonly note: string } | null;
  readonly measurement: MeasurementResult | null;
  readonly learning: LearningRecord | null;
  readonly calibrationBefore: Calibration;
  readonly calibrationAfter: Calibration;
  readonly memoryAfter: PropertyMemory;
  readonly events: readonly EngineEvent[];
}

const OWNERS: Record<string, { owner: string; team: string }> = Object.fromEntries(Object.entries(HEAD_FOR_FACTOR).map(([f, h]) => [f, { owner: HEAD_TITLE[h.head], team: h.capabilities.join(" / ") }]));
const gbp = (x: number) => `£${Math.round(x).toLocaleString("en-GB")}`;

/** Diagnose → interventions → VOI → allocate on a spec. Used by relevance re-runs, sensitivity and thresholds. */
function makeEvaluator(seed: number, now: string, P: Params, cal: Calibration, memory: PropertyMemory, qualityFor: (constraintId: string) => number, ctx: ExternalContext, capacityFor: (spec: PropertySpec) => NodeAssessment[], requirementsFor: (obs: readonly Observation[]) => Record<string, RequirementsResult>) {
  return (spec: PropertySpec, B: BenchMap, budget: number): DecisionEval & { d: Diagnosis; items: Intervention[]; voi: VoiResult[]; alloc: Allocation; prop: SimulatedProperty } => {
    const sim = simulateProperty(spec, seed, now);
    const merged = mergeObservations(sim.observations, observationsFromSystems(ctx.systems, now));
    const prop: SimulatedProperty = { ...sim, observations: merged.observations };
    const d = diagnose(prop, B, now, capacityFor(spec));
    const funnel = { mobileShare: obsValue(prop, "sessions.mobile_share").value, convMobile: obsValue(prop, "conv.mobile").value, convDesktop: obsValue(prop, "conv.desktop").value, bookingValue: obsValue(prop, "booking_value_avg").value };
    const items = interventions(d, funnel, cal, qualityFor, { rooms: spec.rooms, occupancy: spec.occupancy, peakOccupancy: spec.peakOccupancy, weekendShare: spec.weekendShare, adrGbp: spec.adrGbp });
    const voi = items.map(valueOfInformation);
    const alloc = allocate(items, d, voi, budget, P, { resolvedConstraints: resolvedConstraints(memory), requirements: requirementsFor(prop.observations) });
    const statuses: Record<string, string> = {}; for (const l of alloc.lines) statuses[l.interventionId] = l.status;
    return { binding: d.binding, funded: alloc.lines.filter((l) => l.funded).map((l) => l.interventionId).sort(), blocked: alloc.lines.filter((l) => !l.funded).map((l) => l.interventionId).sort(), statuses, expectedValueGbp: planExpectedValue(items, alloc), d, items, voi, alloc, prop };
  };
}

const perturb = (spec: PropertySpec, p: Partial<Perturbation>): PropertySpec => ({
  ...spec,
  sessionsPerYear: spec.sessionsPerYear * (p.sessionsFactor ?? 1),
  convMobile: spec.convMobile * (p.convFactor ?? 1), convDesktop: spec.convDesktop * (p.convFactor ?? 1),
  otaShare: Math.min(0.95, Math.max(0, spec.otaShare + (p.otaShareDelta ?? 0))),
  adrGbp: spec.adrGbp * (p.adrFactor ?? 1),
  peakOccupancy: Math.min(1, Math.max(spec.occupancy, spec.peakOccupancy + (p.peakOccupancyDelta ?? 0))),
  otaCommission: Math.max(0, spec.otaCommission + (p.commissionDelta ?? 0)),
  lowSeasonOcc: Math.min(spec.occupancy, Math.max(0, spec.lowSeasonOcc + (p.lowSeasonOccDelta ?? 0))),
});

export function runCycle(input: CycleInput): CycleResult {
  const bus = input.bus ?? new EngineBus();
  const now = input.now ?? new Date().toISOString();
  const n = input.cycleNumber ?? 1;
  const P: Params = { ...PARAMS, ...input.params };
  const spec: PropertySpec = { ...COUNTRY_HOUSE_34, ...input.spec };
  const B = benchMap(input.benchmarks);
  const memory = input.memory ?? [];
  const pmem = input.propertyMemory ?? emptyMemory(spec.id);
  const ctx = input.context ?? emptyContext(now);

  bus.emit("CYCLE_STARTED", "OBSERVING", `cycle ${n}, seed ${input.seed}, budget ${gbp(input.budgetGbp)}`);
  const simulated = simulateProperty(spec, input.seed, now);
  const verified = observationsFromSystems(ctx.systems, now);
  const mergedObs = mergeObservations(simulated.observations, verified);
  const property: SimulatedProperty = { ...simulated, observations: mergedObs.observations };
  const consistency = checkConsistency(simulated);
  bus.emit("OBSERVATIONS_READY", "OBSERVING", `${property.observations.length} observations from ${spec.name} (${mergedObs.replaced.length ? `${mergedObs.replaced.length} VERIFIED from connected systems: ${mergedObs.replaced.join(", ")}; the rest ` : ""}SIMULATED PROPERTY DATA); consistency ${consistency.length === 0 ? "passed" : "FAILED: " + consistency.join("; ")}`, property.observations.map((o) => o.id));
  // Capacity network: explicit graph from the context, else derived from the property, operations and POS snapshots
  const weatherPoor = (ctx.weather?.days ?? []).slice(0, 7).some((d) => classifyDay(d) === "poor");
  const capacityFor = (sp: PropertySpec): NodeAssessment[] => {
    const ops = ctx.operations; const spaPos = (ctx.systems.pos ?? []).find((x) => x.outlet === "spa"); const restPos = (ctx.systems.pos ?? []).find((x) => x.outlet === "restaurant");
    const graph: CapacityGraph = ctx.capacity ?? defaultGraph({ propertyId: sp.id, rooms: sp.rooms, roomsOutOfOrder: sp.roomsOutOfOrder, peakOccupancy: sp.peakOccupancy, staffingCoverage: sp.staffingCoverage, nowIso: now, source: ctx.operations ? ctx.operations.source : "SRC-SIM-PMS",
      spa: spaPos ? { slotsPerDay: spaPos.slotsAvailable, slotsSold: spaPos.slotsSold, therapistsPlanned: 1, therapistsAvailable: 1, treatmentRooms: 1, openingHours: 0 } : ops && ops.serviceSlotsPerDay !== null && ops.slotUtilisation !== null ? { slotsPerDay: ops.serviceSlotsPerDay, slotsSold: Math.round(ops.serviceSlotsPerDay * ops.slotUtilisation), therapistsPlanned: 1, therapistsAvailable: 1, treatmentRooms: 1, openingHours: ops.openingHoursPerWeek } : null,
      restaurant: restPos ? { covers: restPos.slotsAvailable, coversSold: restPos.slotsSold, kitchenCapacity: restPos.slotsAvailable, serviceStaffPlanned: 1, serviceStaffAvailable: 1 } : null });
    return assessCapacity(graph, { weatherPoor, vision: ctx.vision, nowIso: now, propertyType: sp.type });
  };
  const capacity = capacityFor(spec);
  for (const n of capacity) bus.emit("CAPACITY_ASSESSED", "OBSERVING", n.explanation, [n.nodeId]);
  if (consistency.length) bus.emit("DATA_INCONSISTENT", "ALERT", consistency.join("; "));

  // Data quality of the property's sources → confidence factors on the constraints that rest on them
  const srcOf = (obsId: string) => property.observations.find((o) => o.id === obsId)?.source ?? "";
  const qualityForSource = (src: string) => { const q = ctx.sourceQuality[src]; return q ? qualityFactor(q) : 1; };
  const dataQualityNotes: string[] = Object.entries(ctx.sourceQuality).filter(([, q]) => q.stale || q.completeness < 1).map(([s, q]) => `${s}: ${q.note} (completeness ${q.completeness}, factor ${qualityFactor(q).toFixed(2)}) — decision confidence reduced`);
  const connected = ctx.connectors.filter((c) => c.status === "CONNECTED").map((c) => c.name);
  bus.emit("CONTEXT_LOADED", "OBSERVING", `${ctx.connectors.length} connector contracts; connected: ${connected.join(", ") || "none"}; ${dataQualityNotes.length ? dataQualityNotes.join(" | ") : "no data-quality reduction"}`);

  bus.emit("DIAGNOSIS_STARTED", "DIAGNOSING", "computing potential / attainable / actual and constraints");
  const qualityFor = (cid: string) => { const c = diagnosisFor(cid); return c ? Math.min(1, ...c.evidence.map((e) => qualityForSource(srcOf(e)))) : 1; };
  let diagnosis0: Diagnosis | null = null;
  const diagnosisFor = (cid: string) => diagnosis0?.constraints.find((c) => c.id === cid);
  diagnosis0 = diagnose(property, B, now, capacity);
  const diagnosis = diagnosis0;
  bus.emit("CONSTRAINTS_COMPUTED", "DIAGNOSING", `${diagnosis.constraints.length} constraints (${[...new Set(diagnosis.constraints.map((c) => c.kind))].join(", ")}); total addressable ${gbp(diagnosis.totalAddressableGbp)}; deduplicated ${gbp(diagnosis.deduplicatedGbp.low)}–${gbp(diagnosis.deduplicatedGbp.high)}`, diagnosis.constraints.map((c) => c.id));
  bus.emit("LIMITING_CONSTRAINT", "DIAGNOSING", diagnosis.bindingWhy, diagnosis.binding ? [diagnosis.binding] : []);

  // Calibration: property learning records, optionally partially pooled with the portfolio
  const ids = ["I-001", "I-002", "I-003", "I-004", "I-005", "I-006"];
  const calibrationBefore: Record<string, { factor: number; cycles: number }> = {};
  for (const id of ids) {
    const pooled = pooledCalibration(id, memory, input.portfolio ?? [], input.enablePooling ?? false, P.shrinkageK);
    if (pooled.evidenceLevel !== "benchmark") calibrationBefore[id] = { factor: pooled.pooledFactor, cycles: pooled.propertyN + (pooled.evidenceLevel === "property" ? 0 : pooled.portfolioN) };
  }
  const requirementsFor = (obs: readonly Observation[]): Record<string, RequirementsResult> => { const out: Record<string, RequirementsResult> = {}; for (const id of ids) out[id] = checkRequirements(id, obs, ctx.systems, qualityForSource); return out; };
  const evaluate = makeEvaluator(input.seed, now, P, calibrationBefore, pmem, qualityFor, ctx, capacityFor, requirementsFor);
  const base = evaluate(spec, B, input.budgetGbp);
  const items = base.items, voi = base.voi, allocation = base.alloc;
  const baseSig: DecisionSignature = { binding: base.binding, funded: base.funded, blocked: base.blocked };
  const reevaluate = (p: Partial<Perturbation>): DecisionSignature => { const e = evaluate(perturb(spec, p), B, input.budgetGbp); return { binding: e.binding, funded: e.funded, blocked: e.blocked }; };

  // External intelligence
  bus.emit("EXPOSURE_STARTED", "INVESTIGATING", "modelling forward exposure and testing external signals for relevance");
  const exposures = anticipate(property, B);
  const seasonality = seasonalProfile(property.series.property.slice(0, 104), now, ctx.holidays, { weekendShare: spec.weekendShare, ota: ctx.ota, operations: ctx.operations });
  const attr = attribution(property.series.property.slice(0, 104), property.series.comparables.map((c) => c.slice(0, 104)));
  const convAttain = diagnosis.constraints.find((c) => c.id === "C-001")?.attainment ?? 1;
  const parts = [
    weatherSignals(spec, ctx.weather, ctx.sourceQuality["CONN-WEATHER"]),
    eventSignals(spec, ctx.events, now),
    searchSignals(spec, ctx.search, property.series.property.slice(0, 104), now),
    macroSignals(spec, ctx.macro, now),
    competitiveSignals(spec, ctx.competitors, now),
    otaSignals(spec, ctx.ota, convAttain, now),
    operationsSignals(ctx.operations, ctx.vision, now),
  ];
  const signals = parts.flatMap((p) => p.signals), assessments = parts.flatMap((p) => p.assessments);
  const searchChange = signals.find((x) => x.metric === "search.index_change_8w")?.value ?? null;
  const comp = compression(spec, { weather: ctx.weather, events: ctx.events, competitors: ctx.competitors, ota: ctx.ota, searchChange, historicalCompression: null, nowIso: now });
  if (comp.assessment) assessments.push(comp.assessment); if (comp.signal) signals.push(comp.signal);
  bus.emit(comp.reading.detected ? "FORWARD_EXPOSURE_DETECTED" : "COMPRESSION_TESTED", comp.reading.detected ? "ALERT" : "INVESTIGATING", `${comp.reading.inferred} Decision: ${comp.reading.decision}${comp.reading.notYet.length ? `; not yet: ${comp.reading.notYet.join(", ")}` : ""} (confidence ${comp.reading.confidenceLabel})`);
  const reconciliation = reconcile(ctx.systems, diagnosis);
  if (reconciliation.claims.length) bus.emit("SYSTEMS_RECONCILED", "COMPARING", `${reconciliation.statement}${reconciliation.conflicts.length ? " Conflicts: " + reconciliation.conflicts.join(" | ") : ""}`);
  const revenue = obsValue(property, "room_revenue").value;
  const fused = fuse(assessments, signals, revenue, baseSig, reevaluate);
  bus.emit("SEASONALITY_PROFILED", "INVESTIGATING", `${seasonality.statement} ${seasonality.causalNote}`);
  bus.emit("ATTRIBUTION_TESTED", "INVESTIGATING", `internal vs environmental: ${attr.verdict} — ${attr.note}`);
  for (const e of exposures) bus.emit("EXPOSURE_MODELLED", "INVESTIGATING", `${e.name}: p=${e.probability} (${e.probabilityBasis}), ${gbp(e.valueAtRiskGbp.low)}–${gbp(e.valueAtRiskGbp.high)} over ${e.horizonMonths} months`, [e.id]);
  bus.emit("SIGNALS_TESTED", "INVESTIGATING", `${signals.length} external signals, ${assessments.length} assessments, ${fused.length} fused verdicts: ${fused.map((f) => `${f.scope} → ${f.verdict}`).join("; ") || "no external signal available"}`, fused.map((f) => f.id));
  for (const f of fused.filter((x) => x.verdict === "FORWARD_EXPOSURE" || x.verdict === "COMMERCIAL_OPPORTUNITY")) bus.emit("EXTERNAL_DECISION_IMPACT", "ALERT", f.statement, [f.id]);

  bus.emit("INTERVENTIONS_GENERATED", "COMPARING", `${items.length} candidate interventions${Object.keys(calibrationBefore).length ? "; calibration applied from learning records" : "; no calibration history"}`, items.map((i) => i.id));
  for (const v of voi) bus.emit("VALUE_OF_INFORMATION", "INVESTIGATING", `${v.interventionId}: ${v.decision} — ${v.reason}`, [v.interventionId]);

  // Sensitivity and thresholds (which assumption drives the result; at what value a status changes)
  const evalOnly = (s: PropertySpec, b: BenchMap): DecisionEval => { const e = evaluate(s, b, input.budgetGbp); return { binding: e.binding, funded: e.funded, blocked: e.blocked, statuses: e.statuses, expectedValueGbp: e.expectedValueGbp }; };
  const ranges = plausibleRanges(spec, B, property.series.property.slice(0, 104), ctx.competitors.filter((c) => c.rateGbp !== null).map((c) => c.rateGbp as number));
  const sens = sensitivity(spec, B, ranges, evalOnly);
  const thresholds: Threshold[] = [];
  for (const l of allocation.lines.filter((x) => !x.funded)) for (const v of ["convMobile", "peakOccupancy", "sessionsPerYear", "adrGbp", "otaShare"]) thresholds.push(...ladder(spec, B, ranges, evalOnly, v, l.interventionId, v === "peakOccupancy" ? "down" : "up"));
  const focus = allocation.lines.find((l) => (l.interventionId === "I-004" || l.interventionId === "I-005") && !l.funded)?.interventionId ?? null;
  const decSens = decisionSensitivity(sens, thresholds, focus ? `${allocation.lines.find((l) => l.interventionId === focus)!.status} ${focus} (paid acquisition)` : `fund ${allocation.lines.filter((l) => l.funded).map((l) => l.interventionId).join(", ") || "nothing"}`, focus);
  const flips = sens.filter((r) => r.flipsDecision);
  const bestInfo = [...voi].filter((v) => v.decision === "COLLECT_MORE_INFORMATION").sort((a, b) => b.evsiGbp - a.evsiGbp)[0];
  const mostSensitiveUnknown: MostSensitiveUnknown = bestInfo
    ? { unknown: `${items.find((i) => i.id === bestInfo.interventionId)?.actsOn ?? "effect"} of ${bestInfo.interventionId} (${items.find((i) => i.id === bestInfo.interventionId)?.name ?? ""})`, valueOfInformation: bestInfo.evsiGbp > 2 * bestInfo.informationCostGbp ? "HIGH" : "MEDIUM", recommendedNextAction: `run: ${items.find((i) => i.id === bestInfo.interventionId)?.informationOption?.name ?? "controlled test"} (${gbp(bestInfo.informationCostGbp)})`, reason: `EVSI ${gbp(bestInfo.evsiGbp)} > cost ${gbp(bestInfo.informationCostGbp)}: the result could change the allocation for ${bestInfo.interventionId}`, interventionId: bestInfo.interventionId, evsiGbp: bestInfo.evsiGbp }
    : flips[0]
      ? { unknown: flips[0].label, valueOfInformation: "MEDIUM", recommendedNextAction: `verify ${flips[0].label} with a direct measurement`, reason: `a ±20 % change in ${flips[0].label} flips the decision (${flips[0].flipNote})`, interventionId: null, evsiGbp: null }
      : { unknown: sens[0]?.label ?? "none", valueOfInformation: "LOW", recommendedNextAction: "no information purchase changes the decision; proceed and measure", reason: `no variable flips the decision within ±20 %; the largest value swing is ${sens[0]?.label ?? "n/a"} (${gbp(sens[0]?.evSwingGbp ?? 0)})`, interventionId: null, evsiGbp: null };
  bus.emit("SENSITIVITY_COMPUTED", "COMPARING", `${decSens.currentDecision} — most decision-sensitive variable: ${decSens.mostSensitiveVariable ?? "none within plausible ranges"}; plausible range ${decSens.plausibleRange ?? "—"}; threshold ${decSens.decisionThreshold ?? "none inside the range"}; what would change my mind: ${decSens.whatWouldChangeMyMind}`);

  bus.emit("ALLOCATION_STARTED", "DECIDING", `risk-adjusted allocation of ${gbp(input.budgetGbp)} (reserve ${P.reserveShare * 100} %)`);
  for (const l of allocation.lines) {
    if (l.funded) bus.emit("ACTION_PROPOSED", "DECIDING", `${l.interventionId}: estimated intervention budget ${gbp(l.allocatedGbp)} PROPOSED — approval required; separate from the partnership; not an authorised spend (risk-adjusted value ${gbp(l.riskAdjustedValueGbp)})`, [l.interventionId]);
    else bus.emit("ACTION_BLOCKED", "BLOCKING", `${l.interventionId} ${l.status} — ${l.blockedBy.join(" | ")} — required condition: ${l.requiredCondition}`, [l.interventionId]);
  }
  for (const l of allocation.lines) { const r = recall(pmem, l.interventionId, now); if (r.timesConsidered) bus.emit("MEMORY_RECALLED", "COMPARING", r.statement, [l.interventionId]); }
  const assay = assayVerdict(items, spec.ownerPlan, planExpectedValue(items, allocation), input.budgetGbp, P);
  bus.emit("ASSAY_VERDICT", "DECIDING", `${assay.verdict}: ${assay.reason}`);
  const conditions: ChangeCondition[] = thresholds.map((t) => ({ metric: t.variable, operator: t.direction === "up" ? ">=" : "<=", threshold: Number(t.to.toPrecision(4)), why: `${t.interventionId} moves from ${t.fromStatus} to ${t.toStatus} when ${t.label} ${t.direction === "up" ? "reaches" : "falls to"} ${t.to.toPrecision(3)} (found by re-running the decision)`, interventionId: t.interventionId, fromStatus: t.fromStatus, toStatus: t.toStatus, basis: "threshold_search" }));
  const decision = buildDecision(`D-${String(n).padStart(3, "0")}`, `What should be done with the next ${gbp(input.budgetGbp)} of intervention capital?`, diagnosis, items, voi, allocation, now, conditions);
  bus.emit("DECISION_LOGGED", "DECIDING", `${decision.id}: selected ${decision.selected.join(", ") || "nothing"}; governance level ${decision.governance.level} (${decision.governance.reason})`, [decision.id]);

  const funded = items.filter((i) => decision.selected.includes(i.id));
  let plan: MeasurementPlan | null = null, outcome: CycleResult["outcome"] = null, measurement: MeasurementResult | null = null, learning: LearningRecord | null = null;
  let calibrationAfter: Calibration = calibrationBefore;
  if (funded.length) {
    plan = preregister(`MP-${String(n).padStart(3, "0")}`, funded, now);
    bus.emit("PLAN_REGISTERED", "MEASURING", `${plan.id} v${plan.version} sha256 ${plan.sha256.slice(0, 12)}…; expected ${gbp(plan.expectedGbp.low)}–${gbp(plan.expectedGbp.high)} (point ${gbp(plan.expectedPointGbp)}) over ${plan.windowWeeks} weeks`, [plan.id]);
    if (input.measure !== false) {
      const r = rng(input.seed * 7919 + 1);
      const o = applyOutcome(property.series, funded, revenue, r);
      outcome = { trueGainGbp: o.trueGainGbp, note: "SIMULATED OUTCOME — hidden from the estimator; each funded intervention works with its declared confidence and, if it works, its effect is drawn inside its range" };
      bus.emit("OUTCOME_SIMULATED", "MEASURING", `${plan.windowWeeks} post-weeks simulated (truth hidden from the estimator)`);
      measurement = measure(plan, o.property, property.series.comparables, now);
      bus.emit("MEASUREMENT_COMPLETE", measurement.status === "INCONCLUSIVE" ? "ALERT" : "MEASURING", `${measurement.status} / plan ${measurement.planStatus}: incremental ${gbp(measurement.incrementalPointGbp)} (90 % ${gbp(measurement.incrementalGbp.low)} to ${gbp(measurement.incrementalGbp.high)}); placebo rank ${measurement.placebo.rank}/${measurement.placebo.of}; plan intact ${measurement.planIntact}`, [measurement.planId]);
      const ctxNums = { rooms: spec.rooms, adr: spec.adrGbp, occupancy: spec.occupancy, otaShare: spec.otaShare, convMobile: spec.convMobile, repeatRate: spec.repeatRate };
      const draft = learningRecord(`LR-${String(n).padStart(3, "0")}`, spec.id, ctxNums, plan, measurement, calibrationBefore, calibrationBefore, now);
      calibrationAfter = calibrationFactors([...memory, draft], ids, P);
      learning = learningRecord(draft.id, spec.id, ctxNums, plan, measurement, calibrationBefore, calibrationAfter, now);
      bus.emit("FORECAST_ERROR_RECORDED", "LEARNING", `${learning.id}: expected ${gbp(learning.expectedGbp)}, observed ${gbp(learning.observedGbp)}, forecast error ${(learning.error * 100).toFixed(0)} %`, [learning.id]);
      bus.emit("LEARNING_RECORDED", "LEARNING", `${learning.id}: ${learning.calibrationNote}`, [learning.id]);
    }
  } else {
    bus.emit("NOTHING_FUNDED", "ALERT", "no intervention cleared the allocation rules: nothing to register or measure");
  }

  // Intervention control records
  const statuses: Record<string, string> = {}; for (const l of allocation.lines) statuses[l.interventionId] = l.status;
  const addresses: Record<string, readonly string[]> = {}; for (const i of items) addresses[i.id] = i.addresses;
  const resolved = resolvedConstraints(pmem);
  const records: InterventionRecord[] = items.map((i) => {
    const l = allocation.lines.find((x) => x.interventionId === i.id)!;
    const c0 = diagnosis.constraints.find((c) => c.id === i.addresses[0]);
    const depResolved = i.mustFollow.length && i.mustFollow.every((m) => resolved.some((r) => items.find((x) => x.id === m)?.addresses.includes(r.constraintId)));
    const depStatus: InterventionRecord["dependencyStatus"] = !i.mustFollow.length ? "NONE" : depResolved ? "RESOLVED_BY_MEASUREMENT" : i.mustFollow.every((m) => decision.selected.includes(m)) ? "SATISFIED" : "UNRESOLVED";
    const level: InterventionRecord["approvalLevel"] = i.costGbp >= 50_000 ? 4 : i.costGbp > 0 ? 3 : 1;
    const inPlan = plan?.interventionIds.includes(i.id) ?? false;
    const terms = ctx.partnership ?? NO_TERMS;
    const budget = interventionBudget(i, l.status, terms, level);
    const pkg = decisionPackage(i, c0?.name ?? "", l.status, budget, terms, ctx.providers.filter((p) => p.factors.includes(i.actsOn)).map((p) => `${p.name} (${p.role})`), inPlan && plan ? `Anesis controlled measurement framework — pre-registered plan ${plan.id}@v${plan.version}` : "Anesis controlled measurement framework — registered on approval");
    return {
      budget, package: pkg,
      id: i.id, name: i.name, objective: `move ${i.actsOn} toward benchmark`, problem: c0?.name ?? "", constraint: i.addresses, constraintKind: c0?.kind ?? null,
      owner: OWNERS[i.actsOn]?.owner ?? "Founder", team: OWNERS[i.actsOn]?.team ?? "—", dependency: i.mustFollow, dependencyStatus: depStatus,
      capitalGbp: i.costGbp, expectedImpactGbp: i.effectIfWorksGbp, expectedValueGbp: l.expectedValueGbp, risk: i.risk, reversibility: i.reversibility, confidence: i.confidence, confidenceBasis: i.confidenceBasis,
      measurementPlanId: inPlan && plan ? `${plan.id}@v${plan.version}` : null, successThreshold: inPlan && plan ? plan.successRule : "not registered: no plan exists for an unfunded intervention",
      decisionStatus: l.status, blockedBy: l.blockedBy, whatWouldUnblock: l.requiredCondition, approvalLevel: level, approvalTier: LEVEL_TIER[level],
      startDate: null, endDate: null,
      outcome: inPlan && measurement ? { status: measurement.status, incrementalGbp: measurement.incrementalPointGbp, planStatus: measurement.planStatus } : null,
      forecastError: inPlan && learning ? learning.error : null, learning: inPlan && learning ? learning.calibrationNote : null,
      history: recall(pmem, i.id, now).statement, evidence: i.evidence,
    };
  });
  const requirements = ids.map((id) => checkRequirements(id, property.observations, ctx.systems, qualityForSource));
  const actsOn: Record<string, string> = {}; const weeks: Record<string, number> = {}; for (const i of items) { actsOn[i.id] = i.actsOn; weeks[i.id] = i.timeToImpactWeeks; }
  const unblock: Record<string, string> = {}; const tConv = thresholds.find((t) => t.variable === "convMobile" && (t.interventionId === "I-004" || t.interventionId === "I-005")); if (tConv) unblock["conversion"] = `mobile booking conversion ≥ ${(tConv.to * 100).toFixed(2)} %`;
  const briefs = providerBriefs(records, actsOn, ctx.providers, plan, now, weeks, unblock);
  const evidence: ProviderEvidence[] = pmem.measured.map((m) => ({ providerId: assignProvider(actsOn[m.interventionId] ?? "", ctx.providers).id, interventionId: m.interventionId, planId: m.planId, expectedGbp: m.expectedGbp, actualGbp: m.incrementalGbp, forecastError: m.expectedGbp ? (m.incrementalGbp - m.expectedGbp) / m.expectedGbp : 0, measurementStatus: m.status, at: m.at }));
  const reliability = providerReliability(ctx.providers.length ? ctx.providers : [{ id: "PV-FOUNDER", name: "Founder / general manager", role: "founder", scope: "all", factors: [], systems: [] }], evidence);
  for (const b of briefs.filter((x) => x.instruction === "PROCEED" || x.instruction === "PREPARE")) bus.emit("PROVIDER_BRIEFED", "DECIDING", `${b.providerName} (${b.role}): ${b.instruction} ${b.interventionId} — ${b.note}`, [b.interventionId]);
  const memoryAfter = remember(pmem, { runId: `cycle-${n}`, spec, diagnosis, decision, statuses, addresses, measurement, plan: plan ? { id: `${plan.id}@v${plan.version}`, interventionIds: plan.interventionIds, expectedPointGbp: plan.expectedPointGbp } : null, learning });
  bus.emit("MEMORY_UPDATED", "LEARNING", `property memory: ${memoryAfter.decisions.length} decision(s), ${memoryAfter.measured.length} measured intervention(s), ${memoryAfter.failedHypotheses.length} failed hypothesis(es)`);
  bus.emit("CYCLE_COMPLETE", "IDLE", `cycle ${n} complete`);
  return { input, property, consistency, context: ctx, signals, assessments, fused, seasonality, attribution: attr, dataQualityNotes, diagnosis, exposures, interventions: items, voi, mostSensitiveUnknown, plausibleRanges: ranges, sensitivity: sens, thresholds, decisionSensitivity: decSens, capacity, compression: comp.reading, reconciliation, requirements, providerBriefs: briefs, providerReliability: reliability, verifiedMetrics: mergedObs.replaced, assay, allocation, decision, records, plan, outcome, measurement, learning, calibrationBefore, calibrationAfter, memoryAfter, events: bus.events };
}

/** Field-by-field comparison of two runs, with an explanation of what changed the decision. */
export interface RunDiff { readonly field: string; readonly a: string; readonly b: string }
export function compareRuns(a: CycleResult, b: CycleResult): RunDiff[] {
  const out: RunDiff[] = [];
  const cmp = (field: string, x: unknown, y: unknown) => { const sx = JSON.stringify(x), sy = JSON.stringify(y); if (sx !== sy) out.push({ field, a: sx, b: sy }); };
  cmp("seed", a.input.seed, b.input.seed); cmp("budgetGbp", a.input.budgetGbp, b.input.budgetGbp);
  cmp("spec", a.input.spec ?? {}, b.input.spec ?? {}); cmp("benchmarks", a.input.benchmarks ?? {}, b.input.benchmarks ?? {});
  cmp("memory.records", a.input.memory?.length ?? 0, b.input.memory?.length ?? 0);
  cmp("memory.resolvedConstraints", resolvedConstraints(a.input.propertyMemory ?? emptyMemory("")).map((r) => r.constraintId), resolvedConstraints(b.input.propertyMemory ?? emptyMemory("")).map((r) => r.constraintId));
  cmp("diagnosis.binding", a.diagnosis.binding, b.diagnosis.binding);
  cmp("diagnosis.deduplicatedGbp", a.diagnosis.deduplicatedGbp, b.diagnosis.deduplicatedGbp);
  cmp("assay.verdict", a.assay.verdict, b.assay.verdict);
  cmp("decision.selected", a.decision.selected, b.decision.selected);
  cmp("decision.statuses", Object.fromEntries(a.allocation.lines.map((l) => [l.interventionId, l.status])), Object.fromEntries(b.allocation.lines.map((l) => [l.interventionId, l.status])));
  cmp("decision.expectedValueGbp", Math.round(a.decision.expectedValueGbp), Math.round(b.decision.expectedValueGbp));
  cmp("external.verdicts", a.fused.map((f) => `${f.scope}:${f.verdict}`), b.fused.map((f) => `${f.scope}:${f.verdict}`));
  cmp("plan.expectedGbp", a.plan?.expectedGbp ?? null, b.plan?.expectedGbp ?? null);
  cmp("measurement.status", a.measurement?.status ?? null, b.measurement?.status ?? null);
  cmp("measurement.incrementalPointGbp", a.measurement ? Math.round(a.measurement.incrementalPointGbp) : null, b.measurement ? Math.round(b.measurement.incrementalPointGbp) : null);
  return out;
}

/** Plain-language explanation of why the decision differs between two runs, derived from the diff and the thresholds crossed. */
export function explainChange(a: CycleResult, b: CycleResult): string[] {
  const out: string[] = [];
  const sa = Object.fromEntries(a.allocation.lines.map((l) => [l.interventionId, l.status])), sb = Object.fromEntries(b.allocation.lines.map((l) => [l.interventionId, l.status]));
  const specA = { ...COUNTRY_HOUSE_34, ...a.input.spec } as unknown as Record<string, number>, specB = { ...COUNTRY_HOUSE_34, ...b.input.spec } as unknown as Record<string, number>;
  const benchA = { ...benchMap(a.input.benchmarks) } as Record<string, number>, benchB = { ...benchMap(b.input.benchmarks) } as Record<string, number>;
  const valueOf = (spec: Record<string, number>, bench: Record<string, number>, v: string) => (v in spec ? spec[v] : bench[v]) ?? NaN;
  const changedVars = [...new Set([...Object.keys(specB).filter((k) => typeof specB[k] === "number" && specA[k] !== specB[k]), ...Object.keys(benchB).filter((k) => benchA[k] !== benchB[k])])];
  for (const id of Object.keys(sb)) if (sa[id] !== sb[id]) {
    // cite a threshold only if its variable actually moved between the runs and crossed the threshold value
    const t = a.thresholds.find((x) => x.interventionId === id && x.fromStatus === sa[id] && changedVars.includes(x.variable) && (x.direction === "up" ? valueOf(specA, benchA, x.variable) < x.to && valueOf(specB, benchB, x.variable) >= x.to : valueOf(specA, benchA, x.variable) > x.to && valueOf(specB, benchB, x.variable) <= x.to));
    out.push(`${id}: ${sa[id]} → ${sb[id]}${t ? ` — threshold crossed: ${t.label} ${t.direction === "up" ? "≥" : "≤"} ${t.to.toPrecision(3)} (was ${t.from.toPrecision(3)})` : ""}${b.allocation.lines.find((l) => l.interventionId === id)?.blockedBy[0] ? `; now: ${b.allocation.lines.find((l) => l.interventionId === id)!.blockedBy[0]}` : ""}`);
  }
  if (changedVars.length) out.push(`inputs changed: ${changedVars.map((v) => `${v} ${String(valueOf(specA, benchA, v))} → ${String(valueOf(specB, benchB, v))}`).join(", ")}`);
  if (a.diagnosis.binding !== b.diagnosis.binding) out.push(`limiting constraint: ${a.diagnosis.binding} → ${b.diagnosis.binding}`);
  const ra = resolvedConstraints(a.input.propertyMemory ?? emptyMemory("")).length, rb = resolvedConstraints(b.input.propertyMemory ?? emptyMemory("")).length;
  if (ra !== rb) out.push(`memory: ${rb} constraint(s) measured resolved (was ${ra}) — dependencies re-evaluated`);
  const ca = Object.keys(a.calibrationBefore).length, cb = Object.keys(b.calibrationBefore).length;
  if (ca !== cb || JSON.stringify(a.calibrationBefore) !== JSON.stringify(b.calibrationBefore)) out.push(`calibration: ${JSON.stringify(b.calibrationBefore)} (was ${JSON.stringify(a.calibrationBefore)})`);
  if (!out.length) out.push("no change in the decision: same inputs, same memory, same thresholds");
  return out;
}

/** Strip real timestamps so two runs with the same inputs can be compared for byte-equality. */
export function deterministicView(r: CycleResult): unknown {
  const { events, ...rest } = r;
  return { ...rest, events: events.map(({ at, ...e }) => e) };
}
