-- ANESIS — rôle applicatif et privilèges (PRODUCTION uniquement).
-- NON appliqué par les tests PGlite (mono-utilisateur superuser) : l'isolation y est prouvée par
-- FORCE ROW LEVEL SECURITY et l'append-only par trigger. Ce fichier documente le modèle de privilèges
-- réel : l'application se connecte comme `anesis_app` (jamais propriétaire), avec UPDATE/DELETE révoqués
-- sur `events`. À appliquer sur Postgres réel (Supabase/Neon) via applyMigrations(pg, { roles: true }).

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anesis_app') then
    create role anesis_app nologin;
  end if;
end $$;

grant usage on schema public to anesis_app;
grant select, insert, update, delete on all tables in schema public to anesis_app;

-- events : append-only au niveau des privilèges (contrôle primaire en prod ; le trigger reste en filet).
revoke update, delete on events from anesis_app;

-- La RLS FORCE s'applique aussi au propriétaire ; anesis_app n'est pas propriétaire, donc la RLS le borne
-- de toute façon. Les policies posées en 0001 utilisent current_mandate().
