import { NextResponse } from "next/server";
import { guardInterventions } from "@/lib/interventions";
import { getRuntime } from "@/lib/engine/runtimeDb";
export const dynamic = "force-dynamic";
/** GET /api/interventions — the property's contracts with their state. */
export async function GET() {
  const g = await guardInterventions(); if (!g.ok) return g.response;
  const { rt, db } = await getRuntime();
  return NextResponse.json({ propertyId: g.propertyId, interventions: await rt.listInterventions(db, g.propertyId) });
}
