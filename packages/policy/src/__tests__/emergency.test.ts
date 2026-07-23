import { beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { applyMigrations, withMandate, type SqlClient } from "@anesis/db";
import { EventBus } from "@anesis/events";
import { asId } from "@anesis/core/unsafe";
import type { CorrelationId, EventId, MandateId, OperatorId } from "@anesis/core";
import { emergencyStopSubscriber, emitMandateEmergencyStop } from "../emergency.js";

async function makeDb(): Promise<SqlClient> {
  const pg = new PGlite();
  await applyMigrations((sql) => pg.exec(sql));
  await pg.exec(`
    create role anesis_app nologin;
    grant usage on schema public to anesis_app;
    grant select, insert, update, delete on all tables in schema public to anesis_app;
    revoke update, delete on events from anesis_app;
    set role anesis_app;
  `);
  return pg as unknown as SqlClient;
}

async function seedRunInRetention(pg: SqlClient, m: string): Promise<void> {
  await withMandate(pg, m, async () => {
    await pg.query("insert into properties (id,name,region,source) values ($1,$2,'South West','t')", [`prop-${m}`, `P ${m}`]);
    await pg.query("insert into mandates (id,mandate_id,property_id) values ($1,$1,$2)", [m, `prop-${m}`]);
    await pg.query(
      `insert into agent_runs (id,agent_id,mandate_id,trigger,status,human_minutes_spent,human_minutes_source,correlation_id)
       values ('run-1','media-buyer',$1,'{"kind":"tick","tick":"daily.tick"}'::jsonb,'sleeping_retention',0,'measured','corr-1')`,
      [m],
    );
  });
}

describe("arrêt d'urgence ÉVÉNEMENTIEL — annule (pas suspend) les T2 en retenue (exigence 2)", () => {
  let pg: SqlClient;
  let bus: EventBus;

  beforeEach(async () => {
    pg = await makeDb();
    await seedRunInRetention(pg, "A");
    bus = new EventBus(pg);
    bus.subscribe(emergencyStopSubscriber);
  });

  it("l'event mandate.emergency_stopped fait transiter le run sleeping_retention → cancelled, via le bus", async () => {
    const before = await withMandate(pg, "A", async () =>
      (await pg.query("select status from agent_runs where id = 'run-1'")).rows,
    );
    expect(before[0]?.status).toBe("sleeping_retention");

    // Émis SUR LE BUS (action opérateur) — pas d'appel direct à une fonction d'annulation.
    await emitMandateEmergencyStop(bus, {
      id: asId<EventId>("evt-stop-A"),
      mandateId: asId<MandateId>("A"),
      by: asId<OperatorId>("op-cecilia"),
      correlationId: asId<CorrelationId>("corr-stop"),
    });

    const after = await withMandate(pg, "A", async () =>
      (await pg.query("select status, ended_at from agent_runs where id = 'run-1'")).rows,
    );
    expect(after[0]?.status).toBe("cancelled"); // ANNULÉ, pas 'suspended'
    expect(after[0]?.ended_at).not.toBeNull();

    const mandate = await withMandate(pg, "A", async () =>
      (await pg.query("select emergency_stopped from mandates where id = 'A'")).rows,
    );
    expect(mandate[0]?.emergency_stopped).toBe(true);

    // L'annulation est tracée comme un événement (journal = source de vérité), pas un effet caché.
    const cancelledEvt = await pg.query(
      "select 1 from events where type = 'agentrun.cancelled' and payload->>'runId' = 'run-1'",
    );
    expect(cancelledEvt.rows).toHaveLength(1);
  });
});
