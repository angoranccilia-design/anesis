"use client";

/**
 * Anesis Studio — hub « bureau d'employés IA » (Phase 1, visuel + interactif léger).
 * 12 agents nommés, en ligne, groupés par équipe ; fil d'activité qui vit ; panneau de chat.
 * Branding clair : crème + vert + logo. Les réponses des agents sont, en Phase 1, contextuelles
 * mais locales — la Phase 2 les branchera sur la vraie IA (Anthropic) et le vrai flux d'événements.
 */
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { AgentCard, ActivityItem, AgentGroup } from "@/lib/agents";

const GROUPS: AgentGroup[] = ["Assess & plan", "Win the booking", "Presence & creative", "Keep & grow"];

interface Msg {
  from: "you" | "agent";
  text: string;
}

export function TeamHub({ agents, activity }: { agents: AgentCard[]; activity: ActivityItem[] }) {
  const [feed, setFeed] = useState<ActivityItem[]>(() => activity.slice(0, 4));
  const [tick, setTick] = useState(4);
  const [active, setActive] = useState<AgentCard | null>(null);

  // Fil d'activité « vivant » : un nouvel événement toutes les ~4,5 s.
  useEffect(() => {
    const t = setInterval(() => {
      setFeed((f) => [activity[tick % activity.length]!, ...f].slice(0, 6));
      setTick((n) => n + 1);
    }, 4500);
    return () => clearInterval(t);
  }, [activity, tick]);

  return (
    <div className="min-h-screen bg-cream-50 text-forest-900">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-forest-900/10 bg-cream-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Anesis" width={80} height={80} className="h-9 w-9 object-contain" />
            <div className="leading-none">
              <p className="font-script text-2xl text-forest-900">Anesis Studio</p>
              <p className="mt-0.5 text-[0.7rem] uppercase tracking-[0.2em] text-gold-deep">Your team of 12 specialists</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-forest-900/12 bg-white px-4 py-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-sm text-forest-800/80">12 online · ready</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1fr_320px]">
        {/* Team */}
        <div className="space-y-10">
          {GROUPS.map((group) => (
            <section key={group}>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-gold-deep">{group}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {agents.filter((a) => a.group === group).map((a) => (
                  <AgentCardView key={a.id} a={a} onMessage={() => setActive(a)} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Live activity */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-2xl border border-forest-900/10 bg-white p-5 shadow-[0_20px_50px_-30px_rgba(18,42,29,0.4)]">
            <div className="flex items-center justify-between">
              <p className="font-serif text-lg font-light">Live activity</p>
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            </div>
            <ul className="mt-4 space-y-3">
              {feed.map((it, i) => (
                <li key={`${it.agent}-${tick}-${i}`} className="flex gap-3">
                  <Avatar initials={it.initials} size="sm" />
                  <div>
                    <p className="text-sm leading-snug text-forest-800/90">
                      <span className="font-medium text-forest-900">{it.agent}</span> {it.text}
                    </p>
                    <p className="mt-0.5 text-[0.65rem] uppercase tracking-wide text-forest-800/40">
                      {i === 0 ? "just now" : `${i * 4 + 2}m ago`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {active && <ChatDrawer agent={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function AgentCardView({ a, onMessage }: { a: AgentCard; onMessage: () => void }) {
  const gated = a.tier >= "T3";
  return (
    <div className="group flex h-full flex-col rounded-2xl border border-forest-900/10 bg-white p-5 transition-shadow hover:shadow-[0_20px_50px_-30px_rgba(18,42,29,0.45)]">
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar initials={a.initials} />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" title="Online" />
        </div>
        <div className="min-w-0">
          <p className="font-serif text-lg font-light leading-tight text-forest-900">{a.name}</p>
          <p className="text-xs text-forest-800/60">{a.role}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full border border-forest-900/12 px-2 py-0.5 text-[0.6rem] font-semibold text-forest-800/60" title="Autonomy level">
          {a.tier}
        </span>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-forest-800/80">{a.what}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className={`text-[0.7rem] ${gated ? "text-gold-deep" : "text-forest-800/50"}`}>
          {gated ? "🔒 " : ""}{a.autonomy}
        </span>
        <button
          type="button"
          onClick={onMessage}
          className="rounded-full bg-forest-900 px-4 py-1.5 text-xs text-cream-50 transition-colors hover:bg-forest-800"
        >
          Message
        </button>
      </div>
    </div>
  );
}

function ChatDrawer({ agent, onClose }: { agent: AgentCard; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    { from: "agent", text: `Hi, I'm ${agent.name}, your ${agent.role}. ${agent.what} What would you like me to do?` },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function send() {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { from: "you", text }]);
    setInput("");
    setTyping(true);
    // Phase 1 : réponse contextuelle locale. Phase 2 : appel à la vraie IA (Anthropic) via route.
    window.setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        { from: "agent", text: `On it — ${agent.what.replace(/\.$/, "").toLowerCase()}. I'll report back with the numbers.` },
      ]);
    }, 900);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-forest-950/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-full w-full max-w-md flex-col bg-cream-50 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-forest-900/10 bg-white px-5 py-4">
          <div className="relative">
            <Avatar initials={agent.initials} />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          <div className="min-w-0">
            <p className="font-serif text-lg font-light leading-tight">{agent.name}</p>
            <p className="text-xs text-forest-800/60">{agent.role} · online</p>
          </div>
          <button type="button" onClick={onClose} className="ml-auto rounded-full p-2 text-forest-800/60 hover:bg-forest-900/5" aria-label="Close">✕</button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {messages.map((m, i) => (
            <div key={i} className={m.from === "you" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.from === "you"
                    ? "max-w-[80%] rounded-2xl rounded-br-sm bg-forest-900 px-4 py-2.5 text-sm text-cream-50"
                    : "max-w-[80%] rounded-2xl rounded-bl-sm border border-forest-900/10 bg-white px-4 py-2.5 text-sm text-forest-800/90"
                }
              >
                {m.text}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-forest-900/10 bg-white px-4 py-3 text-forest-800/50">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-forest-800/40 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-forest-800/40 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-forest-800/40" />
                </span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-forest-900/10 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={`Message ${agent.name}…`}
              className="flex-1 rounded-full border border-forest-900/15 bg-cream-50 px-4 py-2.5 text-sm outline-none focus:border-gold"
            />
            <button type="button" onClick={send} className="rounded-full bg-forest-900 px-4 py-2.5 text-sm text-cream-50 hover:bg-forest-800">
              Send
            </button>
          </div>
          <p className="mt-2 text-center text-[0.65rem] text-forest-800/40">Live AI replies coming soon — Phase 2.</p>
        </div>
      </div>
    </div>
  );
}

function Avatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-8 w-8 text-[0.7rem]" : "h-11 w-11 text-sm";
  return (
    <div className={`flex ${dim} items-center justify-center rounded-full border border-gold/40 bg-gradient-to-br from-cream-100 to-cream-200 font-semibold uppercase tracking-wide text-forest-900`}>
      {initials}
    </div>
  );
}
