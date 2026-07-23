/** Constructeurs d'événements de test — payloads conformes à EventPayloadMap de @anesis/core. */
import { asId } from "@anesis/core/unsafe";
import type { CorrelationId, EventId, LossLineId, Money, ObjectiveId } from "@anesis/core";
import { makeEvent } from "../event-factory.js";

const CORR = asId<CorrelationId>("corr-1");
const gbp = (pence: number): Money => ({ currency: "GBP", pence });

export const objectiveCreated = (n: number) =>
  makeEvent({
    id: asId<EventId>(`evt-${n}`),
    type: "objective.created",
    payload: {
      objectiveId: asId<ObjectiveId>(`obj-${n}`),
      lossLineId: asId<LossLineId>(`ll-${n}`),
      targetRecovery: gbp(1_000 * n),
    },
    correlationId: CORR,
  });
