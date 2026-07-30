import "server-only";
import { withFounder } from "@anesis/db";
import { withDbClient } from "@/lib/db";

/**
 * P2 — Journal d'audit en AJOUT SEUL. Lecture transversale (fondatrice) de la table `events`,
 * où UPDATE/DELETE sont révoqués au niveau des privilèges (0002_roles.sql) : chaque entrée est
 * horodatée et immuable. Vide tant qu'aucun agent n'a agi ; se remplit dès que le runtime tourne.
 */
export interface AuditEntry {
  readonly id: string;
  readonly type: string;
  readonly by: string; // agent ou humain émetteur
  readonly mandateId: string | null;
  readonly at: string; // ISO
}

export async function recentAudit(limit = 40): Promise<AuditEntry[]> {
  const rows = await withDbClient((client) =>
    withFounder(client, async () => {
      const r = await client.query(
        "select id, type, emitted_by, mandate_id, emitted_at from events order by emitted_at desc limit $1",
        [limit],
      );
      return r.rows;
    }),
  );
  if (!rows) return [];
  return rows.map((r) => ({
    id: String(r.id),
    type: String(r.type),
    by: String(r.emitted_by),
    mandateId: r.mandate_id == null ? null : String(r.mandate_id),
    at: new Date(r.emitted_at as string | number | Date).toISOString(),
  }));
}
