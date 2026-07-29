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

  if (!apiKey) {
    return {
      mode: "noop",
      async sendMagicLink(to, link) {
        log(`[auth:noop] magic link for ${to} (RESEND_API_KEY unset): ${link}`);
      },
    };
  }

  return {
    mode: "resend",
    async sendMagicLink(to, link) {
      const res = await doFetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          subject: "Your Anesis sign-in link",
          text:
            `Sign in to Anesis Acquisition:\n\n${link}\n\n` +
            `This link expires in 15 minutes. If you did not request it, please ignore this email.`,
        }),
      });
      if (!res.ok) {
        throw new Error(`Resend send failed: ${res.status} ${await res.text().catch(() => "")}`);
      }
    },
  };
}
