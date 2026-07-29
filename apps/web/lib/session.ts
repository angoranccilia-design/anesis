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

export async function getSessionId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
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
