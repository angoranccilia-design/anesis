-- ANESIS — partenaires (étape 4, agent partnerships).
--
-- ⚠️ SIMPLIFICATION CONNUE (validée conseiller, 2026-07) : `partners` est RATTACHÉ AU MANDAT (RLS),
-- alors qu'un partenaire (PMS, courtier, label type Pride of Britain) est en réalité une relation de
-- FIRME qui touchera PLUSIEURS mandats avec le temps (argument « land & expand », Partie 14). Le coincer
-- dans une RLS par mandat obligerait sinon à dupliquer le même partenaire, ou à choisir arbitrairement un
-- mandat « porteur ». Tant qu'UN SEUL mandat existe, la collision n'arrive pas. À REVISITER (modèle
-- firme / multi-tenant) dès qu'un partenaire couvre plus d'un mandat — NE PAS le redécouvrir en prod.
create table partners (
  id           text primary key,
  mandate_id   text not null references mandates(id),
  name         text not null,
  kind         text not null,          -- 'pms' | 'broker' | 'guide'
  contact      text,
  status       text not null default 'pending',  -- pending | contacting | contacted
  contacted_at timestamptz
);
create index partners_pending_idx on partners (mandate_id, status);

alter table partners enable row level security;
alter table partners force row level security;
create policy partners_isolation on partners
  using (mandate_id = current_mandate()) with check (mandate_id = current_mandate());
