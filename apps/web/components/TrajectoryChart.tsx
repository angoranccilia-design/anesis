"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";

/**
 * Graphique de trajectoire (brief §2) — revenu direct mensuel : ligne de base (plate) vs réel obtenu
 * (montant qui grimpe). Se DESSINE au défilement (monté seulement quand visible → l'anim Recharts joue).
 * Données d'ÉCHANTILLON, clairement étiquetées. Palette fermée (encre verte / or).
 */
const DATA = [
  { m: "Start", baseline: 41, recovered: 41 },
  { m: "M1", baseline: 41, recovered: 44 },
  { m: "M2", baseline: 40, recovered: 48 },
  { m: "M3", baseline: 41, recovered: 52 },
  { m: "M4", baseline: 40, recovered: 55 },
  { m: "M5", baseline: 41, recovered: 58 },
  { m: "M6", baseline: 40, recovered: 61 },
];

const FOREST = "#122A1D";
const GOLD = "#B08D4C";
const MUTED = "#9AA79B";

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-forest-900/15 bg-cream-50 px-4 py-3 shadow-sm">
      <p className="font-sans text-xs uppercase tracking-widest text-gold-deep">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="mt-1 font-sans text-sm text-forest-900">
          {p.name}: <span className="font-serif text-base">£{p.value}k</span>
          <span className="text-forest-800/60"> /mo direct</span>
        </p>
      ))}
    </div>
  );
}

export function TrajectoryChart() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div ref={ref} className="h-[360px] w-full">
      {inView ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={DATA} margin={{ top: 10, right: 16, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={FOREST} strokeOpacity={0.08} vertical={false} />
            <XAxis dataKey="m" tick={{ fill: FOREST, fontSize: 12, opacity: 0.7 }} axisLine={{ stroke: FOREST, strokeOpacity: 0.15 }} tickLine={false} />
            <YAxis
              tick={{ fill: FOREST, fontSize: 12, opacity: 0.7 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `£${v}k`}
              domain={[30, 66]}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="baseline"
              name="Baseline"
              stroke={MUTED}
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              isAnimationActive
              animationDuration={1400}
            />
            <Line
              type="monotone"
              dataKey="recovered"
              name="With Anesis"
              stroke={GOLD}
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: GOLD }}
              isAnimationActive
              animationDuration={1800}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
