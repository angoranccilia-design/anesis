/**
 * Contexte de mandat — pose `app.mandate_id` en TRANSACTION-LOCAL (`set_config(..., true)`).
 * En pooling transactionnel, le GUC est réinitialisé au COMMIT : aucune fuite sur une connexion
 * réutilisée. Toute lecture/écriture mandat-scopée passe par ici.
 */
export interface SqlClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

export async function withMandate<T>(client: SqlClient, mandateId: string, fn: () => Promise<T>): Promise<T> {
  await client.query("begin");
  try {
    await client.query("select set_config('app.mandate_id', $1, true)", [mandateId]);
    const result = await fn();
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback");
    throw err;
  }
}

/**
 * Contexte fondatrice — pose `app.founder='true'` en TRANSACTION-LOCAL. Ouvre la LECTURE transversale
 * de toutes les tables mandat-scopées (policies `*_founder_read`, SELECT only, migration 0010) pour le
 * cockpit. N'ouvre AUCUNE écriture : hors `app.mandate_id`, tout INSERT/UPDATE reste refusé par
 * l'isolation par mandat. À réserver aux lectures transversales du founder.
 */
export async function withFounder<T>(client: SqlClient, fn: () => Promise<T>): Promise<T> {
  await client.query("begin");
  try {
    await client.query("select set_config('app.founder', 'true', true)");
    const result = await fn();
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback");
    throw err;
  }
}
