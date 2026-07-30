/**
 * Matrice de contenu du composant <Hero/> — BILINGUE (EN-UK / FR). Un seul composant réutilisable.
 * Le média de fond et le lien de nav actif ne changent pas ; les 4 champs texte/CTA sont traduits.
 * Fonds : images locales (hospitality UK) dans /public/img. Accueil : image manoir + zoom cinématique.
 */
import type { Lang } from "@/lib/i18n";

export type HeroPageKey = "home" | "method" | "results" | "insights" | "contact" | "about" | "diagnostic";

/** Contenu résolu (une langue) passé au composant. */
export interface HeroContent {
  key: HeroPageKey;
  activeNav: "method" | "results" | "insights" | "contact" | null;
  backgroundType: "video" | "image";
  backgroundSrc: string;
  poster?: string;
  zoom?: boolean;
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
}

type Bi = Record<Lang, string>;
interface HeroRaw {
  activeNav: HeroContent["activeNav"];
  backgroundType: "video" | "image";
  backgroundSrc: string;
  poster?: string;
  zoom?: boolean;
  eyebrow: Bi;
  title: Bi;
  description: Bi;
  primaryCta: Bi;
  secondaryCta: Bi;
}

export const HERO_NAV: { key: "method" | "results" | "insights" | "contact"; label: string; href: string }[] = [
  { key: "method", label: "Our Approach", href: "/method" },
  { key: "results", label: "Client Results", href: "/results" },
  { key: "insights", label: "Insights", href: "/journal" },
  { key: "contact", label: "Contact", href: "/contact" },
];

const BOOK: Bi = { en: "Book a Diagnostic", fr: "Demander une évaluation" };

const RAW: Record<HeroPageKey, HeroRaw> = {
  home: {
    activeNav: null,
    backgroundType: "image",
    backgroundSrc: "/img/hero-opt-4.jpg",
    zoom: true,
    eyebrow: { en: "Independent Hospitality · United Kingdom", fr: "Hôtellerie indépendante · Royaume-Uni" },
    title: {
      en: "We recover the revenue you didn't know you were losing.",
      fr: "Nous récupérons le revenu que vous ne saviez pas perdre.",
    },
    description: {
      en: "An underwriting firm for independent hotels, spas, and glamping estates — we price the leak, we recover it, and we're paid on what we return.",
      fr: "Une firme de souscription pour hôtels, spas et domaines de glamping indépendants — nous chiffrons la fuite, nous la récupérons, et nous sommes payés sur ce que nous rapportons.",
    },
    primaryCta: { en: "See Your Leak Index", fr: "Voir votre Leak Index" },
    secondaryCta: { en: "How It Works", fr: "Comment ça marche" },
  },
  method: {
    activeNav: "method",
    backgroundType: "image",
    backgroundSrc: "/img/hero-opt-7.jpg",
    eyebrow: { en: "Our Method", fr: "Notre méthode" },
    title: { en: "We price the leak before we promise anything.", fr: "Nous chiffrons la fuite avant toute promesse." },
    description: {
      en: "A three-step underwriting process — evaluation, diagnosis, mandate — built to be verified, not just trusted.",
      fr: "Un processus de souscription en trois étapes — évaluation, diagnostic, mandat — fait pour être vérifié, pas seulement cru.",
    },
    primaryCta: { en: "See the Process", fr: "Voir le processus" },
    secondaryCta: BOOK,
  },
  results: {
    activeNav: "results",
    backgroundType: "image",
    backgroundSrc: "/img/new-resort-infinity-pool.jpg",
    eyebrow: { en: "Client Results", fr: "Résultats clients" },
    title: {
      en: "What we recovered, measured against the market.",
      fr: "Ce que nous avons récupéré, mesuré face au marché.",
    },
    description: {
      en: "Every result is benchmarked against a control group of comparable properties — never against our own claim.",
      fr: "Chaque résultat est comparé à un groupe témoin d'établissements comparables — jamais à notre propre affirmation.",
    },
    primaryCta: { en: "View Case Studies", fr: "Voir les études de cas" },
    secondaryCta: BOOK,
  },
  insights: {
    activeNav: "insights",
    backgroundType: "image",
    backgroundSrc: "/img/new-eco-lodge-01.jpg",
    eyebrow: { en: "Journal", fr: "Journal" },
    title: {
      en: "Notes on distribution, ownership, and the cost of not knowing.",
      fr: "Notes sur la distribution, la propriété, et le coût de l'ignorance.",
    },
    description: {
      en: "Field notes from our work with independent hotels, spas, and glamping estates across the UK.",
      fr: "Notes de terrain de notre travail avec des hôtels, spas et domaines de glamping indépendants au Royaume-Uni.",
    },
    primaryCta: { en: "Read the Latest", fr: "Lire les derniers articles" },
    secondaryCta: BOOK,
  },
  contact: {
    activeNav: "contact",
    backgroundType: "image",
    backgroundSrc: "/img/new-hotel-hall-chandelier.jpg",
    eyebrow: { en: "Get in Touch", fr: "Nous contacter" },
    title: { en: "Let's put a number on it.", fr: "Mettons un chiffre dessus." },
    description: {
      en: "Tell us about your property. We'll tell you, in pounds, what your distribution is really costing you.",
      fr: "Parlez-nous de votre établissement. Nous vous dirons, en livres, ce que votre distribution vous coûte vraiment.",
    },
    primaryCta: { en: "Start the Conversation", fr: "Démarrer la conversation" },
    secondaryCta: BOOK,
  },
  about: {
    activeNav: null,
    backgroundType: "image",
    backgroundSrc: "/img/hero-opt-5.jpg",
    eyebrow: { en: "About", fr: "À propos" },
    title: {
      en: "An underwriting firm, working quietly for British hotels.",
      fr: "Une firme de souscription, au service discret des hôtels britanniques.",
    },
    description: {
      en: "We borrow a discipline from finance — underwriting — and apply it to the revenue an independent hotel loses without ever seeing it.",
      fr: "Nous empruntons une discipline à la finance — la souscription — et l'appliquons au revenu qu'un hôtel indépendant perd sans jamais le voir.",
    },
    primaryCta: { en: "Our Method", fr: "Notre méthode" },
    secondaryCta: BOOK,
  },
  diagnostic: {
    activeNav: null,
    backgroundType: "image",
    backgroundSrc: "/img/uk-estate.jpg",
    eyebrow: { en: "The assessment · free", fr: "L'évaluation · gratuite" },
    title: { en: "Request your assessment.", fr: "Demandez votre évaluation." },
    description: {
      en: "Tell us where to look. We measure your Anesis Revenue Leak Index from your real data, price the recoverable loss, and reply ourselves — free, and with no obligation.",
      fr: "Dites-nous où regarder. Nous mesurons votre Anesis Revenue Leak Index sur vos données réelles, chiffrons la perte récupérable, et vous répondons nous-mêmes — gratuitement et sans engagement.",
    },
    primaryCta: { en: "Start below", fr: "Commencez ci-dessous" },
    secondaryCta: { en: "How It Works", fr: "Comment ça marche" },
  },
};

/** Contenu du hero résolu pour une langue. */
export function getHero(lang: Lang, key: HeroPageKey): HeroContent {
  const r = RAW[key];
  return {
    key,
    activeNav: r.activeNav,
    backgroundType: r.backgroundType,
    backgroundSrc: r.backgroundSrc,
    poster: r.poster,
    zoom: r.zoom,
    eyebrow: r.eyebrow[lang],
    title: r.title[lang],
    description: r.description[lang],
    primaryCta: r.primaryCta[lang],
    secondaryCta: r.secondaryCta[lang],
  };
}

/** Version EN résolue (utilisée par les pages de prévisualisation internes). */
export const HERO_PAGES: Record<HeroPageKey, HeroContent> = Object.fromEntries(
  (Object.keys(RAW) as HeroPageKey[]).map((k) => [k, getHero("en", k)]),
) as Record<HeroPageKey, HeroContent>;
