import "./style.css";
import {
  dailyPuzzle, levelPuzzle, dateKey, dailyNumber, tap, isSolved, hint, stars, affected,
  type Puzzle,
} from "./game";
import { t, setLang, detectLang, getLang, LANGS, type Lang } from "./i18n";
import { load, persist, computeStats, HINTS_PER_DAY, type Save, type DailyResult } from "./storage";
import { hapticTap, hapticWin, shareText } from "./platform";
import { CONFIG } from "./config";
import {
  platform, initMonetization, isPremium, onPremiumChange, purchasesAvailable, getOffers, purchase, restore,
  rewardedAvailable, showRewarded, maybeInterstitial, showPrivacyOptions, requestReview, type Offer,
} from "./monetization";

const EMOJI = ["🟥", "🟨", "🟦"];
const SYMBOL = ["●", "▲", "■"];

const app = document.getElementById("app")!;
const save: Save = load();
setLang(save.lang ?? detectLang());

// Color themes: "classic" is free, the others are part of Mozaik+.
const THEMES: Record<string, [string, string, string]> = {
  classic: ["#ff5a6e", "#ffc93c", "#3d8bfd"],
  pastel: ["#ff9aa2", "#ffe5a3", "#a0c4ff"],
  ocean: ["#00b4d8", "#90e0ef", "#0353a4"],
  forest: ["#2d6a4f", "#95d5b2", "#e9c46a"],
  neon: ["#ff2bd6", "#39ff14", "#00e5ff"],
  sunset: ["#ff6b35", "#f7c59f", "#7b2cbf"],
};

function applyTheme() {
  const name = isPremium() && Object.hasOwn(THEMES, save.theme) ? save.theme : "classic";
  THEMES[name].forEach((c, i) => document.documentElement.style.setProperty(`--c${i}`, c));
}

type Mode = { kind: "daily"; key: string } | { kind: "level"; level: number } | { kind: "archive"; key: string };

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
/** Escapes text coming from outside the app (store prices…) before it goes into HTML. */
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** "7 jours", "1 week"… localised by the platform (Intl unit formatting). */
function trialLength(trial: NonNullable<Offer["trial"]>): string {
  try {
    return new Intl.NumberFormat(getLang(), { style: "unit", unit: trial.unit, unitDisplay: "long" }).format(trial.n);
  } catch {
    return `${trial.n} ${trial.unit}`;
  }
}

const h = (html: string) => {
  const tpl = document.createElement("template");
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild as HTMLElement;
};

function savedResult(mode: Mode): DailyResult | undefined {
  if (mode.kind === "daily") return save.daily[mode.key];
  if (mode.kind === "archive") return save.daily[mode.key] ?? save.archive[mode.key];
  return undefined;
}

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
      ${isPremium()
        ? `<p class="plus-on">✨ ${t("premiumOn")}</p>`
        : `<button class="big plus" id="plus"><span>✨ ${t("plusTitle")}</span><small>${t("bNoAds")} · ${t("bHints")} · ${t("bArchive")}</small></button>`}
      <nav class="row">
        <button id="archive" aria-label="${t("archive")}">🗓️</button>
        <button id="stats" aria-label="${t("stats")}">📊</button>
        <button id="help" aria-label="${t("howTo")}">❓</button>
        <button id="settings" aria-label="${t("settings")}">⚙️</button>
      </nav>
    </main>`);
  app.append(el);
  el.querySelector("#daily")!.addEventListener("click", () => startGame({ kind: "daily", key: today }));
  el.querySelector("#levels")!.addEventListener("click", () => {
    if (webLimitReached()) { showPaywall(); return; }
    startGame({ kind: "level", level: save.level });
  });
  el.querySelector("#stats")!.addEventListener("click", showStats);
  el.querySelector("#archive")!.addEventListener("click", showArchive);
  el.querySelector("#plus")?.addEventListener("click", () => showPaywall());
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
  const puzzle = mode.kind === "level" ? levelPuzzle(mode.level) : dailyPuzzle(mode.key);
  game = {
    mode, puzzle, cells: puzzle.cells.slice(), history: [], moves: 0,
    hinted: false, hintCell: -1, done: false,
  };
  if (savedResult(mode)) game.done = true;
  renderGame();
  if (game.done) showWin(false);
}

function title(g: GameState) {
  return g.mode.kind === "level" ? `${t("level")} ${g.mode.level}` : `${t("daily")} #${dailyNumber(g.mode.key)}`;
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
        <button id="hint">💡 ${t("hint")} <small id="hl">${isPremium() ? "∞" : hintsLeft()}</small></button>
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
  if (isPremium()) { giveHint(); return; }
  if (hintsLeft() > 0) { save.hints.left--; persist(save); giveHint(); return; }
  showHintOffer();
}

function giveHint() {
  const g = game;
  if (!g || g.done) return;
  const i = hint(g.cells, g.puzzle.size);
  if (i < 0) return;
  g.hinted = true;
  g.hintCell = i;
  const hl = document.getElementById("hl");
  if (hl) hl.textContent = isPremium() ? "∞" : String(hintsLeft());
  paint();
}

/** Out of free hints: the two money makers — a rewarded video or Mozaik+. */
function showHintOffer() {
  const m = modal(`
    <h2>💡 ${t("noHints")}</h2>
    <div class="actions">
      ${rewardedAvailable() ? `<button class="primary" id="ad">▶︎ ${t("watchAd")}</button>` : ""}
      <button class="${rewardedAvailable() ? "" : "primary"} plusbtn" id="plus">✨ ${t("plusTag")} · ${t("bHints")}</button>
      <button id="ok">${t("close")}</button>
    </div>`);
  m.querySelector("#ad")?.addEventListener("click", async () => {
    closeModal();
    if (await showRewarded()) giveHint();
  });
  m.querySelector("#plus")!.addEventListener("click", () => showPaywall(giveHint));
  m.querySelector("#ok")!.addEventListener("click", closeModal);
}

function win() {
  const g = game!;
  g.done = true;
  if (save.haptics) hapticWin();
  const s = stars(g.moves, g.puzzle.par);
  const res = { moves: g.moves, par: g.puzzle.par, stars: s, hinted: g.hinted };
  if (g.mode.kind === "daily") save.daily[g.mode.key] = res;
  else if (g.mode.kind === "archive") save.archive[g.mode.key] = res;
  else {
    const lv = g.mode.level;
    save.levelStars[lv] = Math.max(save.levelStars[lv] ?? 0, s);
    if (save.level === lv) save.level = lv + 1;
    save.levelsSinceAd++;
  }
  save.wins++;
  persist(save);
  // Ask for a rating at a happy moment (perfect score), once. Ratings drive App Store ranking.
  if (!save.reviewAsked && s === 3 && save.wins >= 4) {
    save.reviewAsked = true;
    persist(save);
    setTimeout(requestReview, 2500);
  }
  document.getElementById("board")?.classList.add("won");
  setTimeout(() => showWin(true), 900);
}

/** The free web version is a demo: after a few levels it sends players to the App Store. */
function webLimitReached() {
  return platform === "web" && save.level > CONFIG.webFreeLevels;
}

/** Between levels: once a day a soft paywall, otherwise an interstitial ad (paced in CONFIG). */
async function nextLevel() {
  closeModal();
  const level = save.level;
  const today = dateKey();
  if (webLimitReached()) { showPaywall(undefined, renderHome); return; }
  if (!isPremium() && level >= 10 && save.paywallDate !== today && (purchasesAvailable() || platform === "web")) {
    save.paywallDate = today;
    persist(save);
    showPaywall(() => startGame({ kind: "level", level: save.level }), () => startGame({ kind: "level", level: save.level }));
    return;
  }
  if (await maybeInterstitial(level, save.levelsSinceAd)) {
    save.levelsSinceAd = 0;
    persist(save);
  }
  startGame({ kind: "level", level });
}

function shareMessage(g: GameState, res: { moves: number; stars: number; hinted: boolean }) {
  const n = g.puzzle.size;
  const grid = [];
  for (let r = 0; r < n; r++) grid.push(g.puzzle.cells.slice(r * n, r * n + n).map((c) => EMOJI[c]).join(""));
  const head = g.mode.kind === "level" ? `Mozaik — ${t("level")} ${g.mode.level}` : `Mozaik #${dailyNumber(g.mode.key)}`;
  const stars = "⭐".repeat(res.stars);
  return `${head} ${stars}\n${t("inMoves", { n: res.moves })} (${t("par").toLowerCase()} ${g.puzzle.par})${res.hinted ? " 💡" : ""}\n${grid.join("\n")}\n${CONFIG.appStoreUrl}`;
}

function showWin(animate: boolean) {
  const g = game!;
  const res = savedResult(g.mode)
    ?? { moves: g.moves, par: g.puzzle.par, stars: stars(g.moves, g.puzzle.par), hinted: g.hinted };
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
    </div>
    ${isPremium() ? "" : `<button class="link plusbtn" id="plus">✨ ${t("plusTitle")}</button>`}`);
  m.querySelector("#plus")?.addEventListener("click", () => showPaywall());
  m.querySelector("#share")!.addEventListener("click", async () => {
    const result = await shareText(shareMessage(g, res));
    if (result === "copied") toast(t("copied"));
    else if (result === "failed") toast(t("shareFailed"));
  });
  m.querySelector("#home")!.addEventListener("click", () => { closeModal(); renderHome(); });
  m.querySelector("#next")?.addEventListener("click", nextLevel);
  m.querySelector("#levels")?.addEventListener("click", nextLevel);
  if (g.mode.kind === "daily") {
    clearTimer();
    timer = window.setInterval(() => {
      const cd = document.getElementById("cd2");
      if (cd) cd.textContent = countdown();
    }, 1000);
  }
}

// ---------- modals ----------
function modal(inner: string, dismissable = true, cls = ""): HTMLElement {
  closeModal();
  const back = h(`<div class="backdrop" role="dialog" aria-modal="true"><div class="card ${cls}">${inner}</div></div>`);
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
    <label class="setting"><span>${t("theme")}</span>
      <select id="theme">${Object.keys(THEMES).map((k) => `<option value="${k}" ${k === (isPremium() ? save.theme : "classic") ? "selected" : ""}>${k === "classic" || isPremium() ? "" : "🔒 "}${k[0].toUpperCase() + k.slice(1)}</option>`).join("")}</select>
    </label>
    <label class="setting"><span>${t("language")}</span>
      <select id="lang">${Object.entries(LANGS).map(([k, v]) => `<option value="${k}" ${k === getLang() ? "selected" : ""}>${v}</option>`).join("")}</select>
    </label>
    <div class="actions">
      ${isPremium() ? `<p class="plus-on">✨ ${t("premiumOn")}</p>` : `<button class="plusbtn" id="plus">✨ ${t("plusTitle")}</button>`}
      ${platform === "ios" ? `<button id="restore">${t("restore")}</button><button id="privacy">${t("privacyOptions")}</button>` : ""}
      <button class="primary" id="ok">${t("close")}</button>
    </div>`);
  m.querySelector("#plus")?.addEventListener("click", () => showPaywall());
  m.querySelector("#restore")?.addEventListener("click", doRestore);
  m.querySelector("#privacy")?.addEventListener("click", showPrivacyOptions);
  m.querySelector<HTMLSelectElement>("#theme")!.addEventListener("change", (e) => {
    const v = (e.target as HTMLSelectElement).value;
    if (!Object.hasOwn(THEMES, v)) return;
    if (v !== "classic" && !isPremium()) { showPaywall(); return; }
    save.theme = v;
    persist(save);
    applyTheme();
  });
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

// ---------- Mozaik+ paywall ----------
function showPaywall(onSuccess?: () => void, onClose?: () => void) {
  const m = modal(`
    <div class="paywall">
      <div class="logo small" aria-hidden="true">${[0, 1, 2, 1, 2, 0, 2, 0, 1].map((c) => `<span class="c${c}"></span>`).join("")}</div>
      <h2>${t("plusTitle")}</h2>
      <ul class="benefits">
        <li>🚫 ${t("bNoAds")}</li>
        <li>💡 ${t("bHints")}</li>
        <li>🗓️ ${t("bArchive")}</li>
        <li>🎨 ${t("bThemes")}</li>
      </ul>
      <div id="offers" class="offers">${platform === "web"
        ? `<a class="button primary" href="${CONFIG.appStoreUrl}" target="_blank" rel="noopener">${t("getApp")}</a>`
        : `<div class="spinner"></div>`}</div>
      <button class="primary" id="buy" hidden>${t("cta")}</button>
      <p class="fine" id="renew" hidden>${t("autoRenew")}</p>
      <p class="fine">${t("cancelAnytime")} · <a href="${CONFIG.termsUrl}" target="_blank" rel="noopener">${t("terms")}</a> · <a href="${CONFIG.privacyUrl}" target="_blank" rel="noopener">${t("privacy")}</a></p>
      ${platform === "ios" ? `<button class="link" id="restore">${t("restore")}</button>` : ""}
      <button class="link" id="close">${t("close")}</button>
    </div>`, false);
  const close = () => { closeModal(); onClose?.(); };
  m.querySelector("#close")!.addEventListener("click", close);
  m.querySelector("#restore")?.addEventListener("click", doRestore);
  if (platform !== "ios") return;

  const box = m.querySelector<HTMLElement>("#offers")!;
  const buy = m.querySelector<HTMLButtonElement>("#buy")!;
  let selected: Offer | null = null;
  getOffers().then((offers) => {
    if (!offers.length) { box.innerHTML = `<p>${t("notReady")}</p>`; return; }
    const label = (o: Offer) => o.kind === "annual" ? t("annual") : o.kind === "monthly" ? t("monthly") : o.kind === "lifetime" ? t("lifetime") : "";
    box.innerHTML = offers.map((o, i) => `
      <button class="offer" data-i="${i}">
        ${o.kind === "annual" ? `<em>${t("bestValue")}</em>` : ""}
        <b>${o.trial ? `${esc(t("trial", { n: trialLength(o.trial) }))} ` : ""}${esc(o.price)}</b><span>${label(o)}</span>
      </button>`).join("");
    const renew = m.querySelector<HTMLElement>("#renew")!;
    const pick = (i: number) => {
      selected = offers[i];
      box.querySelectorAll(".offer").forEach((b, j) => b.classList.toggle("sel", j === i));
      buy.textContent = selected.trial ? t("ctaTrial") : t("cta");
      renew.hidden = !selected.renews;
    };
    box.querySelectorAll<HTMLElement>(".offer").forEach((b) => b.addEventListener("click", () => pick(Number(b.dataset.i))));
    pick(0);
    buy.hidden = false;
  }).catch(() => { box.innerHTML = `<p>${t("notReady")}</p>`; });

  buy.addEventListener("click", async () => {
    if (!selected) return;
    buy.disabled = true;
    try {
      if (await purchase(selected)) {
        closeModal();
        toast(t("premiumOn"));
        onSuccess?.();
      }
    } catch {
      toast(t("error"));
    } finally {
      buy.disabled = false;
    }
  });
}

async function doRestore() {
  if (!purchasesAvailable()) { toast(t("notReady")); return; }
  try {
    toast((await restore()) ? t("restored") : t("nothing"));
  } catch {
    toast(t("error"));
  }
}

// ---------- archive (Mozaik+) ----------
function showArchive() {
  const today = dateKey();
  const [y, mo, d] = today.split("-").map(Number);
  const keys: string[] = [];
  for (let i = 1; i <= CONFIG.archiveDays; i++) {
    const k = dateKey(new Date(y, mo - 1, d - i));
    if (dailyNumber(k) < 1) break;
    keys.push(k);
  }
  const m = modal(`
    <h2>🗓️ ${t("archive")}</h2>
    ${isPremium() ? "" : `<button class="primary plusbtn" id="plus">✨ ${t("plusTitle")}</button>`}
    <div class="archive">${keys.length ? keys.map((k) => {
      const r = save.daily[k] ?? save.archive[k];
      return `<button data-k="${k}" class="${r ? "done" : ""}">#${dailyNumber(k)}<small>${r ? starStr(r.stars) : isPremium() ? "" : "🔒"}</small></button>`;
    }).join("") : "<p>—</p>"}</div>
    <div class="actions">
      <button id="ok">${t("close")}</button>
    </div>`, true, "wide");
  m.querySelector("#ok")!.addEventListener("click", closeModal);
  m.querySelector("#plus")?.addEventListener("click", () => showPaywall(showArchive));
  m.querySelectorAll<HTMLElement>(".archive button").forEach((b) => b.addEventListener("click", () => {
    if (!isPremium()) { showPaywall(showArchive); return; }
    closeModal();
    startGame({ kind: "archive", key: b.dataset.k! });
  }));
}

function toast(msg: string) {
  const el = h(`<div class="toast" role="status">${msg}</div>`);
  document.body.append(el);
  setTimeout(() => el.remove(), 2000);
}

const ready = initMonetization(save.premium); // sets the cached premium state synchronously
applyTheme();
renderHome();
ready.finally(() => {
  if (save.premium !== isPremium()) { save.premium = isPremium(); persist(save); }
});
onPremiumChange((p) => {
  save.premium = p;
  persist(save);
  applyTheme();
  if (!game) renderHome();
  else {
    const hl = document.getElementById("hl");
    if (hl && p) hl.textContent = "∞";
  }
});
