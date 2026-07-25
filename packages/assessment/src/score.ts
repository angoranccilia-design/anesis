/**
 * PHASE 2 — Score. Fonction PURE et DÉTERMINISTE : mêmes données brutes → toujours le même leakIndex,
 * la même perte mensuelle (Money) et la même décision (+ code de motif).
 *
 * ⛔ INTERDICTION ABSOLUE d'importer un client LLM dans ce fichier — c'est le défaut EN/FR d'origine.
 * Le montant perdu se calcule ICI, jamais dans la génération de texte. (Gardé par un test structurel.)
 */
import { gbp, mulMoney, type Money } from "@anesis/core";
import { CONFIDENCE_RANK, type Estimate, type PublicSignals } from "./signals.js";
import { DEFAULT_CONFIG, type AssessmentConfig } from "./config.js";

export type Decision = "qualified" | "declined" | "needs_review";

export type DecisionCode =
  | "QUALIFIED"
  | "TOO_SMALL"
  | "LOW_ADR"
  | "LOW_OTA_DEPENDENCE"
  | "HAS_INHOUSE_MARKETING"
  | "INSUFFICIENT_RECOVERABLE_LOSS"
  | "INSUFFICIENT_PUBLIC_DATA";

export interface AssessmentIcp {
  readonly keys: Estimate<number>;
  readonly adrPence: Estimate<number>;
  readonly otaSharePct: Estimate<number>;
  readonly hasInHouseMarketing: Estimate<boolean>;
}

export interface SubScores {
  readonly speed: number;
  readonly reviews: number;
  readonly ota: number;
  readonly retargeting: number;
  /** Pilier 5 — réseaux sociaux. `null` = donnée non collectée (exclu du calcul, pas « fuite max »). */
  readonly social: number | null;
}

export interface Assessment {
  readonly leakIndex: number; // 0..100
  readonly monthlyLoss: Money;
  readonly decision: Decision;
  readonly decisionCode: DecisionCode;
  readonly icp: AssessmentIcp;
  readonly subScores: SubScores;
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

function scoreReviews(signals: PublicSignals): number {
  if (signals.reviewCount == null && signals.reviewRating == null) return 0;
  const count = signals.reviewCount ?? 0;
  const rating = signals.reviewRating ?? 3;
  const volumeLeak = clamp((150 - count) / 1.5, 0, 100); // peu d'avis = fuite de visibilité
  const ratingLeak = clamp((4.6 - rating) * 40, 0, 100);
  return Math.round(0.6 * volumeLeak + 0.4 * ratingLeak);
}

/**
 * Pilier 5 — réseaux sociaux comme canal d'acquisition GRATUIT. Même logique que retargeting : son
 * absence/faiblesse = fuite (trafic gratuit jamais capté). Ne regarde QUE la présence sociale
 * (abonnés, fréquence, engagement, vidéo) — jamais la vitesse du site : c'est le pilier speed qui capte
 * un site lent, pas celui-ci (pas de double-comptage). N'est appelé QUE si des données sociales existent.
 */
function scoreSocial(signals: PublicSignals, config: AssessmentConfig): number {
  const followers = (signals.instagramFollowers.value ?? 0) + (signals.facebookFollowers.value ?? 0);
  const freq = signals.postingFrequencyPerMonth.value ?? 0;
  const eng = signals.avgEngagementRate.value ?? 0;
  const hasVideo = signals.hasVideoContent.value ?? false;

  const followerLeak = clamp(((config.socialGoodFollowers - followers) / config.socialGoodFollowers) * 100, 0, 100);
  const freqLeak = clamp(((config.socialGoodPostingPerMonth - freq) / config.socialGoodPostingPerMonth) * 100, 0, 100);
  const engLeak = clamp(((config.socialGoodEngagementPct - eng) / config.socialGoodEngagementPct) * 100, 0, 100);
  const videoPenalty = hasVideo ? 0 : 10; // léger malus si aucune vidéo/reel

  return Math.round(clamp(0.4 * followerLeak + 0.3 * freqLeak + 0.3 * engLeak + videoPenalty, 0, 100));
}

/** Des données sociales ont-elles été collectées ? Sinon → pilier exclu (pas de « fuite max » par défaut). */
function hasSocialData(signals: PublicSignals): boolean {
  return (
    signals.instagramFollowers.value != null ||
    signals.facebookFollowers.value != null ||
    signals.postingFrequencyPerMonth.value != null ||
    signals.avgEngagementRate.value != null
  );
}

function estimateMonthlyLoss(signals: PublicSignals, leakIndex: number, config: AssessmentConfig): Money {
  const keys = signals.keys.value;
  const adr = signals.adrPence.value;
  if (keys == null || adr == null) return gbp(0);
  const roomNightsPerMonth = keys * 30 * config.assumedOccupancy;
  const potential = gbp(Math.round(roomNightsPerMonth * adr));
  return mulMoney(potential, (leakIndex / 100) * config.captureFraction);
}

function decide(
  icp: AssessmentIcp,
  monthlyLoss: Money,
  config: AssessmentConfig,
): { decision: Decision; decisionCode: DecisionCode } {
  const min = CONFIDENCE_RANK[config.minConfidenceToDecide];
  const decidable =
    CONFIDENCE_RANK[icp.keys.confidence] >= min &&
    CONFIDENCE_RANK[icp.adrPence.confidence] >= min &&
    CONFIDENCE_RANK[icp.otaSharePct.confidence] >= min;

  if (!decidable || icp.keys.value == null || icp.adrPence.value == null || icp.otaSharePct.value == null) {
    return { decision: "needs_review", decisionCode: "INSUFFICIENT_PUBLIC_DATA" };
  }
  if (icp.keys.value < config.minKeys) return { decision: "declined", decisionCode: "TOO_SMALL" };
  if (icp.adrPence.value < config.minAdrPence) return { decision: "declined", decisionCode: "LOW_ADR" };
  if (icp.otaSharePct.value < config.minOtaSharePct) return { decision: "declined", decisionCode: "LOW_OTA_DEPENDENCE" };
  if (icp.hasInHouseMarketing.value === true && CONFIDENCE_RANK[icp.hasInHouseMarketing.confidence] >= min) {
    return { decision: "declined", decisionCode: "HAS_INHOUSE_MARKETING" };
  }
  if (monthlyLoss.pence < config.minRecoverableMonthlyLossPence) {
    return { decision: "declined", decisionCode: "INSUFFICIENT_RECOVERABLE_LOSS" };
  }
  return { decision: "qualified", decisionCode: "QUALIFIED" };
}

export function score(signals: PublicSignals, config: AssessmentConfig = DEFAULT_CONFIG): Assessment {
  const speed = signals.siteResponseMs == null ? 0 : Math.round(clamp((signals.siteResponseMs - 400) / 16, 0, 100));
  const reviews = scoreReviews(signals);
  const ota = signals.otaSharePct.value == null ? 0 : Math.round(clamp((signals.otaSharePct.value - 20) * 2, 0, 100));
  const retargeting = signals.hasTrackingPixel ? 0 : 100;
  // Pilier 5 — social : calculé UNIQUEMENT si des données sociales existent ; sinon exclu (null).
  const social = hasSocialData(signals) ? scoreSocial(signals, config) : null;
  const subScores: SubScores = { speed, reviews, ota, retargeting, social };

  // Repondération : avec social → 5 piliers (20/20/25/15/20) ; sans → 4 piliers ORIGINAUX (25/25/30/20),
  // ce qui préserve exactement le comportement historique (et les 18 tests) quand le social n'est pas collecté.
  const leakIndex =
    social == null
      ? Math.round(0.25 * speed + 0.25 * reviews + 0.3 * ota + 0.2 * retargeting)
      : Math.round(0.2 * speed + 0.2 * reviews + 0.25 * ota + 0.15 * retargeting + 0.2 * social);

  const hasInHouseMarketing: Estimate<boolean> =
    signals.inHouseMarketingMentions > 0
      ? { value: true, confidence: "high", source: "team_page" }
      : { value: false, confidence: "low", source: "absence" };

  const icp: AssessmentIcp = {
    keys: signals.keys,
    adrPence: signals.adrPence,
    otaSharePct: signals.otaSharePct,
    hasInHouseMarketing,
  };

  const monthlyLoss = estimateMonthlyLoss(signals, leakIndex, config);
  const { decision, decisionCode } = decide(icp, monthlyLoss, config);

  return { leakIndex, monthlyLoss, decision, decisionCode, icp, subScores };
}
