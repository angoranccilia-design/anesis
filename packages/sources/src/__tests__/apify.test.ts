import { describe, expect, it } from "vitest";
import { apifyPreflight } from "../apify.js";
import { fakeHttp } from "./fake-http.js";

describe("apifyPreflight — pré-vol quota avant le lot du 4 août", () => {
  it("calcule le reste mensuel et confirme si positif", async () => {
    const http = fakeHttp({
      get: () => ({ status: 200, body: { data: { current: { monthlyUsageUsd: 12.5 }, limits: { maxMonthlyUsageUsd: 49 } } } }),
    });
    const pf = await apifyPreflight("T", http, 150);
    expect(pf.ok).toBe(true);
    expect(pf.remainingUsd).toBeCloseTo(36.5);
    expect(pf.note).toContain("150");
  });

  it("token/plan invalide → non ok, note explicite", async () => {
    const http = fakeHttp({ get: () => ({ status: 401, body: "" }) });
    const pf = await apifyPreflight("BAD", http);
    expect(pf.ok).toBe(false);
    expect(pf.note).toContain("401");
  });
});
