-- ANESIS — avis externes (étape 4, agent reputation). Portent le TEXTE de l'avis (que le payload de
-- l'événement ne transporte pas) et servent de garde d'idempotence (responded_at). Alimentée par
-- l'ingestion (adaptateur), qui émet ensuite external.review_received. Mandat-scopée (RLS).
create table reviews (
  id           text primary key,
  mandate_id   text not null references mandates(id),
  source       text not null,          -- 'google', 'tripadvisor', ...
  rating       numeric,
  text         text,
  received_at  timestamptz not null default now(),
  responded_at timestamptz              -- non null = déjà traité (réponse programmée ou brouillon produit)
);
create index reviews_pending_idx on reviews (mandate_id, responded_at);

alter table reviews enable row level security;
alter table reviews force row level security;
create policy reviews_isolation on reviews
  using (mandate_id = current_mandate()) with check (mandate_id = current_mandate());
