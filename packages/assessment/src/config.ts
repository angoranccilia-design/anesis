/** Seuils ICP et hypothèses d'estimation. Déterministes et versionnés. */
export interface AssessmentConfig {
  readonly minKeys: number;
  readonly minAdrPence: number;
  readonly minOtaSharePct: number;
  readonly minRecoverableMonthlyLossPence: number;
  /** Confiance minimale requise sur un champ ICP gating pour oser trancher (sinon revue manuelle). */
  readonly minConfidenceToDecide: "medium" | "high";
  // Hypothèses d'estimation de la perte (déterministes).
  readonly assumedOccupancy: number; // 0..1
  readonly captureFraction: number; // part de la fuite réellement récupérable
  // Pilier 5 — réseaux sociaux : seuils d'une « bonne » présence (plat pour cette v1, non pondéré taille).
  readonly socialGoodFollowers: number;
  readonly socialGoodPostingPerMonth: number;
  readonly socialGoodEngagementPct: number;
}

export const DEFAULT_CONFIG: AssessmentConfig = {
  minKeys: 12,
  minAdrPence: 14_000, // £140
  minOtaSharePct: 35,
  // £6,000/mois. Doit rester NETTEMENT au-dessus de l'abonnement Croissance (£3,400/mois) : la fuite
  // récupérable estimée (déjà à moitié réaliste via captureFraction=0.5) doit laisser une marge nette
  // visible au client avant même le bonus de fin de mandat — sinon on qualifierait un dossier qui ne
  // couvre pas ce qu'il nous paie (le même défaut arithmétique que sur la grille tarifaire).
  minRecoverableMonthlyLossPence: 600_000,
  minConfidenceToDecide: "medium",
  assumedOccupancy: 0.6,
  captureFraction: 0.5,
  // Seuils sociaux validés (2026-07-25) : plat, ajustables. Abonnés 10k, ~12 posts/mois, ~3% engagement.
  socialGoodFollowers: 10_000,
  socialGoodPostingPerMonth: 12,
  socialGoodEngagementPct: 3,
};
