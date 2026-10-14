/**
 * Field detection by header synonyms (English and French PMS vocabularies). A field is mapped only when a header
 * matches; nothing is guessed from values. The operator can declare a mapping that overrides detection.
 */
export type Field = "reservationId" | "bookingDate" | "arrival" | "departure" | "nights" | "status" | "revenue" | "currency" | "channel" | "cancelledAt" | "modifiedAt" | "roomType" | "rooms" | "guests" | "rate" | "commission";

const SYN: Record<Field, string[]> = {
  reservationId: ["reservation id", "reservation", "booking id", "booking ref", "booking reference", "confirmation", "confirmation number", "res id", "resid", "id", "ref", "reference", "numéro de réservation", "n° réservation", "no reservation", "référence", "dossier"],
  bookingDate: ["booking date", "booked on", "created", "created at", "creation date", "date of booking", "reservation date", "date de réservation", "date de création", "créé le", "date résa"],
  arrival: ["arrival", "arrival date", "check-in", "checkin", "check in", "date d'arrivée", "arrivée", "from", "start date", "stay from", "date début"],
  departure: ["departure", "departure date", "check-out", "checkout", "check out", "date de départ", "départ", "to", "end date", "stay to", "date fin"],
  nights: ["nights", "number of nights", "los", "length of stay", "nuits", "nombre de nuits", "durée"],
  status: ["status", "reservation status", "booking status", "statut", "état", "etat"],
  revenue: ["room revenue", "accommodation revenue", "total room revenue", "revenue", "total revenue", "total", "amount", "total amount", "price", "room rate total", "ca", "chiffre d'affaires", "montant", "montant total", "revenu", "revenu hébergement", "prix total"],
  currency: ["currency", "devise", "monnaie"],
  channel: ["channel", "source", "booking source", "booking channel", "market source", "origin", "segment", "canal", "source de réservation", "origine"],
  cancelledAt: ["cancelled", "cancelled at", "cancellation date", "canceled at", "date d'annulation", "annulé le", "annulation"],
  modifiedAt: ["modified", "modified at", "last modified", "updated", "updated at", "last updated", "modifié le", "date de modification", "mis à jour"],
  roomType: ["room type", "room category", "category", "type de chambre", "catégorie"],
  rooms: ["rooms", "room count", "number of rooms", "chambres", "nombre de chambres"],
  guests: ["guests", "adults", "pax", "occupants", "personnes", "adultes"],
  rate: ["rate", "adr", "daily rate", "nightly rate", "room rate", "tarif", "prix par nuit"],
  commission: ["commission", "commission amount", "ota commission", "commission gbp", "montant commission"],
};
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[_\-./()]+/g, " ").replace(/\s+/g, " ").trim();

export interface Mapping { readonly byField: Partial<Record<Field, { header: string; column: number; confidence: "exact" | "contains" | "declared" }>>; readonly unmapped: string[] }

export function detectMapping(headers: readonly string[], declared: Partial<Record<Field, string>> = {}): Mapping {
  const byField: Mapping["byField"] = {}; const used = new Set<number>();
  for (const [f, h] of Object.entries(declared) as [Field, string][]) { const col = headers.findIndex((x) => norm(x) === norm(h)); if (col >= 0) { byField[f] = { header: headers[col]!, column: col, confidence: "declared" }; used.add(col); } }
  const nh = headers.map(norm);
  // exact synonym matches first (longest synonym wins), then "contains" matches; a column is mapped once
  for (const pass of ["exact", "contains"] as const) for (const f of Object.keys(SYN) as Field[]) {
    if (byField[f]) continue;
    const syns = [...SYN[f]].map(norm).sort((a, b) => b.length - a.length);
    let best: { col: number; len: number } | null = null;
    nh.forEach((h, col) => { if (used.has(col) || !h) return; for (const s of syns) { const hit = pass === "exact" ? h === s : (s.length >= 4 && h.includes(s)); if (hit && (!best || s.length > best.len)) best = { col, len: s.length }; } });
    if (best) { const b = best as { col: number; len: number }; byField[f] = { header: headers[b.col]!, column: b.col, confidence: pass }; used.add(b.col); }
  }
  return { byField, unmapped: headers.filter((_, i) => !used.has(i)) };
}

export const OTA_NAMES = ["booking.com", "booking", "expedia", "hotels.com", "agoda", "airbnb", "trip.com", "ctrip", "hostelworld", "lastminute", "secret escapes", "mr & mrs smith", "mr and mrs smith", "ota", "hrs", "traveloka", "priceline", "orbitz", "travelocity", "ebookers", "opodo"];
export const DIRECT_NAMES = ["direct", "website", "web", "booking engine", "be", "walk-in", "walk in", "phone", "telephone", "email", "front desk", "reception", "site", "site web", "téléphone", "comptoir", "direct web"];
export const OTHER_NAMES = ["corporate", "agent", "travel agent", "tour operator", "group", "wholesaler", "gds", "to", "agence", "groupe", "entreprise"];
export type ChannelClass = "OTA" | "DIRECT" | "OTHER" | "UNCLASSIFIED";
/** Short synonyms ("be", "to", "web") match only as whole words; longer ones may appear inside a name. */
const hasWord = (n: string, s: string) => (s.length <= 4 ? ` ${n} `.includes(` ${s} `) : n.includes(s));
export function classifyChannel(name: string): ChannelClass { const n = norm(name); if (!n) return "UNCLASSIFIED"; if (OTA_NAMES.some((s) => hasWord(n, norm(s)))) return "OTA"; if (DIRECT_NAMES.some((s) => hasWord(n, norm(s)))) return "DIRECT"; if (OTHER_NAMES.some((s) => hasWord(n, norm(s)))) return "OTHER"; return "UNCLASSIFIED"; }

export const CANCEL_WORDS = ["cancel", "cancelled", "canceled", "annul", "annulé", "annulee", "annulée", "void", "voided"];
export const NOSHOW_WORDS = ["no show", "no-show", "noshow", "non présenté", "non presente"];
export const ACTIVE_WORDS = ["confirmed", "checked in", "checked-in", "checked out", "checked-out", "in house", "departed", "arrived", "guaranteed", "reserved", "booked", "confirmé", "confirmée", "arrivé", "parti", "en cours", "terminé", "ok", "active"];
export type StatusClass = "ACTIVE" | "CANCELLED" | "NO_SHOW" | "UNKNOWN";
export function classifyStatus(s: string): StatusClass { const n = norm(s); if (!n) return "UNKNOWN"; if (NOSHOW_WORDS.some((w) => hasWord(n, norm(w)))) return "NO_SHOW"; if (CANCEL_WORDS.some((w) => hasWord(n, norm(w)))) return "CANCELLED"; if (ACTIVE_WORDS.some((w) => hasWord(n, norm(w)))) return "ACTIVE"; return "UNKNOWN"; }
