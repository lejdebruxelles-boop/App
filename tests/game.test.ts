import { describe, it, expect } from "vitest";
import { tap, solve, isSolved, generate, dailyPuzzle, levelPuzzle, hint, dailyNumber, affected } from "../src/game";

function applySolution(cells: number[], size: number, taps: number[]) {
  let c = cells;
  taps.forEach((t, j) => { if (t) c = tap(c, size, j, t); });
  return c;
}

describe("game", () => {
  it("tap affects cell and orthogonal neighbours", () => {
    expect(affected(0, 3).sort()).toEqual([0, 1, 3]);
    expect(affected(4, 3).sort()).toEqual([1, 3, 4, 5, 7]);
    expect(tap(new Array(9).fill(0), 3, 4)).toEqual([0, 1, 0, 1, 1, 1, 0, 1, 0]);
  });

  it("solver returns a valid solution", () => {
    for (let s = 0; s < 40; s++) {
      const p = generate(5, 3, 9, "t" + s);
      const sol = solve(p.cells, 5)!;
      expect(sol).not.toBeNull();
      expect(isSolved(applySolution(p.cells, 5, sol.taps))).toBe(true);
      expect(sol.moves).toBe(p.par);
    }
  });

  it("solver is optimal on single tap", () => {
    const cells = tap(new Array(16).fill(1), 4, 5, 2);
    expect(solve(cells, 4)!.moves).toBe(1);
  });

  it("daily puzzles are deterministic and in range", () => {
    for (let d = 1; d <= 28; d++) {
      const key = `2026-11-${String(d).padStart(2, "0")}`;
      const a = dailyPuzzle(key), b = dailyPuzzle(key);
      expect(a).toEqual(b);
      expect(a.par).toBeGreaterThan(0);
      expect(isSolved(a.cells)).toBe(false);
    }
    expect(dailyNumber("2026-01-01")).toBe(1);
  });

  it("levels are solvable and hints progress", () => {
    for (let l = 1; l <= 60; l += 3) {
      const p = levelPuzzle(l);
      let cells = p.cells, steps = 0;
      while (!isSolved(cells) && steps < 100) { cells = tap(cells, p.size, hint(cells, p.size)); steps++; }
      expect(isSolved(cells)).toBe(true);
      expect(steps).toBe(p.par);
    }
  });
});
