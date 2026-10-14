import { demoMode, demoPasswordSet } from "@/lib/demo";
import { isDbConfigured } from "@/lib/db";
export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in — Anesis Commercial Intelligence" };
export default async function ConsoleLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const demo = demoMode() && demoPasswordSet();
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-50 px-6 text-forest-900">
      <div className="w-full max-w-md">
        <p className="eyebrow">Anesis · Commercial Intelligence</p>
        <h1 className="mt-2 font-serif text-4xl">The Anesis <em className="text-gold-deep">Commercial Constraint</em></h1>
        {demo ? (
          <form method="post" action="/api/demo/login" className="mt-8 space-y-4 rounded-2xl border border-forest-900/10 bg-white/70 p-6">
            <p className="text-sm text-forest-800/70">Demonstration access. One synthetic establishment, real pipeline. Enter the demo password you were given.</p>
            <input name="password" type="password" autoComplete="current-password" placeholder="Demo password" className="w-full rounded-lg border border-forest-900/20 bg-cream-50 px-4 py-3 text-forest-900 outline-none focus:border-gold" />
            {error && <p className="text-sm text-amber-900">That password is not right.</p>}
            <button type="submit" className="btn-primary w-full">Enter the console</button>
          </form>
        ) : isDbConfigured() ? (
          <p className="mt-8 text-sm text-forest-800/70">This deployment uses operator accounts: <a className="underline" href="/login">sign in with your e-mail</a>.</p>
        ) : (
          <p className="mt-8 text-sm text-forest-800/70">No sign-in is configured. Set ANESIS_DEMO_MODE=1 and ANESIS_DEMO_PASSWORD for a demonstration, or DATABASE_URL for operator accounts.</p>
        )}
      </div>
    </main>
  );
}
