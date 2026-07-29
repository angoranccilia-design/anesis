import { Cormorant_Garamond, Inter, Pinyon_Script } from "next/font/google";

/** Script calligraphique — écho de la lettrine du logo. Réservé au nom de marque (jamais le corps). */
export const pinyon = Pinyon_Script({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-script",
  display: "swap",
});

/** Serif éditorial fin (titres, gros chiffres, citations) — vibe old money, jamais épais. */
export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

/** Sans discret et bien dessiné pour le corps de texte. */
export const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-inter",
  display: "swap",
});
