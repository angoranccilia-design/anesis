import { beforeAll, describe, expect, it } from "vitest";
import { EventBus } from "../bus.js";
import type { SqlClient } from "@anesis/db";
import { countSideEffects, makeEventDb, recordingSubscriber } from "./harness.js";
import { objectiveCreated } from "./events.js";

/**
 * Exigence 1 — le rejeu est un test, pas une promesse : on insère 5 événements, on simule une panne
 * du bus APRÈS le 3e (les 4e/5e sont persistés mais jamais dispatchés), puis on prouve que rejouer
 * depuis la table produit exactement les mêmes effets de bord que si le bus n'était jamais tombé.
 */
describe("rejeu depuis la table après panne du bus", () => {
  let pg: SqlClient;
  let bus: EventBus;

  beforeAll(async () => {
    pg = await makeEventDb();
    bus = new EventBus(pg);
    bus.subscribe(recordingSubscriber("recorder", ["objective.created"]));

    // 1..3 : publiés normalement (append + dispatch)
    for (let n = 1; n <= 3; n++) await bus.publish(objectiveCreated(n));
    // 4..5 : la source de vérité les reçoit, mais le bus tombe AVANT de les dispatcher
    await bus.append(objectiveCreated(4));
    await bus.append(objectiveCreated(5));
  });

  it("avant rejeu : seuls les 3 premiers ont produit leur effet", async () => {
    expect(await countSideEffects(pg)).toBe(3);
  });

  it("les 5 événements sont bien dans la table (source de vérité intacte)", async () => {
    const { rows } = await pg.query("select count(*)::int as n from events");
    expect(Number(rows[0]?.n)).toBe(5);
  });

  it("après rejeu : les 5 effets sont présents, chacun UNE seule fois (idempotence)", async () => {
    await bus.replay();
    expect(await countSideEffects(pg)).toBe(5);
    const { rows } = await pg.query(
      "select event_id, count(*)::int as n from side_effects group by event_id order by event_id",
    );
    expect(rows.map((r) => Number(r.n))).toEqual([1, 1, 1, 1, 1]);
  });

  it("un second rejeu ne change plus rien (convergence)", async () => {
    await bus.replay();
    expect(await countSideEffects(pg)).toBe(5);
  });
});
