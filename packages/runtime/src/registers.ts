import { emptyRegisters, type OperatorRegisters } from "@anesis/connectors";
import type { SqlClient } from "./sql.js";

/** Operator registers persisted per property: what the console writes is what the worker reads, across restarts. */
export async function loadRegisters(db: SqlClient, propertyId: string): Promise<OperatorRegisters> {
  const r = await db.query<{ registers: unknown }>(`select registers from operator_registers where property_id = $1`, [propertyId]);
  const row = r.rows[0]; if (!row) return emptyRegisters();
  const stored = (typeof row.registers === "string" ? JSON.parse(row.registers) : row.registers) as Partial<OperatorRegisters>;
  return { ...emptyRegisters(), ...stored };
}
export async function saveRegisters(db: SqlClient, propertyId: string, patch: Partial<OperatorRegisters>): Promise<OperatorRegisters> {
  const next = { ...(await loadRegisters(db, propertyId)), ...patch };
  await db.query(`insert into operator_registers (property_id, registers) values ($1, $2::jsonb) on conflict (property_id) do update set registers = excluded.registers, updated_at = now()`, [propertyId, JSON.stringify(next)]);
  return next;
}
export async function clearRegisters(db: SqlClient, propertyId: string): Promise<void> { await db.query(`delete from operator_registers where property_id = $1`, [propertyId]); }
