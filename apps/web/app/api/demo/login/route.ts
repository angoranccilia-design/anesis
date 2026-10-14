import { NextResponse } from "next/server";
import { demoMode, demoPasswordSet, demoPasswordMatches, demoCookieValue, DEMO_COOKIE } from "@/lib/demo";
export const dynamic = "force-dynamic";
/** POST /api/demo/login {password} — demo mode only: sets the demo session cookie. No account, no e-mail: a password shared with the person testing the demo. */
export async function POST(req: Request) {
  if (!demoMode() || !demoPasswordSet()) return NextResponse.json({ error: "demo sign-in is not enabled" }, { status: 404 });
  const form = await req.formData().catch(() => null); const password = String(form?.get("password") ?? "");
  if (!demoPasswordMatches(password)) return NextResponse.redirect(new URL("/console/login?error=1", req.url), { status: 303 });
  const res = NextResponse.redirect(new URL("/console", req.url), { status: 303 });
  res.cookies.set(DEMO_COOKIE, demoCookieValue(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  return res;
}
export async function DELETE(req: Request) { const res = NextResponse.redirect(new URL("/console/login", req.url), { status: 303 }); res.cookies.delete(DEMO_COOKIE); return res; }
