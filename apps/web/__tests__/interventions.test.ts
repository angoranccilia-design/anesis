/** Interventions API (chantier F): closed without session, needs the runtime database, and no human-only transition in demo mode. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/db", () => ({ isDbConfigured: () => false, withDbClient: async () => null }));
const env = { ...process.env };
beforeEach(() => { delete process.env.DATABASE_URL; delete process.env.ANESIS_PGLITE_DIR; delete process.env.ANESIS_DEMO_OPEN; });
afterEach(() => { process.env = { ...env }; });

describe("/api/interventions", () => {
  it("locked without ANESIS_DEMO_OPEN (403); open demo without a runtime database says so (409) rather than inventing contracts", async () => {
    const { GET } = await import("@/app/api/interventions/route");
    expect((await GET()).status).toBe(403);
    process.env.ANESIS_DEMO_OPEN = "1";
    const r = await GET(); expect(r.status).toBe(409); expect((await r.json()).error).toMatch(/no runtime database/);
  });
  it("a transition that commits the property is refused in demo mode even when the API is open: there is no human", async () => {
    process.env.ANESIS_DEMO_OPEN = "1"; process.env.ANESIS_PGLITE_DIR = "/tmp/anesis-test-never-opened";
    vi.doMock("@/lib/engine/runtimeDb", () => ({ runtimeConfigured: () => true, getRuntime: async () => { throw new Error("must not be reached before the human check"); } }));
    const { POST } = await import("@/app/api/interventions/[id]/transition/route");
    for (const to of ["AUTHORISED", "EXECUTED", "MEASURED", "CLOSED", "REJECTED"]) {
      const r = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ to }) }), { params: Promise.resolve({ id: "INT-RUN-001-I-001" }) });
      expect(r.status).toBe(403); expect((await r.json()).error).toMatch(/requires an authenticated operator session/);
    }
    vi.doUnmock("@/lib/engine/runtimeDb");
  });
});
