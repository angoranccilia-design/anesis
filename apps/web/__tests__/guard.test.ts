/** Route-level access control (chantier A). No database here: the DB branch is exercised with a mocked session resolver. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const cookieJar = { value: null as string | null };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (name === "anesis_session" && cookieJar.value ? { value: cookieJar.value } : undefined) }) }));
const sessions: Record<string, { id: string; name: string; email: string; role: "founder" | "operator" }> = { "sid-founder": { id: "op-1", name: "Cecilia", email: "c@example.test", role: "founder" }, "sid-op": { id: "op-2", name: "Op", email: "o@example.test", role: "operator" } };
vi.mock("@anesis/auth", () => ({ resolveSession: async (_c: unknown, sid: string) => sessions[sid] ?? null, revokeSession: async () => true }));
vi.mock("@/lib/db", () => ({ isDbConfigured: () => process.env.DATABASE_URL !== undefined, withDbClient: async (fn: (c: unknown) => Promise<unknown>) => (process.env.DATABASE_URL ? fn({ query: async () => ({ rows: [] }) }) : null) }));

const env = { ...process.env };
beforeEach(() => { delete process.env.DATABASE_URL; delete process.env.ANESIS_DEMO_OPEN; cookieJar.value = null; });
afterEach(() => { process.env = { ...env }; });

describe("guardApi", () => {
  it("demo without ANESIS_DEMO_OPEN: 403, the engine API is closed", async () => {
    const { guardApi } = await import("@/lib/guard");
    const g = await guardApi(); expect(g.ok).toBe(false); if (!g.ok) { expect(g.response.status).toBe(403); expect((await g.response.json()).error).toMatch(/demo mode locked/); }
  });
  it("demo with ANESIS_DEMO_OPEN=1: open, operator null, actor is 'demo' and not human", async () => {
    process.env.ANESIS_DEMO_OPEN = "1";
    const { guardApi, actorOf } = await import("@/lib/guard");
    const g = await guardApi(); expect(g.ok).toBe(true); if (g.ok) { expect(g.mode).toBe("demo"); expect(g.operator).toBeNull(); expect(actorOf(g)).toEqual({ by: "demo (no session)", human: false }); }
  });
  it("database configured and no cookie: 401; a revoked or unknown session: 401; a valid session: the operator of the session", async () => {
    process.env.DATABASE_URL = "postgres://test"; process.env.ANESIS_DEMO_OPEN = "1";   // demo flag must not open a database-backed deployment
    const { guardApi, guardFounder, actorOf } = await import("@/lib/guard");
    let g = await guardApi(); expect(g.ok).toBe(false); if (!g.ok) expect(g.response.status).toBe(401);
    cookieJar.value = "sid-stolen-or-revoked"; g = await guardApi(); expect(g.ok).toBe(false); if (!g.ok) expect(g.response.status).toBe(401);
    cookieJar.value = "sid-op"; g = await guardApi(); expect(g.ok).toBe(true); if (g.ok && g.mode === "db") { expect(g.operator.email).toBe("o@example.test"); expect(actorOf(g)).toEqual({ by: "Op <o@example.test>", human: true }); }
    const f = await guardFounder(); expect(f.ok).toBe(false); if (!f.ok) expect(f.response.status).toBe(403);
    cookieJar.value = "sid-founder"; const f2 = await guardFounder(); expect(f2.ok).toBe(true);
  });
});

describe("routes", () => {
  it("reset needs a founder (or explicit demo) and { confirm: true }; 'reset' typed in a question never executes", async () => {
    process.env.ANESIS_DEMO_OPEN = "1";
    const { POST: reset } = await import("@/app/api/engine/reset/route");
    const r1 = await reset(new Request("http://x/api/engine/reset", { method: "POST" })); expect(r1.status).toBe(400);
    delete process.env.ANESIS_DEMO_OPEN;
    const r2 = await reset(new Request("http://x/api/engine/reset", { method: "POST", body: JSON.stringify({ confirm: true }) })); expect(r2.status).toBe(403);
    process.env.ANESIS_DEMO_OPEN = "1";
    const { POST: ask } = await import("@/app/api/engine/ask/route");
    const r3 = await ask(new Request("http://x/api/engine/ask", { method: "POST", body: JSON.stringify({ question: "reset", language: "en" }) }));
    const j = await r3.json(); expect(j.executed).toBe(false); expect(j.answer.headline).toMatch(/reset control/);
  });
  it("every engine route refuses when locked: memory, runs, context, registers GET and POST, stream, report", async () => {
    const mods = await Promise.all([import("@/app/api/engine/memory/route"), import("@/app/api/engine/runs/route"), import("@/app/api/engine/registers/route"), import("@/app/api/engine/stream/route")]);
    for (const m of mods) { const r = await (m as { GET: () => Promise<Response> }).GET(); expect(r.status).toBe(403); }
    const reg = mods[2] as { POST: (r: Request) => Promise<Response> };
    expect((await reg.POST(new Request("http://x", { method: "POST", body: JSON.stringify({ clear: true }) }))).status).toBe(403);
    const { GET: report } = await import("@/app/api/engine/report/[id]/route");
    expect((await report(new Request("http://x"), { params: Promise.resolve({ id: "latest" }) })).status).toBe(403);
  });
  it("registers: the camera env probe only accepts the ANESIS_CAMERA_<ZONE>_STREAM_URL shape", async () => {
    process.env.ANESIS_DEMO_OPEN = "1";
    const { POST } = await import("@/app/api/engine/registers/route");
    const bad = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ camera: { id: "c", zone: "lobby", purpose: "queue", streamUrlEnv: "ANTHROPIC_API_KEY", retentionHours: 1, legalBasis: "test" } }) }));
    expect(bad.status).toBe(400);
  });
});
