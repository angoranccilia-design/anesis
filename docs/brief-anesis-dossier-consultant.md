# ANESIS ACQUISITION — Dossier de présentation

> Document de synthèse à l'attention du conseiller technique, en vue de l'analyse détaillée du dossier et de l'endorsement du prototype.
> Rédigé à partir de l'état réel du code et des décisions actées à ce jour. Aucun chiffre de marché ou de tarification n'est inventé ici — voir §8 pour ce qui reste à rattacher.

---

## 1. Résumé exécutif

**Anesis Acquisition** est une firme d'acquisition hôtelière (« Hospitality Acquisition Firm », pas une agence marketing) qui repère des établissements indépendants perdant de l'argent à cause de faiblesses commerciales et techniques réparables — site lent, faible visibilité/réputation, dépendance excessive aux plateformes de réservation à commission (OTA), absence de reciblage publicitaire.

Le modèle en trois temps :

1. **Chiffrer** — un moteur d'évaluation calcule, à partir de signaux publics, une perte annuelle en livres sterling, précise et défendable (jamais une estimation commerciale).
2. **Contracter** — un mandat est signé avec l'établissement pour récupérer une part chiffrée de cette perte.
3. **Exécuter** — une équipe de 12 agents spécialisés (assistés par IA) mène les actions de récupération, sous un régime de gouvernance strict : rien d'important ne s'exécute sans l'accord explicite de la fondatrice.

Le produit central n'est donc pas « une agence qui fait du marketing hôtelier » mais **un système qui transforme un chiffre de perte vérifiable en plan d'exécution traçable, avec un humain qui garde la main sur tout ce qui compte** (argent, image de marque, irréversibilité).

---

## 2. Le modèle économique

**Profil de cible (ICP)** — établissement indépendant, Royaume-Uni :
- 12 à 80 chambres/clés
- Tarif moyen par nuit (ADR) supérieur à £140
- Part de réservations via OTA supérieure à 35 % (signe de dépendance à des plateformes qui prennent une commission)
- Pas d'équipe marketing interne

**Cycle de vie d'un établissement** dans le système : `prospect → assessed (évalué) → qualified (qualifié) → underwriting (souscription) → mandate (mandat actif) → completed (terminé)`, avec des sorties possibles vers `declined` (décliné) ou `dormant` (dormant, réactivable).

**Positionnement de marque** : identité visuelle et verbale délibérément « vieil argent » britannique — vert profond, monogramme héraldique, script — pour signaler une firme sérieuse et sélective plutôt qu'une agence de plus. Cette cohérence de ton (voix de marque) est elle-même protégée dans le système : toute action qui la touche est soumise au niveau de contrôle le plus strict (voir §4).

---

## 3. Le mécanisme produit

### 3a. Diagnostic — le moteur d'évaluation

Pour chaque prospect, le système récupère des signaux publics (vitesse du site via Google PageSpeed, volume et note des avis, structure du site, présence d'un pixel de reciblage publicitaire, scraping ciblé) et calcule :

- un **leak index** (indice de fuite) sur 100
- une **perte mensuelle estimée** en £, dérivée du nombre de chambres, du tarif moyen et du taux d'occupation supposé
- une **décision** : qualifié / décliné / à revoir manuellement, selon des seuils explicites (taille minimale, ADR minimum, dépendance OTA minimum, présence ou non d'un marketing interne, perte minimale récupérable)

Point de conception important : **ce calcul est une fonction pure, déterministe, sans IA générative.** Mêmes données en entrée → toujours le même chiffre. Aucun modèle de langage ne décide ou n'ajuste un montant — c'est vérifié par un test qui interdit structurellement d'importer un client IA dans ce module. Le chiffre présenté à un établissement est donc reproductible et défendable, pas une estimation habillée.

### 3b. Contractualisation — le mandat

Une fois qualifié et le mandat signé, la perte totale est répartie entre quatre piliers (vitesse du site, avis/réputation, dépendance OTA, reciblage publicitaire) au prorata de leur contribution au leak index. Un **objectif** est créé par pilier, avec un montant cible à récupérer (une fraction prudente de la perte identifiée, de l'ordre de 40 à 60 % selon le pilier — l'engagement de la firme est volontairement conservateur).

**Règle non négociable du modèle de domaine** : un objectif ne peut exister sans mandat signé, et aucune tâche ne peut exister sans objectif. Il est donc structurellement impossible de générer un plan d'action — et encore moins de le facturer — pour un établissement qui n'a pas contractualisé.

### 3c. Exécution — le routage vers les agents

Chaque objectif engendre une tâche assignée à l'agent responsable du pilier concerné (ex. : problème de réputation → agent Reputation ; dépendance OTA → agent Rate & Distribution). Ce routage est lui aussi une règle fixe, pas un jugement au cas par cas.

---

## 4. Le système de gouvernance et de confiance

C'est l'élément le plus différenciant du dossier techniquement, et probablement le point le plus important pour l'analyse du conseiller : **chaque action d'un agent porte un niveau d'autonomie (T0 à T5)**, qui détermine son régime d'exécution.

| Palier | Portée | Régime | Exemple |
|---|---|---|---|
| **T0** | Interne au système | Exécution immédiate | Calculer un score, lire le workspace |
| **T1** | Externe, réversible | Exécution immédiate, revue a posteriori | Publier un post social planifié |
| **T2** | Externe, irréversible, coût faible | Fenêtre de retenue de 2h + notification ; exécution automatique si personne n'intervient ; annulable pendant la fenêtre | Répondre à un avis client |
| **T3** | Externe, engageant | Approbation humaine bloquante avant exécution | Lancer une séquence de fidélisation |
| **T4** | Argent / tarification | Approbation humaine bloquante, toujours | Déplacer un budget publicitaire, ajuster un tarif |
| **T5** | Voix de marque / image | Approbation humaine bloquante, toujours | Tout ce que produit la Directrice Artistique |

Garanties tenues au niveau du code (vérifiées par des tests automatisés, pas seulement documentées) :

- **Point de passage unique** : aucune action externe ne peut s'exécuter en contournant ce moteur de politique — un seul endroit du système a le droit d'exécuter un effet réel et de l'enregistrer.
- **Journal d'audit immuable** : chaque événement est écrit une fois, jamais modifié ni supprimé ; chaque appel d'outil enregistre qui, quoi, quand, avec quelle entrée, quel résultat, et qui a approuvé.
- **Réversibilité documentée** : toute action à partir de T2 doit préciser comment elle peut être annulée ou compensée.
- **Isolation par mandat** : les données d'un établissement ne sont jamais accessibles depuis le contexte d'un autre mandat (contrôle au niveau de la base de données, testé y compris sur une vraie instance Postgres).
- **Arrêt d'urgence** : global (fondatrice uniquement) ou par mandat (toute opératrice), avec priorité absolue — annule même les actions T2 en attente.
- **Temps humain mesuré** : chaque exécution d'agent enregistre le temps humain effectivement consacré. Ce n'est pas une donnée annexe : c'est ce qui permet de prouver, chiffre à l'appui, le gain de temps réellement obtenu — pas une promesse marketing.

Seule la fondatrice (Cecilia) peut approuver une action T3 à T5 ou déclencher un arrêt d'urgence global — modélisé explicitement pour permettre l'ajout d'autres opératrices plus tard sans migration.

---

## 5. L'équipe d'agents (roster canonique — 12)

| Agent | Palier par défaut | Rôle |
|---|---|---|
| Analyst | T0 | Surveille les indicateurs, détecte les écarts par rapport au plan |
| Underwriter | T0 | Évalue les prospects, calcule le leak index et la perte |
| Orchestrator | T0 | Distribue le travail entre agents, compose les rapports |
| Social Ops | T1 | Publication et gestion courante des réseaux sociaux |
| Conversion | T1 | Améliore le parcours de réservation directe |
| Reputation | T2 | Gère les avis et la réputation en ligne |
| Partnerships | T2 | Partenariats et collaborations |
| Lifecycle | T3 | Fidélisation et relance des clients existants |
| Media Buyer | T4 | Achat publicitaire, budgets |
| Rate & Distribution | T4 | Mix de canaux de distribution, parité tarifaire |
| **Directrice Artistique** | **T5** | Univers visuel, repositionnement/rebranding, concepts de campagne, direction photo/reels, réponse aux tendances — l'agent responsable de la visibilité et de la viralité, distinct de la réparation mécanique de la perte |

*Point ouvert : le rôle historiquement nommé « Content Creator » recouvre le même terrain que la Directrice Artistique (même palier T5). Recommandation par défaut : fusionner les deux plutôt que les empiler — à confirmer avec le conseiller.*

---

## 6. État d'avancement réel du prototype

Évaluation honnête, faite à partir du code existant et de la suite de tests (intégration continue verte à chaque changement, y compris sur une vraie base Postgres) :

**Construit et testé :**
- Modèle de domaine complet (établissement, mandat, thèse, objectif, tâche, agent, exécution d'agent, artefact, notification, blocage, approbation, mesure)
- Base de données avec isolation stricte par mandat et journal append-only
- Bus d'événements avec rejeu et garantie de non-double-exécution
- Moteur de politique d'autonomie T0–T5 et arrêt d'urgence
- Point de passage unique d'exécution des agents (le « chokepoint » de sécurité)
- Moteur de diagnostic/chiffrage (§3a), branché à de vraies sources publiques

**En cours :**
- Moteur de dérivation perte → objectifs → tâches (§3b/3c) : spécifié, validé, implémentation en cours

**Pas encore construit :**
- 8 agents sur 12 n'ont pas encore de code (dont la Directrice Artistique), seuls Analyst, Underwriter, Orchestrator et Media Buyer existent
- Aucune interface utilisateur — rien à montrer à l'écran à ce stade, tout est vérifié par des tests automatisés uniquement
- Aucun environnement de production déployé
- Le choix d'hébergement pour les exécutions longues (files d'attente durables, fenêtres d'attente de plusieurs heures ou jours) est recommandé mais pas définitivement tranché dans le code actuel

**En clair pour le conseiller** : le socle et les garde-fous de confiance sont solides et déjà éprouvés par des tests ; le moteur qui chiffre la perte fonctionne réellement sur des données publiques réelles ; ce qui reste devant nous, c'est la construction des agents d'exécution eux-mêmes et de l'interface.

---

## 7. Ce qui distingue Anesis

- **Un chiffre défendable, pas un argumentaire de vente** : la perte annoncée à un prospect sort d'une formule fixe et reproductible, jamais d'une estimation à la main ou d'un modèle de langage qui « devine ».
- **Une gouvernance vérifiable, pas une promesse** : le contrôle humain sur l'argent et la marque n'est pas un engagement oral, il est imposé par le code et vérifié par des tests automatisés — un argument de confiance concret face à la réticence naturelle d'un hôtelier à « laisser une IA toucher à son budget ou à son image ».
- **Une traçabilité complète, du diagnostic à la tâche** : aucune action n'existe sans objectif, aucun objectif sans perte chiffrée — la chaîne est auditable de bout en bout.
- **Un positionnement de firme, pas d'agence** : identité de marque et discours cohérents avec cette posture (voir dossier de marque séparé).

*Une analyse comparative des concurrents (agences marketing hôtelier UK, modèles similaires à l'international) a été produite séparément, fondée sur la recherche des tarifs de marché et le calcul du panier client réel. Elle n'est pas reproduite ici pour éviter tout chiffre invérifié dans ce document — à joindre au dossier avant transmission au conseiller.*

---

## 8. Tarification

Deux formules de mandat, plus un diagnostic initial facturé séparément :

| Formule | Abonnement | Intéressement |
|---|---|---|
| **Croissance** | £3 400 *(périodicité à confirmer — supposée mensuelle)* | 15 %, facturé à l'issue de la période de mesure |
| **Dominance** | £4 400 *(périodicité à confirmer — supposée mensuelle)* | 10 %, facturé à l'issue de la période de mesure |

Logique de la grille : la formule Croissance, moins chère à l'abonnement, prend une part plus élevée de la valeur récupérée ; la formule Dominance, plus chère à l'abonnement, en prend moins — le client arbitre entre coût fixe et part variable selon son appétit au risque.

**Diagnostic initial (audit + thèse de souscription)** : £3 000, **déductible du premier mois si l'établissement signe un mandat** à l'issue du diagnostic.

**Option refonte de site web** (si nécessaire au diagnostic) : +£1 000, en supplément.

*Deux points à trancher avant transmission au conseiller : (1) la périodicité de £3 400 / £4 400 (mensuelle supposée ici, à confirmer) ; (2) l'assiette exacte de l'intéressement — cohérence à vérifier avec l'entité `Measurement` du modèle technique (§4), qui compare déjà `planned` vs `actual` par objectif : c'est naturellement sur cet écart mesuré que l'intéressement devrait se calculer, à confirmer que c'est bien l'intention.*

---

## 9. Questions ouvertes nécessitant l'arbitrage du conseiller

1. **Hébergement des exécutions longues** — solution à steps durables (type Inngest) recommandée à l'architecture initiale, mais pas confirmée dans l'implémentation actuelle. Impact direct sur le coût d'infrastructure et la fiabilité des fenêtres d'attente T2/approbations T3+.
2. **Fusion Content Creator / Directrice Artistique** (§5) — à trancher avant d'implémenter le 12ᵉ agent.
3. **Modèle multi-opératrices** — une seule fondatrice aujourd'hui ; le modèle prévoit d'en ajouter d'autres. Combien de mandats une opératrice peut-elle raisonnablement suivre, et quels rôles distincts prévoir ?
4. **Réversibilité T2** — une fonction d'annulation programmatique est-elle exigée pour chaque outil T2, ou une procédure d'annulation documentée (manuelle) suffit-elle au démarrage ?
5. **Périmètre de la prospection de la firme elle-même** — la prospection de nouveaux mandats pour Anesis vit-elle dans le même système que le suivi des établissements clients, ou reste-t-elle un outil séparé qui n'alimente le système qu'à la signature ?

---

## 10. Prochaines étapes

1. Trancher les questions ouvertes du §9 avec le conseiller.
2. Implémenter le moteur de dérivation (§3b/3c) — décisions déjà actées, code en cours.
3. Construire les 8 agents manquants, en commençant par la Directrice Artistique (impact direct sur l'acquisition/la visibilité).
4. Décider et mettre en œuvre la solution d'hébergement pour les exécutions longues.
5. Première interface (même minimale) pour rendre le système observable au-delà des tests automatisés.
