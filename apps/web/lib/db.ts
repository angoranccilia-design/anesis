import "server-only";
import type { SqlClient } from "@anesis/db";

/**
 * Accès base côté site — OPTIONNEL. Tant que `DATABASE_URL` n'est pas fourni, `withDbClient` renvoie
 * `null` et l'app retombe sur les données de démonstration. Dès que la base est connectée, le même code
 * bascule sur le réel, sans autre changement.
 *
 * IMPORTANT : chaque unité logique (withMandate/withFounder) doit s'exécuter sur UNE SEULE connexion
 * (begin…commit). On réserve donc un client dédié par appel, jamais le pool directement.
 */
type PgPool = { connect(): Promise<PgClient>; };
type PgClient = { query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>; release(): void; };

let poolPromise: Promise<PgPool | null> | null = null;

async function getPool(): Promise<PgPool | null> {
  if (!process.env.DATABASE_URL) return null;
  if (!poolPromise) {
    poolPromise = (async () => {
      const { Pool } = await import("pg");
      return new Pool({ connectionString: process.env.DATABASE_URL }) as unknown as PgPool;
    })();
  }
  return poolPromise;
}

/** Exécute `fn` avec un client SQL dédié si la base est configurée, sinon renvoie `null`. */
export async function withDbClient<T>(fn: (client: SqlClient) => Promise<T>): Promise<T | null> {
  const pool = await getPool();
  if (!pool) return null;
  const client = await pool.connect();
  const adapted: SqlClient = { query: (sql, params) => client.query(sql, params as unknown[]) };
  try {
    return await fn(adapted);
  } finally {
    client.release();
  }
}

export const isDbConfigured = (): boolean => Boolean(process.env.DATABASE_URL);
