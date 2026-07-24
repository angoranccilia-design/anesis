import type { Config } from "tailwindcss";

/**
 * Palette FERMÉE et non négociable (brief §1) : vert (profond + moyen), blanc/crème/ivoire, or.
 * AUCUNE troisième couleur d'accent — toute la richesse vient des nuances internes.
 * Typo : Cormorant Garamond (serif éditorial, titres/chiffres/citations) + Inter (sans discret, corps).
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx,mdx}", "./components/**/*.{ts,tsx}", "./content/**/*.{md,mdx}"],
  theme: {
    extend: {
      colors: {
        // Verts (du plus profond, presque noir, au moyen)
        forest: {
          950: "#0E1F16",
          900: "#122A1D",
          800: "#173525",
          700: "#1E4531",
          600: "#2A5A41",
          500: "#356E50",
        },
        // Crème / ivoire / parchemin
        cream: {
          50: "#FBF8F1",
          100: "#F6F1E7",
          200: "#EFE7D6",
          300: "#E4D8C2",
        },
        // Or antique, discret (jamais criard)
        gold: {
          light: "#CBAE79",
          DEFAULT: "#B08D4C",
          deep: "#8F6F38",
        },
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Cormorant Garamond", "Georgia", "serif"],
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        eyebrow: "0.28em", // petites capitales largement espacées (labels, eyebrows)
      },
      maxWidth: {
        prose: "68ch",
      },
      keyframes: {
        "fade-rise": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-rise": "fade-rise 0.8s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
