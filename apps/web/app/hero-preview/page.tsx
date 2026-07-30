"use client";

import { useState } from "react";
import { Hero } from "@/components/Hero";
import { Header } from "@/components/site/Header";
import { HERO_PAGES, type HeroPageKey } from "@/lib/hero-content";
import { getCopy } from "@/content/site";

/**
 * Prévisualisation du hero cinématique AVEC le Header de marque du site (mode sombre) au-dessus,
 * et la typographie de marque (Cormorant). La navbar interne du hero est masquée (hideNav).
 * Les pastilles en bas changent de variante. (Route de démo.)
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
  const nav = getCopy("en").nav;

  return (
    <div className="relative">
      <Header lang="en" nav={nav} onDark />
      <Hero {...HERO_PAGES[page]} hideNav />

      {/* Contrôle de prévisualisation (démo) */}
      <div className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
        <div className="flex flex-wrap items-center justify-center gap-1 rounded-full liquid-glass px-2 py-1.5">
          <span className="px-2 text-[10px] uppercase tracking-[0.2em] text-cream-100/70">Preview</span>
          {ORDER.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setPage(o.key)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                page === o.key ? "bg-cream-50 text-forest-900" : "text-cream-100/80 hover:text-white"
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
