/**
 * Jetons de lien magique — logique PURE (aucune I/O, aucun accès DB). On stocke UNIQUEMENT le hash
 * SHA-256 du jeton ; le clair ne vit que dans le lien envoyé à l'opérateur. La validité (expiration,
 * consommation, correspondance) est décidée ici, jamais en dupliqué côté SQL.
 */
import { createHash, randomBytes } from "node:crypto";

/** Durée de vie d'un lien magique : 15 minutes. */
export const MAGIC_LINK_TTL_MS = 15 * 60_000;
/** Durée de vie d'une session ouverte après consommation : 7 jours. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60_000;

export type MagicLinkPurpose = "login";

/** Jeton en clair (à mettre dans l'URL) + son hash (seul persisté). */
export interface IssuedToken {
  readonly token: string;
  readonly tokenHash: string;
}

export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

/** Émet un jeton aléatoire (256 bits, base64url). L'aléa est injectable pour des tests déterministes. */
export const issueToken = (bytes: (n: number) => Buffer = randomBytes): IssuedToken => {
  const token = bytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
};

export interface StoredToken {
  readonly tokenHash: string;
  readonly expiresAtMs: number;
  readonly consumedAtMs: number | null;
}

export type VerifyOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: "not_found" | "consumed" | "expired" | "mismatch" };

/** Décide si un jeton présenté est utilisable, à l'instant `nowMs`. Ordre : présence → consommation → expiration → correspondance. */
export function verifyToken(stored: StoredToken | null, presentedToken: string, nowMs: number): VerifyOutcome {
  if (!stored) return { ok: false, code: "not_found" };
  if (stored.consumedAtMs != null) return { ok: false, code: "consumed" };
  if (nowMs > stored.expiresAtMs) return { ok: false, code: "expired" };
  if (stored.tokenHash !== hashToken(presentedToken)) return { ok: false, code: "mismatch" };
  return { ok: true };
}
