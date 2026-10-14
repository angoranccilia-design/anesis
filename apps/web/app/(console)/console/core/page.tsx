import { DEMO_SPEC } from "@/lib/console/seed";

/**
 * The Core: the engine rendered as a reactor hall (WebGL), spoken aloud. The page in /public runs the same engine TypeScript
 * in the browser on a simulated establishment and lights each event as it happens: it is a demonstration of the reasoning,
 * not the demo property's record (that record is the other views, read from the runtime database).
 */
export default function CorePage() {
  return (
    <div className="-mx-6 -my-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3 px-6 py-3 text-xs text-forest-800/70">
        <span>
          <span className="eyebrow mr-3">Core</span>
          The engine, live and spoken: press <b>Run a cycle</b>; every light is a real event from the engine running in this browser.
        </span>
        <span>
          Simulated 34-room country house · the other views read <b>{DEMO_SPEC.name.split(" (")[0]}</b> from the runtime database.
          <a className="link-underline ml-3" href="/anesis-core.html" target="_blank" rel="noreferrer">Open full screen</a>
        </span>
      </div>
      <iframe title="Anesis Core — the engine, live and spoken" src="/anesis-core.html" className="block h-[calc(100vh-150px)] w-full border-0 bg-[#050b08]" allow="autoplay" />
    </div>
  );
}
