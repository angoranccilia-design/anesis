/** ANTICIPATE — forward exposure. Every probability is a MODELLED ASSUMPTION and says so. */
import type { Exposure } from "./model.js";
import { obsValue, type SimulatedProperty } from "./property.js";
import { bench, type BenchMap } from "./benchmarks.js";

export function anticipate(p: SimulatedProperty, B: BenchMap): Exposure[] {
  const v = (m: string) => obsValue(p, m);
  const revenue = v("room_revenue"), lowWeeks = v("low_season_weeks"), lowOcc = v("low_season_occupancy"), occ = v("occupancy"), ota = v("ota_share");
  const target = bench(B, "low_season_occupancy.target");
  const atRisk = (revenue.value / 52) * lowWeeks.value * Math.max(0, target - lowOcc.value) / occ.value;
  return [
    {
      id: "E-001", name: `Low-season demand weakness (${lowWeeks.value} weeks)`, horizonMonths: 6,
      probability: 0.8, probabilityBasis: "MODELLED ASSUMPTION — seasonality recurs; not estimated from data",
      valueAtRiskGbp: { low: atRisk * 0.6, high: atRisk * 1.1 },
      drivers: ["low-season occupancy below attainable target", "no low-season demand programme"],
      mitigation: ["low-season packages to the reactivated guest base (I-003)", "direct offers that do not depend on OTA visibility"],
      uncertainty: "target occupancy is a placeholder; the attainable share of the gap (60–110 %) is assumed",
      formula: "room_revenue ÷ 52 × low_season_weeks × (target − low_season_occupancy) ÷ occupancy × [0.6, 1.1]",
      evidence: [revenue.id, lowWeeks.id, lowOcc.id, occ.id], status: "MODELLED",
    },
    {
      id: "E-002", name: "Platform dependency: revenue controlled by third parties", horizonMonths: 18,
      probability: 0.5, probabilityBasis: "MODELLED ASSUMPTION — probability of a commission or ranking change within 18 months; not estimated from data",
      valueAtRiskGbp: { low: revenue.value * ota.value * 0.03, high: revenue.value * ota.value * 0.08 },
      drivers: [`${(ota.value * 100).toFixed(0)} % of room revenue via OTAs`, "commission and ranking set unilaterally"],
      mitigation: ["direct capture (I-002) once conversion is fixed (I-001)"],
      uncertainty: "3–8 % impact range is assumed, not observed",
      formula: "room_revenue × ota_share × [0.03, 0.08]",
      evidence: [revenue.id, ota.id], status: "MODELLED",
    },
  ];
}
