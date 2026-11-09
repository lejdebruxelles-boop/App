import type { Lang } from "./i18n";
import { CONFIG } from "./config";

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
  premium: boolean; // cached entitlement, refreshed from the store at launch
  theme: string;
  archive: Record<string, DailyResult>; // past dailies played from the archive (no streak impact)
  levelsSinceAd: number;
  wins: number;
  reviewAsked: boolean;
  paywallDate: string;
}

const KEY = "mozaik-save-v1";
export const HINTS_PER_DAY = CONFIG.freeHintsPerDay;

const defaults = (): Save => ({
  lang: null,
  haptics: true,
  symbols: false,
  seenTutorial: false,
  level: 1,
  levelStars: {},
  daily: {},
  hints: { date: "", left: HINTS_PER_DAY },
  premium: false,
  theme: "classic",
  archive: {},
  levelsSinceAd: 0,
  wins: 0,
  reviewAsked: false,
  paywallDate: "",
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LANG_CODES = ["fr", "en", "es", "de", "pt", "it"];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const int = (v: unknown, min: number, max: number, def: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : def;

function cleanResults(v: unknown): Record<string, DailyResult> {
  const out: Record<string, DailyResult> = {};
  if (!isObj(v)) return out;
  for (const [k, r] of Object.entries(v)) {
    if (!DATE_RE.test(k) || !isObj(r)) continue;
    out[k] = {
      moves: int(r.moves, 0, 10000, 0),
      par: int(r.par, 0, 1000, 0),
      stars: int(r.stars, 1, 3, 1),
      hinted: r.hinted === true,
    };
  }
  return out;
}

/** Validates every field: a corrupted or hand-edited save can never crash the app or inject markup. */
export function sanitize(raw: unknown): Save {
  const d = defaults();
  if (!isObj(raw)) return d;
  const levelStars: Record<number, number> = {};
  if (isObj(raw.levelStars)) {
    for (const [k, v] of Object.entries(raw.levelStars)) {
      const lv = Number(k);
      if (Number.isInteger(lv) && lv > 0 && lv < 1e6) levelStars[lv] = int(v, 1, 3, 1);
    }
  }
  const hints = isObj(raw.hints) && typeof raw.hints.date === "string" && DATE_RE.test(raw.hints.date)
    ? { date: raw.hints.date, left: int(raw.hints.left, 0, 100, HINTS_PER_DAY) }
    : d.hints;
  return {
    lang: typeof raw.lang === "string" && LANG_CODES.includes(raw.lang) ? (raw.lang as Lang) : null,
    haptics: raw.haptics !== false,
    symbols: raw.symbols === true,
    seenTutorial: raw.seenTutorial === true,
    level: int(raw.level, 1, 1e6, 1),
    levelStars,
    daily: cleanResults(raw.daily),
    hints,
    premium: raw.premium === true,
    theme: typeof raw.theme === "string" && /^[a-z]{1,20}$/.test(raw.theme) ? raw.theme : "classic",
    archive: cleanResults(raw.archive),
    levelsSinceAd: int(raw.levelsSinceAd, 0, 1e6, 0),
    wins: int(raw.wins, 0, 1e9, 0),
    reviewAsked: raw.reviewAsked === true,
    paywallDate: typeof raw.paywallDate === "string" && DATE_RE.test(raw.paywallDate) ? raw.paywallDate : "",
  };
}

export function load(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return sanitize(JSON.parse(raw));
  } catch {
    /* storage unavailable or corrupted: start fresh */
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
