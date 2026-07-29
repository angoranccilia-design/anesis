/**
 * Copie bilingue du site public — anglais UK (défaut) + français (France).
 * `getCopy(lang)` renvoie l'ensemble résolu pour la langue. Aucune référence à un autre marché :
 * positionnement pour hôteliers indépendants britanniques uniquement. Établissements cités = FICTIFS,
 * marqués comme illustratifs ; £ jamais $ ; aucun chiffre présenté comme un résultat réel.
 */
import type { Lang } from "@/lib/i18n";

const p = <T,>(lang: Lang, en: T, fr: T): T => (lang === "fr" ? fr : en);

export function getCopy(lang: Lang) {
  return {
    nav: {
      about: p(lang, "About", "À propos"),
      method: p(lang, "Method", "Méthode"),
      results: p(lang, "Results", "Résultats"),
      journal: p(lang, "Journal", "Journal"),
      contact: p(lang, "Contact", "Contact"),
      cta: p(lang, "Request an assessment", "Demander une évaluation"),
      tagline: p(lang, "Hospitality Acquisition Firm", "Firme d'acquisition hôtelière"),
    },
    footer: {
      blurb: p(
        lang,
        "A hospitality acquisition underwriting firm for independent British hotels. We measure, in pounds, the direct revenue quietly leaving your hotel — and we recover it.",
        "Une firme de souscription d'acquisition hôtelière pour les hôtels indépendants britanniques. Nous mesurons, en livres, le revenu direct qui fuit discrètement votre hôtel — et nous le récupérons.",
      ),
      firm: p(lang, "The firm", "La firme"),
      begin: p(lang, "Begin", "Commencer"),
      contact: p(lang, "Contact", "Contact"),
      country: p(lang, "United Kingdom", "Royaume-Uni"),
      rights: p(lang, "All figures in pounds sterling.", "Tous les montants en livres sterling."),
      line: p(lang, "Anesis Acquisition · United Kingdom · Underwriting hospitality", "Anesis Acquisition · Royaume-Uni · Souscription hôtelière"),
    },
    demoBadge: p(
      lang,
      "Illustrative — fictional British establishments. No figure here is a real client result.",
      "Illustratif — établissements britanniques fictifs. Aucun chiffre ici n'est un résultat client réel.",
    ),
    home: {
      eyebrow: p(lang, "Hospitality acquisition underwriting · United Kingdom", "Souscription d'acquisition hôtelière · Royaume-Uni"),
      heroTitleA: p(lang, "The guests are already yours.", "Les clients sont déjà à vous."),
      heroTitleB: p(lang, "You're paying to be introduced to them.", "Vous payez pour qu'on vous les présente."),
      heroSub: p(
        lang,
        "A fifth of the people who would have booked you directly are quietly paying a platform to introduce them to a hotel they had already found. We don't ask you to spend more on marketing. We show you, in pounds, exactly where that fifth is going — then we go and get it back.",
        "Un cinquième des personnes qui auraient réservé en direct paient discrètement une plateforme pour qu'elle leur présente un hôtel qu'elles avaient déjà trouvé. Nous ne vous demandons pas de dépenser plus en marketing. Nous vous montrons, en livres, où va exactement ce cinquième — puis nous allons le récupérer.",
      ),
      ctaPrimary: p(lang, "Request an assessment", "Demander une évaluation"),
      ctaGhost: p(lang, "How we work", "Comment nous travaillons"),
      hiddenEyebrow: p(lang, "The number no one shows you", "Le chiffre que personne ne vous montre"),
      hiddenTitle: p(lang, "Most of what a hotel loses never appears on an invoice.", "L'essentiel de ce qu'un hôtel perd n'apparaît sur aucune facture."),
      hiddenBody1: p(
        lang,
        "It hides in a website that answers a second too slowly, in a review left unanswered for six hours, in a rate that quietly undercuts your own front desk, in demand that arrives warm and leaves unmet. None of it is dramatic. All of it adds up.",
        "Cela se cache dans un site qui répond une seconde trop tard, un avis laissé sans réponse six heures, un tarif qui casse discrètement celui de votre réception, une demande qui arrive chaude et repart insatisfaite. Rien de spectaculaire. Tout s'additionne.",
      ),
      hiddenBody2: p(
        lang,
        "An underwriter's habit is to put a figure on precisely that — the quiet, recoverable loss — before promising anything. So that is where we begin.",
        "Le réflexe d'un souscripteur est de chiffrer précisément cela — la perte discrète et récupérable — avant de promettre quoi que ce soit. C'est donc par là que nous commençons.",
      ),
      sampleCaption: p(lang, "Illustrative · a 28-key country house", "Illustratif · une maison de campagne de 28 clés"),
      sampleUnder: p(lang, "recovered per month, once the direct channel is theirs again", "récupérés par mois, une fois le canal direct redevenu le leur"),
      sampleNote: p(lang, "A sample figure. Your own is measured, not assumed.", "Un chiffre indicatif. Le vôtre est mesuré, jamais supposé."),
      widgetEyebrow: p(lang, "Try it for a moment", "Essayez un instant"),
      widgetTitle: p(lang, "Move three dials. See roughly what's at stake.", "Bougez trois curseurs. Voyez à peu près l'enjeu."),
      widgetSub: p(
        lang,
        "A rough sense of the exposure — no more. The real figure is measured from your own data, and it is free.",
        "Un ordre de grandeur de l'exposition — rien de plus. Le vrai chiffre se mesure sur vos propres données, et il est gratuit.",
      ),
      gatesEyebrow: p(lang, "How the relationship is built", "Comment la relation se construit"),
      gatesTitle: p(lang, "Three gates, in order. You only walk through the ones that earn their place.", "Trois portes, dans l'ordre. Vous ne franchissez que celles qui méritent leur place."),
      feedEyebrow: p(lang, "The fifth pillar · presence", "Le cinquième pilier · présence"),
      feedTitle: p(lang, "A feed that looks abandoned quietly suggests the rooms might be too.", "Un feed qui semble à l'abandon laisse penser que les chambres le sont aussi."),
      feedBody: p(
        lang,
        "Free acquisition demand hides in a consistent, considered social presence. Where it's thin, the direct booking never starts. Coherence is the point — not volume.",
        "La demande d'acquisition gratuite se cache dans une présence sociale cohérente et soignée. Là où elle est faible, la réservation directe ne démarre jamais. L'enjeu, c'est la cohérence — pas le volume.",
      ),
      trajEyebrow: p(lang, "What recovery looks like", "À quoi ressemble la récupération"),
      trajTitle: p(lang, "We are paid on the distance between two lines.", "Nous sommes payés sur l'écart entre deux courbes."),
      trajBody: p(
        lang,
        "The flat line is your direct channel left alone. The rising one is the same channel, recovered. Our reward is tied to the gap — nothing else.",
        "La courbe plate, c'est votre canal direct laissé seul. La courbe montante, c'est le même canal, récupéré. Notre rémunération est liée à l'écart — rien d'autre.",
      ),
      trajLink: p(lang, "See the full record", "Voir le dossier complet"),
      trajCaption: p(lang, "Illustrative · sample trajectory", "Illustratif · trajectoire indicative"),
      closeTitle: p(lang, "We refuse more hotels than we accept. Let us see whether yours is one we'd fight for.", "Nous refusons plus d'hôtels que nous n'en acceptons. Voyons si le vôtre est de ceux pour lesquels nous nous battrions."),
      closeCta: p(lang, "Request your assessment", "Demandez votre évaluation"),
      closeNote: p(
        lang,
        "Write to us yourself, and you'll hear back from someone who understands hospitality — not a queue, and never a script.",
        "Écrivez-nous, et vous aurez une réponse de quelqu'un qui comprend l'hôtellerie — pas une file d'attente, jamais un script.",
      ),
      gates: [
        {
          no: "I",
          title: p(lang, "The assessment", "L'évaluation"),
          body: p(
            lang,
            "Free, and grounded in your real data — your website, your reviews, your channel mix. We put a pounds-and-pence figure on what is recoverable, and tell you plainly if there isn't enough there to be worth either of our time.",
            "Gratuite, et fondée sur vos données réelles — votre site, vos avis, votre mix de canaux. Nous chiffrons en livres ce qui est récupérable, et vous disons franchement s'il n'y a pas assez pour que cela vaille le temps de l'un ou l'autre.",
          ),
        },
        {
          no: "II",
          title: p(lang, "The underwriting", "La souscription"),
          body: p(
            lang,
            "A paid, written Acquisition Thesis: where the loss sits, pillar by pillar, the sum we believe can be recovered, and the ninety-day plan to do it. It is a document you own, whether or not you go further.",
            "Une Thèse d'Acquisition écrite et payante : où se loge la perte, pilier par pilier, la somme que nous pensons récupérable, et le plan à quatre-vingt-dix jours pour y parvenir. Un document qui vous appartient, que vous alliez plus loin ou non.",
          ),
        },
        {
          no: "III",
          title: p(lang, "The mandate", "Le mandat"),
          body: p(
            lang,
            "The engagement itself. We take financial responsibility for the recovery, and our reward is tied to what we actually return to your direct channel — never to how much you spend.",
            "L'engagement lui-même. Nous prenons la responsabilité financière de la récupération, et notre rémunération est liée à ce que nous rendons réellement à votre canal direct — jamais à ce que vous dépensez.",
          ),
        },
      ],
    },
    about: {
      eyebrow: p(lang, "About", "À propos"),
      title: p(lang, "An underwriting firm, working quietly for a small number of British hotels.", "Une firme de souscription, au service discret d'un petit nombre d'hôtels britanniques."),
      lede: p(
        lang,
        "Anesis is being built in the United Kingdom for independent hotels of character. We borrow a discipline from finance — underwriting — and apply it to the revenue an independent hotel loses without ever seeing it.",
        "Anesis se construit au Royaume-Uni pour les hôtels indépendants de caractère. Nous empruntons une discipline à la finance — la souscription — et l'appliquons au revenu qu'un hôtel indépendant perd sans jamais le voir.",
      ),
      body: [
        p(lang, "We are not another marketing agency, and we don't begin with activity. We begin with a figure: where the revenue leaks, in pounds, and how much of it can honestly be recovered.", "Nous ne sommes pas une agence de marketing de plus, et nous ne partons pas de l'activité. Nous partons d'un chiffre : où le revenu fuit, en livres, et quelle part peut honnêtement être récupérée."),
        p(lang, "That inversion changes everything. It means, on occasion, telling a hotel there isn't enough recoverable loss to justify working together — and meaning it. That is the whole introduction.", "Cette inversion change tout. Cela signifie parfois dire à un hôtel qu'il n'y a pas assez de perte récupérable pour justifier une collaboration — et le penser. Voilà toute la présentation."),
      ],
      valuesEyebrow: p(lang, "How we hold ourselves", "Notre tenue"),
      values: [
        { h: p(lang, "Measure before we promise", "Mesurer avant de promettre"), b: p(lang, "Every engagement starts from a number taken from your own data, never a pitch.", "Chaque engagement part d'un chiffre issu de vos propres données, jamais d'un argumentaire.") },
        { h: p(lang, "Paid on the result", "Payés au résultat"), b: p(lang, "Part of our reward is tied to the direct revenue we actually return to you.", "Une partie de notre rémunération est liée au revenu direct que nous vous rendons réellement.") },
        { h: p(lang, "Small on purpose", "Petits volontairement"), b: p(lang, "We decline most hotels we assess, so every mandate is one we believe in.", "Nous refusons la plupart des hôtels évalués, pour que chaque mandat soit un mandat auquel nous croyons.") },
      ],
    },
    method: {
      eyebrow: p(lang, "Method", "Méthode"),
      title: p(lang, "Five pillars. One measured figure. A plan that follows from the number.", "Cinq piliers. Un chiffre mesuré. Un plan qui découle du chiffre."),
      lede: p(
        lang,
        "The Anesis Revenue Leak Index reads five places an independent hotel loses direct revenue. It is measured, not guessed — and everything we then do is derived from it.",
        "L'Anesis Revenue Leak Index lit cinq endroits où un hôtel indépendant perd du revenu direct. Il est mesuré, pas deviné — et tout ce que nous faisons ensuite en découle.",
      ),
      pillarsEyebrow: p(lang, "The five pillars", "Les cinq piliers"),
      pillars: [
        { h: p(lang, "Speed & conversion", "Vitesse & conversion"), b: p(lang, "How quickly your site and your team turn a warm enquiry into a direct booking.", "La vitesse à laquelle votre site et votre équipe transforment une demande chaude en réservation directe.") },
        { h: p(lang, "Reviews", "Avis"), b: p(lang, "Volume, rating and how promptly reviews are answered while they still matter.", "Volume, note, et rapidité de réponse aux avis tant qu'ils comptent encore.") },
        { h: p(lang, "OTA parity", "Parité OTA"), b: p(lang, "How much you pay platforms to hand back demand you had already earned.", "Ce que vous payez aux plateformes pour qu'elles vous rendent une demande déjà acquise.") },
        { h: p(lang, "Retargeting", "Retargeting"), b: p(lang, "Whether warm demand that drifts away is ever recaptured.", "Le fait que la demande chaude qui s'éloigne soit un jour récupérée ou non.") },
        { h: p(lang, "Social presence", "Présence sociale"), b: p(lang, "A consistent, considered presence — free acquisition demand, or a silent leak.", "Une présence cohérente et soignée — demande d'acquisition gratuite, ou fuite silencieuse.") },
      ],
    },
    results: {
      eyebrow: p(lang, "Results", "Résultats"),
      title: p(lang, "We are paid on the distance between two lines.", "Nous sommes payés sur l'écart entre deux courbes."),
      lede: p(
        lang,
        "Anesis is a new British firm; the trajectories below are illustrative models of how a recovery is measured, not client results. Real figures will be measured, mandate by mandate, from each hotel's own data.",
        "Anesis est une firme britannique neuve ; les trajectoires ci-dessous sont des modèles illustratifs de la façon dont une récupération se mesure, pas des résultats clients. Les vrais chiffres seront mesurés, mandat par mandat, à partir des données de chaque hôtel.",
      ),
      naEyebrow: p(lang, "When we decline", "Quand nous refusons"),
      naTitle: p(lang, "A clear-eyed no is often the most valuable thing we can offer.", "Un non lucide est souvent ce que nous pouvons offrir de plus précieux."),
      naBody: p(
        lang,
        "Where the assessment finds a hotel already running its direct channel well, we say so and we stop. There is no honest engagement to be had, and we won't invent one.",
        "Lorsque l'évaluation trouve un hôtel qui gère déjà bien son canal direct, nous le disons et nous arrêtons. Il n'y a pas d'engagement honnête à proposer, et nous n'en inventerons pas.",
      ),
    },
    diagnostic: {
      eyebrow: p(lang, "The assessment · free", "L'évaluation · gratuite"),
      title: p(lang, "Request your assessment", "Demandez votre évaluation"),
      lede: p(
        lang,
        "Tell us where to look. We measure your Anesis Revenue Leak Index from public data, put a figure on the recoverable loss, and reply ourselves — free, and with no obligation.",
        "Dites-nous où regarder. Nous mesurons votre Anesis Revenue Leak Index à partir des données publiques, chiffrons la perte récupérable, et vous répondons nous-mêmes — gratuitement et sans engagement.",
      ),
    },
    contact: {
      eyebrow: p(lang, "Contact", "Contact"),
      title: p(lang, "Write to us", "Écrivez-nous"),
      lede: p(
        lang,
        "A short note is enough. You'll hear back from someone who understands hospitality — not a queue, and never a script.",
        "Quelques lignes suffisent. Vous aurez une réponse de quelqu'un qui comprend l'hôtellerie — pas une file d'attente, jamais un script.",
      ),
    },
    journal: {
      eyebrow: p(lang, "The Anesis Journal", "Le Journal Anesis"),
      lead: p(lang, "This month's lead", "L'article du mois"),
      read: p(lang, "min · read the piece →", "min · lire l'article →"),
      note: p(lang, "Written in English. A French edition is planned.", "Rédigé en anglais. Une édition française est prévue."),
    },
    form: {
      name: p(lang, "Your name", "Votre nom"),
      email: p(lang, "Email", "Email"),
      hotel: p(lang, "Hotel", "Hôtel"),
      website: p(lang, "Website", "Site web"),
      submit: p(lang, "Request my assessment", "Demander mon évaluation"),
      send: p(lang, "Send", "Envoyer"),
      sending: p(lang, "Sending…", "Envoi…"),
      msgAssessment: p(lang, "Anything we should know before we look?", "Quelque chose à savoir avant que nous regardions ?"),
      msgContact: p(lang, "How can we help?", "Comment pouvons-nous aider ?"),
      receivedLabel: p(lang, "Received", "Bien reçu"),
      receivedTitle: p(lang, "Thank you — your note is with us.", "Merci — votre message nous est parvenu."),
      receivedSub: p(lang, "You'll hear back from someone who understands hospitality, and soon.", "Vous aurez bientôt une réponse de quelqu'un qui comprend l'hôtellerie."),
      err: p(lang, "Something went wrong — please try again, or email us directly.", "Une erreur est survenue — réessayez, ou écrivez-nous directement."),
    },
    back: p(lang, "← Back to the Journal", "← Retour au Journal"),
    readMin: p(lang, "min", "min"),
  };
}

export type SiteCopy = ReturnType<typeof getCopy>;
