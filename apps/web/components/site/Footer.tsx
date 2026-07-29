import Link from "next/link";
import Image from "next/image";

interface FooterCopy {
  blurb: string;
  firm: string;
  begin: string;
  contact: string;
  country: string;
  rights: string;
  line: string;
}
interface NavCopy {
  about: string;
  method: string;
  results: string;
  journal: string;
  contact: string;
  cta: string;
  tagline: string;
}

export function Footer({ footer, nav }: { footer: FooterCopy; nav: NavCopy }) {
  return (
    <footer className="border-t border-gold/25 bg-cream-100">
      <div className="container-editorial py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Image src="/logo.png" alt="Anesis Acquisition" width={120} height={120} className="h-16 w-16 object-contain" />
            <p className="mt-3 font-script text-3xl leading-none text-forest-900">Anesis Acquisition</p>
            <p className="eyebrow mt-2">{nav.tagline}</p>
            <p className="mt-4 max-w-sm font-sans text-sm leading-relaxed text-forest-800/75">{footer.blurb}</p>
          </div>

          <div>
            <p className="eyebrow">{footer.firm}</p>
            <ul className="mt-4 space-y-2 font-sans text-sm text-forest-800/85">
              <li><Link href="/about" className="link-underline">{nav.about}</Link></li>
              <li><Link href="/method" className="link-underline">{nav.method}</Link></li>
              <li><Link href="/results" className="link-underline">{nav.results}</Link></li>
              <li><Link href="/journal" className="link-underline">{nav.journal}</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow">{footer.begin}</p>
            <ul className="mt-4 space-y-2 font-sans text-sm text-forest-800/85">
              <li><Link href="/diagnostic" className="link-underline">{nav.cta}</Link></li>
              <li><Link href="/contact" className="link-underline">{nav.contact}</Link></li>
            </ul>
            <p className="eyebrow mt-8">{footer.contact}</p>
            <ul className="mt-4 space-y-2 font-sans text-sm text-forest-800/85">
              <li><a href="mailto:enquiries@anesisacquisition.com" className="link-underline">enquiries@anesisacquisition.com</a></li>
              <li className="text-forest-800/70">{footer.country}</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 hairline" />
        <div className="mt-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="eyebrow">{footer.line}</p>
          <p className="font-sans text-xs text-forest-800/55">
            © {new Date().getFullYear()} Anesis Acquisition. {footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
