# ANESIS ACQUISITION — Dossier de présentation

> Document de synthèse à l'attention du conseiller, en vue de l'analyse détaillée du dossier et de l'endorsement du prototype.
> Sources : le document de référence business (`anesis-business-complet.md`) et l'état réel du code technique. Aucun chiffre n'est ici inventé ; là où une source manquait, c'est signalé explicitement plutôt que deviné.

---

## 1. Résumé exécutif

**Anesis Acquisition** est une firme britannique qui **souscrit** des établissements hôteliers indépendants — au sens propre du terme, comme un assureur ou un investisseur souscrit un dossier : elle analyse en profondeur, chiffre en livres sterling ce que l'établissement perd, décide d'accepter ou de refuser, puis récupère ce revenu sous contrat, avec une part de sa rémunération indexée sur le résultat réellement obtenu.

Ce n'est pas une agence marketing. Une agence facture du temps ou des prestations ; Anesis accepte d'être payée en partie sur son résultat, refuse les dossiers qui ne remplissent pas ses critères, et prend la responsabilité financière de ce qu'elle avance — ce qu'aucun éditeur de logiciel ni aucune agence classique ne fait.

L'entité, ANESIS Acquisition Ltd, est nouvelle et britannique. La fondatrice exerçait auparavant sous le nom KAIROS (Canada, marchés francophones), avec des résultats vérifiables (22x de retour publicitaire pour un glamping, +372 % de croissance Instagram pour un spa, +156 % de réservations pour SAFIR) qui constituent son expérience personnelle, présentée séparément de la nouvelle entité — laquelle n'a encore rien facturé.

---

## 2. Le problème et la cible

Un hôtel indépendant britannique perd de l'argent de trois façons qu'il ne mesure presque jamais : des commissions payées aux plateformes de réservation (Booking, Expedia) sur des réservations qui auraient pu être directes ; des prospects qui écrivent et reçoivent une réponse trop tardive ou trop faible pour convaincre ; et un site, des avis, des publicités mal exploités qui laissent filer une demande déjà acquise.

**Profil de cible (ICP)** : établissements d'hébergement indépendants à séjour d'expérience, Royaume-Uni, 12 à 80 clés, tarif moyen (ADR) supérieur à £140/nuit, **sans direction marketing interne**, plus de 35 % des réservations transitant par des plateformes à commission. Le critère est la situation économique, pas le type d'établissement — un country house hotel et un lodge de glamping haut de gamme partagent le même problème s'ils partagent ce profil.

**Déploiement géographique en trois vagues** : Sud-Ouest et Cotswolds (zone d'installation, plus forte densité) → Sud-Est et Nord → Écosse et Pays de Galles → Europe continentale à partir de l'année 2-3.

**Pourquoi le Royaume-Uni** : dépendance structurelle plus lourde aux OTA qu'en Amérique du Nord (le problème chiffré vaut plus cher) ; le modèle exige une présence physique (séances photo, rencontres propriétaires) que la densité géographique britannique permet ; l'hôtellerie indépendante britannique tourne toute l'année (contrairement à l'Atlantique canadien, saisonnier), ce qui permet d'employer une équipe à temps plein ; porte d'entrée vers l'Europe entière.

---

## 3. Le parcours client — trois portes, de plus en plus étroites

**Porte 1 — L'évaluation (gratuite).** Une candidature, pas un audit gratuit. Le moteur analyse l'établissement à partir de données publiques uniquement (site, avis, publicités visibles, présence sur les plateformes) et rend un verdict : éligible, ou refusé avec un motif clair. Un refus bien expliqué est un atout — il démontre la sélectivité de la firme.

**Porte 2 — La souscription (£3 000).** Réservée aux établissements éligibles. Trois semaines d'analyse approfondie avec accès aux vraies données de l'établissement. Livrable : la **Thèse d'Acquisition** — montant de revenu récupérable chiffré, décomposé poste par poste, méthode de mesure, plan à 90 jours, termes du mandat proposé. Somme déduite du premier mois si le client signe. Option refonte de site web si nécessaire : **+£1 000**.

**Porte 3 — Le mandat.** Deux formules, Croissance et Domination — tout ce qui existe dans Croissance existe aussi dans Domination :

| | Croissance | Domination |
|---|---|---|
| Abonnement mensuel | £3 400 | £4 400 |
| Canaux publicitaires | Meta Ads seul | Meta Ads **et** Google Ads |
| Durée minimale | 6 mois | 12 mois |
| Accès | Équipe | Accès direct à la fondatrice, délai de réponse garanti plus court |
| Suivi tarifaire (parité, OTA) | — | Inclus |
| Exclusivité géographique | — | Aucun concurrent pris dans un rayon donné |
| Intéressement (voir §4) | 15 % | 10 % |

Logique Meta + Google sur Domination : Meta touche les gens avant qu'ils cherchent activement, Google les touche au moment précis de la décision (« hôtel Cotswolds ce weekend ») — les deux ensemble couvrent un chemin qu'un seul canal ne couvre jamais. Séances photo/vidéo indexées sur la durée du mandat, pas la formule : une par trimestre, dès le premier mois.

---

## 4. Le modèle de revenu — trois lignes, jamais confondues

1. **Souscription** — paiement unique, £3 000, avant le début de l'analyse, déduit du premier mois si signature.
2. **Abonnement de mandat** — récurrent, mensuel, payé d'avance (facturé ~1 semaine avant le mois concerné, dû avant le dernier jour du mois en cours). Passé cette date, pas de délai de grâce : pas de paiement, pas de travail le mois suivant. Règle stricte pour protéger la trésorerie.
3. **Intéressement** — le bonus de fin de mandat, et le point le plus important à bien comprendre.

**Mécanique de l'intéressement.** À la souscription, une ligne de départ est établie : le niveau de réservations directes que l'établissement aurait eu sans intervention, mois par mois (ajusté à la saisonnalité). Le réel est suivi en continu pendant le mandat (visible côté client, à des fins de motivation et de détection précoce), **mais rien n'est facturé pendant le mandat**. À la fin du contrat, la ligne de départ cumulée et le réel cumulé sont comparés ; l'écart (l'incrément) est soumis une seule fois au taux de la formule : **15 % en Croissance, 10 % en Domination**.

*Exemple : mandat Domination 12 mois, ligne de départ £70 000/mois (£840 000/an), réel £960 000/an → incrément £120 000 → bonus final à 10 % = £12 000, facturé une fois, à la fin.*

Le taux est plus bas sur la formule la plus chère par hypothèse (les mandats Domination portent en général sur des établissements plus grands, donc des montants récupérables plus élevés en valeur absolue) — hypothèse à vérifier sur les premiers mandats réels et ajuster si besoin.

Si le mandat s'arrête avant terme, le bonus se calcule au prorata des mois mesurés. Au renouvellement, une nouvelle ligne de départ est fixée sur le niveau atteint — le gain acquis devient la référence du client sans commission additionnelle.

**Pourquoi ce n'est pas perçu comme une commission de plateforme** : une commission OTA se paie sur toute réservation, indéfiniment. L'intéressement ne se paie que sur l'argent que le client n'aurait pas eu sans Anesis, et il s'éteint au renouvellement suivant dès que ce niveau devient le nouveau normal du client.

**TVA** : seuil d'immatriculation britannique à £90 000 de chiffre d'affaires sur 12 mois glissants — à cadrer avec un comptable britannique dès l'incorporation.

---

## 5. Le mécanisme produit (diagnostic)

Le moteur d'évaluation (Porte 1/2) calcule, à partir de signaux publics (vitesse du site via Google PageSpeed, volume et note des avis, structure du site, présence d'un pixel de reciblage, scraping ciblé), un **leak index** sur 100 et une perte mensuelle estimée en £, puis une décision (qualifié / décliné / à revoir) selon des seuils explicites.

**Garantie de conception vérifiée dans le code** : ce calcul est une fonction pure et déterministe, sans IA générative — mêmes données en entrée, toujours le même chiffre. Un test structurel interdit d'importer un client IA générative dans ce module. C'est la correction directe d'un défaut identifié sur l'ancien outil, qui donnait deux montants différents pour la même fuite selon la langue de sortie du rapport (le calcul se faisait alors à l'intérieur de la rédaction du texte). Le chiffre annoncé à un prospect est donc reproductible et défendable, condition minimale pour qu'un client accepte de payer sur un résultat mesuré.

Une fois le mandat signé, la perte est répartie entre quatre piliers (vitesse, réputation, dépendance OTA, retargeting) au prorata de leur contribution au leak index ; un objectif chiffré est créé par pilier, et chaque objectif engendre une tâche routée vers l'agent responsable. **Règle non négociable du modèle de domaine** : aucun objectif sans mandat signé, aucune tâche sans objectif — il est donc structurellement impossible de générer un plan d'action pour un établissement qui n'a pas contractualisé.

---

## 6. L'équipe — douze agents, cinq employés

### Le principe d'autonomie

Chaque action qu'un agent peut entreprendre porte un niveau, selon ce qu'une erreur coûterait :

- **Autonomie totale** — l'agent agit seul (analyse interne, souscription, orchestration).
- **Autonomie avec relecture après coup** — l'agent agit, un humain vérifie ensuite (contenu déjà approuvé, recommandations de site).
- **Autonomie avec délai de deux heures** — l'agent décide, l'action est programmée dans 2h avec alerte ; si personne n'intervient, elle s'exécute (réponses aux avis, partenariats).
- **Accord humain obligatoire** — rien ne part sans feu vert (budgets publicitaires, prix, séquences email de masse, direction créative).

*Note technique : cette présentation en 4 paliers correspond, côté code, à un modèle plus fin en 6 paliers (T0–T5), où le palier « accord obligatoire » se subdivise selon ce qui est engagé — argent/tarification d'un côté, voix de marque de l'autre — chacun avec sa propre règle d'approbation. Détail en §7.*

### Les douze agents

| Agent | Rôle | Autonomie |
|---|---|---|
| Orchestrator | Chef d'équipe, distribue le travail, rapport hebdomadaire | Totale |
| Underwriter | Exécute l'analyse, produit la Thèse d'Acquisition | Totale |
| Analyst | Mesure le réel contre le prévu chaque jour, détecte les écarts | Totale |
| Social Ops | Programme et publie le contenu déjà approuvé | Relecture après coup |
| Conversion | Recommande des corrections du site et du parcours de réservation | Relecture après coup |
| Reputation | Rédige et publie les réponses aux avis Google | Délai de 2h |
| Partnerships | Contacte les partenaires potentiels (PMS, courtiers, guides) | Délai de 2h |
| Lifecycle | Prépare les séquences email vers les clients de l'établissement | Accord obligatoire |
| Media Buyer | Construit et ajuste les campagnes Meta et Google Ads | Accord obligatoire |
| Rate & Distribution | Surveille la parité tarifaire, propose la stratégie de distribution | Accord obligatoire |
| Content Creator | Rédige textes, calendrier, briefs de production | Accord obligatoire |
| **Creative Director** | Propose la direction visuelle et la veille des tendances par établissement | Interne, jamais publié directement |

Deux limites techniques honnêtes : la comparaison automatique du prix du site aux plateformes n'a pas de connexion simple et se fait à la main au départ ; répondre automatiquement sur TripAdvisor n'est pas possible techniquement — l'agent rédige, un humain colle la réponse.

Le **Creative Director** comble un trou identifié tardivement : personne n'avait la responsabilité de décider, pour chaque établissement, quelle direction visuelle crée de la demande — c'est ce qui transforme un contenu correct en contenu qui se propage. Il produit un document (jamais une publication directe) que la Directrice Artistique valide et enrichit de son jugement.

### Les cinq premiers employés, dans l'ordre d'embauche

1. **Directrice Artistique** — pilote l'agent Creative Director. Poste le plus différenciant de la firme.
2. **Content Creator** — dès que le volume de rédaction dépasse ce qu'une personne seule absorbe.
3. **Media Buyer** — quand le nombre de comptes publicitaires gérés le justifie.
4. **Vidéaste-Photographe** — *point à trancher* : salarié à temps plein seulement autour de 8-10 mandats simultanés (vu le rythme d'une séance/trimestre) ; en dessous, un réseau de prestataires payés à la livraison protège mieux la trésorerie.
5. **Assistante** — administratif, première ligne de la messagerie client (§9).

Chaque poste existe parce qu'un humain doit superviser un agent précis — pas un effectif générique ajouté pour la forme.

---

## 7. Le système de gouvernance technique (garanties vérifiées par le code)

C'est l'argument de confiance concret face à la réticence naturelle d'un hôtelier à laisser un système automatisé toucher à son budget ou à son image : le contrôle humain n'est pas une promesse, il est imposé par le code et vérifié par des tests automatisés.

| Palier | Portée | Régime | Exemple |
|---|---|---|---|
| **T0** | Interne au système | Exécution immédiate | Calculer un score, lire le contexte du mandat |
| **T1** | Externe, réversible | Exécution immédiate, revue a posteriori | Publier un post social déjà approuvé |
| **T2** | Externe, irréversible, coût faible | Fenêtre de retenue de 2h + notification ; exécution auto si personne n'intervient ; annulable pendant la fenêtre | Répondre à un avis client |
| **T3** | Externe, engageant | Approbation humaine bloquante | Lancer une séquence de fidélisation |
| **T4** | Argent / tarification | Approbation humaine bloquante, toujours | Déplacer un budget publicitaire, ajuster un tarif |
| **T5** | Voix de marque / image | Approbation humaine bloquante, toujours | Toute production du Creative Director |

Garanties tenues au niveau du code, vérifiées par des tests automatisés :

- **Point de passage unique** : aucune action externe ne peut contourner ce moteur — un seul endroit du système a le droit d'exécuter un effet réel et de l'enregistrer.
- **Journal d'audit immuable** : chaque événement est écrit une fois, jamais modifié ni supprimé ; chaque appel d'outil enregistre qui, quoi, quand, avec quelle entrée, quel résultat, et qui a approuvé.
- **Réversibilité documentée** : toute action à partir de T2 doit préciser comment elle peut être annulée ou compensée.
- **Isolation par mandat** : les données d'un établissement ne sont jamais accessibles depuis le contexte d'un autre mandat — contrôle au niveau base de données, testé y compris sur une vraie instance Postgres.
- **Arrêt d'urgence** : global (fondatrice uniquement) ou par mandat (toute opératrice), priorité absolue — annule même les actions T2 en attente.
- **Temps humain mesuré** : chaque exécution d'agent enregistre le temps humain effectivement consacré, et si ce chiffre est mesuré ou estimé — jamais l'un présenté comme l'autre. C'est la donnée qui permettra de prouver, courbe à l'appui, qu'une même employée peut suivre davantage de mandats avec le temps (argument de scalabilité vérifiable, pas déclaratif).

Seule la fondatrice peut approuver une action T3 à T5 ou déclencher un arrêt d'urgence global — modélisé pour permettre l'ajout d'autres opératrices plus tard sans migration.

---

## 8. La plateforme technique — état d'avancement réel

Sans plateforme, les agents restent des personas isolés qui ne se parlent pas — le problème exact de l'ancien système de la fondatrice. La plateforme leur donne : un système de messages inter-agents, un dossier partagé par mandat, une horloge qui déclenche les cycles automatiquement, des notifications toujours assorties d'une action attendue, et le moteur de permissions ci-dessus.

**Construit et vérifié par des tests automatisés (y compris sur une vraie base Postgres, en intégration continue à chaque changement de code) :**
- Modèle de domaine complet (établissement, mandat, thèse, objectif, tâche, agent, exécution d'agent, artefact, notification, blocage, approbation, mesure)
- Base de données avec isolation stricte par mandat et journal append-only
- Bus de messages inter-agents, avec rejeu et garantie de non-double-exécution ; correction récente : les agents savent désormais pour quel établissement ils travaillent au moment d'écrire une donnée (non garanti auparavant)
- Moteur de diagnostic/chiffrage (§5), branché à de vraies sources publiques

**En cours :**
- Moteur de permissions (qui décide qui agit seul, qui attend, qui demande l'accord) — spécifié et validé, implémentation en cours
- Trois agents minimaux (Analyst, Underwriter, Orchestrator + Media Buyer déjà codé) pour prouver que la chaîne complète tourne seule, de l'alerte du matin au rapport du vendredi, sans intervention hors approbation requise

**Pas encore construit :**
- 8 agents sur 12 (dont le Creative Director) n'ont pas encore de code
- Aucune interface utilisateur — rien à montrer à l'écran, tout est vérifié par des tests automatisés uniquement
- Espace client, site public
- Aucun environnement de production déployé
- Le choix d'hébergement pour les exécutions longues (files d'attente durables, fenêtres d'attente de plusieurs heures ou jours) est recommandé à l'architecture mais pas définitivement tranché dans le code actuel

**En clair pour le conseiller** : le socle et les garde-fous de confiance sont solides et déjà éprouvés par des tests ; le moteur qui chiffre la perte fonctionne réellement sur des données publiques réelles ; ce qui reste devant, c'est la construction des agents d'exécution eux-mêmes et de l'interface.

---

## 9. Communication client

Deux lignes WhatsApp séparées, jamais mélangées : une ligne publique pour les demandes générales et les prospects, une seconde réservée aux clients sous mandat, communiquée uniquement à la signature. L'assistante répond en premier, ce qui est grave remonte directement à la fondatrice, qui voit tous les messages sans filtre. Aucun développement requis — la valeur vient de l'exclusivité du numéro, pas d'une technologie propriétaire.

Le rapport mensuel est écrit en deux temps : l'agent Analyst produit les chiffres et comparaisons, un humain écrit le ton et ajoute une note personnelle avant l'envoi — rien ne part sans cette relecture.

---

## 10. Ce qui distingue Anesis

- **Un chiffre défendable, pas un argumentaire de vente** — la perte annoncée sort d'une formule fixe et reproductible, jamais d'une estimation à la main ou d'un modèle de langage qui « devine » (§5).
- **Une gouvernance vérifiable, pas une promesse** — le contrôle humain sur l'argent et la marque est imposé par le code et vérifié par des tests, pas un engagement oral (§7).
- **Une rémunération partiellement liée au résultat** — aucune agence ni éditeur logiciel n'accepte ce risque.
- **Une sélectivité assumée** — Anesis refuse des dossiers ; un logiciel ne refuse jamais rien.
- **Un positionnement de firme, pas d'agence** — identité de marque cohérente avec cette posture (dossier de marque séparé).

*Une analyse comparative des concurrents (agences marketing hôtelier UK, modèles similaires à l'international) existe séparément, fondée sur la recherche de tarifs de marché. Non reproduite ici — à joindre au dossier avant transmission.*

---

## 11. Argumentaire pour évaluateurs externes (immigration / investisseurs)

- **Innovant** : la méthode de souscription elle-même — mesurer, chiffrer en £, exécuter, mesurer à nouveau, être payé sur l'écart — n'existe pas sous cette forme sur ce marché. L'attribution de la production créative au revenu (quelle photo a rempli quelle chambre) est l'idée la plus originale du dossier.
- **Viable** : chiffres réels et sourcés, pas des promesses ; résultats antérieurs de la fondatrice documentés comme expérience personnelle ; lettres d'intention à venir de la campagne d'évaluation gratuite (Porte 1).
- **Scalable** : la courbe de minutes humaines par mandat, mesurée et décroissante dans le temps — preuve chiffrée que l'entreprise grandit sans grossir au même rythme en effectifs (donnée produite nativement par le système, §7).
- **Créateur d'emplois** : cinq postes réels, chacun justifié par l'architecture du système, pas ajoutés pour cocher une case.

---

## 12. Questions ouvertes nécessitant l'arbitrage du conseiller

1. **Hébergement des exécutions longues** — solution à steps durables recommandée à l'architecture initiale, non confirmée dans l'implémentation actuelle. Impact direct sur le coût d'infrastructure et la fiabilité des fenêtres T2/approbations T3+.
2. **Seuil d'embauche du Vidéaste-Photographe** — salariat plein temps vs réseau de prestataires (§6), au-delà de 8-10 mandats simultanés : hypothèse à valider.
3. **Taux d'intéressement Croissance/Domination (15 %/10 %)** — hypothèse que Domination reste plus rentable en valeur absolue malgré le taux plus bas : à vérifier sur les premiers mandats réels.
4. **Modèle multi-opératrices** — une seule fondatrice aujourd'hui ; combien de mandats une opératrice peut-elle raisonnablement suivre, et quels rôles distincts prévoir au-delà des cinq premiers postes ?
5. **Réversibilité T2** — fonction d'annulation programmatique exigée pour chaque outil T2, ou procédure documentée (manuelle) suffisante au démarrage ?
6. **Périmètre de la prospection de la firme elle-même** — vit-elle dans le même système que le suivi des établissements clients, ou reste-t-elle un outil séparé qui n'alimente le système qu'à la signature ?

---

## 13. En une page, si le conseiller n'a que 30 secondes

Les hôtels indépendants britanniques perdent de l'argent d'une façon qu'ils ne mesurent jamais. Anesis mesure cette perte en livres sterling, décide si elle vaut la peine d'un mandat, puis la récupère avec une équipe de douze systèmes d'intelligence artificielle supervisés par de vrais employés — sur les décisions les plus sensibles (argent, image de marque), rien n'agit sans accord humain. Le client paie une entrée (£3 000), un abonnement (£3 400 ou £4 400/mois), et un bonus final indexé sur ce qui a été réellement gagné (15 % ou 10 % de l'incrément). Ce n'est pas une agence marketing : c'est une firme qui accepte d'être payée sur son résultat.
