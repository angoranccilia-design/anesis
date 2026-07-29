/**
 * Termes commerciaux du mandat (Porte 3) — SOURCE DE VÉRITÉ UNIQUE.
 *
 * Règle métier (doc business Partie 4, révisée 2026-07) :
 *   - La **formule** (Croissance / Domination) et la **durée** (6 ou 12 mois) sont
 *     DEUX choix INDÉPENDANTS. Les deux formules sont disponibles sur les deux durées.
 *   - Le **taux d'intéressement suit la DURÉE, jamais la formule** :
 *       6 mois → 15 %   |   12 mois → 10 %.
 *   - Le **nombre de séances photo/vidéo suit aussi la durée** (1 par trimestre) :
 *       6 mois → 2   |   12 mois → 4.
 *   - Seul l'**abonnement mensuel** dépend encore de la formule (Croissance £3 400,
 *     Domination £5 400).
 *
 * Toute génération de contrat (cockpit fondatrice, Thèse d'Acquisition) DOIT passer par
 * `makeCommercialTerms` : impossible d'y construire un taux incohérent avec la durée.
 */
import { gbp, type Money } from "./primitives.js";

/** Formule choisie. Tout ce qui existe dans Croissance existe aussi dans Domination. */
export type MandateFormula = "growth" | "domination";
export const MANDATE_FORMULAS: readonly MandateFormula[] = ["growth", "domination"];

/** Durée d'engagement — choix indépendant de la formule. */
export type MandateTermMonths = 6 | 12;
export const MANDATE_TERM_MONTHS: readonly MandateTermMonths[] = [6, 12];

/** Libellés commerciaux (FR, pour contrat/cockpit). */
export const MANDATE_FORMULA_LABELS: Record<MandateFormula, string> = {
  growth: "Croissance",
  domination: "Domination",
};

/**
 * Taux d'intéressement (fraction, ex. 0.15 = 15 %) déduit de la SEULE durée.
 * Exhaustif : ajouter une durée casse la compilation ici tant qu'on n'a pas décidé son taux.
 */
export function incentiveRateForTerm(term: MandateTermMonths): number {
  switch (term) {
    case 6:
      return 0.15;
    case 12:
      return 0.1;
  }
}

/** Séances photo/vidéo incluses : 1 par trimestre de mandat, déduites de la durée. */
export function photoSessionsForTerm(term: MandateTermMonths): number {
  return term / 3;
}

/** Abonnement mensuel (en pence) — dépend de la formule, inchangé par la révision. */
export function monthlySubscriptionPence(formula: MandateFormula): Money {
  switch (formula) {
    case "growth":
      return gbp(340_000); // £3 400
    case "domination":
      return gbp(540_000); // £5 400
  }
}

/** Termes commerciaux résolus d'un mandat. `incentiveRate` est TOUJOURS déduit de `termMonths`. */
export interface CommercialTerms {
  readonly formula: MandateFormula;
  readonly termMonths: MandateTermMonths;
  readonly incentiveRate: number; // fraction, déduite de termMonths
  readonly photoSessions: number; // déduites de termMonths
  readonly monthlySubscription: Money; // déduit de formula
}

/**
 * Construit les termes commerciaux à partir des deux choix indépendants.
 * Point de passage OBLIGÉ : le taux et les séances ne peuvent pas diverger de la durée.
 */
export function makeCommercialTerms(
  formula: MandateFormula,
  termMonths: MandateTermMonths,
): CommercialTerms {
  return {
    formula,
    termMonths,
    incentiveRate: incentiveRateForTerm(termMonths),
    photoSessions: photoSessionsForTerm(termMonths),
    monthlySubscription: monthlySubscriptionPence(formula),
  };
}
