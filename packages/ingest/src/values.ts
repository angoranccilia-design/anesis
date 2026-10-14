/** Value parsing that says "unknown" instead of guessing. Dates keep their raw text; ambiguous day/month order is reported, not resolved silently. */
import { excelSerialToIso } from "./table.js";

export interface Parsed<T> { readonly value: T | null; readonly raw: string; readonly note: string | null }

export type DateOrder = "DMY" | "MDY" | "YMD" | "ambiguous";

/** Infers day/month order from the whole column: any value with a first part > 12 proves DMY, a second part > 12 proves MDY. */
export function inferDateOrder(samples: readonly string[]): DateOrder {
  let dmy = 0, mdy = 0, ymd = 0, slash = 0;
  for (const s of samples) { const t = s.trim(); if (/^\d{4}-\d{2}-\d{2}/.test(t)) { ymd++; continue; } const m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/.exec(t); if (!m) continue; slash++; const a = Number(m[1]), b = Number(m[2]); if (a > 12) dmy++; if (b > 12) mdy++; }
  if (ymd && !slash) return "YMD"; if (dmy && !mdy) return "DMY"; if (mdy && !dmy) return "MDY"; if (!dmy && !mdy && slash) return "ambiguous"; return dmy > mdy ? "DMY" : "MDY";
}

export function parseDate(raw: string, order: DateOrder): Parsed<string> {
  const t = raw.trim(); if (!t) return { value: null, raw, note: null };
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) { const d = new Date(t.slice(0, 10) + "T00:00:00Z"); return isNaN(d.getTime()) ? { value: null, raw, note: "unreadable date" } : { value: d.toISOString().slice(0, 10), raw, note: null }; }
  if (/^\d{5}(\.\d+)?$/.test(t)) return { value: excelSerialToIso(Number(t)), raw, note: "Excel serial date" };
  const m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})(?:[ T].*)?$/.exec(t);
  if (m) {
    if (order === "ambiguous") return { value: null, raw, note: "ambiguous day/month order (no value above 12 in the column); declare the date format" };
    const y = m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3]); const a = Number(m[1]), b = Number(m[2]);
    const [day, month] = order === "MDY" ? [b, a] : [a, b];
    if (month < 1 || month > 12 || day < 1 || day > 31) return { value: null, raw, note: "impossible date" };
    const d = new Date(Date.UTC(y, month - 1, day)); if (d.getUTCMonth() !== month - 1) return { value: null, raw, note: "impossible date" };
    return { value: d.toISOString().slice(0, 10), raw, note: null };
  }
  const d = new Date(t); return isNaN(d.getTime()) ? { value: null, raw, note: "unreadable date" } : { value: d.toISOString().slice(0, 10), raw, note: "free-form date parsed by the runtime" };
}

export const CURRENCY_SYMBOLS: Record<string, string> = { "£": "GBP", "€": "EUR", "$": "USD", "CHF": "CHF" };
/** Money: "£1,234.50", "1 234,50 €", "1234.5", "(120.00)". Returns the amount and the currency found in the text, if any. */
export function parseMoney(raw: string): Parsed<number> & { currency: string | null } {
  let t = raw.trim(); if (!t) return { value: null, raw, note: null, currency: null };
  let currency: string | null = null;
  for (const [sym, code] of Object.entries(CURRENCY_SYMBOLS)) if (t.includes(sym)) { currency = code; t = t.split(sym).join(""); }
  const code = /\b(GBP|EUR|USD|CHF)\b/i.exec(t); if (code) { currency = code[1]!.toUpperCase(); t = t.replace(code[0], ""); }
  let neg = false; if (/^\(.*\)$/.test(t.trim())) { neg = true; t = t.trim().slice(1, -1); } if (t.trim().startsWith("-")) { neg = true; t = t.replace("-", ""); }
  t = t.replace(/\s/g, "");
  // decide the decimal separator: the last of "," or "." with 1–2 digits after it
  const lastComma = t.lastIndexOf(","), lastDot = t.lastIndexOf(".");
  let num: string;
  if (lastComma > lastDot && t.length - lastComma - 1 <= 2) num = t.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma && t.length - lastDot - 1 <= 2) num = t.replace(/,/g, "");
  else num = t.replace(/[,.]/g, "");
  const v = Number(num); if (!Number.isFinite(v)) return { value: null, raw, note: "unreadable amount", currency };
  return { value: neg ? -v : v, raw, note: null, currency };
}

export function parseInt0(raw: string): Parsed<number> { const t = raw.trim(); if (!t) return { value: null, raw, note: null }; const v = Number(t.replace(/\s/g, "").replace(",", ".")); return Number.isFinite(v) ? { value: Math.round(v), raw, note: null } : { value: null, raw, note: "unreadable number" }; }
export const daysBetween = (a: string, b: string): number => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
