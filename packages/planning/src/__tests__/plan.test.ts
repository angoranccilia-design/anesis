import { describe, expect, it } from "vitest";
import { gbp, iso, type LossLineId, type MandateId, type ObjectiveId, type TaskId, type ThesisId } from "@anesis/core";
import { asId } from "@anesis/core/unsafe";
import type { Assessment, Estimate, SubScores } from "@anesis/assessment";
import {
  DEFAULT_PLANNING_CONFIG,
  derivePlan,
  derivePlanFromAssessment,
  deriveThesis,
  type PlanningConfig,
  type PlanningDeps,
} from "../index.js";

const MANDATE = asId<MandateId>("mandate-1");

/** Frappe d'identifiants séquentielle → plan strictement déterministe pour les assertions. */
function seqDeps(): PlanningDeps {
  let t = 0,
    l = 0,
    o = 0,
    k = 0;
  return {
    now: iso("2026-08-01T00:00:00.000Z"),
    newThesisId: () => asId<ThesisId>(`th-${++t}`),
    newLossLineId: () => asId<LossLineId>(`ll-${++l}`),
    newObjectiveId: () => asId<ObjectiveId>(`obj-${++o}`),
    newTaskId: () => asId<TaskId>(`task-${++k}`),
  };
}

const est = <T>(value: T): Estimate<T> => ({ value, confidence: "high", source: "test" });

function makeAssessment(monthlyLossPence: number, subScores: SubScores, leakIndex = 60): Assessment {
  return {
    leakIndex,
    monthlyLoss: gbp(monthlyLossPence),
    decision: "qualified",
    decisionCode: "QUALIFIED",
    icp: { keys: est(20), adrPence: est(18_000), otaSharePct: est(55), hasInHouseMarketing: est(false) },
    subScores,
  };
}

describe("dérivation thèse → objectifs → tâches (pure, déterministe)", () => {
  it("est déterministe : mêmes entrées → plan strictement identique", () => {
    const a = makeAssessment(1_000_000, { speed: 40, reviews: 60, ota: 100, retargeting: 100 });
    const first = derivePlanFromAssessment(a, MANDATE, seqDeps());
    const second = derivePlanFromAssessment(a, MANDATE, seqDeps());
    expect(second).toEqual(first);
  });

  it("répartit la perte £ SANS dérive d'arrondi (somme des postes = perte annuelle)", () => {
    const noMateriality: PlanningConfig = { ...DEFAULT_PLANNING_CONFIG, materialityAnnualPence: 0 };
    const a = makeAssessment(1_000_001, { speed: 50, reviews: 50, ota: 50, retargeting: 50 }); // pence impair → teste l'arrondi
    const thesis = deriveThesis(a, MANDATE, seqDeps(), noMateriality);
    const sum = thesis.lossLines.reduce((s, ll) => s + ll.annualLoss.pence, 0);
    expect(sum).toBe(1_000_001 * 12); // exactement, aucun pence perdu ni créé
    expect(thesis.lossLines).toHaveLength(4);
  });

  it("applique le seuil de matérialité : un pilier trop faible ne crée ni poste, ni objectif, ni tâche", () => {
    // speed reçoit une part annuelle < £2,000 → exclu ; reviews=0 → exclu ; restent ota + retargeting.
    const a = makeAssessment(1_000_000, { speed: 1, reviews: 0, ota: 100, retargeting: 100 });
    const { thesis, objectives, tasks } = derivePlanFromAssessment(a, MANDATE, seqDeps());
    expect(thesis.lossLines.map((l) => l.pillar)).toEqual(["ota", "retargeting"]);
    expect(objectives).toHaveLength(2);
    expect(tasks).toHaveLength(2);
  });

  it("trace tout vers un £ et route chaque tâche vers l'agent propriétaire", () => {
    const a = makeAssessment(2_000_000, { speed: 80, reviews: 80, ota: 80, retargeting: 80 });
    const { thesis, objectives, tasks } = derivePlanFromAssessment(a, MANDATE, seqDeps());

    const lossLineIds = new Set(thesis.lossLines.map((l) => l.id));
    const objectiveIds = new Set(objectives.map((o) => o.id));
    // Objective → LossLine (non-nullable), Task → Objective (non-orpheline), isolation mandat cohérente.
    for (const o of objectives) {
      expect(lossLineIds.has(o.lossLineId)).toBe(true);
      expect(o.mandateId).toBe(MANDATE);
    }
    for (const t of tasks) {
      expect(objectiveIds.has(t.objectiveId)).toBe(true);
      expect(t.mandateId).toBe(MANDATE);
    }

    const agentByPillar = Object.fromEntries(
      thesis.lossLines.map((l, i) => [l.pillar, tasks[i]!.assignedAgent]),
    );
    expect(agentByPillar.speed).toBe("conversion");
    expect(agentByPillar.reviews).toBe("reputation");
    expect(agentByPillar.ota).toBe("rate-distribution");
    expect(agentByPillar.retargeting).toBe("media-buyer");
  });

  it("engage une part récupérable par pilier (targetRecovery = annualLoss × fraction)", () => {
    const a = makeAssessment(2_000_000, { speed: 80, reviews: 80, ota: 80, retargeting: 80 });
    const { thesis, objectives } = derivePlanFromAssessment(a, MANDATE, seqDeps());
    for (let i = 0; i < thesis.lossLines.length; i++) {
      const line = thesis.lossLines[i]!;
      const objective = objectives[i]!;
      const fraction = DEFAULT_PLANNING_CONFIG.pillars[line.pillar as "speed"].recoverableFraction;
      expect(objective.targetRecovery.pence).toBe(Math.round(line.annualLoss.pence * fraction));
    }
    // sanité de la politique : la réputation (lente) est plus prudente que le retargeting.
    expect(DEFAULT_PLANNING_CONFIG.pillars.reviews.recoverableFraction).toBeLessThan(
      DEFAULT_PLANNING_CONFIG.pillars.retargeting.recoverableFraction,
    );
  });

  it("aucune fuite (leakIndex 0, sous-scores nuls) → thèse vide, aucun objectif/tâche", () => {
    const a = makeAssessment(0, { speed: 0, reviews: 0, ota: 0, retargeting: 0 }, 0);
    const { thesis, objectives, tasks } = derivePlanFromAssessment(a, MANDATE, seqDeps());
    expect(thesis.lossLines).toHaveLength(0);
    expect(objectives).toHaveLength(0);
    expect(tasks).toHaveLength(0);
    // derivePlan direct sur une thèse vide est également inerte.
    expect(derivePlan(thesis, seqDeps())).toEqual({ objectives: [], tasks: [] });
  });
});
