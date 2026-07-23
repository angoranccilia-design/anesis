import { beforeEach, describe, expect, it } from "vitest";
import { EventBus } from "../bus.js";
import { withMandate, type SqlClient } from "@anesis/db";
import { asId } from "@anesis/core/unsafe";
import type { CorrelationId, EventId, LossLineId, MandateId, Money, ObjectiveId } from "@anesis/core";
import { makeEvent } from "../event-factory.js";
import { makeEventDb, objectiveWritingSubscriber, seedMandate } from "./harness.js";

const gbp = (pence: number): Money => ({ currency: "GBP", pence });

const eventForMandate = (m: string) =>
  makeEvent({
    id: asId<EventId>(`evt-${m}`),
    type: "objective.created",
    payload: {
      objectiveId: asId<ObjectiveId>(`o-${m}`),
      lossLineId: asId<LossLineId>(`ll-${m}`),
      targetRecovery: gbp(1_000),
    },
    correlationId: asId<CorrelationId>("corr"),
    mandateId: asId<MandateId>(m),
  });

describe("le bus établit le contexte de mandat pour les écritures RLS de l'abonné", () => {
  let pg: SqlClient;

  beforeEach(async () => {
    pg = await makeEventDb({ asApp: true }); // RLS active (rôle non-superuser)
    await seedMandate(pg, "A");
    await seedMandate(pg, "B");
  });

  it("contrôle négatif : écrire dans objectives SANS contexte de mandat est rejeté par la RLS", async () => {
    // C'est exactement ce que deliver() heurtait AVANT le correctif (aucun app.mandate_id posé).
    await expect(
      pg.query(
        "insert into objectives (id,mandate_id,loss_line_id,title,target_recovery_pence) values ('x','A','ll-A','t',1)",
      ),
    ).rejects.toThrow();
  });

  it("via le bus, l'effet de l'abonné passe la RLS et reste isolé au bon mandat", async () => {
    const bus = new EventBus(pg);
    bus.subscribe(objectiveWritingSubscriber("writer", ["objective.created"]));

    await bus.publish(eventForMandate("A")); // deliver() pose le contexte A → l'INSERT passe

    const underA = await withMandate(pg, "A", async () =>
      (await pg.query("select id from objectives where id = $1", ["obj-from-evt-A"])).rows,
    );
    expect(underA).toHaveLength(1);

    const underB = await withMandate(pg, "B", async () =>
      (await pg.query("select id from objectives where id = $1", ["obj-from-evt-A"])).rows,
    );
    expect(underB).toHaveLength(0);
  });
});
