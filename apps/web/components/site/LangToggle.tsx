"use client";

import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { Lang } from "@/lib/i18n";

/** Bascule EN/FR — pose le cookie de langue et rafraîchit le rendu serveur. `onDark` = texte clair. */
export function LangToggle({ lang, onDark = false }: { lang: Lang; onDark?: boolean }) {
  const router = useRouter();
  const set = (next: Lang) => {
    document.cookie = `lang=${next};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  };
  const active = onDark ? "text-white underline underline-offset-4" : "text-forest-900 underline underline-offset-4";
  const idle = onDark ? "text-cream-100/70 hover:text-white" : "hover:text-forest-900";
  return (
    <div className={clsx("flex items-center gap-1 font-sans text-[0.7rem] tracking-wide", onDark ? "text-cream-100/70" : "text-forest-800/70")}>
      {(["en", "fr"] as const).map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span className={clsx("mx-1", onDark ? "text-cream-100/30" : "text-forest-900/20")}>/</span>}
          <button type="button" onClick={() => set(l)} aria-pressed={lang === l} className={lang === l ? active : idle}>
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}
