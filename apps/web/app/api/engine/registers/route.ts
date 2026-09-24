import { NextResponse } from "next/server";
import { registers, updateRegisters } from "@/lib/engine/store";
import { authoriseIntent } from "@/lib/engine/governance";
import { quality, assertNoIdentityData, type EventRecord, type CompetitorObservation, type OperationsSnapshot, type OtaSnapshot, type CameraSource } from "@anesis/engine";
export const dynamic = "force-dynamic";
/** Operator-entered registers: events, competitor observations, operations and OTA snapshots, camera sources, source data-quality declarations. Provenance = OPERATOR. */
export function GET() { return NextResponse.json(registers()); }
export async function POST(req: Request) {
  const auth = authoriseIntent("change_assumptions", null);
  if (auth.outcome.kind !== "allow") return NextResponse.json({ error: "not authorised" }, { status: 403 });
  const b = (await req.json()) as { event?: Omit<EventRecord, "enteredBy" | "source">; competitor?: Omit<CompetitorObservation, "enteredBy" | "source">; operations?: Omit<OperationsSnapshot, "source">; ota?: Omit<OtaSnapshot, "source">; camera?: CameraSource; stale?: { source: string; ageHours: number; completeness?: number } ; clear?: boolean };
  const r = registers();
  if (b.clear) return NextResponse.json(updateRegisters({ events: [], competitors: [], operations: null, ota: null, cameras: [], sourceQuality: {} }));
  if (b.event) updateRegisters({ events: [...r.events, { ...b.event, enteredBy: "operator", source: "operator register" }] });
  if (b.competitor) updateRegisters({ competitors: [...r.competitors, { ...b.competitor, enteredBy: "operator", source: "operator register" }] });
  if (b.operations) updateRegisters({ operations: { ...b.operations, source: "operator register" } });
  if (b.ota) updateRegisters({ ota: { ...b.ota, source: "operator register" } });
  if (b.camera) { assertNoIdentityData(b.camera as unknown as Record<string, unknown>); updateRegisters({ cameras: [...r.cameras, { ...b.camera, configured: Boolean(process.env[b.camera.streamUrlEnv]) }] }); }
  if (b.stale) updateRegisters({ sourceQuality: { ...r.sourceQuality, [b.stale.source]: quality(b.stale.completeness ?? 1, 0.9, b.stale.ageHours, "DAILY", `declared by operator: last export ${Math.round(b.stale.ageHours / 24)} days ago`) } });
  return NextResponse.json(registers());
}
