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
    eyebrow: { en: "Hospitality Underwriting Firm · United Kingdom", fr: "Cabinet de souscription hôtelière · Royaume-Uni" },
    title: {
      en: "More direct bookings. Less paid to the platforms.",
      fr: "Plus de réservations directes. Moins versé aux plateformes.",
    },
    description: {
      en: "We help independent UK hotels, spas and glamping sites win back the bookings they lose to Booking.com and the others — and we're paid on the extra revenue we bring in.",
      fr: "Nous aidons les hôtels, spas et sites de glamping indépendants britanniques à récupérer les réservations perdues au profit de Booking.com et des autres — et nous sommes payés sur le revenu supplémentaire que nous apportons.",
    },
    primaryCta: { en: "See what you're losing", fr: "Voir ce que vous perdez" },
    secondaryCta: { en: "How it works", fr: "Comment ça marche" },
  },
  method: {
    activeNav: "method",
    backgroundType: "image",
    backgroundSrc: "/img/hero-opt-7.jpg",
    eyebrow: { en: "Our Method", fr: "Notre méthode" },
    title: { en: "We measure what you're losing\nbefore we promise anything.", fr: "Nous mesurons vos pertes\navant toute promesse." },
    description: {
      en: "A clear three-step process — free assessment, written thesis, then a mandate. Built so you can check every number.",
      fr: "Un processus clair en trois étapes — évaluation gratuite, thèse écrite, puis mandat. Conçu pour que vous puissiez vérifier chaque chiffre.",
    },
    primaryCta: { en: "See the process", fr: "Voir le processus" },
    secondaryCta: BOOK,
  },
  results: {
    activeNav: "results",
    backgroundType: "image",
    backgroundSrc: "/img/new-resort-infinity-pool.jpg",
    eyebrow: { en: "Client Results", fr: "Résultats clients" },
    title: {
      en: "What we recover, and how we measure it.",
      fr: "Ce que nous récupérons, et comment nous le mesurons.",
    },
    description: {
      en: "Every figure is compared against similar hotels — never against our own word.",
      fr: "Chaque chiffre est comparé à des hôtels similaires — jamais à notre propre parole.",
    },
    primaryCta: { en: "View examples", fr: "Voir les exemples" },
    secondaryCta: BOOK,
  },
  insights: {
    activeNav: "insights",
    backgroundType: "image",
    backgroundSrc: "/img/new-eco-lodge-01.jpg",
    eyebrow: { en: "Journal", fr: "Journal" },
    title: {
      en: "Practical notes on getting more direct bookings.",
      fr: "Notes pratiques pour obtenir plus de réservations directes.",
    },
    description: {
      en: "What we learn working with independent hotels, spas and glamping sites across the UK.",
      fr: "Ce que nous apprenons en travaillant avec des hôtels, spas et sites de glamping indépendants au Royaume-Uni.",
    },
    primaryCta: { en: "Read the latest", fr: "Lire les derniers articles" },
    secondaryCta: BOOK,
  },
  contact: {
    activeNav: "contact",
    backgroundType: "image",
    backgroundSrc: "/img/new-hotel-hall-chandelier.jpg",
    eyebrow: { en: "Get in Touch", fr: "Nous contacter" },
    title: { en: "Let's see what you're losing.", fr: "Voyons ce que vous perdez." },
    description: {
      en: "Tell us about your hotel. We'll tell you, in pounds, what the platforms are really costing you.",
      fr: "Parlez-nous de votre hôtel. Nous vous dirons, en livres, ce que les plateformes vous coûtent vraiment.",
    },
    primaryCta: { en: "Start the conversation", fr: "Démarrer la conversation" },
    secondaryCta: BOOK,
  },
  about: {
    activeNav: null,
    backgroundType: "image",
    backgroundSrc: "/img/hero-opt-5.jpg",
    eyebrow: { en: "About", fr: "À propos" },
    title: {
      en: "A UK firm that gets independent hotels more direct bookings.",
      fr: "Une firme britannique qui obtient plus de réservations directes pour les hôtels indépendants.",
    },
    description: {
      en: "We find where you lose bookings to the platforms — and where slow replies and weak pricing cost you guests — then we fix it.",
      fr: "Nous trouvons où vous perdez des réservations au profit des plateformes — et où des réponses lentes et une tarification faible vous coûtent des clients — puis nous corrigeons cela.",
    },
    primaryCta: { en: "Our method", fr: "Notre méthode" },
    secondaryCta: BOOK,
  },
  diagnostic: {
    activeNav: null,
    backgroundType: "image",
    backgroundSrc: "/img/uk-estate.jpg",
    eyebrow: { en: "The assessment · free", fr: "L'évaluation · gratuite" },
    title: { en: "Request your assessment.", fr: "Demandez votre évaluation." },
    description: {
      en: "Tell us where to look. We measure your Anesis Revenue Leak Index from your real data, work out how much you can recover, and reply ourselves — free, and with no obligation.",
      fr: "Dites-nous où regarder. Nous mesurons votre Anesis Revenue Leak Index sur vos données réelles, calculons combien vous pouvez récupérer, et vous répondons nous-mêmes — gratuit, sans engagement.",
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
