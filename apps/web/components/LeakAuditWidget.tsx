"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

/**
 * Widget « Anesis Leak Audit » — FICTIF / illustratif (brief §2, ligne 43).
 * Jamais un chiffre exact : une FOURCHETTE floue + une bande qualitative, une mention explicite, et un
 * CTA OBLIGATOIRE vers la vraie évaluation gratuite (Porte 1). Il aguiche, il ne remplace pas.
 */
const gbp0 = (n: number) => `£${Math.round(n).toLocaleString("en-GB")}`;
const roundTo = (n: number, step: number) => Math.round(n / step) * step;

function band(otaShare: number): { label: string; tone: string } {
  if (otaShare >= 55) return { label: "Elevated", tone: "text-gold-deep" };
  if (otaShare >= 35) return { label: "Moderate", tone: "text-forest-800" };
  return { label: "Contained", tone: "text-forest-800/70" };
}

export function LeakAuditWidget() {
  const [keys, setKeys] = useState(28);
  const [adr, setAdr] = useState(190);
  const [ota, setOta] = useState(48);

  const { low, high, indicator } = useMemo(() => {
    const occupancy = 0.6;
    const monthlyRoomRevenue = keys * adr * occupancy * 30;
    const centre = monthlyRoomRevenue * (ota / 100) * 0.14; // fraction récupérable grossière, volontairement floue
    return {
      low: Math.max(1000, roundTo(centre * 0.7, 500)),
      high: roundTo(centre * 1.35, 500),
      indicator: band(ota),
    };
  }, [keys, adr, ota]);

  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border border-forest-900/15 bg-cream-50 p-8 shadow-[0_2px_40px_-24px_rgba(18,42,29,0.5)] md:p-10">
      <p className="eyebrow">Anesis Leak Audit · illustrative</p>
      <h3 className="mt-3 font-serif text-3xl font-light text-forest-900">A first glimpse of what leaks</h3>

      <div className="mt-8 space-y-6">
        <Slider label="Rooms (keys)" value={keys} min={12} max={80} step={1} onChange={setKeys} />
        <Slider label="Average nightly rate" value={adr} min={120} max={420} step={5} prefix="£" onChange={setAdr} />
        <Slider label="Share booked through OTAs" value={ota} min={20} max={80} step={1} suffix="%" onChange={setOta} />
      </div>

      <div className="mt-9 rounded-xl border border-gold/30 bg-cream-100 p-6 text-center">
        <p className="eyebrow">Estimated monthly leak</p>
        <p className="mt-2 font-serif text-4xl font-light tracking-tight text-forest-900 transition-all duration-300 md:text-5xl">
          {gbp0(low)} <span className="text-gold-deep/80">–</span> {gbp0(high)}
        </p>
        <p className="mt-1 font-sans text-sm text-forest-800/75">
          per month · exposure looks <span className={indicator.tone}>{indicator.label.toLowerCase()}</span>
        </p>
      </div>

      <p className="mt-5 font-sans text-xs leading-relaxed text-forest-800/60">
        This is an illustrative estimate. Your real Anesis Revenue Leak Index™ uses your actual website,
        reviews and booking data — get it free below.
      </p>

      <Link
        href="/diagnostic"
        className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-forest-900 px-6 py-3.5 font-sans text-sm font-medium text-cream-50 transition-colors hover:bg-forest-800"
      >
        Get your real assessment — free
      </Link>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  prefix = "",
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="font-sans text-sm text-forest-800/85">{label}</label>
        <span className="font-serif text-lg text-forest-900">
          {prefix}
          {value.toLocaleString("en-GB")}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-cream-300 accent-gold"
        aria-label={label}
      />
    </div>
  );
}
