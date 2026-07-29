import { NextResponse } from "next/server";
import { isDbConfigured, withDbClient } from "@/lib/db";

/**
 * Demande d'un lien magique. Comportement identique que l'email soit connu ou non (anti-énumération).
 * Sans base configurée : renvoie une erreur douce (l'auth n'est pas encore connectée).
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const origin = new URL(request.url).origin;

  if (!email || !email.includes("@")) {
    return NextResponse.redirect(new URL("/login?error=email", origin), { status: 303 });
  }
  if (!isDbConfigured()) {
    return NextResponse.redirect(new URL("/login?error=nodb", origin), { status: 303 });
  }

  await withDbClient(async (client) => {
    const { requestMagicLink, makeMailer } = await import("@anesis/auth");
    await requestMagicLink(client, makeMailer(), { email, baseUrl: origin });
  });

  return NextResponse.redirect(new URL("/login?sent=1", origin), { status: 303 });
}
