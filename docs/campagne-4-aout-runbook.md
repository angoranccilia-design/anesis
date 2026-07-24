# Runbook — Campagne de diagnostics du 4 août

Objectif : évaluer ~150 établissements hôteliers UK (Porte 1), sur données publiques réelles, et
produire la liste des **qualifiés / refusés / à revoir**. Tout le code est prêt et testé ; il reste à
fournir les **secrets** et la **base**, puis à lancer une commande.

## 1. Prérequis à fournir (bloquants)

| Élément | Détail | Statut |
|---|---|---|
| Base Postgres ANESIS | Supabase/Neon, schéma déployé (`deployDatabase`, connexion **propriétaire**) | ⛔ à provisionner |
| `DATABASE_URL` | rôle **applicatif** (`anesis_app`), via le pooler **transaction** | ⛔ |
| `PAGESPEED_API_KEY` | clé PageSpeed (déjà active côté KAIROS) | ✅ dispo |
| `APIFY_TOKEN` | token du compte Apify | ⛔ **à fournir** |
| `APIFY_REVIEWS_ACTOR` | id de l'acteur Apify d'extraction d'avis | ⛔ à choisir |
| Fichier prospects | CSV ou JSON, ~150 lignes (voir §3) | ⛔ à préparer |

> **Secrets** : uniquement dans un fichier **`.env` NON commité** (déjà dans `.gitignore`). Jamais
> dans un message, un argument de commande, ni un commit. Le pré-vol ne remonte que le budget restant.

## 2. Fichier `.env` (à la racine, non commité)

```
DATABASE_URL=postgres://anesis_app:...@...:6432/anesis
PAGESPEED_API_KEY=...
APIFY_TOKEN=...
APIFY_REVIEWS_ACTOR=...
```

Une source dont le secret manque est simplement **absente** (sa donnée passe en confiance `none`) — le
lot tourne quand même, mais avec moins de signal. HTML marche sans aucun secret.

## 3. Format du fichier prospects

**CSV** (en-tête requis) — colonnes : `name*`, `region*`, `source*`, `website`, `city`, `county`, `priority` (`*` = requis) :

```csv
name,website,region,source,priority
The Old Rectory,https://oldrectory.co.uk,South West,campaign-2026-08,5
"Smith, Jones & Co Hotel",https://sjc.co.uk,London,campaign-2026-08,
```

**JSON** : un tableau d'objets aux mêmes champs. La déduplication se fait par **domaine de site web**
(dans le fichier ET contre l'existant) — réimporter deux fois est sans danger.

## 4. Exécution (le jour J)

```bash
# 0) Une seule fois : déployer le schéma sur la base neuve (connexion PROPRIÉTAIRE) — hors de ce CLI.
# 1) Lancer la campagne (pré-vol Apify → import → lot → tri) :
pnpm --filter @anesis/campaign start prospects.csv
```

Le CLI (`apps/campaign/src/run.ts`) enchaîne :
1. **Pré-vol Apify** — affiche le budget mensuel restant (~150 exécutions d'avis). Informe, ne bloque pas.
2. **Import** des prospects (dédup domaine).
3. **Lot d'évaluation** (`runCampaign` → underwriter) avec les **sources réelles** (`buildProspectFetcher`).
4. **Rapport** : importés / évalués / qualifiés / refusés / à revoir + la **file de revue manuelle**.

## 5. Après le lot

- **File de revue manuelle** (`INSUFFICIENT_PUBLIC_DATA` : part OTA ou marketing indécidables en donnée
  publique) : à trancher **à la main sous quelques heures**, ne pas supposer que tout se décide seul.
- **Reprise** : relancer la commande ne retraite pas les prospects déjà évalués (l'état de la Property
  joue le journal d'idempotence). Une interruption réseau est donc sans conséquence.
- Les **qualifiés** deviennent des mandats potentiels : à la signature, `signMandate` construit la thèse
  et déclenche la dérivation objectifs+tâches (étape 3).

## 6. Vérifié / testé

Pré-vol, import (dédup), lot, tri de la file et parsing CSV/JSON sont **couverts par des tests** (CI
verte). Il ne manque que les secrets + la base pour passer du test au réel.
