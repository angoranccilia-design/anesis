/**
 * Property — établissement, entité pivot. Point d'entrée = `prospect`
 * (la prospection de la firme vit dans le système : chaque établissement analysé
 * devient une Property(prospect), y compris s'il est refusé).
 */
import type { Iso8601, Money, PropertyId } from "./primitives.js";
import { iso } from "./primitives.js";
import type { TransitionMap } from "./state-machine.js";

export type PropertyState =
  | "prospect"
  | "assessed"
  | "qualified"
  | "underwriting"
  | "mandate"
  | "completed"
  | "declined"
  | "dormant";

export const PROPERTY_TRANSITIONS: TransitionMap<PropertyState> = {
  prospect: ["assessed", "declined", "dormant"],
  assessed: ["qualified", "declined", "dormant"],
  qualified: ["underwriting", "declined", "dormant"],
  underwriting: ["mandate", "declined", "dormant"],
  mandate: ["completed", "dormant"],
  completed: ["dormant"],
  declined: ["prospect"], // réanimation possible
  dormant: ["prospect"],
};

export interface PropertyContact {
  readonly name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly role: string | null;
}

export interface Property {
  readonly id: PropertyId;
  readonly name: string;
  readonly state: PropertyState;
  // Localisation & provenance — disponibles dès le stade prospect (import en lot)
  readonly city: string | null;
  readonly county: string | null;
  readonly region: string; // région du Royaume-Uni
  readonly website: string | null; // sert de clé de déduplication (via normalizeDomain)
  readonly source: string; // ex: "campaign-2026-08", "referral", "manual"
  readonly priority: number; // 0..100 (issu de l'import / grille de ciblage)
  // Métriques ICP — inconnues au stade prospect, renseignées à l'assessment (étape 2)
  readonly keys: number | null; // 12–80 cible
  readonly avgNightlyRate: Money | null; // > £140 cible
  readonly otaSharePct: number | null; // > 35 % cible
  readonly hasInHouseMarketing: boolean | null; // ICP = false
  readonly contacts: readonly PropertyContact[];
  readonly createdAt: Iso8601;
  readonly updatedAt: Iso8601;
}

/** Ligne d'import CSV → Property(prospect). Champs de l'import de campagne (3 août). */
export interface PropertyImportRow {
  readonly name: string;
  readonly city?: string;
  readonly county?: string;
  readonly region: string;
  readonly website?: string;
  readonly source: string;
  readonly priority?: number;
}

/** Fabrique une Property à l'état prospect à partir d'une ligne d'import, dans un état valide. */
export const newProspect = (id: PropertyId, row: PropertyImportRow, now: Iso8601 = iso()): Property => ({
  id,
  name: row.name,
  state: "prospect",
  city: row.city ?? null,
  county: row.county ?? null,
  region: row.region,
  website: row.website ?? null,
  source: row.source,
  priority: row.priority ?? 0,
  keys: null,
  avgNightlyRate: null,
  otaSharePct: null,
  hasInHouseMarketing: null,
  contacts: [],
  createdAt: now,
  updatedAt: now,
});
