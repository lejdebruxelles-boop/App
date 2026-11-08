import type { Lang } from "./i18n";

export interface DailyResult {
  moves: number;
  par: number;
  stars: number;
  hinted: boolean;
}

export interface Save {
  lang: Lang | null;
  haptics: boolean;
  symbols: boolean;
  seenTutorial: boolean;
  level: number; // next level to play
  levelStars: Record<number, number>;
  daily: Record<string, DailyResult>; // dateKey -> result
  hints: { date: string; left: number };
}

const KEY = "mozaik-save-v1";
export const HINTS_PER_DAY = 3;

const defaults = (): Save => ({
  lang: null,
  haptics: true,
  symbols: false,
  seenTutorial: false,
  level: 1,
  levelStars: {},
  daily: {},
  hints: { date: "", left: HINTS_PER_DAY },
});

export function load(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch {
    /* storage unavailable: play without persistence */
  }
  return defaults();
}

export function persist(s: Save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function prevDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d - 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function computeStats(s: Save, today: string) {
  const days = Object.keys(s.daily);
  const set = new Set(days);
  // current streak: consecutive days ending today (or yesterday if today not played yet)
  let cur = 0;
  let k = set.has(today) ? today : prevDay(today);
  while (set.has(k)) { cur++; k = prevDay(k); }
  // best streak
  let best = 0;
  for (const d of days) {
    if (set.has(prevDay(d))) continue;
    let len = 0, x = d;
    while (set.has(x)) {
      len++;
      const [y, m, dd] = x.split("-").map(Number);
      const n = new Date(y, m - 1, dd + 1);
      x = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
    }
    best = Math.max(best, len);
  }
  const perfects = days.filter((d) => s.daily[d].stars === 3).length;
  return { played: days.length, streak: cur, best, perfects };
}
