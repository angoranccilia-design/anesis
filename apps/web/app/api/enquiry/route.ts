import { NextResponse } from "next/server";

/**
 * Réception des enquêtes (Diagnostic Porte 1 / Contact).
 * ⚠️ STUB : valide et journalise pour l'instant. À CÂBLER avant lancement — email Resend vers
 * enquiries@… + insertion d'une ligne d'intake en base (le domaine/compte email n'est pas encore réglé).
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const hotel = typeof body.hotel === "string" ? body.hotel.trim() : "";

  if (!name || !email || !hotel || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 422 });
  }

  // TODO(intake) : envoyer via Resend + persister. Pour l'instant, trace serveur (jamais perdu en dev).
  console.info("[enquiry]", { kind: body.kind, name, hotel, email, website: body.website });

  return NextResponse.json({ ok: true });
}
