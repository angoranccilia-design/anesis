import { NextResponse } from "next/server";
import { listRuns, memory, propertyMemory, loadModel, modelStatement } from "@/lib/engine/store";
import { calibrationFactors, recall } from "@anesis/engine";
export const dynamic = "force-dynamic";
/** ANESIS MEMORY — property level (decisions, measurements, failed hypotheses, learning records), methodology level (calibration), portfolio level (planned). */
export async function GET() {
  const m = await loadModel(); const mem = memory(), pm = propertyMemory(); const now = new Date().toISOString();
  return NextResponse.json({
    model: { persisted: true, store: "file (one JSON per property; ANESIS_DATA_DIR)", statement: modelStatement(now), propertyId: m.propertyId, createdAt: m.createdAt, updatedAt: m.updatedAt, cycles: m.cycles.map((c) => ({ id: c.id, at: c.at, binding: c.bindingConstraintId, selected: c.selected, preregistration: c.preregistration?.sha256.slice(0, 12) ?? null, measurement: c.measurement?.status ?? null, forecastError: c.forecastError, simulated: c.simulated })), specVersions: m.specHistory.length },
    property: { ...pm, recall: ["I-001", "I-002", "I-003", "I-004", "I-005"].map((id) => recall(pm, id, now)) },
    learning: mem,
    methodology: { calibration: calibrationFactors(mem, ["I-001", "I-002", "I-003", "I-004", "I-005"]), note: "factors = 1 + mean forecast error × n/(n+3); claimed only when ≠ 1; INCONCLUSIVE measurements are recorded but never calibrate" },
    portfolio: { properties: 1, pooling: "disabled (may use hierarchical estimation subject to empirical validation)", note: "one simulated property; partial pooling is implemented (pooledCalibration) and off by default" },
    decisions: listRuns().map((r) => ({ runId: r.id, decision: r.result.decision.id, selected: r.result.decision.selected, statuses: Object.fromEntries(r.result.allocation.lines.map((l) => [l.interventionId, l.status])), at: r.createdAt })),
  });
}
