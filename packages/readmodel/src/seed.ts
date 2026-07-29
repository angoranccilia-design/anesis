/**
 * Seed de démonstration RÉALISTE — pour développer et tester le cockpit et le dashboard sans attendre
 * de vraies données d'établissement. En-GB, £ (pence). Ce sont des établissements FICTIFS : aucune
 * donnée réelle, aucun mandat payant réputé exécuté (cohérent avec la contrainte de résidence).
 *
 * Insère 3 mandats variés : deux sous contrat (Domination 12 mois, Croissance 6 mois) et un tout juste
 * signé dont les termes ne sont pas encore posés — pour montrer le pipeline dans plusieurs états.
 */
import { withMandate, type SqlClient } from "@anesis/db";
import { makeCommercialTerms, type MandateFormula, type MandateTermMonths } from "@anesis/core";

interface SeedMandate {
  readonly mandateId: string;
  readonly propertyId: string;
  readonly propertyName: string;
  readonly region: string;
  readonly leakIndex: number;
  readonly terms: { formula: MandateFormula; termMonths: MandateTermMonths } | null;
  readonly lossLines: ReadonlyArray<{ pillar: string; annualLossPence: number; rootCause: string }>;
  readonly tasks: ReadonlyArray<{ agent: string; intent: string }>;
  readonly humanMinutes: readonly number[];
  readonly pendingApproval: { toolCallName: string; tier: string; reason: string; amountPence: number | null } | null;
}

const MANDATES: readonly SeedMandate[] = [
  {
    mandateId: "m-cotswold",
    propertyId: "p-cotswold",
    propertyName: "The Cotswold Mill",
    region: "Cotswolds",
    leakIndex: 71,
    terms: { formula: "domination", termMonths: 12 },
    lossLines: [
      { pillar: "ota_parity", annualLossPence: 4_200_000, rootCause: "Direct rate undercut by OTA on peak weekends" },
      { pillar: "response_time", annualLossPence: 1_900_000, rootCause: "Enquiries answered in hours, not minutes" },
      { pillar: "review_velocity", annualLossPence: 1_100_000, rootCause: "Reviews left unanswered beyond the useful window" },
      { pillar: "retargeting", annualLossPence: 900_000, rootCause: "No retargeting on abandoned booking journeys" },
    ],
    tasks: [
      { agent: "rate-distribution", intent: "Restore direct-rate parity across channels" },
      { agent: "conversion", intent: "Cut enquiry response time to minutes" },
      { agent: "reputation", intent: "Answer reviews within the useful window" },
      { agent: "media-buyer", intent: "Stand up retargeting on abandoned journeys" },
    ],
    humanMinutes: [14, 9, 22],
    pendingApproval: { toolCallName: "launch_campaign", tier: "T4", reason: "Retargeting budget £480/day", amountPence: 48_000 },
  },
  {
    mandateId: "m-harbour",
    propertyId: "p-harbour",
    propertyName: "Harbour House",
    region: "Cornwall",
    leakIndex: 64,
    terms: { formula: "growth", termMonths: 6 },
    lossLines: [
      { pillar: "response_time", annualLossPence: 1_500_000, rootCause: "Slow website and slow replies" },
      { pillar: "social_presence", annualLossPence: 1_200_000, rootCause: "Thin, inconsistent social presence" },
      { pillar: "review_velocity", annualLossPence: 700_000, rootCause: "Good reviews, rarely acknowledged" },
    ],
    tasks: [
      { agent: "conversion", intent: "Speed up the booking path" },
      { agent: "content-creator", intent: "Rebuild a coherent monthly presence" },
      { agent: "reputation", intent: "Acknowledge reviews promptly" },
    ],
    humanMinutes: [11, 6],
    pendingApproval: null,
  },
  {
    mandateId: "m-ards",
    propertyId: "p-ards",
    propertyName: "Ards Priory",
    region: "South West",
    leakIndex: 58,
    terms: null, // tout juste signé — termes commerciaux pas encore posés
    lossLines: [
      { pillar: "ota_parity", annualLossPence: 1_300_000, rootCause: "Heavy OTA reliance on shoulder nights" },
      { pillar: "retargeting", annualLossPence: 600_000, rootCause: "No paid recapture of warm demand" },
    ],
    tasks: [{ agent: "rate-distribution", intent: "Assess OTA reliance and parity" }],
    humanMinutes: [4],
    pendingApproval: null,
  },
];

export interface SeededDemo {
  readonly founderId: string;
  readonly mandateIds: readonly string[];
}

/** Insère le jeu de démonstration. `client` doit être un rôle applicatif (RLS active). */
export async function seedDemo(client: SqlClient): Promise<SeededDemo> {
  await client.query(
    "insert into operators (id,name,email,role) values ('op-cecilia','Cecilia','cecilia@anesisacquisition.com','founder') on conflict (id) do nothing",
  );

  for (const m of MANDATES) {
    await client.query(
      "insert into properties (id,name,region,source,state) values ($1,$2,$3,'seed-demo','mandate')",
      [m.propertyId, m.propertyName, m.region],
    );

    const terms = m.terms ? makeCommercialTerms(m.terms.formula, m.terms.termMonths) : null;

    await withMandate(client, m.mandateId, async () => {
      await client.query(
        `insert into mandates
           (id, mandate_id, property_id, state, brand_constraints,
            formula, term_months, incentive_rate, monthly_subscription_pence, photo_sessions)
         values ($1,$1,$2,'active','{}'::jsonb,$3,$4,$5,$6,$7)`,
        [
          m.mandateId,
          m.propertyId,
          terms?.formula ?? null,
          terms?.termMonths ?? null,
          terms?.incentiveRate ?? null,
          terms?.monthlySubscription.pence ?? null,
          terms?.photoSessions ?? null,
        ],
      );

      const thesisId = `th-${m.mandateId}`;
      await client.query("insert into theses (id,mandate_id,leak_index) values ($1,$2,$3)", [thesisId, m.mandateId, m.leakIndex]);
      await client.query("update mandates set thesis_id = $2 where id = $1", [m.mandateId, thesisId]);

      let i = 0;
      for (const ll of m.lossLines) {
        const llId = `ll-${m.mandateId}-${i}`;
        await client.query(
          "insert into loss_lines (id,mandate_id,thesis_id,pillar,annual_loss_pence,root_cause) values ($1,$2,$3,$4,$5,$6)",
          [llId, m.mandateId, thesisId, ll.pillar, ll.annualLossPence, ll.rootCause],
        );
        await client.query(
          "insert into objectives (id,mandate_id,loss_line_id,title,target_recovery_pence) values ($1,$2,$3,$4,$5)",
          [`obj-${m.mandateId}-${i}`, m.mandateId, llId, `Recover: ${ll.rootCause}`, Math.round(ll.annualLossPence * 0.6)],
        );
        i += 1;
      }

      let t = 0;
      for (const task of m.tasks) {
        await client.query(
          "insert into tasks (id,mandate_id,objective_id,assigned_agent,intent) values ($1,$2,$3,$4,$5)",
          [`task-${m.mandateId}-${t}`, m.mandateId, `obj-${m.mandateId}-${Math.min(t, m.lossLines.length - 1)}`, task.agent, task.intent],
        );
        t += 1;
      }

      let r = 0;
      let firstRunId = "";
      for (const minutes of m.humanMinutes) {
        const runId = `run-${m.mandateId}-${r}`;
        if (r === 0) firstRunId = runId;
        await client.query(
          `insert into agent_runs (id, agent_id, mandate_id, trigger, human_minutes_spent, human_minutes_source, correlation_id, status)
           values ($1,$2,$3,'{}'::jsonb,$4,'measured',$5,'completed')`,
          [runId, m.tasks[r % m.tasks.length]!.agent, m.mandateId, minutes, `corr-${m.mandateId}`],
        );
        r += 1;
      }

      if (m.pendingApproval) {
        await client.query(
          `insert into approvals (id, mandate_id, run_id, tool_call_name, tier, reason, amount_pence, status, expires_at)
           values ($1,$2,$3,$4,$5,$6,$7,'pending', now() + interval '48 hours')`,
          [
            `appr-${m.mandateId}`,
            m.mandateId,
            firstRunId,
            m.pendingApproval.toolCallName,
            m.pendingApproval.tier,
            m.pendingApproval.reason,
            m.pendingApproval.amountPence,
          ],
        );
      }
    });
  }

  return { founderId: "op-cecilia", mandateIds: MANDATES.map((m) => m.mandateId) };
}
