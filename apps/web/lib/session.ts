import "server-only";
import { cookies } from "next/headers";
import type { Operator } from "@anesis/core";
import { withDbClient } from "./db";

export const SESSION_COOKIE = "anesis_session";

export function sessionCookieOptions(expires?: Date) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(expires ? { expires } : {}),
  };
}

export async function getDemoCookie(): Promise<string | null> { const jar = await cookies(); return jar.get("anesis_demo")?.value ?? null; }

export async function getSessionId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

/** May this operator read this mandate? Founders read all; operators need a row in operator_mandates. Demo (no DB): true. */
export async function operatorMayAccessMandate(op: Operator | null, mandateId: string): Promise<boolean> {
  if (!op) return !process.env.DATABASE_URL;
  if (op.role === "founder") return true;
  const r = await withDbClient((c) => c.query("select 1 from operator_mandates where operator_id = $1 and mandate_id = $2", [op.id, mandateId]));
  return Boolean(r && r.rows.length);
}

/** L'opérateur connecté, ou null. Renvoie null si la base n'est pas configurée (mode démo). */
export async function currentOperator(): Promise<Operator | null> {
  const sid = await getSessionId();
  if (!sid) return null;
  const op = await withDbClient(async (c) => {
    const { resolveSession } = await import("@anesis/auth");
    return resolveSession(c, sid);
  });
  return op ?? null;
}
