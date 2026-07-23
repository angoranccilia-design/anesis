import { describe, expect, it } from "vitest";
import { pageSpeedSource } from "../pagespeed.js";
import { fakeHttp } from "./fake-http.js";

const prop = { id: "p", name: "P", website: "https://p.co.uk" };

describe("pageSpeedSource", () => {
  it("extrait le temps de réponse serveur (arrondi) depuis PSI", async () => {
    const http = fakeHttp({
      get: () => ({ status: 200, body: { lighthouseResult: { audits: { "server-response-time": { numericValue: 820.4 } } } } }),
    });
    expect(await pageSpeedSource("KEY").collect(prop, { http })).toEqual({ siteResponseMs: 820 });
  });

  it("sans site web → aucune observation", async () => {
    const http = fakeHttp({});
    expect(await pageSpeedSource("KEY").collect({ ...prop, website: null }, { http })).toEqual({});
  });

  it("réponse non-200 → aucune observation (isolée)", async () => {
    const http = fakeHttp({ get: () => ({ status: 500, body: "" }) });
    expect(await pageSpeedSource("KEY").collect(prop, { http })).toEqual({});
  });
});
