/**
 * Politique d'autonomie — vocabulaire et sémantique des niveaux T0–T5.
 * Le niveau est une propriété de l'ACTION, pas de l'agent. Le moteur d'exécution
 * (packages/policy) s'appuie sur ces règles ; le domaine n'en fournit que la sémantique pure.
 */

export type AutonomyTier = "T0" | "T1" | "T2" | "T3" | "T4" | "T5";

export const AUTONOMY_TIERS: readonly AutonomyTier[] = ["T0", "T1", "T2", "T3", "T4", "T5"];

export const TIER_RANK: Record<AutonomyTier, number> = {
  T0: 0,
  T1: 1,
  T2: 2,
  T3: 3,
  T4: 4,
  T5: 5,
};

export type AutonomyRegime =
  | "immediate" // exécution immédiate
  | "immediate_post_review" // exécution immédiate, revue a posteriori
  | "retention_window" // fenêtre de retenue + notification, auto si personne n'intervient
  | "blocking_approval"; // approbation humaine bloquante

export interface TierPolicy {
  readonly tier: AutonomyTier;
  /** L'action a-t-elle un impact hors du système ? */
  readonly external: boolean;
  /** L'action doit-elle documenter une compensation/annulation ? (T2 et au-dessus) */
  readonly reversibleRequired: boolean;
  readonly regime: AutonomyRegime;
}

export const TIER_POLICY: Record<AutonomyTier, TierPolicy> = {
  T0: { tier: "T0", external: false, reversibleRequired: false, regime: "immediate" },
  T1: { tier: "T1", external: true, reversibleRequired: false, regime: "immediate_post_review" },
  T2: { tier: "T2", external: true, reversibleRequired: true, regime: "retention_window" },
  T3: { tier: "T3", external: true, reversibleRequired: true, regime: "blocking_approval" },
  T4: { tier: "T4", external: true, reversibleRequired: true, regime: "blocking_approval" },
  T5: { tier: "T5", external: true, reversibleRequired: true, regime: "blocking_approval" },
};

/** Fenêtre de retenue T2 : 2 heures. */
export const RETENTION_WINDOW_MS = 2 * 60 * 60 * 1000;

export const requiresBlockingApproval = (tier: AutonomyTier): boolean =>
  TIER_POLICY[tier].regime === "blocking_approval";

export const requiresRetentionWindow = (tier: AutonomyTier): boolean =>
  TIER_POLICY[tier].regime === "retention_window";

export const requiresReversibility = (tier: AutonomyTier): boolean =>
  TIER_POLICY[tier].reversibleRequired;

export const isExternalAction = (tier: AutonomyTier): boolean => TIER_POLICY[tier].external;
