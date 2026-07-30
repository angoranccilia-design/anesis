"use client";

import { useState } from "react";
import { Hero } from "@/components/Hero";
import { HERO_PAGES, type HeroPageKey } from "@/lib/hero-content";

/**
 * Prévisualisation du composant <Hero/> réutilisable sur ses 5 variantes.
 * La nav du hero change de page ; les pastilles en bas aussi. (Route de démo, pas une page finale.)
 */
const ORDER: { key: HeroPageKey; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "method", label: "Our Approach" },
  { key: "results", label: "Client Results" },
  { key: "insights", label: "Insights" },
  { key: "contact", label: "Contact" },
];

export default function HeroPreviewPage() {
  const [page, setPage] = useState<HeroPageKey>("home");

  return (
    <div className="relative">
      <Hero {...HERO_PAGES[page]} onNavigate={(k) => setPage(k)} />

      {/* Contrôle de prévisualisation (démo) */}
      <div className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
        <div className="flex flex-wrap items-center justify-center gap-1 rounded-full liquid-glass px-2 py-1.5">
          <span className="px-2 text-[10px] uppercase tracking-[0.2em] text-gray-400">Preview</span>
          {ORDER.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setPage(o.key)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                page === o.key ? "bg-white text-black" : "text-gray-300 hover:text-white"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
