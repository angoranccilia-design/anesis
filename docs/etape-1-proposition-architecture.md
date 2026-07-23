# ANESIS — Étape 1/5 · Proposition d'architecture (colonne vertébrale multi-agent)

> Statut : **proposition, aucun code écrit.** En attente de validation du modèle de domaine avant toute implémentation.
> Périmètre strict : le **backbone** (domaine, bus d'événements, workspace de mandat, planificateur, notifications/inbox, politique d'autonomie, journal d'audit) + 3 agents minimaux (Analyst, Orchestrator, Paid Acquisition) pour faire vivre la chaîne d'acceptation. **Pas** le moteur d'audit, ni le site, ni le cockpit, ni les 11 agents.

---

## 1. Inventaire du hub existant — verdict franc

Le hub réel est **`C:\Users\angor\Documents\kairos-growth-lab`** : Next.js App Router, Vercel (Hobby, `maxDuration = 60`), Supabase Postgres, `pg` Pool + client admin Supabase, SDK Anthropic. **7 agents** codés (lia, athena, elara, kaelen, neo, apollo, orion).

### À RÉUTILISER (adapter, pas jeter)
| Élément existant | Pourquoi on garde | Adaptation ANESIS |
|---|---|---|
| Boucle **tool-use** (`agent-tools.ts`, `chat/route.ts`, `MAX_TOOL_ITERATIONS`) | C'est déjà « outils déclarés par agent » + exécution. Base directe pour le runtime Claude Agent SDK. | La sortir du contexte « chat humain » → runtime autonome déclenché par événement, chaque tool-call tracé dans `AgentRun.tool_calls[]`. |
| Le **pattern de tool** (`Anthropic.Tool` + `executeAgentTool` switch) | Contrats E/S déjà pensés par agent. | Devient le registre d'outils par agent, avec un niveau d'autonomie **par action**. |
| Intégrations déjà écrites (`google.ts`, `resend.ts`, `meta.ts`, `ga4.ts`, `openmart.ts`, `higgsfield.ts`, `make.ts`, `push.ts`) | Code d'accès aux systèmes externes qui marche. | Rangées derrière des interfaces d'outils ; branchées à l'étape 4. Inutilisées au backbone sauf `push` (notif in-app). |
| Schéma **prospects** + qualification BANT/MEDDIC adaptée hôtellerie (`0006`, `0008`) | Vraie logique métier ICP, filtres chaînes, liste de blocage. | Voir zone d'ombre #3 : la prospection de la firme est-elle DANS ce système (Property.prospect) ou un pipeline à part ? À trancher. |
| Le workflow d'approbation par file (`comments_queue`, routes `decision`) | Preuve que le « human-in-the-loop » existe déjà. | **Remplacé** par l'entité générique `Approval` + politique d'autonomie. |

### À JETER (dette structurelle, incompatible avec le brief)
| Élément | Pourquoi c'est incompatible |
|---|---|
| **Collaboration inter-agents par appel direct** : `performLiaOnboarding` appelle `generateAthenaBrief()`, qui appelle `createContentFromBrief()`, via `after()`. | C'est **exactement** le couplage fort que le brief interdit (« les agents ne s'appellent jamais directement »). Toute cette chaîne câblée en dur disparaît → remplacée par événements + abonnements. |
| **`agent_runs` actuel** (`0001`+`0003`) : `agent_name, client_id, declencheur, input, output, statut`. | Trop pauvre pour l'`AgentRun` du brief. **Aucun** `cost_tokens`, `duration_ms`, `human_minutes_spent`, `tool_calls[]`, `artifacts[]`, `trigger` typé, `correlation_id`. Table refaite. |
| **`logAgentRun` → `sendPushToAll`** (broadcast à tous) | Le brief impose des notifications **adressées** (audience : agents/humains/rôles), avec action attendue + échéance. Le broadcast ne suffit pas. Remplacé par `Event` + `Notification` + inbox. |
| **Chaînage dans une seule invocation serverless** (`maxDuration = 60`, commentaire assumé « le temps s'additionne ») | Fragile et non durable : si Lia→Athena→Kaelen dépasse 60 s, coupé sans reprise. Aucune idempotence, aucun rejeu. Remplacé par file durable. |
| **Statuts métier français en dur dans des `check` Postgres** (`statut in ('nouveau','signe',...)`) | Le brief impose l'anglais britannique + des machines à états explicites. Enums refaits, langue de l'interface = en-GB. |
| Le **vieux SPA `hubkairos`** (HTML statique, clé Anthropic dans le navigateur) | **Correction importante** — voir zone d'ombre #2. C'est CE hub-là qui mettait la clé côté client, **pas** le Next.js (qui l'a déjà côté serveur, `process.env.ANTHROPIC_API_KEY`). Le vieux SPA est mort, aucune migration. |

### À MIGRER (données/logique à transporter)
- `clients` → `Property` (+ `Mandate`). Statuts refondus vers le cycle `prospect → assessed → qualified → underwriting → mandate → completed | declined | dormant`.
- `client_access` → rattaché à `Property`/`Mandate` (connexions Drive/Meta/GA4…).
- Personas/prompts d'agents (`agent-persona.ts`, `agents-config.ts`) → definitions d'`Agent` (rôle, contrats, outils, autonomie). **Mais** le roster change (voir zone d'ombre #1).
- `content_pieces`, `campaigns` → deviennent des `Artifact` typés issus d'`AgentRun`.

### ⚠️ Correction : il y a DEUX hubs → cible = UN SEUL hub ANESIS
Cet inventaire ne couvrait que le hub Next.js. En réalité il existe **deux** hubs, à consolider en **un seul** :
1. **`hubkairos.vercel.app`** — vieux SPA statique (HTML/JS, `KAIROS-Hub-Deploy`). Feed Planner de Julie + review-gate SAFIR. **Actuellement cassé** (API `get-scheduled-posts` → 500, la base Supabase n'est plus jointe). Contient encore le contenu SAFIR en attente (9 posts + 7 stories).
2. **`kairos-growth-lab`** — hub Next.js, 7 agents, Postgres, tool-use. Le plus avancé.

**Décision de consolidation :** le hub unique ANESIS = `apps/web`. **Base = le Next.js** (runtime, DB, outils déjà là) ; on **absorbe** du vieux SPA uniquement le Feed Planner + validation et le contenu SAFIR ; puis on **retire** le SPA. Résultat : un seul hub, une seule base, identité ANESIS. Cette fusion est intrinsèque aux étapes 1→5, pas un chantier séparé.

**Verdict global : greenfield sur le backbone, récupération chirurgicale.** On ne « refactore » pas le hub en place — on repart d'un monorepo propre et on **réimporte** le code d'intégration + la logique ICP/qualification comme outils. Le mécanisme nerveux (collaboration, runs, notifs, cron) est intégralement remplacé, car c'est précisément ce qui est cassé.

---

## 2. Topologie recommandée (et un problème d'hébergement à trancher)

```
anesis/ (monorepo, pnpm workspaces + Turborepo)
├─ packages/
│  ├─ core/        # ZÉRO dépendance : types du domaine, machines à états, invariants (fonctions pures)
│  ├─ db/          # Drizzle ORM (schéma + requêtes typées) — dépend de core
│  ├─ events/      # taxonomie d'événements typée + helpers d'émission — dépend de core
│  ├─ policy/      # moteur de politique d'autonomie (T0–T5) — dépend de core
│  └─ agent-runtime/# boucle Claude Agent SDK, registre d'outils par agent — dépend de core+db+events+policy
├─ apps/
│  ├─ web/         # Next.js (UI : inbox, tableau de tâches, feed, approbations)
│  └─ worker/      # runtime des agents + fonctions planifiées (ticks) + handlers d'événements
└─ docs/
```

**⚠️ Problème d'hébergement (à décider — question ouverte #1).** Le brief veut : file durable, runs d'agents longs (boucles multi-outils de plusieurs minutes), fenêtre de retenue T2 de 2 h, approbations bloquantes pouvant durer des jours. **Vercel Hobby coupe à 60 s** et le hub actuel s'y cogne déjà. Trois options :

- **(A) Recommandée — Inngest, boucle d'agent découpée en `steps`.** Chaque appel Claude / tool-call = un `step` Inngest (< 60 s), la durabilité (sleep, `waitForEvent`) vit *entre* les invocations. La retenue T2 = `step.sleep("2h")`, l'approbation T3/T4/T5 = `step.waitForEvent("human.approval_granted")`. Avantage : **tient même sur Vercel serverless**, rejeu et idempotence natifs. C'est l'option la plus alignée avec le brief.
- **(B) Worker persistant** (`apps/worker` sur Railway/Fly/Render) + BullMQ/Redis. Plus simple mentalement (un process qui tourne), mais on réimplémente à la main le bus d'événements durable, les waits longs, le rejeu. Plus de code, plus de surface de bug.
- **(C) Trigger.dev** — équivalent d'Inngest côté « workflows durables », excellent, légèrement moins « bus pub/sub à N abonnés » nativement.

Je recommande **(A)**. Détail du choix de file en §6.

---

## 3. Modèle de domaine (TypeScript) — LE livrable central

`packages/core` — **aucune dépendance externe**. Types + machines à états + invariants purs. Voici la proposition complète.

### 3.1 Identifiants & primitives

```ts
// Identifiants nominatifs (branded types) — empêche de passer un MandateId là où on attend un TaskId.
type Brand<K, T> = K & { readonly __brand: T };
export type PropertyId    = Brand<string, "PropertyId">;
export type MandateId     = Brand<string, "MandateId">;
export type ObjectiveId   = Brand<string, "ObjectiveId">;
export type TaskId        = Brand<string, "TaskId">;
export type AgentId       = Brand<string, "AgentId">;      // ex: "analyst", "orchestrator"
export type AgentRunId    = Brand<string, "AgentRunId">;
export type ArtifactId    = Brand<string, "ArtifactId">;
export type EventId       = Brand<string, "EventId">;
export type NotificationId= Brand<string, "NotificationId">;
export type BlockerId     = Brand<string, "BlockerId">;
export type ApprovalId    = Brand<string, "ApprovalId">;
export type MeasurementId = Brand<string, "MeasurementId">;
export type ThesisId      = Brand<string, "ThesisId">;
export type LossLineId    = Brand<string, "LossLineId">;
export type OperatorId    = Brand<string, "OperatorId">;   // humain (Cecilia et futurs opérateurs)
export type CorrelationId = Brand<string, "CorrelationId">;

/** Argent : livre sterling UNIQUEMENT, stocké en pence entiers (jamais de flottant sur de la monnaie). */
export interface Money { readonly currency: "GBP"; readonly pence: number; }
export type Iso8601 = Brand<string, "Iso8601">;
```

### 3.2 Property — entité pivot

```ts
export type PropertyState =
  | "prospect" | "assessed" | "qualified" | "underwriting"
  | "mandate"  | "completed" | "declined" | "dormant";

export interface Property {
  id: PropertyId;
  name: string;                 // établissement
  state: PropertyState;
  keys: number;                 // nb de clés (12–80 cible ICP)
  avgNightlyRate: Money;        // > £140 cible
  otaSharePct: number | null;   // % réservations via plateformes à commission (>35% cible)
  hasInHouseMarketing: boolean; // ICP = false
  region: string;               // UK
  contacts: PropertyContact[];
  createdAt: Iso8601;
  updatedAt: Iso8601;
}

// Transitions autorisées (le reste est interdit et doit être rejeté par le domaine)
export const PROPERTY_TRANSITIONS: Record<PropertyState, PropertyState[]> = {
  prospect:     ["assessed", "declined", "dormant"],
  assessed:     ["qualified", "declined", "dormant"],
  qualified:    ["underwriting", "declined", "dormant"],
  underwriting: ["mandate", "declined", "dormant"],
  mandate:      ["completed", "dormant"],
  completed:    ["dormant"],
  declined:     ["prospect"],   // réanimation possible
  dormant:      ["prospect"],
};
```

### 3.3 Mandate + Thesis + LossLine — le cœur « l'exécution dérive d'un chiffre »

```ts
export type MandateState = "active" | "suspended" | "completed" | "terminated";

export interface Mandate {
  id: MandateId;
  propertyId: PropertyId;
  state: MandateState;
  thesisId: ThesisId | null;    // attachée à mandate.thesis_attached
  startedAt: Iso8601;
  brandConstraints: BrandConstraints; // voix de marque (contrainte T5)
  emergencyStopped: boolean;    // coupure par mandat
}

/** Thèse de souscription — produite par le moteur d'audit (étape 2). Modélisée ici, remplie plus tard. */
export interface UnderwritingThesis {
  id: ThesisId;
  mandateId: MandateId;
  leakIndex: number;            // /100
  lossLines: LossLineItem[];    // chaque poste de perte chiffré en £/an
  createdAt: Iso8601;
}

export interface LossLineItem {
  id: LossLineId;
  thesisId: ThesisId;
  pillar: string;              // ex: "response_time", "retargeting", "rate_parity"
  annualLoss: Money;           // £/an perdus sur ce poste
  rootCause: string;
}
```

**Invariant central du brief :** un `Objective` **doit** pointer vers une `LossLineItem` (l'exécution est dérivée d'un chiffre, jamais décidée à la main). Voir §3.4.

### 3.4 Objective & Task

```ts
export type ObjectiveState = "created" | "active" | "at_risk" | "achieved" | "abandoned";

export interface Objective {
  id: ObjectiveId;
  mandateId: MandateId;
  lossLineId: LossLineId;      // INVARIANT : non nullable — traçabilité vers un £ chiffré
  title: string;
  targetRecovery: Money;       // £ à récupérer (dérivé de la loss line)
  state: ObjectiveState;
  createdAt: Iso8601;
}

export type TaskState = "created" | "assigned" | "in_progress" | "blocked" | "completed" | "cancelled";

export interface Task {
  id: TaskId;
  objectiveId: ObjectiveId;    // INVARIANT : pas de Task sans Objective
  mandateId: MandateId;        // dénormalisé pour l'isolation par mandat
  assignedAgent: AgentId | null;
  state: TaskState;
  intent: string;              // ce que la tâche vise
  createdAt: Iso8601;
}

export const TASK_TRANSITIONS: Record<TaskState, TaskState[]> = {
  created:     ["assigned", "cancelled"],
  assigned:    ["in_progress", "blocked", "cancelled"],
  in_progress: ["completed", "blocked", "cancelled"],
  blocked:     ["assigned", "in_progress", "cancelled"],
  completed:   [],
  cancelled:   [],
};
```

### 3.5 Agent, AgentRun (entité la plus importante), Artifact

```ts
export type AutonomyTier = "T0" | "T1" | "T2" | "T3" | "T4" | "T5";

export interface AgentDefinition {
  id: AgentId;
  role: string;                        // en-GB
  inputContract: string;               // ce qu'il lit (workspace) — schéma
  outputContract: string;              // artefacts qu'il produit
  tools: AgentToolRef[];               // outils déclarés
  subscribesTo: EventType[];           // événements + ticks auxquels il réagit
  defaultTier: AutonomyTier;           // niveau par défaut (surchargé par action)
}

export interface AgentToolRef { name: string; tier: AutonomyTier; } // tier PAR ACTION

export type AgentRunStatus =
  | "started" | "awaiting_approval" | "sleeping_retention"
  | "completed" | "failed" | "cancelled";

/** AgentRun — UNE exécution. Entité de première classe. */
export interface AgentRun {
  id: AgentRunId;
  agentId: AgentId;
  mandateId: MandateId | null;         // null = run transversal (ex: monitoring hourly) — voir zone d'ombre #5
  taskId: TaskId | null;               // null = run non issu d'une tâche (ex: monitoring qui CRÉE des tâches)
  trigger: RunTrigger;                 // typé (voir ci-dessous)
  inputs: unknown;                     // snapshot des entrées (issu du workspace)
  toolCalls: ToolCallRecord[];
  artifacts: ArtifactId[];
  status: AgentRunStatus;
  costTokens: number;                  // tokens consommés
  durationMs: number;
  humanMinutesSpent: number;           // ★ OBLIGATOIRE, non nullable, >= 0 — donnée produit (levier)
  correlationId: CorrelationId;
  startedAt: Iso8601;
  endedAt: Iso8601 | null;
}

export type RunTrigger =
  | { kind: "event";    eventId: EventId; eventType: EventType }
  | { kind: "tick";     tick: TickType }
  | { kind: "task";     taskId: TaskId }
  | { kind: "manual";   operatorId: OperatorId };

export interface ToolCallRecord {
  name: string; tier: AutonomyTier; input: unknown; output: unknown;
  approvedBy: OperatorId | null;       // qui a approuvé (T3+) ; null si T0/T1
  reversible: boolean; compensation: string | null; // comment annuler (T2+)
  at: Iso8601;
}

export type ArtifactState = "produced" | "approved" | "rejected";

export interface Artifact {
  id: ArtifactId;
  producedByRun: AgentRunId;           // INVARIANT : pas d'Artifact sans AgentRun
  mandateId: MandateId;
  type: string;                        // "content_piece" | "campaign_plan" | "nurture_sequence" | "weekly_report"...
  version: number;                     // versionné
  supersedes: ArtifactId | null;
  payload: unknown;                    // typé par `type` en étape 4
  state: ArtifactState;
  createdAt: Iso8601;
}
```

### 3.6 Event, Notification, Blocker, Approval, Measurement

```ts
export interface EventAudience { agents: AgentId[]; humans: OperatorId[]; roles: string[]; }

/** Event — fait immuable. La table est append-only ; c'est la source de vérité + le journal d'audit. */
export interface DomainEvent<T extends EventType = EventType> {
  id: EventId;
  type: T;
  payload: EventPayloadMap[T];         // payload typé par type (§5)
  mandateId: MandateId | null;
  emittedBy: AgentId | OperatorId | "system";
  emittedAt: Iso8601;
  audience: EventAudience;
  correlationId: CorrelationId;        // reconstitue une chaîne de bout en bout
}

export interface Notification {
  id: NotificationId;
  eventId: EventId;                    // dérivée d'un Event adressé
  recipient: { kind: "agent"; id: AgentId } | { kind: "human"; id: OperatorId };
  what: string; why: string; expectedAction: string; // JAMAIS de notif sans action attendue explicite
  deadline: Iso8601 | null;
  contextLink: string;                 // lien vers le contexte
  readAt: Iso8601 | null;
  actedAt: Iso8601 | null;
  priority: "low" | "normal" | "high" | "urgent";
}

export type BlockerState = "raised" | "resolved";
export interface Blocker {
  id: BlockerId;
  raisedByRun: AgentRunId;
  mandateId: MandateId | null;
  assignee: { kind: "agent"; id: AgentId } | { kind: "human"; id: OperatorId }; // escalade NOMINATIVE
  reason: string; dueAt: Iso8601;      // échéance
  state: BlockerState;
  resolvedAt: Iso8601 | null;
}

export type ApprovalStatus = "pending" | "granted" | "denied" | "expired";
export interface Approval {
  id: ApprovalId;
  runId: AgentRunId; toolCallName: string; tier: AutonomyTier; // T3/T4/T5 (bloquant)
  mandateId: MandateId;
  reason: string; payload: unknown; amount: Money | null;      // motif + montant (T4)
  status: ApprovalStatus;
  requestedAt: Iso8601; expiresAt: Iso8601 | null;
  decidedBy: OperatorId | null; decidedAt: Iso8601 | null;
}

export interface Measurement {
  id: MeasurementId;
  mandateId: MandateId; objectiveId: ObjectiveId | null;
  metric: string; period: string;      // ex: "2026-08"
  planned: number; actual: number;     // réel vs prévu (prévu ← thèse, étape 2)
  deviationPct: number;
  recordedAt: Iso8601;
}
```

### 3.7 Invariants (vérifiés par le domaine + tests)

1. `AgentRun.humanMinutesSpent` : présent, non nullable, ≥ 0. **Aucun** run ne se clôt sans ce champ renseigné.
2. `Objective.lossLineId` non nullable → toute exécution trace vers un £ chiffré.
3. `Task.objectiveId` non nullable ; `Artifact.producedByRun` non nullable.
4. Toute action `tier ≥ T2` passe **obligatoirement** par le moteur de politique. T3/T4/T5 exigent un `Approval` `granted` **avant** exécution. T2 exige fenêtre de retenue + notification.
5. `DomainEvent` est **append-only** : jamais d'`UPDATE`/`DELETE`. Un `correlationId` relie une chaîne ; tout événement est rejouable.
6. Isolation par mandat : toute entité rattachée porte `mandateId` ; toute requête est bornée au mandat ; l'accès inter-mandats est interdit (RLS + test dédié).
7. `Mandate.emergencyStopped` **ou** coupure globale ⇒ arrêt immédiat : aucun nouveau run, aucune action externe, les T2 en retenue sont annulés (l'arrêt d'urgence l'emporte sur la fenêtre 2 h — voir zone d'ombre #4).
8. Idempotence : chaque run/action porte une clé d'idempotence ; un rejeu ne redéclenche pas l'effet externe.
9. Réversibilité : toute action T2+ enregistre `reversible` + `compensation` (comment annuler/compenser).
10. Une `Notification` a toujours `expectedAction` non vide.

---

## 4. Schéma de base de données

**Postgres + Drizzle ORM** (SQL-first, entièrement typé, léger — laisse `packages/core` sans dépendance ; le schéma vit dans `packages/db`). Alternative : Prisma (plus lourd, client généré). Je recommande **Drizzle** pour le contrôle append-only et l'affinité serverless.

Tables (1 par entité) : `properties`, `mandates`, `theses`, `loss_lines`, `objectives`, `tasks`, `agent_definitions`, `agent_runs`, `tool_calls`, `artifacts`, `events`, `notifications`, `blockers`, `approvals`, `measurements`, `operators`, `mandate_workspaces`, `workspace_entries`.

Points saillants :
- `events` : **append-only**. `id, type, payload jsonb, mandate_id, emitted_by, emitted_at, audience jsonb, correlation_id`. Révoquer `UPDATE`/`DELETE` au niveau des privilèges du rôle applicatif. Index sur `(mandate_id, emitted_at)`, `(type)`, `(correlation_id)`.
- `agent_runs` : tous les champs du §3.5. `human_minutes_spent integer NOT NULL CHECK (human_minutes_spent >= 0)`. `cost_tokens`, `duration_ms`, `trigger jsonb`, `correlation_id`. `tool_calls` en table fille (1-N) pour requêter le détail.
- `objectives.loss_line_id NOT NULL REFERENCES loss_lines(id)`.
- Enums Postgres pour tous les états (`property_state`, `mandate_state`, `objective_state`, `task_state`, `agent_run_status`, `artifact_state`, `blocker_state`, `approval_status`, `autonomy_tier`).
- **RLS activée** sur toutes les tables mandat-scopées ; politique par `mandate_id` ; le rôle applicatif n'accède qu'aux lignes du mandat courant (règle passée par `set_config('app.mandate_id', ...)`). Un test d'isolation prouve qu'un run d'un mandat ne lit pas les données d'un autre.
- `mandate_workspaces` (1 par mandat) + `workspace_entries` (append-only : contexte, thèse, décisions+motif, contraintes de marque, historique d'artefacts, journal chronologique). Un agent **lit** le workspace ; s'il manque une info, il lève un `Blocker` (jamais de brief rédigé à la main).
- **Journal d'audit** : pas de table séparée redondante — `events` (append-only) + `tool_calls` (qui/quoi/quand/entrée/outil/résultat/approuvé-par) **constituent** le journal reconstituable et immuable.

---

## 5. Taxonomie d'événements typée

`packages/events`. Union discriminée + carte de payloads (extrait — la liste complète du brief est couverte).

```ts
export type EventType =
  | "mandate.created" | "mandate.thesis_attached"
  | "objective.created" | "objective.at_risk" | "objective.achieved"
  | "task.created" | "task.assigned" | "task.blocked" | "task.completed"
  | "agentrun.started" | "agentrun.completed" | "agentrun.failed" | "agentrun.needs_approval"
  | "artifact.produced" | "artifact.approved" | "artifact.rejected"
  | "measurement.recorded" | "measurement.deviation_detected"
  | "external.review_received" | "external.rate_parity_broken" | "external.ad_spend_anomaly"
  | "human.approval_requested" | "human.approval_granted" | "human.approval_denied"
  | "blocker.raised" | "blocker.resolved";

export interface EventPayloadMap {
  "mandate.created":              { mandateId: MandateId; propertyId: PropertyId };
  "mandate.thesis_attached":      { mandateId: MandateId; thesisId: ThesisId; leakIndex: number };
  "objective.created":            { objectiveId: ObjectiveId; lossLineId: LossLineId; targetRecovery: Money };
  "objective.at_risk":            { objectiveId: ObjectiveId; reason: string };
  "objective.achieved":           { objectiveId: ObjectiveId };
  "task.created":                 { taskId: TaskId; objectiveId: ObjectiveId };
  "task.assigned":                { taskId: TaskId; agentId: AgentId };
  "task.blocked":                 { taskId: TaskId; blockerId: BlockerId };
  "task.completed":               { taskId: TaskId; runId: AgentRunId };
  "agentrun.started":             { runId: AgentRunId; agentId: AgentId };
  "agentrun.completed":           { runId: AgentRunId; humanMinutesSpent: number; costTokens: number };
  "agentrun.failed":              { runId: AgentRunId; error: string };
  "agentrun.needs_approval":      { runId: AgentRunId; approvalId: ApprovalId; tier: AutonomyTier };
  "artifact.produced":            { artifactId: ArtifactId; runId: AgentRunId; type: string };
  "artifact.approved":            { artifactId: ArtifactId; by: OperatorId };
  "artifact.rejected":            { artifactId: ArtifactId; by: OperatorId; reason: string };
  "measurement.recorded":         { measurementId: MeasurementId; metric: string; actual: number };
  "measurement.deviation_detected":{ measurementId: MeasurementId; metric: string; deviationPct: number };
  "external.review_received":     { mandateId: MandateId; source: string; rating: number };
  "external.rate_parity_broken":  { mandateId: MandateId; channel: string; delta: Money };
  "external.ad_spend_anomaly":    { mandateId: MandateId; channel: string; spend: Money; expected: Money };
  "human.approval_requested":     { approvalId: ApprovalId; runId: AgentRunId; amount: Money | null };
  "human.approval_granted":       { approvalId: ApprovalId; by: OperatorId };
  "human.approval_denied":        { approvalId: ApprovalId; by: OperatorId; reason: string };
  "blocker.raised":               { blockerId: BlockerId; assignee: string; dueAt: Iso8601 };
  "blocker.resolved":             { blockerId: BlockerId };
}

export type TickType = "hourly.tick" | "daily.tick" | "weekly.tick" | "monthly.tick";
```

**Architecture du bus :** émettre = (1) `INSERT` dans `events` (source de vérité + audit, append-only), puis (2) publier vers la file (Inngest). Les abonnés sont des fonctions déclenchées par `type`. Le rejeu se fait depuis notre table `events`, indépendamment du fournisseur.

---

## 6. Choix de la file d'attente — argumenté

**Recommandation : Inngest.** Comparaison sur les besoins exacts du brief :

| Besoin du brief | Inngest | BullMQ (+Redis) | Trigger.dev |
|---|---|---|---|
| Bus événementiel à N abonnés par `type` | **Natif** (`inngest.send` + `createFunction({event})`) | À construire soi-même | Natif-ish |
| Ticks planifiés (hourly/daily/weekly/monthly) | **Cron natif** | `repeat` (à câbler) | Cron natif |
| Fenêtre de retenue T2 (2 h) | **`step.sleep("2h")`** durable | `delay` de job (fragile sur reprise) | `wait.for` |
| Approbation bloquante T3/T4/T5 (jours) | **`step.waitForEvent("human.approval_granted")`** | À construire (état externe + reprise) | `waitForToken` |
| Idempotence + reprise | **Natif** (clés d'idempotence, retries par step) | Manuel | Natif |
| Rejeu d'un run | **Replay** depuis le dashboard + depuis notre table `events` | Manuel | Partiel |
| Tenir sur Vercel 60 s | **Oui** (step = 1 invocation < 60 s) | Non (worker persistant requis) | Oui |
| Auto-hébergeable | Oui (dev server / self-host) | Oui | Oui (v3) |

BullMQ = le plus de contrôle mais on **réécrit** le bus durable, les waits longs et le rejeu → surface de bug énorme pour un système où « tout doit être rejouable et idempotent ». Trigger.dev = excellent second choix (si on veut du 100 % auto-hébergé sans compte externe). Inngest gagne parce que **la retenue T2 et l'approbation bloquante correspondent littéralement à `sleep` et `waitForEvent`**, et parce qu'il fait vivre le système même sur serverless.

Réserve honnête : Inngest est un service externe (offre gratuite généreuse, self-host possible). Si tu veux **zéro dépendance cloud tierce**, on bascule sur Trigger.dev auto-hébergé — l'architecture ne change pas, seul l'adaptateur de file change.

---

## 7. Moteur de politique d'autonomie (T0–T5)

- Chaque **action** (pas l'agent) porte un `tier`. Avant toute exécution, le runtime appelle `policy.evaluate(action, context)`.
- **T0** interne / **T1** externe réversible → exécution immédiate (T1 : revue a posteriori enregistrée).
- **T2** externe irréversible coût faible → émet `human.approval_requested` **informatif** + `step.sleep("2h")` ; si aucune intervention (pas d'annulation) → exécution auto. **Annulation possible** pendant la fenêtre. Doit fournir `compensation`.
- **T3/T4/T5** → `human.approval_requested` **bloquant** + `step.waitForEvent`. T4 (argent/prix) et T5 (voix de marque) toujours bloquants.
- **Coupure d'urgence** : globale **et** par mandat. Priorité absolue — annule les T2 en retenue, refuse tout nouveau run. Testé.
- **Aucune** action externe ne contourne le moteur (les outils T2+ ne s'exécutent que via `policy.execute`, pas d'appel direct au SDK d'intégration).

Affectation par défaut (implémentés à l'étape 4, sauf les 3 du test) : T0 Analyst/Underwriter/Orchestrator · T1 Social Ops/Conversion · T2 Réputation/Partnerships · T3 Lifecycle · T4 Media Buyer/Rate & Distribution · T5 Content Creator.

---

## 8. Test d'acceptation (spécification de l'intégration)

Écrit comme test d'intégration automatisé, exécuté sur une base éphémère, **doit passer** :

```
GIVEN un Mandate actif avec MandateWorkspace peuplé (thèse + objectifs) et 3 agents minimaux enregistrés
WHEN  on émet daily.tick
THEN  Analyst démarre, lit le workspace, émet measurement.recorded
AND   détecte réservations directes 18% sous le plan → measurement.deviation_detected
AND   Orchestrator (abonné) crée 2 Task (Paid Acquisition, Conversion) → task.assigned ×2 → 2 notifications
AND   Paid Acquisition démarre, propose un redéploiement de budget → action T4 → human.approval_requested
        → notification à Cecilia (motif, montant, échéance) ; le run est en awaiting_approval
WHEN  on émet human.approval_granted
THEN  Paid Acquisition exécute → agentrun.completed avec human_minutes_spent renseigné
AND   Orchestrator met à jour l'Objective + écrit au journal du workspace
WHEN  on émet weekly.tick
THEN  Orchestrator compose le rapport hebdo à partir des events de la semaine, sans sollicitation
```

Assertions clés : la chaîne s'exécute **sans intervention** hormis l'approbation ; tous les `AgentRun` ont `human_minutes_spent` non null ; toute la chaîne partage un `correlationId` ; aucune action T4 n'a été exécutée avant `human.approval_granted` ; l'arrêt d'urgence (test séparé) stoppe tout.

Les 3 agents (Analyst, Orchestrator, Paid Acquisition) sont **minimaux** : leur intelligence métier vient à l'étape 4. Ici, seule la **circulation** est prouvée.

---

## 9. Contradictions & zones d'ombre (à lever)

1. **Roster d'agents incohérent.** Partie A dit « 10 agents » ; le tableau d'autonomie (Partie B) en liste **11** (Analyst, Underwriter, Orchestrator, Social Ops, Conversion, Réputation, Partnerships, Lifecycle, Media Buyer, Rate & Distribution, Content Creator) ; le hub réel en a **7** (lia, athena, elara, kaelen, neo, apollo, orion), noms français, rôles partiellement différents. **Quel roster fait foi ?** Je pars sur les 11 de la Partie B, à confirmer.
2. **Clé Anthropic « dans le navigateur ».** Vrai pour le vieux SPA `hubkairos` (mort). **Faux** pour le hub Next.js, qui l'a déjà côté serveur. La contrainte « clés côté serveur + quotas par mandat » reste valable comme exigence — je la garde — mais il n'y a pas de fuite à corriger dans le code qu'on reprend.
3. **Prospection de la firme (Orion) : dans le système ou à part ?** `Property.state` commence à `prospect`, ce qui suggère que l'acquisition de mandats de la firme vit dans ce système. Mais aucun des 11 agents n'est un « prospecteur ». Et le pipeline lead-gen actuel (OpenMart, séquences email) est un sujet distinct de la *livraison* de mandat. **À trancher :** ANESIS ingère-t-elle ses propres prospects comme `Property(prospect)`, ou la prospection reste-t-elle un système séparé qui ne crée une `Property` qu'au moment de la souscription ?
4. **T2 vs arrêt d'urgence.** Si un arrêt d'urgence survient pendant la fenêtre de retenue de 2 h, l'action T2 doit être **annulée** (l'arrêt l'emporte). Je le pose comme règle — confirme.
5. **`AgentRun.mandateId` / `taskId` nullables ?** Les runs de monitoring (`hourly.tick`) précèdent toute tâche et peuvent être transversaux (plusieurs mandats). Je propose `taskId` nullable et `mandateId` nullable pour les runs transversaux, mais alors l'isolation par mandat ne s'applique pas à ces runs — **acceptable ?** Ou un run de monitoring est-il toujours mono-mandat ?

---

## 10. Questions que je ne peux pas trancher seul

1. **Hébergement (bloquant pour l'archi).** On accepte l'option (A) Inngest + Vercel (steps < 60 s), ou tu veux un worker persistant (Railway/Fly) et/ou zéro dépendance cloud tierce (→ Trigger.dev auto-hébergé) ? Ça change le coût et l'ops.
2. **Roster canonique** (cf. #1) : je confirme les 11 de la Partie B, noms/rôles définitifs ?
3. **`human_minutes_spent` — méthode de mesure.** Temps réellement chronométré (l'UI d'approbation mesure le temps de décision + d'édition) ou estimation par type d'action ? C'est une donnée produit : sa définition doit être stable dès le départ.
4. **Un seul opérateur humain (Cecilia) ou plusieurs ?** « combien de mandats un opérateur peut tenir » suggère un modèle multi-opérateurs → entité `Operator` + rôles pour l'adressage des notifications/approbations. Je modélise `Operator` dès maintenant ; combien de rôles distincts prévoir ?
5. **Base de données.** On réutilise le Supabase existant (et on migre `clients`→`Property`) ou base neuve (Neon, branches par PR) ? Réutiliser accélère ; repartir propre évite d'hériter des enums français.
6. **Réversibilité T2.** Exiges-tu que chaque outil T2 implémente une fonction `compensate()` (annulation programmatique), ou une procédure d'annulation **documentée** (manuelle) suffit-elle au départ ?
7. **Prospection** (cf. #3) — réponse nécessaire avant de figer le cycle de vie `Property`.

---

*Fin de la proposition. J'attends ta validation du modèle de domaine (§3) — et surtout tes réponses au §10 — avant d'écrire la moindre ligne d'implémentation.*
