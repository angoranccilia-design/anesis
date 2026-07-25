"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

/**
 * Tableau de différenciation en toggle animé (brief §2) — bascule « Classic agency / Anesis ».
 * Chaque ligne montre la même question, la réponse change (crossfade) selon la perspective choisie.
 * Contenu de fond : Partie 10 (différenciation) du doc business. Aucun mot « AI ».
 */
const ROWS: { q: string; agency: string; anesis: string }[] = [
  { q: "How you’re charged", agency: "A monthly retainer, whatever the outcome.", anesis: "Tied to the direct revenue we actually recover — never to your spend." },
  { q: "What’s promised", agency: "Activity: posts, ads, reports.", anesis: "A figure in pounds, and the responsibility to return it." },
  { q: "Who carries the risk", agency: "You do. Results are “not guaranteed”.", anesis: "We underwrite it. If there’s nothing recoverable, we say so and stop." },
  { q: "What’s measured", agency: "Impressions, reach, engagement.", anesis: "Direct bookings, against a baseline, every month." },
  { q: "Where it begins", agency: "A pitch, then an invoice.", anesis: "A free, measured assessment — and often, a polite no." },
];

export function DifferentiationToggle() {
  const [view, setView] = useState<"agency" | "anesis">("anesis");

  return (
    <div>
      <div className="inline-flex rounded-full border border-forest-900/15 bg-cream-100 p-1">
        {(["agency", "anesis"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={clsx(
              "relative rounded-full px-5 py-2 font-sans text-sm transition-colors",
              view === v ? "text-cream-50" : "text-forest-800/70 hover:text-forest-900",
            )}
          >
            {view === v && (
              <motion.span layoutId="diff-pill" className="absolute inset-0 rounded-full bg-forest-900" transition={{ type: "spring", stiffness: 320, damping: 30 }} />
            )}
            <span className="relative">{v === "agency" ? "A classic agency" : "Anesis"}</span>
          </button>
        ))}
      </div>

      <div className="mt-10">
        {ROWS.map((r, i) => (
          <div key={r.q} className="grid gap-3 border-t border-forest-900/12 py-6 md:grid-cols-[0.8fr_1.2fr] md:items-baseline md:gap-10">
            <p className="font-serif text-xl font-light text-forest-900">{r.q}</p>
            <div className="min-h-[2.5rem]">
              <AnimatePresence mode="wait">
                <motion.p
                  key={view + i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className={clsx("font-sans text-base leading-relaxed", view === "anesis" ? "text-forest-800" : "text-forest-800/60")}
                >
                  {view === "agency" ? r.agency : r.anesis}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
