import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { EventBus } from "../bus.js";
import { asId } from "@anesis/core/unsafe";
import type { CorrelationId, EventId, MandateId, PropertyId } from "@anesis/core";
import { makeEvent } from "../event-factory.js";
import { makeEventDb } from "./harness.js";

/**
 * DÉCISION DOCUMENTÉE : `events` est un journal SYSTÈME global, sans RLS par mandat. Un lecteur
 * (le worker de rejeu) voit les événements de tous les mandats — d'où la règle : seul le processus
 * système lit `events` via le bus, jamais du code agissant pour un mandat.
 */
describe("events — journal système global (pas d'isolation par mandat sur la table)", () => {
  it("un lecteur unique voit les événements de plusieurs mandats", async () => {
    const pg = await makeEventDb();
    const bus = new EventBus(pg);
    const ev = (m: string) =>
      makeEvent({
        id: asId<EventId>(`e-${m}`),
        type: "mandate.created",
        payload: { mandateId: asId<MandateId>(m), propertyId: asId<PropertyId>(`p-${m}`) },
        correlationId: asId<CorrelationId>("c"),
        mandateId: asId<MandateId>(m),
      });
    await bus.append(ev("A"));
    await bus.append(ev("B"));

    const { rows } = await pg.query("select mandate_id from events order by mandate_id");
    expect(rows.map((r) => r.mandate_id)).toEqual(["A", "B"]);
  });
});

/**
 * Frontière gardée : aucun paquet « mandat-facing » ne doit appeler `EventBus.replay` directement
 * (lecture système). Aujourd'hui trivialement vert ; deviendra parlant dès que packages/policy et
 * packages/agent-runtime existeront.
 */
describe("frontière — aucun appel direct à .replay() hors @anesis/events", () => {
  it("aucun `.replay(` dans du code mandat-facing (seuls events + l'orchestrateur système l'utilisent)", () => {
    const packagesDir = fileURLToPath(new URL("../../../", import.meta.url)); // .../packages
    // Seul l'orchestrateur système (le worker) a le droit de rejouer depuis la table. C'est le
    // « fonction d'orchestration dédiée » de la décision : agent-runtime/src/runtime.ts (drain).
    const SANCTIONED = join("agent-runtime", "src", "runtime.ts");
    const offenders: string[] = [];
    for (const pkg of readdirSync(packagesDir)) {
      if (pkg === "events") continue;
      const srcDir = join(packagesDir, pkg, "src");
      let files: string[] = [];
      try {
        files = walkTs(srcDir);
      } catch {
        continue; // paquet sans src
      }
      for (const file of files) {
        if (file.endsWith(SANCTIONED)) continue; // orchestrateur système autorisé
        if (readFileSync(file, "utf8").includes(".replay(")) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "__tests__") continue; // la règle vise le code de PRODUCTION, pas les tests
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkTs(p));
    else if (p.endsWith(".ts")) out.push(p);
  }
  return out;
}
