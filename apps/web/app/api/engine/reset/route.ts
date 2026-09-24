import { NextResponse } from "next/server";
import { resetAll } from "@/lib/engine/store";
import { authoriseIntent } from "@/lib/engine/governance";
export const dynamic = "force-dynamic";
export function POST() {
  const auth = authoriseIntent("reset", null);
  if (auth.outcome.kind !== "allow") return NextResponse.json({ error: "not authorised" }, { status: 403 });
  resetAll(); return NextResponse.json({ ok: true });
}
