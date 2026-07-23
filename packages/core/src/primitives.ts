/**
 * Primitives du domaine ANESIS.
 * Types nominatifs (branded), argent en pence sterling, horodatage ISO, et le type `Check`
 * utilisé par tous les invariants. Aucune dépendance externe.
 */

/** Type nominatif : empêche de passer un MandateId là où on attend un TaskId. */
export type Brand<K, T> = K & { readonly __brand: T };

export type PropertyId = Brand<string, "PropertyId">;
export type MandateId = Brand<string, "MandateId">;
export type ThesisId = Brand<string, "ThesisId">;
export type LossLineId = Brand<string, "LossLineId">;
export type ObjectiveId = Brand<string, "ObjectiveId">;
export type TaskId = Brand<string, "TaskId">;
export type AgentRunId = Brand<string, "AgentRunId">;
export type ArtifactId = Brand<string, "ArtifactId">;
export type EventId = Brand<string, "EventId">;
export type NotificationId = Brand<string, "NotificationId">;
export type BlockerId = Brand<string, "BlockerId">;
export type ApprovalId = Brand<string, "ApprovalId">;
export type MeasurementId = Brand<string, "MeasurementId">;
export type OperatorId = Brand<string, "OperatorId">;
export type CorrelationId = Brand<string, "CorrelationId">;

/**
 * Argent : livre sterling UNIQUEMENT, stocké en pence entiers.
 * Jamais de flottant sur de la monnaie — on ne représente pas des demi-pence.
 * L'arithmétique passe TOUJOURS par les fonctions ci-dessous : l'accès direct à `.pence`
 * pour calculer est interdit ailleurs dans le monorepo.
 */
export interface Money {
  readonly currency: "GBP";
  readonly pence: number;
}

export const gbp = (pence: number): Money => {
  if (!Number.isInteger(pence)) {
    throw new Error(`Money.pence doit être un entier de pence, reçu: ${pence}`);
  }
  return { currency: "GBP", pence };
};

const assertGbp = (...ms: Money[]): void => {
  for (const m of ms) {
    if (m.currency !== "GBP") throw new Error(`Devise non supportée: ${String(m.currency)}`);
  }
};

export const addMoney = (a: Money, b: Money): Money => {
  assertGbp(a, b);
  return gbp(a.pence + b.pence);
};

export const subMoney = (a: Money, b: Money): Money => {
  assertGbp(a, b);
  return gbp(a.pence - b.pence);
};

export const sumMoney = (ms: readonly Money[]): Money => {
  assertGbp(...ms);
  return gbp(ms.reduce((s, m) => s + m.pence, 0));
};

/** Multiplication par un facteur. Arrondi au pence le plus proche (demi vers +∞, `Math.round`). */
export const mulMoney = (m: Money, factor: number): Money => {
  assertGbp(m);
  return gbp(Math.round(m.pence * factor));
};

/**
 * Répartit un montant selon des poids, sans perdre ni créer de pence (méthode du plus grand reste).
 * La somme des parts est EXACTEMENT égale au montant d'origine.
 */
export const allocateMoney = (m: Money, weights: readonly number[]): Money[] => {
  assertGbp(m);
  if (m.pence < 0) throw new Error("allocateMoney: montant négatif non supporté");
  if (weights.length === 0) throw new Error("allocateMoney: aucun poids fourni");
  if (weights.some((w) => w < 0)) throw new Error("allocateMoney: poids négatif");
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) throw new Error("allocateMoney: somme des poids doit être > 0");

  const raw = weights.map((w) => (m.pence * w) / total);
  const result = raw.map((r) => Math.floor(r));
  let remainder = m.pence - result.reduce((s, p) => s + p, 0);
  const byFraction = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);

  let k = 0;
  while (remainder > 0) {
    const entry = byFraction[k % byFraction.length];
    if (entry) {
      result[entry.i] = (result[entry.i] ?? 0) + 1;
      remainder -= 1;
    }
    k += 1;
  }
  return result.map((p) => gbp(p));
};

/** Horodatage ISO 8601 en UTC. */
export type Iso8601 = Brand<string, "Iso8601">;

export const iso = (d: Date | string = new Date()): Iso8601 => {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) throw new Error(`Date invalide: ${String(d)}`);
  return date.toISOString() as Iso8601;
};

export const isoToMs = (t: Iso8601): number => new Date(t).getTime();

/** Décale un horodatage de `ms` millisecondes (négatif pour reculer). Utile aux tests et au domaine. */
export const isoOffset = (base: Iso8601, ms: number): Iso8601 => iso(new Date(isoToMs(base) + ms));

/** Écart en millisecondes `to - from` (positif si `to` est postérieur). */
export const msBetween = (from: Iso8601, to: Iso8601): number => isoToMs(to) - isoToMs(from);

/** Résultat d'un contrôle d'invariant. */
export interface Violation {
  readonly code: string;
  readonly message: string;
}

export type Check = { readonly ok: true } | { readonly ok: false; readonly violations: readonly Violation[] };

export const ok: Check = { ok: true };

export const fail = (...violations: Violation[]): Check => ({ ok: false, violations });

/** Agrège plusieurs contrôles ; ok seulement si tous le sont. */
export const all = (...checks: Check[]): Check => {
  const violations = checks.flatMap((c) => (c.ok ? [] : c.violations));
  return violations.length === 0 ? ok : { ok: false, violations };
};
