/**
 * Point d'entrée EXPLICITEMENT non sûr : `@anesis/core/unsafe`.
 * `asId` caste n'importe quelle chaîne vers n'importe quel identifiant nominatif — nécessaire pour
 * les tests et les adaptateurs (db, imports), mais dangereux en code applicatif.
 * L'isoler ici rend tout usage visible en revue (grep `@anesis/core/unsafe`).
 */
import type { Brand } from "./primitives.js";

export const asId = <T extends Brand<string, unknown>>(value: string): T => value as unknown as T;
