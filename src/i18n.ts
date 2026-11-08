// Six languages from day one: each translated store listing is a new market.
const dict = {
  fr: {
    tagline: "Un puzzle de couleurs par jour",
    daily: "Défi du jour", endless: "Niveaux", stats: "Statistiques", settings: "Réglages",
    level: "Niveau", moves: "Coups", par: "Objectif", hint: "Indice", undo: "Annuler", reset: "Recommencer",
    solved: "Résolu !", perfect: "Parfait !", share: "Partager", next: "Niveau suivant", home: "Accueil",
    copied: "Copié dans le presse-papiers", nextDaily: "Prochain défi dans", doneToday: "Terminé ✓",
    played: "Joués", streak: "Série", best: "Record", perfects: "Parfaits",
    howTo: "Comment jouer",
    rule1: "Touchez une case : elle et ses 4 voisines changent de couleur.",
    rule2: "Rouge → Jaune → Bleu → Rouge…",
    rule3: "Rendez toute la grille d'une seule couleur, en un minimum de coups.",
    play: "Jouer", hintsLeft: "indices restants", noHints: "Plus d'indices aujourd'hui",
    sound: "Vibrations", symbols: "Symboles (daltonisme)", language: "Langue", close: "Fermer",
    inMoves: "en {n} coups",
  },
  en: {
    tagline: "One color puzzle a day",
    daily: "Daily puzzle", endless: "Levels", stats: "Statistics", settings: "Settings",
    level: "Level", moves: "Moves", par: "Par", hint: "Hint", undo: "Undo", reset: "Restart",
    solved: "Solved!", perfect: "Perfect!", share: "Share", next: "Next level", home: "Home",
    copied: "Copied to clipboard", nextDaily: "Next puzzle in", doneToday: "Done ✓",
    played: "Played", streak: "Streak", best: "Best", perfects: "Perfects",
    howTo: "How to play",
    rule1: "Tap a tile: it and its 4 neighbours change color.",
    rule2: "Red → Yellow → Blue → Red…",
    rule3: "Make the whole grid a single color in as few moves as possible.",
    play: "Play", hintsLeft: "hints left", noHints: "No hints left today",
    sound: "Haptics", symbols: "Symbols (color-blind)", language: "Language", close: "Close",
    inMoves: "in {n} moves",
  },
  es: {
    tagline: "Un puzle de colores al día",
    daily: "Reto diario", endless: "Niveles", stats: "Estadísticas", settings: "Ajustes",
    level: "Nivel", moves: "Jugadas", par: "Objetivo", hint: "Pista", undo: "Deshacer", reset: "Reiniciar",
    solved: "¡Resuelto!", perfect: "¡Perfecto!", share: "Compartir", next: "Siguiente nivel", home: "Inicio",
    copied: "Copiado al portapapeles", nextDaily: "Próximo reto en", doneToday: "Hecho ✓",
    played: "Jugados", streak: "Racha", best: "Récord", perfects: "Perfectos",
    howTo: "Cómo jugar",
    rule1: "Toca una casilla: ella y sus 4 vecinas cambian de color.",
    rule2: "Rojo → Amarillo → Azul → Rojo…",
    rule3: "Deja toda la cuadrícula de un solo color con el mínimo de jugadas.",
    play: "Jugar", hintsLeft: "pistas restantes", noHints: "No quedan pistas hoy",
    sound: "Vibración", symbols: "Símbolos (daltonismo)", language: "Idioma", close: "Cerrar",
    inMoves: "en {n} jugadas",
  },
  de: {
    tagline: "Ein Farbrätsel pro Tag",
    daily: "Tagesrätsel", endless: "Level", stats: "Statistik", settings: "Einstellungen",
    level: "Level", moves: "Züge", par: "Ziel", hint: "Tipp", undo: "Zurück", reset: "Neustart",
    solved: "Gelöst!", perfect: "Perfekt!", share: "Teilen", next: "Nächstes Level", home: "Start",
    copied: "In die Zwischenablage kopiert", nextDaily: "Nächstes Rätsel in", doneToday: "Erledigt ✓",
    played: "Gespielt", streak: "Serie", best: "Rekord", perfects: "Perfekt",
    howTo: "Spielregeln",
    rule1: "Tippe ein Feld: es und seine 4 Nachbarn wechseln die Farbe.",
    rule2: "Rot → Gelb → Blau → Rot…",
    rule3: "Färbe das ganze Raster in einer Farbe – mit möglichst wenigen Zügen.",
    play: "Spielen", hintsLeft: "Tipps übrig", noHints: "Heute keine Tipps mehr",
    sound: "Vibration", symbols: "Symbole (Farbenblind)", language: "Sprache", close: "Schließen",
    inMoves: "in {n} Zügen",
  },
  pt: {
    tagline: "Um quebra-cabeça de cores por dia",
    daily: "Desafio diário", endless: "Níveis", stats: "Estatísticas", settings: "Ajustes",
    level: "Nível", moves: "Jogadas", par: "Meta", hint: "Dica", undo: "Desfazer", reset: "Reiniciar",
    solved: "Resolvido!", perfect: "Perfeito!", share: "Compartilhar", next: "Próximo nível", home: "Início",
    copied: "Copiado", nextDaily: "Próximo desafio em", doneToday: "Feito ✓",
    played: "Jogados", streak: "Sequência", best: "Recorde", perfects: "Perfeitos",
    howTo: "Como jogar",
    rule1: "Toque numa casa: ela e as 4 vizinhas mudam de cor.",
    rule2: "Vermelho → Amarelo → Azul → Vermelho…",
    rule3: "Deixe a grade inteira de uma só cor com o mínimo de jogadas.",
    play: "Jogar", hintsLeft: "dicas restantes", noHints: "Sem dicas hoje",
    sound: "Vibração", symbols: "Símbolos (daltonismo)", language: "Idioma", close: "Fechar",
    inMoves: "em {n} jogadas",
  },
  it: {
    tagline: "Un puzzle di colori al giorno",
    daily: "Sfida del giorno", endless: "Livelli", stats: "Statistiche", settings: "Impostazioni",
    level: "Livello", moves: "Mosse", par: "Obiettivo", hint: "Aiuto", undo: "Annulla", reset: "Ricomincia",
    solved: "Risolto!", perfect: "Perfetto!", share: "Condividi", next: "Livello successivo", home: "Home",
    copied: "Copiato negli appunti", nextDaily: "Prossima sfida tra", doneToday: "Fatto ✓",
    played: "Giocati", streak: "Serie", best: "Record", perfects: "Perfetti",
    howTo: "Come si gioca",
    rule1: "Tocca una casella: lei e le 4 vicine cambiano colore.",
    rule2: "Rosso → Giallo → Blu → Rosso…",
    rule3: "Rendi tutta la griglia di un solo colore con meno mosse possibile.",
    play: "Gioca", hintsLeft: "aiuti rimasti", noHints: "Nessun aiuto oggi",
    sound: "Vibrazione", symbols: "Simboli (daltonismo)", language: "Lingua", close: "Chiudi",
    inMoves: "in {n} mosse",
  },
} as const;

export type Lang = keyof typeof dict;
export type Key = keyof (typeof dict)["en"];
export const LANGS: Record<Lang, string> = {
  fr: "Français", en: "English", es: "Español", de: "Deutsch", pt: "Português", it: "Italiano",
};

let current: Lang = "en";

export function detectLang(): Lang {
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const l of langs) {
    const code = l.slice(0, 2).toLowerCase() as Lang;
    if (code in dict) return code;
  }
  return "en";
}

export function setLang(l: Lang) {
  current = l;
  document.documentElement.lang = l;
}

export function getLang(): Lang {
  return current;
}

export function t(key: Key, vars: Record<string, string | number> = {}): string {
  let s: string = dict[current][key] ?? dict.en[key];
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}
