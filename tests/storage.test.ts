import { describe, it, expect } from "vitest";
import { sanitize, computeStats } from "../src/storage";
import { dict } from "../src/i18n";

describe("save sanitizer (security)", () => {
  it("returns defaults for garbage input", () => {
    for (const bad of [null, 42, "x", [], { daily: "nope" }]) {
      const s = sanitize(bad);
      expect(s.level).toBe(1);
      expect(s.daily).toEqual({});
    }
  });

  it("drops injected markup and invalid keys", () => {
    const s = sanitize({
      lang: "<img src=x onerror=alert(1)>",
      theme: "<script>",
      daily: { "<b>x</b>": { moves: 3, par: 3, stars: 3 }, "2026-11-01": { moves: "<i>", par: 4, stars: 9 } },
      levelStars: { "__proto__": 3, "5": 2 },
      level: -4,
      hints: { date: "2026-11-09", left: 1e9 },
      paywallDate: "javascript:alert(1)",
    });
    expect(s.lang).toBeNull();
    expect(s.theme).toBe("classic");
    expect(Object.keys(s.daily)).toEqual(["2026-11-01"]);
    expect(s.daily["2026-11-01"]).toEqual({ moves: 0, par: 4, stars: 1, hinted: false });
    expect(s.levelStars).toEqual({ 5: 2 });
    expect(s.level).toBe(1);
    expect(s.hints.left).toBeLessThanOrEqual(100);
    expect(s.paywallDate).toBe("");
  });

  it("cannot grant premium with a non-boolean", () => {
    expect(sanitize({ premium: "true" }).premium).toBe(false);
    expect(sanitize({ premium: 1 }).premium).toBe(false);
  });

  it("keeps a valid save intact", () => {
    const valid = sanitize({ level: 12, lang: "fr", daily: { "2026-11-08": { moves: 7, par: 7, stars: 3, hinted: true } } });
    expect(valid.level).toBe(12);
    expect(valid.lang).toBe("fr");
    expect(valid.daily["2026-11-08"].hinted).toBe(true);
  });
});

describe("stats", () => {
  const r = { moves: 5, par: 5, stars: 3, hinted: false };
  it("counts current and best streak across month boundaries", () => {
    const s = sanitize({ daily: { "2026-10-30": r, "2026-10-31": r, "2026-11-01": r, "2026-11-03": r, "2026-11-04": r } });
    const st = computeStats(s, "2026-11-05");
    expect(st.streak).toBe(2); // 03-04, today not played yet
    expect(st.best).toBe(3);
    expect(st.played).toBe(5);
    expect(computeStats(s, "2026-11-07").streak).toBe(0);
  });
});

describe("translations", () => {
  it("every language has every key, non-empty", () => {
    const keys = Object.keys(dict.en).sort();
    for (const [lang, d] of Object.entries(dict)) {
      expect(Object.keys(d).sort(), lang).toEqual(keys);
      for (const v of Object.values(d)) expect(String(v).length).toBeGreaterThan(0);
      for (const v of Object.values(d)) expect(String(v)).not.toMatch(/[<>]/);
    }
  });
});
