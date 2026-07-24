/**
 * Roster canonique ANESIS — les 12 agents MÉTIER (Partie B du brief). Le roster est fixe.
 * L'agent est identifié par un slug stable (pas un uuid).
 * Le niveau d'autonomie ci-dessous est le DÉFAUT de l'agent ; chaque action peut le surcharger.
 * `art-director` (T5) est DISTINCT de `content-creator` : fonction STRATÉGIQUE au niveau du mandat
 * (univers de marque, repositionnement), non rattachée à un LossLineItem — là où content-creator est
 * de l'exécution routée depuis un Objective chiffré. Les deux coexistent volontairement.
 *
 * `planner` N'EST PAS un agent métier : c'est un UTILITAIRE SYSTÈME interne (ni KPI, ni pilotage
 * humain), au même titre que le bus d'événements ou le moteur de politique → hors roster (SystemAgentId).
 */
import type { AutonomyTier } from "./autonomy.js";
import type { EventType, TickType } from "./event.js";

export type AgentId =
  | "analyst"
  | "underwriter"
  | "orchestrator"
  | "social-ops"
  | "conversion"
  | "reputation"
  | "partnerships"
  | "lifecycle"
  | "media-buyer"
  | "rate-distribution"
  | "content-creator"
  | "art-director";

/** Agents SYSTÈME (plomberie interne) : hors roster des 12, sans KPI ni pilotage humain. */
export type SystemAgentId = "planner";

/** Tout id capable d'EXÉCUTER dans le runtime : les 12 du roster + les agents système. */
export type RunnableAgentId = AgentId | SystemAgentId;

export interface RosterEntry {
  readonly role: string; // libellé d'interface, anglais britannique
  readonly defaultTier: AutonomyTier;
}

export const ROSTER: Record<AgentId, RosterEntry> = {
  analyst: { role: "Analyst", defaultTier: "T0" },
  underwriter: { role: "Underwriter", defaultTier: "T0" },
  orchestrator: { role: "Orchestrator", defaultTier: "T0" },
  "social-ops": { role: "Social Ops", defaultTier: "T1" },
  conversion: { role: "Conversion", defaultTier: "T1" },
  reputation: { role: "Reputation", defaultTier: "T2" },
  partnerships: { role: "Partnerships", defaultTier: "T2" },
  lifecycle: { role: "Lifecycle", defaultTier: "T3" },
  "media-buyer": { role: "Media Buyer", defaultTier: "T4" },
  "rate-distribution": { role: "Rate & Distribution", defaultTier: "T4" },
  "content-creator": { role: "Content Creator", defaultTier: "T5" },
  "art-director": { role: "Art Director", defaultTier: "T5" },
};

export const AGENT_IDS = Object.keys(ROSTER) as AgentId[];

export interface AgentToolRef {
  readonly name: string;
  /** Niveau d'autonomie PAR ACTION (surcharge le défaut de l'agent). */
  readonly tier: AutonomyTier;
}

/** Définition d'un agent : rôle, contrats E/S, outils, abonnements, autonomie par défaut. */
export interface AgentDefinition {
  readonly id: AgentId;
  readonly role: string;
  readonly inputContract: string; // ce qu'il lit dans le workspace
  readonly outputContract: string; // les artefacts qu'il produit
  readonly tools: readonly AgentToolRef[];
  readonly subscribesTo: readonly (EventType | TickType)[];
  readonly defaultTier: AutonomyTier;
}
