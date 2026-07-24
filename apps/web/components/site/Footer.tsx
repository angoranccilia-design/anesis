import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gold/15 bg-forest-950">
      <div className="container-editorial py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-serif text-2xl tracking-[0.14em] text-cream-50">Anesis Acquisition</p>
            <p className="eyebrow mt-1">Hospitality Acquisition Firm</p>
            <p className="mt-4 max-w-sm font-sans text-sm leading-relaxed text-cream-100/70">
              A hotel acquisition underwriting firm. We measure what independent hotels lose to the
              agencies that introduce their own guests back to them — and we recover it, in pounds.
            </p>
          </div>

          <div>
            <p className="eyebrow">The firm</p>
            <ul className="mt-4 space-y-2 font-sans text-sm text-cream-100/80">
              <li><Link href="/about" className="link-underline">About</Link></li>
              <li><Link href="/method" className="link-underline">Method</Link></li>
              <li><Link href="/results" className="link-underline">Results</Link></li>
              <li><Link href="/journal" className="link-underline">Journal</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow">Begin</p>
            <ul className="mt-4 space-y-2 font-sans text-sm text-cream-100/80">
              <li><Link href="/diagnostic" className="link-underline">Request an assessment</Link></li>
              <li><Link href="/contact" className="link-underline">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 hairline" />
        <div className="mt-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="eyebrow">Anesis · United Kingdom · Underwriting hospitality</p>
          <p className="font-sans text-xs text-cream-100/50">
            © {new Date().getFullYear()} Anesis. All figures in pounds sterling.
          </p>
        </div>
      </div>
    </footer>
  );
}
