-- 0014 — which operators may read which mandates. Founders are not listed: they read every mandate (withFounder).
create table if not exists operator_mandates (
  operator_id text not null references operators(id) on delete cascade,
  mandate_id  text not null references mandates(id) on delete cascade,
  granted_at  timestamptz not null default now(),
  primary key (operator_id, mandate_id)
);
