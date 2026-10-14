/**
 * importPmsExport — the first real ingestion path into Anesis. From a CSV or XLSX export of reservations it produces:
 * provenance (hash, size, rows, format, mapping used), the period covered, the fields available and missing, the
 * reconciliation issues, a typed PmsSnapshot the engine already understands (null for every field the file cannot
 * justify), the data quality, and a sufficiency statement. Deterministic: same bytes and options → same result.
 */
import { createHash } from "node:crypto";
import { quality, classifyWindow, ANNUALISATION_MIN_DAYS, FULL_YEAR_DAYS, type PmsSnapshot, type DataQuality, type WindowClass } from "@anesis/engine";
import { parseCsv, parseXlsx, type Table } from "./table.js";
import { detectMapping, classifyChannel, classifyStatus, type Field, type Mapping } from "./fields.js";
import { inferDateOrder, parseDate, parseMoney, parseInt0, daysBetween, type DateOrder } from "./values.js";
import { reconcile, type ReservationRow, type Reconciled } from "./reconcile.js";

export interface ImportOptions {
  readonly filename: string;
  readonly content: string | Uint8Array;
  readonly rooms?: number | null;                       // declared by the operator; never inferred from the file
  readonly propertyId?: string;
  readonly mapping?: Partial<Record<Field, string>>;    // declared header → field overrides
  readonly dateOrder?: DateOrder;                       // declared when the file is ambiguous
  readonly fxToGbp?: Record<string, number>;            // declared rates; without one, foreign revenue stays unknown
  readonly importedAt?: string;                         // when Anesis read the file (defaults to now)
  readonly collectedAt?: string | null;                 // when the PMS produced the export, if the operator knows it; null or absent = unknown
  readonly period?: { from: string; to: string };       // restrict the stay window; default: the file's own span
}

export interface ImportResult {
  readonly provenance: { readonly filename: string; readonly sha256: string; readonly bytes: number; readonly format: "csv" | "xlsx"; readonly delimiter: string | null; readonly sheet: string | null; readonly dataRows: number; readonly importedAt: string; readonly collectedAt: string | null; readonly dateOrder: DateOrder; readonly declared: { rooms: number | null; mapping: Partial<Record<Field, string>>; fxToGbp: Record<string, number> } };
  readonly mapping: Mapping;
  readonly fields: { readonly available: Field[]; readonly missing: Field[] };
  readonly period: { readonly from: string | null; readonly to: string | null; readonly days: number | null; readonly coverage: number | null };   // coverage: share of days in the window with at least one stay night
  readonly counts: { readonly rows: number; readonly kept: number; readonly cancelled: number; readonly noShows: number; readonly duplicates: number; readonly modified: number; readonly conflicting: number; readonly excludedOther: number };
  readonly issues: Reconciled["issues"];
  readonly weekly: readonly { readonly weekStart: string; readonly roomNights: number; readonly revenueGbp: number | null }[];   // the property's own weekly history, ISO weeks
  readonly metrics: { readonly avgStayNights: number | null; readonly roomNightsSold: number | null; readonly roomRevenueGbp: number | null; readonly adrGbp: number | null; readonly occupancy: number | null; readonly revparGbp: number | null; readonly otaShare: number | null; readonly cancellationRate: number | null; readonly bookingWindowDays: number | null; readonly peakOccupancy: number | null; readonly basis: Record<string, string> };
  readonly channels: { readonly name: string; readonly cls: string; readonly roomNights: number; readonly revenueGbp: number | null }[];
  readonly snapshot: PmsSnapshot | null;             // null when the engine could not be fed honestly (rooms or room nights unknown)
  readonly quality: DataQuality;
  /** Three dates kept apart (audit C2): the observed period's end, the export's collection date, the import date. A file is a historical record: it is never "live", so it is never STALE; the gap says how current it is. */
  readonly recency: { readonly periodEnd: string | null; readonly collectedAt: string | null; readonly importedAt: string; readonly daysPeriodEndToCollection: number | null; readonly daysPeriodEndToImport: number | null; readonly statement: string };
  readonly sufficiency: { readonly verdict: "SUFFICIENT_FOR_OCCUPANCY_AND_ADR" | "WINDOW_TOO_SHORT" | "PARTIAL" | "INSUFFICIENT"; readonly window: { readonly days: number | null; readonly cls: WindowClass | null; readonly minimumDays: number; readonly fullYearDays: number; readonly note: string }; readonly canCompute: string[]; readonly cannotCompute: { metric: string; because: string }[]; readonly nextData: string[] };
  readonly simulated: false;
}

const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

function toTable(opts: ImportOptions): { table: Table; bytes: Uint8Array } {
  const isXlsx = /\.xlsx?$/i.test(opts.filename) || (opts.content instanceof Uint8Array && opts.content[0] === 0x50 && opts.content[1] === 0x4b);
  if (isXlsx) { const bytes = typeof opts.content === "string" ? new TextEncoder().encode(opts.content) : opts.content; return { table: parseXlsx(bytes), bytes }; }
  const text = typeof opts.content === "string" ? opts.content : new TextDecoder("utf-8").decode(opts.content);
  return { table: parseCsv(text), bytes: new TextEncoder().encode(text) };
}

export function importPmsExport(opts: ImportOptions): ImportResult {
  const importedAt = opts.importedAt ?? new Date().toISOString();
  const collectedAt = opts.collectedAt ?? null;
  const { table, bytes } = toTable(opts);
  const mapping = detectMapping(table.headers, opts.mapping ?? {});
  const col = (f: Field) => mapping.byField[f]?.column;
  const cell = (row: string[], f: Field): string | null => { const c = col(f); return c === undefined ? null : (row[c] ?? "").trim() || null; };
  const available = (Object.keys(mapping.byField) as Field[]); const ALL: Field[] = ["reservationId", "bookingDate", "arrival", "departure", "nights", "status", "revenue", "currency", "channel", "cancelledAt", "modifiedAt", "roomType", "rooms", "guests", "rate", "commission"];
  const missing = ALL.filter((f) => !available.includes(f));
  // date order from the arrival column (or any date column), unless declared
  const dateSamples = table.rows.flatMap((r) => [cell(r, "arrival"), cell(r, "departure"), cell(r, "bookingDate")].filter((x): x is string => !!x));
  const dateOrder = opts.dateOrder ?? inferDateOrder(dateSamples);
  const fx = opts.fxToGbp ?? {}; const fileCurrency = cell(table.rows[0] ?? [], "currency");
  const rows: ReservationRow[] = table.rows.map((r, i) => {
    const notes: string[] = []; const d = (f: Field) => { const raw = cell(r, f); if (raw === null) return null; const p = parseDate(raw, dateOrder); if (p.note) notes.push(`${f}: ${p.note}`); return p.value; };
    const arrival = d("arrival"), departure = d("departure"), bookingDate = d("bookingDate"), cancelledAt = d("cancelledAt"), modifiedAt = d("modifiedAt");
    const nightsP = cell(r, "nights") ? parseInt0(cell(r, "nights")!) : { value: null, note: null }; if (nightsP.note) notes.push(`nights: ${nightsP.note}`);
    let revenue: number | null = null; let currency: string | null = cell(r, "currency");
    const money = cell(r, "revenue"); if (money) { const m = parseMoney(money); if (m.note) notes.push(`revenue: ${m.note}`); currency = currency ?? m.currency; revenue = m.value; }
    const comm = cell(r, "commission") ? parseMoney(cell(r, "commission")!).value : null;
    const roomsP = cell(r, "rooms") ? parseInt0(cell(r, "rooms")!).value : null;
    const statusRaw = cell(r, "status"); const channelRaw = cell(r, "channel");
    return { line: i + 1, id: cell(r, "reservationId"), bookingDate, arrival, departure, nights: nightsP.value, statusRaw, status: statusRaw ? classifyStatus(statusRaw) : (cancelledAt ? "CANCELLED" : "UNKNOWN"), revenue, currency, channelRaw, channel: channelRaw ? classifyChannel(channelRaw) : "UNCLASSIFIED", cancelledAt, modifiedAt, roomType: cell(r, "roomType"), rooms: roomsP, commission: comm, notes };
  });
  const rec = reconcile(rows);
  const kept = rec.kept;
  // period: the file's own stay span, unless declared
  const stays = kept.filter((k) => k.arrival && k.departure);
  const from = opts.period?.from ?? (stays.length ? stays.map((k) => k.arrival!).sort()[0]! : null);
  const to = opts.period?.to ?? (stays.length ? stays.map((k) => k.departure!).sort().at(-1)! : null);
  const days = from && to ? Math.max(1, daysBetween(from, to)) : null;
  // room nights inside the window, per stay and per channel; each night of a stay is one room night × rooms (default 1 when the column is absent — stated in basis)
  const basis: Record<string, string> = {};
  let roomNights = 0; const nightDays = new Set<string>(); const perDay = new Map<string, number>(); const byChannel = new Map<string, { cls: string; nights: number; revenue: number | null }>();
  let revenueGbp: number | null = 0; let revenueUnknownRows = 0; let foreign = 0; let missingCurrency = 0; let unclassifiedNights = 0; let cancelledNights = 0;
  const windows: number[] = [];
  for (const k of kept) {
    if (!k.arrival || !k.departure || !from || !to) continue;
    const roomsPer = k.rooms ?? 1;
    const a = Math.max(Date.parse(k.arrival), Date.parse(from)), b = Math.min(Date.parse(k.departure), Date.parse(to));
    const n = Math.max(0, Math.round((b - a) / 86_400_000)) * roomsPer; if (n <= 0) continue;
    roomNights += n; for (let t = a; t < b; t += 86_400_000) { const dkey = new Date(t).toISOString().slice(0, 10); nightDays.add(dkey); perDay.set(dkey, (perDay.get(dkey) ?? 0) + roomsPer); }
    if (k.bookingDate && k.arrival) windows.push(daysBetween(k.bookingDate, k.arrival));
    let rev: number | null = null;
    if (k.revenue !== null) { const cur = (k.currency ?? fileCurrency ?? "").toUpperCase(); if (!cur) { missingCurrency++; rev = null; } else if (cur === "GBP") rev = k.revenue; else if (fx[cur]) rev = k.revenue * fx[cur]!; else { foreign++; rev = null; } }
    if (rev === null) { revenueUnknownRows++; revenueGbp = null; } else if (revenueGbp !== null) revenueGbp += rev;
    const name = k.channelRaw ?? "(no channel column)"; const ch = byChannel.get(name) ?? { cls: k.channel, nights: 0, revenue: 0 }; ch.nights += n; ch.revenue = ch.revenue === null || rev === null ? null : ch.revenue + rev; byChannel.set(name, ch);
    if (k.channel === "UNCLASSIFIED" && k.channelRaw) unclassifiedNights += n;
  }
  for (const e of rec.excluded) if (e.why === "CANCELLED" && e.row.arrival && e.row.departure) cancelledNights += Math.max(0, daysBetween(e.row.arrival, e.row.departure)) * (e.row.rooms ?? 1);
  if (missing.includes("rooms")) basis.roomNights = "one room per reservation row (no rooms column)"; else basis.roomNights = "rooms column × nights inside the window";
  const rooms = opts.rooms ?? null;
  const roomNightsSold = stays.length ? roomNights : null;
  const occupancy = rooms && days && roomNightsSold !== null ? roomNightsSold / (rooms * days) : null; if (occupancy !== null) basis.occupancy = `room nights ÷ (${rooms} declared rooms × ${days} days)`;
  const adr = revenueGbp !== null && roomNightsSold ? revenueGbp / roomNightsSold : null; if (adr !== null) basis.adr = "GBP revenue ÷ room nights (rows with unknown revenue would void this; none)";
  const revpar = adr !== null && occupancy !== null ? adr * occupancy : null;
  const cancellations = missing.includes("status") && missing.includes("cancelledAt") ? null : rec.excluded.filter((e) => e.why === "CANCELLED").length;
  const noShows = missing.includes("status") ? null : rec.excluded.filter((e) => e.why === "NO_SHOW").length;
  const otaNights = [...byChannel.values()].filter((c) => c.cls === "OTA").reduce((a, c) => a + c.nights, 0);
  const otaRoomNights = missing.includes("channel") ? null : (roomNights && unclassifiedNights / roomNights > 0.1 ? null : otaNights);
  if (otaRoomNights === null && !missing.includes("channel")) basis.otaShare = `unknown: ${((unclassifiedNights / Math.max(1, roomNights)) * 100).toFixed(0)} % of nights on unclassified channel names`;
  const coverage = days && nightDays.size ? Math.min(1, nightDays.size / days) : null;
  const peakOccupancy = rooms && coverage !== null && coverage >= 0.9 && days !== null && days >= 28 ? Math.min(1, Math.max(...perDay.values()) / rooms) : null; if (peakOccupancy !== null) basis.peakOccupancy = "max daily occupied rooms ÷ declared rooms (coverage ≥ 90 % over ≥ 28 days)";
  const bookingWindowDays = windows.length ? windows.sort((a, b) => a - b)[Math.floor(windows.length / 2)]! : null;
  // The property's own weekly history (ISO weeks, Monday start): room nights per night, revenue spread evenly over each stay's nights; null when a stay's revenue is unknown.
  const weekOf = (iso: string) => { const d = new Date(iso + "T00:00:00Z"); const dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow); return d.toISOString().slice(0, 10); };
  const weekly = new Map<string, { roomNights: number; revenueGbp: number | null }>();
  for (const k of kept) {
    if (!k.arrival || !k.departure || !from || !to) continue;
    const roomsPer = k.rooms ?? 1; const a = Math.max(Date.parse(k.arrival), Date.parse(from)), b = Math.min(Date.parse(k.departure), Date.parse(to)); const nights = Math.max(0, Math.round((b - a) / 86_400_000)); if (nights <= 0) continue;
    let rev: number | null = null; if (k.revenue !== null) { const cur = (k.currency ?? fileCurrency ?? "").toUpperCase(); rev = cur === "GBP" ? k.revenue : cur && fx[cur] ? k.revenue * fx[cur]! : null; }
    const perNight = rev === null ? null : rev / Math.max(1, Math.round((Date.parse(k.departure) - Date.parse(k.arrival)) / 86_400_000));
    for (let t = a; t < b; t += 86_400_000) { const wk = weekOf(new Date(t).toISOString().slice(0, 10)); const cur = weekly.get(wk) ?? { roomNights: 0, revenueGbp: 0 }; cur.roomNights += roomsPer; cur.revenueGbp = cur.revenueGbp === null || perNight === null ? null : cur.revenueGbp + perNight * roomsPer; weekly.set(wk, cur); }
  }
  const weeklySeries = [...weekly.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([weekStart, v]) => ({ weekStart, roomNights: v.roomNights, revenueGbp: v.revenueGbp === null ? null : Math.round(v.revenueGbp * 100) / 100 }));
  const stayNights = stays.map((k) => Math.max(0, daysBetween(k.arrival!, k.departure!))).filter((n) => n > 0);
  const avgStayNights = stayNights.length ? stayNights.reduce((p, q) => p + q, 0) / stayNights.length : null;
  const commissionGbp = missing.includes("commission") ? null : kept.reduce((a, k) => a + (k.commission ?? 0), 0);
  const channels = [...byChannel.entries()].map(([name, c]) => ({ name, cls: c.cls, roomNights: c.nights, revenueGbp: c.revenue })).sort((a, b) => b.roomNights - a.roomNights);
  const snapshot: PmsSnapshot | null = rooms && roomNightsSold !== null && days && from && to ? {
    weekly: weeklySeries, avgStayNights, asOf: to, periodDays: days, rooms, roomNightsSold, roomRevenueGbp: revenueGbp, cancellations, noShows, otaRoomNights, otaCommissionGbp: commissionGbp, peakOccupancy, bookingWindowDays,
    channels: channels.map((c) => ({ name: c.name, roomNights: c.roomNights, revenueGbp: c.revenueGbp ?? 0 })), source: `file import ${opts.filename} sha256 ${sha256(bytes).slice(0, 12)}; period to ${to}; ${collectedAt ? `exported ${collectedAt}` : "export date not declared"}; imported ${importedAt}`,
  } : null;
  const expected: Field[] = ["reservationId", "arrival", "departure", "status", "revenue", "channel", "bookingDate"];
  const completeness = expected.filter((f) => available.includes(f)).length / expected.length;
  const dayGap = (a: string | null, b: string | null) => (a && b ? Math.max(0, Math.round((Date.parse(b) - Date.parse(a + "T00:00:00Z")) / 86_400_000)) : null);
  const toCollection = dayGap(to, collectedAt), toImport = dayGap(to, importedAt);
  const recencyStatement = !to ? "period end unknown: how current these data are cannot be said" : `data describe a period ending ${to}${collectedAt ? `, exported ${toCollection} day(s) later` : ", export date not declared"}, imported ${toImport} day(s) after the period end; a historical record of that period, not a live feed`;
  // Age is measured from the period end to the collection date when declared, else to the import date; a file import is HISTORICAL by nature (never stale), and the age dates it.
  const ageHours = to ? Math.max(0, (Date.parse(collectedAt ?? importedAt) - Date.parse(to + "T00:00:00Z")) / 3_600_000) : null;
  const q = quality(completeness, kept.length ? 0.9 : 0, ageHours, "HISTORICAL", `${kept.length} reservations kept of ${rows.length} rows; ${rec.issues.length} issue kinds; ${recencyStatement}`);
  const can: string[] = []; const cannot: { metric: string; because: string }[] = []; const next: string[] = [];
  if (roomNightsSold !== null) can.push("room nights"); else cannot.push({ metric: "room nights", because: "no readable arrival and departure dates" });
  if (occupancy !== null) can.push("occupancy"); else if (!rooms) { cannot.push({ metric: "occupancy", because: "room count not declared" }); next.push("declare the number of sellable rooms"); }
  if (adr !== null) can.push("ADR"); else { cannot.push({ metric: "ADR", because: foreign ? `${foreign} row(s) in a currency without a declared GBP rate` : missingCurrency ? `${missingCurrency} row(s) with an amount but no currency` : missing.includes("revenue") ? "no revenue column" : "revenue unreadable on some rows" }); if (foreign || missingCurrency) next.push("declare the currency and a GBP rate, or export in GBP"); if (missing.includes("revenue")) next.push("an export with room revenue per reservation"); }
  if (revpar !== null) can.push("RevPAR");
  if (otaRoomNights !== null) can.push("OTA share"); else cannot.push({ metric: "OTA share", because: missing.includes("channel") ? "no channel column" : "too many unclassified channel names" });
  if (cancellations !== null) can.push("cancellation rate"); else cannot.push({ metric: "cancellation rate", because: "no status or cancellation column" });
  if (peakOccupancy !== null) can.push("peak occupancy"); else cannot.push({ metric: "peak occupancy", because: !rooms ? "room count not declared" : days !== null && days < 28 ? "window shorter than 28 days" : "stay coverage below 90 % of the window" });
  if (commissionGbp === null) { cannot.push({ metric: "OTA commission", because: "no commission column (rare in reservation exports)" }); next.push("OTA commission statements or channel-manager report"); }
  if (dateOrder === "ambiguous") next.push("declare the date format (day/month order)");
  // Window (audit C1): what the covered period can establish. Window figures (occupancy, ADR over the window) are observed;
  // annual figures are projections below a full year and are not made at all below the minimum. The engine applies the same rule.
  const wcls = days !== null ? classifyWindow(days) : null;
  const windowNote = days === null ? "period unknown: nothing can be annualised" : wcls === "FULL_YEAR" ? `${days} days: a full year; annual totals observed` : wcls === "PARTIAL_YEAR" ? `${days} days: annual totals are projections (× 365 ÷ ${days}) with possible seasonal bias; window figures are observed for the window only` : `${days} days: below the ${ANNUALISATION_MIN_DAYS}-day minimum — window figures describe these days only; no annual figure is derived and the engine will not use them as annual rates`;
  if (wcls === "TOO_SHORT") { cannot.push({ metric: "annual room nights, revenue, occupancy, ADR", because: `window of ${days} days is below the ${ANNUALISATION_MIN_DAYS}-day minimum` }); next.push(`an export covering at least ${ANNUALISATION_MIN_DAYS} days; ${FULL_YEAR_DAYS} days to remove seasonal bias`); }
  else if (wcls === "PARTIAL_YEAR") next.push(`a full ${FULL_YEAR_DAYS}-day export to replace annual projections with observed totals`);
  const verdict = wcls === "TOO_SHORT" && roomNightsSold !== null ? "WINDOW_TOO_SHORT" : roomNightsSold !== null && occupancy !== null && adr !== null ? "SUFFICIENT_FOR_OCCUPANCY_AND_ADR" : roomNightsSold !== null ? "PARTIAL" : "INSUFFICIENT";
  return {
    provenance: { filename: opts.filename, sha256: sha256(bytes), bytes: bytes.byteLength, format: table.format, delimiter: table.delimiter, sheet: table.sheet, dataRows: table.rows.length, importedAt, collectedAt, dateOrder, declared: { rooms, mapping: opts.mapping ?? {}, fxToGbp: fx } },
    mapping, fields: { available, missing },
    period: { from, to, days, coverage },
    counts: { rows: rows.length, kept: kept.length, cancelled: rec.excluded.filter((e) => e.why === "CANCELLED").length, noShows: rec.excluded.filter((e) => e.why === "NO_SHOW").length, duplicates: rec.excluded.filter((e) => e.why === "EXACT_DUPLICATE").length, modified: rec.excluded.filter((e) => e.why === "MODIFIED_RESERVATION").length, conflicting: rec.excluded.filter((e) => e.why === "CONFLICTING_RESERVATION").length, excludedOther: rec.excluded.filter((e) => !["CANCELLED", "NO_SHOW", "EXACT_DUPLICATE", "MODIFIED_RESERVATION", "CONFLICTING_RESERVATION"].includes(e.why)).length },
    issues: rec.issues,
    weekly: weeklySeries,
    metrics: { avgStayNights, roomNightsSold, roomRevenueGbp: revenueGbp, adrGbp: adr, occupancy, revparGbp: revpar, otaShare: otaRoomNights !== null && roomNightsSold ? otaRoomNights / roomNightsSold : null, cancellationRate: cancellations !== null && roomNightsSold !== null ? cancelledNights / Math.max(1, roomNights + cancelledNights) : null, bookingWindowDays, peakOccupancy, basis },
    channels, snapshot, quality: q,
    recency: { periodEnd: to, collectedAt, importedAt, daysPeriodEndToCollection: toCollection, daysPeriodEndToImport: toImport, statement: recencyStatement },
    sufficiency: { verdict, window: { days, cls: wcls, minimumDays: ANNUALISATION_MIN_DAYS, fullYearDays: FULL_YEAR_DAYS, note: windowNote }, canCompute: can, cannotCompute: cannot, nextData: [...new Set(next)] },
    simulated: false,
  };
}
