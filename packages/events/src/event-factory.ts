/**
 * Fabrique d'événements. Le payload est typé par `EventPayloadMap` de @anesis/core :
 * le bus NE définit PAS sa propre forme de payload. Toute divergence entre l'événement construit
 * ici et le contrat du domaine est une erreur de compilation — une seule source de vérité.
 */
import type {
  CorrelationId,
  DomainEvent,
  EventAudience,
  EventId,
  EventPayloadMap,
  EventType,
  Iso8601,
  MandateId,
  OperatorId,
} from "@anesis/core";
import { iso } from "@anesis/core";
import type { RunnableAgentId } from "@anesis/core";

const EMPTY_AUDIENCE: EventAudience = { agents: [], humans: [], roles: [] };

export interface MakeEventInput<T extends EventType> {
  id: EventId;
  type: T;
  payload: EventPayloadMap[T]; // ← contrat du domaine, pas une forme parallèle
  correlationId: CorrelationId;
  mandateId?: MandateId | null;
  emittedBy?: RunnableAgentId | OperatorId | "system";
  emittedAt?: Iso8601;
  audience?: EventAudience;
}

export const makeEvent = <T extends EventType>(input: MakeEventInput<T>): DomainEvent<T> => ({
  id: input.id,
  type: input.type,
  payload: input.payload,
  mandateId: input.mandateId ?? null,
  emittedBy: input.emittedBy ?? "system",
  emittedAt: input.emittedAt ?? iso(),
  audience: input.audience ?? EMPTY_AUDIENCE,
  correlationId: input.correlationId,
});
