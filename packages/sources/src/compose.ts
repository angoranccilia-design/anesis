/**
 * Compose plusieurs SignalSource en une fonction `fetchObservations` prête pour l'underwriter.
 * Chaque source tourne indépendamment ; une source qui échoue contribue `{}` (isolée) au lieu de faire
 * échouer tout l'établissement — la donnée manquante devient simplement une confiance `none` côté score.
 */
import type { RawObservations } from "@anesis/assessment";
import { fetchHttpClient, type HttpClient } from "./http.js";
import type { PropertyRef, SignalSource } from "./types.js";

export function composeFetchObservations(
  sources: readonly SignalSource[],
  http: HttpClient = fetchHttpClient,
): (property: PropertyRef) => Promise<RawObservations> {
  return async (property: PropertyRef): Promise<RawObservations> => {
    const partials = await Promise.all(
      sources.map((source) => source.collect(property, { http }).catch(() => ({}) as Partial<RawObservations>)),
    );
    return Object.assign({}, ...partials) as RawObservations;
  };
}
