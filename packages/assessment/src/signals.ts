/**
 * Signaux publics et estimations ICP.
 * Honnêteté sur la donnée publique : le nombre de clés, l'ADR et la part OTA ne sont pas toujours
 * extractibles de façon fiable. Chaque estimation porte donc un niveau de CONFIANCE ; si la confiance
 * est trop basse pour trancher, le moteur route vers une revue manuelle plutôt que de deviner.
 */

export type Confidence = "high" | "medium" | "low" | "none";

export const CONFIDENCE_RANK: Record<Confidence, number> = { none: 0, low: 1, medium: 2, high: 3 };

export interface Estimate<T> {
  readonly value: T | null;
  readonly confidence: Confidence;
  readonly source: string; // d'où vient l'estimation (transparence)
}

/** Observations brutes récupérées sur le web public (déjà fetchées ; la phase Collecte les normalise). */
export interface RawObservations {
  readonly siteResponseMs?: number;
  readonly reviewCount?: number;
  readonly reviewRating?: number; // 0..5
  readonly otaBadges?: string[]; // ex: ["booking.com", "expedia"]
  readonly hasTrackingPixel?: boolean; // retargeting possible ?
  readonly teamPageMarketingMentions?: number; // mentions d'un rôle marketing dans l'équipe affichée
  readonly structuredRoomCount?: number; // clés trouvées en données structurées (fiable)
  readonly listedNightlyRatePence?: number; // tarif affiché (fiable si présent)
  readonly otaSharePctHint?: number; // estimation part OTA si dérivable (souvent absente)
}

/** Signaux normalisés produits par la phase Collecte (aucun calcul de score, aucun LLM). */
export interface PublicSignals {
  readonly siteResponseMs: number | null;
  readonly reviewCount: number | null;
  readonly reviewRating: number | null;
  readonly otaBadgeCount: number;
  readonly hasTrackingPixel: boolean;
  readonly inHouseMarketingMentions: number;
  readonly keys: Estimate<number>;
  readonly adrPence: Estimate<number>;
  readonly otaSharePct: Estimate<number>;
}
