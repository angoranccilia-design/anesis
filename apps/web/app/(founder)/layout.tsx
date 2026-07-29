import { redirect } from "next/navigation";
import Link from "next/link";
import { isDbConfigured } from "@/lib/db";
import { currentOperator } from "@/lib/session";

/**
 * Groupe fondatrice — réservé. Quand la base est connectée, exige une session d'opérateur `founder`.
 * En mode démo (pas de base), l'accès est ouvert pour permettre de voir l'interface.
 */
export default async function FounderLayout({ children }: { children: React.ReactNode }) {
  let operatorName: string | null = null;
  if (isDbConfigured()) {
    const op = await currentOperator();
    if (!op || op.role !== "founder") redirect("/login");
    operatorName = op.name;
  }

  return (
    <div>
      <header className="flex items-center justify-between border-b border-forest-900/10 px-6 py-3 text-sm">
        <Link href="/cockpit" className="font-serif text-lg">Anesis · Cockpit</Link>
        <div className="flex items-center gap-4 text-forest-800/70">
          {operatorName ? <span>{operatorName}</span> : <span className="text-forest-800/50">Demo</span>}
          <form action="/auth/logout" method="post">
            <button type="submit" className="link-underline">Sign out</button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
