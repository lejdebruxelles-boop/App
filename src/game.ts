// Mozaik — core game logic (pure, platform independent).
//
// Rules: an N×N grid of tiles, each in one of 3 colors. Tapping a tile
// advances it and its orthogonal neighbours to the next color (mod 3).
// Goal: make the whole board a single color.
//
// The tap effect is linear over GF(3), so we can compute the exact optimal
// number of moves (the "par") and give perfect hints with Gaussian elimination.

export const COLORS = 3;

export interface Puzzle {
  size: number;
  cells: number[];
  par: number;
}

// ---------- deterministic RNG ----------
export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- board mechanics ----------
export function affected(idx: number, size: number): number[] {
  const r = Math.floor(idx / size);
  const c = idx % size;
  const out = [idx];
  if (r > 0) out.push(idx - size);
  if (r < size - 1) out.push(idx + size);
  if (c > 0) out.push(idx - 1);
  if (c < size - 1) out.push(idx + 1);
  return out;
}

export function tap(cells: number[], size: number, idx: number, times = 1): number[] {
  const next = cells.slice();
  for (const j of affected(idx, size)) next[j] = (next[j] + times) % COLORS;
  return next;
}

export function isSolved(cells: number[]): boolean {
  return cells.every((v) => v === cells[0]);
}

// ---------- GF(3) solver ----------
const INV3 = [0, 1, 2]; // multiplicative inverses mod 3 (1*1=1, 2*2=4≡1)

export interface Solution {
  moves: number;
  taps: number[]; // taps[j] in {0,1,2}: how many times to tap cell j
  color: number; // final uniform color
}

/** Returns the minimum-move solution from `cells`, or null if unsolvable. */
export function solve(cells: number[], size: number): Solution | null {
  const n = size * size;
  let best: Solution | null = null;

  for (let color = 0; color < COLORS; color++) {
    // Build augmented matrix A | b where A[i][j] = 1 if tapping j affects i.
    const m: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row = new Array(n + 1).fill(0);
      for (const j of affected(i, size)) row[j] = 1; // A is symmetric
      row[n] = (color - cells[i] + COLORS * 2) % COLORS;
      m.push(row);
    }

    const pivotCols: number[] = [];
    let r = 0;
    for (let col = 0; col < n && r < n; col++) {
      let p = -1;
      for (let i = r; i < n; i++) if (m[i][col] !== 0) { p = i; break; }
      if (p === -1) continue;
      [m[r], m[p]] = [m[p], m[r]];
      const inv = INV3[m[r][col]];
      for (let k = col; k <= n; k++) m[r][k] = (m[r][k] * inv) % COLORS;
      for (let i = 0; i < n; i++) {
        if (i === r || m[i][col] === 0) continue;
        const f = m[i][col];
        for (let k = col; k <= n; k++) m[i][k] = (m[i][k] - f * m[r][k] + COLORS * 3) % COLORS;
      }
      pivotCols.push(col);
      r++;
    }

    // Inconsistent system → this color is unreachable.
    let consistent = true;
    for (let i = r; i < n; i++) if (m[i][n] !== 0) { consistent = false; break; }
    if (!consistent) continue;

    const isPivot = new Array(n).fill(false);
    pivotCols.forEach((c) => (isPivot[c] = true));
    const free = [];
    for (let c = 0; c < n; c++) if (!isPivot[c]) free.push(c);

    // Enumerate free variables (nullspace) to find the minimum, capped for speed.
    const enumerate = free.length <= 7;
    const combos = enumerate ? COLORS ** free.length : 1;
    for (let k = 0; k < combos; k++) {
      const x = new Array(n).fill(0);
      let t = k;
      for (const f of free) { x[f] = t % COLORS; t = Math.floor(t / COLORS); }
      for (let i = 0; i < pivotCols.length; i++) {
        const pc = pivotCols[i];
        let v = m[i][n];
        for (const f of free) v -= m[i][f] * x[f];
        x[pc] = ((v % COLORS) + COLORS) % COLORS;
      }
      const moves = x.reduce((a, b) => a + b, 0);
      if (!best || moves < best.moves) best = { moves, taps: x, color };
    }
  }
  return best;
}

/** Index of a cell to tap next on an optimal path, or -1 if solved/unsolvable. */
export function hint(cells: number[], size: number): number {
  if (isSolved(cells)) return -1;
  const s = solve(cells, size);
  if (!s) return -1;
  return s.taps.findIndex((t) => t > 0);
}

// ---------- generation ----------
export function generate(size: number, minPar: number, maxPar: number, seed: string): Puzzle {
  const rng = mulberry32(hashString(seed));
  let fallback: Puzzle | null = null;
  for (let attempt = 0; attempt < 300; attempt++) {
    const base = Math.floor(rng() * COLORS);
    let cells = new Array(size * size).fill(base);
    const scrambles = minPar + Math.floor(rng() * (maxPar - minPar + 2));
    for (let k = 0; k < scrambles; k++) {
      // Tapping twice == one step backwards, so the puzzle is always solvable.
      cells = tap(cells, size, Math.floor(rng() * cells.length), 2);
    }
    if (isSolved(cells)) continue;
    const s = solve(cells, size);
    if (!s) continue;
    const p: Puzzle = { size, cells, par: s.moves };
    if (s.moves >= minPar && s.moves <= maxPar) return p;
    if (!fallback || Math.abs(s.moves - minPar) < Math.abs(fallback.par - minPar)) fallback = p;
  }
  return fallback!;
}

// ---------- daily & levels ----------
const EPOCH = Date.UTC(2026, 0, 1);

export function dateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dailyNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 86400000) + 1;
}

/** Difficulty ramps over the week: Monday easy → Sunday hard. */
export function dailyPuzzle(key: string): Puzzle {
  const [y, m, d] = key.split("-").map(Number);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 0 = Monday
  const table: [number, number, number][] = [
    [5, 4, 5], [5, 5, 6], [5, 6, 7], [5, 7, 8], [5, 8, 9], [6, 8, 10], [6, 10, 12],
  ];
  const [size, lo, hi] = table[weekday];
  return generate(size, lo, hi, `mozaik-daily-${key}`);
}

export function levelPuzzle(level: number): Puzzle {
  if (level <= 3) return generate(3, level, level, `mozaik-level-${level}`);
  const size = level < 12 ? 4 : level < 40 ? 5 : 6;
  const lo = Math.min(3 + Math.floor(level / 4), 14);
  return generate(size, lo, lo + 2, `mozaik-level-${level}`);
}

export function stars(moves: number, par: number): number {
  if (moves <= par) return 3;
  if (moves <= par + 3) return 2;
  return 1;
}
