import { NextResponse } from "next/server";
import { isDbConfigured, withDbClient } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

/**
 * Consommation d'un lien magique : valide le jeton, ouvre une session (cookie httpOnly) et redirige
 * vers le cockpit. Un jeton invalide/expiré/rejoué renvoie proprement vers /login.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const origin = url.origin;

  if (!isDbConfigured()) {
    return NextResponse.redirect(new URL("/login?error=nodb", origin), { status: 303 });
  }

  const outcome = await withDbClient(async (client) => {
    const { consumeMagicLink } = await import("@anesis/auth");
    return consumeMagicLink(client, token);
  });

  if (!outcome || !outcome.ok) {
    return NextResponse.redirect(new URL("/login?error=badlink", origin), { status: 303 });
  }

  const res = NextResponse.redirect(new URL("/cockpit", origin), { status: 303 });
  res.cookies.set(SESSION_COOKIE, outcome.sessionId, sessionCookieOptions(new Date(outcome.sessionExpiresAt)));
  return res;
}
