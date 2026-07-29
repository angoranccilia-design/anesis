import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mailer";
import { withDbClient } from "@/lib/db";

/**
 * Réception des enquêtes (Diagnostic Porte 1 / Contact).
 *
 * Notifie l'équipe via Resend dès que `RESEND_API_KEY` est configuré. Tant qu'il ne l'est pas
 * (domaine/compte email pas encore réglés), FALLBACK explicite : journalisation serveur — l'enquête
 * n'est jamais perdue, la réponse à l'utilisateur reste `ok`. En-GB dans le corps de l'email.
 *
 * Reste à brancher quand la base sera fournie : persister une ligne d'intake (table dédiée) en plus
 * de la notification. La validation et la notification, elles, sont désormais en place.
 */
const INBOX = process.env.ANESIS_ENQUIRIES_INBOX ?? "enquiries@anesisacquisition.com";

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
  const website = typeof body.website === "string" ? body.website.trim() : "";
  const kind = typeof body.kind === "string" ? body.kind : "enquiry";

  if (!name || !email || !hotel || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 422 });
  }

  // Trace serveur systématique : l'enquête n'est jamais perdue, même si l'email échoue.
  console.info("[enquiry]", { kind, name, hotel, email, website });

  // Persistance dans le registre d'intake si la base est configurée (sinon on s'appuie sur la trace + email).
  await withDbClient(async (client) => {
    const { insertEnquiry } = await import("@anesis/db");
    await insertEnquiry(client, { kind, name, email, hotel, website: website || null });
  });

  const result = await sendEmail({
    to: INBOX,
    replyTo: email,
    subject: `New ${kind} enquiry — ${hotel}`,
    text: [
      `A new enquiry has come in via the ${kind} form.`,
      "",
      `Name:    ${name}`,
      `Email:   ${email}`,
      `Hotel:   ${hotel}`,
      website ? `Website: ${website}` : "Website: (not provided)",
    ].join("\n"),
  });

  // On répond toujours ok à l'utilisateur ; `delivered` indique si la notification est réellement partie.
  return NextResponse.json({ ok: true, delivered: result.delivered });
}
