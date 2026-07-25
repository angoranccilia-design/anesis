"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

/**
 * Carrousel avant/après d'un feed Instagram (brief §2) — deux grilles 3×3 en toggle animé.
 * « Avant » : terne, incohérent. « Après » : cohérent, chaleureux. COMPOSITION illustrative assumée
 * (aucun vrai compte client UK), palette fermée (crème/vert/or) — textures abstraites, pas de fausse photo.
 */
const AFTER = [
  "bg-gradient-to-br from-forest-800 to-forest-600",
  "bg-gradient-to-br from-cream-200 to-cream-300",
  "bg-gradient-to-br from-gold to-gold-deep",
  "bg-gradient-to-br from-cream-100 to-cream-200",
  "bg-gradient-to-br from-forest-700 to-forest-500",
  "bg-gradient-to-tr from-gold-light to-cream-200",
  "bg-gradient-to-br from-forest-600 to-forest-800",
  "bg-gradient-to-br from-cream-200 to-gold-light",
  "bg-gradient-to-br from-forest-900 to-forest-700",
];

const BEFORE = [
  "bg-cream-300",
  "bg-forest-600/40",
  "bg-cream-200",
  "bg-forest-500/30",
  "bg-cream-300/70",
  "bg-forest-700/30",
  "bg-cream-200/80",
  "bg-forest-600/25",
  "bg-cream-300",
];

export function BeforeAfterFeed() {
  const [view, setView] = useState<"before" | "after">("after");
  const tiles = view === "after" ? AFTER : BEFORE;

  return (
    <div>
      <div className="mb-8 inline-flex rounded-full border border-forest-900/15 bg-cream-100 p-1">
        {(["before", "after"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={clsx(
              "relative rounded-full px-6 py-2 font-sans text-sm capitalize transition-colors",
              view === v ? "text-cream-50" : "text-forest-800/70 hover:text-forest-900",
            )}
          >
            {view === v && (
              <motion.span layoutId="feed-pill" className="absolute inset-0 rounded-full bg-forest-900" transition={{ type: "spring", stiffness: 320, damping: 30 }} />
            )}
            <span className="relative">{v}</span>
          </button>
        ))}
      </div>

      <div className="mx-auto grid max-w-md grid-cols-3 gap-2 rounded-2xl border border-forest-900/12 bg-cream-50 p-2">
        {tiles.map((cls, i) => (
          <AnimatePresence key={i} mode="wait">
            <motion.div
              key={view + i}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: i * 0.03, ease: "easeOut" }}
              className={clsx("aspect-square rounded-md", cls)}
            />
          </AnimatePresence>
        ))}
      </div>

      <p className="eyebrow mt-5 text-center">Illustrative composition · not a real account</p>
    </div>
  );
}
