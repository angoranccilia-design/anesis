"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface Answer { intent: string; headline: string; facts: string[]; refs: string[]; sufficient: boolean }
interface Reply { intent: string; tier: string; executed: boolean; runId?: string | null; language?: string; locale?: string; answer: Answer & { notice?: string; language?: string }; llm?: { enabled: boolean; text: string | null }; outcome?: unknown }
const LANGS = [["auto", "Auto"], ["en", "English"], ["fr", "Français"], ["es", "Español"], ["de", "Deutsch"], ["it", "Italiano"], ["pt", "Português"], ["nl", "Nederlands"]] as const;
const LOCALE: Record<string, string> = { en: "en-GB", fr: "fr-FR", es: "es-ES", de: "de-DE", it: "it-IT", pt: "pt-PT", nl: "nl-NL" };

type SR = { start(): void; stop(): void; abort(): void; continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null; onspeechstart: (() => void) | null };

/**
 * Ask Anesis — typed or spoken. Both channels post to the same route; the answer is read from run records.
 * Voice: the browser's own speech recognition and synthesis (real, no key). Interruption: if the user starts
 * speaking while Anesis is speaking, synthesis is cancelled. If the browser has no speech API, the panel says so.
 */
export function AskPanel({ runId, onRunCreated, onOpenRef }: { runId: string | null; onRunCreated: (id: string) => void; onOpenRef: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [log, setLog] = useState<{ q: string; r: Reply; channel: "text" | "voice" }[]>([]);
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState<"unsupported" | "idle" | "listening" | "speaking">("idle");
  const [interim, setInterim] = useState("");
  const [language, setLanguage] = useState<string>("auto");
  const recRef = useRef<SR | null>(null);
  const speakEnabled = useRef(true);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor || !("speechSynthesis" in window)) setVoice("unsupported");
  }, []);

  const speak = useCallback((text: string, locale = "en-GB") => {
    if (!("speechSynthesis" in window) || !speakEnabled.current) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = locale; u.rate = 0.95;
    u.onstart = () => setVoice("speaking"); u.onend = () => setVoice((v) => (v === "speaking" ? "idle" : v));
    window.speechSynthesis.speak(u);
  }, []);

  const send = useCallback(async (question: string, channel: "text" | "voice") => {
    if (!question.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/engine/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, runId, channel, language }) });
      const r = (await res.json()) as Reply;
      setLog((l) => [{ q: question, r, channel }, ...l]);
      if (r.runId && r.intent === "run_cycle") onRunCreated(r.runId);
      if (channel === "voice") speak(`${r.answer.headline} ${r.answer.facts.slice(0, 2).join(" ")}`, r.locale ?? "en-GB");
    } finally { setBusy(false); setQ(""); }
  }, [runId, onRunCreated, speak, language]);

  const listen = useCallback(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    window.speechSynthesis?.cancel(); // user turn interrupts Anesis
    const rec = new Ctor(); recRef.current = rec;
    rec.lang = LOCALE[language] ?? "en-GB"; rec.continuous = false; rec.interimResults = true;
    rec.onspeechstart = () => window.speechSynthesis?.cancel();
    rec.onresult = (e) => {
      let text = ""; for (let i = 0; i < e.results.length; i++) text += e.results[i]?.[0]?.transcript ?? "";
      setInterim(text);
      const last = e.results[e.results.length - 1] as unknown as { isFinal?: boolean } | undefined;
      if (last?.isFinal) { setInterim(""); void send(text, "voice"); }
    };
    rec.onerror = (e) => { setVoice("idle"); setInterim(`voice error: ${e.error}`); };
    rec.onend = () => setVoice((v) => (v === "listening" ? "idle" : v));
    setVoice("listening"); rec.start();
  }, [send, language]);

  const stopListening = () => { recRef.current?.stop(); setVoice("idle"); };

  return (
    <section data-testid="ask-panel">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2 text-xs text-forest-800/60">
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-md border border-forest-900/15 bg-cream-50 px-2 py-1 text-forest-900" aria-label="Language" data-testid="ask-language">{LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          {voice === "unsupported" ? <span>Voice is not available in this browser</span> : voice === "listening" ? <button onClick={stopListening} className="rounded-full border border-gold px-3 py-1 text-gold-deep">Listening… stop</button> : <button onClick={listen} className="rounded-full border border-forest-900/20 px-3 py-1 text-forest-800 hover:border-gold" data-testid="voice-button">Speak</button>}
          {voice === "speaking" && <button onClick={() => window.speechSynthesis.cancel()} className="rounded-full border border-forest-900/20 px-3 py-1">Interrupt</button>}
        </div>
      </div>
      {interim && <p className="mt-2 font-serif italic text-forest-800/70">{interim}</p>}
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(q, "text"); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Why is paid acquisition blocked? What would change your mind?" className="flex-1 rounded-full border border-forest-900/15 bg-white px-5 py-2.5 text-sm text-forest-900 placeholder:text-forest-800/35 focus:border-gold focus:outline-none" data-testid="ask-input" />
        <button disabled={busy} className="btn-primary !py-2.5 disabled:opacity-50" data-testid="ask-submit">Ask</button>
      </form>
      <div className="mt-4 space-y-3">
        {log.map((it, n) => (
          <div key={n} className="border-t border-forest-900/8 py-5 text-sm" data-testid="ask-answer">
            <p className="text-forest-800/55">{it.channel === "voice" ? "🎙 " : ""}{it.q} <span className="ml-2 rounded border border-gold/40 px-1 text-[0.62rem] uppercase tracking-wider text-gold-deep">{it.r.intent} · {it.r.tier}{it.r.executed ? "" : " · not executed"}</span></p>
            <p className={`mt-2 font-serif text-xl font-light ${it.r.answer.sufficient ? "text-forest-900" : "text-gold-deep"}`}>{it.r.answer.headline}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-forest-800/80">{it.r.answer.facts.map((f, k) => <li key={k}>{f}</li>)}</ul>
            {it.r.answer.notice && <p className="mt-2 text-xs italic text-forest-800/55">{it.r.answer.notice}</p>}
            {it.r.answer.refs.length > 0 && <p className="mt-2 flex flex-wrap gap-1">{it.r.answer.refs.map((ref) => <button key={ref} onClick={() => onOpenRef(ref)} className="rounded border border-gold/50 px-1.5 py-0.5 font-mono text-[0.68rem] text-gold-deep hover:border-gold">{ref}</button>)}</p>}
            {it.r.llm && (it.r.llm.enabled ? it.r.llm.text && <p className="mt-2 border-l border-gold/50 pl-3 italic text-forest-800/70">{it.r.llm.text}<span className="ml-2 text-[0.65rem] uppercase tracking-wider not-italic">language layer</span></p> : <p className="mt-2 text-[0.65rem] uppercase tracking-wider text-forest-800/40">LLM interpretation not enabled in this environment</p>)}
          </div>
        ))}
      </div>
    </section>
  );
}
