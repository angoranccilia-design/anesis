import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTICLES, ISSUE, bySlug } from "@/content/journal";
import { getLang } from "@/lib/i18n";
import { getCopy } from "@/content/site";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = bySlug(slug);
  return a ? { title: a.title, description: a.dek } : { title: "The Anesis Journal" };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = bySlug(slug);
  if (!article) notFound();

  const lang = await getLang();
  const c = getCopy(lang);
  const [first, ...rest] = article.body;

  return (
    <article className="pt-36 pb-24">
      <div className="container-editorial max-w-3xl">
        <div className="flex items-center gap-3 font-sans text-[0.7rem] uppercase tracking-eyebrow text-gold-deep">
          <Link href="/journal" className="hover:text-forest-900">The Anesis Journal</Link>
          <span className="h-1 w-1 rounded-full bg-gold" />
          <span>{ISSUE.label}</span>
          <span className="h-1 w-1 rounded-full bg-gold" />
          <span>{article.readMinutes} {c.readMin}</span>
        </div>

        <h1 className="mt-6 font-serif text-4xl font-light leading-[1.08] text-forest-900 md:text-6xl">{article.title}</h1>
        <p className="mt-5 font-serif text-2xl font-light italic leading-relaxed text-forest-800/80">{article.dek}</p>

        <div className="mt-8 h-px w-full bg-forest-900/20" />

        <div className="mt-10 space-y-6 font-sans text-lg leading-relaxed text-forest-800/90">
          {first ? (
            <p className="first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-serif first-letter:text-6xl first-letter:font-light first-letter:leading-[0.8] first-letter:text-forest-900">
              {first}
            </p>
          ) : null}
          {rest.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        <div className="mt-12 h-px w-full bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/journal" className="link-underline font-sans text-sm">{c.back}</Link>
          <Link href="/diagnostic" className="rounded-full bg-forest-900 px-6 py-3 font-sans text-sm text-cream-50 transition-colors hover:bg-forest-800">
            {c.nav.cta}
          </Link>
        </div>
      </div>
    </article>
  );
}
