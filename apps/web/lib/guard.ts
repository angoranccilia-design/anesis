import "server-only";
import { NextResponse } from "next/server";
import type { Operator } from "@anesis/core";
import { isDbConfigured } from "./db";
import { currentOperator, getDemoCookie } from "./session";
import { demoMode, demoPasswordSet, demoSessionValid, DEMO_OPERATOR } from "./demo";

/**
 * Access control for the engine and intervention APIs.
 *   - Database configured: every call needs an operator session (cookie). No session → 401.
 *   - No database (demo): the API is closed unless ANESIS_DEMO_OPEN=1 is set explicitly → 403 otherwise.
 * Nothing here fabricates an identity: in demo mode `operator` is null and the caller is recorded as "demo".
 */
export type Guard = { ok: true; mode: "db"; operator: Operator } | { ok: true; mode: "demo-operator"; operator: Operator } | { ok: true; mode: "demo"; operator: null } | { ok: false; response: NextResponse };

export const demoOpen = (): boolean => process.env.ANESIS_DEMO_OPEN === "1";

export async function guardApi(): Promise<Guard> {
  if (isDbConfigured()) {
    const operator = await currentOperator();
    if (!operator) return { ok: false, response: NextResponse.json({ error: "authentication required" }, { status: 401 }) };
    return { ok: true, mode: "db", operator };
  }
  if (demoMode() && demoPasswordSet()) {
    if (demoSessionValid(await getDemoCookie())) return { ok: true, mode: "demo-operator", operator: DEMO_OPERATOR };
    if (!demoOpen()) return { ok: false, response: NextResponse.json({ error: "demo sign-in required" }, { status: 401 }) };
  }
  if (demoOpen()) return { ok: true, mode: "demo", operator: null };
  return { ok: false, response: NextResponse.json({ error: "demo mode locked: no database is configured and ANESIS_DEMO_OPEN is not set; the engine API is closed" }, { status: 403 }) };
}

/** Founder-only operations (destructive or cross-property). In demo mode the same ANESIS_DEMO_OPEN rule applies. */
export async function guardFounder(): Promise<Guard> {
  const g = await guardApi();
  if (!g.ok || g.mode === "demo") return g;
  if (g.operator.role !== "founder") return { ok: false, response: NextResponse.json({ error: "founder role required" }, { status: 403 }) };
  return g;
}

/** Who to record as the actor of a write: the session operator, never a name from the request body. */
export const actorOf = (g: Guard & { ok: true }): { by: string; human: boolean } => g.mode === "db" ? { by: `${g.operator.name} <${g.operator.email}>`, human: true } : g.mode === "demo-operator" ? { by: "Demo founder (demo session, password sign-in)", human: true } : { by: "demo (no session)", human: false };
