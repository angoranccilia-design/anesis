/**
 * Copie bilingue du site public — anglais UK (défaut) + français (France).
 * `getCopy(lang)` renvoie l'ensemble résolu pour la langue.
 * Registre : clair, concret, professionnel. Pas de métaphores littéraires.
 * Positionnement : hôtels indépendants britanniques uniquement. £ jamais $.
 * Établissements cités = FICTIFS, marqués illustratifs ; aucun chiffre présenté comme un résultat réel.
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
      tagline: p(lang, "An underwriting firm for independent hotels", "Une firme d'acquisition pour hôtels indépendants"),
    },
    footer: {
      blurb: p(
        lang,
        "An underwriting firm for independent UK hotels. We measure, in pounds, the direct revenue you're losing to Booking.com and the other OTAs — and we take financial responsibility for recovering it.",
        "Une firme d'acquisition pour hôtels indépendants britanniques. Nous mesurons, en livres, le revenu direct que vous perdez au profit de Booking.com et des autres OTA — et nous assumons la responsabilité financière de le récupérer.",
      ),
      firm: p(lang, "The firm", "La firme"),
      begin: p(lang, "Begin", "Commencer"),
      contact: p(lang, "Contact", "Contact"),
      country: p(lang, "United Kingdom", "Royaume-Uni"),
      rights: p(lang, "All figures in pounds sterling.", "Tous les montants en livres sterling."),
      line: p(lang, "Anesis Acquisition · United Kingdom · Hospitality underwriting", "Anesis Acquisition · Royaume-Uni · Firme d'acquisition hôtelière"),
    },
    demoBadge: p(
      lang,
      "Illustrative example — fictional UK hotels. No figure here is a real client result.",
      "Exemple illustratif — hôtels britanniques fictifs. Aucun chiffre ici n'est un résultat client réel.",
    ),
    home: {
      eyebrow: p(lang, "Direct bookings for independent UK hotels", "Réservations directes pour hôtels indépendants au Royaume-Uni"),
      heroTitleA: p(lang, "More direct bookings.", "Plus de réservations directes."),
      heroTitleB: p(lang, "Less paid to the platforms.", "Moins versé aux plateformes."),
      heroSub: p(
        lang,
        "We help independent UK hotels win back the bookings they lose to Booking.com and the others — and we're paid on the extra revenue we bring in.",
        "Nous aidons les hôtels indépendants britanniques à récupérer les réservations qu'ils perdent au profit de Booking.com et des autres — et nous sommes payés sur le revenu supplémentaire que nous apportons.",
      ),
      ctaPrimary: p(lang, "Request an assessment", "Demander une évaluation"),
      ctaGhost: p(lang, "How we work", "Comment nous travaillons"),
      underEyebrow: p(lang, "Why a firm, not an agency", "Pourquoi une firme, pas une agence"),
      underTitle: p(lang, "We're an underwriting firm — and we work like one.", "Nous sommes une firme d'acquisition — et nous travaillons comme tel."),
      underLede: p(
        lang,
        "That's not a label we borrow to sound serious. We don't run activity and hope it works: we measure the direct revenue you lose to Booking.com and the other OTAs, price exactly what's recoverable, and put our own fee on the outcome.",
        "Ce n'est pas un mot que nous empruntons pour paraître sérieux. Nous ne lançons pas de l'activité en espérant : nous mesurons le revenu direct que vous perdez au profit de Booking.com et des autres OTA, chiffrons précisément ce qui est récupérable, et engageons nos propres honoraires sur le résultat.",
      ),
      under: [
        { h: p(lang, "We price the loss first", "Nous chiffrons la perte d'abord"), b: p(lang, "Before any promise, we put a figure in pounds on what you're losing and what we can recover — measured from your data, not guessed.", "Avant toute promesse, nous mettons un chiffre en livres sur ce que vous perdez et ce que nous pouvons récupérer — mesuré sur vos données, pas deviné.") },
        { h: p(lang, "We carry the risk", "Nous portons le risque"), b: p(lang, "Part of our fee depends on the direct revenue we actually bring back. An agency is paid whatever happens. We aren't.", "Une partie de nos honoraires dépend du revenu direct que nous rapportons réellement. Une agence est payée quoi qu'il arrive. Nous, non.") },
        { h: p(lang, "We're selective", "Nous sommes sélectifs"), b: p(lang, "Like any underwriter, we only take a case when the numbers work — so a mandate with us is a signal in itself.", "Comme tout souscripteur, nous n'acceptons un dossier que si les chiffres suivent — un mandat avec nous est donc un signal en soi.") },
      ],
      hiddenEyebrow: p(lang, "Where the money goes", "Où part l'argent"),
      hiddenTitle: p(lang, "Every booking through a platform costs you 15 to 25% in commission.", "Chaque réservation via une plateforme vous coûte 15 à 25 % de commission."),
      hiddenBody1: p(
        lang,
        "Booking.com, Expedia and the others bring you guests — then take a cut of every stay. But many of those guests already knew your hotel. They booked through the platform because it was easier, or because your own website was slower to answer.",
        "Booking.com, Expedia et les autres vous apportent des clients — puis prélèvent une part sur chaque séjour. Or beaucoup de ces clients connaissaient déjà votre hôtel. Ils sont passés par la plateforme parce que c'était plus simple, ou parce que votre propre site répondait moins vite.",
      ),
      hiddenBody2: p(
        lang,
        "We find those bookings and bring them back to your own website, where they cost you no commission. First we measure how much is at stake — for free.",
        "Nous identifions ces réservations et les ramenons vers votre propre site, où elles ne vous coûtent aucune commission. D'abord, nous mesurons l'enjeu — gratuitement.",
      ),
      sampleCaption: p(lang, "Illustrative · a 28-room country house", "Illustratif · une maison de campagne de 28 chambres"),
      sampleUnder: p(lang, "in direct revenue recovered per month", "de revenu direct récupéré par mois"),
      sampleNote: p(lang, "A sample figure. Yours is measured from your real data.", "Un chiffre indicatif. Le vôtre est mesuré sur vos données réelles."),
      widgetEyebrow: p(lang, "Estimate your loss", "Estimez votre perte"),
      widgetTitle: p(lang, "Move three sliders to see roughly what you're losing.", "Bougez trois curseurs pour voir à peu près ce que vous perdez."),
      widgetSub: p(
        lang,
        "A rough estimate only. Your real figure is measured from your own data, and it's free.",
        "Une estimation approximative seulement. Votre vrai chiffre est mesuré sur vos propres données, et c'est gratuit.",
      ),
      servicesEyebrow: p(lang, "How we recover it", "Comment nous le récupérons"),
      servicesTitle: p(lang, "Every channel that decides whether a guest books direct — run by us.", "Chaque canal qui décide si un client réserve en direct — piloté par nous."),
      services: [
        { h: p(lang, "Your website", "Votre site"), b: p(lang, "We make it as fast and easy to book on as the OTAs — so demand stops leaking to the platforms.", "Nous le rendons aussi rapide et simple pour réserver que les OTA — pour que la demande cesse de fuir vers les plateformes.") },
        { h: p(lang, "Google Business Profile", "Fiche Google Business"), b: p(lang, "We run it so a search for your hotel ends in a direct booking, not a platform click.", "Nous la gérons pour qu'une recherche de votre hôtel finisse en réservation directe, pas en clic vers une plateforme.") },
        { h: p(lang, "Reviews", "Avis"), b: p(lang, "We keep your rating up and reply fast, while reviews still decide bookings.", "Nous maintenons votre note et répondons vite, tant que les avis décident encore des réservations.") },
        { h: p(lang, "Conversion video", "Vidéo de conversion"), b: p(lang, "Short-form video made to convert interest into a direct booking — not to entertain.", "Vidéo courte faite pour transformer l'intérêt en réservation directe — pas pour divertir.") },
        { h: p(lang, "Price monitoring", "Surveillance des prix"), b: p(lang, "We watch your rates across the platforms so they never undercut your own site.", "Nous surveillons vos tarifs sur les plateformes pour qu'ils ne cassent jamais ceux de votre site.") },
        { h: p(lang, "Paid acquisition", "Acquisition payante"), b: p(lang, "Meta and Google Ads that capture demand before a platform can take its cut.", "Meta et Google Ads qui captent la demande avant qu'une plateforme ne prenne sa commission.") },
      ],
      gatesEyebrow: p(lang, "How we work together", "Comment nous travaillons ensemble"),
      gatesTitle: p(lang, "Three steps. You decide after each one.", "Trois étapes. Vous décidez après chacune."),
      feedEyebrow: p(lang, "Your social media", "Vos réseaux sociaux"),
      feedTitle: p(lang, "An abandoned Instagram makes people wonder if the hotel is still open.", "Un Instagram à l'abandon fait douter que l'hôtel soit encore ouvert."),
      feedBody: p(
        lang,
        "Guests check your social media before they book. When it looks neglected, that booking often goes to a platform instead. We run it so it sends demand straight to your own direct channel.",
        "Les clients regardent vos réseaux avant de réserver. Quand ils semblent négligés, cette réservation part souvent vers une plateforme. Nous les pilotons pour qu'ils envoient la demande directement vers votre canal direct.",
      ),
      trajEyebrow: p(lang, "How we're paid", "Comment nous sommes payés"),
      trajTitle: p(lang, "We're paid on the extra revenue we bring in — not on your spend.", "Nous sommes payés sur le revenu supplémentaire que nous apportons — pas sur vos dépenses."),
      trajBody: p(
        lang,
        "The lower line is your direct bookings if nothing changes. The upper line is the same channel after we've worked on it. We earn on the difference.",
        "La courbe basse, ce sont vos réservations directes si rien ne change. La courbe haute, c'est le même canal une fois que nous y avons travaillé. Nous gagnons sur la différence.",
      ),
      trajLink: p(lang, "See how we measure it", "Voir comment nous le mesurons"),
      trajCaption: p(lang, "Illustrative · sample trajectory", "Illustratif · trajectoire indicative"),
      closeTitle: p(lang, "We only take hotels we're confident we can help. Let's find out if yours is one of them.", "Nous n'acceptons que les hôtels que nous sommes sûrs de pouvoir aider. Voyons si le vôtre en fait partie."),
      closeCta: p(lang, "Request your assessment", "Demandez votre évaluation"),
      closeNote: p(
        lang,
        "Write to us and you'll get a reply from someone who knows hospitality — not a call centre, not a script.",
        "Écrivez-nous et vous aurez une réponse de quelqu'un qui connaît l'hôtellerie — pas un centre d'appels, pas un script.",
      ),
      gates: [
        {
          no: "1",
          title: p(lang, "Free assessment", "Évaluation gratuite"),
          body: p(
            lang,
            "We look at your website, your reviews and your booking channels, and we tell you — in pounds — how much direct revenue you're losing and how much we can realistically bring back. If it isn't worth it, we say so.",
            "Nous examinons votre site, vos avis et vos canaux de réservation, et nous vous disons — en livres — combien de revenu direct vous perdez et combien nous pouvons raisonnablement récupérer. Si ça n'en vaut pas la peine, nous vous le disons.",
          ),
        },
        {
          no: "2",
          title: p(lang, "The Acquisition Thesis", "La Thèse d'Acquisition"),
          body: p(
            lang,
            "A written report you pay for and keep: where you're losing money, how much we can recover, and a 90-day plan to do it. It's yours whether you hire us or not.",
            "Un rapport écrit que vous payez et gardez : où vous perdez de l'argent, combien nous pouvons récupérer, et un plan à 90 jours pour y parvenir. Il est à vous, que vous nous engagiez ou non.",
          ),
        },
        {
          no: "3",
          title: p(lang, "The mandate", "Le mandat"),
          body: p(
            lang,
            "We do the work. Part of our fee depends on the extra direct revenue we actually generate — so we only earn well if you do.",
            "Nous faisons le travail. Une partie de nos honoraires dépend du revenu direct supplémentaire que nous générons réellement — nous ne gagnons bien que si vous gagnez.",
          ),
        },
      ],
    },
    about: {
      eyebrow: p(lang, "About", "À propos"),
      title: p(lang, "An underwriting firm for independent UK hotels.", "Une firme d'acquisition pour hôtels indépendants britanniques."),
      lede: p(
        lang,
        "Anesis is an underwriting firm, and we mean it literally. We take on one problem — the direct revenue you lose to Booking.com and the other OTAs — measure it precisely, price what's recoverable, and take financial responsibility for bringing it back.",
        "Anesis est une firme d'acquisition, au sens strict. Nous prenons en charge un seul problème — le revenu direct que vous perdez au profit de Booking.com et des autres OTA — le mesurons précisément, chiffrons ce qui est récupérable, et assumons la responsabilité financière de le récupérer.",
      ),
      body: [
        p(lang, "We're not a marketing agency. We don't start by spending your money on ads. We start by measuring, in pounds, how much direct revenue you're losing and how much we can realistically bring back.", "Nous ne sommes pas une agence de marketing. Nous ne commençons pas par dépenser votre argent en publicité. Nous commençons par mesurer, en livres, combien de revenu direct vous perdez et combien nous pouvons raisonnablement récupérer."),
        p(lang, "If the numbers don't add up, we tell you honestly and we don't take you on. We'd rather turn down a hotel than promise results we can't deliver.", "Si les chiffres ne suivent pas, nous vous le disons honnêtement et nous ne vous prenons pas. Nous préférons refuser un hôtel que promettre des résultats que nous ne pouvons pas tenir."),
      ],
      valuesEyebrow: p(lang, "How we work", "Notre façon de travailler"),
      values: [
        { h: p(lang, "We measure first", "Nous mesurons d'abord"), b: p(lang, "Every engagement starts with a real number from your own data, not a sales pitch.", "Chaque mission commence par un chiffre réel issu de vos données, pas par un argumentaire.") },
        { h: p(lang, "Paid on results", "Payés aux résultats"), b: p(lang, "Part of our fee depends on the extra direct revenue we generate for you.", "Une partie de nos honoraires dépend du revenu direct supplémentaire que nous générons pour vous.") },
        { h: p(lang, "We stay small", "Nous restons petits"), b: p(lang, "We turn down most hotels we assess, so we can fully commit to the ones we take.", "Nous refusons la plupart des hôtels que nous évaluons, pour nous consacrer pleinement à ceux que nous prenons.") },
      ],
    },
    method: {
      eyebrow: p(lang, "Method", "Méthode"),
      title: p(lang, "Five places where hotels lose direct bookings.", "Cinq endroits où les hôtels perdent des réservations directes."),
      lede: p(
        lang,
        "The Anesis Revenue Leak Index checks five areas where independent hotels lose direct bookings. We measure each one from your real data, then build the plan around what we find.",
        "L'Anesis Revenue Leak Index examine cinq domaines où les hôtels indépendants perdent des réservations directes. Nous mesurons chacun sur vos données réelles, puis construisons le plan autour de ce que nous trouvons.",
      ),
      pillarsEyebrow: p(lang, "The five checks", "Les cinq points de contrôle"),
      pillars: [
        { h: p(lang, "Speed & conversion", "Vitesse & conversion"), b: p(lang, "How fast your website and your team turn an enquiry into a confirmed direct booking.", "La vitesse à laquelle votre site et votre équipe transforment une demande en réservation directe confirmée.") },
        { h: p(lang, "Reviews", "Avis"), b: p(lang, "Your rating, how many reviews you have, and how quickly you reply to them.", "Votre note, le nombre d'avis, et la rapidité avec laquelle vous y répondez.") },
        { h: p(lang, "Platform commissions", "Commissions des plateformes"), b: p(lang, "How much you pay Booking.com and the others for guests you could have won directly.", "Ce que vous versez à Booking.com et aux autres pour des clients que vous auriez pu gagner en direct.") },
        { h: p(lang, "Retargeting", "Retargeting"), b: p(lang, "Whether visitors who leave without booking are ever brought back.", "Le fait que les visiteurs qui partent sans réserver soient ramenés ou non.") },
        { h: p(lang, "Social presence", "Présence sociale"), b: p(lang, "Whether your social media reassures guests and brings in bookings, or sits neglected.", "Le fait que vos réseaux rassurent les clients et apportent des réservations, ou restent négligés.") },
      ],
    },
    results: {
      eyebrow: p(lang, "Results", "Résultats"),
      title: p(lang, "We're paid on the extra revenue we bring in.", "Nous sommes payés sur le revenu supplémentaire que nous apportons."),
      lede: p(
        lang,
        "Anesis is a new firm. The figures below are examples that show how we measure a recovery — they are not client results. Your real numbers will come from your own data.",
        "Anesis est une firme récente. Les chiffres ci-dessous sont des exemples qui montrent comment nous mesurons une récupération — ce ne sont pas des résultats clients. Vos vrais chiffres viendront de vos propres données.",
      ),
      naEyebrow: p(lang, "When we say no", "Quand nous disons non"),
      naTitle: p(lang, "Sometimes the most useful thing we can tell you is: you don't need us.", "Parfois, la chose la plus utile que nous puissions vous dire, c'est : vous n'avez pas besoin de nous."),
      naBody: p(
        lang,
        "If your assessment shows you're already running your direct bookings well, we tell you and we stop. We won't invent a problem to sell you a solution.",
        "Si votre évaluation montre que vous gérez déjà bien vos réservations directes, nous vous le disons et nous nous arrêtons. Nous n'inventerons pas un problème pour vous vendre une solution.",
      ),
    },
    diagnostic: {
      eyebrow: p(lang, "The assessment · free", "L'évaluation · gratuite"),
      title: p(lang, "Request your assessment", "Demandez votre évaluation"),
      lede: p(
        lang,
        "Tell us where to look. We measure your Anesis Revenue Leak Index from your data, work out how much you can recover, and reply ourselves — free, and with no obligation.",
        "Dites-nous où regarder. Nous mesurons votre Anesis Revenue Leak Index sur vos données, calculons combien vous pouvez récupérer, et répondons nous-mêmes — gratuit, sans engagement.",
      ),
    },
    contact: {
      eyebrow: p(lang, "Contact", "Contact"),
      title: p(lang, "Write to us", "Écrivez-nous"),
      lede: p(
        lang,
        "A few lines are enough. You'll get a reply from someone who knows hospitality — not a call centre, not a script.",
        "Quelques lignes suffisent. Vous aurez une réponse de quelqu'un qui connaît l'hôtellerie — pas un centre d'appels, pas un script.",
      ),
    },
    journal: {
      eyebrow: p(lang, "The Anesis Journal", "Le Journal Anesis"),
      lead: p(lang, "This month's lead", "L'article du mois"),
      read: p(lang, "min · read the piece →", "min · lire l'article →"),
      note: p(lang, "New field notes each month.", "De nouvelles notes de terrain chaque mois."),
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
      receivedTitle: p(lang, "Thank you — we've got your message.", "Merci — nous avons bien reçu votre message."),
      receivedSub: p(lang, "You'll hear back from someone who knows hospitality, within two working days.", "Vous aurez une réponse de quelqu'un qui connaît l'hôtellerie, sous deux jours ouvrés."),
      err: p(lang, "Something went wrong — please try again, or email us directly.", "Une erreur est survenue — réessayez, ou écrivez-nous directement."),
    },
    back: p(lang, "← Back to the Journal", "← Retour au Journal"),
    readMin: p(lang, "min", "min"),
  };
}

export type SiteCopy = ReturnType<typeof getCopy>;
