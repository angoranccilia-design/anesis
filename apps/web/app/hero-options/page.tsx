"use client";

import { useState } from "react";
import { Hero } from "@/components/Hero";
import { Header } from "@/components/site/Header";
import { HERO_PAGES } from "@/lib/hero-content";
import { getCopy } from "@/content/site";

/**
 * Choix de l'image d'accueil : clique un numéro pour voir chaque option en plein hero.
 * Dis-moi le numéro que tu préfères et je le mets sur la vraie page d'accueil.
 */
const OPTIONS = [
  { n: 1, src: "/img/hero-opt-1.jpg", label: "English manor — I" },
  { n: 2, src: "/img/hero-opt-2.jpg", label: "English manor — II" },
  { n: 3, src: "/img/hero-opt-3.jpg", label: "English manor — III" },
  { n: 4, src: "/img/hero-opt-4.jpg", label: "English manor — IV" },
  { n: 5, src: "/img/hero-opt-5.jpg", label: "Cotswolds — I" },
  { n: 6, src: "/img/hero-opt-6.jpg", label: "Cotswolds cottage" },
  { n: 7, src: "/img/hero-opt-7.jpg", label: "Country-house lounge (fireplace)" },
  { n: 8, src: "/img/hero-opt-8.jpg", label: "Country-house lounge — II" },
  { n: 9, src: "/img/new-hotel-hall-chandelier.jpg", label: "Grand hall, warm (the earlier one)" },
  { n: 10, src: "/img/uk-estate.jpg", label: "Manor + garden (current)" },
  { n: 11, src: "/img/uk-countryside.jpg", label: "English countryside" },
];

export default function HeroOptionsPage() {
  const [i, setI] = useState(0);
  const nav = getCopy("en").nav;
  const opt = OPTIONS[i]!;

  return (
    <div className="relative">
      <Header lang="en" nav={nav} onDark />
      <Hero {...HERO_PAGES.home} backgroundType="image" backgroundSrc={opt.src} zoom hideNav />

      <div className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
        <div className="flex max-w-3xl flex-col items-center gap-2 rounded-2xl liquid-glass px-3 py-2.5">
          <span className="text-[11px] tracking-wide text-cream-100/80">
            Option <strong className="text-white">{opt.n}</strong> · {opt.label}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {OPTIONS.map((o, idx) => (
              <button
                key={o.n}
                type="button"
                onClick={() => setI(idx)}
                className={`h-8 w-8 rounded-full text-xs transition-colors ${
                  idx === i ? "bg-cream-50 text-forest-900" : "text-cream-100/80 hover:bg-white/10"
                }`}
              >
                {o.n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
