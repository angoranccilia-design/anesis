import { describe, expect, it } from "vitest";
import { hashToken, issueToken, verifyToken, MAGIC_LINK_TTL_MS, type StoredToken } from "../token.js";

const fixedBytes = (fill: number) => (n: number) => Buffer.alloc(n, fill);

describe("jetons de lien magique (pur)", () => {
  it("issueToken produit un clair + son hash SHA-256 cohérent", () => {
    const { token, tokenHash } = issueToken(fixedBytes(7));
    expect(tokenHash).toBe(hashToken(token));
    expect(token.length).toBeGreaterThan(0);
  });

  it("deux aléas différents → deux hash différents", () => {
    expect(issueToken(fixedBytes(1)).tokenHash).not.toBe(issueToken(fixedBytes(2)).tokenHash);
  });

  const base = (over: Partial<StoredToken> = {}): StoredToken => ({
    tokenHash: hashToken("good"),
    expiresAtMs: 1_000 + MAGIC_LINK_TTL_MS,
    consumedAtMs: null,
    ...over,
  });

  it("valide un jeton correct dans sa fenêtre", () => {
    expect(verifyToken(base(), "good", 1_000)).toEqual({ ok: true });
  });

  it("refuse : introuvable, consommé, expiré, non concordant", () => {
    expect(verifyToken(null, "good", 1_000)).toEqual({ ok: false, code: "not_found" });
    expect(verifyToken(base({ consumedAtMs: 900 }), "good", 1_000)).toEqual({ ok: false, code: "consumed" });
    expect(verifyToken(base(), "good", 1_000 + MAGIC_LINK_TTL_MS + 1)).toEqual({ ok: false, code: "expired" });
    expect(verifyToken(base(), "wrong", 1_000)).toEqual({ ok: false, code: "mismatch" });
  });

  it("l'ordre de priorité : consommé prime sur expiré prime sur non-concordant", () => {
    const stale = base({ consumedAtMs: 900, expiresAtMs: 0, tokenHash: hashToken("x") });
    expect(verifyToken(stale, "good", 10_000)).toEqual({ ok: false, code: "consumed" });
  });
});
