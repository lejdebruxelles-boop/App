import "./style.css";
import {
  dailyPuzzle, levelPuzzle, dateKey, dailyNumber, tap, isSolved, hint, stars, affected,
  type Puzzle,
} from "./game";
import { t, setLang, detectLang, getLang, LANGS, type Lang } from "./i18n";
import { load, persist, computeStats, HINTS_PER_DAY, type Save } from "./storage";
import { hapticTap, hapticWin, shareText, STORE_URL } from "./platform";

const EMOJI = ["🟥", "🟨", "🟦"];
const SYMBOL = ["●", "▲", "■"];

const app = document.getElementById("app")!;
const save: Save = load();
setLang(save.lang ?? detectLang());

type Mode = { kind: "daily"; key: string } | { kind: "level"; level: number };

interface GameState {
  mode: Mode;
  puzzle: Puzzle;
  cells: number[];
  history: number[][];
  moves: number;
  hinted: boolean;
  hintCell: number;
  done: boolean;
}

let game: GameState | null = null;
let timer: number | undefined;

// ---------- helpers ----------
const h = (html: string) => {
  const tpl = document.createElement("template");
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild as HTMLElement;
};

function hintsLeft(): number {
  const today = dateKey();
  if (save.hints.date !== today) save.hints = { date: today, left: HINTS_PER_DAY };
  return save.hints.left;
}

function starStr(n: number) {
  return "★".repeat(n) + "☆".repeat(3 - n);
}

function countdown(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const s = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

function clearTimer() {
  if (timer) clearInterval(timer);
  timer = undefined;
}

// ---------- home ----------
function renderHome() {
  clearTimer();
  game = null;
  const today = dateKey();
  const res = save.daily[today];
  const st = computeStats(save, today);
  app.innerHTML = "";
  const el = h(`
    <main class="home">
      <div class="logo" aria-hidden="true">${[0, 1, 2, 1, 2, 0, 2, 0, 1].map((c) => `<span class="c${c}"></span>`).join("")}</div>
      <h1>Mozaik</h1>
      <p class="tagline">${t("tagline")}</p>
      <button class="big primary" id="daily">
        <span>${t("daily")} #${dailyNumber(today)}</span>
        <small>${res ? `${t("doneToday")} ${starStr(res.stars)}` : `🔥 ${st.streak}`}</small>
      </button>
      ${res ? `<p class="next">${t("nextDaily")} <b id="cd">${countdown()}</b></p>` : ""}
      <button class="big" id="levels">
        <span>${t("endless")}</span><small>${t("level")} ${save.level}</small>
      </button>
      <nav class="row">
        <button id="stats" aria-label="${t("stats")}">📊</button>
        <button id="help" aria-label="${t("howTo")}">❓</button>
        <button id="settings" aria-label="${t("settings")}">⚙️</button>
      </nav>
    </main>`);
  app.append(el);
  el.querySelector("#daily")!.addEventListener("click", () => startGame({ kind: "daily", key: today }));
  el.querySelector("#levels")!.addEventListener("click", () => startGame({ kind: "level", level: save.level }));
  el.querySelector("#stats")!.addEventListener("click", showStats);
  el.querySelector("#help")!.addEventListener("click", () => showTutorial());
  el.querySelector("#settings")!.addEventListener("click", showSettings);
  if (res) timer = window.setInterval(() => {
    const cd = document.getElementById("cd");
    if (cd) cd.textContent = countdown();
    if (dateKey() !== today) renderHome();
  }, 1000);
  if (!save.seenTutorial) showTutorial();
}

// ---------- game ----------
function startGame(mode: Mode) {
  clearTimer();
  const puzzle = mode.kind === "daily" ? dailyPuzzle(mode.key) : levelPuzzle(mode.level);
  game = {
    mode, puzzle, cells: puzzle.cells.slice(), history: [], moves: 0,
    hinted: false, hintCell: -1, done: false,
  };
  if (mode.kind === "daily" && save.daily[mode.key]) game.done = true;
  renderGame();
  if (game.done) showWin(false);
}

function title(g: GameState) {
  return g.mode.kind === "daily" ? `${t("daily")} #${dailyNumber(g.mode.key)}` : `${t("level")} ${g.mode.level}`;
}

function renderGame() {
  const g = game!;
  app.innerHTML = "";
  const el = h(`
    <main class="game">
      <header>
        <button id="back" aria-label="${t("home")}">‹</button>
        <h2>${title(g)}</h2>
        <button id="help" aria-label="${t("howTo")}">❓</button>
      </header>
      <div class="counter">
        <div><small>${t("moves")}</small><b id="moves">${g.moves}</b></div>
        <div><small>${t("par")}</small><b>${g.puzzle.par}</b></div>
      </div>
      <div class="board ${save.symbols ? "symbols" : ""}" id="board" style="--n:${g.puzzle.size}"></div>
      <div class="tools">
        <button id="undo">↶ ${t("undo")}</button>
        <button id="hint">💡 ${t("hint")} <small id="hl">${hintsLeft()}</small></button>
        <button id="reset">⟲ ${t("reset")}</button>
      </div>
    </main>`);
  app.append(el);
  const board = el.querySelector<HTMLElement>("#board")!;
  g.cells.forEach((_, i) => {
    const b = document.createElement("button");
    b.className = "tile";
    b.dataset.i = String(i);
    board.append(b);
  });
  board.addEventListener("pointerdown", (e) => {
    const tile = (e.target as HTMLElement).closest<HTMLElement>(".tile");
    if (tile) { e.preventDefault(); onTap(Number(tile.dataset.i)); }
  });
  board.addEventListener("keydown", (e) => {
    const tile = (e.target as HTMLElement).closest<HTMLElement>(".tile");
    if (tile && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onTap(Number(tile.dataset.i)); }
  });
  el.querySelector("#back")!.addEventListener("click", renderHome);
  el.querySelector("#help")!.addEventListener("click", () => showTutorial());
  el.querySelector("#undo")!.addEventListener("click", onUndo);
  el.querySelector("#reset")!.addEventListener("click", onReset);
  el.querySelector("#hint")!.addEventListener("click", onHint);
  paint();
}

function paint(changed: number[] = []) {
  const g = game!;
  const tiles = document.querySelectorAll<HTMLElement>(".tile");
  tiles.forEach((tile, i) => {
    const c = g.cells[i];
    tile.className = `tile c${c}${i === g.hintCell ? " hinted" : ""}`;
    tile.textContent = SYMBOL[c];
    tile.setAttribute("aria-label", `${["Red", "Yellow", "Blue"][c]} ${i + 1}`);
  });
  for (const i of changed) {
    const tile = tiles[i];
    tile.classList.remove("pop");
    void tile.offsetWidth; // restart animation
    tile.classList.add("pop");
  }
  const m = document.getElementById("moves");
  if (m) {
    m.textContent = String(g.moves);
    m.classList.toggle("over", g.moves > g.puzzle.par);
  }
}

function onTap(i: number) {
  const g = game;
  if (!g || g.done) return;
  g.history.push(g.cells);
  g.cells = tap(g.cells, g.puzzle.size, i);
  g.moves++;
  g.hintCell = -1;
  if (save.haptics) hapticTap();
  paint(affected(i, g.puzzle.size));
  if (isSolved(g.cells)) win();
}

function onUndo() {
  const g = game;
  if (!g || g.done || !g.history.length) return;
  g.cells = g.history.pop()!;
  g.moves--;
  g.hintCell = -1;
  paint();
}

function onReset() {
  const g = game;
  if (!g || g.done) return;
  g.cells = g.puzzle.cells.slice();
  g.history = [];
  g.moves = 0;
  g.hintCell = -1;
  paint();
}

function onHint() {
  const g = game;
  if (!g || g.done) return;
  if (hintsLeft() <= 0) { toast(t("noHints")); return; }
  const i = hint(g.cells, g.puzzle.size);
  if (i < 0) return;
  save.hints.left--;
  persist(save);
  g.hinted = true;
  g.hintCell = i;
  const hl = document.getElementById("hl");
  if (hl) hl.textContent = String(save.hints.left);
  paint();
}

function win() {
  const g = game!;
  g.done = true;
  if (save.haptics) hapticWin();
  const s = stars(g.moves, g.puzzle.par);
  if (g.mode.kind === "daily") {
    save.daily[g.mode.key] = { moves: g.moves, par: g.puzzle.par, stars: s, hinted: g.hinted };
  } else {
    const lv = g.mode.level;
    save.levelStars[lv] = Math.max(save.levelStars[lv] ?? 0, s);
    if (save.level === lv) save.level = lv + 1;
  }
  persist(save);
  document.getElementById("board")?.classList.add("won");
  setTimeout(() => showWin(true), 900);
}

function shareMessage(g: GameState, res: { moves: number; stars: number; hinted: boolean }) {
  const n = g.puzzle.size;
  const grid = [];
  for (let r = 0; r < n; r++) grid.push(g.puzzle.cells.slice(r * n, r * n + n).map((c) => EMOJI[c]).join(""));
  const head = g.mode.kind === "daily" ? `Mozaik #${dailyNumber(g.mode.key)}` : `Mozaik — ${t("level")} ${g.mode.level}`;
  const stars = "⭐".repeat(res.stars);
  return `${head} ${stars}\n${t("inMoves", { n: res.moves })} (${t("par").toLowerCase()} ${g.puzzle.par})${res.hinted ? " 💡" : ""}\n${grid.join("\n")}\n${STORE_URL}`;
}

function showWin(animate: boolean) {
  const g = game!;
  const res = g.mode.kind === "daily"
    ? save.daily[g.mode.key]
    : { moves: g.moves, par: g.puzzle.par, stars: stars(g.moves, g.puzzle.par), hinted: g.hinted };
  const st = computeStats(save, dateKey());
  const m = modal(`
    <div class="stars ${animate ? "anim" : ""}">${[0, 1, 2].map((i) => `<span class="${i < res.stars ? "on" : ""}" style="--d:${i * 150}ms">★</span>`).join("")}</div>
    <h2>${res.stars === 3 ? t("perfect") : t("solved")}</h2>
    <p>${t("inMoves", { n: res.moves })} · ${t("par")} ${res.par}</p>
    ${g.mode.kind === "daily"
      ? `<p class="streak">🔥 ${t("streak")} : <b>${st.streak}</b></p><p class="next">${t("nextDaily")} <b id="cd2">${countdown()}</b></p>`
      : ""}
    <div class="actions">
      <button class="primary" id="share">${t("share")}</button>
      ${g.mode.kind === "level" ? `<button class="primary" id="next">${t("next")}</button>` : `<button id="levels">${t("endless")}</button>`}
      <button id="home">${t("home")}</button>
    </div>`);
  m.querySelector("#share")!.addEventListener("click", async () => {
    const shared = await shareText(shareMessage(g, res));
    if (!shared) toast(t("copied"));
  });
  m.querySelector("#home")!.addEventListener("click", () => { closeModal(); renderHome(); });
  m.querySelector("#next")?.addEventListener("click", () => { closeModal(); startGame({ kind: "level", level: save.level }); });
  m.querySelector("#levels")?.addEventListener("click", () => { closeModal(); startGame({ kind: "level", level: save.level }); });
  if (g.mode.kind === "daily") {
    clearTimer();
    timer = window.setInterval(() => {
      const cd = document.getElementById("cd2");
      if (cd) cd.textContent = countdown();
    }, 1000);
  }
}

// ---------- modals ----------
function modal(inner: string, dismissable = true): HTMLElement {
  closeModal();
  const back = h(`<div class="backdrop" role="dialog" aria-modal="true"><div class="card">${inner}</div></div>`);
  if (dismissable) back.addEventListener("click", (e) => { if (e.target === back) closeModal(); });
  document.body.append(back);
  return back;
}

function closeModal() {
  document.querySelectorAll(".backdrop").forEach((b) => b.remove());
}

function showTutorial() {
  const m = modal(`
    <h2>${t("howTo")}</h2>
    <div class="demo" aria-hidden="true">
      ${Array.from({ length: 9 }, (_, i) => `<span class="tile c${i % 2 === 1 || i === 4 ? 1 : 0}">${i === 4 ? "👆" : ""}</span>`).join("")}
    </div>
    <ol>
      <li>${t("rule1")}</li>
      <li><span class="chip c0"></span><span class="chip c1"></span><span class="chip c2"></span> ${t("rule2")}</li>
      <li>${t("rule3")}</li>
    </ol>
    <div class="actions"><button class="primary" id="ok">${t("play")}</button></div>`);
  m.querySelector("#ok")!.addEventListener("click", () => {
    save.seenTutorial = true;
    persist(save);
    closeModal();
  });
}

function showStats() {
  const st = computeStats(save, dateKey());
  const days = Object.keys(save.daily).sort().slice(-14);
  const m = modal(`
    <h2>${t("stats")}</h2>
    <div class="statgrid">
      <div><b>${st.played}</b><small>${t("played")}</small></div>
      <div><b>${st.streak}</b><small>${t("streak")}</small></div>
      <div><b>${st.best}</b><small>${t("best")}</small></div>
      <div><b>${st.perfects}</b><small>${t("perfects")}</small></div>
    </div>
    <div class="history">${days.map((d) => `<span title="${d}">${starStr(save.daily[d].stars)}</span>`).join("")}</div>
    <div class="actions"><button id="ok">${t("close")}</button></div>`);
  m.querySelector("#ok")!.addEventListener("click", closeModal);
}

function showSettings() {
  const m = modal(`
    <h2>${t("settings")}</h2>
    <label class="setting"><span>${t("sound")}</span><input type="checkbox" id="hap" ${save.haptics ? "checked" : ""}></label>
    <label class="setting"><span>${t("symbols")}</span><input type="checkbox" id="sym" ${save.symbols ? "checked" : ""}></label>
    <label class="setting"><span>${t("language")}</span>
      <select id="lang">${Object.entries(LANGS).map(([k, v]) => `<option value="${k}" ${k === getLang() ? "selected" : ""}>${v}</option>`).join("")}</select>
    </label>
    <div class="actions"><button class="primary" id="ok">${t("close")}</button></div>`);
  m.querySelector<HTMLInputElement>("#hap")!.addEventListener("change", (e) => { save.haptics = (e.target as HTMLInputElement).checked; persist(save); });
  m.querySelector<HTMLInputElement>("#sym")!.addEventListener("change", (e) => { save.symbols = (e.target as HTMLInputElement).checked; persist(save); });
  m.querySelector<HTMLSelectElement>("#lang")!.addEventListener("change", (e) => {
    const l = (e.target as HTMLSelectElement).value as Lang;
    save.lang = l;
    setLang(l);
    persist(save);
    closeModal();
    renderHome();
    showSettings();
  });
  m.querySelector("#ok")!.addEventListener("click", closeModal);
}

function toast(msg: string) {
  const el = h(`<div class="toast" role="status">${msg}</div>`);
  document.body.append(el);
  setTimeout(() => el.remove(), 2000);
}

renderHome();
