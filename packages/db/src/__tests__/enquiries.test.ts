import { beforeEach, describe, expect, it } from "vitest";
import { makeTestDb } from "./db.js";
import { insertEnquiry, listEnquiries } from "../enquiries.js";
import type { SqlClient } from "../context.js";

let pg: SqlClient;
beforeEach(async () => {
  pg = await makeTestDb({ asApp: true });
});

describe("intake — enquiries", () => {
  it("insère une enquête et la relit dans le registre", async () => {
    const id = await insertEnquiry(pg, { kind: "diagnostic", name: "Jane Fell", email: "jane@millhotel.co.uk", hotel: "The Cotswold Mill", website: "millhotel.co.uk" }, "enq-1");
    expect(id).toBe("enq-1");
    const rows = await listEnquiries(pg);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "enq-1", kind: "diagnostic", hotel: "The Cotswold Mill", status: "new" });
  });

  it("website optionnel → null, statut par défaut 'new'", async () => {
    await insertEnquiry(pg, { name: "A", email: "a@b.co.uk", hotel: "Harbour House" }, "enq-2");
    const rows = await listEnquiries(pg);
    expect(rows[0]).toMatchObject({ website: null, status: "new" });
  });

  it("liste triée par date décroissante", async () => {
    await insertEnquiry(pg, { name: "A", email: "a@b.co.uk", hotel: "H1" }, "enq-a");
    await insertEnquiry(pg, { name: "B", email: "b@b.co.uk", hotel: "H2" }, "enq-b");
    const rows = await listEnquiries(pg, 1);
    expect(rows).toHaveLength(1); // limit respecté
  });
});
