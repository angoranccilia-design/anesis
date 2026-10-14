# Runtime — the engine running in time

**STATUS: IMPLEMENTED** (`packages/runtime`, Étape 1 of the autonomous system). Tested on embedded Postgres (PGlite) in CI; the same SQL runs on a real Postgres through `DATABASE_URL`.

## What it guarantees, and how

| Guarantee | Mechanism |
|---|---|
| Scheduled execution | `runtime_jobs.run_at`; a worker claims jobs whose time has come (`SELECT … FOR UPDATE SKIP LOCKED`, so several workers can share one table) |
| No dangerous duplicates | one live job per singleton `key` (unique partial index on `state in ('queued','running')`); scheduling the same cycle twice is a no-op; a cycle key is `cycle:<property>:<cadence window>` |
| Resume after failure | a claimed job holds `locked_until`; if the worker dies, the lock expires and the job returns to the queue with the note "lock expired; resumed". A cycle's writes (model, contracts, next job) are one transaction: a failure commits nothing and the job retries; a retried job whose cycle was already committed (the cycle entry carries its `jobKey`) does not run the engine again (`CYCLE_ALREADY_PERSISTED`) |
| Bounded retries | `attempts` / `max_attempts`, exponential backoff, then `failed` with the error kept |
| Persistent traces | every claim, connector state, engine event, model write and scheduling decision is a row in `runtime_traces`; the indicator "cost per problem correctly solved" is computed from these rows and nowhere else |
| One truth | the property model lives in `property_models`; the console uses the same store when `DATABASE_URL` or `ANESIS_PGLITE_DIR` is set, so a cycle run from the console and a cycle run by the worker land in the same record |

## Jobs

- `cycle` — load the model, take the latest context snapshot if younger than six hours (else collect), read the open contracts, run the engine with the model's memory, calibration and the committed interventions (marked IN_PROGRESS, not re-proposed; `measure: false`, no simulated outcome), then in one transaction append the cycle, save, persist the new contracts (pending proposals kept or superseded, never duplicated) and schedule the next cycle one cadence later (default 7 days).
- `collect` — call the connectors (live public sources unless `ANESIS_OFFLINE=1`; contracts report their state) and store the context snapshot with the list of connected sources.

## Commands

```
pnpm --filter @anesis/runtime build
anesis-runtime migrate | property | properties | register | grant | schedule --property | once | work | status [--json] | import | assay | connectors | health | backup | restore
```
A property is declared before any job runs on it (`property <id> --file spec.json`); a real property runs under the `verified_only` evidence policy with the benchmarks declared in its registers; the built-in simulated property is the only one allowed simulated evidence and is labelled. `connectors` calls every live source now and prints the statuses it got. `work` serves `GET /health` on `ANESIS_HEALTH_PORT`. See `DEPLOYMENT.md` and `FIRST_ASSAY_RUNBOOK.md`.
Backend: `DATABASE_URL` (Postgres) or `ANESIS_PGLITE_DIR` (embedded, one process at a time). `ANESIS_OFFLINE=1` skips live connectors. `ANESIS_CADENCE_DAYS` sets the cadence.

## What it does not do yet

No execution tools (Étape 3), no post-action verification (Étape 4), no model routing (Étape 5). One property is served per worker configuration; the store already holds many. PGlite allows one process on a directory: the console and the worker share a database only on a real Postgres, or one after the other on PGlite. Connectors are the same as before: four live public sources, the rest contracts.
