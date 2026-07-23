/**
 * Source « vitesse du site » — Google PageSpeed Insights (clé API déjà active).
 * Extrait le temps de réponse serveur (ms) de l'audit `server-response-time`.
 */
import type { SignalSource } from "./types.js";

interface PsiAudit {
  numericValue?: number;
}
interface PsiResponse {
  lighthouseResult?: { audits?: Record<string, PsiAudit> };
}

function extractResponseMs(data: unknown): number | null {
  const audits = (data as PsiResponse)?.lighthouseResult?.audits;
  const v = audits?.["server-response-time"]?.numericValue;
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;
}

export const pageSpeedSource = (apiKey: string): SignalSource => ({
  name: "pagespeed",
  collect: async (property, { http }) => {
    if (!property.website) return {};
    const url =
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed" +
      `?url=${encodeURIComponent(property.website)}&category=performance&key=${apiKey}`;
    const res = await http.get(url);
    if (res.status !== 200) return {};
    const ms = extractResponseMs(await res.json());
    return ms == null ? {} : { siteResponseMs: ms };
  },
});
