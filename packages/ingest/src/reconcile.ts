/**
 * Reconciliation of normalised reservation rows: exact duplicates, modifications of the same reservation, cancellations
 * and no-shows, contradictions and impossible values. Every exclusion is counted and exemplified; nothing is silently
 * dropped and nothing missing is filled in.
 */
import type { StatusClass, ChannelClass } from "./fields.js";

export interface ReservationRow {
  readonly line: number;                       // 1-based data row in the file
  readonly id: string | null;
  readonly bookingDate: string | null; readonly arrival: string | null; readonly departure: string | null; readonly nights: number | null;
  readonly statusRaw: string | null; readonly status: StatusClass;
  readonly revenue: number | null; readonly currency: string | null;
  readonly channelRaw: string | null; readonly channel: ChannelClass;
  readonly cancelledAt: string | null; readonly modifiedAt: string | null; readonly roomType: string | null; readonly rooms: number | null; readonly commission: number | null;
  readonly notes: string[];                    // parse notes per field
}

export type IssueKind = "EXACT_DUPLICATE" | "MODIFIED_RESERVATION" | "CONFLICTING_RESERVATION" | "CANCELLED" | "NO_SHOW" | "UNKNOWN_STATUS" | "DEPARTURE_BEFORE_ARRIVAL" | "NIGHTS_MISMATCH" | "NEGATIVE_REVENUE" | "MISSING_DATES" | "AMBIGUOUS_DATE" | "UNREADABLE_VALUE" | "FOREIGN_CURRENCY" | "MISSING_CURRENCY" | "UNCLASSIFIED_CHANNEL" | "MISSING_ID";
export interface Issue { readonly kind: IssueKind; readonly count: number; readonly examples: string[]; readonly effect: string }

export interface Reconciled { readonly kept: ReservationRow[]; readonly excluded: { row: ReservationRow; why: IssueKind }[]; readonly issues: Issue[] }

const sig = (r: ReservationRow) => JSON.stringify([r.id, r.arrival, r.departure, r.revenue, r.statusRaw, r.channelRaw, r.bookingDate]);

export function reconcile(rows: readonly ReservationRow[]): Reconciled {
  const issues = new Map<IssueKind, { count: number; examples: string[]; effect: string }>();
  const note = (kind: IssueKind, ex: string, effect: string) => { const i = issues.get(kind) ?? { count: 0, examples: [], effect }; i.count++; if (i.examples.length < 3) i.examples.push(ex); issues.set(kind, i); };
  const excluded: Reconciled["excluded"] = []; let work: ReservationRow[] = [];
  // 1. exact duplicates: identical rows are one reservation listed twice
  const seen = new Set<string>();
  for (const r of rows) { const s = sig(r); if (seen.has(s)) { excluded.push({ row: r, why: "EXACT_DUPLICATE" }); note("EXACT_DUPLICATE", `line ${r.line} repeats an earlier row`, "second copy excluded"); continue; } seen.add(s); work.push(r); }
  // 2. parse notes become issues (not exclusions, unless the value is needed below)
  for (const r of work) { for (const n of r.notes) { if (/ambiguous/.test(n)) note("AMBIGUOUS_DATE", `line ${r.line}: ${n}`, "stay dates unknown for this row"); else if (/unreadable|impossible/.test(n)) note("UNREADABLE_VALUE", `line ${r.line}: ${n}`, "field unknown for this row"); } }
  // 3. same id, several versions: keep the latest by modifiedAt, else the last row; conflicting active stays are flagged
  const byId = new Map<string, ReservationRow[]>(); const noId: ReservationRow[] = [];
  for (const r of work) { if (r.id) (byId.get(r.id) ?? byId.set(r.id, []).get(r.id)!).push(r); else noId.push(r); }
  if (noId.length && byId.size) note("MISSING_ID", `${noId.length} row(s) without a reservation id`, "kept as separate reservations; duplicates among them cannot be detected");
  const merged: ReservationRow[] = [...noId];
  for (const [id, vs] of byId) {
    if (vs.length === 1) { merged.push(vs[0]!); continue; }
    const sorted = [...vs].sort((a, b) => (a.modifiedAt ?? "").localeCompare(b.modifiedAt ?? "") || a.line - b.line);
    const latest = sorted[sorted.length - 1]!;
    const actives = vs.filter((v) => v.status === "ACTIVE" || v.status === "UNKNOWN");
    const stays = new Set(actives.map((v) => `${v.arrival}|${v.departure}`));
    if (stays.size > 1 && !vs.some((v) => v.modifiedAt)) note("CONFLICTING_RESERVATION", `id ${id}: ${stays.size} different stays, no modification date to order them`, "latest row by file order kept; flagged for human review");
    else note("MODIFIED_RESERVATION", `id ${id}: ${vs.length} versions, latest kept`, "earlier versions excluded");
    for (const v of vs) if (v !== latest) excluded.push({ row: v, why: stays.size > 1 && !vs.some((x) => x.modifiedAt) ? "CONFLICTING_RESERVATION" : "MODIFIED_RESERVATION" });
    merged.push(latest);
  }
  // 4. status: cancellations and no-shows leave the sold set but stay counted
  const kept: ReservationRow[] = [];
  for (const r of merged) {
    const cancelled = r.status === "CANCELLED" || (r.cancelledAt !== null && r.status !== "ACTIVE");
    if (cancelled) { excluded.push({ row: r, why: "CANCELLED" }); note("CANCELLED", `line ${r.line}${r.id ? " id " + r.id : ""}`, "not a sold night; counted as a cancellation"); continue; }
    if (r.status === "NO_SHOW") { excluded.push({ row: r, why: "NO_SHOW" }); note("NO_SHOW", `line ${r.line}`, "not a sold night; counted as a no-show"); continue; }
    if (r.status === "UNKNOWN" && r.statusRaw) note("UNKNOWN_STATUS", `line ${r.line}: "${r.statusRaw}"`, "treated as active; declare the status vocabulary to be sure");
    // 5. impossible values exclude the row from any total they would corrupt
    if (r.arrival && r.departure && r.departure <= r.arrival) { excluded.push({ row: r, why: "DEPARTURE_BEFORE_ARRIVAL" }); note("DEPARTURE_BEFORE_ARRIVAL", `line ${r.line}: ${r.arrival} → ${r.departure}`, "excluded from room nights"); continue; }
    if (!r.arrival || !r.departure) { if (r.nights === null) { excluded.push({ row: r, why: "MISSING_DATES" }); note("MISSING_DATES", `line ${r.line}`, "excluded from room nights"); continue; } }
    if (r.revenue !== null && r.revenue < 0) note("NEGATIVE_REVENUE", `line ${r.line}: ${r.revenue}`, "kept as a credit; check for refunds");
    if (r.nights !== null && r.arrival && r.departure) { const d = Math.round((Date.parse(r.departure) - Date.parse(r.arrival)) / 86_400_000); if (d !== r.nights) note("NIGHTS_MISMATCH", `line ${r.line}: dates give ${d} night(s), file says ${r.nights}`, "dates win; nights column ignored for this row"); }
    if (r.channelRaw && r.channel === "UNCLASSIFIED") note("UNCLASSIFIED_CHANNEL", `line ${r.line}: "${r.channelRaw}"`, "channel share computed only if unclassified ≤ 10 % of nights");
    kept.push(r);
  }
  return { kept, excluded, issues: [...issues.entries()].map(([kind, v]) => ({ kind, ...v })) };
}
