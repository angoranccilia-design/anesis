-- ANESIS — publications (étape 4, agent social-ops). Trace des contenus DÉJÀ APPROUVÉS effectivement
-- publiés (canal + référence externe côté plateforme). Mandat-scopée (RLS), comme les autres tables
-- opérationnelles. Le grant au rôle applicatif est couvert par 0002_roles.sql (appliqué en dernier).
create table publications (
  id           text primary key,
  mandate_id   text not null references mandates(id),
  artifact_id  text not null references artifacts(id),
  channel      text not null,          -- ex: 'buffer', 'instagram', 'facebook'
  external_ref text,                    -- id/URL renvoyé par la plateforme
  published_at timestamptz not null default now()
);
create index publications_artifact_idx on publications (artifact_id);

-- Isolation par mandat (même régime que les tables strictes de 0001).
alter table publications enable row level security;
alter table publications force row level security;
create policy publications_isolation on publications
  using (mandate_id = current_mandate()) with check (mandate_id = current_mandate());
