import { describe, expect, it } from "vitest";
import { collect } from "../collect.js";
import { score } from "../score.js";
import type { RawObservations } from "../signals.js";

const base: RawObservations = {
  siteResponseMs: 800,
  reviewCount: 60,
  reviewRating: 4.2,
  otaBadges: ["booking.com", "expedia"],
  hasTrackingPixel: true,
  structuredRoomCount: 30,
  listedNightlyRatePence: 20_000,
  otaSharePctHint: 55,
};

const run = (raw: RawObservations) => score(collect(raw));

describe("Pilier 5 — réseaux sociaux (Anesis Revenue Leak Index™)", () => {
  it("présence sociale nulle/faible → forte fuite sociale, incluse au calcul (5 piliers)", () => {
    const a = run({ ...base, instagramFollowers: 100, facebookFollowers: 0, postingFrequencyPerMonth: 0, avgEngagementRate: 0, hasVideoContent: false });
    expect(a.subScores.social).not.toBeNull();
    expect(a.subScores.social!).toBeGreaterThanOrEqual(90); // quasi tout manque = fuite maximale
  });

  it("contenu fort MAIS site lent : la fuite est captée par le pilier vitesse, pas doublée par le social", () => {
    const a = run({
      ...base,
      siteResponseMs: 3200, // site lent → forte fuite vitesse
      instagramFollowers: 25_000,
      postingFrequencyPerMonth: 20,
      avgEngagementRate: 6,
      hasVideoContent: true, // présence sociale forte → faible fuite sociale
    });
    expect(a.subScores.speed).toBeGreaterThanOrEqual(80); // le site lent est bien pénalisé…
    expect(a.subScores.social!).toBeLessThanOrEqual(15); // …mais pas re-pénalisé par le social (pas de double-comptage)
  });

  it("données sociales ABSENTES → pilier exclu (social = null), pas de « fuite maximale »", () => {
    const a = run(base); // aucun champ social
    expect(a.subScores.social).toBeNull();
    // le leakIndex reste calculé sur les 4 piliers historiques (repondération sans social).
    const expected4 = Math.round(0.25 * a.subScores.speed + 0.25 * a.subScores.reviews + 0.3 * a.subScores.ota + 0.2 * a.subScores.retargeting);
    expect(a.leakIndex).toBe(expected4);
  });

  it("est déterministe : mêmes données sociales → même sous-score", () => {
    const raw = { ...base, instagramFollowers: 4000, postingFrequencyPerMonth: 6, avgEngagementRate: 2, hasVideoContent: false };
    expect(run(raw).subScores.social).toBe(run(raw).subScores.social);
  });
});
