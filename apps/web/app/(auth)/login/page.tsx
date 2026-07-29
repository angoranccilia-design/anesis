import { isDbConfigured } from "@/lib/db";

export const metadata = { title: "Sign in — Anesis Acquisition" };

const MESSAGES: Record<string, { tone: "info" | "error"; text: string }> = {
  "1": { tone: "info", text: "If that email belongs to an operator, a sign-in link is on its way. It expires in 15 minutes." },
  email: { tone: "error", text: "Please enter a valid email address." },
  badlink: { tone: "error", text: "That link is invalid or has expired. Request a new one below." },
  nodb: { tone: "error", text: "Sign-in is not connected yet (no database configured). This is expected in development." },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const sp = await searchParams;
  const msg = sp.sent ? MESSAGES["1"] : sp.error ? MESSAGES[sp.error] : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16 text-forest-900">
      <p className="eyebrow">Anesis Acquisition</p>
      <h1 className="mt-2 font-serif text-4xl font-light">Operator sign-in</h1>
      <p className="mt-3 text-sm text-forest-800/70">
        Enter your email and we will send you a secure sign-in link. No password to remember.
      </p>

      {msg && (
        <p
          className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
            msg.tone === "error" ? "border-red-800/30 bg-red-800/5 text-red-900/80" : "border-gold/30 bg-gold/5 text-forest-800/80"
          }`}
        >
          {msg.text}
        </p>
      )}

      <form action="/auth/request" method="post" className="mt-8 space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-forest-800/60">Email</span>
          <input
            type="email"
            name="email"
            required
            placeholder="you@anesisacquisition.com"
            className="mt-1 w-full rounded-lg border border-forest-900/20 bg-cream-50 px-4 py-3 text-forest-900 outline-none focus:border-gold"
          />
        </label>
        <button type="submit" className="btn-primary w-full justify-center">
          Send me a sign-in link
        </button>
      </form>

      {!isDbConfigured() && (
        <p className="mt-6 text-xs text-forest-800/55">
          Developer note: connecting a database (DATABASE_URL) activates real sign-in. Until then, the cockpit and
          dashboards show illustrative demo data.
        </p>
      )}
    </main>
  );
}
