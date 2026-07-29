/**
 * @anesis/readmodel — vues de lecture pour l'interface : cockpit fondatrice (transversal, `withFounder`)
 * et dashboard client (mandat unique, `withMandate`), plus un seed de démonstration réaliste.
 */
export * from "./types.js";
export { cockpitOverview } from "./cockpit.js";
export { clientDashboard } from "./dashboard.js";
export { seedDemo, type SeededDemo } from "./seed.js";
