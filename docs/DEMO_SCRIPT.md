# Demo script — the Core (10 minutes)

Preparation: `pnpm install`, `pnpm --filter @anesis/web dev`, open `http://localhost:3000/engine` (demo mode needs no database). Say at the start: **everything on screen is simulated property data; this shows how the methodology operates, not a customer result.**

1. **Cold start.** The core is idle; the page says no cycle has been run. Nothing is pre-filled.
2. **Run full decision cycle.** Watch the event stream: real timestamps, the core moving through OBSERVING → DIAGNOSING → INVESTIGATING → COMPARING → DECIDING → BLOCKING → MEASURING → LEARNING → IDLE. Engine time is shown in the header (well under a second).
3. **Diagnosis.** Actual / attainable / potential. Point at "Total addressable (naive)" versus "Deduplicated" and read the deduplication rule aloud. Show the limiting constraint and why.
4. **Click a number.** Open the evidence inspector on C-001, then on one of its observations, then on its source. Source, timestamp, transformation, assumptions, confidence, status — and the status is SIMULATED or MODELLED, never VERIFIED.
5. **Forward exposure.** Probabilities labelled "modelled assumption".
6. **The decision.** Two actions funded, two blocked. Read I-004's block: it is attractive on paper (positive expected value) and still blocked because demand is consumed by a sub-benchmark conversion; the required condition is printed. Show the reserve and the governance level.
7. **What would change this decision.** The thresholds.
8. **Pre-registration and measurement.** The plan's hash, the expected range, then the measurement status and interval, the placebo rank, the method and why, and the simulated truth that the estimator did not see.
9. **Learning and memory.** The learning record; calibration applied only if it changed.
10. **Ask Anesis.** Type "Why is paid acquisition blocked?", then "What would change your mind?", then "What is the chef's favourite dish?" (Insufficient evidence), then "Fund the paid acquisition now" (tier T3 — not executed). If the browser supports it, click Speak and ask by voice; interrupt the answer by speaking.
11. **Run again.** Same inputs → the comparison says identical outputs.
12. **Scenario lab.** Set mobile conversion to 0.014 and run: conversion no longer binds, the comparison lists what changed, and the demand-side block lifts (I-004 may still wait on its geo-holdout test — the value-of-information rule).
13. **Reset.** Everything clears; the memory is empty again.
14. **Report.** Open the printable report for the run: the same records, nothing else.
15. **Studio hub** (`/team`): the activity feed shows the engine's real events with times; the chat answers from records.

Close with the limitations page. Do not describe the interviews, the simulated property or the letters of intent as customers, sales or revenue.
