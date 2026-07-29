/**
 * Envoi d'email côté site — derrière `RESEND_API_KEY`.
 *
 * Configuré (clé présente) : envoi réel via l'API HTTP Resend (fetch natif, aucune dépendance).
 * Non configuré (dev, ou domaine/compte email pas encore réglés) : FALLBACK stub qui journalise et
 * ne lève jamais — une enquête n'est jamais perdue et le build/dev n'est jamais bloqué.
 *
 * Gouvernance : l'envoi réel est une action externe, exécutée uniquement à l'appel explicite.
 */
export interface EmailMessage {
  readonly to: string | string[];
  readonly subject: string;
  readonly text: string;
  readonly replyTo?: string;
}

export type SendResult =
  | { readonly delivered: true; readonly mode: "resend" }
  | { readonly delivered: false; readonly mode: "stub"; readonly reason: string };

const DEFAULT_FROM = "Anesis Acquisition <enquiries@anesisacquisition.com>";

export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ANESIS_FROM_EMAIL ?? DEFAULT_FROM;

  if (!apiKey) {
    console.info("[email:stub] RESEND_API_KEY unset — not sent", { to: msg.to, subject: msg.subject });
    return { delivered: false, mode: "stub", reason: "resend_not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: msg.to, subject: msg.subject, text: msg.text, reply_to: msg.replyTo }),
    });
    if (!res.ok) {
      console.error("[email:resend] send failed", res.status);
      return { delivered: false, mode: "stub", reason: `resend_http_${res.status}` };
    }
    return { delivered: true, mode: "resend" };
  } catch (err) {
    console.error("[email:resend] threw", err);
    return { delivered: false, mode: "stub", reason: "resend_threw" };
  }
}
