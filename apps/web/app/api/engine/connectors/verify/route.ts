import { NextResponse } from "next/server";
import { verifyConnectors } from "@/lib/connectors";
import { guardApi } from "@/lib/guard";
import { declaredSpec } from "@/lib/engine/store";
export const dynamic = "force-dynamic";
/** POST /api/engine/connectors/verify — real calls to every live source, right now; the statuses are what came back. */
export async function POST() {
  const g = await guardApi(); if (!g.ok) return g.response;
  return NextResponse.json({ at: new Date().toISOString(), results: await verifyConnectors(await declaredSpec()) });
}
