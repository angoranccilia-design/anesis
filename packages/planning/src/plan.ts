/**
 * Dérivation thèse → objectifs → tâches. Fonctions PURES et DÉTERMINISTES (mêmes entrées → même plan) :
 * aucune DB, aucun LLM. Traçabilité garantie à chaque niveau (Objective → LossLine → £, Task → Objective),
 * répartition du £ sans dérive d'arrondi (allocateMoney), routage figé par la politique (config.ts).
 */
import {
  allocateMoney,
  mulMoney,
  type Iso8601,
  type LossLineId,
  type LossLineItem,
  type MandateId,
  type Objective,
  type ObjectiveId,
  type Task,
  type TaskId,
  type ThesisId,
  type UnderwritingThesis,
} from "@anesis/core";
import type { Assessment } from "@anesis/assessment";
import { DEFAULT_PLANNING_CONFIG, PILLARS, type Pillar, type PlanningConfig } from "./config.js";

/** Injecté : horloge + frappe d'identifiants. Rend les fonctions pures et testables (ids stables). */
export interface PlanningDeps {
  readonly now: Iso8601;
  readonly newThesisId: () => ThesisId;
  readonly newLossLineId: () => LossLineId;
  readonly newObjectiveId: () => ObjectiveId;
  readonly newTaskId: () => TaskId;
}

export interface DerivedPlan {
  readonly objectives: readonly Objective[];
  readonly tasks: readonly Task[];
}

/**
 * §3a — Assessment → UnderwritingThesis. La perte mensuelle est annualisée puis répartie entre les
 * piliers au prorata de leur contribution au leakIndex (poids × sous-score), SANS perdre de pence.
 * Un pilier sous le seuil de matérialité ne génère pas de poste de perte.
 */
export function deriveThesis(
  assessment: Assessment,
  mandateId: MandateId,
  deps: PlanningDeps,
  config: PlanningConfig = DEFAULT_PLANNING_CONFIG,
): UnderwritingThesis {
  const thesisId = deps.newThesisId();
  const weights = PILLARS.map((p) => config.leakWeights[p] * assessment.subScores[p]);
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const annualTotal = mulMoney(assessment.monthlyLoss, 12);

  let lossLines: LossLineItem[] = [];
  if (totalWeight > 0 && annualTotal.pence > 0) {
    const parts = allocateMoney(annualTotal, weights); // somme EXACTE = annualTotal
    lossLines = PILLARS.flatMap((pillar, i): LossLineItem[] => {
      const annualLoss = parts[i]!;
      if (annualLoss.pence < config.materialityAnnualPence) return []; // non matériel → ignoré
      return [
        {
          id: deps.newLossLineId(),
          thesisId,
          pillar,
          annualLoss,
          rootCause: config.pillars[pillar].rootCause,
        },
      ];
    });
  }

  return { id: thesisId, mandateId, leakIndex: assessment.leakIndex, lossLines, createdAt: deps.now };
}

/**
 * §3b + §3c — UnderwritingThesis → objectifs + tâches. UN objectif par poste de perte (targetRecovery =
 * annualLoss × recoverableFraction du pilier), UNE tâche par objectif (V1), routée vers l'agent propriétaire.
 * Le tier de l'agent (défini au roster) portera le régime d'autorisation — on ne le re-décide pas ici.
 */
export function derivePlan(
  thesis: UnderwritingThesis,
  deps: PlanningDeps,
  config: PlanningConfig = DEFAULT_PLANNING_CONFIG,
): DerivedPlan {
  const objectives: Objective[] = [];
  const tasks: Task[] = [];

  for (const line of thesis.lossLines) {
    const policy = config.pillars[line.pillar as Pillar];
    if (!policy) throw new Error(`Pilier inconnu à la dérivation: ${line.pillar}`);

    const objectiveId = deps.newObjectiveId();
    objectives.push({
      id: objectiveId,
      mandateId: thesis.mandateId,
      lossLineId: line.id, // traçabilité non-nullable vers un £
      title: policy.objectiveTitle,
      targetRecovery: mulMoney(line.annualLoss, policy.recoverableFraction),
      state: "created",
      createdAt: deps.now,
    });
    tasks.push({
      id: deps.newTaskId(),
      objectiveId, // non-nullable : pas de tâche orpheline
      mandateId: thesis.mandateId,
      assignedAgent: policy.agentId,
      state: "created",
      intent: policy.taskIntent,
      createdAt: deps.now,
    });
  }

  return { objectives, tasks };
}

/** Chaîne complète (§3a→§3c) — pratique pour l'onboarding d'un mandat et les tests bout-en-bout. */
export function derivePlanFromAssessment(
  assessment: Assessment,
  mandateId: MandateId,
  deps: PlanningDeps,
  config: PlanningConfig = DEFAULT_PLANNING_CONFIG,
): { thesis: UnderwritingThesis } & DerivedPlan {
  const thesis = deriveThesis(assessment, mandateId, deps, config);
  return { thesis, ...derivePlan(thesis, deps, config) };
}
