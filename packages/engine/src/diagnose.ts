/**
 * DIAGNOSE — potential / attainable / actual, constraints with explicit deduplication, limiting constraint.
 *
 * Every constraint carries: formula, inputs (evidence ids), assumptions, source, confidence, status, timestamp.
 * Deduplication is a declared rule, not a discount: see `dedup` below.
 */
import type { Constraint, Diagnosis, Range } from "./model.js";
import { obsValue, type SimulatedProperty } from "./property.js";
import { bench, type BenchMap } from "./benchmarks.js";

const pos = (x: number): number => Math.max(0, x);
const mid = (r: Range): number => (r.low + r.high) / 2;

export function diagnose(p: SimulatedProperty, B: BenchMap, at = new Date().toISOString()): Diagnosis {
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
  const cConv: Constraint = {
    id: "C-001", factor: "conversion", name: "Mobile booking conversion below benchmark", metric: "conv.mobile",
    observed: convMobile.value, benchmark: bench(B, "conv.mobile.p50"), attainment: Math.min(1, blended / blendedBench),
    gapGbp: convGap, confidence: 0.6, status: "MODELLED",
    formula: "sessions.mobile × (benchmark − conv.mobile) × booking_value_avg  [low: p50, high: p75]",
    assumptions: ["benchmark conv.mobile p50/p75 are placeholders", "every recovered booking has average value", "attainment = blended conversion ÷ blended benchmark"],
    evidence: [mobileSessions.id, convMobile.id, convDesktop.id, mobileShare.id, bookingValue.id], dependsOn: [],
  };

  // C-002 direct capture: OTA share above target → avoidable commission on the shiftable part.
  const excessRevenue = pos(otaShare.value - bench(B, "ota_share.target")) * revenue.value;
  const cDirect: Constraint = {
    id: "C-002", factor: "direct_capture", name: "OTA dependency above target: avoidable commission", metric: "ota_share",
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
  const cRet: Constraint = {
    id: "C-003", factor: "retention", name: "Repeat rate below benchmark: unreactivated guest base", metric: "crm.repeat_rate",
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
  const cDemand: Constraint = {
    id: "C-004", factor: "demand", name: "Website demand relative to room count", metric: "sessions.total",
    observed: sessions.value, benchmark: demandBench, attainment: Math.min(1, sessions.value / demandBench),
    gapGbp: { low: 0, high: 0 }, confidence: 0.5, status: "MODELLED",
    formula: "sessions.total ÷ (rooms × sessions_per_room.p50); no £ gap is attributed to demand while conversion binds",
    assumptions: ["additional demand converts at the current (below-benchmark) rate, so its value is counted under conversion"],
    evidence: [sessions.id, rooms.id], dependsOn: [],
  };

  const constraints = [cConv, cDirect, cRet, cDemand];
  const totalAddressable = constraints.reduce((a, c) => a + mid(c.gapGbp), 0);

  // Deduplication rule (explicit): part of C-001's missing bookings are not lost stays but stays that
  // substitute to an OTA. For that share, recovering them is worth only the commission, and that value
  // is already what C-002 counts. So C-001 is credited full value on (1 − s) and commission-only on s.
  const s = bench(B, "substitution_to_ota");
  const dedupConv: Range = { low: convGap.low * ((1 - s) + s * commission.value), high: convGap.high * ((1 - s) + s * commission.value) };
  const deduplicated: Range = {
    low: dedupConv.low + cDirect.gapGbp.low + cRet.gapGbp.low,
    high: dedupConv.high + cDirect.gapGbp.high + cRet.gapGbp.high,
  };

  // Limiting constraint: the new-guest chain demand → conversion → direct capture. Lowest attainment binds.
  const chain = [cDemand, cConv, cDirect];
  const binding = chain.reduce((a, c) => (c.attainment < a.attainment ? c : a));
  const bindingWhy = `${binding.name}: attainment ${(binding.attainment * 100).toFixed(0)} % is the lowest in the new-guest chain (` +
    chain.map((c) => `${c.factor} ${(c.attainment * 100).toFixed(0)} %`).join(", ") +
    `). Investing upstream of the binding factor (more demand) is multiplied by the factor's current conversion; investing downstream cannot act on bookings that never happen.`;

  return {
    actualGbp: revenue.value,
    potentialGbp: revenue.value + constraints.reduce((a, c) => a + c.gapGbp.high, 0),
    attainableGbp: revenue.value + mid(deduplicated),
    constraints, totalAddressableGbp: totalAddressable, deduplicatedGbp: deduplicated,
    dedupMethod: `C-001 credited (1 − substitution_to_ota) × full value + substitution_to_ota × commission-only, substitution_to_ota = ${s}; C-002 unchanged; C-003 independent chain; C-004 carries no £ while conversion binds`,
    binding: binding.id, bindingWhy,
    evidence: [...new Set(constraints.flatMap((c) => c.evidence))],
    computedAt: at,
  };
}
