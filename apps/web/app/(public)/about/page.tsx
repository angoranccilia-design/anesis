import { PageHeader } from "@/components/site/PageHeader";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="The firm"
        title="An underwriter’s discipline, brought to hospitality."
        lede="We measure what your independence is costing you, price it in pounds, and take responsibility for recovering it. That is the whole introduction."
      />
      <section className="py-24">
        <div className="container-editorial max-w-prose space-y-6 font-sans text-base leading-relaxed text-forest-800/85">
          <p>Full page to follow — track record, the people, and the principles behind the firm.</p>
        </div>
      </section>
    </>
  );
}
