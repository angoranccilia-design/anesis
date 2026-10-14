import { NextResponse } from "next/server";
import { guardInterventions } from "@/lib/interventions";
import { getRuntime } from "@/lib/engine/runtimeDb";
import { closureDossier } from "@anesis/execution";
export const dynamic = "force-dynamic";
/** GET /api/interventions/[id] — the full contract, its deliverables and the closure dossier as it stands. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardInterventions(); if (!g.ok) return g.response;
  const { id } = await params; const { rt, db } = await getRuntime();
  const c = await rt.loadIntervention(db, id);
  if (!c || c.propertyId !== g.propertyId) return NextResponse.json({ error: "no such intervention for this property" }, { status: 404 });
  return NextResponse.json({ contract: c, closure: closureDossier(c) });
}
