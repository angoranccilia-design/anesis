/**
 * Source « avis » — Apify/Outscraper (déjà configuré côté KAIROS, réutilisé tel quel).
 * Lance l'acteur en synchrone et lit le premier item du dataset. Extraction DÉFENSIVE des champs
 * (les noms varient selon l'acteur : reviewsCount/reviews_count, totalScore/rating…).
 *
 * ⚠️ Avant le lot du 3 août : confirmer le quota/coût par requête du plan Apify (voir apify.ts).
 * Un lot de 150 propriétés doit rester dans une fenêtre de coût raisonnable, vérifiée AVANT lancement.
 */
import type { SignalSource } from "./types.js";

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

function extract(item: Record<string, unknown>): { reviewCount?: number; reviewRating?: number } {
  const count = num(item.reviewsCount) ?? num(item.reviews_count) ?? num(item.reviewCount) ?? num(item.user_ratings_total);
  const rating = num(item.totalScore) ?? num(item.rating) ?? num(item.averageRating) ?? num(item.stars);
  const out: { reviewCount?: number; reviewRating?: number } = {};
  if (count !== undefined) out.reviewCount = count;
  if (rating !== undefined) out.reviewRating = rating;
  return out;
}

export interface ReviewsSourceOptions {
  readonly token: string;
  /** Acteur Apify à lancer (ex: "compass~crawler-google-places"). */
  readonly actorId: string;
  /** Construit l'input de l'acteur à partir de l'établissement (dépend de l'acteur choisi). */
  buildInput?: (property: { name: string; website: string | null }) => unknown;
}

export const reviewsSource = (opts: ReviewsSourceOptions): SignalSource => ({
  name: "reviews",
  collect: async (property, { http }) => {
    const input = opts.buildInput
      ? opts.buildInput(property)
      : { searchStringsArray: [property.name], maxReviews: 0, maxItems: 1 };
    const url = `https://api.apify.com/v2/acts/${opts.actorId}/run-sync-get-dataset-items?token=${opts.token}`;
    const res = await http.postJson(url, input);
    if (res.status < 200 || res.status >= 300) return {};
    const items = (await res.json()) as unknown;
    const first = Array.isArray(items) ? (items[0] as Record<string, unknown> | undefined) : undefined;
    return first ? extract(first) : {};
  },
});
