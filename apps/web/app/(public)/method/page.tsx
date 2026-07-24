import { PageHeader } from "@/components/site/PageHeader";
import { LeakAuditWidget } from "@/components/LeakAuditWidget";

export const metadata = { title: "Method" };

export default function MethodPage() {
  return (
    <>
      <PageHeader
        eyebrow="The method"
        title="How we measure the leak — and how we close it."
        lede="Four pillars, one figure in pounds, then a plan. The Acquisition Score is grounded in your real data, never in a form you fill in yourself."
      />
      <section className="border-b border-gold/10 py-24">
        <div className="container-editorial">
          <LeakAuditWidget />
        </div>
      </section>
      <section className="py-24">
        <div className="container-editorial max-w-prose space-y-6 font-sans text-base leading-relaxed text-cream-100/75">
          <p>Full page to follow — the four pillars, the three gates in detail, and the interactive score.</p>
        </div>
      </section>
    </>
  );
}
