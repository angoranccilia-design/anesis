import { NextResponse } from "next/server";
import { buildContext } from "@/lib/connectors";
import { registers, declaredSpec } from "@/lib/engine/store";
import { guardApi } from "@/lib/guard";
export const dynamic = "force-dynamic";
/** GET /api/engine/context — the live external context as the connectors see it now (states, freshness, values). */
export async function GET() {
  const g = await guardApi(); if (!g.ok) return g.response;
  const ctx = await buildContext(await declaredSpec(), await registers());
  return NextResponse.json(ctx);
}
