/**
 * Source « HTML » — simple récupération de la page, aucune source payante.
 * Détecte les badges/liens OTA (Booking/Expedia/Tripadvisor…), un pixel de suivi, et compte les
 * mentions d'un rôle marketing interne (page équipe/à propos). Ces deux derniers restent des proxies
 * grossiers → confiance faible côté score → souvent `needs_review`, ce qui est le comportement voulu.
 */
import type { SignalSource } from "./types.js";

const OTA_HOSTS = ["booking.com", "expedia.", "tripadvisor.", "airbnb.", "hotels.com", "agoda.", "trivago."];
const MARKETING_KEYWORDS = ["head of marketing", "marketing manager", "marketing director", "communications manager", "brand manager", "responsable marketing"];

export function detectOtaBadges(html: string): string[] {
  const found = new Set<string>();
  for (const host of OTA_HOSTS) {
    if (html.includes(host)) found.add(host.replace(/\.$/, ""));
  }
  return [...found];
}

export function countMarketingMentions(html: string): number {
  return MARKETING_KEYWORDS.reduce((n, kw) => n + (html.includes(kw) ? 1 : 0), 0);
}

export function hasTrackingPixel(html: string): boolean {
  return /gtag\(|googletagmanager|fbq\(|facebook\.com\/tr|analytics\.js|gtm\.js/.test(html);
}

export const htmlSource = (): SignalSource => ({
  name: "html",
  collect: async (property, { http }) => {
    if (!property.website) return {};
    const res = await http.get(property.website);
    if (res.status !== 200) return {};
    const html = (await res.text()).toLowerCase();

    const out: { hasTrackingPixel: boolean; otaBadges?: string[]; teamPageMarketingMentions?: number } = {
      hasTrackingPixel: hasTrackingPixel(html),
    };
    const badges = detectOtaBadges(html);
    if (badges.length > 0) out.otaBadges = badges;
    const mentions = countMarketingMentions(html);
    if (mentions > 0) out.teamPageMarketingMentions = mentions;
    return out;
  },
});
