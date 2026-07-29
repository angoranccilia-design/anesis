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

export function Header({ lang, nav }: { lang: Lang; nav: NavCopy }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "/about", label: nav.about },
    { href: "/method", label: nav.method },
    { href: "/results", label: nav.results },
    { href: "/journal", label: nav.journal },
    { href: "/contact", label: nav.contact },
  ];

  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "bg-cream-50/85 shadow-[0_1px_0_rgba(176,141,76,0.18)] backdrop-blur-md" : "bg-transparent",
      )}
    >
      <div className="container-editorial flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Anesis Acquisition" width={100} height={100} priority className="h-11 w-11 object-contain" />
          <span className="flex flex-col leading-none">
            <span className="font-serif text-[1.25rem] tracking-[0.1em] text-forest-900">Anesis Acquisition</span>
            <span className="mt-1 font-sans text-[0.5rem] uppercase tracking-eyebrow text-gold-deep">{nav.tagline}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((n) => (
            <Link key={n.href} href={n.href} className="link-underline font-sans text-sm">
              {n.label}
            </Link>
          ))}
          <LangToggle lang={lang} />
          <Link
            href="/diagnostic"
            className="rounded-full bg-forest-900 px-5 py-2.5 font-sans text-sm text-cream-50 transition-colors hover:bg-forest-800"
          >
            {nav.cta}
          </Link>
        </nav>

        <button type="button" aria-label="Menu" onClick={() => setOpen((v) => !v)} className="text-forest-900 lg:hidden">
          <span className="block h-px w-7 bg-forest-900" />
          <span className="mt-1.5 block h-px w-7 bg-forest-900" />
          <span className="mt-1.5 block h-px w-7 bg-forest-900" />
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
