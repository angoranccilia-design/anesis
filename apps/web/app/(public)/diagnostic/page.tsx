import { PageHeader } from "@/components/site/PageHeader";

export const metadata = { title: "Request an assessment" };

export default function DiagnosticPage() {
  return (
    <>
      <PageHeader
        eyebrow="Gate one · free"
        title="Request your assessment."
        lede="Tell us where to look. We measure your recoverable loss from your real data and write back with a figure — plainly, and at no cost."
      />
      <section className="py-24">
        <div className="container-editorial max-w-prose space-y-6 font-sans text-base leading-relaxed text-forest-800/85">
          <p>Full page to follow — the assessment request form (hotel name, website, a few details) wired to the firm’s intake.</p>
        </div>
      </section>
    </>
  );
}
