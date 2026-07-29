/**
 * Gabarits de lettres (Porte 2 / Cycles 2 & 5) — FONCTIONS PURES, en-GB.
 *
 * RÈGLE ABSOLUE (contrainte de résidence) : ces lettres sont rédigées STRICTEMENT au conditionnel/futur.
 * Aucune n'exprime un mandat actif, une facturation, un paiement ou un déplacement déjà réalisés. Un
 * engagement de mandat payant ne prend effet qu'à partir de l'installation officielle d'Anesis au UK, et
 * aucun paiement n'est dû ni effectué avant cette date. Ce sont des GABARITS : les signatures/dates
 * réelles restent des espaces à compléter — rien n'est signé ici.
 */
import { BRAND, type Money } from "@anesis/core";

export interface LetterParty {
  readonly propertyName: string;
  readonly region?: string;
  readonly contactName?: string;
  /** URL du logo transparent pour l'en-tête (rendu markdown/HTML/PDF). Défaut : BRAND.logoUrl. */
  readonly logoUrl?: string;
}

/** En-tête de marque (logo + nom) commun aux lettres. */
const letterhead = (p: LetterParty): string[] => [
  `![${BRAND.name}](${p.logoUrl ?? BRAND.logoUrl})`,
  ``,
  `**${BRAND.name}**`,
  `_${BRAND.tagline}_`,
  ``,
];

export interface LoiInput extends LetterParty {
  /** Date de la lettre (texte libre, ex. « 14 August 2026 »). Laissé en blanc si absent. */
  readonly date?: string;
  readonly leakIndex?: number;
  readonly recoverableAnnual?: Money | null;
}

const pounds = (m: Money): string => `£${Math.round(m.pence / 100).toLocaleString("en-GB")}`;
const greeting = (p: LetterParty): string => (p.contactName ? `Dear ${p.contactName},` : "To whom it may concern,");
const header = (p: LetterParty, date?: string): string[] => [
  `${p.propertyName}${p.region ? `, ${p.region}` : ""}`,
  `United Kingdom`,
  date ? date : `Date: ____________________`,
  ``,
];

/**
 * Lettre d'intention (Cycle 2) — NON contraignante. L'établissement marque son intérêt à recevoir une
 * Thèse d'Acquisition (gratuite) et à en examiner les termes. Aucune obligation, aucun paiement.
 */
export function loiLetter(input: LoiInput): string {
  const figure =
    input.leakIndex != null
      ? `Anesis's initial, public-data review places our Anesis Revenue Leak Index at ${input.leakIndex}/100` +
        (input.recoverableAnnual ? `, indicating in the region of ${pounds(input.recoverableAnnual)} a year of potentially recoverable direct revenue` : "") +
        `. We understand these figures are indicative and would be measured properly during the assessment.`
      : `We understand Anesis would measure our recoverable direct revenue from our own data during the assessment.`;

  return [
    ...letterhead(input),
    `LETTER OF INTENT`,
    ``,
    ...header(input),
    greeting(input),
    ``,
    `We write to express our interest in Anesis Acquisition's revenue-recovery assessment for ${input.propertyName}.`,
    ``,
    figure,
    ``,
    `By this letter we indicate our intention to proceed to a (free) Acquisition Thesis and to consider, in good faith, the terms Anesis may propose. This letter is not binding, commits us to no payment, and creates no obligation on either party. Any paid engagement would be the subject of a separate agreement, entered into only if and when we choose to proceed.`,
    ``,
    `Yours faithfully,`,
    ``,
    `Signed: ____________________    For and on behalf of ${input.propertyName}`,
    `Name:   ____________________`,
    `Date:   ____________________`,
  ].join("\n");
}

export interface ConditionalEngagementInput extends LetterParty {
  readonly date?: string;
  readonly formula?: "growth" | "domination";
  readonly termMonths?: number;
}

const FORMULA_LABEL: Record<"growth" | "domination", string> = { growth: "Growth", domination: "Domination" };

/**
 * Lettre d'engagement CONDITIONNEL (Cycle 5) — l'établissement confirme par écrit son intention de
 * signer un mandat payant, prenant effet UNIQUEMENT à partir de l'installation officielle d'Anesis au
 * UK. Aucun paiement n'est dû ni effectué, et aucun déplacement n'a lieu, avant cette date.
 */
export function conditionalEngagementLetter(input: ConditionalEngagementInput): string {
  const terms =
    input.formula && input.termMonths
      ? `Our present intention is the ${FORMULA_LABEL[input.formula]} formula over a term of ${input.termMonths} months, on the terms set out in our Acquisition Thesis. `
      : `The specific formula and term would be as set out in our Acquisition Thesis. `;

  return [
    ...letterhead(input),
    `LETTER OF CONDITIONAL ENGAGEMENT`,
    ``,
    ...header(input, input.date),
    greeting(input),
    ``,
    `Following Anesis Acquisition's assessment and Acquisition Thesis for ${input.propertyName}, we confirm in writing our intention to enter into a paid recovery mandate with Anesis.`,
    ``,
    `This intention is expressly conditional. Any such mandate would take effect only from the date of Anesis's official establishment in the United Kingdom. ${terms}No fee is payable, and none will be paid, and no engagement is in force, before that date. Nothing in this letter constitutes a mandate presently in effect or a payment obligation arising now.`,
    ``,
    `We provide this confirmation to indicate the seriousness of our intent, on the understanding that either party may still decline before any binding agreement is signed.`,
    ``,
    `Yours faithfully,`,
    ``,
    `Signed: ____________________    For and on behalf of ${input.propertyName}`,
    `Name:   ____________________`,
    `Date:   ____________________`,
  ].join("\n");
}
