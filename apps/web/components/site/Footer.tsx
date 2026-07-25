import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-gold/25 bg-cream-100">
      <div className="container-editorial py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Image src="/crest.jpg" alt="Anesis Acquisition" width={360} height={295} className="h-auto w-40 mix-blend-multiply" />
            <p className="eyebrow mt-3">Hospitality Acquisition Firm</p>
            <p className="mt-4 max-w-sm font-sans text-sm leading-relaxed text-forest-800/75">
              A hospitality acquisition underwriting firm. We measure what independent hotels lose to the
              agencies that introduce their own guests back to them — and we recover it, in pounds.
            </p>
          </div>

          <div>
            <p className="eyebrow">The firm</p>
            <ul className="mt-4 space-y-2 font-sans text-sm text-forest-800/85">
              <li><Link href="/about" className="link-underline">About</Link></li>
              <li><Link href="/method" className="link-underline">Method</Link></li>
              <li><Link href="/results" className="link-underline">Results</Link></li>
              <li><Link href="/journal" className="link-underline">Journal</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow">Begin</p>
            <ul className="mt-4 space-y-2 font-sans text-sm text-forest-800/85">
              <li><Link href="/diagnostic" className="link-underline">Request an assessment</Link></li>
              <li><Link href="/contact" className="link-underline">Contact</Link></li>
            </ul>
            <p className="eyebrow mt-8">Contact</p>
            <ul className="mt-4 space-y-2 font-sans text-sm text-forest-800/85">
              <li><a href="mailto:enquiries@anesisacquisition.com" className="link-underline">enquiries@anesisacquisition.com</a></li>
              <li className="text-forest-800/70">United Kingdom</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 hairline" />
        <div className="mt-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="eyebrow">Anesis Acquisition · United Kingdom · Underwriting hospitality</p>
          <p className="font-sans text-xs text-forest-800/55">
            © {new Date().getFullYear()} Anesis Acquisition. All figures in pounds sterling.
          </p>
        </div>
      </div>
    </footer>
  );
}
