import type { SqlClient } from "./sql.js";

/** Four tables. Everything the runtime knows lives here; nothing in process memory survives a restart, and nothing needs to. */
export const SCHEMA_SQL = `
create table if not exists property_models (
  property_id text primary key,
  schema_version int not null,
  model jsonb not null,
  cycles int not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists runtime_jobs (
  id bigserial primary key,
  kind text not null,                    -- 'cycle' | 'collect'
  key text not null,                     -- singleton key: one live job per key (no duplicate cycles)
  payload jsonb not null default '{}'::jsonb,
  run_at timestamptz not null,
  state text not null default 'queued',  -- queued | running | done | failed
  attempts int not null default 0,
  max_attempts int not null default 3,
  locked_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create unique index if not exists runtime_jobs_live_key on runtime_jobs (key) where state in ('queued','running');
create index if not exists runtime_jobs_due on runtime_jobs (state, run_at);
create table if not exists runtime_traces (
  id bigserial primary key,
  job_id bigint,
  run_id text,
  property_id text,
  kind text not null,                    -- 'job' | 'engine' | 'connector' | 'model'
  type text not null,
  state text,
  detail text,
  at timestamptz not null default now(),
  duration_ms int,
  cost_gbp numeric
);
create index if not exists runtime_traces_run on runtime_traces (run_id);
create table if not exists context_snapshots (
  id bigserial primary key,
  property_id text not null,
  fetched_at timestamptz not null,
  connected text[] not null,
  context jsonb not null
);
create index if not exists context_snapshots_prop on context_snapshots (property_id, fetched_at desc);
create table if not exists pms_imports (
  id bigserial primary key,
  property_id text not null,
  filename text not null,
  sha256 text not null,
  imported_at timestamptz not null,
  period_from date,
  period_to date,
  verdict text not null,
  result jsonb not null
);
create index if not exists pms_imports_prop on pms_imports (property_id, imported_at desc);
create table if not exists interventions (
  id text primary key,                   -- INT-<run>-<intervention>
  property_id text not null,
  run_id text not null,
  intervention_id text not null,
  state text not null,
  version int not null,
  origin_sha256 text not null,
  contract jsonb not null,
  prepared_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists interventions_prop on interventions (property_id, prepared_at desc);
`;

export async function migrate(db: SqlClient): Promise<void> { for (const stmt of SCHEMA_SQL.split(";").map((s) => s.trim()).filter(Boolean)) await db.query(stmt); }
