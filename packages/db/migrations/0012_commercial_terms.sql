-- ANESIS — termes commerciaux du mandat (Porte 3), résolus via makeCommercialTerms (packages/core).
--
-- Colonnes NULLABLES : les mandats hérités n'en ont pas. Le taux et les séances suivent la DURÉE, pas
-- la formule (règle verrouillée dans core/mandate-terms.ts). Ces termes sont PROPOSÉS/conditionnels
-- tant que la fondatrice n'est pas installée au UK — aucun mandat payant n'est exécuté avant le visa.

alter table mandates add column if not exists formula text;
alter table mandates add column if not exists term_months integer;
alter table mandates add column if not exists incentive_rate numeric;
alter table mandates add column if not exists monthly_subscription_pence bigint;
alter table mandates add column if not exists photo_sessions integer;
