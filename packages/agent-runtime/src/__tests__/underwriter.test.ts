import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SqlClient } from "@anesis/db";
import { EventBus } from "@anesis/events";
import { asId } from "@anesis/core/unsafe";
import type { CorrelationId } from "@anesis/core";
import type { RawObservations } from "@anesis/assessment";
import { assessProspectBatch, listManualReviewQueue, type UnderwriterDeps } from "../index.js";
import { closeTestDbs, makeDb } from "./harness.js";

afterEach(closeTestDbs);

const CORR = asId<CorrelationId>("corr-assess");

// Observations injectées par prospect (pas d'IO réseau en test).
const OBS: Record<string, RawObservations> = {
  "p-q": {
    siteResponseMs: 1600,
    reviewCount: 20,
    reviewRating: 3.9,
    otaBadges: ["booking.com", "expedia"],
    hasTrackingPixel: false,
    structuredRoomCount: 30,
    listedNightlyRatePence: 20_000,
    otaSharePctHint: 60,
  },
  "p-d": {
    siteResponseMs: 1600,
    reviewCount: 20,
    reviewRating: 3.9,
    otaBadges: ["booking.com"],
    hasTrackingPixel: false,
    structuredRoomCount: 8, // trop petit → TOO_SMALL
    listedNightlyRatePence: 20_000,
    otaSharePctHint: 60,
  },
  "p-r": {
    siteResponseMs: 1200,
    reviewCount: 40,
    reviewRating: 4.1,
    otaBadges: ["booking.com"], // ni clés ni ADR fiables → revue manuelle
  },
};

const deps: UnderwriterDeps = {
  fetchObservations: async (p) => OBS[p.id] ?? {},
};

async function seedProspects(pg: SqlClient): Promise<void> {
  for (const [id, name] of [
    ["p-q", "Qualified House"],
    ["p-d", "Tiny Inn"],
    ["p-r", "Opaque Lodge"],
  ]) {
    await pg.query(
      "insert into properties (id,name,region,source,state,website) values ($1,$2,'South West','campaign-2026-08','prospect',$3)",
      [id, name, `https://${id}.co.uk`],
    );
  }
}

describe("Underwriter — Porte 1 : évalue les prospects et fait transiter l'état", () => {
  let pg: SqlClient;
  let bus: EventBus;

  beforeEach(async () => {
    pg = await makeDb();
    await seedProspects(pg);
    bus = new EventBus(pg);
  });

  it("évalue chaque prospect : état transité, événement property.* émis, évaluation tracée", async () => {
    const res = await assessProspectBatch(pg, bus, deps, { correlationId: CORR });
    expect(res.processed).toBe(3);

    const states = Object.fromEntries(
      (await pg.query("select id, state from properties order by id")).rows.map((r) => [r.id, r.state]),
    );
    expect(states).toEqual({ "p-d": "declined", "p-q": "qualified", "p-r": "assessed" });

    // événements property.* émis (un assessed par prospect + le verdict)
    const types = (await pg.query("select type from events order by type")).rows.map((r) => r.type);
    expect(types.filter((t) => t === "property.assessed")).toHaveLength(3);
    expect(types).toContain("property.qualified");
    expect(types).toContain("property.declined");
    expect(types).toContain("property.needs_review");

    // évaluations tracées + champs ICP remplis
    const assess = (await pg.query("select count(*)::int as n from assessments")).rows[0];
    expect(Number(assess?.n)).toBe(3);
    const q = (await pg.query("select keys, avg_nightly_rate_pence, ota_share_pct from properties where id='p-q'")).rows[0];
    expect(Number(q?.keys)).toBe(30);
    expect(Number(q?.avg_nightly_rate_pence)).toBe(20_000);

    // chaque évaluation est passée par le chokepoint (un tool_call T0 par prospect, run système null-mandat)
    const tc = (await pg.query("select count(*)::int as n from tool_calls where name='record_assessment' and tier='T0'")).rows[0];
    expect(Number(tc?.n)).toBe(3);
  });

  it("la file de revue manuelle ne contient que les prospects routés en needs_review", async () => {
    await assessProspectBatch(pg, bus, deps, { correlationId: CORR });
    const queue = await listManualReviewQueue(pg);
    expect(queue).toHaveLength(1);
    expect(queue[0]?.propertyId).toBe("p-r");
    expect(queue[0]?.decisionCode).toBe("INSUFFICIENT_PUBLIC_DATA");
  });

  it("le lot est idempotent et reprenable : relancer ne retraite pas les prospects déjà évalués", async () => {
    const first = await assessProspectBatch(pg, bus, deps, { correlationId: CORR });
    expect(first.processed).toBe(3);

    const second = await assessProspectBatch(pg, bus, deps, { correlationId: CORR });
    expect(second.processed).toBe(0); // plus aucun 'prospect' à traiter

    const assess = (await pg.query("select count(*)::int as n from assessments")).rows[0];
    expect(Number(assess?.n)).toBe(3); // pas de doublon
  });
});
