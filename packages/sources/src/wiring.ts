/**
 * Câblage prêt à l'emploi — les secrets viennent UNIQUEMENT de l'environnement (`.env` non commité),
 * jamais d'un argument tapé dans un message. Rien ici ne reçoit un token en clair : on lit `process.env`.
 * Seul le RÉSULTAT du pré-vol (reste en dollars) est destiné à remonter ; jamais le token.
 */
import type { RawObservations } from "@anesis/assessment";
import { apifyPreflight, type ApifyPreflight } from "./apify.js";
import { composeFetchObservations } from "./compose.js";
import { fetchHttpClient, type HttpClient } from "./http.js";
import { htmlSource } from "./html.js";
import { pageSpeedSource } from "./pagespeed.js";
import { reviewsSource } from "./reviews.js";
import type { PropertyRef, SignalSource } from "./types.js";

export type SecretEnv = Record<string, string | undefined>;

/**
 * Construit `fetchObservations` pour l'underwriter à partir de l'environnement.
 * - `HTML` est toujours actif (aucun secret requis).
 * - `PageSpeed` s'active si `PAGESPEED_API_KEY` est présent.
 * - `Avis (Apify)` s'active si `APIFY_TOKEN` ET `APIFY_REVIEWS_ACTOR` sont présents.
 * Une source dont le secret manque est simplement absente (la donnée devient confiance `none`).
 */
export function buildProspectFetcher(
  env: SecretEnv = process.env,
  http: HttpClient = fetchHttpClient,
): (property: PropertyRef) => Promise<RawObservations> {
  const sources: SignalSource[] = [];
  if (env.PAGESPEED_API_KEY) sources.push(pageSpeedSource(env.PAGESPEED_API_KEY));
  if (env.APIFY_TOKEN && env.APIFY_REVIEWS_ACTOR) {
    sources.push(reviewsSource({ token: env.APIFY_TOKEN, actorId: env.APIFY_REVIEWS_ACTOR }));
  }
  sources.push(htmlSource());
  return composeFetchObservations(sources, http);
}

/** Lit `APIFY_TOKEN` depuis l'environnement et lance le pré-vol. Le token ne quitte jamais l'env. */
export async function runApifyPreflight(
  env: SecretEnv = process.env,
  http: HttpClient = fetchHttpClient,
  batchSize = 150,
): Promise<ApifyPreflight> {
  const token = env.APIFY_TOKEN;
  if (!token) {
    throw new Error("APIFY_TOKEN absent de l'environnement — placez-le dans .env (non commité), jamais dans un message.");
  }
  return apifyPreflight(token, http, batchSize);
}
