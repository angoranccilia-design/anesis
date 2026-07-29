-- ANESIS — intake des enquêtes du site (Diagnostic Porte 1 / Contact).
--
-- Table GLOBALE (une enquête n'appartient à aucun mandat tant qu'elle n'est pas qualifiée). Sert de
-- registre d'entrée : la notification email (Resend) est en plus, pas à la place.

create table if not exists enquiries (
  id         text primary key,
  kind       text not null default 'enquiry',
  name       text not null,
  email      text not null,
  hotel      text not null,
  website    text,
  status     text not null default 'new',
  created_at timestamptz not null default now()
);
create index if not exists enquiries_created_idx on enquiries(created_at desc);
