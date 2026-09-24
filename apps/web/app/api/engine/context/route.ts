import { NextResponse } from "next/server";
import { buildContext } from "@/lib/connectors";
import { registers } from "@/lib/engine/store";
import { COUNTRY_HOUSE_34 } from "@anesis/engine";
export const dynamic = "force-dynamic";
/** GET /api/engine/context — the live external context as the connectors see it now (states, freshness, values). */
export async function GET() {
  const ctx = await buildContext(COUNTRY_HOUSE_34, registers());
  return NextResponse.json(ctx);
}
