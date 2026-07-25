/**
 * PHASE 1 — Collecte. Normalise les observations publiques brutes en signaux typés, avec un niveau
 * de confiance par estimation ICP. AUCUN calcul de score, AUCUN LLM ici.
 */
import type { Confidence, Estimate, PublicSignals, RawObservations } from "./signals.js";

const est = <T>(value: T | null, confidence: Confidence, source: string): Estimate<T> => ({ value, confidence, source });

export function collect(raw: RawObservations): PublicSignals {
  const keys: Estimate<number> =
    raw.structuredRoomCount != null
      ? est(raw.structuredRoomCount, "high", "structured_data")
      : est<number>(null, "none", "unavailable");

  const adrPence: Estimate<number> =
    raw.listedNightlyRatePence != null
      ? est(raw.listedNightlyRatePence, "high", "listed_rate")
      : est<number>(null, "none", "unavailable");

  // La part OTA est rarement fiable : indice dérivé (medium), sinon proxy par les badges (low), sinon aucune.
  const otaSharePct: Estimate<number> =
    raw.otaSharePctHint != null
      ? est(raw.otaSharePctHint, "medium", "derived_hint")
      : raw.otaBadges && raw.otaBadges.length > 0
        ? est(Math.min(80, 20 + raw.otaBadges.length * 15), "low", "ota_badges_proxy")
        : est<number>(null, "none", "unavailable");

  // Pilier 5 — social : présent = confiance medium/low (scrapé) ; absent = confiance none (non collecté).
  const socialNum = (v: number | undefined, source: string, conf: Confidence): Estimate<number> =>
    v != null ? est(v, conf, source) : est<number>(null, "none", "unavailable");

  return {
    siteResponseMs: raw.siteResponseMs ?? null,
    reviewCount: raw.reviewCount ?? null,
    reviewRating: raw.reviewRating ?? null,
    otaBadgeCount: raw.otaBadges?.length ?? 0,
    hasTrackingPixel: raw.hasTrackingPixel ?? false,
    inHouseMarketingMentions: raw.teamPageMarketingMentions ?? 0,
    keys,
    adrPence,
    otaSharePct,
    instagramFollowers: socialNum(raw.instagramFollowers, "instagram_scrape", "medium"),
    facebookFollowers: socialNum(raw.facebookFollowers, "facebook_scrape", "medium"),
    postingFrequencyPerMonth: socialNum(raw.postingFrequencyPerMonth, "social_scrape", "medium"),
    avgEngagementRate: socialNum(raw.avgEngagementRate, "social_scrape", "low"),
    hasVideoContent:
      raw.hasVideoContent != null ? est(raw.hasVideoContent, "medium", "social_scrape") : est<boolean>(null, "none", "unavailable"),
  };
}
