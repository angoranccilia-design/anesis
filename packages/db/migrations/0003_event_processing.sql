-- ANESIS — journal d'idempotence du bus d'événements.
-- Clé (event_id, subscriber) : un abonné traite un événement au plus une fois. Le rejeu depuis
-- la table `events` s'appuie dessus pour ne ré-appliquer que les effets manquants.
create table processed_events (
  event_id     text not null,
  subscriber   text not null,
  processed_at timestamptz not null default now(),
  primary key (event_id, subscriber)
);
