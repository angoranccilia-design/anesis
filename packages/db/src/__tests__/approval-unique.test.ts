import { beforeAll, describe, expect, it } from "vitest";
import { makeTestDb } from "./db.js";
import { withMandate } from "../context.js";
import type { SqlClient } from "../context.js";

let pg: SqlClient;

beforeAll(async () => {
  pg = await makeTestDb();
  await withMandate(pg, "M", async () => {
    await pg.query("insert into properties (id,name,region,source) values ('prop-M','P','South West','t')");
    await pg.query("insert into mandates (id,mandate_id,property_id) values ('M','M','prop-M')");
    await pg.query(
      `insert into agent_runs (id,agent_id,mandate_id,trigger,status,human_minutes_spent,human_minutes_source,correlation_id)
       values ('run-M','media-buyer','M','{"kind":"tick","tick":"daily.tick"}'::jsonb,'completed',0,'measured','corr-M')`,
    );
    await pg.query(
      "insert into approvals (id,mandate_id,run_id,tool_call_name,tier,reason,status) values ('appr-1','M','run-M','redeploy','T4','budget','granted')",
    );
  });
});

describe("unicité tool_calls.approval_id — une Approval autorise UNE action", () => {
  it("réutiliser la même Approval pour deux tool-calls est rejeté", async () => {
    await withMandate(pg, "M", async () => {
      await pg.query(
        "insert into tool_calls (id,mandate_id,run_id,name,tier,at,approval_id,reversible,compensation) values ('tc-1','M','run-M','redeploy','T4',now(),'appr-1',true,'pause')",
      );
    });
    await expect(
      withMandate(pg, "M", async () => {
        await pg.query(
          "insert into tool_calls (id,mandate_id,run_id,name,tier,at,approval_id,reversible,compensation) values ('tc-2','M','run-M','redeploy','T4',now(),'appr-1',true,'pause')",
        );
      }),
    ).rejects.toThrow();
  });

  it("plusieurs tool-calls SANS approval_id (null) restent permis", async () => {
    await withMandate(pg, "M", async () => {
      await pg.query("insert into tool_calls (id,mandate_id,run_id,name,tier,at) values ('tc-3','M','run-M','noop','T0',now())");
      await pg.query("insert into tool_calls (id,mandate_id,run_id,name,tier,at) values ('tc-4','M','run-M','noop','T0',now())");
    });
    const rows = await withMandate(pg, "M", async () => (await pg.query("select id from tool_calls where approval_id is null")).rows);
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});
