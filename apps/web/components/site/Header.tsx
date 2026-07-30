"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import clsx from "clsx";
import type { Lang } from "@/lib/i18n";
import { LangToggle } from "./LangToggle";

interface NavCopy {
  about: string;
  method: string;
  results: string;
  journal: string;
  contact: string;
  cta: string;
  tagline: string;
}

/** `onDark` : header identique (logo, script, nav, EN/FR, bouton) mais lisible sur un hero photo sombre. */
export function Header({ lang, nav, onDark = false }: { lang: Lang; nav: NavCopy; onDark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [overHero, setOverHero] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      // Clair tant qu'on survole le hero sombre (premier écran) ; crème une fois passé.
      const hero = document.body.dataset.heroDark === "true";
      setOverHero(hero && window.scrollY < window.innerHeight - 90);
    };
    onScroll();
    const id = window.setTimeout(onScroll, 50); // laisse le hero poser son dataset
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const links = [
    { href: "/about", label: nav.about },
    { href: "/method", label: nav.method },
    { href: "/results", label: nav.results },
    { href: "/journal", label: nav.journal },
    { href: "/contact", label: nav.contact },
  ];

  // Clair sur le hero sombre (prop onDark ou survol du hero) ; sinon crème/encre habituel.
  const light = onDark || overHero;
  const solid = scrolled && !light;
  const wordmark = light ? "text-cream-50" : "text-forest-900";
  const tagline = light ? "text-gold-light" : "text-gold-deep";
  const navLink = light ? "text-cream-100/85 hover:text-white" : "";
  const cta = light
    ? "bg-cream-50 text-forest-900 hover:bg-white"
    : "bg-forest-900 text-cream-50 hover:bg-forest-800";
  const burger = light ? "bg-cream-50" : "bg-forest-900";

  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        solid ? "bg-cream-50/85 shadow-[0_1px_0_rgba(176,141,76,0.18)] backdrop-blur-md" : "bg-transparent",
      )}
    >
      <div className="container-editorial flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Anesis Acquisition"
            width={100}
            height={100}
            priority
            className={clsx("h-11 w-11 object-contain transition-all", light && "brightness-0 invert")}
          />
          <span className="flex flex-col leading-none">
            <span className={clsx("font-script text-[1.85rem] leading-none", wordmark)}>Anesis Acquisition</span>
            <span className={clsx("mt-1 font-sans text-[0.5rem] uppercase tracking-eyebrow", tagline)}>{nav.tagline}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((n) => (
            <Link key={n.href} href={n.href} className={clsx("link-underline whitespace-nowrap font-sans text-sm", navLink)}>
              {n.label}
            </Link>
          ))}
          <LangToggle lang={lang} onDark={light} />
          <Link href="/diagnostic" className={clsx("whitespace-nowrap rounded-full px-5 py-2.5 font-sans text-sm transition-colors", cta)}>
            {nav.cta}
          </Link>
        </nav>

        <button type="button" aria-label="Menu" onClick={() => setOpen((v) => !v)} className="lg:hidden">
          <span className={clsx("block h-px w-7", burger)} />
          <span className={clsx("mt-1.5 block h-px w-7", burger)} />
          <span className={clsx("mt-1.5 block h-px w-7", burger)} />
        </button>
      </div>

      <div
        className={clsx(
          "overflow-hidden border-t border-gold/20 bg-cream-50/95 backdrop-blur transition-all duration-500 lg:hidden",
          open ? "max-h-[26rem]" : "max-h-0",
        )}
      >
        <nav className="container-editorial flex flex-col gap-4 py-6">
          {links.map((n) => (
            <Link key={n.href} href={n.href} className="font-sans text-base text-forest-900" onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
          <div className="flex items-center justify-between pt-2">
            <LangToggle lang={lang} />
            <Link href="/diagnostic" className="rounded-full bg-forest-900 px-5 py-2.5 font-sans text-sm text-cream-50" onClick={() => setOpen(false)}>
              {nav.cta}
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
