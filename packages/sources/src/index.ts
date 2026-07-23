/** @anesis/sources — adaptateurs IO derrière l'interface RawObservations de l'évaluation. */
export { fetchHttpClient, type HttpClient, type HttpResponse } from "./http.js";
export type { PropertyRef, SignalSource, SourceContext } from "./types.js";
export { pageSpeedSource } from "./pagespeed.js";
export { reviewsSource, type ReviewsSourceOptions } from "./reviews.js";
export { htmlSource, detectOtaBadges, countMarketingMentions, hasTrackingPixel } from "./html.js";
export { composeFetchObservations } from "./compose.js";
export { apifyPreflight, type ApifyPreflight } from "./apify.js";
export { buildProspectFetcher, runApifyPreflight, type SecretEnv } from "./wiring.js";
