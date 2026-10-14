/** CSV and XLSX → rows of strings. The CSV parser handles quotes, embedded newlines, a BOM and sniffs the delimiter. */
import * as XLSX from "xlsx";

export interface Table { readonly headers: string[]; readonly rows: string[][]; readonly format: "csv" | "xlsx"; readonly delimiter: string | null; readonly sheet: string | null }

export function sniffDelimiter(text: string): string {
  const head = text.split(/\r?\n/).slice(0, 5).join("\n");
  const counts = [",", ";", "\t", "|"].map((d) => ({ d, n: (head.match(new RegExp(d === "|" ? "\\|" : d, "g")) ?? []).length }));
  return counts.sort((a, b) => b.n - a.n)[0]!.n > 0 ? counts.sort((a, b) => b.n - a.n)[0]!.d : ",";
}

export function parseCsv(input: string, delimiter?: string): Table {
  const text = input.replace(/^﻿/, ""); const d = delimiter ?? sniffDelimiter(text);
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"') { q = true; continue; }
    if (c === d) { row.push(cell); cell = ""; continue; }
    if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some((x) => x.trim() !== "")) rows.push(row); row = []; continue; }
    cell += c;
  }
  row.push(cell); if (row.some((x) => x.trim() !== "")) rows.push(row);
  const headers = (rows.shift() ?? []).map((h) => h.trim());
  return { headers, rows: rows.map((r) => headers.map((_, i) => (r[i] ?? "").trim())), format: "csv", delimiter: d, sheet: null };
}

export function parseXlsx(buf: Uint8Array | ArrayBuffer): Table {
  const wb = XLSX.read(buf, { type: "array", cellDates: false });
  const name = wb.SheetNames[0]; if (!name) return { headers: [], rows: [], format: "xlsx", delimiter: null, sheet: null };
  const sheet = wb.Sheets[name]!;
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" }) as unknown[][];
  const nonEmpty = aoa.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  const headers = (nonEmpty.shift() ?? []).map((h) => String(h ?? "").trim());
  return { headers, rows: nonEmpty.map((r) => headers.map((_, i) => { const v = r[i]; return v === null || v === undefined ? "" : typeof v === "number" ? String(v) : String(v).trim(); })), format: "xlsx", delimiter: null, sheet: name };
}

/** Excel serial date (days since 1899-12-30) → ISO date. */
export const excelSerialToIso = (n: number): string => new Date(Math.round((n - 25569) * 86_400_000)).toISOString().slice(0, 10);
