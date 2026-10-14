import { NextResponse } from "next/server";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { guardApi } from "@/lib/guard";
import { getRuntime, runtimeConfigured } from "@/lib/engine/runtimeDb";
import { executeRun, propertyId } from "@/lib/engine/store";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/assay (multipart: file?, rooms, collectedAt?) — import the export into the runtime, run one cycle through the console, return what was assessed. */
export async function POST(req: Request) {
  const g = await guardApi(); if (!g.ok) return g.response;
  if (!runtimeConfigured()) return NextResponse.json({ error: "no runtime database: an assay needs DATABASE_URL, ANESIS_PGLITE_DIR or demo mode" }, { status: 409 });
  const fd = await req.formData().catch(() => null); if (!fd) return NextResponse.json({ error: "multipart form expected" }, { status: 400 });
  const file = fd.get("file"); const rooms = Number(fd.get("rooms") ?? 0); const collectedAt = String(fd.get("collectedAt") ?? "") || null;
  const { rt, db } = await getRuntime(); const id = propertyId();
  let imp: { verdict: string; window: string } | null = null;
  if (file instanceof File && file.size > 0) {
    if (!rooms) return NextResponse.json({ error: "the number of sellable rooms is required with a file" }, { status: 400 });
    if (file.size > 25_000_000) return NextResponse.json({ error: "file too large (25 MB)" }, { status: 413 });
    const dir = mkdtempSync(join(tmpdir(), "anesis-upload-")); const path = join(dir, file.name.replace(/[^A-Za-z0-9._-]/g, "_"));
    writeFileSync(path, new Uint8Array(await file.arrayBuffer()));
    try { const r = await rt.importFile(db, path, { propertyId: id, rooms, collectedAt: collectedAt ? `${collectedAt}T12:00:00Z` : null }); imp = { verdict: r.sufficiency.verdict, window: r.sufficiency.window.note }; }
    catch (e) { return NextResponse.json({ error: `import failed: ${e instanceof Error ? e.message : String(e)}` }, { status: 422 }); }
  }
  try {
    const run = await executeRun({ label: imp ? `assay on ${file instanceof File ? file.name : "import"}` : "assay re-run on the latest import", offline: process.env.ANESIS_OFFLINE === "1" });
    const d = run.result.diagnosis;
    return NextResponse.json({ runId: run.id, verdict: imp?.verdict ?? "latest import reused", window: imp?.window ?? "", summary: { evidencePolicy: d.evidencePolicy, seriesSource: run.result.seriesSource, verifiedMetrics: run.result.verifiedMetrics, binding: d.binding, assessed: d.constraints.filter((c) => c.assessable).map((c) => ({ id: c.id, name: c.name, gapGbp: c.gapGbp })), withheld: d.constraints.filter((c) => !c.assessable).map((c) => ({ id: c.id, needs: c.missing })), decision: run.result.allocation.lines.map((l) => ({ intervention: l.interventionId, status: l.status })) } });
  } catch (e) { return NextResponse.json({ error: `cycle failed: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 }); }
}
