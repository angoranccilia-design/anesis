"use client";

import dynamic from "next/dynamic";

/**
 * Chargement paresseux du graphique (Recharts est lourd) — hors du bundle initial, chargé quand la
 * section approche. Respecte le budget de performance du brief (§4). Placeholder pendant le chargement.
 */
export const TrajectoryChartLazy = dynamic(
  () => import("./TrajectoryChart").then((m) => m.TrajectoryChart),
  {
    ssr: false,
    loading: () => <div className="h-[360px] w-full animate-pulse rounded-xl bg-cream-200/50" />,
  },
);
