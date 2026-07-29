-- ANESIS — délégation d'approbation par opérateur + lecture transversale fondatrice (cockpit).
--
-- Deux besoins de l'interface fondatrice/opérateur, sans dépendance externe :
--  1) Déléguer l'approbation bloquante (T3/T4/T5) à un operator, agent par agent.
--  2) Donner au cockpit fondatrice une LECTURE de tous les mandats — sans jamais ouvrir l'ÉCRITURE
--     transversale (l'isolation par mandat des policies existantes reste seule maîtresse des writes).

-- 1) Assignations operator → agent. Table de config GLOBALE (pas mandat-scopée) : le founder
--    approuve tout sans y figurer ; un operator n'approuve un agent que s'il y a une ligne ici.
create table if not exists operator_agent_assignments (
  operator_id text not null references operators(id) on delete cascade,
  agent_id    text not null,
  assigned_by text references operators(id),
  assigned_at timestamptz not null default now(),
  primary key (operator_id, agent_id)
);

-- 2) Lecture transversale fondatrice. `withFounder()` pose le GUC transaction-local
--    `app.founder='true'` ; cette fonction le lit. Comme `current_mandate()` (0001), le GUC est
--    réinitialisé au COMMIT en pooling transactionnel : aucune fuite sur connexion réutilisée.
create or replace function current_is_founder() returns boolean
  language sql stable
  as $$ select coalesce(current_setting('app.founder', true), '') = 'true' $$;

-- Une policy PERMISSIVE supplémentaire, SELECT uniquement, sur chaque table mandat-scopée. Elle
-- s'AJOUTE en OR aux policies d'isolation de 0001 : hors contexte fondatrice, current_is_founder()
-- vaut false → elle n'accorde rien, l'isolation par mandat gouverne comme avant. Aucune policy
-- d'écriture n'est ajoutée : le founder LIT tout, il n'ÉCRIT jamais hors de son mandat courant.
do $$
declare t text;
begin
  foreach t in array array[
    'mandates','theses','loss_lines','objectives','tasks',
    'approvals','artifacts','measurements',
    'agent_runs','blockers','tool_calls'
  ] loop
    execute format(
      'create policy %I on %I for select using (current_is_founder())',
      t || '_founder_read', t);
  end loop;
end $$;
