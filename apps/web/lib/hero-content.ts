/**
 * Matrice de contenu du composant <Hero/>. Un seul composant réutilisable, piloté par ces props —
 * jamais de texte codé en dur par page. Accueil = vidéo ; toutes les autres pages = image (mood dédié).
 * Fonds : Pexels (hotlink autorisé) en attendant les médias finaux ; l'accueil attend une vidéo
 * cinématique dans /public/hero/home.mp4 (le poster estate s'affiche tant qu'elle n'est pas déposée).
 */
export type HeroPageKey = "home" | "method" | "results" | "insights" | "contact";

export interface HeroContent {
  key: HeroPageKey;
  /** Lien de nav marqué actif (null sur l'accueil). */
  activeNav: "method" | "results" | "insights" | "contact" | null;
  backgroundType: "video" | "image";
  backgroundSrc: string;
  poster?: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
}

/** Photo Pexels plein cadre. */
const px = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1920`;

export const HERO_NAV: { key: "method" | "results" | "insights" | "contact"; label: string; href: string }[] = [
  { key: "method", label: "Our Approach", href: "/method" },
  { key: "results", label: "Client Results", href: "/results" },
  { key: "insights", label: "Insights", href: "/journal" },
  { key: "contact", label: "Contact", href: "/contact" },
];

export const HERO_PAGES: Record<HeroPageKey, HeroContent> = {
  home: {
    key: "home",
    activeNav: null,
    backgroundType: "video",
    backgroundSrc: "/hero/home.mp4",
    poster: "/img/new-glamping-misty-forest.jpg",
    eyebrow: "Independent Hospitality · United Kingdom",
    title: "We recover the revenue you didn't know you were losing.",
    description:
      "An underwriting firm for independent hotels, spas, and glamping estates — we price the leak, we recover it, and we're paid on what we return.",
    primaryCta: "See Your Leak Index",
    secondaryCta: "How It Works",
  },
  method: {
    key: "method",
    activeNav: "method",
    backgroundType: "image",
    backgroundSrc: "/img/new-glamping-dome-01.jpg",
    eyebrow: "Our Method",
    title: "We price the leak before we promise anything.",
    description: "A three-step underwriting process — evaluation, diagnosis, mandate — built to be verified, not just trusted.",
    primaryCta: "See the Process",
    secondaryCta: "Book a Diagnostic",
  },
  results: {
    key: "results",
    activeNav: "results",
    backgroundType: "image",
    backgroundSrc: "/img/new-resort-infinity-pool.jpg",
    eyebrow: "Client Results",
    title: "What we recovered, measured against the market.",
    description: "Every result is benchmarked against a control group of comparable properties — never against our own claim.",
    primaryCta: "View Case Studies",
    secondaryCta: "Book a Diagnostic",
  },
  insights: {
    key: "insights",
    activeNav: "insights",
    backgroundType: "image",
    backgroundSrc: "/img/new-eco-lodge-01.jpg",
    eyebrow: "Journal",
    title: "Notes on distribution, ownership, and the cost of not knowing.",
    description: "Field notes from our work with independent hotels, spas, and glamping estates across the UK.",
    primaryCta: "Read the Latest",
    secondaryCta: "Book a Diagnostic",
  },
  contact: {
    key: "contact",
    activeNav: "contact",
    backgroundType: "image",
    backgroundSrc: "/img/new-spa-elegant-02.jpg",
    eyebrow: "Get in Touch",
    title: "Let's put a number on it.",
    description: "Tell us about your property. We'll tell you, in pounds, what your distribution is really costing you.",
    primaryCta: "Start the Conversation",
    secondaryCta: "Book a Diagnostic",
  },
};
