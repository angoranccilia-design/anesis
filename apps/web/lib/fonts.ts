import { Cormorant_Garamond, Inter } from "next/font/google";

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
