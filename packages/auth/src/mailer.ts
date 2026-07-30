/**
 * Envoi du lien magique — adaptateur derrière `RESEND_API_KEY`.
 *
 * En DEV (clé absente) : mailer `noop` qui LOGGE le lien et ne lève JAMAIS d'erreur — le dev local
 * n'est jamais bloqué par l'absence d'identifiants.
 * En PROD (clé présente) : envoi réel via l'API HTTP Resend (fetch natif, aucune dépendance ajoutée).
 *
 * Gouvernance : l'envoi réel d'un email est une action externe. Ce module ne l'exécute que lorsque le
 * code appelant invoque explicitement `sendMagicLink` — jamais à l'import. Copie en-GB.
 */
export type MailerMode = "resend" | "noop";

export interface Mailer {
  readonly mode: MailerMode;
  /** Envoi générique (réutilisé par la campagne, l'intake, etc.). Copie fournie par l'appelant. */
  send(to: string | string[], subject: string, text: string, opts?: { replyTo?: string; html?: string; from?: string }): Promise<void>;
  /** Envoi spécialisé du lien magique (construit son propre sujet/corps). */
  sendMagicLink(to: string, link: string): Promise<void>;
}

export interface MailerConfig {
  readonly apiKey?: string | undefined;
  readonly from?: string | undefined;
  readonly log?: (message: string) => void;
  /** Injection de fetch pour les tests ; défaut = fetch global. */
  readonly fetchImpl?: typeof fetch;
}

const DEFAULT_FROM = "Anesis Acquisition <enquiries@anesisacquisition.com>";

export function makeMailer(cfg: MailerConfig = {}): Mailer {
  const apiKey = cfg.apiKey ?? process.env.RESEND_API_KEY;
  const from = cfg.from ?? process.env.ANESIS_FROM_EMAIL ?? DEFAULT_FROM;
  const log = cfg.log ?? ((m: string) => console.info(m));
  const doFetch = cfg.fetchImpl ?? fetch;

  const MAGIC = (link: string): { subject: string; text: string } => ({
    subject: "Your Anesis sign-in link",
    text: `Sign in to Anesis Acquisition:\n\n${link}\n\nThis link expires in 15 minutes. If you did not request it, please ignore this email.`,
  });

  if (!apiKey) {
    return {
      mode: "noop",
      async send(to, subject, _text) {
        log(`[mail:noop] to ${String(to)} — "${subject}" (RESEND_API_KEY unset)`);
      },
      async sendMagicLink(to, link) {
        log(`[auth:noop] magic link for ${to} (RESEND_API_KEY unset): ${link}`);
      },
    };
  }

  const deliver = async (
    to: string | string[],
    subject: string,
    text: string,
    opts?: { replyTo?: string; html?: string; from?: string },
  ): Promise<void> => {
    const res = await doFetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: opts?.from ?? from,
        to,
        subject,
        text,
        ...(opts?.html ? { html: opts.html } : {}),
        ...(opts?.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend send failed: ${res.status} ${await res.text().catch(() => "")}`);
    }
  };

  return {
    mode: "resend",
    send: (to, subject, text, opts) => deliver(to, subject, text, opts),
    sendMagicLink: (to, link) => {
      const m = MAGIC(link);
      return deliver(to, m.subject, m.text);
    },
  };
}
