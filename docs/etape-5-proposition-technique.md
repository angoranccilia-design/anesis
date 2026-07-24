# Étape 5 — Proposition TECHNIQUE (le créatif est déjà tranché dans le brief)

> Court, à valider avant de coder. Ne porte que sur l'architecture, pas sur le visuel/narratif.

## Q1 — Structure d'apps : **une seule app `apps/web`**, routage par rôle (recommandé)

Next.js App Router, une app dans `apps/web` (à côté d'`apps/campaign`), avec des **groupes de routes** :
- `app/(public)/…` — site + blog. **Aucune auth**, rendu statique/ISR (Lighthouse rapide malgré les animations : le JS lourd — Framer Motion — n'est chargé que sur les routes concernées, Next code-split par route).
- `app/(client)/…` — dashboard client, auth-gated, borné à SON mandat.
- `app/(founder)/…` — cockpit, auth-gated, fondatrice uniquement.

**Pourquoi une seule app** : un seul système de design (palette/fontes/composants), un seul accès DB, les types `@anesis/core` partagés, un seul déploiement Vercel. Trois apps dupliqueraient tout ça sans bénéfice à ce stade. Les pages publiques restent statiques et rapides ; les dashboards sont dynamiques — Next gère les deux dans une même app.

## Q2 — Auth : **lien magique par email seulement** (confirmé, pas de sur-ingénierie)

Un seul founder, zéro client signé → **pas** de RBAC multi-rôles, pas d'OAuth, pas de mots de passe.
- **Maintenant** : lien magique email pour la **fondatrice** (le cockpit déclenche `signMandate` et l'arrêt d'urgence — ça doit être protégé). Session = cookie httpOnly signé.
- **Client** : l'accès se crée **par mandat**, le jour où le 1er mandat est signé (email du mandant → lien magique → borné à son `mandate_id`). Rien à construire tant qu'il n'y a pas de client.
- **Deux rôles suffisent** (founder / mandant), distingués simplement — pas un système de permissions générique.
- ⚠️ **Dépendance** : l'envoi d'email demande un fournisseur (Resend, déjà utilisé côté KAIROS) + une variable d'env. À confirmer : Resend, ou je hand-roll un lien magique minimal ?

## Q3 — Lire les VRAIES tables dès maintenant : **oui, confirmé** (avec une nuance)

Le backend des étapes 1-4 existe et est testé → on câble dessus tout de suite, zéro donnée factice.
- **Dashboard client** = lecture des vraies tables, bornée au mandat via le contexte RLS (`app.mandate_id` = son mandat). La RLS par mandat colle **parfaitement** à ce besoin.
- **Cockpit fondatrice** = lecture réelle aussi (pipeline, approbations, activité agents, minutes humaines, revenu). Les **écritures** (ouvrir Porte 2, éditer la thèse, `signMandate`, arrêt d'urgence) passent par le runtime existant (rôles/contexte corrects).
- **Nuance — le site public reste en données d'ÉCHANTILLON** (calculateur Leak Index, trajectoire, feed avant/après, aperçu de Thèse) : ce sont des démos publiques marquées « sample », pas des données client (il n'y en a pas, et c'est public). Conforme au brief.

## ⚠️ Tension réelle à trancher (RLS ↔ cockpit transversal)

La RLS isole **par mandat** (pensée pour le client et les agents). Or le **cockpit fondatrice est TRANSVERSAL** : il voit **tous** les mandats à la fois (toutes les approbations en attente, l'activité de tous les mandats, le revenu par ligne). `anesis_app` + RLS FORCE **bloque** une lecture multi-mandats.
- Bonne nouvelle : le **pipeline de diagnostics** (properties, assessments) n'a **pas** de RLS → le founder les lit sans souci.
- Le reste (mandates, approvals, tasks, agent_runs, artifacts…) est mandat-scopé.

**Ma recommandation** : le cockpit fait ses **lectures transversales côté serveur uniquement, via une connexion privilégiée (rôle propriétaire), en lecture seule** — jamais exposée au navigateur. C'est légitime : la RLS protège contre un **agent** qui contournerait l'isolation, pas contre la **fondatrice** qui a par définition la vue d'ensemble. Toutes les **écritures** restent sur `anesis_app` + contexte de mandat (runtime existant). Le dashboard **client**, lui, reste strictement sur `anesis_app` + son mandat (RLS).
*Alternative si tu préfères ne pas utiliser le rôle propriétaire en lecture : ajouter une politique RLS « founder read-all » (GUC de session) sur chaque table mandat-scopée — plus lourd, touche toutes les policies.* **Quelle option ?**

## Notes / dépendances
- **Stack** confirmée (brief) : Next.js + Tailwind + Framer Motion + Recharts (graphes) + MDX (blog, fichiers versionnés) + Lenis. Fontes via `next/font` (Cormorant Garamond + Inter, auto-hébergées, zéro appel externe).
- **DB** : lire le réel suppose la base ANESIS provisionnée (même prérequis que la campagne). Tant qu'elle n'existe pas, les dashboards s'affichent **vides** (aucun mandat) — normal, ils se rempliront au 1er mandat signé. Dev local possible sur Postgres local.
- **Contraintes rappelées et tenues** : palette fermée (vert/crème/or), Cormorant + Inter, jamais « AI » en public, pas de liste « we are not an agency », pas de « never a bot », en-GB, £. Aucune régression, CI verte avant de clore.

## Ordre de construction (validé par le brief)
1. Site public + blog (zéro auth, juge la direction créative en réel). 2. Dashboard client. 3. Cockpit fondatrice (workflow complet Porte 2 → thèse → contrat → `signMandate` → suivi).

**À valider** : Q1 (une app) · Q2 (magic-link + Resend ou hand-roll) · Q3 (lecture réelle) · la **tension RLS** (connexion propriétaire en lecture serveur, ou policy founder-read-all).
