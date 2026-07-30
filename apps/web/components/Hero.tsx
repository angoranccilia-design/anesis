"use client";

/**
 * <Hero/> — bloc cinématique plein écran, réutilisé en tête de CHAQUE page. Un seul composant piloté
 * par props (matrice dans lib/hero-content.ts) : seuls le média de fond et les 4 champs texte/CTA
 * changent d'une page à l'autre. Navbar, animations, verre liquide, timings : identiques partout.
 */
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { HERO_NAV, type HeroContent } from "@/lib/hero-content";

export interface HeroProps extends Omit<HeroContent, "key"> {
  /** Optionnel : en preview, change de page au clic sur la nav plutôt que de naviguer. */
  onNavigate?: (key: "method" | "results" | "insights" | "contact") => void;
  /** Masque la navbar interne du hero (on utilise le Header de marque du site à la place). */
  hideNav?: boolean;
}

export function Hero({
  activeNav,
  backgroundType,
  backgroundSrc,
  poster,
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  onNavigate,
  hideNav = false,
}: HeroProps) {
  const [open, setOpen] = useState(false);

  // Signale au Header qu'un hero sombre est en tête de page → header en mode clair au-dessus.
  useEffect(() => {
    document.body.dataset.heroDark = "true";
    return () => {
      delete document.body.dataset.heroDark;
    };
  }, []);

  const navClick = (key: "method" | "results" | "insights" | "contact") => (e: React.MouseEvent) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(key);
      setOpen(false);
    }
  };

  return (
    <section className="relative flex min-h-screen w-full flex-col overflow-hidden bg-black font-sans text-white">
      {/* Fond plein écran (z-0) */}
      {backgroundType === "video" ? (
        <video
          className="absolute inset-0 z-0 h-full w-full object-cover"
          src={backgroundSrc}
          poster={poster}
          autoPlay
          loop
          muted
          playsInline
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={backgroundSrc} alt="" className="absolute inset-0 z-0 h-full w-full object-cover" />
      )}

      {/* Flou bas uniquement (z-1) — pas d'assombrissement */}
      <div className="pointer-events-none absolute inset-0 z-[1] hero-bottom-blur" aria-hidden="true" />

      {/* Navbar interne — masquée quand on utilise le Header de marque du site (hideNav) */}
      {!hideNav && (
      <nav className="relative z-50 flex items-center justify-between px-4 py-4 sm:px-6 md:px-12 md:py-6">
        <a
          href="/"
          className="animate-blur-fade-up flex h-8 items-center text-sm font-medium tracking-[0.22em] md:h-10 md:text-base"
          style={{ animationDelay: "0ms" }}
        >
          ANESIS ACQUISITION
        </a>

        {/* Nav centrale (desktop) */}
        <div className="hidden items-center gap-8 lg:flex">
          {HERO_NAV.map((n, i) => (
            <a
              key={n.key}
              href={n.href}
              onClick={navClick(n.key)}
              className={`animate-blur-fade-up text-sm transition-colors hover:text-gray-300 ${
                activeNav === n.key ? "text-white" : "text-gray-400"
              }`}
              style={{ animationDelay: `${100 + i * 50}ms` }}
            >
              {n.label}
            </a>
          ))}
        </div>

        {/* Droite */}
        <div className="flex items-center gap-3">
          <a
            href="/diagnostic"
            className="animate-blur-fade-up hidden rounded-full px-5 py-2.5 text-sm font-medium liquid-glass sm:inline-flex"
            style={{ animationDelay: "300ms" }}
          >
            Book a Diagnostic
          </a>
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="animate-blur-fade-up flex h-10 w-10 items-center justify-center rounded-full liquid-glass lg:hidden"
            style={{ animationDelay: "300ms" }}
          >
            <span className="relative block h-5 w-5">
              <Menu
                size={20}
                className={`absolute inset-0 transition-all duration-500 ease-out ${open ? "scale-50 rotate-180 opacity-0" : "scale-100 rotate-0 opacity-100"}`}
              />
              <X
                size={20}
                className={`absolute inset-0 transition-all duration-500 ease-out ${open ? "scale-100 rotate-0 opacity-100" : "scale-50 rotate-180 opacity-0"}`}
              />
            </span>
          </button>
        </div>
      </nav>
      )}

      {/* Menu mobile interne — également masqué avec hideNav */}
      {!hideNav && (
      <div
        className={`absolute inset-x-0 top-[72px] z-40 border-b border-t border-gray-800 bg-gray-900/95 shadow-2xl backdrop-blur-lg transition-all duration-500 ease-out lg:hidden ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1 px-3 py-3">
          {HERO_NAV.map((n, i) => (
            <a
              key={n.key}
              href={n.href}
              onClick={navClick(n.key)}
              className={`rounded-lg px-3 py-3 text-base transition-all duration-500 ease-out hover:bg-gray-800/50 ${
                activeNav === n.key ? "text-white" : "text-gray-300"
              } ${open ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"}`}
              style={{ transitionDelay: open ? `${i * 60}ms` : "0ms" }}
            >
              {n.label}
            </a>
          ))}
          <div className="mt-2 border-t border-gray-800 pt-3 sm:hidden">
            <a href="/diagnostic" className="block rounded-full px-5 py-3 text-center text-sm font-medium liquid-glass">
              Book a Diagnostic
            </a>
          </div>
        </div>
      </div>
      )}

      {/* Contenu (z-10) — ancré en bas */}
      <div className="relative z-10 flex flex-1 flex-col justify-end px-4 pb-8 sm:px-6 md:px-12 md:pb-16">
        <p
          className="animate-blur-fade-up text-[0.7rem] uppercase tracking-eyebrow text-gold-light"
          style={{ animationDelay: "300ms" }}
        >
          {eyebrow}
        </p>
        <h1
          className="animate-blur-fade-up mb-4 font-serif text-4xl font-light leading-[1.05] sm:text-5xl md:mb-6 md:text-6xl lg:text-7xl"
          style={{ animationDelay: "400ms", letterSpacing: "-0.01em", textWrap: "balance" }}
        >
          {title}
        </h1>
        <p
          className="animate-blur-fade-up mb-6 max-w-2xl font-sans text-base text-cream-100/85 sm:text-lg md:mb-12 md:text-xl"
          style={{ animationDelay: "500ms" }}
        >
          {description}
        </p>
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <button
            type="button"
            className="animate-blur-fade-up inline-flex items-center gap-2 rounded-full bg-cream-50 px-6 py-2.5 font-medium text-forest-900 transition-colors hover:bg-white sm:px-8 sm:py-3"
            style={{ animationDelay: "600ms" }}
          >
            {primaryCta}
            <ArrowRight size={18} />
          </button>
          <button
            type="button"
            className="animate-blur-fade-up rounded-full px-6 py-2.5 font-medium liquid-glass sm:px-8 sm:py-3"
            style={{ animationDelay: "700ms" }}
          >
            {secondaryCta}
          </button>
        </div>
      </div>
    </section>
  );
}
