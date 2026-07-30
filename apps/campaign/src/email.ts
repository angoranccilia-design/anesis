/**
 * Email de campagne (Porte 1) — FONCTION PURE. À partir des chiffres FIGÉS de l'évaluation (Anesis
 * Revenue Leak Index + perte mensuelle estimée en £), produit objet + corps (texte et HTML) personnalisés.
 *
 * Rédaction : registre britannique sobre (underwriting), en-GB, £. Principes de copywriting cold-outreach
 * appliqués — bref, orienté « vous », une seule demande, sujet court et spécifique. On DÉCRIT les chiffres,
 * jamais on ne les recalcule ; aucun chiffre inventé (données insuffisantes → aucun montant). C'est une
 * offre de diagnostic GRATUIT, jamais un mandat ni un paiement. L'envoi réel (sendCampaignEmail) passe par
 * le mailer @anesis/auth (Resend + fallback no-op) et n'est jamais déclenché à l'import.
 */
import { BRAND } from "@anesis/core";
import type { Mailer } from "@anesis/auth";

export interface CampaignEmailInput {
  readonly propertyName: string;
  readonly leakIndex: number; // 0..100 (figé)
  readonly monthlyLossPence: number; // perte mensuelle estimée (figée)
  readonly decisionCode: string; // ex. "QUALIFIED", "INSUFFICIENT_PUBLIC_DATA"
  readonly recipientName?: string;
  readonly logoUrl?: string;
}

export interface CampaignEmail {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

const pounds = (pence: number): string => `£${Math.round(pence / 100).toLocaleString("en-GB")}`;
const hasReliableFigure = (i: CampaignEmailInput): boolean =>
  i.decisionCode !== "INSUFFICIENT_PUBLIC_DATA" && i.monthlyLossPence > 0;

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Enveloppe HTML sobre avec le logo transparent en en-tête. */
function toHtml(paragraphs: string[], logoUrl: string): string {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p)}</p>`)
    .join("\n");
  return [
    `<div style="font-family:Georgia,'Times New Roman',serif;color:#2e3a22;max-width:560px;margin:0 auto;padding:8px 4px;">`,
    `<img src="${logoUrl}" alt="${BRAND.name}" width="140" height="140" style="display:block;margin:0 auto 12px;height:auto;" />`,
    body,
    `<p style="margin:20px 0 0;color:#6a6a60;font-size:13px;">${escapeHtml(BRAND.tagline)}</p>`,
    `</div>`,
  ].join("\n");
}

export function generateCampaignEmail(input: CampaignEmailInput): CampaignEmail {
  const greeting = input.recipientName ? `Dear ${input.recipientName},` : "Dear owner,";
  const figure = hasReliableFigure(input);
  const logoUrl = input.logoUrl ?? BRAND.logoUrl;

  const subject = figure
    ? `${pounds(input.monthlyLossPence)}/month is leaving ${input.propertyName}'s direct bookings`
    : `A free look at ${input.propertyName}'s direct-booking leaks`;

  // Corps resserré, orienté « vous », une seule demande.
  const paragraphs = figure
    ? [
        greeting,
        `About ${pounds(input.monthlyLossPence)} a month is quietly leaving ${input.propertyName}'s direct bookings — most of it, in all likelihood, money you already pay a platform to hand back to you.`,
        `On our Anesis Revenue Leak Index, ${input.propertyName} scores ${input.leakIndex}/100. We read that from public data; the exact figure we would measure from yours, at no cost.`,
        `If there isn't enough to recover to be worth either of our time, we will tell you plainly and stop there.`,
        `Would you like your own figure? A one-line reply and it is yours.`,
      ]
    : [
        greeting,
        `There isn't enough public information to put an honest figure on ${input.propertyName} yet — so we won't invent one.`,
        `What we can do, at no cost, is measure where your direct bookings leak from your own data, on our Anesis Revenue Leak Index, and show you the number in pounds.`,
        `Would you like us to? A one-line reply is all it takes.`,
      ];

  const signOff = [`Kind regards,`, BRAND.name, BRAND.tagline];
  const optOut = `If you would rather not hear from us again, a one-line reply is enough and we will remove you.`;

  const text = [...paragraphs, ``, ...signOff, ``, optOut].join("\n");
  const html = toHtml([...paragraphs, ...signOff, optOut], logoUrl);

  return { subject, text, html };
}

/** Adresse d'expédition de la prospection froide (distincte de enquiries@ pour la délivrabilité). */
export const CAMPAIGN_FROM = `${BRAND.name} <hello@anesisacquisition.com>`;

/** Envoi via le mailer partagé (Resend si configuré, sinon no-op). N'exécute rien à l'import. */
export async function sendCampaignEmail(
  mailer: Mailer,
  to: string,
  email: CampaignEmail,
  opts?: { replyTo?: string; from?: string },
): Promise<void> {
  await mailer.send(to, email.subject, email.text, {
    replyTo: opts?.replyTo,
    html: email.html,
    from: opts?.from ?? CAMPAIGN_FROM,
  });
}
