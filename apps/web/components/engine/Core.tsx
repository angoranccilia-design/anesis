"use client";
import { motion } from "framer-motion";
import type { EngineState } from "@anesis/engine";

/**
 * The core — a single form whose motion is a function of the engine state received from the event
 * stream. No timers decide the state; the last engine event does. Palette: forest, cream, gold only.
 */
const PROFILE: Record<EngineState, { label: string; ring: number; pulse: number; spin: number; opacity: number; dash: string; glow: number }> = {
  IDLE:          { label: "Idle — waiting",              ring: 1.00, pulse: 6.0, spin: 0,   opacity: 0.35, dash: "0 0",     glow: 0.10 },
  OBSERVING:     { label: "Observing",                   ring: 1.04, pulse: 2.2, spin: 40,  opacity: 0.55, dash: "2 6",     glow: 0.18 },
  DIAGNOSING:    { label: "Diagnosing",                  ring: 1.08, pulse: 1.6, spin: 18,  opacity: 0.75, dash: "40 12",   glow: 0.28 },
  INVESTIGATING: { label: "Investigating",               ring: 1.06, pulse: 1.2, spin: 9,   opacity: 0.70, dash: "120 240", glow: 0.24 },
  COMPARING:     { label: "Comparing alternatives",      ring: 1.10, pulse: 1.4, spin: 24,  opacity: 0.70, dash: "60 60",   glow: 0.26 },
  DECIDING:      { label: "Deciding",                    ring: 0.96, pulse: 1.0, spin: 6,   opacity: 0.95, dash: "0 0",     glow: 0.40 },
  BLOCKING:      { label: "Blocking an action",          ring: 1.14, pulse: 0.8, spin: 0,   opacity: 1.00, dash: "6 6",     glow: 0.55 },
  MEASURING:     { label: "Measuring",                   ring: 1.02, pulse: 2.0, spin: 12,  opacity: 0.80, dash: "1 10",    glow: 0.30 },
  LEARNING:      { label: "Learning",                    ring: 1.00, pulse: 3.0, spin: -14, opacity: 0.85, dash: "200 40",  glow: 0.34 },
  ALERT:         { label: "Alert — attention required",  ring: 1.18, pulse: 0.6, spin: 0,   opacity: 1.00, dash: "3 3",     glow: 0.60 },
};

export function Core({ state, size = 260 }: { state: EngineState; size?: number }) {
  const p = PROFILE[state];
  const r = size / 2;
  return (
    <div className="relative flex flex-col items-center" data-testid="core" data-state={state}>
      <div className="relative" style={{ width: size, height: size }}>
        <motion.div className="absolute inset-0 rounded-full" animate={{ boxShadow: `0 0 ${60 * p.glow + 20}px ${20 * p.glow}px rgba(203,174,121,${p.glow})` }} transition={{ duration: 0.8 }} />
        <motion.svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="absolute inset-0">
          <defs>
            <radialGradient id="coreFill" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#CBAE79" stopOpacity={0.9} />
              <stop offset="55%" stopColor="#356E50" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#0E1F16" stopOpacity={0.2} />
            </radialGradient>
          </defs>
          <motion.circle cx={r} cy={r} r={r * 0.46} fill="url(#coreFill)"
            animate={{ scale: [p.ring * 0.97, p.ring * 1.03, p.ring * 0.97], opacity: p.opacity }}
            transition={{ scale: { duration: p.pulse, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.6 } }} style={{ transformOrigin: "50% 50%" }} />
          <motion.circle cx={r} cy={r} r={r * 0.68} fill="none" stroke="#CBAE79" strokeWidth={1.2} strokeDasharray={p.dash}
            animate={{ rotate: p.spin === 0 ? 0 : 360, opacity: p.opacity }}
            transition={{ rotate: { duration: p.spin === 0 ? 0 : Math.abs(360 / p.spin) * 2, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.6 } }} style={{ transformOrigin: "50% 50%" }} />
          <motion.circle cx={r} cy={r} r={r * 0.86} fill="none" stroke="#B08D4C" strokeOpacity={0.35} strokeWidth={0.6}
            animate={{ scale: [1, p.ring, 1] }} transition={{ duration: p.pulse * 1.5, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "50% 50%" }} />
        </motion.svg>
      </div>
      <p className="mt-3 font-serif text-xl font-light text-cream-100" data-testid="core-label">{p.label}</p>
      <p className="eyebrow mt-1 !text-gold-light">state · {state}</p>
    </div>
  );
}
