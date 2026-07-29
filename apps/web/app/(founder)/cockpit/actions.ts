"use server";

import { revalidatePath } from "next/cache";
import { withDbClient } from "@/lib/db";
import { currentOperator } from "@/lib/session";

/**
 * Décision d'approbation depuis le cockpit. L'autorité est vérifiée côté domaine (decideApproval →
 * canApproveTier + délégation) ; ici on se contente d'exiger une session et de router la décision.
 * En mode démo (pas de base / pas de session), no-op silencieux.
 */
export async function decideApprovalAction(formData: FormData): Promise<void> {
  const mandateId = String(formData.get("mandateId") ?? "");
  const approvalId = String(formData.get("approvalId") ?? "");
  const decision = String(formData.get("decision") ?? "") as "grant" | "deny";
  if (!mandateId || !approvalId || (decision !== "grant" && decision !== "deny")) return;

  const operator = await currentOperator();
  if (!operator) return;

  await withDbClient(async (client) => {
    const { decideApproval } = await import("@anesis/agent-runtime");
    return decideApproval(client, { mandateId, approvalId, operator, decision });
  });

  revalidatePath("/cockpit");
}

/**
 * Génération d'un contrat (Porte 3) sur une Property qualifiée : formule + durée → makeCommercialTerms
 * → signMandate. Réservé à la fondatrice. No-op en démo.
 */
export async function generateContractAction(formData: FormData): Promise<void> {
  const propertyId = String(formData.get("propertyId") ?? "");
  const formula = String(formData.get("formula") ?? "") as "growth" | "domination";
  const termMonths = Number(formData.get("termMonths") ?? 0) as 6 | 12;
  if (!propertyId || (formula !== "growth" && formula !== "domination") || (termMonths !== 6 && termMonths !== 12)) return;

  const operator = await currentOperator();
  if (!operator || operator.role !== "founder") return;

  await withDbClient(async (client) => {
    const { signMandate } = await import("@anesis/agent-runtime");
    const { EventBus } = await import("@anesis/events");
    const { asId } = await import("@anesis/core/unsafe");
    return signMandate(client, new EventBus(client), {
      propertyId,
      operatorId: operator.id,
      correlationId: asId("corr-" + globalThis.crypto.randomUUID()),
      formula,
      termMonths,
    });
  });

  revalidatePath("/cockpit");
}
