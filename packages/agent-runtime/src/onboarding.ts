/**
 * Onboarding d'un mandat — LE MAILLON étape 2 ↔ étape 3. À la SIGNATURE d'une Property qualifiée :
 * reconstruit l'Assessment figé (table assessments), construit la thèse via `deriveThesis` (pur),
 * persiste mandat + thèse + postes de perte, fait passer la Property à l'état `mandate`, puis émet
 * `mandate.created` et `mandate.thesis_attached`. Ce dernier déclenche le `planner` (étape 3) qui
 * dérive objectifs + tâches — la boucle est fermée de bout en bout.
 *
 * `mandate.thesis_attached` est le SEUL point où le mandateId existe : c'est la condition des invariants
 * non-nullables d'Objective/Task. La dérivation ne peut donc pas se produire plus tôt (property.qualified).
 */
import { gbp, iso, type BrandConstraints, type CorrelationId, type EventId, type LossLineId, type MandateId, type ObjectiveId, type OperatorId, type PropertyId, type TaskId, type ThesisId } from "@anesis/core";
import { asId } from "@anesis/core/unsafe";
import type { Assessment, AssessmentIcp, SubScores } from "@anesis/assessment";
import { deriveThesis, type PlanningConfig, type PlanningDeps } from "@anesis/planning";
import { withMandate, type SqlClient } from "@anesis/db";
import { EventBus, makeEvent } from "@anesis/events";
import { uid } from "./helpers.js";

export interface SignMandateInput {
  readonly propertyId: string;
  readonly operatorId: OperatorId;
  readonly correlationId: CorrelationId;
  readonly brandConstraints?: BrandConstraints;
  readonly config?: PlanningConfig;
}

export interface SignMandateResult {
  readonly mandateId: MandateId;
  readonly thesisId: ThesisId;
  readonly lossLineCount: number;
}

const asJson = <T>(v: unknown): T => (typeof v === "string" ? (JSON.parse(v) as T) : (v as T));

/** Reconstruit l'Assessment figé à partir de la dernière évaluation persistée pour la Property. */
async function loadLatestAssessment(client: SqlClient, propertyId: string): Promise<Assessment | null> {
  const { rows } = await client.query(
    `select leak_index, monthly_loss_pence, decision, decision_code, icp, sub_scores
     from assessments where property_id = $1 order by assessed_at desc limit 1`,
    [propertyId],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    leakIndex: Number(r.leak_index),
    monthlyLoss: gbp(Number(r.monthly_loss_pence)),
    decision: String(r.decision) as Assessment["decision"],
    decisionCode: String(r.decision_code) as Assessment["decisionCode"],
    icp: asJson<AssessmentIcp>(r.icp),
    subScores: asJson<SubScores>(r.sub_scores),
  };
}

export async function signMandate(client: SqlClient, bus: EventBus, input: SignMandateInput): Promise<SignMandateResult> {
  const { propertyId, operatorId, correlationId } = input;

  const prop = await client.query("select state from properties where id = $1", [propertyId]);
  const state = prop.rows[0]?.state;
  if (state == null) throw new Error(`signMandate: Property introuvable: ${propertyId}`);
  if (state !== "qualified") {
    throw new Error(`signMandate: seule une Property 'qualified' peut être signée (état actuel: ${String(state)})`);
  }
  const assessment = await loadLatestAssessment(client, propertyId);
  if (!assessment) throw new Error(`signMandate: aucune évaluation pour ${propertyId}`);

  const mandateId = asId<MandateId>(uid("mandate"));
  // deriveThesis n'utilise que thesis/lossLine ; objective/task sont fournis pour satisfaire le type
  // (ils serviront côté planner, à la dérivation du plan).
  const deps: PlanningDeps = {
    now: iso(),
    newThesisId: () => asId<ThesisId>(uid("th")),
    newLossLineId: () => asId<LossLineId>(uid("ll")),
    newObjectiveId: () => asId<ObjectiveId>(uid("obj")),
    newTaskId: () => asId<TaskId>(uid("task")),
  };
  const thesis = deriveThesis(assessment, mandateId, deps, input.config);

  const brand: BrandConstraints = input.brandConstraints ?? { voiceNotes: "", bannedTerms: [] };

  await withMandate(client, mandateId, async () => {
    await client.query(
      "insert into mandates (id, mandate_id, property_id, state, brand_constraints) values ($1, $1, $2, 'active', $3::jsonb)",
      [mandateId, propertyId, JSON.stringify(brand)],
    );
    await client.query("insert into theses (id, mandate_id, leak_index) values ($1, $2, $3)", [
      thesis.id,
      mandateId,
      thesis.leakIndex,
    ]);
    for (const ll of thesis.lossLines) {
      await client.query(
        "insert into loss_lines (id, mandate_id, thesis_id, pillar, annual_loss_pence, root_cause) values ($1, $2, $3, $4, $5, $6)",
        [ll.id, mandateId, thesis.id, ll.pillar, ll.annualLoss.pence, ll.rootCause],
      );
    }
    await client.query("update mandates set thesis_id = $2 where id = $1", [mandateId, thesis.id]);
    await client.query("update properties set state = 'mandate', updated_at = now() where id = $1", [propertyId]);
  });

  // Journal (append). Le drain distribuera `mandate.thesis_attached` au planner (étape 3).
  await bus.append(
    makeEvent({
      id: asId<EventId>(uid("evt")),
      type: "mandate.created",
      payload: { mandateId, propertyId: asId<PropertyId>(propertyId) },
      correlationId,
      mandateId,
      emittedBy: operatorId,
    }),
  );
  await bus.append(
    makeEvent({
      id: asId<EventId>(uid("evt")),
      type: "mandate.thesis_attached",
      payload: { mandateId, thesisId: thesis.id, leakIndex: thesis.leakIndex },
      correlationId,
      mandateId,
      emittedBy: operatorId,
    }),
  );

  return { mandateId, thesisId: thesis.id, lossLineCount: thesis.lossLines.length };
}
