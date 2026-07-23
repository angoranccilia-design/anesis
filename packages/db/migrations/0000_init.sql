-- ANESIS — schéma initial. Enums en anglais britannique, argent en pence (bigint).
-- Les identifiants sont fournis par la couche applicative (le domaine ne mint pas d'id) : text NOT NULL, sans défaut.

create type property_state as enum ('prospect','assessed','qualified','underwriting','mandate','completed','declined','dormant');
create type mandate_state as enum ('active','suspended','completed','terminated');
create type objective_state as enum ('created','active','at_risk','achieved','abandoned');
create type task_state as enum ('created','assigned','in_progress','blocked','completed','cancelled');
create type agent_run_status as enum ('started','awaiting_approval','sleeping_retention','completed','failed','cancelled');
create type artifact_state as enum ('produced','approved','rejected');
create type blocker_state as enum ('raised','resolved');
create type approval_status as enum ('pending','granted','denied','expired');
create type autonomy_tier as enum ('T0','T1','T2','T3','T4','T5');
create type human_minutes_source as enum ('measured','estimated');
create type notification_priority as enum ('low','normal','high','urgent');
create type operator_role as enum ('founder','operator');

create table operators (
  id            text primary key,
  name          text not null,
  email         text not null unique,
  role          operator_role not null
);

create table properties (
  id                     text primary key,
  name                   text not null,
  state                  property_state not null default 'prospect',
  city                   text,
  county                 text,
  region                 text not null,
  website                text,
  website_domain         text,            -- clé de déduplication normalisée
  source                 text not null,
  priority               integer not null default 0,
  keys                   integer,
  avg_nightly_rate_pence bigint,
  ota_share_pct          numeric,
  has_in_house_marketing boolean,
  contacts               jsonb not null default '[]'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
-- Déduplication : un domaine de site web au plus (les prospects sans site ne sont pas dédupliqués).
create unique index properties_website_domain_uidx on properties (website_domain) where website_domain is not null;

create table mandates (
  id                text primary key,
  mandate_id        text not null,        -- égal à id ; colonne d'isolation homogène avec les autres tables
  property_id       text not null references properties(id),
  state             mandate_state not null default 'active',
  thesis_id         text,
  started_at        timestamptz not null default now(),
  brand_constraints jsonb not null default '{}'::jsonb,
  emergency_stopped boolean not null default false,
  constraint mandates_id_matches check (mandate_id = id)
);

create table theses (
  id         text primary key,
  mandate_id text not null references mandates(id),
  leak_index numeric not null,
  created_at timestamptz not null default now()
);

create table loss_lines (
  id                text primary key,
  mandate_id        text not null references mandates(id),
  thesis_id         text not null references theses(id),
  pillar            text not null,
  annual_loss_pence bigint not null,
  root_cause        text not null
);

create table objectives (
  id                    text primary key,
  mandate_id            text not null references mandates(id),
  loss_line_id          text not null references loss_lines(id),  -- non nullable : l'exécution dérive d'un £
  title                 text not null,
  target_recovery_pence bigint not null,
  state                 objective_state not null default 'created',
  created_at            timestamptz not null default now()
);

create table tasks (
  id             text primary key,
  mandate_id     text not null references mandates(id),
  objective_id   text not null references objectives(id),  -- non nullable : pas de Task sans Objective
  assigned_agent text,
  state          task_state not null default 'created',
  intent         text not null,
  created_at     timestamptz not null default now()
);

create table agent_runs (
  id                   text primary key,
  agent_id             text not null,
  mandate_id           text references mandates(id),  -- null = run purement système (restreint à T0)
  task_id              text references tasks(id),
  trigger              jsonb not null,
  inputs               jsonb not null default '{}'::jsonb,
  status               agent_run_status not null,
  cost_tokens          integer not null default 0 check (cost_tokens >= 0),
  duration_ms          integer not null default 0 check (duration_ms >= 0),
  human_minutes_spent  integer not null check (human_minutes_spent >= 0),  -- ★ obligatoire
  human_minutes_source human_minutes_source not null,                     -- ★ obligatoire
  correlation_id       text not null,
  started_at           timestamptz not null default now(),
  ended_at             timestamptz
);

create table approvals (
  id             text primary key,
  mandate_id     text not null references mandates(id),
  run_id         text not null references agent_runs(id),
  tool_call_name text not null,
  tier           autonomy_tier not null,
  reason         text not null,
  payload        jsonb not null default '{}'::jsonb,
  amount_pence   bigint,
  status         approval_status not null default 'pending',
  requested_at   timestamptz not null default now(),
  expires_at     timestamptz,
  decided_by     text references operators(id),
  decided_at     timestamptz
);

create table tool_calls (
  id                  text primary key,
  mandate_id          text references mandates(id),   -- null = tool-call d'un run SYSTÈME (hors mandat, T0)
  run_id              text not null references agent_runs(id),
  name                text not null,
  tier                autonomy_tier not null,
  input               jsonb not null default '{}'::jsonb,
  output              jsonb not null default '{}'::jsonb,
  at                  timestamptz not null,
  approval_id         text references approvals(id),
  approved_by         text references operators(id),
  approved_at         timestamptz,
  retention_started_at timestamptz,
  reversible          boolean not null default false,
  compensation        text
);
-- Unicité d'usage : une Approval autorise UNE SEULE action.
create unique index tool_calls_approval_id_uidx on tool_calls (approval_id) where approval_id is not null;

create table artifacts (
  id              text primary key,
  mandate_id      text not null references mandates(id),
  produced_by_run text not null references agent_runs(id),  -- non nullable : pas d'Artifact sans AgentRun
  type            text not null,
  version         integer not null default 1,
  supersedes      text references artifacts(id),
  payload         jsonb not null default '{}'::jsonb,
  state           artifact_state not null default 'produced',
  created_at      timestamptz not null default now()
);

create table blockers (
  id            text primary key,
  mandate_id    text references mandates(id),
  raised_by_run text not null references agent_runs(id),
  assignee      jsonb not null,
  reason        text not null,
  due_at        timestamptz not null,
  state         blocker_state not null default 'raised',
  resolved_at   timestamptz
);

create table measurements (
  id            text primary key,
  mandate_id    text not null references mandates(id),
  objective_id  text references objectives(id),
  metric        text not null,
  period        text not null,
  planned       numeric not null,
  actual        numeric not null,
  deviation_pct numeric not null,
  recorded_at   timestamptz not null default now()
);

-- events : source de vérité + bus + journal d'audit. Append-only (voir 0001_security.sql).
create table events (
  id             text primary key,
  type           text not null,
  payload        jsonb not null,
  mandate_id     text,
  emitted_by     text not null,
  emitted_at     timestamptz not null default now(),
  audience       jsonb not null default '{"agents":[],"humans":[],"roles":[]}'::jsonb,
  correlation_id text not null
);
create index events_mandate_emitted_idx on events (mandate_id, emitted_at);
create index events_correlation_idx on events (correlation_id);
create index events_type_idx on events (type);

create table notifications (
  id              text primary key,
  event_id        text not null references events(id),
  mandate_id      text,
  recipient       jsonb not null,
  what            text not null,
  why             text not null,
  expected_action text not null check (btrim(expected_action) <> ''),  -- jamais de notif sans action attendue
  deadline        timestamptz,
  context_link    text not null,
  priority        notification_priority not null default 'normal',
  read_at         timestamptz,
  acted_at        timestamptz
);
