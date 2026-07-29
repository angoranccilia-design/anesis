/**
 * Registre d'intake — enquêtes du site (Diagnostic / Contact). Écriture simple, table globale.
 * La notification email (Resend) est gérée côté app, en complément de cette persistance.
 */
import type { SqlClient } from "./context.js";

export interface EnquiryInput {
  readonly kind?: string;
  readonly name: string;
  readonly email: string;
  readonly hotel: string;
  readonly website?: string | null;
}

export interface EnquiryRow extends EnquiryInput {
  readonly id: string;
  readonly status: string;
  readonly createdAt: string;
}

const uid = (): string => `enq-${globalThis.crypto.randomUUID()}`;

/** Insère une enquête et renvoie son id. */
export async function insertEnquiry(client: SqlClient, input: EnquiryInput, id: string = uid()): Promise<string> {
  await client.query(
    "insert into enquiries (id, kind, name, email, hotel, website) values ($1,$2,$3,$4,$5,$6)",
    [id, input.kind ?? "enquiry", input.name, input.email, input.hotel, input.website ?? null],
  );
  return id;
}

/** Liste les dernières enquêtes (registre pour le cockpit). */
export async function listEnquiries(client: SqlClient, limit = 100): Promise<EnquiryRow[]> {
  const { rows } = await client.query(
    "select id, kind, name, email, hotel, website, status, created_at from enquiries order by created_at desc limit $1",
    [limit],
  );
  return rows.map((r) => ({
    id: String(r.id),
    kind: String(r.kind),
    name: String(r.name),
    email: String(r.email),
    hotel: String(r.hotel),
    website: r.website == null ? null : String(r.website),
    status: String(r.status),
    createdAt: new Date(String(r.created_at)).toISOString(),
  }));
}
