/**
 * One SQL client shape for two backends: a real Postgres through `pg` when DATABASE_URL is set, otherwise
 * PGlite (embedded Postgres, WASM) in a directory or in memory. Same SQL, same behaviour; the runtime never
 * depends on which one it talks to. `transaction` runs a function on one connection inside BEGIN … COMMIT and
 * rolls back if it throws: what a cycle writes (model, contracts, next job) is all or nothing (audit C6, resume
 * after failure without duplicates).
 */
export interface SqlClient { query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<{ rows: T[] }>; transaction<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T>; close(): Promise<void>; readonly backend: "postgres" | "pglite" }

export async function openDatabase(opts: { databaseUrl?: string | undefined; pgliteDir?: string | undefined } = {}): Promise<SqlClient> {
  const url = opts.databaseUrl ?? process.env.DATABASE_URL;
  if (url) {
    const { default: pg } = await import("pg");
    const pool = new pg.Pool({ connectionString: url });
    const transaction = async <T>(fn: (tx: SqlClient) => Promise<T>): Promise<T> => {
      const client = await pool.connect();
      const tx: SqlClient = { backend: "postgres", query: async (sql, params) => { const r = await client.query(sql, params as unknown[]); return { rows: r.rows as never }; }, transaction: (f) => f(tx), close: async () => {} };
      try { await client.query("begin"); const out = await fn(tx); await client.query("commit"); return out; }
      catch (e) { await client.query("rollback").catch(() => {}); throw e; }
      finally { client.release(); }
    };
    return { backend: "postgres", query: async (sql, params) => { const r = await pool.query(sql, params as unknown[]); return { rows: r.rows as never }; }, transaction, close: () => pool.end() };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = opts.pgliteDir ?? process.env.ANESIS_PGLITE_DIR;      // undefined = in memory (tests, demos)
  const db = dir ? new PGlite(dir) : new PGlite();
  const transaction = <T>(fn: (tx: SqlClient) => Promise<T>): Promise<T> => db.transaction(async (t) => {
    const tx: SqlClient = { backend: "pglite", query: async (sql, params) => { const r = await t.query(sql, params as unknown[]); return { rows: r.rows as never }; }, transaction: (f) => f(tx), close: async () => {} };
    return fn(tx);
  });
  return { backend: "pglite", query: async (sql, params) => { const r = await db.query(sql, params as unknown[]); return { rows: r.rows as never }; }, transaction, close: () => db.close() };
}
