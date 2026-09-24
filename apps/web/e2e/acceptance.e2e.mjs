/**
 * Final Build Challenge §34 — the 25-step acceptance sequence, run against a live server.
 * Usage: BASE_URL=http://localhost:3111 node e2e/acceptance.e2e.mjs
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require("playwright"); } catch { return require(process.env.PLAYWRIGHT_PATH ?? "/opt/node22/lib/node_modules/playwright"); } })();
const BASE = process.env.BASE_URL ?? "http://localhost:3111";
const results = [];
const step = async (name, fn) => { try { await fn(); results.push(["PASS", name]); console.log("PASS", name); } catch (e) { results.push(["FAIL", name + " — " + (e.message ?? e)]); console.log("FAIL", name, (e.message ?? e).toString().slice(0, 300)); } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
const ask = async (q) => { const n = await page.locator('[data-testid="ask-answer"]').count(); await page.fill('[data-testid="ask-input"]', q); await page.click('[data-testid="ask-submit"]'); await page.waitForFunction((n) => document.querySelectorAll('[data-testid="ask-answer"]').length > n, n, { timeout: 60000 }); return page.locator('[data-testid="ask-answer"]').first().innerText(); };
const runCount = async () => (await (await fetch(`${BASE}/api/engine/runs`)).json()).runs.length;
const waitRuns = async (n) => { for (let i = 0; i < 120; i++) { if ((await runCount()) >= n) return; await new Promise((r) => setTimeout(r, 500)); } throw new Error(`timeout waiting for ${n} runs`); };
const status = async (id) => page.locator(`[data-testid="line-${id}"] [data-status]`).getAttribute("data-status");

await fetch(`${BASE}/api/engine/reset`, { method: "POST" });
await page.goto(`${BASE}/engine`, { waitUntil: "load", timeout: 90000 });

await step("1. open a property (cold: nothing pre-filled)", async () => { await page.locator("text=No decision cycle has been run").waitFor(); });
await step("2. run: internal + external commercial context is shown, with connector states", async () => {
  await page.click('[data-testid="run-cycle"]'); await page.locator('[data-testid="diagnosis"]').waitFor({ timeout: 60000 });
  const t = await page.locator('[data-testid="connectors"]').innerText();
  for (const k of ["Weather forecast", "Public holidays", "Exchange rates", "Property management system", "Camera"]) if (!t.includes(k)) throw new Error("missing connector " + k);
  const wx = await page.locator('[data-connector="CONN-WEATHER"]').getAttribute("data-state");
  const cam = await page.locator('[data-connector="CONN-CAMERA"]').getAttribute("data-state");
  const pms = await page.locator('[data-connector="CONN-PMS"]').getAttribute("data-state");
  results.push(["INFO", `weather ${wx}, camera ${cam}, pms ${pms}`]);
  if (cam !== "SOURCE_NOT_CONFIGURED" || pms !== "NOT_CONNECTED") throw new Error("connector states wrong");
  if (!(await page.locator('[data-testid="fused"]').innerText()).length) throw new Error("no fused verdicts");
});
await step("3–4. ask 'What is limiting value right now?' → diagnosis", async () => { const t = await ask("What is limiting value right now?"); if (!/limiting constraint is C-00/.test(t)) throw new Error(t.slice(0, 200)); });
await step("5. inspect evidence (click a number → provenance)", async () => { await page.locator('[data-evidence="C-001"]').first().click(); const t = await page.locator('[data-testid="evidence-inspector"]').innerText(); if (!/Formula/.test(t) || !/Evidence/.test(t)) throw new Error("no provenance"); await page.locator('[data-testid="evidence-inspector"] button', { hasText: "Close" }).click(); });
await step("6–7. ask 'Why?' → causal chain with supporting evidence", async () => { const t = await ask("Why?"); if (!/Because C-00/.test(t) || !/→/.test(t) || !/Formula:/.test(t)) throw new Error(t.slice(0, 300)); });
await step("8–9. ask 'What are you worried about next?' → forward exposure and external verdicts", async () => { const t = await ask("What are you worried about next?"); if (!/E-001/.test(t) || !/(no material decision impact|DECISION IMPACT|TACTICAL NOTE|FORWARD EXPOSURE|COMMERCIAL OPPORTUNITY)/i.test(t)) throw new Error(t.slice(0, 300)); });
await step("10–11. ask 'What information would change your decision?' → value of information", async () => { const t = await ask("What information would change your decision?"); if (!/value of information (HIGH|MEDIUM|LOW)/i.test(t) || !/Recommended next action/.test(t)) throw new Error(t.slice(0, 300)); });
await step("12–13. ask 'Where should we put the next £20,000?' → a real cycle at £20,000 with dependencies", async () => {
  const t = await ask("Where should we put the next £20,000?");
  if (!/Cycle RUN-00\d run/.test(t)) throw new Error(t.slice(0, 300));
  await waitRuns(2); await page.waitForFunction(() => /£20,000/.test(document.querySelector("h1")?.textContent ?? ""), null, { timeout: 30000 });
  const hdr = await page.locator("h1").innerText(); if (!/£20,000/.test(hdr)) throw new Error("budget not applied: " + hdr);
  const st = await status("I-004"); if (!["BLOCKED", "INVESTIGATE"].includes(st)) throw new Error("I-004 " + st);
  const line = await page.locator('[data-testid="line-I-004"]').innerText(); if (!/dependency I-001/.test(line) || !/Required condition/.test(line)) throw new Error("no dependency shown: " + line.slice(0, 200));
  results.push(["INFO", `£20,000: I-004 ${st} (memory holds run 1's measurement, so the conversion dependency is ${line.includes("resolved by measurement") ? "resolved by measurement" : "unresolved"})`]);
});
await step("14–15. attempt 'Launch the campaign with £20,000.' → governance blocks (T3, human approval)", async () => { const t = await ask("Launch the campaign with £20,000."); if (!/ACTION BLOCKED/.test(t) || !/T3/.test(t) || !/Human approval required/.test(t) || !/exceeds the autonomous execution threshold/.test(t)) throw new Error(t.slice(0, 300)); const ex = await page.locator('[data-testid="ask-answer"]').first().locator("[data-executed]").getAttribute("data-executed"); if (ex !== "false") throw new Error("executed!"); });
await step("16–18. change a relevant assumption in the scenario lab (memory off), rerun: decision changes only past the threshold, with explanation", async () => {
  const run1 = await (await fetch(`${BASE}/api/engine/runs/RUN-001`)).json();
  const th = run1.result.thresholds.find((x) => x.interventionId === "I-004" && x.variable === "convMobile");
  if (!th) throw new Error("no threshold for I-004 in run 1");
  results.push(["INFO", `threshold from run 1: I-004 ${th.fromStatus} → ${th.toStatus} at mobile conversion ${th.to.toFixed(4)} (now ${th.from})`]);
  await page.click('[data-testid="scenario-lab"] summary');
  await page.uncheck('[data-testid="scenario-lab"] input[type=checkbox] >> nth=-1'); // use memory off: isolate the assumption
  let n = await runCount();
  await page.fill('[data-testid="scenario-convMobile"]', String((th.to * 0.97).toFixed(5))); await page.click('[data-testid="run-cycle"]'); await waitRuns(n + 1); await page.waitForTimeout(600);
  if ((await status("I-004")) !== "BLOCKED") throw new Error("changed below threshold: " + (await status("I-004")));
  n = await runCount();
  await page.fill('[data-testid="scenario-convMobile"]', String((th.to * 1.03).toFixed(5))); await page.click('[data-testid="run-cycle"]'); await waitRuns(n + 1); await page.waitForTimeout(600);
  if ((await status("I-004")) !== th.toStatus) throw new Error(`expected ${th.toStatus}, got ${await status("I-004")}`);
  const prevId = `RUN-${String(n).padStart(3, "0")}`;
  await page.selectOption('[data-testid="compare-select"]', prevId); await page.locator('[data-testid="explanation"]').waitFor();
  const ex = await page.locator('[data-testid="explanation"]').innerText();
  if (!/I-004: BLOCKED → /.test(ex) || !/threshold crossed/.test(ex)) throw new Error(ex.slice(0, 300));
  await page.check('[data-testid="scenario-lab"] input[type=checkbox] >> nth=-1');
});
await step("19–23. run intervention → measure → counterfactual → forecast error → learning record", async () => {
  await fetch(`${BASE}/api/engine/reset`, { method: "POST" }); await page.goto(`${BASE}/engine`, { waitUntil: "load", timeout: 90000 });
  await page.click('[data-testid="run-cycle"]'); await page.locator('[data-testid="measurement"]').waitFor({ timeout: 60000 });
  const t = await page.locator('[data-testid="measurement"]').innerText();
  if (!/counterfactual/.test(t) || !/forecast error/.test(t) || !/LR-001/.test(t) || !/sha256/.test(t)) throw new Error(t.slice(0, 300));
  const s = await page.locator('[data-testid="measurement-status"]').innerText(); if (!["ESTABLISHED", "PROVISIONAL", "INCONCLUSIVE"].includes(s.trim())) throw new Error(s);
});
await step("24–25. rerun: previous learning affects the next decision, and the system says how", async () => {
  await page.click('[data-testid="run-cycle"]'); await waitRuns(2); await page.waitForTimeout(500);
  await page.locator('[data-testid="diagnosis"]').waitFor();
  await page.selectOption('[data-testid="compare-select"]', "RUN-001"); await page.locator('[data-testid="explanation"]').waitFor();
  const ex = await page.locator('[data-testid="explanation"]').innerText();
  if (!/measured resolved|calibration/.test(ex)) throw new Error(ex);
  const st = await status("I-004"); results.push(["INFO", `run 2: I-004 ${st}; explanation: ${ex.replace(/\s+/g, " ").slice(0, 200)}`]);
  if (st === "BLOCKED" && !/calibration/.test(ex)) throw new Error("no learning effect");
  const hist = await page.locator('[data-testid="memory-history"]').innerText(); if (!/considered \d+ time/.test(hist)) throw new Error(hist.slice(0, 200));
  const rec = await ask("Have we considered paid acquisition before?"); if (!/considered/.test(rec)) throw new Error(rec.slice(0, 200));
});
await step("extra: compare Google and Meta; which assumption drives this; stale data reduces confidence", async () => {
  const c = await ask("Compare Google and Meta"); if (!/I-005/.test(c) || !/I-004/.test(c)) throw new Error(c.slice(0, 200));
  const d = await ask("Which assumption drives this result?"); if (!/drives the result most is/.test(d)) throw new Error(d.slice(0, 200));
  await page.click('[data-testid="scenario-lab"] summary'); await page.check('[data-testid="scenario-stale"]'); await page.click('[data-testid="run-cycle"]');
  await waitRuns(3); await page.waitForTimeout(500);
  await page.locator('[data-testid="stale-note"]').waitFor(); const n = await page.locator('[data-testid="stale-note"]').innerText(); if (!/STALE DATA/.test(n)) throw new Error(n);
  await page.uncheck('[data-testid="scenario-stale"]');
});
await step("extra: scenario weather (storm) is tested and stated, never invented as a forecast", async () => {
  await page.selectOption('[data-testid="scenario-weather"]', "storm"); await page.click('[data-testid="run-cycle"]');
  await waitRuns(4); await page.waitForTimeout(500);
  const f = await page.locator('[data-testid="fused"]').innerText(); if (!/weather/.test(f) || !/E = R/.test(f)) throw new Error(f.slice(0, 200));
  const conn = await page.locator('[data-testid="connectors"]').innerText(); if (!/Weather forecast/.test(conn)) throw new Error("no weather connector row");
  results.push(["INFO", "weather verdict: " + f.split("\n").slice(0, 3).join(" | ").slice(0, 200)]);
});
await step("no client-side errors", async () => { if (errors.length) throw new Error(errors.join(" | ")); });
await browser.close();
const fails = results.filter((r) => r[0] === "FAIL");
console.log(`\n${results.filter((r) => r[0] === "PASS").length} passed, ${fails.length} failed`);
for (const r of results) if (r[0] !== "PASS") console.log(r.join(": "));
process.exit(fails.length ? 1 : 0);
