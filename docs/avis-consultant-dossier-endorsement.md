# Avis consultant IA — Dossier d'endorsement Innovator Founder (ANESIS-BPL-2026-001-V2)

> **Version 2** (29 juillet 2026). Met à jour la v1 ci-dessous suite à deux changements : le dépôt est
> reporté au **30 novembre 2026**, et la contrainte structurante est actée noir sur blanc — la fondatrice
> reste basée au Canada jusqu'à l'obtention du visa : aucune facturation, aucun mandat payant, aucun
> déplacement UK avant cette date. Cette version croise à nouveau le texte du dossier avec l'état réel du
> dépôt de code (`etape-4-proposition-agents-restants.md`, roster figé à **12** agents) et le runbook de
> campagne (`campagne-3-aout-runbook.md`). Les corrections factuelles trouvées lors de ce croisement sont
> en §1 — à traiter avant tout autre point.
>
> **Mise à jour du 29 juillet 2026 (soir), vérifiée directement dans le dépôt.** Les 12 agents ont
> maintenant tous du code et des tests en CI verte (`packages/agent-runtime/src/agents/*.ts`, 16 fichiers
> de test) — l'écart « 8 agents sur 12 non construits » de la première passe de cette v2 est **caduc**,
> corrigé en §1bis et dans le plan §4. Le vrai reste à faire n'est plus le nombre d'agents mais
> l'**interface** : délégation d'approbation par opérateur, cockpit fondatrice, dashboard client, intake
> réel des formulaires — voir §1bis pour le détail exact et `docs/prompt-claude-code-execution-plan.md`
> pour l'ordre d'exécution donné à Claude Code.
>
> **Mise à jour du 29 juillet 2026 (nuit) — priorité n°1 livrée.** Délégation d'approbation + lecture
> transversale fondatrice codées, testées, poussées (`16ff1af`, `c08bdd0`) : `canApproveTier` accepte une
> délégation par la table `operator_agent_assignments` (un operator approuve T3/T4/T5 pour les agents
> qu'il supervise, y compris `art-director` T5 si assigné Directrice Artistique) ; migration `0010_
> delegation.sql` (`current_is_founder()` + policies `*_founder_read` + `withFounder()`, lecture seule,
> vérifié par test). CI : core 78 tests, db 22 tests, typecheck OK. **La fondatrice a arbitré : on avance
> sans attendre que les 4 prérequis externes (§1bis) soient réglés de son côté — elle les gère en
> parallèle.** Conséquence : Claude Code ne doit plus s'arrêter sur les questions ouvertes non bloquantes
> (taille du lot Cycle 1) — la valeur par défaut déjà documentée en §1.2/Cycle 1 (20 en lot de test) est
> confirmée, pas besoin de revalider. La consigne devient : construire tout ce qui peut l'être **en amont**
> des 4 prérequis (schéma d'auth, composants dashboard/cockpit branchés sur `withFounder`, câblage Resend
> de `/api/enquiry` derrière une variable d'environnement absente en dev), pour un branchement immédiat dès
> que la base/l'email arrivent — voir `docs/prompt-claude-code-execution-plan.md` §3bis, point 3, mis à
> jour en conséquence.

---

## 0. Score institutionnel (document de travail interne — jamais à reproduire tel quel dans le dossier)

Un endorsing body UK juge un dossier Innovator Founder sur trois critères : Innovative, Viable, Scalable.
Ce tableau est une estimation de travail pour prioriser l'effort des 18 semaines à venir — **il ne doit
jamais apparaître dans le dossier soumis** (voir v1 §1, « Auto-notation » : un dossier qui se note lui-même
se lit comme un signal d'inexpérience, pas de force. Le principe reste vrai même pour une note interne à
95 — l'évaluation appartient à l'organisme, jamais au demandeur).

| Critère | Actuel | Cible | Écart principal |
|---|---|---|---|
| Innovative | 24/34 | 32/34 | Rien n'est montré visuellement ; aucun artefact, aucune reconnaissance marché |
| Viable | 19/33 | 32/33 | Zéro établissement qualifié, zéro donnée testée sur le marché UK à ce jour |
| Scalable | 18/33 | 31/33 | Agents (fait) et délégation d'approbation (fait) ; reste : aucune interface client/cockpit branchée à des données réelles ; aucune LOI convertie |
| **Total** | **61/100** | **95/100** | |

Le calendrier repoussé au 30 novembre donne ~18 semaines pour passer de projectif à documenté, **sans que
la fondatrice ait à facturer un client ni à quitter le Canada**. L'absence de revenu facturé n'est pas une
faiblesse à corriger — le dossier ne doit jamais suggérer que l'entreprise a déjà généré du chiffre
d'affaires (cohérent avec v1 §1, point sur la facture WillowCreek). La viabilité se prouve par la densité
de la phase de validation gratuite, pas par un CA qui serait d'ailleurs incohérent avec la situation réelle
de la fondatrice avant installation.

---

## 1. Corrections factuelles apportées lors du merge (à valider avant d'aller plus loin)

Le texte source de cette v2 contenait trois chiffres qui ne correspondent pas à l'état réel du projet.
Corrigés ci-dessous et dans le plan §4 — si l'un de ces chiffres était intentionnel (ex. réduction
volontaire du roster), dis-le et je rétablis la version d'origine.

1. **Nombre d'agents — ⚠️ superseded par §1bis.** Le texte source disait « 8 agents sur 10 non construits »
   et « 3 agents minimaux déjà en cours ». Une première correction (29 juillet, après-midi) l'avait ramené
   à « 4 construits sur 12, 8 restants ». **Cette correction intermédiaire est elle-même caduque depuis le
   29 juillet au soir** : les 12 agents ont désormais tous du code et des tests en CI verte — voir le
   détail exact en §1bis ci-dessous, qui fait foi.

2. **Taille de la vague 1 de campagne.** Le texte source visait 20 établissements pour le Cycle 1 (28
   juillet–10 août). Le runbook déjà écrit (`campagne-3-aout-runbook.md`) prévoit **~150 établissements
   UK (Porte 1)** pour ce premier lot, lancement prévu **lundi 3 août 2026**. Deux lectures possibles : (a)
   20 est un sous-lot volontairement restreint pour tester le message avant le lot complet de 150 — dans ce
   cas le dire explicitement dans le plan ; (b) le Cycle 1 doit viser directement les 150 du runbook. À
   trancher avec toi ; le plan ci-dessous garde 20 comme lot de test explicite pour ne pas trancher à ta
   place.

3. **Prérequis bloquants non mentionnés dans le calendrier source.** Le runbook liste des éléments encore
   ⛔ non fournis à ce jour : base Postgres à provisionner, `APIFY_TOKEN`, `APIFY_REVIEWS_ACTOR`, fichier
   prospects. Le Cycle 1 (livrable daté au 10 août : 20 scores + 20 emails) **dépend de ces prérequis** —
   le plan §4 les ajoute en tête de cycle 1, sans quoi le premier livrable daté du dossier est irréaliste
   dès la première quinzaine, ce qui est précisément le type d'écart calendrier/réalité que v1 §1 signalait
   déjà sur la roadmap Mois 1-3.

4bis. **État technique réel vérifié le 29 juillet 2026 (soir), remplace le point 1 ci-dessus.** Les 12
   agents (`analyst`, `underwriter`, `orchestrator`, `social-ops`, `conversion`, `reputation`,
   `partnerships`, `lifecycle`, `media-buyer`, `rate-distribution`, `content-creator`, `art-director`) ont
   tous du code dans `packages/agent-runtime/src/agents/`, plus les utilitaires `planner` et `retention`
   (fenêtre T2). CI verte : job `unit` (typecheck + tests, ~140+ tests) et job `db-real-postgres` (vrai
   Postgres 16 + pgbouncer). 9 migrations Drizzle, toutes cloisonnées par mandat (RLS). La règle
   d'intéressement indexée sur la durée (6 mois=15 %, 12 mois=10 %, formule Croissance/Domination
   indépendante du taux) est verrouillée dans `packages/core/src/mandate-terms.ts` avec 8 tests. Le site
   public (`apps/web`, Next.js 15) a 8 pages (Accueil, About, Method, Results, Journal + articles,
   Diagnostic, Contact) et une route `/api/enquiry` qui est un stub — l'intake réel n'est pas branché.
   **Ce qui manque réellement pour la note Scalable n'est donc plus la construction des agents mais
   l'interface** : table `operator_agent_assignments` + assouplissement de `canApproveTier`/`authorize`
   pour la délégation d'approbation (faisable tout de suite, sans dépendance externe) ; auth par lien
   magique, dashboard client, cockpit fondatrice, génération de contrat (Porte 2 → Thèse → mandat via
   `makeCommercialTerms`) et intake réel des formulaires (bloqués tant que la base Postgres et un
   email/domaine réels ne sont pas fournis — voir liste founder ci-dessous) ; et le restyle du site en
   direction artistique KAIROS (Fraunces, photos, bandeaux), **explicitement mis en pause par la
   fondatrice** — ne pas y toucher sans qu'elle le redemande.

   **Liste bloquante fournie par la fondatrice, à traiter par elle (pas par Claude Code) :** base Postgres
   provisionnée ; email + domaine réels (placeholder actuel `enquiries@anesisacquisition.com`) ; token
   Apify (scraping avis + réseaux sociaux réel) ; logo en PNG/SVG transparent (un JPG est utilisé
   aujourd'hui). Tant que ces quatre éléments manquent, la campagne du Cycle 1 et tout le dashboard/cockpit
   du Cycle 3 restent bloqués — c'est le vrai chemin critique du plan, pas le nombre d'agents.

   **Mise à jour Cycle 1 (fin juillet 2026, commit `16ff1af`).** Le seul item d'interface sans
   dépendance externe est désormais **livré et testé en CI** : (a) délégation d'approbation —
   `canApproveTier` accepte une `ApprovalDelegation` (le founder approuve tout ; un `operator`
   n'approuve un tier bloquant T3/T4/T5 que pour les agents qu'il supervise via la table
   `operator_agent_assignments`, T5 art-director inclus s'il est assigné Directrice Artistique) ;
   (b) lecture transversale fondatrice — migration `0010_delegation.sql` : `current_is_founder()` +
   policies `*_founder_read` (SELECT only, permissives, en OR avec l'isolation de 0001) + helper
   `withFounder()`. Propriété de sécurité vérifiée par test : le founder **lit** tous les mandats mais
   n'**écrit** jamais hors de son mandat courant. `authorize()` est inchangé (il décide le régime et
   valide l'Approval ; la règle « qui peut approuver » s'applique au moment du grant, côté cockpit).
   Il ne reste donc, côté interface, que les items **bloqués par les prérequis founder** (auth, dashboard,
   cockpit, intake) — voir liste ci-dessous.

   **Mise à jour Cycle 1 (fin juillet 2026) — tout le codable EN AMONT des 4 prérequis est livré.**
   La fondatrice ayant arbitré d'avancer sans attendre ses 4 prérequis (elle les gère en parallèle),
   les briques d'interface qui ne dépendent pas d'eux sont construites, testées, poussées :
   (a) **Auth par lien magique** — `@anesis/auth` (`dc52601`) : jeton pur SHA-256/TTL, envoi Resend
   derrière `RESEND_API_KEY` (absent en dev → no-op qui logge, jamais bloquant), service
   request/consume/session (anti-énumération, anti-rejeu), tables `magic_link_tokens`/`sessions`
   (0011). Ouverte à tout opérateur (founder ou operator). 13 tests.
   (b) **Circuit de génération de contrat** — `signMandate` accepte formule + durée et persiste les
   termes via `makeCommercialTerms` (`18b7a31`, colonnes 0012) : Porte 2 → Thèse → termes → mandat,
   testé de bout en bout sous PGlite. Le taux suit la durée (12 mo=10 %, 6 mo=15 %), termes
   conditionnels avant le visa. +4 tests.
   (c) **Intake** — `/api/enquiry` notifie via Resend avec **fallback stub explicite** si la clé est
   absente (`9185824`) ; l'enquête n'est jamais perdue. Reste à brancher : persistance d'une ligne
   d'intake quand la base sera fournie.
   (d) **Read-model + interface** — `@anesis/readmodel` (`eab54eb`) : `cockpitOverview` (transversal,
   `withFounder`) + `clientDashboard` (isolé, `withMandate`) + seed de démonstration réaliste
   (établissements FICTIFS UK) ; 8 tests. Pages `/cockpit` et `/dashboard/[mandateId]` (`6a8901a`)
   rendent ces vues sur données de démo, build OK — **bascule sur données réelles = un simple passage
   du seed aux requêtes `withFounder`/`withMandate` dès que `DATABASE_URL` est fourni**.
   Il ne reste donc, pour rendre le cockpit/dashboard « réels » et lancer la campagne, que les **4
   prérequis founder + le fichier prospects** ; aucun autre blocage technique côté interface.

   **Mise à jour Cycle 1 (suite) — l'application est fonctionnellement COMPLÈTE, la connexion viendra
   après (décision fondatrice « finir la création d'abord »).** Sont désormais créés et poussés :
   (e) **Décision d'approbation** — `decideApproval` (`65fba8b`) applique grant/deny avec la délégation
   (founder=tout ; operator=agents supervisés ; T5 art-director si assigné), enregistre `decided_by`.
   +6 tests. (f) **Persistance de l'intake** — table `enquiries` (0013) + `insertEnquiry`/`listEnquiries`,
   +3 tests. (g) **Câblage web complet** (`46d6607`) : flux d'auth par lien magique (`/login`,
   `/auth/request|verify|logout`, cookie httpOnly de session), **gardes** des espaces fondatrice/client,
   **actions serveur** du cockpit (approuver/refuser via `decideApproval`, générer un contrat via
   `signMandate`), lecture live du cockpit/dashboard via `@anesis/readmodel`, et `/api/enquiry` qui
   **persiste** en plus de notifier. Tout **bascule automatiquement** du mode démo au réel dès que
   `DATABASE_URL` (et Resend) sont fournis — `withDbClient` renvoie `null` sinon. `next build` vert
   (routes `/cockpit`, `/dashboard/[id]`, `/login`, `/auth/*`, `/api/enquiry`).
   **Conséquence pour le dossier** : la note *Scalable* ne bute plus sur « aucune interface » — l'interface
   existe et fonctionne sur données de démonstration ; il ne lui manque que le branchement aux données
   réelles (prérequis founder), pas de code à écrire.

4ter. **Coexistence avec la roadmap « 3 premiers mois » du document business** (`anesis-business-complet.md`,
   Partie 12) : cette roadmap cible « Mois 2 : 60+ diagnostics, 7 qualifiés, 2 LOI » — des volumes très
   inférieurs au nouveau cumul de 30 LOI au 16 novembre. Si le plan en 9 cycles ci-dessous devient la
   référence opérationnelle, la Partie 12 du document business doit être mise à jour ou explicitement
   marquée comme supplantée, sinon un examinateur qui croise les deux documents trouve deux calendriers
   contradictoires — c'est exactement le risque déjà signalé en v1 §1 pour le triplet roadmap/traction/état
   du code.

---

## 2. Priorité haute — risques réels de rejet (reportés de la v1, toujours ouverts)

**Auto-notation du dossier.** Toujours à retirer du corps soumis (voir §0 ci-dessus — le risque existe
aussi pour un score interne 61→95 si jamais il fuite dans une version exportée du dossier).

**Incohérence de traction.** Toujours d'actualité : tant que la Partie 12 du document business n'est pas
alignée sur le plan en 9 cycles (§1.4), le risque qu'un chiffre de traction soit présenté comme acquis dans
une section et comme cible dans une autre reste réel.

**Projections financières sans méthodologie (§9 du dossier).** Non traité par cette v2 — reste ouvert.
Ajouter la page d'hypothèses (rythme de signature, mix d'offres, attrition) reste recommandé avant dépôt.

**Modèle de facture (§16 du dossier, WillowCreek).** Toujours à marquer explicitement « modèle fictif,
aucune transaction réelle ». Directement lié à la contrainte de résidence de cette v2 : aucune facture
réelle ne doit exister avant l'installation UK, donc ce marquage devient encore plus important, pas moins.

**Écart roadmap/code réel.** Actualisé en §1.1 et §1.3 ci-dessus avec les chiffres vérifiés au 29 juillet
2026.

---

## 3. Priorité moyenne — renforcer le dossier (reportés de la v1, toujours ouverts)

- Paysage concurrentiel absent du corps du dossier — intégrer l'analyse comparative déjà réalisée.
- Bio fondatrice absente du corps du document — inclure le paragraphe CV/résultats chiffrés (22x ROAS
  glamping, +372 % Instagram spa, +156 % réservations SAFIR) directement dans le dossier, pas en annexe.
- Pas de vue de trésorerie mensuelle (mois 1 à 6) — toujours absent.
- Coûts humains (§9) non réconciliés avec les seuils d'embauche (§6) — toujours à relier explicitement.

---

## 4. Plan en 9 cycles jusqu'au dépôt (30 novembre 2026)

Chaque cycle ne contient que des actions réalisables à distance depuis le Canada, sans facturation ni
déplacement — cohérent avec la contrainte de résidence. Remplace le calendrier de la section 24 du
document original. **Chiffres d'agents et de campagne corrigés par rapport au texte source (voir §1).**

### Cycle 1 — 28 juillet au 10 août 2026
**Préalable bloquant (à lever avant tout le reste du cycle, voir §1bis) — fourni par la fondatrice, pas par
Claude Code :** base Postgres provisionnée, `APIFY_TOKEN` + `APIFY_REVIEWS_ACTOR` choisis, email/domaine
réels (Resend), logo transparent, fichier prospects (~150 lignes selon le runbook).
**Objectif : campagne lancée, délégation d'approbation codée**
- Les 12 agents ont déjà tout leur code et leurs tests (voir §1bis) — **rien à construire côté agents pour
  ce cycle**, le chemin critique est uniquement les prérequis externes ci-dessus.
- ✅ **Fait** — délégation d'approbation (`operator_agent_assignments` + `canApproveTier`/`authorize`) et
  policy RLS `founder-read-all`/`withFounder()`, codées, testées, poussées (`16ff1af`, `c08bdd0`).
- ✅ **Fait** — tout le codable en amont des 4 prérequis, livré et testé : auth lien magique `@anesis/auth`
  (`dc52601`), circuit contrat Porte 2 → Thèse → `makeCommercialTerms` → `signMandate` (`18b7a31`),
  `/api/enquiry` → Resend avec fallback stub (`9185824`), `@anesis/readmodel` cockpit/dashboard + seed démo
  (`eab54eb`), pages `/cockpit` + `/dashboard/[mandateId]` (`6a8901a`). Typecheck OK, ~150+ tests verts en
  séquentiel (OOM local en parallèle seulement, non reproductible en CI). Horodaté `e6de62c`.
  **Plus aucun blocage technique d'interface — le cockpit/dashboard passent de démo à réel par un simple
  branchement `DATABASE_URL` dès qu'il arrive.**
- Une fois les prérequis levés : lancer le lot de test de **20 établissements confirmé** (sous-ensemble du
  lot complet de ~150 du runbook — décision arbitrée : test à 20 d'abord, le lot complet suit au Cycle 2
  selon les résultats, voir §1.2)
- Produire les 20 premiers scores Leak Index sur données publiques
- Envoyer les 20 premiers emails personnalisés (score + perte estimée en objet)
- **Livrable vérifiable au 10 août : délégation d'approbation codée et testée (✅ fait) ; 20 scores
  calculés, 20 emails envoyés, taux d'ouverture mesuré (conditionnés aux prérequis externes, gérés par la
  fondatrice en parallèle)**

### Cycle 2 — 11 au 24 août 2026
**Objectif : premières signatures de LOI à distance, ajustement du message**
- Relance vocale (Sofia) des établissements ayant manifesté un intérêt
- Ajustement du message selon les taux d'ouverture/réponse du lot de test
- Lancement de la vague suivante (jusqu'au lot complet de ~150 du runbook si pas déjà fait au cycle 1)
- Cible : 5 LOI signées électroniquement, sans aucun déplacement
- **Livrable vérifiable au 24 août : 5 LOI signées et datées**

### Cycle 3 — 25 août au 7 septembre 2026
**Objectif : premières Thèses livrées, dashboard**
- Production des premières Thèses d'Acquisition (gratuites, phase de validation), par lots de 10, à distance
- Construction du prototype de dashboard avec les données réelles du premier établissement ayant reçu sa Thèse
- Cible : 3 Thèses livrées, dashboard v1 avec vraies données
- **Livrable vérifiable au 7 septembre : 3 Thèses complètes, dashboard v1**

### Cycle 4 — 8 au 21 septembre 2026
**Objectif : constitution de l'entité, montée en cadence**
- 15 septembre : constitution d'Anesis Acquisition Ltd, enregistrement ICO, dépôt de marque (à distance) —
  voir v1 §3 sur la classe 36 à poser à l'agent de marques en plus des classes 35/42
- Vague 3 de la campagne, avec les Thèses réelles citées comme preuve
- Cible cumulée : 12 LOI signées, 6 Thèses livrées
- **Livrable vérifiable au 21 septembre : entité constituée, 12 LOI, 6 Thèses**

### Cycle 5 — 22 septembre au 5 octobre 2026
**Objectif : engagements de conversion conditionnels**
- Entretiens de restitution par visioconférence (Google Meet) — présentation du plan de récupération
- Cible : 4 lettres d'engagement conditionnel — l'établissement confirme par écrit son intention de signer
  un mandat payant dès l'installation officielle d'Anesis au UK, sans paiement ni déplacement avant cette
  date
- Collecte des pièces justificatives des résultats antérieurs de la fondatrice
- **Livrable vérifiable au 5 octobre : 4 engagements conditionnels signés, dossier de preuves antérieures complet**

### Cycle 6 — 6 au 19 octobre 2026
**Objectif : approfondissement de la preuve**
- Poursuite de la conversion LOI → Thèses → engagements conditionnels, entièrement à distance
- Cible cumulée : 20 LOI signées, 10 Thèses livrées, 6 engagements conditionnels
- Premier contact advisory board (2 profils sectoriels UK, par visioconférence)
- **Livrable vérifiable au 19 octobre : 20 LOI, 10 Thèses, 6 engagements conditionnels, 1er contact advisory board engagé**

### Cycle 7 — 20 octobre au 2 novembre 2026
**Objectif : le dossier prend forme documentaire**
- Rédaction de la version finale du dossier intégrant tous les livrables (LOI, Thèses, engagements
  conditionnels, dashboard, preuves antérieures)
- Réduction de la présentation des 12 agents à trois blocs dans le corps du dossier (voir §5) — **le
  roster de 12 lui-même ne change pas**, seule sa présentation est simplifiée
- Réduction des sept innovations propriétaires à trois dans le corps du dossier (voir §5)
- Finalisation de l'advisory board (2 personnes confirmées, relation à distance)
- **Livrable vérifiable au 2 novembre : première version complète du dossier**

### Cycle 8 — 3 au 16 novembre 2026
**Objectif : preuve d'autorité externe**
- Première publication de données agrégées anonymisées à la presse professionnelle UK, à distance
- Cible cumulée : 30 LOI signées, 15 Thèses livrées, 8 à 10 engagements conditionnels
- Pitch vidéo de 2 minutes tourné depuis le Canada, présentant la Thèse d'un établissement réel
- **Livrable vérifiable au 16 novembre : 30 LOI, 15 Thèses, 8-10 engagements conditionnels, 1 publication presse, 1 pitch vidéo**

### Cycle 9 — 17 au 30 novembre 2026
**Objectif : dépôt**
- Revue finale par un conseiller en immigration britannique qualifié
- Vérification qu'aucune affirmation de traction n'est non datée/non sourcée, et qu'aucune activité
  facturée ni déplacement n'est suggéré avant l'obtention du visa
- Dépôt du dossier auprès de l'organisme d'agrément (voir v1 §4 : confirmer lequel des trois organismes
  habilités est visé et adapter le format en conséquence)
- **Livrable vérifiable au 30 novembre : dossier déposé**

---

## 5. Simplifications à appliquer dans le corps du dossier

- **La grille des 12 agents** : présenter en trois blocs — *Diagnostic → Exécution → Gouvernance* — détail
  technique complet en annexe. (Le roster technique reste 12, voir §1.1 — seule la présentation change.)
- **Les sept innovations propriétaires** : réduire à trois dans le corps du dossier — ligne de base
  corrigée du marché, registre de récupération en partie double, clause de sortie indexée sur le score.
- **Le calendrier d'exécution** : remplacer par le plan en 9 cycles ci-dessus.

---

## 6. À supprimer ou reformuler

- **« Nous sommes payés en partie sur ce que nous récupérons »** (résumé exécutif) — reformuler au
  conditionnel projeté : *« Le modèle prévoit une rémunération indexée sur la récupération mesurée,
  applicable dès l'installation officielle. »*
- **Toute mention de rencontre physique ou de visite avant le dépôt** — la visite unique avec vidéaste
  post-installation (déjà prévue dans le document original) est à maintenir telle quelle ; aucune visite
  ne doit être suggérée avant l'obtention du visa.
- **Le tableau comparatif concurrentiel** — sourcer chaque « Non » attribué aux concurrents, ou l'assouplir
  en « non publiquement documenté à notre connaissance ».
- **La garantie souscrite « Année 2 »** — vérifier qu'elle n'apparaît nulle part comme argument actuel.

---

## 7. Checklist finale

**Urgent (bloquant pour le dépôt du 30 novembre)**
- [ ] Base Postgres provisionnée (fondatrice)
- [ ] Email + domaine réels + Resend configuré (fondatrice)
- [ ] `APIFY_TOKEN` + `APIFY_REVIEWS_ACTOR` choisis (fondatrice)
- [ ] Logo transparent PNG/SVG fourni (fondatrice)
- [ ] Fichier prospects (~150 lignes) préparé
- [x] Délégation d'approbation codée (`operator_agent_assignments`, RLS `founder-read-all`) — Claude Code, sans dépendance externe *(fait, Cycle 1, commit `16ff1af`)*
- [ ] 30 LOI signées et datées
- [ ] 15 Thèses d'Acquisition livrées gratuitement
- [ ] 8 à 10 engagements conditionnels de conversion post-installation
- [ ] Dashboard avec données réelles d'au moins un établissement
- [ ] Pièces justificatives des résultats antérieurs de la fondatrice
- [ ] Vérification qu'aucune activité facturée ni déplacement UK n'est suggéré dans le dossier avant l'obtention du visa
- [ ] Partie 12 du document business (`anesis-business-complet.md`) alignée sur le plan en 9 cycles ou explicitement marquée comme supplantée (voir §1.4)

**Important (améliore fortement la note)**
- [ ] Advisory board de 2 personnes confirmé (à distance)
- [ ] Présentation des 12 agents réduite à trois blocs dans le corps du dossier (roster technique inchangé)
- [ ] Réduction des sept innovations à trois dans le corps du dossier
- [ ] Sourcing du tableau comparatif concurrentiel
- [ ] Bio fondatrice intégrée au corps du dossier (v1 §2)
- [ ] Vue de trésorerie mensuelle mois 1-6 (v1 §2)
- [x] État technique horodaté et documenté à chaque cycle *(Cycle 1 : §4bis mis à jour, auth/contrat/intake/read-model + cockpit/dashboard livrés)*

**Bonus (au-delà de 95)**
- [ ] Publication de données agrégées à la presse professionnelle avant dépôt (cycle 8)
- [ ] Pitch vidéo de 2 minutes tourné depuis le Canada
- [ ] Lettre de principe avec un éditeur de PMS ou partenaire technique
- [ ] Estimation chiffrée de l'impact économique régional (Cotswolds/Sud-Ouest) si les engagements conditionnels se convertissent

---

## 8. Point structurel à ne pas manquer (reporté de la v1)

Seuls **trois organismes** sont habilités à endosser (UK Endorsing Services, Innovator International,
Envestors). Chacun a son propre portail et format attendu. Avant de finaliser : choisir lequel des trois
est visé et vérifier son modèle spécifique.

---

## Sources

**Croisement code/documents (v2, 29 juillet 2026)**
- `docs/etape-4-proposition-agents-restants.md` — roster figé à 12 agents (les 12 sont désormais construits, ce document décrit l'architecture d'origine, pas le statut actuel)
- `docs/campagne-3-aout-runbook.md` — échelle réelle de la campagne (~150 établissements), prérequis bloquants
- `docs/anesis-business-complet.md`, Partie 12 — roadmap Mois 1-3 à réconcilier avec le plan en 9 cycles

**Critères et pratique des organismes (2026, v1)**
- [Innovator Founder Visa Endorsement Guide 2026 — DavidsonMorris](https://www.davidsonmorris.com/innovator-founder-visa-endorsement/)
- [Innovator Founder Visa UK Guide 2026 — DavidsonMorris](https://www.davidsonmorris.com/innovator-founder-visa/)
- [Innovator Founder Visa 2026: Key Changes — Sterling Law](https://sterling-law.co.uk/innovator-founder-visa-2026-key-changes-for-founders/)
- [Innovator Founder Visa in 2026 — Endorsing Bodies & Evidence Plan — Garth Coates](https://garthcoates.com/innovator-founder-visa-in-2026/)
- [Innovator Founder Visa Success Rate and Common Reasons for Refusal — Aceplans](https://aceplans.com/innovator-founder-visa-success-rate-and-common-reasons-for-refusal/)
- [Understanding and Overcoming Innovator Founder Visa Rejection — Technomads](https://www.technomads.io/blog/navigating-the-challenges-understanding-and-overcoming-innovator-founder-visa-rejection)

---

*Évaluation rédigée dans une posture d'évaluateur institutionnel UK — à valider par un conseiller en
immigration britannique qualifié avant dépôt. Cette analyse ne constitue pas un avis juridique.*
