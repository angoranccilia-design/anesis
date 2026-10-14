import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Operator } from "@anesis/core";

/**
 * Demo mode — a complete, labelled demonstration without a Postgres server: an in-memory runtime database seeded with a
 * synthetic property, and a password-only sign-in. Everything the demo operator does is recorded as "Demo founder (demo
 * session)" — a real person at the keyboard, not an e-mail-verified operator. Never used when DATABASE_URL is set.
 */
export const demoMode = (): boolean => process.env.ANESIS_DEMO_MODE === "1" && !process.env.DATABASE_URL;
export const demoPasswordSet = (): boolean => Boolean(process.env.ANESIS_DEMO_PASSWORD);
export const DEMO_COOKIE = "anesis_demo";
export const DEMO_PROPERTY_ID = "PROP-DEMO-1";
export const DEMO_OPERATOR: Operator = { id: "demo-founder" as Operator["id"], name: "Demo founder", email: "demo@anesis.local", role: "founder" };

const expected = (): Buffer => createHmac("sha256", process.env.ANESIS_DEMO_PASSWORD ?? "").update("anesis-demo-session-v1").digest();
export const demoCookieValue = (): string => expected().toString("hex");
export function demoSessionValid(cookie: string | undefined | null): boolean {
  if (!cookie || !demoPasswordSet()) return false;
  const given = Buffer.from(cookie, "hex"); const want = expected();
  return given.length === want.length && timingSafeEqual(given, want);
}
export function demoPasswordMatches(password: string): boolean {
  const a = Buffer.from(password); const b = Buffer.from(process.env.ANESIS_DEMO_PASSWORD ?? "");
  return a.length === b.length && b.length > 0 && timingSafeEqual(a, b);
}
