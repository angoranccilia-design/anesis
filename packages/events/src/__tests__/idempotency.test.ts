import { beforeEach, describe, expect, it } from "vitest";
import { EventBus } from "../bus.js";
import type { SqlClient } from "@anesis/db";
import { asId } from "@anesis/core/unsafe";
import type { CorrelationId, EventId } from "@anesis/core";
import { makeEvent } from "../event-factory.js";
import { countSideEffects, makeEventDb, recordingSubscriber } from "./harness.js";
import { objectiveCreated } from "./events.js";

describe("idempotence — clé (eventId, subscriber)", () => {
  let pg: SqlClient;
  let bus: EventBus;

  beforeEach(async () => {
    pg = await makeEventDb();
    bus = new EventBus(pg);
  });

  it("le même événement livré deux fois ne produit son effet qu'une fois", async () => {
    bus.subscribe(recordingSubscriber("recorder", ["objective.created"]));
    const evt = objectiveCreated(1);
    await bus.publish(evt); // append + dispatch
    await bus.dispatch(evt); // re-livraison directe
    await bus.dispatch(evt); // et encore
    expect(await countSideEffects(pg, "recorder")).toBe(1);
  });

  it("deux abonnés distincts traitent chacun l'événement une fois (la clé inclut le nom d'abonné)", async () => {
    bus.subscribe(recordingSubscriber("alpha", ["objective.created"]));
    bus.subscribe(recordingSubscriber("beta", ["objective.created"]));
    const evt = objectiveCreated(1);
    await bus.publish(evt);
    await bus.dispatch(evt); // re-livraison : aucun des deux ne rejoue
    expect(await countSideEffects(pg, "alpha")).toBe(1);
    expect(await countSideEffects(pg, "beta")).toBe(1);
    expect(await countSideEffects(pg)).toBe(2);
  });

  it("un abonné non concerné par le type ne reçoit rien", async () => {
    bus.subscribe(recordingSubscriber("only-tasks", ["task.created"]));
    await bus.publish(objectiveCreated(1));
    expect(await countSideEffects(pg, "only-tasks")).toBe(0);
  });
});

/**
 * Exigence 3 — preuve à la COMPILATION que les payloads viennent de EventPayloadMap (@anesis/core) :
 * cette fonction n'est jamais appelée ; si le bus acceptait une forme de payload parallèle,
 * le `@ts-expect-error` n'aurait rien à supprimer et le typecheck échouerait.
 */
function _payloadIsSingleSourceOfTruth(): void {
  makeEvent({
    id: asId<EventId>("evt-x"),
    type: "objective.created",
    // @ts-expect-error — payload non conforme au contrat de core → doit être une erreur de compilation
    payload: { nope: true },
    correlationId: asId<CorrelationId>("corr-x"),
  });
}
void _payloadIsSingleSourceOfTruth;
