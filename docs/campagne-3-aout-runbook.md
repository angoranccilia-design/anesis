# Runbook — Campagne de diagnostics du lundi 3 août 2026

Objectif : évaluer ~150 établissements hôteliers UK (Porte 1), sur données publiques réelles, et
produire la liste des **qualifiés / refusés / à revoir**. Tout le code est prêt et testé ; il reste à
fournir les **secrets** et la **base**, puis à lancer une commande.

## 1. Prérequis à fournir (bloquants)

| Élément | Détail | Statut |
|---|---|---|
| Base Postgres ANESIS | Projet Supabase/Neon à créer (~10 min) ; schéma déployé par **script fourni** (§4) | ⛔ à provisionner |
| `DATABASE_URL` | rôle **applicatif** `anesis_app` (créé par le script de déploiement) | ⛔ |
| `PAGESPEED_API_KEY` | clé PageSpeed (déjà active côté KAIROS) | ✅ dispo |
| `APIFY_TOKEN` | token du compte Apify | ⛔ **à fournir** |
| `APIFY_REVIEWS_ACTOR` | id de l'acteur Apify d'extraction d'avis | ⛔ à choisir |
| Fichier prospects | CSV ou JSON, ~150 lignes (voir §3) | ⛔ à préparer |

> **Secrets** : uniquement dans un fichier **`.env` NON commité** (déjà dans `.gitignore`). Jamais
> dans un message, un argument de commande, ni un commit. Le pré-vol ne remonte que le budget restant.

## 2. Fichier `.env` (à la racine, non commité)

```
DATABASE_URL=postgres://anesis_app:APP_DB_PASSWORD@HOTE:5432/postgres
PAGESPEED_API_KEY=...
APIFY_TOKEN=...
APIFY_REVIEWS_ACTOR=...
```

Une source dont le secret manque est simplement **absente** (sa donnée passe en confiance `none`) — le
lot tourne quand même, mais avec moins de signal. HTML marche sans aucun secret.

## 4. Base de données Postgres — mise en place (une fois)

Fournisseur : **Supabase** (gratuit, tu le connais déjà) ou **Neon** (souvent plus simple pour le
pooling/IPv4). Étapes :

1. Crée un projet + un **mot de passe de base** fort (celui du rôle propriétaire `postgres`).
2. Récupère, dans le dashboard (Database → Connect), **deux** connexions :
   - **directe / propriétaire** (rôle `postgres`) → déploiement du schéma ;
   - **applicative** (rôle `anesis_app`, créé par le déploiement) → campagne.
3. Choisis un mot de passe pour le rôle applicatif `anesis_app` (`APP_DB_PASSWORD`).
4. **Déploie le schéma en une commande** — crée `.env.deploy` (NON commité) :
   ```
   DATABASE_URL_OWNER=postgres://postgres:MDP_BASE@HOTE:5432/postgres
   APP_DB_PASSWORD=un-mot-de-passe-anesis-app-solide
   ```
   puis :
   ```bash
   pnpm --filter @anesis/campaign deploy
   ```
   → applique toutes les migrations (RLS, rôles, events append-only) et donne un **LOGIN** à `anesis_app`.
5. Renseigne `DATABASE_URL` (§2) avec le rôle `anesis_app` + `APP_DB_PASSWORD`.

> ⚠️ **Spécificités fournisseur** (format exact hôte/port, IPv4 vs pooler) : à **finaliser ensemble**
> une fois le projet créé — colle-moi les infos de connexion du dashboard, je remplis les `.env`.
> Pour la campagne (avant tout mandat), une connexion **directe** en `anesis_app` suffit ; le pooler
> **transaction** ne devient nécessaire que pour les opérations mandat (signMandate/planner, étape 3).

## 3. Format du fichier prospects

**CSV** (en-tête requis) — colonnes : `name*`, `region*`, `source*`, `website`, `city`, `county`, `priority` (`*` = requis) :

```csv
name,website,region,source,priority
The Old Rectory,https://oldrectory.co.uk,South West,campaign-2026-08,5
"Smith, Jones & Co Hotel",https://sjc.co.uk,London,campaign-2026-08,
```

**JSON** : un tableau d'objets aux mêmes champs. La déduplication se fait par **domaine de site web**
(dans le fichier ET contre l'existant) — réimporter deux fois est sans danger.

## 5. Exécution (le jour J)

```bash
# 0) Prérequis : schéma déjà déployé (§4). 
# 1) Lancer la campagne (pré-vol Apify → import → lot → tri) :
pnpm --filter @anesis/campaign start prospects.csv
```

Le CLI (`apps/campaign/src/run.ts`) enchaîne :
1. **Pré-vol Apify** — affiche le budget mensuel restant (~150 exécutions d'avis). Informe, ne bloque pas.
2. **Import** des prospects (dédup domaine).
3. **Lot d'évaluation** (`runCampaign` → underwriter) avec les **sources réelles** (`buildProspectFetcher`).
4. **Rapport** : importés / évalués / qualifiés / refusés / à revoir + la **file de revue manuelle**.

## 6. Après le lot

- **File de revue manuelle** (`INSUFFICIENT_PUBLIC_DATA` : part OTA ou marketing indécidables en donnée
  publique) : à trancher **à la main sous quelques heures**, ne pas supposer que tout se décide seul.
- **Reprise** : relancer la commande ne retraite pas les prospects déjà évalués (l'état de la Property
  joue le journal d'idempotence). Une interruption réseau est donc sans conséquence.
- Les **qualifiés** deviennent des mandats potentiels : à la signature, `signMandate` construit la thèse
  et déclenche la dérivation objectifs+tâches (étape 3).

## 7. Vérifié / testé

Pré-vol, import (dédup), lot, tri de la file et parsing CSV/JSON sont **couverts par des tests** (CI
verte). Il ne manque que les secrets + la base pour passer du test au réel.
