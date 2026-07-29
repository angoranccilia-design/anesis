import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { applyMigrations, type SqlClient } from "@anesis/db";
import { cockpitOverview } from "../cockpit.js";
import { clientDashboard } from "../dashboard.js";
import { seedDemo } from "../seed.js";

/** RLS active (rôle applicatif) : indispensable pour valider withFounder / withMandate. */
async function makeAppDb(): Promise<SqlClient> {
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

let pg: SqlClient;

beforeAll(async () => {
  pg = await makeAppDb();
  await seedDemo(pg);
});

describe("cockpit fondatrice — lecture transversale (withFounder)", () => {
  it("voit les 3 mandats de la démo, triés par nom", async () => {
    const o = await cockpitOverview(pg);
    expect(o.mandates.map((m) => m.propertyName)).toEqual(["Ards Priory", "Harbour House", "The Cotswold Mill"]);
    expect(o.totals.mandates).toBe(3);
  });

  it("agrège les minutes humaines et le récurrent mensuel des mandats actifs", async () => {
    const o = await cockpitOverview(pg);
    // minutes : Cotswold 14+9+22=45, Harbour 11+6=17, Ards 4 → 66
    expect(o.totals.humanMinutes).toBe(66);
    // récurrent : Domination £4 400 + Croissance £3 400 + (Ards sans termes → 0) = £7 800
    expect(o.totals.monthlyRecurringPence).toBe(780_000);
  });

  it("le taux d'intéressement affiché suit la durée (12mo→0.10, 6mo→0.15), Ards sans termes → null", async () => {
    const o = await cockpitOverview(pg);
    const by = Object.fromEntries(o.mandates.map((m) => [m.propertyName, m]));
    expect(by["The Cotswold Mill"]!.incentiveRate).toBe(0.1);
    expect(by["Harbour House"]!.incentiveRate).toBe(0.15);
    expect(by["Ards Priory"]!.incentiveRate).toBeNull();
    expect(by["Ards Priory"]!.formula).toBeNull();
  });

  it("remonte l'approbation en attente avec l'établissement et le montant", async () => {
    const o = await cockpitOverview(pg);
    expect(o.totals.pendingApprovals).toBe(1);
    const a = o.pendingApprovals[0]!;
    expect(a.propertyName).toBe("The Cotswold Mill");
    expect(a.tier).toBe("T4");
    expect(a.amountPence).toBe(48_000);
    expect(a.decidedBy).toBeNull();
  });
});

describe("dashboard client — mandat unique (withMandate)", () => {
  it("rend la vue d'un établissement avec pertes, objectifs, tâches par agent et termes", async () => {
    const d = await clientDashboard(pg, "m-cotswold");
    expect(d).not.toBeNull();
    expect(d!.propertyName).toBe("The Cotswold Mill");
    expect(d!.leakIndex).toBe(71);
    expect(d!.lossLines[0]!.pillar).toBe("ota_parity"); // trié par perte décroissante
    expect(d!.recoverableAnnualPence).toBe(4_200_000 + 1_900_000 + 1_100_000 + 900_000);
    expect(d!.tasksByAgent.map((t) => t.agent)).toEqual(["conversion", "media-buyer", "rate-distribution", "reputation"]);
    expect(d!.commercialTerms).toEqual({
      formula: "domination",
      termMonths: 12,
      incentiveRate: 0.1,
      monthlySubscriptionPence: 440_000,
      photoSessions: 4,
    });
  });

  it("un mandat sans termes rend commercialTerms = null", async () => {
    const d = await clientDashboard(pg, "m-ards");
    expect(d!.commercialTerms).toBeNull();
  });

  it("un mandat inconnu → null", async () => {
    expect(await clientDashboard(pg, "m-nope")).toBeNull();
  });

  it("isolation : la lecture d'un mandat ne fait pas fuiter les pertes d'un autre", async () => {
    const d = await clientDashboard(pg, "m-harbour");
    expect(d!.lossLines.every((l) => l.annualLossPence <= 1_500_000)).toBe(true);
    expect(d!.lossLines.some((l) => l.rootCause.includes("Cotswold"))).toBe(false);
  });
});
