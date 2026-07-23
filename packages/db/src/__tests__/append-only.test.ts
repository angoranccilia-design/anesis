import { beforeAll, describe, expect, it } from "vitest";
import { makeTestDb } from "./db.js";
import type { SqlClient } from "../context.js";

let pg: SqlClient;

beforeAll(async () => {
  pg = await makeTestDb();
  await pg.query(
    `insert into events (id,type,payload,emitted_by,audience,correlation_id)
     values ('evt-1','mandate.created','{}'::jsonb,'system','{"agents":[],"humans":[],"roles":[]}'::jsonb,'corr-1')`,
  );
});

describe("events — append-only", () => {
  it("l'insertion est permise", async () => {
    const rows = (await pg.query("select id from events")).rows;
    expect(rows).toHaveLength(1);
  });

  it("UPDATE est rejeté", async () => {
    await expect(pg.query("update events set type='x' where id='evt-1'")).rejects.toThrow(/append-only/);
  });

  it("DELETE est rejeté", async () => {
    await expect(pg.query("delete from events where id='evt-1'")).rejects.toThrow(/append-only/);
  });
});
