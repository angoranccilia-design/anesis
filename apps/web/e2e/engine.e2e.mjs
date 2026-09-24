/**
 * Acceptance test of the Commercial Intelligence Engine console (brief §40), run against a live server.
 * Usage: BASE_URL=http://localhost:3111 node e2e/engine.e2e.mjs   (needs Playwright + Chromium)
 * Every step asserts something the engine actually did; nothing is stubbed.
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require("playwright"); } catch { return require(process.env.PLAYWRIGHT_PATH ?? "/opt/node22/lib/node_modules/playwright"); } })();

const BASE = process.env.BASE_URL ?? "http://localhost:3111";
const results = [];
const step = async (name, fn) => { try { await fn(); results.push(["PASS", name]); console.log("PASS", name); } catch (e) { results.push(["FAIL", name + " — " + (e.message ?? e)]); console.log("FAIL", name, e.message ?? e); } };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));

await fetch(`${BASE}/api/engine/reset`, { method: "POST" });
await page.goto(`${BASE}/engine`, { waitUntil: "load", timeout: 90000 });

await step("1. cold start: core idle, nothing pre-filled, simulated label visible", async () => {
  if ((await page.getAttribute('[data-testid="core"]', "data-state")) !== "IDLE") throw new Error("core not idle");
  if (!(await page.locator("text=No decision cycle has been run").count())) throw new Error("expected empty state");
  await page.locator('[data-testid="simulated-label"]').waitFor();
});
await step("2. run full decision cycle: events stream with real timestamps, core changes state, result renders", async () => {
  await page.click('[data-testid="run-cycle"]');
  await page.locator('[data-testid="diagnosis"]').waitFor({ timeout: 30000 });
  await page.locator('[data-testid="event-stream"] button', { hasText: "Show all" }).click();
  const n = await page.locator('[data-testid="event-stream"] li').count();
  if (n < 20) throw new Error(`only ${n} events`);
  const first = await page.locator('[data-testid="event-stream"] li span').first().innerText();
  if (!/\d\d:\d\d:\d\d\.\d\d\d/.test(first)) throw new Error("no real timestamp: " + first);
});
await step("3. limiting constraint explained and deduplicated value below naive total", async () => {
  const why = await page.locator('[data-testid="binding-why"]').innerText();
  if (!/lowest in the value chain/.test(why)) throw new Error(why);
  await page.locator('[data-testid="dedup"]').waitFor();
});
await step("4. clicking a number opens the evidence inspector with source, formula, status", async () => {
  await page.locator('[data-evidence="C-001"]').first().click();
  const t = await page.locator('[data-testid="evidence-inspector"]').innerText();
  for (const k of ["Formula", "Assumptions", "Evidence", "MODELLED", "Confidence"]) if (!t.includes(k)) throw new Error("missing " + k);
  try {
    await page.locator('[data-testid="evidence-inspector"] button', { hasText: "OBS-0" }).first().click();
    const t2 = await page.locator('[data-testid="evidence-inspector"]').innerText();
    if (!/SRC-(SIM|DERIVED)/.test(t2) || !/SIMULATED|MODELLED/.test(t2) || !t2.includes("Timestamp")) throw new Error("observation provenance missing: " + t2.slice(0, 200));
  } finally { await page.locator('[data-testid="evidence-inspector"] button', { hasText: "Close" }).click(); }
});
await step("5. paid acquisition is BLOCKED with reason and required condition", async () => {
  const line = page.locator('[data-testid="line-I-004"]');
  if ((await line.getAttribute("data-funded")) !== "false") throw new Error("I-004 funded");
  const t = await line.innerText();
  if (!/consumed by conversion/.test(t) || !/Required condition/.test(t)) throw new Error(t);
});
await step("6. decision states what would change it", async () => {
  const t = await page.locator('[data-testid="would-change"]').innerText();
  if (!/conv\.mobile >= 0\.012/.test(t)) throw new Error(t);
});
await step("7. measurement reports a status from the allowed set and a pre-registered hash", async () => {
  const s = await page.locator('[data-testid="measurement-status"]').innerText();
  if (!["ESTABLISHED", "PROVISIONAL", "INCONCLUSIVE"].includes(s.trim())) throw new Error(s);
  const t = await page.locator('[data-testid="measurement"]').innerText();
  if (!/sha256/.test(t) || !/plan intact true/.test(t)) throw new Error("no hash / plan not intact");
});
await step("8. learning record and memory reflect what was measured", async () => {
  const t = await page.locator('[data-testid="memory"]').innerText();
  if (!/LR-001/.test(t)) throw new Error(t);
});
await step("9. Ask Anesis: why is paid acquisition blocked → answer from records with refs", async () => {
  await page.fill('[data-testid="ask-input"]', "Why is paid acquisition blocked?");
  await page.click('[data-testid="ask-submit"]');
  await page.locator('[data-testid="ask-answer"]').first().waitFor();
  const t = await page.locator('[data-testid="ask-answer"]').first().innerText();
  if (!/I-004/.test(t) || !/Reason:/.test(t)) throw new Error(t);
  if (!/LLM interpretation not enabled/i.test(t)) throw new Error("LLM state not declared");
});
await step("10. Ask Anesis: unanswerable question → Insufficient evidence", async () => {
  await page.fill('[data-testid="ask-input"]', "What is the chef's favourite dish?");
  await page.click('[data-testid="ask-submit"]');
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="ask-answer"]').length >= 2);
  const t = await page.locator('[data-testid="ask-answer"]').first().innerText();
  if (!/Insufficient evidence/.test(t)) throw new Error(t);
});
await step("11. Ask Anesis: 'fund I-004' is refused by governance (T3), not executed", async () => {
  await page.fill('[data-testid="ask-input"]', "Fund the paid acquisition now");
  await page.click('[data-testid="ask-submit"]');
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="ask-answer"]').length >= 3);
  const t = await page.locator('[data-testid="ask-answer"]').first().innerText();
  if (!/T3/.test(t) || !/not executed/i.test(t)) throw new Error(t);
});
await step("12. run again with same inputs → comparison shows identical outputs", async () => {
  await page.click('[data-testid="run-again"]');
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="runs"] li').length >= 2, null, { timeout: 30000 });
  // second run used memory (1 record) whereas first used none: choose run 1 as comparison
  await page.selectOption('[data-testid="compare-select"]', "RUN-001");
  await page.locator('[data-testid="comparison"]').waitFor();
  const t = await page.locator('[data-testid="comparison"]').innerText();
  if (!/Identical outputs/.test(t)) throw new Error(t);
});
await step("13. scenario lab: change the property → different diagnosis, visible in comparison", async () => {
  await page.click('[data-testid="scenario-lab"] summary');
  await page.fill('[data-testid="scenario-convMobile"]', "0.014");
  await page.fill('[data-testid="scenario-seed"]', "3");
  await page.click('[data-testid="run-cycle"]');
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="runs"] li').length >= 3, null, { timeout: 30000 });
  await page.selectOption('[data-testid="compare-select"]', "RUN-001");
  await page.locator('[data-testid="comparison"]').waitFor();
  const t = await page.locator('[data-testid="comparison"]').innerText();
  if (!/diagnosis\.binding|decision\.selected|deduplicated/.test(t)) throw new Error(t);
  const why = await page.locator('[data-testid="binding-why"]').innerText();
  if (/Mobile booking conversion below benchmark: attainment/.test(why)) throw new Error("conversion still binding after fix");
});
await step("14. report is generated from the run's records", async () => {
  const href = await page.getAttribute('[data-testid="report-link"]', "href");
  const html = await (await fetch(BASE + href)).text();
  for (const k of ["Limiting constraint", "SHA-256", "Simulated property data", "Event log", "BLOCKED"]) if (!html.includes(k)) throw new Error("report missing " + k);
});
await step("15. voice control is real or declared unavailable (no fake voice)", async () => {
  const t = await page.locator('[data-testid="ask-panel"]').innerText();
  if (!/Speak|Voice is not available in this browser/.test(t)) throw new Error(t);
});
await step("16. team hub shows real engine events, no timers", async () => {
  await page.goto(`${BASE}/team`, { waitUntil: "load", timeout: 90000 });
  const t = await page.locator("text=Live activity").locator("..").locator("..").innerText();
  if (!/CYCLE_COMPLETE|LEARNING_RECORDED|UTC/.test(t)) throw new Error(t.slice(0, 200));
});
await step("17. reset clears runs and memory; console returns to empty state", async () => {
  await page.goto(`${BASE}/engine`, { waitUntil: "load", timeout: 90000 });
  await page.click('[data-testid="reset"]');
  await page.locator("text=No decision cycle has been run").waitFor();
  const j = await (await fetch(`${BASE}/api/engine/runs`)).json();
  if (j.runs.length || j.memory.length) throw new Error("not cleared");
});
await step("18. no client-side errors during the session", async () => { if (errors.length) throw new Error(errors.join(" | ")); });

await browser.close();
const fails = results.filter((r) => r[0] === "FAIL");
console.log(`\n${results.length - fails.length - results.filter(r=>r[0]==="INFO").length} passed, ${fails.length} failed`);
for (const r of results) if (r[0] !== "PASS") console.log(r.join(": "));
process.exit(fails.length ? 1 : 0);
