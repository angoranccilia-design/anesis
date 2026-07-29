import { redirect } from "next/navigation";
import { isDbConfigured } from "@/lib/db";
import { currentOperator } from "@/lib/session";

/**
 * Groupe client (dashboard) — réservé. Quand la base est connectée, exige une session d'opérateur.
 * En mode démo (pas de base), l'accès est ouvert pour voir l'interface.
 */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  if (isDbConfigured()) {
    const op = await currentOperator();
    if (!op) redirect("/login");
  }
  return <>{children}</>;
}
