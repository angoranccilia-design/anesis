import { NextResponse } from "next/server";
import { listRuns, memory } from "@/lib/engine/store";
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({
    runs: listRuns().map((r) => ({ id: r.id, createdAt: r.createdAt, label: r.label, input: r.input, durationMs: r.durationMs,
      summary: { binding: r.result.diagnosis.binding, selected: r.result.decision.selected, assay: r.result.assay.verdict, measurement: r.result.measurement?.status ?? null, expectedValueGbp: r.result.decision.expectedValueGbp } })),
    memory: memory(),
  });
}
