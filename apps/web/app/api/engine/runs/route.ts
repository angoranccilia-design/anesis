import { NextResponse } from "next/server";
import { listRuns, memory } from "@/lib/engine/store";
import { guardApi } from "@/lib/guard";
export const dynamic = "force-dynamic";
export async function GET() {
  const g = await guardApi(); if (!g.ok) return g.response;
  return NextResponse.json({
    runs: (await listRuns()).map((r) => ({ id: r.id, createdAt: r.createdAt, label: r.label, input: r.input, durationMs: r.durationMs,
      summary: { binding: r.result.diagnosis.binding, selected: r.result.decision.selected, assay: r.result.assay.verdict, measurement: r.result.measurement?.status ?? null, expectedValueGbp: r.result.decision.expectedValueGbp } })),
    memory: memory(),
  });
}
