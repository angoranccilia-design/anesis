import { beforeAll, describe, expect, it } from "vitest";
import { makeTestDb } from "./db.js";
import { importProperties } from "../import-properties.js";
import type { SqlClient } from "../context.js";

let pg: SqlClient;
let n = 0;
const genId = () => `prop-${(n += 1)}`;

beforeAll(async () => {
  pg = await makeTestDb();
});

describe("importProperties — déduplication par domaine de site web", () => {
  it("dédoublonne dans le même lot et garde les prospects sans site", async () => {
    const res = await importProperties(
      pg,
      [
        { name: "The Old Rectory", region: "South West", source: "campaign-2026-08", website: "https://www.theoldrectory.co.uk/" },
        { name: "Old Rectory (doublon)", region: "South West", source: "campaign-2026-08", website: "theoldrectory.co.uk/rooms?ref=x" },
        { name: "Fox & Hound", region: "South East", source: "campaign-2026-08", website: "https://foxandhound.com" },
        { name: "Sans site web", region: "Wales", source: "campaign-2026-08" },
      ],
      genId,
    );
    expect(res.inserted).toBe(3);
    expect(res.skipped).toBe(1);
  });

  it("dédoublonne aussi contre l'existant (deuxième lot)", async () => {
    const res = await importProperties(
      pg,
      [
        { name: "Rectory (revient)", region: "South West", source: "campaign-2026-08", website: "http://theoldrectory.co.uk" },
        { name: "New Place", region: "Scotland", source: "campaign-2026-08", website: "newplace.scot" },
      ],
      genId,
    );
    expect(res.inserted).toBe(1);
    expect(res.skipped).toBe(1);
  });

  it("deux prospects sans site ne se dédupliquent pas entre eux", async () => {
    const res = await importProperties(
      pg,
      [
        { name: "Anon A", region: "North", source: "campaign-2026-08" },
        { name: "Anon B", region: "North", source: "campaign-2026-08" },
      ],
      genId,
    );
    expect(res.inserted).toBe(2);
    expect(res.skipped).toBe(0);
  });
});
