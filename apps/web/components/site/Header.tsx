"use client";

import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";

const NAV = [
  { href: "/about", label: "About" },
  { href: "/method", label: "Method" },
  { href: "/results", label: "Results" },
  { href: "/journal", label: "Journal" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="container-editorial flex items-center justify-between py-6">
        <Link href="/" className="font-serif text-2xl tracking-[0.2em] text-cream-50">
          ANESIS
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="link-underline font-sans text-sm">
              {n.label}
            </Link>
          ))}
          <Link
            href="/diagnostic"
            className="rounded-full border border-gold/50 px-5 py-2 font-sans text-sm text-cream-50 transition-colors hover:border-gold hover:bg-gold/10"
          >
            Request an assessment
          </Link>
        </nav>

        <button
          type="button"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden text-cream-50"
        >
          <span className="block h-px w-7 bg-cream-50" />
          <span className="mt-1.5 block h-px w-7 bg-cream-50" />
        </button>
      </div>

      <div
        className={clsx(
          "md:hidden overflow-hidden border-t border-gold/15 bg-forest-950/95 backdrop-blur transition-all duration-500",
          open ? "max-h-96" : "max-h-0",
        )}
      >
        <nav className="container-editorial flex flex-col gap-4 py-6">
          {[...NAV, { href: "/diagnostic", label: "Request an assessment" }].map((n) => (
            <Link key={n.href} href={n.href} className="font-sans text-base text-cream-100" onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
