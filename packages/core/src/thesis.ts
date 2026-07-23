/**
 * Thèse de souscription — produite par le moteur d'audit (étape 2). Modélisée ici, remplie plus tard.
 * Chaque poste de perte (LossLineItem) est chiffré en £/an et génère un Objective :
 * c'est ce qui rend « l'exécution dérivée d'un chiffre » vérifiable.
 */
import type { Iso8601, LossLineId, MandateId, Money, ThesisId } from "./primitives.js";

export interface LossLineItem {
  readonly id: LossLineId;
  readonly thesisId: ThesisId;
  readonly pillar: string; // ex: "response_time", "retargeting", "rate_parity"
  readonly annualLoss: Money; // £/an perdus sur ce poste
  readonly rootCause: string;
}

export interface UnderwritingThesis {
  readonly id: ThesisId;
  readonly mandateId: MandateId;
  readonly leakIndex: number; // /100
  readonly lossLines: readonly LossLineItem[];
  readonly createdAt: Iso8601;
}
