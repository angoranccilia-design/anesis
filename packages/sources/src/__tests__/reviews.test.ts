import { describe, expect, it } from "vitest";
import { reviewsSource } from "../reviews.js";
import { fakeHttp } from "./fake-http.js";

const prop = { id: "p", name: "The Old Rectory", website: null };
const src = reviewsSource({ token: "T", actorId: "compass~crawler-google-places" });

describe("reviewsSource (Apify) — extraction défensive", () => {
  it("lit reviewsCount / totalScore du premier item du dataset", async () => {
    const http = fakeHttp({ postJson: () => ({ status: 200, body: [{ reviewsCount: 42, totalScore: 4.3 }] }) });
    expect(await src.collect(prop, { http })).toEqual({ reviewCount: 42, reviewRating: 4.3 });
  });

  it("gère des noms de champs alternatifs (user_ratings_total / rating)", async () => {
    const http = fakeHttp({ postJson: () => ({ status: 200, body: [{ user_ratings_total: 10, rating: 3.9 }] }) });
    expect(await src.collect(prop, { http })).toEqual({ reviewCount: 10, reviewRating: 3.9 });
  });

  it("dataset vide ou erreur → aucune observation", async () => {
    expect(await src.collect(prop, { http: fakeHttp({ postJson: () => ({ status: 200, body: [] }) }) })).toEqual({});
    expect(await src.collect(prop, { http: fakeHttp({ postJson: () => ({ status: 429, body: "" }) }) })).toEqual({});
  });
});
