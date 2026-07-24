import { PageHeader } from "@/components/site/PageHeader";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Write to us yourself."
        lede="You’ll hear back from someone who understands hospitality — not a queue, and not a script."
      />
      <section className="py-24">
        <div className="container-editorial max-w-prose space-y-6 font-sans text-base leading-relaxed text-cream-100/75">
          <p>Full page to follow — a considered enquiry form and direct details.</p>
        </div>
      </section>
    </>
  );
}
