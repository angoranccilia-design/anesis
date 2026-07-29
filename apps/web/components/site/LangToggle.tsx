"use client";

import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";

/** Bascule EN/FR — pose le cookie de langue et rafraîchit le rendu serveur. */
export function LangToggle({ lang }: { lang: Lang }) {
  const router = useRouter();
  const set = (next: Lang) => {
    document.cookie = `lang=${next};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  };
  return (
    <div className="flex items-center gap-1 font-sans text-[0.7rem] tracking-wide text-forest-800/70">
      {(["en", "fr"] as const).map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span className="mx-1 text-forest-900/20">/</span>}
          <button
            type="button"
            onClick={() => set(l)}
            aria-pressed={lang === l}
            className={lang === l ? "text-forest-900 underline underline-offset-4" : "hover:text-forest-900"}
          >
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}
