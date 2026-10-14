import { parseModel, serializeModel, MODEL_SCHEMA_VERSION, type ModelStore, type PropertyModel } from "@anesis/engine";
import type { SqlClient } from "./sql.js";

/** The property model as a row: the same `ModelStore` interface the file store implements, now durable in Postgres. */
export class PgModelStore implements ModelStore {
  constructor(private readonly db: SqlClient) {}
  async load(propertyId: string): Promise<PropertyModel | null> {
    const r = await this.db.query<{ model: unknown }>("select model from property_models where property_id = $1", [propertyId]);
    const row = r.rows[0]; if (!row) return null;
    return parseModel(typeof row.model === "string" ? row.model : JSON.stringify(row.model));
  }
  async save(m: PropertyModel): Promise<void> {
    await this.db.query(
      `insert into property_models (property_id, schema_version, model, cycles, updated_at) values ($1, $2, $3::jsonb, $4, now())
       on conflict (property_id) do update set model = excluded.model, schema_version = excluded.schema_version, cycles = excluded.cycles, updated_at = now()`,
      [m.propertyId, MODEL_SCHEMA_VERSION, serializeModel(m), m.cycles.length]);
  }
  async list(): Promise<string[]> { return (await this.db.query<{ property_id: string }>("select property_id from property_models order by property_id")).rows.map((r) => r.property_id); }
  async remove(propertyId: string): Promise<void> { await this.db.query("delete from property_models where property_id = $1", [propertyId]); }
}
