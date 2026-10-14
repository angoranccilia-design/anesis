import { describe, it, expect } from "vitest";
import { runCycle, COUNTRY_HOUSE_34, newModel, appendCycle, cycleInputFromModel, serializeModel, parseModel, MemoryModelStore, modelSummary, recall } from "../index.js";

const T1 = "2026-10-14T09:00:00Z", T2 = "2027-01-14T09:00:00Z";

describe("persisted property model — the Anesis Commercial Constraint as a durable asset", () => {
  it("survives a restart: a model saved after one measured cycle gives the next cycle its memory and calibration", async () => {
    const store = new MemoryModelStore();
    let m = newModel(COUNTRY_HOUSE_34, T1);
    const r1 = runCycle({ seed: 1, budgetGbp: 16_000, now: T1, ...cycleInputFromModel(m) });
    m = appendCycle(m, r1, { id: "RUN-001", at: T1 });
    await store.save(m);
    expect(m.cycles).toHaveLength(1); expect(m.cycles[0]!.preregistration?.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(m.cycles[0]!.budgets.every((b) => b.budgetStatus === "PROPOSED" || b.budgetStatus === "REJECTED")).toBe(true); expect(m.cycles[0]!.budgets.some((b) => b.budgetStatus === "PROPOSED" && b.approvedGbp === null)).toBe(true);
    expect(m.calibration).toHaveLength(1); expect(m.cycles[0]!.simulated).toBe(true);

    // "restart": a fresh store instance loads the serialised model
    const loaded = parseModel(serializeModel((await store.load(COUNTRY_HOUSE_34.id))!));
    expect(loaded.memory.decisions).toHaveLength(1);
    const input = cycleInputFromModel(loaded);
    expect(input.cycleNumber).toBe(2); expect(input.memory).toHaveLength(1);
    const r2 = runCycle({ seed: 2, budgetGbp: 16_000, now: T2, ...input });
    const m2 = appendCycle(loaded, r2, { id: "RUN-002", at: T2 });
    expect(m2.cycles).toHaveLength(2); expect(m2.calibration).toHaveLength(2);
    // dated recall comes from the persisted memory, not from the process
    const rc = recall(m2.memory, "I-001", T2);
    expect(rc.timesConsidered).toBeGreaterThanOrEqual(2); expect(rc.statement).toMatch(/considered/i);
    expect(r2.calibrationBefore).not.toEqual(r1.calibrationBefore);
    expect(modelSummary(m2, T2)).toMatch(/2 cycles over 92 days, 2 learning records/);
  });
  it("refuses a model from another schema version or an incomplete file instead of guessing", () => {
    expect(() => parseModel(JSON.stringify({ schemaVersion: 0, propertyId: "x" }))).toThrow(/schema 0/);
    expect(() => parseModel(JSON.stringify({ schemaVersion: 1, propertyId: "x" }))).toThrow(/incomplete/);
  });
  it("records a spec change in the history and keeps the latest spec as the model's description", () => {
    let m = newModel(COUNTRY_HOUSE_34, T1);
    const r = runCycle({ seed: 1, budgetGbp: 16_000, now: T1, measure: false, spec: { convMobile: COUNTRY_HOUSE_34.convMobile * 1.5 } });
    m = appendCycle(m, r, { id: "RUN-001", at: T1 });
    expect(m.specHistory).toHaveLength(2); expect(m.spec.convMobile).toBeCloseTo(COUNTRY_HOUSE_34.convMobile * 1.5);
    expect(m.cycles[0]!.measurement).toBeNull(); expect(m.calibration).toHaveLength(0);
  });
});
