import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const importsLlm = (src: string) => /\bfrom\s+["'][^"']*(anthropic|openai|@anesis\/.*llm)[^"']*["']/i.test(src);

/**
 * Garde structurelle — protège la séparation des phases comme `.replay(` et le chokepoint `authorize()`
 * protègent leurs règles. Le montant perdu se calcule dans la phase Score, jamais dans un LLM.
 */
describe("séparation des phases — aucune fuite de LLM dans les phases 1 et 2", () => {
  it("score.ts n'importe aucun client LLM", () => {
    expect(importsLlm(read("../score.ts"))).toBe(false);
  });

  it("score.ts n'importe pas la phase Rapport (pas de retour vers le texte)", () => {
    expect(read("../score.ts")).not.toContain("./report");
  });

  it("collect.ts n'importe aucun client LLM", () => {
    expect(importsLlm(read("../collect.ts"))).toBe(false);
  });
});
