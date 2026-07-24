import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SqlClient } from "@anesis/db";
import { EventBus } from "@anesis/events";
import { asId } from "@anesis/core/unsafe";
import type { CorrelationId, PropertyImportRow } from "@anesis/core";
import type { RawObservations } from "@anesis/assessment";
import { runCampaign, type UnderwriterDeps } from "../index.js";
import { closeTestDbs, makeDb } from "./harness.js";

afterEach(closeTestDbs);

const CORR = asId<CorrelationId>("corr-campaign");

// Observations injectées par NOM (pas d'IO réseau) — remplace les sources réelles en test.
const OBS: Record<string, RawObservations> = {
  "Qualified House": {
    siteResponseMs: 1600,
    reviewCount: 20,
    reviewRating: 3.9,
    otaBadges: ["booking.com", "expedia"],
    hasTrackingPixel: false,
    structuredRoomCount: 30,
    listedNightlyRatePence: 20_000,
    otaSharePctHint: 60,
  },
  "Tiny Inn": {
    siteResponseMs: 1600,
    reviewCount: 20,
    reviewRating: 3.9,
    otaBadges: ["booking.com"],
    hasTrackingPixel: false,
    structuredRoomCount: 8, // trop petit → TOO_SMALL
    listedNightlyRatePence: 20_000,
    otaSharePctHint: 60,
  },
  "Opaque Lodge": {
    siteResponseMs: 1200,
    reviewCount: 40,
    reviewRating: 4.1,
    otaBadges: ["booking.com"], // ni clés ni ADR fiables → revue manuelle
  },
};

const deps: UnderwriterDeps = { fetchObservations: async (p) => OBS[p.name] ?? {} };

const PROSPECTS: PropertyImportRow[] = [
  { name: "Qualified House", website: "https://qualified.co.uk", region: "South West", source: "campaign-2026-08" },
  { name: "Tiny Inn", website: "https://tiny.co.uk", region: "South West", source: "campaign-2026-08" },
  { name: "Opaque Lodge", website: "https://opaque.co.uk", region: "South West", source: "campaign-2026-08" },
  { name: "Dupe", website: "https://qualified.co.uk", region: "South West", source: "campaign-2026-08" }, // même domaine → ignoré
];

describe("runCampaign — import → lot d'évaluation → tri de la file (bout en bout)", () => {
  let pg: SqlClient;
  let bus: EventBus;

  beforeEach(async () => {
    pg = await makeDb();
    bus = new EventBus(pg);
  });

  it("importe (dédup domaine), évalue, et remonte les comptes + la file de revue", async () => {
    const report = await runCampaign(pg, bus, deps, { correlationId: CORR, prospects: PROSPECTS });

    expect(report.imported).toBe(3); // le doublon de domaine est ignoré
    expect(report.skipped).toBe(1);
    expect(report.processed).toBe(3);
    expect(report.qualified).toBe(1);
    expect(report.declined).toBe(1);
    expect(report.needsReview).toBe(1);

    // La file de revue manuelle contient bien le dossier indécidable (donnée publique insuffisante).
    expect(report.reviewQueue).toHaveLength(1);
    expect(report.reviewQueue[0]?.name).toBe("Opaque Lodge");
    expect(report.reviewQueue[0]?.decisionCode).toBe("INSUFFICIENT_PUBLIC_DATA");
  });

  it("est reprenable : un second passage ne retraite pas les prospects déjà évalués", async () => {
    await runCampaign(pg, bus, deps, { correlationId: CORR, prospects: PROSPECTS });
    const second = await runCampaign(pg, bus, deps, { correlationId: CORR }); // sans réimport
    expect(second.processed).toBe(0); // plus aucun état 'prospect' à traiter
    expect(second.qualified).toBe(1); // les comptes cumulés restent cohérents
  });
});
