/**
 * DIAGNOSE — potential / attainable / actual, constraints with explicit deduplication, limiting constraint.
 *
 * Every constraint carries: formula, inputs (evidence ids), assumptions, source, confidence, status, timestamp.
 * Deduplication is a declared rule, not a discount: see `dedup` below.
 */
import type { Constraint, Diagnosis, EvidencePolicy, Range, Observation } from "./model.js";
import { obsValue, type SimulatedProperty } from "./property.js";
import { bench, type BenchMap, type BenchSources } from "./benchmarks.js";
import { CAPACITY_BIND_OCC, STAFFING_BIND } from "./context/operations.js";
import { NODE_BIND_UTILISATION, CHAIN_RELEVANCE } from "./context/capacity.js";

const pos = (x: number): number => Math.max(0, x);
const mid = (r: Range): number => (r.low + r.high) / 2;

import type { NodeAssessment } from "./context/capacity.js";

/** Benchmarks each constraint rests on. Declared rules (capacity binds at 0.9, staffing at 0.95) are methodology parameters, not benchmarks. */
const BENCH_KEYS: Record<string, readonly string[]> = { "C-001": ["conv.mobile.p50", "conv.mobile.p75", "conv.desktop.p50"], "C-002": ["ota_share.target", "ota.shiftable.low", "ota.shiftable.high"], "C-003": ["crm.repeat_rate.p50", "crm.repeat_rate.p75", "crm.reachable_share"], "C-004": ["sessions_per_room.p50"] };
/** An observation is real-backed when it was measured (VERIFIED) or projected from a measured system window (MODELLED, source CONN-*). Anything simulated or derived from the simulation is not. */
export const realBacked = (o: Observation | undefined): boolean => !!o && (o.status === "VERIFIED" || (o.status === "MODELLED" && o.source.startsWith("CONN-")));

export interface DiagnoseOptions { readonly evidencePolicy?: EvidencePolicy; readonly benchSources?: BenchSources }

export function diagnose(p: SimulatedProperty, B: BenchMap, at = new Date().toISOString(), capacity: readonly NodeAssessment[] = [], opts: DiagnoseOptions = {}): Diagnosis {
  const policy: EvidencePolicy = opts.evidencePolicy ?? "simulated_allowed"; const sources = opts.benchSources ?? {};
  const v = (m: string) => obsValue(p, m);
  const rooms = v("rooms"), revenue = v("room_revenue"), bookingValue = v("booking_value_avg");
  const mobileSessions = v("sessions.mobile"), convMobile = v("conv.mobile"), convDesktop = v("conv.desktop"), mobileShare = v("sessions.mobile_share");
  const otaShare = v("ota_share"), commission = v("ota_commission_rate");
  const pastGuests = v("crm.past_guests"), repeat = v("crm.repeat_rate");
  const sessions = v("sessions.total");

  // C-001 conversion: mobile conversion below benchmark. Value = missing bookings × booking value.
  const convGap: Range = {
    low: pos(mobileSessions.value * (bench(B, "conv.mobile.p50") - convMobile.value) * bookingValue.value),
    high: pos(mobileSessions.value * (bench(B, "conv.mobile.p75") - convMobile.value) * bookingValue.value),
  };
  const blended = mobileShare.value * convMobile.value + (1 - mobileShare.value) * convDesktop.value;
  const blendedBench = mobileShare.value * bench(B, "conv.mobile.p50") + (1 - mobileShare.value) * bench(B, "conv.desktop.p50");
  const cConv: Omit<Constraint, "assessable" | "missing"> = {
    id: "C-001", kind: "CONVERSION", factor: "conversion", name: "Mobile booking conversion below benchmark", metric: "conv.mobile",
    observed: convMobile.value, benchmark: bench(B, "conv.mobile.p50"), attainment: Math.min(1, blended / blendedBench),
    gapGbp: convGap, confidence: 0.6, status: "MODELLED",
    formula: "sessions.mobile × (benchmark − conv.mobile) × booking_value_avg  [low: p50, high: p75]",
    assumptions: ["benchmark conv.mobile p50/p75 are placeholders", "every recovered booking has average value", "attainment = blended conversion ÷ blended benchmark"],
    evidence: [mobileSessions.id, convMobile.id, convDesktop.id, mobileShare.id, bookingValue.id], dependsOn: [],
  };

  // C-002 direct capture: OTA share above target → avoidable commission on the shiftable part.
  const excessRevenue = pos(otaShare.value - bench(B, "ota_share.target")) * revenue.value;
  const cDirect: Omit<Constraint, "assessable" | "missing"> = {
    id: "C-002", kind: "ECONOMIC", factor: "direct_capture", name: "OTA dependency above target: avoidable commission", metric: "ota_share",
    observed: otaShare.value, benchmark: bench(B, "ota_share.target"),
    attainment: Math.min(1, (1 - otaShare.value) / (1 - bench(B, "ota_share.target"))),
    gapGbp: { low: excessRevenue * bench(B, "ota.shiftable.low") * commission.value, high: excessRevenue * bench(B, "ota.shiftable.high") * commission.value },
    confidence: 0.55, status: "MODELLED",
    formula: "(ota_share − target) × room_revenue × shiftable × ota_commission_rate  [shiftable: 15 %–35 %]",
    assumptions: ["only commission is saved: the stay itself would have happened", "shift requires a working direct funnel (depends on C-001)"],
    evidence: [otaShare.id, revenue.id, commission.id], dependsOn: ["C-001"],
  };

  // C-003 retention: repeat rate below benchmark on the reachable guest base.
  const reach = bench(B, "crm.reachable_share");
  const cRet: Omit<Constraint, "assessable" | "missing"> = {
    id: "C-003", kind: "RETENTION", factor: "retention", name: "Repeat rate below benchmark: unreactivated guest base", metric: "crm.repeat_rate",
    observed: repeat.value, benchmark: bench(B, "crm.repeat_rate.p50"), attainment: Math.min(1, repeat.value / bench(B, "crm.repeat_rate.p50")),
    gapGbp: {
      low: pos(pastGuests.value * (bench(B, "crm.repeat_rate.p50") - repeat.value) * bookingValue.value * reach),
      high: pos(pastGuests.value * (bench(B, "crm.repeat_rate.p75") - repeat.value) * bookingValue.value * reach),
    },
    confidence: 0.5, status: "MODELLED",
    formula: "crm.past_guests × (benchmark − crm.repeat_rate) × booking_value_avg × reachable_share",
    assumptions: ["50 % of past guests are reachable (placeholder)", "a reactivated guest books one average stay"],
    evidence: [pastGuests.id, repeat.id, bookingValue.id], dependsOn: [],
  };

  // C-004 demand: website sessions vs. sessions-per-room benchmark (no £ gap: demand without conversion has no value).
  const demandBench = rooms.value * bench(B, "sessions_per_room.p50");
  const cDemand: Omit<Constraint, "assessable" | "missing"> = {
    id: "C-004", kind: "DEMAND", factor: "demand", name: "Website demand relative to room count", metric: "sessions.total",
    observed: sessions.value, benchmark: demandBench, attainment: Math.min(1, sessions.value / demandBench),
    gapGbp: { low: 0, high: 0 }, confidence: 0.5, status: "MODELLED",
    formula: "sessions.total ÷ (rooms × sessions_per_room.p50); no £ gap is attributed to demand while conversion binds",
    assumptions: ["additional demand converts at the current (below-benchmark) rate, so its value is counted under conversion"],
    evidence: [sessions.id, rooms.id], dependsOn: [],
  };

  // C-005 capacity: headroom on peak nights. Attainment 1 while peak occupancy leaves headroom; falls towards 0 as peak occupancy approaches 1.
  const peak = v("ops.peak_occupancy"), staffing = v("ops.staffing_coverage"), ooo = v("ops.rooms_out_of_order"); const occupancyValue = v("occupancy").value;
  const cCapBase = capacity;
  void cCapBase;
  const capAttain = Math.min(1, (1 - peak.value) / (1 - CAPACITY_BIND_OCC));
  const cCap: Omit<Constraint, "assessable" | "missing"> = {
    id: "C-005", kind: "CAPACITY", factor: "capacity", name: "Room capacity on peak nights", metric: "ops.peak_occupancy",
    observed: peak.value, benchmark: CAPACITY_BIND_OCC, attainment: capAttain, gapGbp: { low: 0, high: 0 }, confidence: 0.7, status: "MODELLED",
    formula: `attainment = (1 − peak_occupancy) ÷ (1 − ${CAPACITY_BIND_OCC}), capped at 1; no £ gap: capacity limits what demand and conversion can deliver rather than losing revenue itself`,
    assumptions: [`capacity binds at peak occupancy ≥ ${CAPACITY_BIND_OCC} (declared)`, `${ooo.value} room(s) out of order reduce sellable capacity`],
    evidence: [peak.id, ooo.id, rooms.id], dependsOn: [],
  };
  // C-006 operational: staffing coverage against plan.
  const cOps: Omit<Constraint, "assessable" | "missing"> = {
    id: "C-006", kind: "OPERATIONAL", factor: "operational", name: "Staffing coverage against plan", metric: "ops.staffing_coverage",
    observed: staffing.value, benchmark: STAFFING_BIND, attainment: Math.min(1, staffing.value / STAFFING_BIND), gapGbp: { low: 0, high: 0 }, confidence: 0.6, status: "MODELLED",
    formula: `attainment = staffing_coverage ÷ ${STAFFING_BIND}, capped at 1; no £ gap attributed directly`,
    assumptions: [`operations bind below ${STAFFING_BIND} coverage (declared)`], evidence: [staffing.id], dependsOn: [],
  };
  const assess = (c: Omit<Constraint, "assessable" | "missing">): Constraint => {
    const missing: string[] = [];
    for (const id of c.evidence) { const o = p.observations.find((x) => x.id === id); if (!realBacked(o)) missing.push(o ? `${o.metric} (${o.status.toLowerCase()}, ${o.source})` : `${id} (absent)`); }
    for (const k of BENCH_KEYS[c.id] ?? []) if (!sources[k]) missing.push(`benchmark ${k} (no documented source)`);
    const assessable = policy === "simulated_allowed" || missing.length === 0;
    if (assessable) return { ...c, assessable: true, missing: policy === "verified_only" ? [] : missing };
    // Not assessable under verified_only: the numbers computed from simulated inputs are withdrawn, nothing is claimed.
    return { ...c, assessable: false, missing, status: "SIMULATED", attainment: 1, gapGbp: { low: 0, high: 0 }, assumptions: [...c.assumptions, `NOT ASSESSABLE on verified data: ${missing.join("; ")}`] };
  };
  const constraints = [cConv, cDirect, cRet, cDemand, cCap, cOps].map(assess);
  // Capacity network: one constraint per non-room node with a known utilisation (spa, restaurant, experience, outdoor). Rooms are C-005 above;
  // when the network's rooms node has a bottleneck other than rooms (housekeeping), it is reflected in C-005's assumptions.
  const byId = (id: string) => constraints.find((c) => c.id === id)!;
  const roomsNode = capacity.find((n) => n.activity === "rooms");
  if (roomsNode && roomsNode.bottleneck && roomsNode.bottleneck.resourceId !== "R-ROOMS" && roomsNode.attainableRatio < 1) {
    const i = constraints.findIndex((c) => c.id === "C-005");
    constraints[i] = { ...constraints[i]!, attainment: Math.min(constraints[i]!.attainment, Math.min(1, (1 - roomsNode.utilisationOfAttainable) / (1 - NODE_BIND_UTILISATION))), assumptions: [...constraints[i]!.assumptions, roomsNode.explanation] };
  }
  let k = 7;
  for (const n of capacity.filter((x) => x.activity !== "rooms")) {
    const att = Math.min(1, Math.max(0, (1 - n.utilisationOfAttainable) / (1 - NODE_BIND_UTILISATION)), n.queue ? Math.max(0, 1 - n.queue.estimatedWaitMinutes / 30) : 1);
    const inChain = n.demandRelevance >= CHAIN_RELEVANCE;
    constraints.push({ assessable: true, missing: [], id: `C-${String(k++).padStart(3, "0")}`, kind: "CAPACITY", factor: inChain ? "service_capacity" : `service_capacity:${n.activity}`, name: `Service capacity — ${n.name}${inChain ? "" : " (outside the room-booking chain)"}`, metric: `capacity.${n.activity}.utilisation`, observed: Number(n.utilisationOfAttainable.toFixed(3)), benchmark: NODE_BIND_UTILISATION, attainment: att, gapGbp: { low: 0, high: 0 }, confidence: n.confidence, status: "MODELLED", formula: n.formula, assumptions: [n.explanation, `bottleneck resource: ${n.bottleneck ? `${n.bottleneck.resource} (${(n.bottleneck.availabilityRatio * 100).toFixed(0)} %)` : "none"}`, `${(n.demandRelevance * 100).toFixed(0)} % of property-wide acquisition lands on this activity (declared) — ${inChain ? "in the acquisition chain" : "reported, not in the room-booking chain; affects this activity's own demand"}`], evidence: [rooms.id], dependsOn: [] });
  }
  const totalAddressable = constraints.reduce((a, c) => a + mid(c.gapGbp), 0);   // non-assessable constraints carry a zero gap by construction
  // Deduplication rule (explicit): part of C-001's missing bookings are not lost stays but stays that substitute to an OTA.
  // For that share, recovering them is worth only the commission, which is exactly what C-002 counts.
  const s = bench(B, "substitution_to_ota");
  const c1 = byId("C-001"), c2 = byId("C-002"), c3 = byId("C-003");
  const dedupConv: Range = { low: c1.gapGbp.low * ((1 - s) + s * commission.value), high: c1.gapGbp.high * ((1 - s) + s * commission.value) };
  const deduplicated: Range = { low: dedupConv.low + c2.gapGbp.low + c3.gapGbp.low, high: dedupConv.high + c2.gapGbp.high + c3.gapGbp.high };
  const svc = constraints.filter((c) => c.factor === "service_capacity");
  const chainAll = [byId("C-004"), c1, byId("C-005"), ...svc, byId("C-006"), c2];
  const chain = chainAll.filter((c) => c.assessable);
  const notAssessable = constraints.filter((c) => !c.assessable).map((c) => c.id);
  const revenueReal = policy === "simulated_allowed" || realBacked(p.observations.find((o) => o.id === revenue.id));
  // Demand shape: peak nights saturated while annual occupancy is low → the property is capacity-bound only at peak; off-peak inventory is the opportunity.
  const offPeakShape = peak.value >= 0.9 && occupancyValue <= 0.7;
  const binding = chain.length ? chain.reduce((a, c) => (c.attainment < a.attainment ? c : a)) : null;
  const bindingWhy = !binding ? `no constraint is assessable on verified data (${notAssessable.length} withheld: ${constraints.filter((c) => !c.assessable).map((c) => `${c.id} needs ${c.missing.join(", ")}`).join(" | ")}); no limiting constraint is named` : `${binding.name} (${binding.kind}): attainment ${(binding.attainment * 100).toFixed(0)} % is the lowest in the value chain (` +
    chain.map((c) => `${c.factor} ${(c.attainment * 100).toFixed(0)} %`).join(", ") +
    `). ${binding.kind === "CAPACITY" || binding.kind === "OPERATIONAL" ? "Demand exists, but incremental acquisition would currently collide with an operational capacity constraint" + (binding.factor.startsWith("service") ? ` (${binding.name.replace("Service capacity — ", "")}${binding.assumptions[1] ? "; " + binding.assumptions[1] : ""})` : "") + "." : "Investing upstream of the binding factor is multiplied by its current attainment; investing downstream cannot act on bookings that never happen."}` +
    (offPeakShape ? ` Demand shape: peak nights are ${(peak.value * 100).toFixed(0)} % occupied while annual occupancy is ${(occupancyValue * 100).toFixed(0)} %: capacity binds only at peak; off-peak inventory is unsold, so acquisition should target off-peak periods rather than peak-time demand.` : "");

  const actual = revenueReal ? revenue.value : 0;
  return {
    actualGbp: actual,
    potentialGbp: actual + constraints.reduce((a, c) => a + c.gapGbp.high, 0),
    attainableGbp: actual + mid(deduplicated),
    constraints, totalAddressableGbp: totalAddressable, deduplicatedGbp: deduplicated,
    dedupMethod: `C-001 credited (1 − substitution_to_ota) × full value + substitution_to_ota × commission-only, substitution_to_ota = ${s}; C-002 unchanged; C-003 independent chain; C-004 carries no £ while conversion binds`,
    binding: binding?.id ?? null, bindingWhy: revenueReal ? bindingWhy : `${bindingWhy} Revenue is not verified: actual, potential and attainable are withheld (0).`,
    evidence: [...new Set(constraints.flatMap((c) => c.evidence))],
    computedAt: at, evidencePolicy: policy, notAssessable,
  };
}
