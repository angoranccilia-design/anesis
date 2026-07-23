# Étape 3 — Dérivation thèse → objectifs → tâches (proposition d'architecture)

> À valider (toi + conseiller technique) **avant** implémentation. Rien n'est codé tant que ce
> document n'est pas approuvé/ajusté. Vocabulaire imposé (en-GB, £), pas de $.

## 1. Ce qu'on relie

L'étape 2 produit, pour une propriété **qualifiée**, un `Assessment` :

```
Assessment { leakIndex /100, monthlyLoss £, decision, decisionCode,
             icp{keys,adr,otaShare}, subScores{speed, reviews, ota, retargeting} }
```

Le modèle de domaine (déjà dans `@anesis/core`) attend, en aval :

```
UnderwritingThesis { mandateId, leakIndex, lossLines[] }
  └─ LossLineItem { pillar, annualLoss £, rootCause }
        └─ Objective { lossLineId (non-null), targetRecovery £, state }   ← trace vers un £
              └─ Task { objectiveId (non-null), assignedAgent, intent, state }
```

**L'étape 3 remplit ce chaînage automatiquement.** C'est ce qui rend « l'exécution dérivée d'un
chiffre » : aucune tâche n'existe sans objectif, aucun objectif sans poste de perte chiffré en £.

## 2. Principe : une fonction PURE et DÉTERMINISTE (comme le scoring)

Nouveau paquet **`packages/planning`** (pur, **sans DB, sans LLM**), symétrique de `packages/assessment` :

```
derivePlan(assessment, mandateId, config, { now, nextId })
   → { thesis, objectives[], tasks[] }
```

Mêmes entrées → **toujours** le même plan. La dérivation est une **politique déterministe**
(mapping + arithmétique £), jamais un jugement de LLM. Un LLM pourra plus tard *rédiger* un libellé,
mais ne décide **ni** les objectifs **ni** les montants (même discipline qu'à l'étape 2).

## 3. Les 3 dérivations

### 3a. Assessment → LossLines (répartir la perte £ par pilier)
Chaque sous-score déficient devient un poste de perte. La `monthlyLoss` totale est **répartie entre
les piliers au prorata de leur contribution au leakIndex** (poids : speed 0.25, reviews 0.25,
ota 0.30, retargeting 0.20 × leur sous-score). Répartition sans dérive d'arrondi via
`allocate()` (plus-grand-reste, déjà dans core). `annualLoss = part mensuelle × 12`.

- **Seuil de matérialité** (config) : un pilier ne crée un poste que si sa perte annuelle dépasse un
  plancher (ex. £2 000/an) — pas de bruit pour des pertes marginales.
- `rootCause` = libellé gabarit en-GB par pilier (ex. *"Slow website response depresses direct
  conversion"*).

### 3b. LossLine → Objective (1 pour 1)
Un `Objective` par `LossLineItem`. `targetRecovery = annualLoss × recoverableFraction[pilier]`
(fraction **par pilier**, config — c'est l'engagement de récupération de la firme, prudent et
défendable). `title` = gabarit en-GB. État initial `created`.

### 3c. Objective → Task(s) (routage vers l'agent propriétaire)
Chaque objectif engendre **une tâche initiale** (option B possible : mini-playbook par pilier),
`state = created`, `assignedAgent` choisi par une **table pilier → agent** :

| Pilier (sous-score) | Agent proposé | Tier | Intent (en-GB) |
|---|---|---|---|
| `speed` (temps de réponse site) | **conversion** | T1 | *Improve site response time & direct-booking path* |
| `reviews` (réputation) | **reputation** | T2 | *Lift review volume & rating* |
| `ota` (dépendance OTA / parité) | **rate-distribution** | T4 | *Rebalance channel mix & protect rate parity* |
| `retargeting` (pas de pixel) | **media-buyer** | T4 | *Deploy retargeting to recapture lost demand* |

> Le **tier** de l'agent définit déjà le régime d'autorisation (T4 = approbation fondatrice avant
> exécution) — la politique de l'étape 1 s'applique telle quelle, on ne re-décide rien ici.

## 4. Où ça se branche (intégration runtime)

Un déclencheur réagit à **`property.qualified`** (déjà émis à l'étape 2) et appelle `derivePlan`,
puis persiste thèse + objectifs + tâches via `ctx.act` (écritures mandat-scopées, RLS).

- **Idempotent / reprenable** : la dérivation ne s'exécute **qu'une fois par mandat** (garde : si une
  thèse existe déjà pour ce mandat, on ne redérive pas) — même discipline que le lot underwriter.
- **Événements** (à ajouter dans core, additif) : `thesis.derived`, `objective.created`,
  `task.created` — pour l'audit et pour que l'`orchestrator` prenne le relais (assignation, suivi).
- Option d'implémentation : nouvel agent **`planner`** (T0) *ou* extension de l'`underwriter`.
  Proposition : **agent `planner` T0** dédié (séparation claire évaluer vs planifier).

## 5. Décisions à valider (⚠️ avant que je code)

1. **Table pilier → agent** (§3c) : ce routage te convient-il ? (surtout OTA → rate-distribution vs
   partnerships, et retargeting → media-buyer).
2. **`recoverableFraction` par pilier** : quelle part de chaque perte la firme s'engage à récupérer ?
   (proposition prudente par défaut, ex. 40–60 % selon pilier — à cadrer avec le conseiller).
3. **Seuil de matérialité** d'un poste de perte (proposition £2 000/an).
4. **1 tâche par objectif** (simple, proposé) **ou** mini-playbook par pilier (plusieurs tâches) ?
5. **Déclenchement** : dériver **automatiquement** dès `property.qualified`, **ou** attendre une
   étape humaine « mandat signé » avant de créer objectifs/tâches ? (question de gouvernance : on
   underwrite d'abord, on exécute après signature).
6. **Paquet dédié `packages/planning`** (proposé) et **agent `planner` T0** (proposé) — OK ?

## 6. Livrable si validé
`packages/planning` (fonction pure + config + gabarits en-GB) + tests (déterminisme, répartition £
sans dérive, seuil de matérialité, traçabilité loss→objective→task, routage agent) + branchement
runtime idempotent + 3 événements core. Aucune régression sur les 140 tests existants ; CI verte
(les 2 portes) exigée avant de clore le point de contrôle.
