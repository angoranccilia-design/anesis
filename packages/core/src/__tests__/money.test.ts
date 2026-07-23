import { describe, expect, it } from "vitest";
import { addMoney, allocateMoney, gbp, mulMoney, subMoney, sumMoney } from "../primitives.js";

describe("arithmétique Money (GBP, pence entiers)", () => {
  it("addition et soustraction", () => {
    expect(addMoney(gbp(1_700_000), gbp(1_100_000))).toEqual(gbp(2_800_000));
    expect(subMoney(gbp(1_700_000), gbp(1_100_000))).toEqual(gbp(600_000));
  });

  it("sumMoney additionne une liste (ex: total récupérable d'une thèse)", () => {
    expect(sumMoney([gbp(1_730_000), gbp(1_100_000), gbp(430_000)])).toEqual(gbp(3_260_000));
    expect(sumMoney([])).toEqual(gbp(0));
  });

  it("mulMoney arrondit au pence le plus proche", () => {
    expect(mulMoney(gbp(1_000), 0.15)).toEqual(gbp(150));
    expect(mulMoney(gbp(101), 0.5)).toEqual(gbp(51)); // 50.5 → 51 (demi vers +∞)
  });

  it("allocateMoney répartit sans perdre ni créer de pence", () => {
    const parts = allocateMoney(gbp(100), [1, 1, 1]); // 100/3
    expect(parts.map((p) => p.pence)).toEqual([34, 33, 33]);
    expect(sumMoney(parts)).toEqual(gbp(100));
  });

  it("allocateMoney respecte des poids inégaux et conserve le total", () => {
    const parts = allocateMoney(gbp(1_000), [70, 30]);
    expect(sumMoney(parts)).toEqual(gbp(1_000));
    expect(parts.map((p) => p.pence)).toEqual([700, 300]);
  });

  it("refuse les poids invalides", () => {
    expect(() => allocateMoney(gbp(100), [])).toThrow();
    expect(() => allocateMoney(gbp(100), [0, 0])).toThrow(/> 0/);
    expect(() => allocateMoney(gbp(100), [-1, 2])).toThrow(/négatif/);
  });
});
