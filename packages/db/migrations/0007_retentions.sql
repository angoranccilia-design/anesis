-- ANESIS — retenue durable T2 (étape 4, §1b). Une action T2 (réponse aux avis, contact partenaire) est
-- DÉCIDÉE puis PROGRAMMÉE dans une fenêtre de 2h : rien ne dort en mémoire. Le balayeur (hourly.tick)
-- mûrit les retenues échues non annulées. L'arrêt d'urgence annule le run (sleeping_retention → cancelled),
-- ce qui exclut la retenue du balayage. Mandat-scopée (RLS).
create table retentions (
  id           text primary key,
  mandate_id   text not null references mandates(id),
  run_id       text not null references agent_runs(id),
  action_name  text not null,
  input        jsonb not null default '{}'::jsonb,
  compensation text,
  due_at       timestamptz not null,     -- now() + 2h à la programmation
  status       text not null default 'pending',  -- pending | executed
  created_at   timestamptz not null default now()
);
create index retentions_due_idx on retentions (status, due_at);

alter table retentions enable row level security;
alter table retentions force row level security;
create policy retentions_isolation on retentions
  using (mandate_id = current_mandate()) with check (mandate_id = current_mandate());
