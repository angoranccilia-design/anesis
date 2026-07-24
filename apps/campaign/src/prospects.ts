/**
 * Lecture d'une liste de prospects (CSV ou JSON) → PropertyImportRow[] pour l'import de campagne.
 * Colonnes/champs : name*, region*, source*, website, city, county, priority (*=requis).
 * Pur (aucune IO ici) → testable ; `run.ts` lit le fichier et appelle `parseProspects`.
 */
import type { PropertyImportRow } from "@anesis/core";

/** Découpe une ligne CSV en champs (gère les guillemets et les virgules échappées « "" »). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      out.push(field);
      field = "";
    } else field += c;
  }
  out.push(field);
  return out.map((f) => f.trim());
}

function toRow(o: Record<string, unknown>, i: number): PropertyImportRow {
  const s = (k: string): string | undefined => {
    const v = o[k];
    if (v == null || v === "") return undefined;
    return String(v);
  };
  const name = s("name");
  const region = s("region");
  const source = s("source");
  if (!name || !region || !source) {
    throw new Error(`Prospect #${i + 1} invalide : 'name', 'region' et 'source' sont requis.`);
  }
  const priorityRaw = s("priority");
  const priority = priorityRaw == null ? undefined : Number(priorityRaw);
  if (priority != null && !Number.isFinite(priority)) {
    throw new Error(`Prospect #${i + 1} : 'priority' doit être un nombre (reçu ${priorityRaw}).`);
  }
  return { name, region, source, website: s("website"), city: s("city"), county: s("county"), priority };
}

export function parseProspects(text: string, format: "csv" | "json"): PropertyImportRow[] {
  if (format === "json") {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("Le JSON doit être un tableau d'objets prospect.");
    return data.map((o, i) => toRow(o as Record<string, unknown>, i));
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) throw new Error("CSV vide ou sans ligne de données (en-tête + au moins une ligne).");
  const headers = splitCsvLine(lines[0]!).map((h) => h.toLowerCase());
  return lines.slice(1).map((line, i) => {
    const cells = splitCsvLine(line);
    const o: Record<string, string> = {};
    headers.forEach((h, j) => {
      o[h] = cells[j] ?? "";
    });
    return toRow(o, i);
  });
}

/** Choisit le format d'après l'extension du fichier. */
export function formatFromPath(path: string): "csv" | "json" {
  return path.toLowerCase().endsWith(".json") ? "json" : "csv";
}
