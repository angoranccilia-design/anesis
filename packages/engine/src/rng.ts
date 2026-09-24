/** Deterministic PRNG (mulberry32). Same seed → same scenario → same decision. No Math.random anywhere in the engine. */
export interface Rng {
  next(): number;                       // [0,1)
  uniform(lo: number, hi: number): number;
  normal(mean: number, sd: number): number;
}

export function rng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    uniform: (lo, hi) => lo + (hi - lo) * next(),
    normal: (mean, sd) => {
      const u = Math.max(next(), 1e-12), v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
  };
}
