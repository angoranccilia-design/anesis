# Deployment — reproducible, with persistence, a worker, backups and a health check

What this gives: one Postgres, one long-running worker, one console, three commands. What it does not give: a hosted
environment. Nothing here has been run on a real host; it has been run on the embedded database and built in CI.

## Components

| Component | Runs where | Needs |
|---|---|---|
| Postgres 16 | a managed service or the `postgres` service of `docker-compose.yml` | a password (`POSTGRES_PASSWORD`) |
| Runtime worker (`anesis-runtime work`) | a long-lived process: the `runtime` service, a VM, a container platform. Not a serverless function: it polls every 15 s | `DATABASE_URL`; `ANESIS_HEALTH_PORT` to serve `GET /health` |
| Console (`apps/web`) | any Node host that can run `next start`; serverless works for pages and API routes because every state lives in Postgres through the runtime bundle | `DATABASE_URL`, `ANESIS_PROPERTY_ID`, `RESEND_API_KEY`, the built runtime bundle (`prebuild` builds it) |
| Backups | the `backup` service writes `backups/<date>/*.json` daily; `pg_dump` remains the recommended full backup | a volume |

## Three commands

```
cp .env.example .env            # fill DATABASE_URL (and RESEND_API_KEY for sign-in)
docker compose up -d postgres runtime backup
docker compose run --rm runtime migrate && docker compose run --rm runtime property PROP-xxx --file spec.json
```
Then `anesis-runtime import <export.csv> --property PROP-xxx --rooms N --collected-at <ISO>`, `register PROP-xxx --file registers.json` (benchmarks with sources), `schedule --property PROP-xxx`, and the worker runs the cycle at its cadence. `anesis-runtime status --json` and `GET /health` say whether it did.

## Health

`GET /health` returns 200 when the database answers, no job is overdue by more than 15 minutes, no job failed for good, every property had a cycle within 8 days and the worker polled within 5 minutes; 503 otherwise, with the list of problems. Counts and dates only, never data or secrets. Point an uptime monitor at it.

## Logs

The worker writes one JSON object per line to stdout (`at`, `level`, `msg`, fields). Keys that look like secrets (`key`, `token`, `secret`, `password`, `authorization`, `cookie`, `*Url`) are redacted before writing. Request bodies and sign-in links are never logged.

## Backups and restore

`anesis-runtime backup <dir>` writes the business tables (properties, models, registers, grants, imports, contracts, cycle results) as JSON with a manifest; `restore <dir>` inserts rows that do not exist and never overwrites. Operational tables (jobs, traces, context snapshots) are not backed up: a restored runtime re-collects and re-schedules.

## What CI proves

Typecheck and tests of every package (unit on the embedded database, `@anesis/db` on real Postgres behind PgBouncer), the runtime bundle build, the console production build. CI does not deploy.

## Not done here, on purpose

No host, domain, TLS, secret store or monitoring service is configured: those need an account and an authorisation. The
console on a serverless host still keeps engine event streams (`/api/engine/stream`) per instance; everything else is in Postgres.
