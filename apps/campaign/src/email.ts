/**
 * Génération de l'email de campagne (Porte 1) — FONCTION PURE. À partir des chiffres FIGÉS de
 * l'évaluation (Anesis Revenue Leak Index + perte mensuelle estimée en £), produit un objet + un corps
 * personnalisés, en-GB, £. On DÉCRIT les chiffres, on ne les recalcule jamais (cohérent avec le rapport
 * d'évaluation). Aucun chiffre inventé : si les données publiques sont insuffisantes, on n'annonce
 * AUCUN montant et on propose simplement l'évaluation gratuite.
 *
 * Ceci n'engage rien : c'est une offre de diagnostic gratuit, jamais un mandat ni un paiement.
 * L'envoi réel (sendCampaignEmail) passe par le mailer @anesis/auth (Resend + fallback no-op) et
 * n'est jamais déclenché à l'import.
 */
import type { Mailer } from "@anesis/auth";

export interface CampaignEmailInput {
  readonly propertyName: string;
  readonly leakIndex: number; // 0..100 (figé)
  readonly monthlyLossPence: number; // perte mensuelle estimée (figée)
  readonly decisionCode: string; // ex. "QUALIFIED", "INSUFFICIENT_PUBLIC_DATA"
  readonly recipientName?: string; // prénom si connu, sinon salutation neutre
}

export interface CampaignEmail {
  readonly subject: string;
  readonly body: string;
}

const pounds = (pence: number): string => `£${Math.round(pence / 100).toLocaleString("en-GB")}`;

/** Vrai si l'on dispose d'un chiffre fiable à annoncer (données publiques suffisantes). */
const hasReliableFigure = (input: CampaignEmailInput): boolean =>
  input.decisionCode !== "INSUFFICIENT_PUBLIC_DATA" && input.monthlyLossPence > 0;

export function generateCampaignEmail(input: CampaignEmailInput): CampaignEmail {
  const greeting = input.recipientName ? `Dear ${input.recipientName},` : "Dear owner,";
  const figure = hasReliableFigure(input);

  const subject = figure
    ? `${input.propertyName} — about ${pounds(input.monthlyLossPence)}/month may be leaving your direct bookings`
    : `${input.propertyName} — a free look at where your direct bookings leak`;

  const opening = figure
    ? [
        `We ran a quick, public-data review of ${input.propertyName} and put a figure on something most hotels never see: the direct revenue quietly leaving each month.`,
        ``,
        `On our Anesis Revenue Leak Index, ${input.propertyName} scores ${input.leakIndex}/100, which points to roughly ${pounds(
          input.monthlyLossPence,
        )} a month of recoverable direct revenue — money you are likely paying a platform to hand back to you, or losing to a slow reply or a rate that undercuts your own front desk.`,
      ]
    : [
        `We started a quick, public-data review of ${input.propertyName}, but there isn't enough public information to put an honest figure on it yet — so we won't invent one.`,
        ``,
        `What we can do, at no cost, is measure it properly from your own data using our Anesis Revenue Leak Index, and show you in pounds exactly where the direct revenue leaks.`,
      ];

  const body = [
    greeting,
    ``,
    ...opening,
    ``,
    `The assessment is free and there is no obligation. If there isn't enough recoverable revenue to be worth either of our time, we will tell you plainly and stop there.`,
    ``,
    `If you would like your own figure, simply reply to this email and we will take it from there.`,
    ``,
    `Kind regards,`,
    `Anesis Acquisition`,
    `Hospitality acquisition underwriting — United Kingdom`,
    ``,
    `If you would rather not hear from us again, a one-line reply is enough and we will remove you.`,
  ].join("\n");

  return { subject, body };
}

/** Envoi via le mailer partagé (Resend si configuré, sinon no-op qui journalise). N'exécute rien à l'import. */
export async function sendCampaignEmail(
  mailer: Mailer,
  to: string,
  email: CampaignEmail,
  opts?: { replyTo?: string },
): Promise<void> {
  await mailer.send(to, email.subject, email.body, opts);
}
