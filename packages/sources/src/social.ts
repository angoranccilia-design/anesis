/**
 * Source « réseaux sociaux » — Instagram/Facebook via Apify (même infrastructure que reviews.ts,
 * pas de nouveau fournisseur). Lance l'acteur en synchrone, lit le premier item, extraction DÉFENSIVE
 * (les noms de champs varient selon l'acteur). Alimente le 5e pilier du Anesis Revenue Leak Index™.
 * Absente du fetcher tant que `APIFY_SOCIAL_ACTOR` n'est pas fourni → pilier social simplement exclu.
 */
import type { SignalSource } from "./types.js";

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

function extract(item: Record<string, unknown>): {
  instagramFollowers?: number;
  facebookFollowers?: number;
  postingFrequencyPerMonth?: number;
  avgEngagementRate?: number;
  hasVideoContent?: boolean;
} {
  const ig = num(item.instagramFollowers) ?? num(item.followersCount) ?? num(item.followers);
  const fb = num(item.facebookFollowers) ?? num(item.likes) ?? num(item.fanCount);
  const freq = num(item.postingFrequencyPerMonth) ?? num(item.postsPerMonth) ?? num(item.postsCount);
  const eng = num(item.avgEngagementRate) ?? num(item.engagementRate);
  const videos = num(item.videosCount) ?? num(item.reelsCount);

  const out: {
    instagramFollowers?: number;
    facebookFollowers?: number;
    postingFrequencyPerMonth?: number;
    avgEngagementRate?: number;
    hasVideoContent?: boolean;
  } = {};
  if (ig !== undefined) out.instagramFollowers = ig;
  if (fb !== undefined) out.facebookFollowers = fb;
  if (freq !== undefined) out.postingFrequencyPerMonth = freq;
  if (eng !== undefined) out.avgEngagementRate = eng;
  if (typeof item.hasVideoContent === "boolean") out.hasVideoContent = item.hasVideoContent;
  else if (videos !== undefined) out.hasVideoContent = videos > 0;
  return out;
}

export interface SocialSourceOptions {
  readonly token: string;
  /** Acteur Apify de scraping Instagram/Facebook. */
  readonly actorId: string;
  /** Construit l'input de l'acteur à partir de l'établissement (dépend de l'acteur choisi). */
  buildInput?: (property: { name: string; website: string | null }) => unknown;
}

export const socialSource = (opts: SocialSourceOptions): SignalSource => ({
  name: "social",
  collect: async (property, { http }) => {
    const input = opts.buildInput ? opts.buildInput(property) : { search: property.name, resultsLimit: 1 };
    const url = `https://api.apify.com/v2/acts/${opts.actorId}/run-sync-get-dataset-items?token=${opts.token}`;
    const res = await http.postJson(url, input);
    if (res.status < 200 || res.status >= 300) return {};
    const items = (await res.json()) as unknown;
    const first = Array.isArray(items) ? (items[0] as Record<string, unknown> | undefined) : undefined;
    return first ? extract(first) : {};
  },
});
