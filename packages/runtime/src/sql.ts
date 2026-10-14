/**
 * One SQL client shape for two backends: a real Postgres through `pg` when DATABASE_URL is set, otherwise
 * PGlite (embedded Postgres, WASM) in a directory or in memory. Same SQL, same behaviour; the runtime never
 * depends on which one it talks to.
 */
export interface SqlClient { query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<{ rows: T[] }>; close(): Promise<void>; readonly backend: "postgres" | "pglite" }

export async function openDatabase(opts: { databaseUrl?: string | undefined; pgliteDir?: string | undefined } = {}): Promise<SqlClient> {
  const url = opts.databaseUrl ?? process.env.DATABASE_URL;
  if (url) {
    const { default: pg } = await import("pg");
    const pool = new pg.Pool({ connectionString: url });
    return { backend: "postgres", query: async (sql, params) => { const r = await pool.query(sql, params as unknown[]); return { rows: r.rows as never }; }, close: () => pool.end() };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = opts.pgliteDir ?? process.env.ANESIS_PGLITE_DIR;      // undefined = in memory (tests, demos)
  const db = dir ? new PGlite(dir) : new PGlite();
  return { backend: "pglite", query: async (sql, params) => { const r = await db.query(sql, params as unknown[]); return { rows: r.rows as never }; }, close: () => db.close() };
}
