import { describe, it, expect } from "vitest";
import { TASKS } from "./tasks/index.js";
import { deterministic } from "./providers.js";
import { runBench, writeReport } from "./run.js";

describe("Anesis model benchmark", () => {
  it("every task is scorable and the deterministic baseline scores 1 on all of them", async () => {
    for (const t of TASKS) { const r = await deterministic.run(t); const s = t.score(r.output); expect(s.value, `${t.id}: ${s.note}`).toBe(1); }
  });
  it("a wrong or inventing answer scores 0 and is flagged", () => {
    const t2 = TASKS.find((t) => t.id === "T2")!; expect(t2.score("FUND").value).toBe(0); expect(t2.score("FUND").inventedData).toBe(true);
    const t3 = TASKS.find((t) => t.id === "T3")!; expect(t3.score("La contrainte coûte £999,999 par an.").inventedData).toBe(true);
    const t4 = TASKS.find((t) => t.id === "T4")!; expect(t4.score("L4,L4,L4,L4,L4").value).toBeLessThan(1);
  });
  it("writes a reproducible report; providers without credentials are marked NOT RUN, never scored", async () => {
    const report = await runBench(); const path = writeReport(report, "results");
    expect(path).toMatch(/bench-\d{4}-\d{2}-\d{2}\.json/);
    expect(report.summary.deterministic!.meanScore).toBe(1);
    const notRun = report.providers.find((p) => !p.ran); if (notRun) expect(notRun.why).toMatch(/NOT RUN/);
  }, 60_000);
});
