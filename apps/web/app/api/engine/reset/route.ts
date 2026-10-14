import { NextResponse } from "next/server";
import { resetAll } from "@/lib/engine/store";
import { authoriseIntent } from "@/lib/engine/governance";
import { guardFounder } from "@/lib/guard";
export const dynamic = "force-dynamic";
/** POST /api/engine/reset — destructive: founder session (or explicit demo mode) and `{ confirm: true }` are both required. */
export async function POST(req: Request) {
  const g = await guardFounder(); if (!g.ok) return g.response;
  const body = (await req.json().catch(() => ({}))) as { confirm?: boolean };
  if (body.confirm !== true) return NextResponse.json({ error: "reset requires { confirm: true }" }, { status: 400 });
  const auth = authoriseIntent("reset", null);
  if (auth.outcome.kind !== "allow") return NextResponse.json({ error: "not authorised" }, { status: 403 });
  await resetAll(); return NextResponse.json({ ok: true });
}
