-- ANESIS — authentification des opérateurs par lien magique.
--
-- Deux tables GLOBALES (hors RLS mandat : ce sont des données d'accès opérateur, pas des données de
-- mandat). On ne stocke JAMAIS le jeton en clair, seulement son hash SHA-256 (voir @anesis/auth).

create table if not exists magic_link_tokens (
  id          text primary key,
  operator_id text not null references operators(id) on delete cascade,
  token_hash  text not null unique,
  purpose     text not null default 'login',
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  consumed_at timestamptz
);
create index if not exists magic_link_tokens_operator_idx on magic_link_tokens(operator_id);

create table if not exists sessions (
  id          text primary key,
  operator_id text not null references operators(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz
);
create index if not exists sessions_operator_idx on sessions(operator_id);
