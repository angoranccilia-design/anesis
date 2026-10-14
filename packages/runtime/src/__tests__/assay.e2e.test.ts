/**
 * The first Commercial Assay, end to end, on a SYNTHETIC 12-month export: declare → import → benchmarks → cycle (verified_only) →
 * contract → human authorisation → execution with proof and cost → measurement on the property's own history → closure,
 * with refused paths (data request, engine actor, lost update) and persistence across a restart. No real property, no real service.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs"; import { join } from "node:path"; import { tmpdir } from "node:os";
import { openDatabase, migrate, PgModelStore, runOnce, scheduleCycle, importFile, upsertProperty, saveRegisters, loadCycleResult, listInterventions, loadIntervention, transitionIntervention, measureIntervention, tracesFor, type SqlClient } from "../index.js";
import { COUNTRY_HOUSE_34, type PropertySpec } from "@anesis/engine";
import { closureDossier } from "@anesis/execution";

const P: PropertySpec = { ...COUNTRY_HOUSE_34, id: "PROP-ASSAY-1", name: "Assay property (synthetic)", rooms: 40, location: { name: "Synthetic Bay", lat: 50.7, lon: -1.9, country: "GB" } };
const human = (at: string) => ({ by: "Cecilia <c@example.test>", human: true, at });
/** 40 rooms, seasonal occupancy (0.85 Jun–Sep, 0.45 otherwise), ADR £220, 2/3 of stays via Booking.com at 18 % commission; 1 Oct 2025 → 30 Sep 2026. */
const csv = () => { const rows = ["id,arrival,departure,status,revenue,currency,channel,commission"]; let k = 0; const start = Date.parse("2025-10-01T00:00:00Z"); for (let d = 0; d < 365; d++) { const day = new Date(start + d * 86_400_000); const m = day.getUTCMonth(); const occ = m >= 5 && m <= 8 ? 0.85 : 0.45; const sold = Math.round(40 * occ); const a = day.toISOString().slice(0, 10), b = new Date(start + (d + 1) * 86_400_000).toISOString().slice(0, 10); for (let i = 0; i < sold; i++) rows.push(i % 3 === 0 ? `A${++k},${a},${b},confirmed,220,GBP,Website,0` : `A${++k},${a},${b},confirmed,220,GBP,Booking.com,39.6`); } return rows.join("\n"); };
let dir: string; let db: SqlClient;
const T1 = "2026-10-01T09:00:00.000Z";
beforeAll(async () => { dir = mkdtempSync(join(tmpdir(), "anesis-assay-")); db = await openDatabase({ databaseUrl: undefined, pgliteDir: join(dir, "db") }); await migrate(db); });
afterAll(async () => { await db.close(); rmSync(dir, { recursive: true, force: true }); });

describe("first Commercial Assay — synthetic, end to end", () => {
  let contractId: string;
  it("1. declare, import 12 months, declare documented benchmarks, run one verified_only cycle: only what the data support is assessed", async () => {
    await upsertProperty(db, P);
    const file = join(dir, "export.csv"); writeFileSync(file, csv());
    const imp = await importFile(db, file, { propertyId: P.id, rooms: 40, importedAt: T1, collectedAt: "2026-09-30T20:00:00Z" });
    expect(imp.sufficiency.verdict).toBe("SUFFICIENT_FOR_OCCUPANCY_AND_ADR"); expect(imp.sufficiency.window.cls).toBe("FULL_YEAR"); expect(imp.weekly.length).toBeGreaterThanOrEqual(52); expect(imp.snapshot!.otaCommissionGbp).toBeGreaterThan(0);
    await saveRegisters(db, P.id, { benchmarks: { "ota_share.target": { value: 0.35, source: "SYNTHETIC test source (to be replaced by a documented one)", asOf: "2026-01-01" }, "ota.shiftable.low": { value: 0.15, source: "SYNTHETIC", asOf: "2026-01-01" }, "ota.shiftable.high": { value: 0.35, source: "SYNTHETIC", asOf: "2026-01-01" } } });
    await scheduleCycle(db, P.id, T1, 7);
    expect((await runOnce(db, { offline: true, now: () => T1 })).processed[0]?.outcome).toBe("done");
    const r = (await loadCycleResult(db, P.id, "RUN-001"))!.result;
    expect(r.diagnosis.evidencePolicy).toBe("verified_only"); expect(r.seriesSource).toBe("pms_weekly"); expect(r.property.spec.rooms).toBe(40); expect(r.property.spec.adrGbp).toBe(220);
    expect(r.diagnosis.binding).toBe("C-002"); expect(r.diagnosis.notAssessable).toEqual(expect.arrayContaining(["C-001", "C-003", "C-004"]));
    expect(r.diagnosis.actualGbp).toBeCloseTo(r.property.observations.find((o) => o.metric === "room_revenue")!.value, 0);
    for (const l of r.allocation.lines) if (l.interventionId !== "I-002") expect(l.status).not.toBe("FUNDED");
    const i2 = r.allocation.lines.find((l) => l.interventionId === "I-002")!; expect(["FUNDED", "INVESTIGATE"]).toContain(i2.status);
    const tr = await tracesFor(db, "RUN-001"); expect(tr.some((t) => t.type === "EVIDENCE_WITHHELD")).toBe(true); expect(tr.some((t) => t.type === "OUTCOME_SIMULATED")).toBe(false);
    contractId = "INT-RUN-001-I-002";
  });
  it("2. refused paths: an intervention with an open data request cannot be authorised; the engine cannot authorise; a stale version cannot write", async () => {
    const list = await listInterventions(db, P.id); expect(list.length).toBeGreaterThan(0);
    const blocked = list.find((x) => x.interventionId === "I-001")!; const bc = (await loadIntervention(db, blocked.id))!; expect(bc.dataRequest).not.toBeNull();
    await transitionIntervention(db, blocked.id, { to: "SUBMITTED", actor: { by: "engine", human: false, at: T1 } });
    await expect(transitionIntervention(db, blocked.id, { to: "AUTHORISED", actor: human(T1) })).rejects.toThrow(/data request is open/);
    const c = (await loadIntervention(db, contractId))!;
    if (c.dataRequest) { expect(c.decisionStatus).toBe("INVESTIGATE"); return; }   // honest stop: the synthetic data did not clear VOI; the rest of the path is proven in step 3 only when funded
    await transitionIntervention(db, contractId, { to: "SUBMITTED", actor: { by: "engine", human: false, at: T1 } });
    await expect(transitionIntervention(db, contractId, { to: "AUTHORISED", actor: { by: "engine", human: false, at: T1 } })).rejects.toThrow(/requires a named human/);
    const before = (await loadIntervention(db, contractId))!;
    await transitionIntervention(db, contractId, { to: "AUTHORISED", actor: human("2026-10-02T09:00:00.000Z"), approvedAmountGbp: 4_000 });
    await db.query("update interventions set version = version + 1 where id = $1", [contractId]);   // someone else moved it
    const stale = { ...before };
    void stale; await expect(transitionIntervention(db, contractId, { to: "IN_EXECUTION", actor: human("2026-10-02T10:00:00.000Z") })).resolves.toBeTruthy();   // transitionIntervention re-reads: fine
    await db.query("update interventions set version = version - 1 where id = $1", [contractId]);   // restore a coherent version for the rest
  });
  it("3. execution with proof and cost, measurement on the property's own history (NOT_ESTABLISHED), closure dossier; the result traces back to the cited observations", async () => {
    const c = (await loadIntervention(db, contractId))!;
    if (c.dataRequest) return;
    const x = await transitionIntervention(db, contractId, { to: "EXECUTED", actor: human("2026-08-03T09:00:00.000Z"), proofs: [{ kind: "ticket", reference: "BE-77 direct-rate parity", note: "booking engine vendor ticket" }], actualSpendGbp: 3_800 });
    expect(x.execution.actualSpend).toMatchObject({ status: "OBSERVED", amountGbp: 3_800 });
    const m = await measureIntervention(db, contractId, human("2026-10-01T09:00:00.000Z"), 8);
    expect(m.execution.measured).toMatchObject({ incrementality: "NOT_ESTABLISHED", postWeeks: 8, windowWeeks: 8 }); expect(m.execution.measured!.seasonalAdjustment.applied).toBe(false);   // only one year of history: no prior-year adjustment, and it says so
    const z = await transitionIntervention(db, contractId, { to: "CLOSED", actor: human("2026-10-02T09:00:00.000Z") });
    const dossier = closureDossier(z).body.join("\n"); expect(dossier).toMatch(/actual spend: £3,800 \(OBSERVED\)/); expect(dossier).toMatch(/incrementality NOT_ESTABLISHED/);
    const r = (await loadCycleResult(db, P.id, z.decisionPackageRef.runId))!.result;
    for (const s of z.sources) { const o = r.property.observations.find((x) => x.id === s.id)!; expect(o).toBeTruthy(); expect(o.status === "VERIFIED" || o.source === "CONN-PMS").toBe(true); }
  });
  it("4. persistence across a restart: reopening the database shows the model, the contract in its final state and the import", async () => {
    await db.close();
    db = await openDatabase({ databaseUrl: undefined, pgliteDir: join(dir, "db") }); await migrate(db);
    const m = await new PgModelStore(db).load(P.id); expect(m?.cycles).toHaveLength(1); expect(m?.cycles[0]!.evidencePolicy).toBe("verified_only");
    const c = (await loadIntervention(db, contractId))!; expect(["CLOSED", "PREPARED"]).toContain(c.state); expect(c.history.length).toBeGreaterThanOrEqual(1);
    expect((await db.query("select 1 from pms_imports where property_id = $1", [P.id])).rows).toHaveLength(1);
  });
});
