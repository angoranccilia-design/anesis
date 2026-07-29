/**
 * Service d'authentification par lien magique, ouvert à TOUT opérateur (founder ou operator).
 * Deux étapes : `requestMagicLink` (émet un jeton, l'envoie par email) puis `consumeMagicLink`
 * (valide, consomme une seule fois, ouvre une session). `resolveSession` relit une session active.
 *
 * Toutes les dépendances non déterministes (horloge, aléa, ids) sont injectables → tests reproductibles.
 * Tables : `magic_link_tokens`, `sessions` (migration 0011_auth.sql), globales, hors RLS mandat.
 */
import { randomUUID } from "node:crypto";
import type { SqlClient } from "@anesis/db";
import type { Operator, OperatorId, OperatorRole } from "@anesis/core";
import { asId } from "@anesis/core/unsafe";
import { MAGIC_LINK_TTL_MS, SESSION_TTL_MS, hashToken, issueToken, verifyToken, type StoredToken } from "./token.js";
import type { Mailer } from "./mailer.js";

export interface AuthDeps {
  readonly nowMs?: number;
  readonly uid?: (prefix: string) => string;
  readonly bytes?: (n: number) => Buffer;
}

const resolveDeps = (deps: AuthDeps) => ({
  nowMs: deps.nowMs ?? Date.now(),
  uid: deps.uid ?? ((p: string) => `${p}-${randomUUID()}`),
  bytes: deps.bytes,
});

export interface RequestMagicLinkInput {
  readonly email: string;
  /** Origine de l'app pour construire le lien, ex. `https://app.anesisacquisition.com`. */
  readonly baseUrl: string;
}

export interface RequestMagicLinkResult {
  /** Toujours vrai — la réponse est identique que l'email soit connu ou non (anti-énumération). */
  readonly requested: true;
  /** Un email a-t-il réellement été (tenté d')envoyé (c.-à-d. l'opérateur existe). */
  readonly delivered: boolean;
  readonly operatorId: OperatorId | null;
}

/** Émet et envoie un lien magique. Ne révèle jamais si l'email correspond à un opérateur connu. */
export async function requestMagicLink(
  client: SqlClient,
  mailer: Mailer,
  input: RequestMagicLinkInput,
  deps: AuthDeps = {},
): Promise<RequestMagicLinkResult> {
  const { nowMs, uid, bytes } = resolveDeps(deps);
  const email = input.email.trim().toLowerCase();

  const { rows } = await client.query("select id from operators where lower(email) = $1", [email]);
  const operatorId = rows[0]?.id as string | undefined;
  if (!operatorId) {
    return { requested: true, delivered: false, operatorId: null };
  }

  const { token, tokenHash } = issueToken(bytes);
  const expiresAt = new Date(nowMs + MAGIC_LINK_TTL_MS).toISOString();
  await client.query(
    "insert into magic_link_tokens (id, operator_id, token_hash, purpose, expires_at) values ($1,$2,$3,'login',$4)",
    [uid("mlt"), operatorId, tokenHash, expiresAt],
  );

  const link = `${input.baseUrl.replace(/\/+$/, "")}/auth/verify?token=${encodeURIComponent(token)}`;
  await mailer.sendMagicLink(email, link);
  return { requested: true, delivered: true, operatorId: asId<OperatorId>(operatorId) };
}

export type ConsumeMagicLinkResult =
  | { readonly ok: true; readonly operator: Operator; readonly sessionId: string; readonly sessionExpiresAt: string }
  | { readonly ok: false; readonly code: "not_found" | "consumed" | "expired" | "mismatch" };

const rowToOperator = (r: Record<string, unknown>): Operator => ({
  id: asId<OperatorId>(String(r.id)),
  name: String(r.name),
  email: String(r.email),
  role: String(r.role) as OperatorRole,
});

/** Valide le jeton, le consomme UNE SEULE FOIS (garde anti-rejeu au niveau SQL) et ouvre une session. */
export async function consumeMagicLink(client: SqlClient, token: string, deps: AuthDeps = {}): Promise<ConsumeMagicLinkResult> {
  const { nowMs, uid } = resolveDeps(deps);
  const tokenHash = hashToken(token);

  const { rows } = await client.query(
    "select id, operator_id, expires_at, consumed_at from magic_link_tokens where token_hash = $1",
    [tokenHash],
  );
  const row = rows[0];
  const stored: StoredToken | null = row
    ? {
        tokenHash,
        expiresAtMs: Date.parse(String(row.expires_at)),
        consumedAtMs: row.consumed_at != null ? Date.parse(String(row.consumed_at)) : null,
      }
    : null;

  const verdict = verifyToken(stored, token, nowMs);
  if (!verdict.ok) return { ok: false, code: verdict.code };

  // Consommation conditionnelle : ne réussit que si personne ne l'a consommé entre-temps.
  const consumed = await client.query(
    "update magic_link_tokens set consumed_at = $1 where id = $2 and consumed_at is null returning operator_id",
    [new Date(nowMs).toISOString(), row!.id],
  );
  if (consumed.rows.length === 0) return { ok: false, code: "consumed" };

  const operatorId = String(row!.operator_id);
  const opRow = (await client.query("select id, name, email, role from operators where id = $1", [operatorId])).rows[0];
  if (!opRow) return { ok: false, code: "not_found" };

  const sessionId = uid("sess");
  const sessionExpiresAt = new Date(nowMs + SESSION_TTL_MS).toISOString();
  await client.query("insert into sessions (id, operator_id, expires_at) values ($1,$2,$3)", [
    sessionId,
    operatorId,
    sessionExpiresAt,
  ]);

  return { ok: true, operator: rowToOperator(opRow), sessionId, sessionExpiresAt };
}

/** Relit l'opérateur d'une session encore active (non expirée, non révoquée), sinon null. */
export async function resolveSession(client: SqlClient, sessionId: string, deps: AuthDeps = {}): Promise<Operator | null> {
  const { nowMs } = resolveDeps(deps);
  const { rows } = await client.query(
    `select o.id, o.name, o.email, o.role, s.expires_at, s.revoked_at
     from sessions s join operators o on o.id = s.operator_id where s.id = $1`,
    [sessionId],
  );
  const r = rows[0];
  if (!r || r.revoked_at != null) return null;
  if (nowMs > Date.parse(String(r.expires_at))) return null;
  return rowToOperator(r);
}
