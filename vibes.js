// Toutes les phrases « brainrot » au même endroit : modifie-les librement.
// Chaque entrée peut être une liste : une phrase est tirée au hasard.
const pick = (v) => (Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v);

export const VIBES = {
  heroLabel: ['Ton stack', 'Ton aura (en jetons)', 'Ton capital', 'Ta fortune'],
  locked: (n) => pick([`Patience chef, la case ${n} ouvre le ${n} décembre`, `Case ${n} : pas avant le ${n}. On ne triche pas.`, `Doucement, la case ${n} attend le ${n} décembre`]),
  startFirst: 'Commence par la case 1, chef',
  beforeOpen: (d) => `On prépare tout. Le casino ouvre dans <b>${d} jour${d > 1 ? 's' : ''}</b>.`,
  advance: (a) => `La croupière a pitié de toi : <b>+${a} jetons</b> d'avance. Touche pour les prendre (1 fois par semaine).`,
  dayEnd: (name) => pick([`GG ${name}. À demain.`, `Journée validée. À demain, ${name}.`, `Tu peux aller dormir, ${name}. À demain.`]),
  paid: (n) => pick([`W achat. Ouvre la case ${n} !`, `Payé. Ouvre la case ${n} !`]),
  leaveTitle: 'Sûr ? Ça fait un peu L',
  leaveOk: 'Je la laisse (sigma)',
  slotIdle: 'Trois tours offerts par la maison.',
  slotNothing: ['Rien. L.', 'Que dalle. Next.', 'Rien du tout.', 'Aïe. Rien.'],
  slotPair: ['W paire', 'Paire, propre', 'Une paire'],
  slotTriple: ['BRELAN. Aura +1000', 'Brelan ! Insane'],
  slotJackpot: ['7 7 7 · JACKPOT · AURA INFINIE'],
  wrongCode: 'Code incorrect. Bien essayé',

  // ── Salle des machines ──
  // Un seul petit mot par tirage, affiché en petit à côté de la machine.
  whispers: ['presque…', 'allez…', 'ça sent bon', 'on y croit', 'patience…', 'doucement…', 'hmm…', 'la maison transpire'],
  // Quand les deux premiers rouleaux sont identiques
  whispersTense: ['presque…', 'encore un…', 'retiens ton souffle', 'allez allez…'],
};

// Phrases de résultat de la machine à sous, par jour.
export const SLOT_LINES = {
  // Pour chaque résultat, la liste des bannières possibles, dans l'ordre de préférence.
  // Une bannière ne sort jamais deux fois, et « boomboclat » une seule fois sur les 3 tirages.
  1: {
    seven: ['Boomboclat wallah !!', 'JACKPOT. Wallah c\'est réel', 'La maison est en PLS'],
    triple: ['Boomboclat wallah !!', 'Brelan ! La croupière tremble', 'Wallah t\'es chaud'],
    pair: ['Mais nan ! Bouzelouf wallah', 'Petite paire, petit bouzelouf', 'Une paire, c\'est déjà ça'],
    none: ['Boomboclat…', 'Bouzelouf…', 'Presque… wallah', 'La maison garde tout'],
  },
};

export const say = (k, ...args) => {
  const v = VIBES[k];
  return pick(typeof v === 'function' ? v(...args) : v);
};

// Phrases de la table Pile ou Face (jour 2). Jamais deux fois la même.
export const COIN_LINES = {
  win: ['Yeaaaah gurrrl', 'Yeaaaah gurrrl, encore !', 'GURRRL t\'es en feu'],
  lose: ['Oh non, viens dans mes bras bébé'],
  cash: ['Smart money, chef', 'Tu ranges les billes, respect', 'La croupière valide'],
};
