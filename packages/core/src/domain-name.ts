/**
 * Normalisation de domaine — clé de déduplication des Property à l'import.
 * Retire protocole, `www.`, chemin, requête, ancre, port et point final ; met en minuscules.
 * Pure, aucune dépendance.
 */
export const normalizeDomain = (input: string | null | undefined): string | null => {
  if (!input) return null;
  let s = input.trim().toLowerCase();
  if (s === "") return null;
  s = s.replace(/^https?:\/\//, "").replace(/^www\./, "");
  s = s.split("/")[0] ?? s;
  s = s.split("?")[0] ?? s;
  s = s.split("#")[0] ?? s;
  s = s.split(":")[0] ?? s;
  s = s.replace(/\.$/, "");
  return s === "" ? null : s;
};
