// Tout l'audio de l'appli : bruitages et musiques de fond, générés en direct
// avec Web Audio (aucun fichier à télécharger).

let actx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null, htmlUnlock = null;

export const sound = { on: (() => { try { return localStorage.getItem('cra_sound') !== 'off'; } catch { return true; } })() };

export function ac() {
  if (!actx) {
    // iPhone : jouer même en mode silencieux (iOS 17+).
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain();
      const comp = actx.createDynamicsCompressor();
      master.connect(comp).connect(actx.destination);
      sfxBus = actx.createGain(); sfxBus.connect(master);
      musicBus = actx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
    } catch { return null; }
  }
  if (actx.state !== 'running' && !document.hidden) actx.resume?.();
  return actx;
}

// À appeler pendant un appui : débloque l'audio (Android, iPhone).
export function unlockAudio() {
  const c = ac(); if (!c) return;
  try {
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, 22050);
    src.connect(c.destination);
    src.start(0);
    if (!htmlUnlock) {
      htmlUnlock = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
      htmlUnlock.play().catch(() => {});
    }
  } catch {}
}

export function setSound(on) {
  sound.on = on;
  try { localStorage.setItem('cra_sound', on ? 'on' : 'off'); } catch {}
  if (on) { unlockAudio(); music.resume(); } else music.stop();
}

// Coupe tout quand l'appli passe en arrière-plan.
document.addEventListener('visibilitychange', () => {
  if (!actx) return;
  if (document.hidden) actx.suspend?.();
  else if (sound.on) actx.resume?.();
});

/* ───────────── Bruitages ───────────── */
export function tone(freq, dur, { type = 'square', vol = 0.1, slide = 0, delay = 0 } = {}) {
  if (!sound.on) return null;
  const c = ac(); if (!c) return null;
  const t = c.currentTime + delay + 0.01;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(sfxBus);
  o.start(t); o.stop(t + dur + 0.05);
  return o;
}

/* ───────────── Instruments ───────────── */
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function env(c, out, t, a, peak, dec) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  g.connect(out);
  return g;
}
function osc(c, type, f, t, end, dest, detune = 0) {
  const o = c.createOscillator();
  o.type = type; o.frequency.value = f; o.detune.value = detune;
  o.connect(dest); o.start(t); o.stop(end);
  return o;
}
function noise(c) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  return s;
}
// Piano électrique doux
function keys(c, out, m, t, dur, v) {
  const g = env(c, out, t, 0.008, v, dur);
  const f = mtof(m);
  osc(c, 'sine', f, t, t + dur + 0.1, g);
  const h = c.createGain(); h.gain.value = 0.22; h.connect(g);
  osc(c, 'triangle', f * 2.002, t, t + dur + 0.1, h);
}
// Contrebasse pincée
function bass(c, out, m, t, v) {
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.connect(out);
  const g = env(c, lp, t, 0.01, v, 0.45);
  osc(c, 'triangle', mtof(m), t, t + 0.6, g);
  osc(c, 'sine', mtof(m), t, t + 0.6, g);
}
// Cymbale ride / charleston
function metal(c, out, t, v, dec, freq = 7000) {
  const s = noise(c);
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = freq;
  const g = env(c, out, t, 0.002, v, dec);
  s.connect(hp).connect(g);
  s.start(t, Math.random() * 0.5); s.stop(t + dec + 0.05);
}
function kick(c, out, t, v) {
  const g = env(c, out, t, 0.003, v, 0.22);
  const o = c.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
  o.connect(g); o.start(t); o.stop(t + 0.3);
}
// Nappe sombre (salle des machines)
function pad(c, out, notes, t, dur, v) {
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 750; lp.Q.value = 0.7; lp.connect(out);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + dur * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
  g.connect(lp);
  notes.forEach((m) => { osc(c, 'sawtooth', mtof(m), t, t + dur + 0.5, g, -6); osc(c, 'sawtooth', mtof(m), t, t + dur + 0.5, g, 6); });
}
function bell(c, out, m, t, v) {
  const g = env(c, out, t, 0.004, v, 2.2);
  osc(c, 'sine', mtof(m), t, t + 2.4, g);
  const h = c.createGain(); h.gain.value = 0.3; h.connect(g);
  osc(c, 'sine', mtof(m) * 2.76, t, t + 1.2, h);
}

/* ───────────── Morceaux ───────────── */
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Jazz de casino (swing, 100 bpm) : grille de 8 mesures.
const LOUNGE = {
  bpm: 100,
  grid: [
    { r: 50, c: [65, 69, 72, 76] }, // Dm9
    { r: 55, c: [65, 71, 76] },     // G13
    { r: 48, c: [64, 67, 71, 74] }, // Cmaj9
    { r: 57, c: [61, 67, 70] },     // A7b9
    { r: 52, c: [62, 67, 71] },     // Em7
    { r: 57, c: [61, 67, 71] },     // A7
    { r: 50, c: [65, 69, 72, 76] }, // Dm9
    { r: 55, c: [65, 71, 74] },     // G7
  ],
  bar(c, out, i, t0) {
    const beat = 60 / this.bpm;
    const at = (e) => t0 + Math.floor(e / 2) * beat + (e % 2 ? (beat * 2) / 3 : 0); // croches swing
    const ch = this.grid[i % 8], next = this.grid[(i + 1) % 8];
    // Basse qui marche
    const walk = pick([[0, 7, 12], [0, 12, 7], [0, 5, 7], [0, 3, 7]]);
    walk.forEach((iv, b) => bass(c, out, ch.r + iv, t0 + b * beat, b === 0 ? 0.5 : 0.38));
    bass(c, out, next.r + pick([-1, 1]), t0 + 3 * beat, 0.34);
    // Accords au piano
    pick([[0, 3], [1, 5], [0, 5], [2, 7], [0, 4, 7]]).forEach((e) => ch.c.forEach((m) => keys(c, out, m, at(e), pick([0.5, 0.9, 1.3]), 0.045)));
    // Petite phrase de temps en temps
    if (i % 4 === 1 && Math.random() < 0.7) {
      const tones = ch.c.map((m) => m + 12);
      [2, 3, 4, 6].slice(0, 2 + Math.floor(Math.random() * 3)).forEach((e) => keys(c, out, pick(tones), at(e), 0.45, 0.04));
    }
    // Batterie aux balais
    [0, 2, 3, 4, 6, 7].forEach((e) => metal(c, out, at(e), e === 2 || e === 6 ? 0.05 : 0.035, 0.32, 6500));
    [2, 6].forEach((e) => metal(c, out, at(e), 0.03, 0.05, 9000));
    kick(c, out, t0, 0.12);
  },
};

// Suspense léger (salle des machines, 92 bpm).
const ROOM = {
  bpm: 92,
  grid: [
    { r: 45, c: [57, 60, 64] }, // Am
    { r: 41, c: [57, 60, 65] }, // F
    { r: 38, c: [57, 62, 65] }, // Dm
    { r: 40, c: [56, 59, 64] }, // E
  ],
  intensity: 0.3,
  bar(c, out, i, t0) {
    const s16 = 60 / this.bpm / 4;
    const ch = this.grid[i % 4];
    const k = this.intensity;
    pad(c, out, ch.c, t0, s16 * 16, 0.028);
    // Basse pulsée en croches
    for (let e = 0; e < 8; e++) bass(c, out, ch.r + 12 + (e % 4 === 3 ? 12 : 0), t0 + e * 2 * s16, e % 2 ? 0.2 : 0.3);
    // Tic-tac de charleston, plus présent quand ça tourne
    for (let s = 0; s < 16; s++) {
      if (k < 0.5 && s % 2) continue;
      metal(c, out, t0 + s * s16, (s % 4 === 0 ? 0.035 : 0.018) * (0.6 + k), 0.04, 8500);
    }
    if (k > 0.6) [0, 4, 8, 12].forEach((s) => kick(c, out, t0 + s * s16, 0.16 * k));
    if (i % 2 === 0) bell(c, out, pick([76, 81, 79, 72]), t0 + s16 * 2, 0.03);
  },
};

const TRACKS = { lounge: LOUNGE, room: ROOM };

export const music = {
  want: null,      // morceau voulu
  cur: null,       // { name, gain, timer }
  play(name) {
    this.want = name;
    if (!sound.on) return;
    const c = ac(); if (!c) return;
    if (this.cur?.name === name) return;
    this.fadeOut();
    const tr = TRACKS[name];
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(1, c.currentTime + 1.2);
    gain.connect(musicBus);
    let bar = 0, next = c.currentTime + 0.1;
    const barDur = (60 / tr.bpm) * 4;
    const tick = () => {
      if (document.hidden) return;
      while (next < c.currentTime + 0.6) { tr.bar(c, gain, bar++, next); next += barDur; }
      if (next < c.currentTime) next = c.currentTime + 0.1; // reprise après une pause
    };
    tick();
    this.cur = { name, gain, timer: setInterval(tick, 200) };
  },
  fadeOut() {
    if (!this.cur) return;
    const { gain, timer } = this.cur;
    clearInterval(timer);
    const c = ac();
    if (c) {
      gain.gain.cancelScheduledValues(c.currentTime);
      gain.gain.setValueAtTime(gain.gain.value || 0.0001, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.8);
    }
    setTimeout(() => gain.disconnect(), 3500);
    this.cur = null;
  },
  stop() { this.fadeOut(); },
  resume() { if (this.want) this.play(this.want); },
  intensity(v) { ROOM.intensity = v; },
};
