import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const runtimeSrc = fileURLToPath(new URL("../", import.meta.url)); // .../agent-runtime/src
const agentsDir = join(runtimeSrc, "agents");

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkTs(p));
    else if (p.endsWith(".ts")) out.push(p);
  }
  return out;
}

/**
 * Garde structurelle — comme le `.replay(` d'events : un test qui protège une règle qu'aucun type ne
 * peut faire respecter. Une action ne s'exécute JAMAIS hors du chokepoint `RuntimeContext.act()`.
 */
describe("chokepoint — aucune exécution d'action hors du chemin authorize()", () => {
  it("aucun agent n'écrit dans `tool_calls` directement (seul le runtime le fait)", () => {
    const offenders = walkTs(agentsDir).filter((f) => readFileSync(f, "utf8").includes("tool_calls"));
    expect(offenders).toEqual([]);
  });

  it("aucun agent n'importe @anesis/policy (seul moyen d'appeler authorize — ils passent par ctx.act)", () => {
    const importsPolicy = (src: string) => /\bfrom\s+["']@anesis\/policy["']/.test(src);
    const offenders = walkTs(agentsDir).filter((f) => importsPolicy(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("le runtime, lui, appelle bien authorize() avant d'écrire dans tool_calls (le chemin existe)", () => {
    const runtime = readFileSync(join(runtimeSrc, "runtime.ts"), "utf8");
    expect(runtime).toContain("authorize(");
    expect(runtime).toContain("insert into tool_calls");
    // authorize() apparaît avant l'insertion du tool_call dans le fichier (chokepoint ordonné).
    expect(runtime.indexOf("authorize(")).toBeLessThan(runtime.indexOf("insert into tool_calls"));
  });
});
