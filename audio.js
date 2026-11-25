// Tout l'audio de l'appli : bruitages (générés en direct) et musiques de fond (fichiers mp3).

let actx = null, master = null, sfxBus = null, musicBus = null, htmlUnlock = null;

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
      musicBus = actx.createGain(); musicBus.gain.value = 0.7; musicBus.connect(master);
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

/* ───────────── Musiques de fond (fichiers) ─────────────
   Dépose les fichiers dans le dossier music/ du dépôt :
     music/lounge.mp3 → dans l'appli
     music/room.mp3   → dans la salle des machines
   Ils tournent en boucle. Si un fichier manque, pas de musique à cet endroit. */
const FILES = { lounge: 'music/lounge.mp3', room: 'music/room.mp3' };
const buffers = {};
function load(name) {
  if (!buffers[name]) {
    const c = ac();
    buffers[name] = fetch(FILES[name])
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('absent'))))
      .then((data) => new Promise((ok, ko) => c.decodeAudioData(data, ok, ko)))
      .catch(() => null);
  }
  return buffers[name];
}

export const music = {
  want: null,   // morceau voulu
  cur: null,    // { name, gain, src }
  level: 1,
  play(name) {
    this.want = name;
    if (!sound.on) return;
    const c = ac(); if (!c) return;
    if (this.cur?.name === name) return;
    this.fadeOut();
    const token = (this.token = {});
    load(name).then((buf) => {
      if (!buf || this.token !== token || !sound.on) return;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(this.level, c.currentTime + 1.2);
      gain.connect(musicBus);
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(gain);
      src.start();
      this.cur = { name, gain, src };
    });
  },
  fadeOut() {
    this.token = null;
    if (!this.cur) return;
    const { gain, src } = this.cur;
    const c = ac();
    if (c) {
      gain.gain.cancelScheduledValues(c.currentTime);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.8);
    }
    setTimeout(() => { try { src.stop(); } catch {} gain.disconnect(); }, 1000);
    this.cur = null;
  },
  stop() { this.fadeOut(); },
  resume() { if (this.want) this.play(this.want); },
  // La musique de la salle monte un peu quand ça tourne.
  intensity(v) {
    this.level = 0.75 + v * 0.25;
    const c = actx;
    if (c && this.cur?.name === 'room') this.cur.gain.gain.setTargetAtTime(this.level, c.currentTime, 0.4);
  },
};
