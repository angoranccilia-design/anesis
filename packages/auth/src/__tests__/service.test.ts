import { beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { applyMigrations, type SqlClient } from "@anesis/db";
import { consumeMagicLink, requestMagicLink, resolveSession } from "../service.js";
import { makeMailer, type Mailer } from "../mailer.js";

async function makeDb(): Promise<SqlClient> {
  const pg = new PGlite();
  await applyMigrations((sql) => pg.exec(sql));
  return pg as unknown as SqlClient;
}

/** Mailer de test : capture le dernier lien et extrait le jeton de l'URL. */
function capturingMailer(): Mailer & { lastLink: string | null; tokenOf(): string } {
  let lastLink: string | null = null;
  return {
    mode: "noop",
    async send() {},
    async sendMagicLink(_to, link) {
      lastLink = link;
    },
    get lastLink() {
      return lastLink;
    },
    tokenOf() {
      const u = new URL(lastLink!);
      return u.searchParams.get("token")!;
    },
  };
}

let pg: SqlClient;
let mailer: ReturnType<typeof capturingMailer>;

beforeEach(async () => {
  pg = await makeDb();
  mailer = capturingMailer();
  await pg.query("insert into operators (id,name,email,role) values ('op-cecilia','Cecilia','cecilia@anesisacquisition.com','founder')");
});

const seq = () => {
  let n = 0;
  return (p: string) => `${p}-${++n}`;
};

describe("lien magique — cycle complet", () => {
  it("demande → email envoyé → consommation → session active, pour tout opérateur", async () => {
    const req = await requestMagicLink(pg, mailer, { email: "Cecilia@anesisacquisition.com", baseUrl: "https://app.anesis.test/" }, { uid: seq(), nowMs: 1_000 });
    expect(req).toMatchObject({ requested: true, delivered: true });
    expect(mailer.lastLink).toContain("https://app.anesis.test/auth/verify?token=");

    const consumed = await consumeMagicLink(pg, mailer.tokenOf(), { uid: seq(), nowMs: 2_000 });
    expect(consumed.ok).toBe(true);
    if (!consumed.ok) return;
    expect(consumed.operator.email).toBe("cecilia@anesisacquisition.com");

    const who = await resolveSession(pg, consumed.sessionId, { nowMs: 3_000 });
    expect(who?.id).toBe("op-cecilia");
  });

  it("email inconnu : réponse identique, aucun envoi, aucun jeton (anti-énumération)", async () => {
    const req = await requestMagicLink(pg, mailer, { email: "stranger@example.com", baseUrl: "https://app.anesis.test" }, { uid: seq() });
    expect(req).toEqual({ requested: true, delivered: false, operatorId: null });
    expect(mailer.lastLink).toBeNull();
    const n = (await pg.query("select count(*)::int as c from magic_link_tokens")).rows[0]!.c;
    expect(n).toBe(0);
  });

  it("un jeton ne peut être consommé qu'une seule fois (anti-rejeu)", async () => {
    await requestMagicLink(pg, mailer, { email: "cecilia@anesisacquisition.com", baseUrl: "https://app.anesis.test" }, { uid: seq(), nowMs: 1_000 });
    const token = mailer.tokenOf();
    expect((await consumeMagicLink(pg, token, { uid: seq(), nowMs: 2_000 })).ok).toBe(true);
    expect(await consumeMagicLink(pg, token, { uid: seq(), nowMs: 3_000 })).toEqual({ ok: false, code: "consumed" });
  });

  it("un jeton expiré est refusé", async () => {
    await requestMagicLink(pg, mailer, { email: "cecilia@anesisacquisition.com", baseUrl: "https://app.anesis.test" }, { uid: seq(), nowMs: 0 });
    const outcome = await consumeMagicLink(pg, mailer.tokenOf(), { uid: seq(), nowMs: 16 * 60_000 });
    expect(outcome).toEqual({ ok: false, code: "expired" });
  });

  it("un jeton inconnu est refusé", async () => {
    expect(await consumeMagicLink(pg, "n-existe-pas", { uid: seq() })).toEqual({ ok: false, code: "not_found" });
  });

  it("une session expirée ne résout plus", async () => {
    await requestMagicLink(pg, mailer, { email: "cecilia@anesisacquisition.com", baseUrl: "https://app.anesis.test" }, { uid: seq(), nowMs: 1_000 });
    const consumed = await consumeMagicLink(pg, mailer.tokenOf(), { uid: seq(), nowMs: 2_000 });
    if (!consumed.ok) throw new Error("attendu ok");
    const far = 2_000 + 8 * 24 * 60 * 60_000;
    expect(await resolveSession(pg, consumed.sessionId, { nowMs: far })).toBeNull();
  });
});

describe("mailer", () => {
  it("sans RESEND_API_KEY : mode noop, logge le lien, ne lève jamais", async () => {
    const logs: string[] = [];
    const m = makeMailer({ apiKey: undefined, log: (s) => logs.push(s) });
    expect(m.mode).toBe("noop");
    await expect(m.sendMagicLink("x@anesis.test", "https://link")).resolves.toBeUndefined();
    expect(logs[0]).toContain("https://link");
  });

  it("avec clé : mode resend, appelle l'API HTTP (fetch injecté)", async () => {
    let called: { url: string; auth: string } | null = null;
    const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      called = { url: String(url), auth: String((init?.headers as Record<string, string>).authorization) };
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    const m = makeMailer({ apiKey: "re_test", fetchImpl: fakeFetch });
    expect(m.mode).toBe("resend");
    await m.sendMagicLink("x@anesis.test", "https://link");
    expect(called!.url).toBe("https://api.resend.com/emails");
    expect(called!.auth).toBe("Bearer re_test");
  });
});
