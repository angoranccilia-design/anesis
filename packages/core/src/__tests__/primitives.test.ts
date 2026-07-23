import { describe, expect, it } from "vitest";
import { all, fail, gbp, iso, ok } from "../primitives.js";

describe("Money (GBP en pence)", () => {
  it("accepte un entier de pence", () => {
    expect(gbp(14_000)).toEqual({ currency: "GBP", pence: 14_000 });
  });

  it("refuse un montant non entier (pas de demi-pence)", () => {
    expect(() => gbp(140.5)).toThrow(/entier de pence/);
  });
});

describe("iso", () => {
  it("normalise une date en ISO UTC", () => {
    expect(iso("2026-08-04T00:00:00Z")).toBe("2026-08-04T00:00:00.000Z");
  });

  it("rejette une date invalide", () => {
    expect(() => iso("pas-une-date")).toThrow(/Date invalide/);
  });
});

describe("Check / all", () => {
  it("all() est ok si tout est ok", () => {
    expect(all(ok, ok)).toEqual(ok);
  });

  it("all() agrège les violations", () => {
    const r = all(ok, fail({ code: "A", message: "a" }), fail({ code: "B", message: "b" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.violations.map((v) => v.code)).toEqual(["A", "B"]);
  });
});
