/** Harness : PGlite + schéma ANESIS (dont events append-only & processed_events) + table d'observation. */
import { PGlite } from "@electric-sql/pglite";
import { applyMigrations, withMandate, type SqlClient } from "@anesis/db";
import type { Subscriber } from "../bus.js";

/**
 * `asApp: true` bascule sur le rôle applicatif NON-superuser (comme en prod) → la RLS s'applique
 * réellement. Indispensable pour prouver que le contexte de mandat posé par le bus débloque bien
 * les écritures RLS d'un abonné (un superuser contournerait la RLS et masquerait le bug).
 */
export async function makeEventDb(opts: { asApp?: boolean } = {}): Promise<SqlClient> {
  const pg = new PGlite();
  await applyMigrations((sql) => pg.exec(sql));
  await pg.exec("create table side_effects (event_id text not null, subscriber text not null)");
  if (opts.asApp) {
    await pg.exec(`
      create role anesis_app nologin;
      grant usage on schema public to anesis_app;
      grant select, insert, update, delete on all tables in schema public to anesis_app;
      revoke update, delete on events from anesis_app;
      set role anesis_app;
    `);
  }
  return pg as unknown as SqlClient;
}

/** Abonné qui enregistre un effet de bord dans `side_effects` (table sans RLS — pour l'idempotence). */
export const recordingSubscriber = (name: string, types: Subscriber["types"]): Subscriber => ({
  name,
  types,
  handle: async ({ client, event }) => {
    await client.query("insert into side_effects (event_id, subscriber) values ($1, $2)", [event.id, name]);
  },
});

/**
 * Abonné qui écrit dans `objectives` (table RLS-scopée) pour `event.mandateId`.
 * Ne réussit QUE si le bus a posé le bon contexte de mandat avant handle().
 */
export const objectiveWritingSubscriber = (name: string, types: Subscriber["types"]): Subscriber => ({
  name,
  types,
  handle: async ({ client, event }) => {
    await client.query(
      `insert into objectives (id, mandate_id, loss_line_id, title, target_recovery_pence)
       values ($1, $2, $3, 'From event', 1000)`,
      [`obj-from-${event.id}`, event.mandateId, `ll-${event.mandateId}`],
    );
  },
});

export async function countSideEffects(client: SqlClient, subscriber?: string): Promise<number> {
  const { rows } = subscriber
    ? await client.query("select count(*)::int as n from side_effects where subscriber = $1", [subscriber])
    : await client.query("select count(*)::int as n from side_effects");
  return Number(rows[0]?.n ?? 0);
}

/** Amorce un mandat complet (property→mandate→thesis→loss_line) sous son propre contexte. */
export async function seedMandate(client: SqlClient, m: string): Promise<void> {
  await withMandate(client, m, async () => {
    await client.query("insert into properties (id,name,region,source) values ($1,$2,'South West','test')", [`prop-${m}`, `P ${m}`]);
    await client.query("insert into mandates (id,mandate_id,property_id) values ($1,$1,$2)", [m, `prop-${m}`]);
    await client.query("insert into theses (id,mandate_id,leak_index) values ($1,$2,50)", [`th-${m}`, m]);
    await client.query(
      "insert into loss_lines (id,mandate_id,thesis_id,pillar,annual_loss_pence,root_cause) values ($1,$2,$3,'response_time',1000,'x')",
      [`ll-${m}`, m, `th-${m}`],
    );
  });
}
