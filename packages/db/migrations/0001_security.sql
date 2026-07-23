-- ANESIS — sécurité : isolation par mandat (RLS) + events append-only.
--
-- Isolation : chaque requête sur une table mandat-scopée est bornée à `app.mandate_id`.
-- Ce GUC est posé en TRANSACTION-LOCAL par withMandate() (set_config(..., true)). En pooling
-- transactionnel (Supabase/Neon), il est donc réinitialisé au COMMIT : aucune fuite de contexte
-- sur une connexion réutilisée. FORCE ROW LEVEL SECURITY fait s'appliquer la RLS même au
-- propriétaire (indispensable pour tester sous PGlite, et défense en profondeur en prod).

create or replace function current_mandate() returns text
  language sql stable
  as $$ select nullif(current_setting('app.mandate_id', true), '') $$;

-- Tables strictement mandat-scopées : mandate_id NOT NULL, isolation stricte.
do $$
declare t text;
begin
  foreach t in array array[
    'mandates','theses','loss_lines','objectives','tasks',
    'approvals','artifacts','measurements'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format(
      'create policy %I on %I using (mandate_id = current_mandate()) with check (mandate_id = current_mandate())',
      t || '_isolation', t);
  end loop;
end $$;

-- Tables mandat-scopées tolérant les lignes système (mandate_id NULL, restreintes à T0 par le domaine).
do $$
declare t text;
begin
  foreach t in array array['agent_runs','blockers','tool_calls'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format(
      'create policy %I on %I using (mandate_id is null or mandate_id = current_mandate()) with check (mandate_id is null or mandate_id = current_mandate())',
      t || '_isolation', t);
  end loop;
end $$;

-- events : append-only. Le trigger défend même le propriétaire (testable partout) ; en prod,
-- 0002_roles.sql révoque en plus UPDATE/DELETE au niveau des privilèges pour le rôle applicatif.
create or replace function anesis_forbid_mutation() returns trigger
  language plpgsql
  as $$ begin raise exception 'events est append-only : % interdit', tg_op using errcode = '0A000'; end $$;

create trigger events_no_update before update on events for each row execute function anesis_forbid_mutation();
create trigger events_no_delete before delete on events for each row execute function anesis_forbid_mutation();
