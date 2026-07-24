/**
 * Import en lot d'établissements (campagne du 3 août) → Property(prospect).
 * Déduplication par domaine de site web (normalizeDomain), dans le lot ET contre l'existant.
 * Les prospects sans site web ne sont pas dédupliqués (pas de clé).
 */
import { normalizeDomain, type PropertyImportRow } from "@anesis/core";
import type { SqlClient } from "./context.js";

export interface ImportResult {
  readonly inserted: number;
  readonly skipped: number;
}

export async function importProperties(
  client: SqlClient,
  rows: readonly PropertyImportRow[],
  genId: () => string,
): Promise<ImportResult> {
  let inserted = 0;
  let skipped = 0;

  const seen = new Set<string>();
  const existing = await client.query("select website_domain from properties where website_domain is not null");
  for (const r of existing.rows) {
    if (typeof r.website_domain === "string") seen.add(r.website_domain);
  }

  for (const row of rows) {
    const domain = normalizeDomain(row.website);
    if (domain !== null && seen.has(domain)) {
      skipped += 1;
      continue;
    }
    if (domain !== null) seen.add(domain);

    await client.query(
      `insert into properties (id, name, state, city, county, region, website, website_domain, source, priority, contacts)
       values ($1, $2, 'prospect', $3, $4, $5, $6, $7, $8, $9, '[]'::jsonb)`,
      [
        genId(),
        row.name,
        row.city ?? null,
        row.county ?? null,
        row.region,
        row.website ?? null,
        domain,
        row.source,
        row.priority ?? 0,
      ],
    );
    inserted += 1;
  }

  return { inserted, skipped };
}
