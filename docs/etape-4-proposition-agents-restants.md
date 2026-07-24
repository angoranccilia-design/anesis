# Étape 4 — Migration des 8 agents restants (proposition d'architecture)

> À valider (toi + conseiller) **avant** implémentation. Rien n'est codé tant que ce document n'est pas
> approuvé. Vocabulaire en-GB, £ jamais $. **Le roster reste à 12** — aucun 13e, aucune fusion, aucun
> renommage d'id sans accord explicite.

Les 4 agents déjà construits (analyst, underwriter, orchestrator, media-buyer) fixent le pattern :
`ctx.startRun()` → un ou plusieurs `ctx.act(intent)` (**seul** point d'exécution, `authorize()` d'abord)
→ `ctx.emit(...)` → `ctx.completeRun(minutes, source)`, idempotence par garde. On le suit à l'identique.

**Tiers : ROSTER ↔ Partie 5 concordent** (Totale=T0, Relecture=T1, Délai 2h=T2, Accord=T3/T4/T5). Une
seule divergence, de **libellé**, ci-dessous (§0).

---

## §0. Divergence ROSTER ↔ Partie 5 à trancher (je ne tranche pas seul)

| | ROSTER (`agent.ts`, source de vérité) | Partie 5 (doc business) |
|---|---|---|
| id | `art-director` | — |
| libellé | « Art Director » | « **Creative Director** » |
| autonomie | **T5** (blocking_approval) | « Interne, jamais publié directement » |

Comme demandé, je suis le ROSTER (**id `art-director`, tier T5**). Deux points à confirmer :
1. **Libellé** : garde-t-on « Art Director » (ROSTER) ou aligne-t-on sur « Creative Director » (doc) ?
   Rappel : le rôle **humain** est « Directrice Artistique » ; l'**agent** qu'elle pilote est ce slot.
2. **T5 « interne »** : je l'interprète comme « produit un **artefact interne** (direction créative),
   **jamais publié** ; l'adoption de cette direction exige la validation de la Directrice Artistique /
   fondatrice » → régime `blocking_approval` (T5) sur *l'adoption*, pas sur une publication externe.
   OK avec cette lecture ?

---

## §1. Deux mécanismes NOUVEAUX (le vrai travail — pas de la plomberie recopiable)

### 1a. T1 — exécution immédiate + trace de revue *a posteriori*
`authorize()` renvoie `allow` pour T1 comme pour T0 : la policy ne distingue pas. La spécificité T1
(« un humain vérifie ensuite ») est donc **à porter par l'agent**, sans nouveau moteur :

- l'agent exécute via `ctx.act(intent T1)` → l'effet part **immédiatement**, le `tool_call` est écrit
  (c'est déjà la trace d'audit) ;
- puis l'agent **émet une notification de relecture** (priorité `normal`, action attendue « vérifier »)
  reliée à ce `tool_call` → l'humain peut réviser après coup.

**Aucune nouvelle table.** (Décision : ok pour représenter la « relecture après coup » par une
notification post-action + le `tool_call` comme trace, plutôt qu'une table de revue dédiée ?)

### 1b. T2 — fenêtre de retenue de 2h, DURABLE (la décision centrale)
Aujourd'hui, `ctx.act(T2)` fait un **`sleep(2h)` en mémoire** (injecté, no-op en test). **Ce n'est pas
viable en production** : bloquer un process 2h, et ne pas survivre à un redémarrage. Or l'abonné d'arrêt
d'urgence **attend déjà** un modèle durable (il annule les runs `status='sleeping_retention'`).

Deux options :

- **Option A — retenue durable pilotée par tick (RECOMMANDÉE).** Quand un agent décide une action T2 :
  on **persiste l'action en attente** (table `retentions` : mandat, run, `action_name`, `input` jsonb,
  `compensation`, `due_at = now()+2h`, `status='pending'`), on met le run en `sleeping_retention`, et on
  **émet l'alerte** (notification). **Rien ne dort en mémoire.** Un **balayeur** sur `hourly.tick` (un
  utilitaire système, comme `planner`) mûrit les retenues échues : re-`authorize()` (fenêtre écoulée) →
  si ni annulée ni arrêt d'urgence → **exécute l'effet + écrit le `tool_call` + clôt le run**. L'arrêt
  d'urgence annule déjà les `sleeping_retention` (cohérent, déjà câblé). L'effet est redispatché par
  `action_name` via un petit **registre de handlers T2** (l'effet, une closure, n'est pas sérialisable ;
  on rejoue un handler connu à partir de l'`input` persisté).
  - *Coût* : 1 migration (`retentions`), 1 balayeur, un registre `action_name → handler`.
- **Option B — garder le `sleep` en mémoire**, et compter sur le `step.sleep` durable de l'hébergeur
  (Inngest, décidé mais pas construit). Plus simple maintenant, mais **non exécutable durablement** tant
  que l'hébergement n'existe pas, et fragile au redémarrage.

**Recommandation : Option A** — elle rend T2 réellement exécutable, indépendamment de l'hébergement, et
épouse le chemin d'annulation d'urgence déjà présent. **À valider avant de coder reputation/partnerships.**

---

## §2. Maillon d'intégration avec le planner (à trancher)

Le `planner` (étape 3) crée les tâches en `state='created'` + émet **`task.created`**. Mais les agents
d'exécution (media-buyer, et les nouveaux conversion/reputation/rate-distribution) se déclenchent sur
**`task.assigned`** (émis aujourd'hui par l'orchestrator). Il manque le pas **created → assigned**.

Deux options (je ne modifie pas le planner sans ton accord) :
- **A** : un petit pas d'**assignation** (dans l'orchestrator, sur `task.created`) transite la tâche en
  `assigned` et émet `task.assigned`. Découplé, flexible.
- **B** : le `planner` émet directement `task.assigned` (il connaît déjà l'agent). Plus simple, mais
  change le comportement de l'étape 3.

**Recommandation : A** (l'assignation reste la responsabilité de l'orchestrator). À confirmer.

---

## §3. Les 8 agents (déclencheur · ToolIntent/tier · DB · idempotence)

> Les intégrations externes (Buffer/Cloudinary, Google Business, Meta/Google Ads, email) sont des
> **adaptateurs d'outils injectés** derrière `ToolIntent.effect` (comme `@anesis/sources`) — **stubés en
> test**, câblés au réel plus tard. Aucune clé dans le code.

### social-ops — T1 (immediate_post_review) · KPI : délai de publication
- **Déclencheur** : `artifact.approved` d'un artefact publiable (contenu déjà approuvé en amont).
- **Action** : `publish_content` (T1) → publie via l'adaptateur social → enregistre la publication.
- **DB** : nouvelle table `publications` (id, mandate_id, artifact_id, channel, external_ref, published_at).
- **Idempotence** : ne republie pas un artefact déjà publié (garde sur `publications`).
- **T1** : après publication, notification de relecture (§1a).

### conversion — T1 (immediate_post_review) · KPI : impact conversion · *cible planner (pilier speed)*
- **Déclencheur** : `task.assigned` où `agentId='conversion'` (issu du planner via §2).
- **Action** : `publish_conversion_reco` (T1) → produit une **recommandation** (artefact) et la pousse
  à l'inbox du mandant → notification de relecture.
- **DB** : réutilise `artifacts` (type `conversion_recommendation`). Pas de migration.
- **Idempotence** : une reco par tâche (garde sur `task_id`).

### reputation — T2 (retention_window) · KPI : note Google · *cible planner (pilier reviews)*
- **Déclencheur** : `external.review_received` (mandat, source, note).
- **Action** : rédige la réponse (interne) puis `reply_review` (T2, réversible, compensation « supprimer
  la réponse ») **via la retenue durable §1b** (fenêtre 2h + alerte ; auto si personne n'intervient).
- **DB** : nouvelle table `reviews` (id, mandate_id, source, rating, text, received_at, responded_at) —
  nécessaire pour porter le texte de l'avis **et** l'idempotence (le payload de l'événement ne suffit pas).
  ⚠️ Note honnête (Partie 5) : **TripAdvisor** ne se répond pas automatiquement — l'agent rédige, un
  humain colle. On limite donc `reply_review` auto à Google ; les autres sources → artefact + notification.
- **Idempotence** : une réponse par avis (garde sur `reviews.responded_at`).

### partnerships — T2 (retention_window) · KPI : partenariats signés
- **Déclencheur** : `weekly.tick` (traite une file de partenaires prospects du mandat).
- **Action** : `contact_partner` (T2, réversible) via la retenue durable §1b (2h + alerte).
- **DB** : nouvelle table `partners` (id, mandate_id, name, kind `pms|broker|guide`, contact, status,
  contacted_at). ⚠️ **Décision** : partenaires **rattachés au mandat** (RLS) — cohérent avec T2 qui exige
  un contexte de mandat (un run système est limité à T0). OK, ou tu vois les partenaires au niveau firme ?
- **Idempotence** : ne recontacte pas un partenaire déjà `contacted` (garde sur `status`).

### lifecycle — T3 (blocking_approval) · KPI : LTV client hôtel
- **Déclencheur** : `task.assigned` où `agentId='lifecycle'` (ou `monthly.tick`).
- **Action** : `prepare_email_sequence` (T3) → **pattern media-buyer** : `require_approval` → Approval +
  `human.approval_requested` + notification + `suspendForApproval`; sur `human.approval_granted` → reprise
  → `act(approval)` → allow → active la séquence (artefact) → `completeRun(minutes humaines)`.
- **DB** : réutilise `approvals` + `artifacts` (type `email_sequence`). Pas de migration.
- **Idempotence** : une Approval en cours par tâche.

### rate-distribution — T4 (blocking_approval) · KPI : % réservations directes · *cible planner (pilier ota)*
- **Déclencheur** : `external.rate_parity_broken` **et** `task.assigned` où `agentId='rate-distribution'`.
- **Action** : `adjust_distribution` (T4) → pattern approbation (comme media-buyer).
- **DB** : réutilise `approvals` + `artifacts` (type `distribution_change`). Pas de migration.
- **Idempotence** : une Approval en cours par déclencheur.

### content-creator — T5 (blocking_approval) · KPI : perf créas
- **Déclencheur** : `task.assigned` (`agentId='content-creator'`) ou une direction créative **validée**
  (voir art-director) → produit textes/calendrier/brief.
- **Action** : `produce_content` (T5) → pattern approbation.
- **DB** : réutilise `approvals` + `artifacts` (type `content`). Pas de migration.
- **Idempotence** : une Approval en cours par tâche.

### art-director — T5 (interne, jamais publié) · KPI : attribution créative au revenu
- **Déclencheur** : `mandate.thesis_attached` (à la signature — donne la direction créative du mandat).
- **Action** : `propose_creative_direction` (T5) → produit un **artefact interne** (moodboard/identité,
  jamais publié) ; l'**adoption** exige la validation Directrice Artistique/fondatrice → pattern approbation.
- **DB** : réutilise `approvals` + `artifacts` (type `creative_direction`, jamais publié). Pas de migration.
- **Idempotence** : une direction par mandat (garde). Alimente ensuite content-creator (pipeline créatif
  : art-director → validation DA → content-creator → validation → social-ops publie).

---

## §4. Migrations DB à ajouter (récapitulatif)
1. `retentions` (retenue durable T2 — §1b) — **si Option A validée**.
2. `reviews` (reputation).
3. `partners` (partnerships).
4. `publications` (social-ops).

Toutes **mandat-scopées** (RLS `mandate_id`), cohérentes avec le modèle d'isolation existant.

## §5. Décisions à valider (⚠️ avant que je code)
1. **§0** — libellé art-director (« Art Director » vs « Creative Director ») + lecture « T5 interne ».
2. **§1b** — **Option A (retenue durable + tick)** vs Option B (sleep en mémoire) pour T2.
3. **§1a** — T1 = notification post-action + `tool_call` (pas de table de revue dédiée) : ok ?
4. **§2** — maillon `task.created → task.assigned` : Option A (orchestrator assigne) vs B (planner assigne).
5. **§3 partnerships** — partenaires **rattachés au mandat** (RLS) : ok ?
6. **§3 reputation** — `reply_review` auto **limité à Google** (TripAdvisor rédigé, collé à la main) : ok ?
7. **§4** — les 4 migrations proposées : ok ?

## §6. Livrable si validé
Implémentation **un agent à la fois** dans `packages/agent-runtime/src/agents/`, exportés depuis
`index.ts` ; migrations dans `packages/db/migrations/`. **Ordre proposé** (du plus simple au plus neuf) :
conversion (T1) → social-ops (T1) → lifecycle (T3) → rate-distribution (T4) → content-creator (T5) →
art-director (T5) → **[mécanisme retenue durable §1b]** → reputation (T2) → partnerships (T2).
Tests par agent (même rigueur que `planner.test.ts` : déclenchement, idempotence, respect du régime de
tier, T2 = fenêtre + arrêt d'urgence). Zéro régression ; **CI verte (les deux portes)** avant de clore.
