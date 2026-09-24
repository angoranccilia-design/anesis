import { NextResponse } from "next/server";
import { listRuns, memory } from "@/lib/engine/store";
import { calibrationFactors } from "@anesis/engine";
export const dynamic = "force-dynamic";
/** ANESIS MEMORY — property level (learning records) and methodology level (calibration derived from them). */
export function GET() {
  const mem = memory();
  return NextResponse.json({
    property: mem,
    methodology: { calibration: calibrationFactors(mem, ["I-001", "I-002", "I-003", "I-004"]), note: "factors = 1 + mean forecast error × n/(n+3); claimed only when ≠ 1; INCONCLUSIVE measurements are recorded but never calibrate" },
    portfolio: { properties: 1, note: "one simulated property; portfolio-level pooling is PLANNED and would be enabled only after validation on real properties" },
    decisions: listRuns().map((r) => ({ runId: r.id, decision: r.result.decision.id, selected: r.result.decision.selected, at: r.createdAt })),
  });
}
