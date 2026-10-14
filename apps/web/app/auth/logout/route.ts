import { NextResponse } from "next/server";
import { SESSION_COOKIE, getSessionId } from "@/lib/session";
import { withDbClient } from "@/lib/db";

/** POST /auth/logout — revokes the session server-side, then clears the cookie: a copied cookie no longer resolves. */
export async function POST(request: Request) {
  const sid = await getSessionId();
  if (sid) await withDbClient(async (c) => { const { revokeSession } = await import("@anesis/auth"); return revokeSession(c, sid); });
  const res = NextResponse.redirect(new URL("/login", new URL(request.url).origin), { status: 303 });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
