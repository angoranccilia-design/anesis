-- ANESIS — évaluations (Porte 1). Une Property (prospect, hors mandat) est évaluée : score figé,
-- perte estimée, décision + code de motif. Table SYSTÈME (les prospects n'ont pas encore de mandat) —
-- pas de RLS par mandat. L'idempotence du lot repose sur l'état de la Property (une fois sortie de
-- 'prospect', elle n'est plus reprise) ; cette table garde la trace auditable de chaque évaluation.
create table assessments (
  id                 text primary key,
  property_id        text not null references properties(id),
  leak_index         integer not null,
  monthly_loss_pence bigint not null,
  decision           text not null,
  decision_code      text not null,
  icp                jsonb not null default '{}'::jsonb,
  sub_scores         jsonb not null default '{}'::jsonb,
  assessed_at        timestamptz not null default now()
);
create index assessments_property_idx on assessments (property_id);
