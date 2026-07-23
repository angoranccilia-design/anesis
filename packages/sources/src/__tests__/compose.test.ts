import { describe, expect, it } from "vitest";
import { collect, score } from "@anesis/assessment";
import { composeFetchObservations } from "../compose.js";
import type { SignalSource } from "../types.js";
import { fakeHttp } from "./fake-http.js";

const prop = { id: "p", name: "P", website: "https://p.co.uk" };

const speed: SignalSource = { name: "speed", collect: async () => ({ siteResponseMs: 1600 }) };
const reviews: SignalSource = { name: "reviews", collect: async () => ({ reviewCount: 20, reviewRating: 3.9 }) };
const structured: SignalSource = {
  name: "structured",
  collect: async () => ({ structuredRoomCount: 30, listedNightlyRatePence: 20_000, otaSharePctHint: 60 }),
};
const boom: SignalSource = {
  name: "boom",
  collect: async () => {
    throw new Error("source down");
  },
};

describe("composeFetchObservations", () => {
  it("fusionne les partiels et ISOLE une source qui échoue", async () => {
    const fetchObs = composeFetchObservations([speed, reviews, boom], fakeHttp({}));
    const raw = await fetchObs(prop);
    expect(raw).toEqual({ siteResponseMs: 1600, reviewCount: 20, reviewRating: 3.9 }); // 'boom' n'a rien cassé
  });

  it("bout-en-bout : les observations composées nourrissent le score (qualified)", async () => {
    const fetchObs = composeFetchObservations([speed, reviews, structured], fakeHttp({}));
    const raw = await fetchObs(prop);
    const assessment = score(collect(raw));
    expect(assessment.decision).toBe("qualified");
    expect(assessment.leakIndex).toBeGreaterThan(0);
  });
});
