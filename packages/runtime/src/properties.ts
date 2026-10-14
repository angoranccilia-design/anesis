import { COUNTRY_HOUSE_34, type PropertySpec } from "@anesis/engine";
import type { SqlClient } from "./sql.js";

/**
 * Property registry. A property is declared once (identity, type, location, room count); its figures come from imports.
 * The simulated property keeps its built-in spec so the demo and the tests keep working, and it is always labelled simulated.
 */
export async function upsertProperty(db: SqlClient, spec: PropertySpec): Promise<void> {
  if (!spec.id || !spec.name || !spec.location) throw new Error("a property needs an id, a name and a location");
  await db.query(`insert into properties (property_id, spec) values ($1, $2::jsonb) on conflict (property_id) do update set spec = excluded.spec, updated_at = now()`, [spec.id, JSON.stringify(spec)]);
}
export async function loadProperty(db: SqlClient, propertyId: string): Promise<PropertySpec | null> {
  const r = await db.query<{ spec: unknown }>(`select spec from properties where property_id = $1`, [propertyId]);
  const row = r.rows[0];
  if (row) return (typeof row.spec === "string" ? JSON.parse(row.spec) : row.spec) as PropertySpec;
  return propertyId === COUNTRY_HOUSE_34.id ? COUNTRY_HOUSE_34 : null;
}
export async function listProperties(db: SqlClient): Promise<{ id: string; name: string; simulated: boolean }[]> {
  const rows = (await db.query<{ property_id: string; spec: unknown }>(`select property_id, spec from properties order by property_id`)).rows;
  return rows.map((r) => { const s = (typeof r.spec === "string" ? JSON.parse(r.spec) : r.spec) as PropertySpec; return { id: r.property_id, name: s.name, simulated: r.property_id === COUNTRY_HOUSE_34.id }; });
}

/** Which operators may read and act on which properties. Founders are not listed: the application grants them everything. */
export async function grantProperty(db: SqlClient, operatorId: string, propertyId: string): Promise<void> {
  await db.query(`insert into operator_properties (operator_id, property_id) values ($1, $2) on conflict do nothing`, [operatorId, propertyId]);
}
export async function revokeProperty(db: SqlClient, operatorId: string, propertyId: string): Promise<void> { await db.query(`delete from operator_properties where operator_id = $1 and property_id = $2`, [operatorId, propertyId]); }
export async function operatorMayAccess(db: SqlClient, operatorId: string, propertyId: string): Promise<boolean> {
  return (await db.query(`select 1 from operator_properties where operator_id = $1 and property_id = $2`, [operatorId, propertyId])).rows.length > 0;
}
export async function propertiesOf(db: SqlClient, operatorId: string): Promise<string[]> {
  return (await db.query<{ property_id: string }>(`select property_id from operator_properties where operator_id = $1 order by property_id`, [operatorId])).rows.map((r) => r.property_id);
}
