import "server-only";
import { NextResponse } from "next/server";
import { COUNTRY_HOUSE_34 } from "@anesis/engine";
import { guardApi, type Guard } from "./guard";
import { getRuntime, runtimeConfigured } from "./engine/runtimeDb";
import { propertyId } from "./engine/store";

/** Interventions live in the runtime database only. Access: an operator session (or explicit demo), and for non-founders a grant on the property. */
export async function guardInterventions(): Promise<(Guard & { ok: true }) & { propertyId: string } | { ok: false; response: NextResponse }> {
  const g = await guardApi(); if (!g.ok) return g;
  if (!runtimeConfigured()) return { ok: false, response: NextResponse.json({ error: "no runtime database configured: interventions exist only in the runtime (DATABASE_URL or ANESIS_PGLITE_DIR)" }, { status: 409 }) };
  const id = propertyId();
  if (g.mode === "db" && g.operator.role !== "founder") { const { rt, db } = await getRuntime(); if (!(await rt.operatorMayAccess(db, g.operator.id, id))) return { ok: false, response: NextResponse.json({ error: `no access to property ${id}` }, { status: 403 }) }; }
  return { ...g, propertyId: id };
}
export const simulatedProperty = (id: string): boolean => id === COUNTRY_HOUSE_34.id;
