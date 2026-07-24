/**
 * Pré-vol Apify — À EXÉCUTER AVANT le lot du 3 août.
 * Un lot de 150 propriétés = 150 exécutions de l'acteur d'avis. Cette vérification interroge le compte
 * Apify (limites mensuelles vs usage courant) pour confirmer qu'un tel lot reste dans une fenêtre de
 * coût raisonnable — plutôt que de le découvrir après coup. Ne lance PAS le lot ; elle informe.
 */
import type { HttpClient } from "./http.js";

export interface ApifyPreflight {
  readonly ok: boolean;
  readonly monthlyUsageUsd: number | null;
  readonly monthlyLimitUsd: number | null;
  readonly remainingUsd: number | null;
  readonly note: string;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export async function apifyPreflight(token: string, http: HttpClient, batchSize = 150): Promise<ApifyPreflight> {
  const res = await http.get(`https://api.apify.com/v2/users/me/limits?token=${token}`);
  if (res.status !== 200) {
    return { ok: false, monthlyUsageUsd: null, monthlyLimitUsd: null, remainingUsd: null, note: `Apify a répondu ${res.status} — token/plan à vérifier` };
  }
  const body = (await res.json()) as { data?: { current?: Record<string, unknown>; limits?: Record<string, unknown> } };
  const usage = num(body.data?.current?.["monthlyUsageUsd"]);
  const limit = num(body.data?.limits?.["maxMonthlyUsageUsd"]);
  const remaining = usage != null && limit != null ? Math.max(0, limit - usage) : null;
  return {
    ok: remaining == null ? false : remaining > 0,
    monthlyUsageUsd: usage,
    monthlyLimitUsd: limit,
    remainingUsd: remaining,
    note:
      remaining == null
        ? "Impossible de lire l'usage/limite Apify — confirmer manuellement avant le lot."
        : `Reste ~$${remaining.toFixed(2)} ce mois-ci pour ~${batchSize} exécutions d'avis. Vérifier le coût par exécution de l'acteur choisi.`,
  };
}
