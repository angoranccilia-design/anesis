import { NextResponse } from "next/server";
import { guardInterventions } from "@/lib/interventions";
import { actorOf } from "@/lib/guard";
import { getRuntime } from "@/lib/engine/runtimeDb";
import type { ExecutionState } from "@anesis/execution";
export const dynamic = "force-dynamic";

interface Body { to: ExecutionState; note?: string; approvedAmountGbp?: number; proofs?: { kind: string; reference: string; note?: string }[]; actualSpendGbp?: number | null; windowWeeks?: number }
const HUMAN_ONLY: ExecutionState[] = ["AUTHORISED", "IN_EXECUTION", "EXECUTED", "MEASURED", "CLOSED", "REJECTED"];

/**
 * POST /api/interventions/[id]/transition — the only write path on a contract from the console.
 * The actor is the session operator (name and email), never a name from the request body; in demo mode there is no human,
 * so every transition that commits the property (authorise, execute, measure, close, reject) is refused.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardInterventions(); if (!g.ok) return g.response;
  const { id } = await params; const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.to) return NextResponse.json({ error: "to is required" }, { status: 400 });
  const actor = { ...actorOf(g), at: new Date().toISOString() };
  if (!actor.human && HUMAN_ONLY.includes(body.to)) return NextResponse.json({ error: `${body.to} requires an authenticated operator session; demo mode has no human` }, { status: 403 });
  const { rt, db } = await getRuntime();
  const c = await rt.loadIntervention(db, id); if (!c || c.propertyId !== g.propertyId) return NextResponse.json({ error: "no such intervention for this property" }, { status: 404 });
  try {
    const next = body.to === "MEASURED"
      ? await rt.measureIntervention(db, id, actor, body.windowWeeks)
      : await rt.transitionIntervention(db, id, { to: body.to, actor, note: body.note, approvedAmountGbp: body.approvedAmountGbp, proofs: (body.proofs ?? []).map((p) => ({ kind: p.kind as "other", reference: String(p.reference ?? ""), note: p.note ?? "" })), actualSpendGbp: body.actualSpendGbp });
    return NextResponse.json({ ok: true, state: next.state, version: next.version, budgetStatus: next.budgetStatus, approvedCost: next.approvedCost, execution: next.execution });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 422 }); }
}
