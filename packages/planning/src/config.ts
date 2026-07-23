/**
 * Politique de dérivation — DÉTERMINISTE et versionnée (aucun LLM). Elle fige, par pilier de fuite :
 *  - l'agent propriétaire (routage exécution),
 *  - la part de perte que la firme s'engage à récupérer (`recoverableFraction`, prudente),
 *  - les gabarits de libellés en-GB (rootCause / titre d'objectif / intention de tâche).
 * Rien de tout ceci n'est décidé « à la main » à l'exécution : le plan sort d'un chiffre.
 */
import type { AgentId } from "@anesis/core";

/** Les 4 piliers de fuite produits par le moteur d'évaluation (subScores). */
export type Pillar = "speed" | "reviews" | "ota" | "retargeting";

export const PILLARS: readonly Pillar[] = ["speed", "reviews", "ota", "retargeting"];

export interface PillarPolicy {
  readonly agentId: AgentId; // agent propriétaire de l'exécution
  readonly recoverableFraction: number; // 0..1 — part de la perte annuelle réellement engagée
  readonly rootCause: string; // en-GB
  readonly objectiveTitle: string; // en-GB
  readonly taskIntent: string; // en-GB
}

export interface PlanningConfig {
  /** Poids du leakIndex par pilier — MIROIR EXACT du scoring (score.ts). Sert à répartir la perte £. */
  readonly leakWeights: Record<Pillar, number>;
  /** Seuil de matérialité : en dessous, un pilier ne crée ni poste de perte, ni objectif, ni tâche. */
  readonly materialityAnnualPence: number;
  readonly pillars: Record<Pillar, PillarPolicy>;
}

export const DEFAULT_PLANNING_CONFIG: PlanningConfig = {
  // Identiques aux poids de score.ts : leakIndex = 0.25*speed + 0.25*reviews + 0.30*ota + 0.20*retargeting.
  leakWeights: { speed: 0.25, reviews: 0.25, ota: 0.3, retargeting: 0.2 },
  materialityAnnualPence: 200_000, // £2,000/an
  pillars: {
    speed: {
      agentId: "conversion",
      recoverableFraction: 0.5,
      rootCause: "Slow website response depresses direct-booking conversion",
      objectiveTitle: "Recover revenue lost to slow site response",
      taskIntent: "Improve site response time & direct-booking path",
    },
    reviews: {
      agentId: "reputation",
      recoverableFraction: 0.4, // plus prudent : la réputation bouge lentement
      rootCause: "Thin review volume and rating suppress conversion",
      objectiveTitle: "Recover revenue lost to weak online reputation",
      taskIntent: "Lift review volume & rating",
    },
    ota: {
      agentId: "rate-distribution",
      recoverableFraction: 0.6,
      rootCause: "Over-reliance on OTAs erodes margin and rate parity",
      objectiveTitle: "Recover margin lost to OTA over-dependence",
      taskIntent: "Rebalance channel mix & protect rate parity",
    },
    retargeting: {
      agentId: "media-buyer",
      recoverableFraction: 0.6,
      rootCause: "Absent retargeting lets warm demand leak away",
      objectiveTitle: "Recover demand lost to absent retargeting",
      taskIntent: "Deploy retargeting to recapture lost demand",
    },
  },
};
