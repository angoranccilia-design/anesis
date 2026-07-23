import { describe, expect, it } from "vitest";
import { buildProspectFetcher, runApifyPreflight } from "../wiring.js";
import { fakeHttp } from "./fake-http.js";

const prop = { id: "p", name: "P", website: "https://p.co.uk" };

describe("buildProspectFetcher — secrets lus depuis l'environnement, jamais en argument", () => {
  it("n'active que HTML si aucun secret n'est présent", async () => {
    const http = fakeHttp({ get: () => ({ status: 200, body: "<a href='https://booking.com/x'>b</a>" }) });
    const fetchObs = buildProspectFetcher({}, http); // env vide
    const raw = await fetchObs(prop);
    expect(raw.otaBadges).toContain("booking.com");
    expect(raw.siteResponseMs).toBeUndefined(); // PageSpeed inactif (pas de clé)
  });

  it("active PageSpeed + Avis quand les variables d'env sont fournies", async () => {
    const http = fakeHttp({
      get: (url) =>
        url.includes("pagespeedonline")
          ? { status: 200, body: { lighthouseResult: { audits: { "server-response-time": { numericValue: 700 } } } } }
          : { status: 200, body: "<html>no ota</html>" },
      postJson: () => ({ status: 200, body: [{ reviewsCount: 15, totalScore: 4.0 }] }),
    });
    const fetchObs = buildProspectFetcher(
      { PAGESPEED_API_KEY: "psi-key", APIFY_TOKEN: "tok", APIFY_REVIEWS_ACTOR: "compass~crawler-google-places" },
      http,
    );
    const raw = await fetchObs(prop);
    expect(raw.siteResponseMs).toBe(700);
    expect(raw.reviewCount).toBe(15);
    expect(raw.reviewRating).toBe(4.0);
  });
});

describe("runApifyPreflight — lit APIFY_TOKEN dans l'env", () => {
  it("refuse si le token n'est pas dans l'environnement (jamais dans un message)", async () => {
    await expect(runApifyPreflight({}, fakeHttp({}))).rejects.toThrow(/APIFY_TOKEN absent/);
  });

  it("retourne le résultat du pré-vol quand le token est présent en env", async () => {
    const http = fakeHttp({
      get: () => ({ status: 200, body: { data: { current: { monthlyUsageUsd: 5 }, limits: { maxMonthlyUsageUsd: 49 } } } }),
    });
    const pf = await runApifyPreflight({ APIFY_TOKEN: "tok" }, http, 150);
    expect(pf.ok).toBe(true);
    expect(pf.remainingUsd).toBeCloseTo(44);
  });
});
