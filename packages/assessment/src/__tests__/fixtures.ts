import type { RawObservations } from "../signals.js";

/** Établissement clairement dans l'ICP : gros levier, forte dépendance OTA, pas de pixel. */
export const QUALIFIED_RAW: RawObservations = {
  siteResponseMs: 1600,
  reviewCount: 20,
  reviewRating: 3.9,
  otaBadges: ["booking.com", "expedia"],
  hasTrackingPixel: false,
  teamPageMarketingMentions: 0,
  structuredRoomCount: 30,
  listedNightlyRatePence: 20_000,
  otaSharePctHint: 60,
};

export const TOO_SMALL_RAW: RawObservations = { ...QUALIFIED_RAW, structuredRoomCount: 8 };
export const LOW_ADR_RAW: RawObservations = { ...QUALIFIED_RAW, listedNightlyRatePence: 9_000 };
export const LOW_OTA_RAW: RawObservations = { ...QUALIFIED_RAW, otaSharePctHint: 20 };
export const INHOUSE_RAW: RawObservations = { ...QUALIFIED_RAW, teamPageMarketingMentions: 2 };

/** Dans l'ICP mais fuite/levier trop faibles → perte récupérable insuffisante. */
export const LOW_LOSS_RAW: RawObservations = {
  siteResponseMs: 300,
  reviewCount: 200,
  reviewRating: 4.8,
  hasTrackingPixel: true,
  teamPageMarketingMentions: 0,
  structuredRoomCount: 12,
  listedNightlyRatePence: 14_000,
  otaSharePctHint: 40,
};

/**
 * Dans l'ICP, mais perte récupérable ~£3.9k/mois : au-dessus de l'ANCIEN seuil (£2k) et SOUS le
 * nouveau (£6k). Sert à verrouiller que le seuil doit dépasser l'abonnement Croissance (£3.4k).
 */
export const BELOW_SUBSCRIPTION_RAW: RawObservations = {
  siteResponseMs: 1300,
  reviewCount: 200,
  reviewRating: 4.8,
  hasTrackingPixel: true,
  teamPageMarketingMentions: 0,
  structuredRoomCount: 12,
  listedNightlyRatePence: 14_000,
  otaSharePctHint: 40,
};

/** Données publiques insuffisantes (ni clés ni ADR fiables) → revue manuelle. */
export const INSUFFICIENT_RAW: RawObservations = {
  siteResponseMs: 1200,
  reviewCount: 40,
  reviewRating: 4.1,
  otaBadges: ["booking.com"],
  hasTrackingPixel: false,
};
