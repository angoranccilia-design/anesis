import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withMandate, type SqlClient } from "@anesis/db";
import { EventBus, makeEvent } from "@anesis/events";
import { asId } from "@anesis/core/unsafe";
import type { ArtifactId, CorrelationId, EventId, MandateId, OperatorId } from "@anesis/core";
import { AgentRuntime, socialOps } from "../index.js";
import { closeTestDbs, makeDb, q, seedMandateWithObjective } from "./harness.js";

afterEach(closeTestDbs);

const M = asId<MandateId>("M");
const CORR = asId<CorrelationId>("corr-social");
const OP = asId<OperatorId>("op-cecilia");

async function seedArtifact(pg: SqlClient, artifactId: string, type: string): Promise<void> {
  await withMandate(pg, "M", async () => {
    await pg.query(
      "insert into agent_runs (id, agent_id, mandate_id, trigger, status, human_minutes_spent, human_minutes_source, correlation_id) values ('run-seed','content-creator','M','{}'::jsonb,'completed',0,'measured','corr-seed') on conflict (id) do nothing",
    );
    await pg.query(
      "insert into artifacts (id, mandate_id, produced_by_run, type, version, payload, state) values ($1,'M','run-seed',$2,1,'{}'::jsonb,'produced')",
      [artifactId, type],
    );
  });
}

function artifactApproved(id: string, artifactId: string): Parameters<EventBus["append"]>[0] {
  return makeEvent({
    id: asId<EventId>(id),
    type: "artifact.approved",
    payload: { artifactId: asId<ArtifactId>(artifactId), by: OP },
    correlationId: CORR,
    mandateId: M,
    emittedBy: OP,
  });
}

describe("Social Ops (T1) — publie le contenu approuvé + trace de relecture", () => {
  let pg: SqlClient;
  let bus: EventBus;
  let rt: AgentRuntime;

  beforeEach(async () => {
    pg = await makeDb();
    await seedMandateWithObjective(pg, "M");
    bus = new EventBus(pg);
    rt = new AgentRuntime(pg, bus, { sleep: async () => {} });
    rt.register(socialOps);
  });

  it("publie un artefact de contenu approuvé (T1 immédiat) + content.published + notif", async () => {
    await seedArtifact(pg, "art-content", "content");
    await bus.append(artifactApproved("evt-1", "art-content"));
    await rt.drain();

    const pubs = await q(pg, "M", "select artifact_id, channel from publications");
    expect(pubs).toHaveLength(1);
    expect(pubs[0]?.artifact_id).toBe("art-content");
    expect(pubs[0]?.channel).toBe("buffer");

    const tc = await q(pg, "M", "select tier, retention_started_at from tool_calls where name='publish_content'");
    expect(tc[0]?.tier).toBe("T1");
    expect(tc[0]?.retention_started_at).toBeNull(); // T1 : pas de retenue

    const published = await q(pg, "M", "select count(*)::int as n from events where type='content.published'");
    expect(Number(published[0]?.n)).toBe(1);
    const notifs = await q(pg, "M", "select count(*)::int as n from notifications");
    expect(Number(notifs[0]?.n)).toBe(1);
  });

  it("ignore un artefact non publiable (ex: weekly_report)", async () => {
    await seedArtifact(pg, "art-report", "weekly_report");
    await bus.append(artifactApproved("evt-2", "art-report"));
    await rt.drain();
    const pubs = await q(pg, "M", "select count(*)::int as n from publications");
    expect(Number(pubs[0]?.n)).toBe(0);
  });

  it("est idempotent : une seconde approbation ne republie pas", async () => {
    await seedArtifact(pg, "art-content", "content");
    await bus.append(artifactApproved("evt-1", "art-content"));
    await rt.drain();
    await bus.append(artifactApproved("evt-1b", "art-content"));
    await rt.drain();
    const pubs = await q(pg, "M", "select count(*)::int as n from publications");
    expect(Number(pubs[0]?.n)).toBe(1);
  });
});
