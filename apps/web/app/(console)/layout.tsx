import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isDbConfigured } from "@/lib/db";
import { currentOperator, getDemoCookie } from "@/lib/session";
import { demoMode, demoPasswordSet, demoSessionValid, DEMO_OPERATOR } from "@/lib/demo";
import { demoOpen } from "@/lib/guard";

const NAV = [
  ["/console", "Command Center"], ["/console/core", "Core"], ["/console/constraint", "Commercial Constraint"], ["/console/intelligence", "External Intelligence"],
  ["/console/decision", "Decision Engine"], ["/console/interventions", "Interventions"], ["/console/data", "Data & Connectors"], ["/console/assay", "Assay"],
] as const;

/** The console: one establishment, every view of the engine. Access: operator session (database), demo password (demo), or an explicitly open demo. */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-invoke-path") ?? "";
  let who: { name: string; label: string } | null = null;
  if (isDbConfigured()) { const op = await currentOperator(); if (!op) redirect("/login"); who = { name: op.name, label: `${op.role} · operator account` }; }
  else if (demoMode() && demoPasswordSet()) { if (!demoSessionValid(await getDemoCookie())) { if (!path.endsWith("/console/login")) redirect("/console/login"); return <>{children}</>; } who = { name: DEMO_OPERATOR.name, label: "demo session (password)" }; }
  else if (demoOpen()) who = { name: "Open demo", label: "no sign-in (ANESIS_DEMO_OPEN)" };
  else redirect("/console/login");
  return (
    <div className="min-h-screen bg-cream-50 text-forest-900">
      <div className="border-b border-forest-900/10 bg-cream-100/70">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-4">
            <span className="eyebrow">Anesis</span>
            <span className="font-serif text-2xl">Commercial <em className="text-gold-deep">Intelligence</em></span>
          </div>
          <div className="flex items-center gap-4 text-xs text-forest-800/70">
            {demoMode() && <span className="rounded-full border border-gold/60 bg-gold/10 px-3 py-1 text-gold-deep">DEMO · synthetic establishment · real pipeline</span>}
            <span>{who.name} <span className="text-forest-800/50">· {who.label}</span></span>
            <form method="post" action={isDbConfigured() ? "/auth/logout" : "/api/demo/logout"}><button type="submit" className="link-underline">Sign out</button></form>
          </div>
        </div>
        <div className="hairline" />
        <nav className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-6 py-1 text-sm">
          {NAV.map(([href, label]) => <Link key={href} href={href} className="rounded-md px-3 py-2 text-forest-800/80 transition-colors hover:bg-forest-900/5 hover:text-forest-950">{label}</Link>)}
        </nav>
      </div>
      <div className="mx-auto max-w-[1400px] px-6 py-8">{children}</div>
    </div>
  );
}
