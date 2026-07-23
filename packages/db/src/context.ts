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
