/**
 * Arrêt d'urgence — ÉVÉNEMENTIEL. Un arrêt n'est jamais un appel direct à une fonction interne :
 * il est ÉMIS sur le bus (`mandate.emergency_stopped` / `system.emergency_stopped`), et c'est un
 * ABONNÉ qui réagit — cohérent avec « les agents ne s'appellent jamais directement ».
 *
 * L'abonné : marque le(s) mandat(s) en arrêt, puis ANNULE (pas suspend) tout AgentRun en fenêtre de
 * retenue T2 (`sleeping_retention → cancelled`, transition validée par le domaine), en traçant chaque
 * annulation par un événement `agentrun.cancelled` (append au journal = source de vérité).
 */
import { AGENT_RUN_TRANSITIONS, canTransition, type DomainEvent, type MandateId, type OperatorId } from "@anesis/core";
import type { SqlClient } from "@anesis/db";
import { makeEvent, type EventBus, type EventHandlerContext, type Subscriber } from "@anesis/events";
import { asId } from "@anesis/core/unsafe";

export const EMERGENCY_STOP_SUBSCRIBER = "policy.emergency-stop";

async function cancelRetainedRuns(
  client: SqlClient,
  mandateId: string | null,
  correlationId: string,
): Promise<void> {
  // Le domaine autorise cette transition — garde explicite (l'arrêt annule, ne suspend pas).
  if (!canTransition(AGENT_RUN_TRANSITIONS, "sleeping_retention", "cancelled")) {
    throw new Error("transition sleeping_retention → cancelled non autorisée par le domaine");
  }
  const where = mandateId ? "where status = 'sleeping_retention' and mandate_id = $1" : "where status = 'sleeping_retention'";
  const params = mandateId ? [mandateId] : [];
  const { rows } = await client.query(`select id from agent_runs ${where}`, params);

  for (const row of rows) {
    const runId = String(row.id);
    await client.query("update agent_runs set status = 'cancelled', ended_at = now() where id = $1", [runId]);
    // Trace l'annulation comme un événement (append au journal des événements).
    await client.query(
      `insert into events (id, type, payload, mandate_id, emitted_by, audience, correlation_id)
       values ($1, 'agentrun.cancelled', $2::jsonb, $3, 'system', '{"agents":[],"humans":[],"roles":[]}'::jsonb, $4)`,
      [`evt-cancel-${runId}`, JSON.stringify({ runId, reason: "emergency_stop" }), mandateId, correlationId],
    );
  }
}

/** Abonné d'arrêt d'urgence — réagit aux événements d'arrêt, jamais appelé directement par un agent. */
export const emergencyStopSubscriber: Subscriber = {
  name: EMERGENCY_STOP_SUBSCRIBER,
  types: ["mandate.emergency_stopped", "system.emergency_stopped"],
  handle: async ({ client, event }: EventHandlerContext): Promise<void> => {
    if (event.type === "mandate.emergency_stopped") {
      const mandateId = (event.payload as { mandateId: string }).mandateId;
      await client.query("update mandates set emergency_stopped = true where id = $1", [mandateId]);
      await cancelRetainedRuns(client, mandateId, event.correlationId);
    } else {
      // system.emergency_stopped — arrêt global (exécuté par le worker système, hors contexte de mandat).
      await client.query("update mandates set emergency_stopped = true");
      await cancelRetainedRuns(client, null, event.correlationId);
    }
  },
};

/** Émet un arrêt d'urgence de mandat sur le bus (action opérateur). */
export function emitMandateEmergencyStop(
  bus: EventBus,
  input: { id: DomainEvent["id"]; mandateId: MandateId; by: OperatorId; correlationId: DomainEvent["correlationId"] },
): Promise<void> {
  return bus.publish(
    makeEvent({
      id: input.id,
      type: "mandate.emergency_stopped",
      payload: { mandateId: input.mandateId, by: input.by },
      correlationId: input.correlationId,
      mandateId: input.mandateId,
      emittedBy: input.by,
    }),
  );
}

/** Helper de test/adaptateur : identifiant d'événement non-typé (via le sous-chemin unsafe). */
export const eventId = (raw: string) => asId<DomainEvent["id"]>(raw);
