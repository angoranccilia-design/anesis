# Brief créatif & technique — Site, Dashboard client, Cockpit fondatrice

> À donner tel quel à Claude Code (il a accès au repo, à `docs/anesis-business-complet.md` pour le contenu source, et à `docs/mockups/` pour voir ce qui a déjà été tenté et pourquoi ça ne suffit pas). Ce document remplace et annule le mockup statique `docs/mockups/site/*.html` — trop plat, trop générique, pas assez premium. Ne pars pas de ces fichiers, repars du brief ci-dessous.

## 0. Ce qui ne va pas avec la V1, et pourquoi on recommence

La première passe (5 pages HTML statiques, CSS inline, vert/or/crème) est correcte dans le contenu mais **plate** : pas d'animation, pas de vidéo, pas de graphique vivant, pas d'interactivité, une typographie sûre mais sans caractère, un copywriting qui explique au lieu de faire vivre. Pour une firme de souscription hôtelière servant une clientèle d'hôtels de caractère à £140+/nuit, le site doit produire le même effet qu'entrer dans un de ces hôtels : silence, matière, lumière, un peu de mystère, puis la preuve. Aujourd'hui il produit l'effet d'un template SaaS. On recommence avec une ambition claire : **effet WAOUW**, pas juste « propre ».

### 0bis. Le mot « AI » — deux registres, jamais un seul

**Jamais dans le discours face aux prospects** (site public, dashboard client, toute conversation commerciale) : ni dans le hero, ni dans les titres, ni dans le copywriting courant. On dit *underwriting firm*, *we measure / we price in £ / we take financial responsibility* — jamais « IA » en avant. Cohérent avec la Partie 8 du doc business (« pourquoi vous n'êtes pas juste un outil IA ») et avec la tendance 2026 de l'hôtellerie de luxe, qui s'éloigne du langage IA en marketing au profit de la clarté opérationnelle et de la confiance.

**Gardé, assumé, détaillé dans le matériel technique et le dossier d'immigration** (About en profondeur si besoin, documentation interne, pitch investisseurs/endorsement) : *AI Hospitality Underwriting Firm*, l'architecture à 12 agents, les paliers d'autonomie, le Leak Index déterministe. Les organismes d'endorsement (Envestors, UK Endorsing Services, Innovator International, GEP) sanctionnent une référence vague à l'IA sans preuve technique — pas le mot lui-même. La preuve technique existe déjà (code testé, CI verte) : c'est un atout à ce registre-là, pas à celui du prospect.

## 1. Direction de marque — au-delà du vert/or

Garder l'ancrage vert forêt profond + or (déjà cohérent avec la maquette dashboard existante), mais l'enrichir :

- **Pas de troisième couleur d'accent.** Palette fermée et non négociable : vert (profond + moyen), blanc/crème/ivoire, et l'accent doré. Toute la richesse visuelle vient des nuances et textures à l'intérieur de cette palette (dégradés de vert, jeux de transparence sur le crème, variations de doré) — pas d'une couleur supplémentaire.
- **Typographie — vibe old money, pas startup.** Abandonner Playfair Display (trop vu, trop « mariage ») et tout ce qui sonne « premium générique ». Direction : un serif éditorial **fin et classique**, jamais épais ni démonstratif — **Cormorant Garamond** (ou **Cormorant**) pour les titres, les gros chiffres et les citations, avec ses graisses légères et ses italiques élégantes, gratuit sur Google Fonts. En texte courant, un sans discret et bien dessiné (**Inter** ou **General Sans**), jamais en gras excessif. Petites capitales largement espacées pour les eyebrows, labels et mentions légales — c'est ce genre de détail, plus que la couleur, qui donne l'impression « vieille fortune anglaise, discrète » plutôt que « startup qui vient de lever des fonds ». Filets fins, monogrammes, espacement généreux ; pas de dégradés voyants, pas d'ombres portées fortes, pas d'icônes flat-design génériques.
- **Photographie/vidéo** : jamais de stock générique « hôtel souriant ». Direction : golden hour, brume sur les jardins, feu de cheminée, thé de l'après-midi, tweed et bottes en caoutchouc, détails d'architecture georgienne, chiens, tissus et matières (lin, laine, pierre). Traitement légèrement désaturé, grain fin, jamais criard. Tant que les vraies photos UK n'existent pas (pas de mandat signé) : utiliser des vidéos/textures abstraites de haute qualité (grain, particules, mouvement lent de tissu ou de flamme) en hero plutôt que de la fausse photo d'hôtel — plus honnête, et souvent plus premium qu'une photo de stock ratée.
- **Ton du copywriting** : jamais de jargon SaaS (« optimisez », « boostez », « solution »). Le ton est celui d'un conseiller de confiance qui a vu beaucoup d'hôtels et parle franchement — chaleureux, précis, jamais ampoulé. Structure narrative de chaque page : problème vécu → révélation du chiffre caché → méthode → preuve → invitation à candidater (pas « acheter »).

  *Exemple du ton attendu, pas à copier tel quel :*
  > "You already have the guests who would book directly. Right now, a fifth of them are quietly paying Booking.com to introduce them to a hotel they'd already found on Instagram. We don't ask you to spend more on marketing. We show you, in pounds, exactly where that fifth is going — then we go and get it back."

  **Deux tics repérés dans les brouillons précédents, à ne plus jamais utiliser :**

  1. La liste binaire façon pitch deck (« Nous ne sommes pas une agence marketing · un SaaS · ... / Nous sommes une firme de souscription »). Ça sonne cheap et défensif. Montrer plutôt que déclarer :
     - ❌ *"We are not a marketing agency."*
     - ✅ *"We don't run your Instagram for you. We price what it's costing you not to — then we go and recover it."*
  2. Le réflexe « never a bot / a real person, not an automated sequence » — vocabulaire de start-up qui a peur qu'on la prenne pour un logiciel. Une firme distinguée n'a pas besoin de se défendre contre ce soupçon, elle l'ignore :
     - ❌ *"Every enquiry reaches a real person — never a bot."*
     - ✅ *"Write to us yourself, and you'll hear back from someone who understands hospitality — not a queue, and never a script."*

  Registre général : phrases courtes, jamais de superlatifs creux (« incroyable », « révolutionnaire »), de la prose plutôt que des listes à puces dans le corps du texte — le ton d'un bon guide de voyage britannique (Condé Nast Traveller, Mr & Mrs Smith), jamais celui d'une landing page SaaS.

## 2. Interactivité et mouvement — la liste concrète

Rien de gratuit ; chaque animation sert la compréhension ou la preuve.

- **Hero vidéo en fond** (texture/mouvement lent, pas de stock hôtel), titre qui se révèle au scroll, parallax léger.
- **Calculateur de Leak Index interactif — teaser illustratif, PAS le vrai moteur.** Sliders déclaratifs (nombre de clés, ADR, part OTA estimée à la louche) qui recalculent en direct une **fourchette** de perte mensuelle en £ (ex. « entre £X et £Y/mois »), jamais un chiffre unique précis — le vrai Leak Index mesure des données réelles scrapées (vitesse, avis, OTA, publicité), pas des estimations saisies par le visiteur, et c'est structurellement plus fiable. ⚠️ Point de protection du modèle économique : si ce widget donnait un chiffre exact et gratuit, il cannibaliserait la Porte 1 (l'évaluation gratuite réelle, qui scrape les vraies données) et in fine la Porte 2 (£3 000, accès aux données internes + plan à 90 jours + mandat). Le widget doit toujours conclure sur un CTA vers la vraie évaluation gratuite (Porte 1) pour obtenir le score réel — jamais se substituer à elle. Mention obligatoire, visible, sous le widget : *"This is an illustrative estimate. Your real Acquisition Score uses your actual website, reviews and booking data — get it free below."*
- **Graphique de trajectoire animé** : ligne de base vs réel obtenu, se dessine au scroll (façon avant/après, cf. Partie 4 du doc business — l'exemple du mandat Domination à £120k d'incrément).
- **Carrousel avant/après feed Instagram** : deux grilles 3×3 côte à côte ou en toggle, « avant » terne/incohérent, « après » cohérent et vivant — mockup illustratif (pas de vrai compte client UK à ce jour, à construire comme composition/maquette assumée).
- **Aperçu de la Thèse d'Acquisition** : un mockup de document (façon feuillet de rapport premium, effet « page qui se tourne » ou reveal au scroll) montrant à quoi ressemble le livrable réel — score, postes de perte, plan 90 jours — avec des données d'exemple clairement marquées « échantillon ».
- **Tableau de différenciation en toggle animé** plutôt qu'un tableau HTML plat : bascule « Agence classique / Anesis » avec transition.
- **Scroll-reveal général** (fade + slight rise) sur toutes les sections, smooth-scroll (Lenis ou équivalent), transitions de page.
- **Micro-interactions** : boutons avec état hover réfléchi (pas juste un changement de couleur), curseur personnalisé discret en option.

## 3. Les trois livrables

### A. Site public (refonte complète du sitemap)

Accueil · À propos · **Méthode** (nouvelle page dédiée : l'Anesis Revenue Leak Index en détail, les 3 portes, le calculateur interactif) · Résultats (track record fondatrice, clairement étiqueté Amérique du Nord) · **Blog** (nouveau — voir ci-dessous) · Diagnostic · Contact.

**Le blog — appelé « Journal »** : outil de notoriété, pas un module technique accessoire. Exigence explicite (Partie 19 du doc business) : chaque numéro doit être écrit avec la rigueur d'un vrai article de presse économique/hôtelière britannique, pas d'un billet de blog — au point qu'il pourrait être repris tel quel par un journal. Cadence mensuelle, présentée comme une parution (« this month's Journal »), pas un flux. 4 à 6 articles de lancement à rédiger dans le même ton, sujets tirés du doc business : *« Pourquoi votre hôtel perd de l'argent que Booking.com ne vous rendra jamais »*, *« Le vrai coût d'une réponse envoyée 6 heures trop tard »*, *« Ce qu'un assureur peut apprendre à un hôtelier »* (filer la métaphore souscription), *« Pourquoi nous refusons plus d'hôtels que nous n'en acceptons »*, *« La photo qui a rempli la chambre : ce qu'on a appris en attribuant du contenu à des réservations »*. Chaque article : image/vidéo de tête soignée, temps de lecture, partage. Objectif : devenir une référence citée, pas juste un flux SEO.

**Univers de style de vie de la marque — référence photo/contenu, pas extension du service.** Le registre visuel et éditorial emprunte au country club et au grand hôtel anglais : équitation, golf, polo, dîners gastronomiques (fruits de mer, caviar), spa et détente. C'est le monde qu'on évoque en image et en ton (Journal, réseaux, site), jamais un service qu'Anesis rend elle-même — même logique que Ralph Lauren ou un grand guide de voyage anglais : vendre un monde, livrer un résultat mesurable en dessous. Le feed Instagram et tout visuel public doivent être d'une propreté irréprochable — le test à appliquer : *"est-ce que ce visuel pourrait figurer dans la communication d'une maison de luxe établie ?"* Sinon, il ne sort pas.

### B. Dashboard client (« cockpit hôtelier ») — reprend et élève `docs/mockups/dashboard-client-mockup.html`

Ce que le client voit une fois sous mandat : Anesis Revenue Leak Index suivi en continu (graphique vivant, pas un chiffre figé), ligne de base vs réel (le mécanisme d'intéressement de la Partie 4, visualisé), calendrier créatif du trimestre (galerie photo/vidéo produite), file des tâches/objectifs en cours avec leur agent responsable, rapport mensuel en lecture immersive (pas un PDF austère), notifications d'approbation quand une action attend son feu vert (T3/T4/T5 — cf. `packages/core/src/autonomy.ts`).

### C. Cockpit fondatrice — nouveau, poste de commandement interne

**Ce qu'elle surveille** — vue transversale sur **tous** les mandats à la fois (pas un mandat isolé comme le dashboard client) : pipeline de diagnostics (combien de candidatures, combien qualifiées, combien de LOI — cf. cibles Mois 2 : 60+ diagnostics, 7 qualifiés, 2 LOI), file des approbations en attente tous mandats confondus (priorité, montant, délai T2/T3/T4/T5), activité des 12 agents en direct (façon flux d'événements, pas une liste morte), courbe des minutes humaines par mandat dans le temps (l'argument de scalabilité de la Partie 6/9 du doc business — celui-là doit être visuellement fort, c'est LA preuve chiffrée pour le dossier d'immigration), revenu par ligne (souscription / abonnement / intéressement, jamais confondues — Partie 4), alerte arrêt d'urgence toujours visible et accessible en un clic.

**Ce qu'elle fait — pas seulement ce qu'elle surveille.** Le cockpit n'est pas un tableau de bord passif : c'est l'outil de travail quotidien pour faire avancer un dossier d'un bout à l'autre du parcours (Partie 3 du doc business). Concrètement, une vue « dossier » par prospect qui suit tout le parcours candidat → souscrit → thèse rédigée → mandat signé, avec les actions rattachées à chaque étape :

- **Ouvrir la Porte 2** sur un prospect qualifié (déclenche la souscription payante, £3 000) ;
- **Consulter et amender la Thèse d'Acquisition** générée automatiquement par l'underwriter (postes de perte par pilier, montant récupérable, plan 90 jours) avant de l'envoyer au client — un éditeur, pas un simple visualiseur ;
- **Choisir la formule** (Croissance ou Domination) et **générer le contrat de mandat** correspondant, avec l'option refonte de site en supplément si le diagnostic la juge nécessaire ;
- **Signer et activer le mandat** — ce qui déclenche techniquement `signMandate` (`packages/agent-runtime/src/onboarding.ts`) et la dérivation automatique objectifs/tâches déjà construite à l'étape 3, visible immédiatement dans le cockpit une fois le mandat activé.

Visuellement, cette partie doit avoir l'épaisseur d'un vrai outil de travail (formulaires soignés, aperçu du document avant envoi, historique des versions de la thèse) — pas trois boutons perdus dans un tableau de bord.

## 4. Stack technique recommandée

Sortir du HTML statique à styles inline. Recommandation : **Next.js (React) + Tailwind CSS + Framer Motion** pour les animations et transitions, **Recharts** ou **visx** pour les graphiques vivants (Anesis Revenue Leak Index, trajectoire, courbe des minutes humaines), **MDX** pour le blog (articles versionnés en fichiers, pas de CMS externe à payer tout de suite), **Lenis** pour le smooth-scroll. Vidéos hero en fichiers optimisés (webm/mp4 légers) ou une texture WebGL légère (Three.js) si Claude Code juge que ça vaut le coût de perf — sinon vidéo classique suffit. Budget de performance à respecter : ironique, pour une firme dont l'Anesis Revenue Leak Index pénalise justement les sites lents, d'avoir un site public lent — Lighthouse doit rester correct malgré les animations.

## 5. Contenu source — ne rien réinventer

Toutes les données, chiffres, formulations officielles (ICP, 3 portes, tarification, Anesis Revenue Leak Index à 5 piliers, table de différenciation, track record KAIROS, vision 10 ans, positionnement) sont déjà dans `docs/anesis-business-complet.md` — s'y référer plutôt que d'inventer de nouveaux chiffres. Seul le **traitement visuel et narratif** doit être totalement repensé, pas le fond.

## 6. Ce qu'on ne veut plus revoir

Grilles de cartes plates sans hiérarchie visuelle · tableaux HTML bruts · CSS inline dupliqué page par page · aucune vidéo ni animation · typographie « safe » sans personnalité · copywriting qui liste des faits au lieu de raconter · aucune preuve visuelle du livrable réel (la Thèse, le dashboard, le feed avant/après) · un site qui a l'air d'un thème WordPress premium plutôt que d'une firme qui gère des budgets à six chiffres pour des hôtels de caractère.
