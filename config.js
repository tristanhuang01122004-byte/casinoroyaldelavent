// Casino Royal de l'Avent — configuration
// Ce fichier est public : il ne nomme jamais les cadeaux.

export const CONFIG = {
  year: 2026,
  playerName: 'Tristan',
  memberNo: 'CR-2026-0001',
  startBonus: 50,          // bonus de bienvenue du jour 1
  jackpotBonus: 50,        // bonus des jours jackpot
  tokensPerEuro: 10,       // 10 jetons = 1 €
  euroCap: 50,             // plafond du bon casino
  tableMaxShare: 0.5,      // mise max à la table = moitié du solde
  advance: { threshold: 10, amount: 20 }, // avance de la croupière, 1 fois par semaine
  // SHA-256 du code du mode croupière
  adminHash: '25f9b3ab7e7d3634a79eab88d59a0b4592d42384900dfc10ecc481af5b8dfd3d',
};

export const CASE_SIZES = {
  petite:  { label: 'Petite case',  price: 10 },
  moyenne: { label: 'Case moyenne', price: 25 },
  grosse:  { label: 'Grosse case',  price: 50 },
};

// kind: 'gift' (cadeau offert) | 'case' (case payante) | 'final' (encaissement)
// salary / table : identifiants de jeux (voir games.js). Un jeu absent de games.js
// s'affiche « en préparation ».
export const DAYS = {
  1:  { kind: 'gift', custom: 'welcome' },
  2:  { kind: 'case', size: 'petite',  table: 'd2' },
  3:  { kind: 'gift', salary: 'd3s', table: 'd3' },
  4:  { kind: 'gift', table: 'd4' },
  5:  { kind: 'case', size: 'moyenne', table: 'd5' },
  6:  { kind: 'case', size: 'petite',  table: 'd6' },
  7:  { kind: 'gift', salary: 'd7s', table: 'd7', jackpot: true },
  8:  { kind: 'case', size: 'moyenne', table: 'd8' },
  9:  { kind: 'case', size: 'grosse',  table: 'd9' },
  10: { kind: 'gift', salary: 'd10s', table: 'd10' },
  11: { kind: 'case', size: 'petite',  table: 'd11' },
  12: { kind: 'case', size: 'moyenne', table: 'd12' },
  13: { kind: 'case', size: 'moyenne', table: 'd13' },
  14: { kind: 'gift', salary: 'd14s', table: 'd14', jackpot: true },
  15: { kind: 'case', size: 'petite',  table: 'd15' },
  16: { kind: 'case', size: 'moyenne', table: 'd16' },
  17: { kind: 'gift', salary: 'd17s', table: 'd17' },
  18: { kind: 'case', size: 'grosse',  table: 'd18' },
  19: { kind: 'gift', table: 'd19' },
  20: { kind: 'case', size: 'petite',  table: 'd20' },
  21: { kind: 'gift', salary: 'd21s' },          // le bonus est caché dans une étoile
  22: { kind: 'gift', salary: 'd22s', table: 'd22' },
  23: { kind: 'case', size: 'grosse',  table: 'd23' },
  24: { kind: 'gift', table: 'd24' },
  25: { kind: 'final' },             // l'encaissement
};
