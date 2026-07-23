/**
 * File de revue manuelle — les Property restées à 'assessed' dont l'évaluation a routé vers une revue
 * humaine (typiquement `INSUFFICIENT_PUBLIC_DATA` : part OTA ou poste marketing indécidables en donnée
 * publique). À vider en quelques heures début août plutôt que de supposer que tout se décide seul.
 */
import type { SqlClient } from "@anesis/db";

export interface ManualReviewItem {
  readonly propertyId: string;
  readonly name: string;
  readonly decisionCode: string;
  readonly leakIndex: number;
}

export async function listManualReviewQueue(client: SqlClient): Promise<ManualReviewItem[]> {
  const { rows } = await client.query(
    `select p.id as property_id, p.name, a.decision_code, a.leak_index
     from properties p
     join assessments a on a.property_id = p.id
     where p.state = 'assessed' and a.decision = 'needs_review'
     order by a.assessed_at desc`,
  );
  return rows.map((r) => ({
    propertyId: String(r.property_id),
    name: String(r.name),
    decisionCode: String(r.decision_code),
    leakIndex: Number(r.leak_index),
  }));
}
