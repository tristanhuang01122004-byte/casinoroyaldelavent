// La salle des machines : machine à sous plein écran, probabilités en direct,
// suspense, étincelles et sons. Le tirage est fait et enregistré AVANT l'animation.
import { say, VIBES } from './vibes.js';

export const SYMBOLS = ['7', '♠', '♥', '♦', '♣'];
export const PAY = { seven: 10, triple: 6, pair: 2, none: 0 };
const LABELS = { seven: '7 7 7', triple: 'Brelan', pair: 'Paire', none: 'Rien' };
const KEYS = ['seven', 'triple', 'pair', 'none'];

export function kindOf(r) {
  if (r[0] === r[1] && r[1] === r[2]) return r[0] === 0 ? 'seven' : 'triple';
  if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) return 'pair';
  return 'none';
}

// Probabilités exactes de chaque résultat, sachant les rouleaux déjà arrêtés.
function odds(known) {
  const c = { seven: 0, triple: 0, pair: 0, none: 0 };
  let tot = 0;
  const rec = (a) => {
    if (a.length === 3) { tot++; c[kindOf(a)]++; return; }
    for (let s = 0; s < 5; s++) rec([...a, s]);
  };
  rec(known);
  return { c, tot };
}
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const frac = (n, d) => (n === 0 ? '—' : n === d ? 'sûr' : `${n / gcd(n, d)}/${d / gcd(n, d)}`);
const pct = (n, d) => `${((100 * n) / d).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;

const symCls = (i) => (i === 0 ? 'seven' : i === 2 || i === 3 ? 'red' : '');
const cell = (i) => `<span class="cell ${symCls(i)}">${SYMBOLS[i]}</span>`;

/* ───────────── Sons (Web Audio, sans fichier) ───────────── */
let actx = null, master = null, htmlUnlock = null;
const sound = { on: (() => { try { return localStorage.getItem('cra_sound') !== 'off'; } catch { return true; } })() };
function ac() {
  if (!actx) {
    // iPhone : jouer même en mode silencieux (iOS 17+).
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain();
      master.gain.value = 1;
      const comp = actx.createDynamicsCompressor();
      master.connect(comp).connect(actx.destination);
    } catch { return null; }
  }
  if (actx.state !== 'running') actx.resume?.();
  return actx;
}
// À appeler pendant un appui : débloque l'audio sur tous les navigateurs.
let unlocked = false;
export function unlockAudio() {
  if (unlocked) return;
  const c = ac(); if (!c) return;
  try {
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, 22050);
    src.connect(c.destination);
    src.start(0);
    htmlUnlock ||= new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
    htmlUnlock.play().catch(() => {});
    unlocked = c.state === 'running';
  } catch {}
}
function tone(freq, dur, { type = 'square', vol = 0.1, slide = 0, delay = 0 } = {}) {
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
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
  return o;
}
const sfx = {
  tick: () => tone(1400, 0.03, { vol: 0.06 }),
  stop: () => { tone(160, 0.18, { type: 'triangle', vol: 0.5, slide: 0.55 }); tone(1000, 0.05, { vol: 0.08 }); },
  lever: () => tone(90, 0.3, { type: 'sawtooth', vol: 0.18, slide: 2.4 }),
  tension: (d) => tone(170, d, { type: 'sawtooth', vol: 0.1, slide: 4 }),
  win: (big) => (big ? [523, 659, 784, 1046, 784, 1046, 1318] : [659, 784, 1046]).forEach((f, i) => tone(f, 0.2, { type: 'square', vol: 0.16, delay: i * 0.09 })),
  lose: () => tone(330, 0.45, { type: 'triangle', vol: 0.3, slide: 0.5 }),
  test: () => [784, 1046].forEach((f, i) => tone(f, 0.15, { type: 'square', vol: 0.14, delay: i * 0.1 })),
};

/* ───────────── Étincelles (canvas) ───────────── */
function sparks(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let parts = [], running = false;
  const resize = () => {
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`;
  };
  resize();
  addEventListener('resize', resize);
  const COLORS = ['#fff7d6', '#ffe08a', '#f2c14e', '#ffb02e', '#ffffff'];
  function tick() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalCompositeOperation = 'lighter';
    parts = parts.filter((p) => {
      p.vx *= 0.986; p.vy = p.vy * 0.986 + p.g;
      p.x += p.vx; p.y += p.vy; p.life--;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.strokeStyle = p.c; ctx.lineWidth = p.w;
      ctx.beginPath(); ctx.moveTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); ctx.lineTo(p.x, p.y); ctx.stroke();
      return p.life > 0;
    });
    ctx.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function emit(x, y, n, { speed = 7, spread = Math.PI * 2, angle = -Math.PI / 2, g = 0.16, life = 55 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const v = speed * (0.35 + Math.random() * 0.9);
      const max = life * (0.6 + Math.random() * 0.7);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g, life: max, max, c: COLORS[(Math.random() * COLORS.length) | 0], w: 1 + Math.random() * 2 });
    }
    if (!running) { running = true; requestAnimationFrame(tick); }
  }
  return { emit, destroy() { removeEventListener('resize', resize); parts = []; } };
}

/* ───────────── La salle ───────────── */
export function openSlotRoom({ api, spinsTotal, label, lines, onClose }) {
  const d = api.data;
  d.spins ||= [];
  const last = d.spins[d.spins.length - 1];
  const vis = [0, 1, 2].map((i) => {
    const mid = last ? last.r[i] : [0, 1, 2][i];
    return [(mid + 2) % 5, mid, (mid + 3) % 5];
  });

  const room = document.createElement('div');
  room.className = 'room';
  room.innerHTML = `
    <canvas class="room-sparks"></canvas>
    <div class="room-bar">
      <button class="room-quit">‹ Sortir</button>
      <div class="room-dots"></div>
      <button class="room-sound" aria-label="Son">${sound.on ? '♪ on' : '♪ off'}</button>
    </div>
    <div class="marquee">
      <div class="bulbs">${'<i></i>'.repeat(15)}</div>
      <div class="marquee-title">Machine à sous</div>
      <div class="marquee-sub">Tours offerts par la maison</div>
      <div class="bulbs">${'<i></i>'.repeat(15)}</div>
    </div>
    <div class="window">
      ${vis.map((v) => `<div class="reel"><div class="strip">${v.map(cell).join('')}</div></div>`).join('')}
      <div class="payline"><span>▶</span><span>◀</span></div>
      <div class="win-pop"></div>
    </div>
    <div class="room-msg" aria-live="polite">${say('slotIdle')}</div>
    <div class="live">
      <div class="live-head">
        <div><div class="live-cap">Chance de gagner</div><div class="live-state">Avant le tirage</div></div>
        <div class="live-big">52 %</div>
      </div>
      ${KEYS.map((k) => `
        <div class="live-row" data-k="${k}">
          <span class="lr-label">${LABELS[k]}</span>
          <span class="lr-bar"><i></i></span>
          <span class="lr-pct"></span>
          <span class="lr-gain">${PAY[k] ? `+${PAY[k]}` : '0'}</span>
          <span class="lr-frac"></span>
        </div>`).join('')}
    </div>
    <button class="lever"></button>
    <div class="room-total"></div>`;
  document.body.append(room);
  document.body.classList.add('in-room');
  requestAnimationFrame(() => room.classList.add('open'));

  const q = (s) => room.querySelector(s);
  const fx = sparks(q('.room-sparks'));
  const reels = [...room.querySelectorAll('.reel')].map((el) => ({ el, strip: el.querySelector('.strip') }));
  const lever = q('.lever');
  const msg = q('.room-msg');
  const win = q('.window');
  let spinning = false;
  let closed = false;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  // Bannière de résultat, sous la machine, après le reveal.
  const chars = (t) => {
    let i = 0;
    const step = t.length > 16 ? 28 : 45;
    const words = t.split(' ').map((w) => `<span class="w">${[...w].map((c) => `<span class="ch" style="--d:${(i++) * step}ms">${c}</span>`).join('')}</span>`);
    return `<span class="${t.length > 16 ? 'long' : ''}">${words.join(' ')}</span>`;
  };
  function banner(text, sub, cls, dur) {
    if (closed) return;
    room.querySelectorAll('.bn').forEach((b) => b.remove());
    const r = msg.getBoundingClientRect();
    const b = document.createElement('div');
    b.className = `bn ${cls}`;
    b.style.setProperty('--y', `${r.top + r.height / 2}px`);
    b.innerHTML = `<div class="bn-main">${chars(text)}</div>${sub ? `<div class="bn-sub">${sub}</div>` : ''}`;
    room.append(b);
    setTimeout(() => b.classList.add('out'), dur);
    setTimeout(() => b.remove(), dur + 500);
  }

  // Un seul petit mot par tirage, sur le côté de la machine.
  let side = 0;
  function whisper(list) {
    if (closed) return;
    room.querySelectorAll('.wh').forEach((w) => w.remove());
    const r = win.getBoundingClientRect();
    const w = document.createElement('div');
    w.className = `wh ${side++ % 2 ? 'left' : 'right'}`;
    w.textContent = pick(list);
    w.style.setProperty('--y', `${r.top - 4}px`);
    room.append(w);
    setTimeout(() => w.classList.add('out'), 2200);
    setTimeout(() => w.remove(), 2700);
  }

  const total = () => d.spins.reduce((a, s) => a + s.win, 0);
  function drawCounters() {
    q('.room-dots').innerHTML = Array.from({ length: spinsTotal }, (_, i) => `<i class="${i < d.spins.length ? 'used' : ''}"></i>`).join('');
    q('.room-total').innerHTML = d.spins.length ? `Gains de la session : <b>+${total()}</b> jetons` : '';
    const left = spinsTotal - d.spins.length;
    lever.disabled = spinning || left <= 0;
    lever.innerHTML = left > 0 ? `Tirer <small>tour ${d.spins.length + 1} / ${spinsTotal}</small>` : 'Fini';
  }

  function showOdds(known, stateTxt) {
    const { c, tot } = odds(known);
    q('.live-big').textContent = pct(tot - c.none, tot);
    q('.live-state').textContent = stateTxt;
    KEYS.forEach((k) => {
      const row = q(`.live-row[data-k="${k}"]`);
      row.classList.toggle('zero', c[k] === 0);
      row.classList.toggle('sure', c[k] === tot);
      row.classList.remove('hit', 'miss');
      row.querySelector('i').style.width = `${(100 * c[k]) / tot}%`;
      row.querySelector('.lr-pct').textContent = pct(c[k], tot);
      row.querySelector('.lr-frac').textContent = frac(c[k], tot);
    });
    q('.live').classList.remove('bump'); void q('.live').offsetWidth; q('.live').classList.add('bump');
  }
  showOdds([], 'Avant le tirage');
  drawCounters();

  const center = (el, dy = 0) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2 + dy]; };

  function spin() {
    if (spinning || d.spins.length >= spinsTotal) return;
    spinning = true;
    // 1) Tirage enregistré tout de suite.
    const r = [api.randInt(5), api.randInt(5), api.randInt(5)];
    const k = kindOf(r);
    const res = { r, win: PAY[k], kind: LABELS[k] };
    d.spins.push(res);
    d.started = true;
    if (res.win) api.credit(res.win, `${label}, tour ${d.spins.length} : ${res.kind.toLowerCase()}`, api.n);
    else api.save();

    // 2) Animation.
    drawCounters();
    sfx.lever();
    api.haptic(20);
    room.classList.add('spinning');
    room.classList.remove('won', 'big');
    win.classList.remove('hit', 'tense');
    q('.win-pop').className = 'win-pop';
    msg.className = 'room-msg';
    msg.textContent = 'Ça tourne…';
    showOdds([], 'Les rouleaux tournent');

    const tense = r[0] === r[1];
    const jackpotTense = tense && r[0] === 0;
    // Durées d'arrêt de chaque rouleau (ms) et durée du freinage final.
    // Environ 3 s entre deux rouleaux ; le dernier traîne plus en cas de suspense.
    const durations = [3000, 6000, tense ? (jackpotTense ? 11000 : 10000) : 9000];
    const brake = [1000, 1200, tense ? 3000 : 1400];
    if (!tense) setTimeout(() => whisper(VIBES.whispers), durations[0] + 500);
    const H = reels[0].el.offsetHeight / 3;
    const plan = reels.map((R, i) => {
      const count = Math.round(((durations[i] - brake[i] / 2) / 1000) * 17);
      let html = vis[i].map(cell).join('');
      for (let j = 0; j < count; j++) html += cell(api.randInt(5));
      const tgt = [(r[i] + 1 + api.randInt(4)) % 5, r[i], (r[i] + 1 + api.randInt(4)) % 5];
      html += tgt.map(cell).join('');
      R.strip.style.transform = 'translateY(0)';
      R.strip.innerHTML = html;
      R.el.classList.remove('bump');
      return { final: (3 + count) * H, tgt, lastIdx: 0 };
    });

    const t0 = performance.now();
    const done = [false, false, false];
    let tensionTimer = null;
    let lastTick = 0;
    const frame = (now) => {
      if (closed) return;
      reels.forEach((R, i) => {
        if (done[i]) return;
        // Vitesse constante, puis freinage sur les dernières secondes.
        const t = Math.min(durations[i], now - t0);
        const p = t / durations[i];
        const v = plan[i].final / (durations[i] - brake[i] / 2);
        const td = durations[i] - brake[i];
        const off = t <= td ? v * t : v * td + v * (t - td) - (v * (t - td) ** 2) / (2 * brake[i]);
        R.strip.style.transform = `translateY(${-off}px)`;
        const idx = Math.floor(off / H);
        if (idx !== plan[i].lastIdx) { plan[i].lastIdx = idx; if (now - lastTick > 55) { lastTick = now; sfx.tick(); } }
        if (p >= 1) { done[i] = true; stopReel(i); }
      });
      if (done.includes(false)) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    function stopReel(i) {
      const R = reels[i];
      vis[i] = plan[i].tgt;
      R.strip.style.transform = 'translateY(0)';
      R.strip.innerHTML = vis[i].map(cell).join('');
      R.el.classList.add('bump');
      sfx.stop();
      api.haptic(i === 2 ? 30 : 15);
      const [x, y] = center(R.el, H * 0.5);
      fx.emit(x, y, 14, { speed: 5, life: 35 });
      const known = r.slice(0, i + 1);
      showOdds(known, i === 0 ? 'Après le 1er rouleau' : i === 1 ? 'Après le 2e rouleau' : 'Résultat');
      if (i === 1 && tense) {
        win.classList.add('tense');
        room.classList.add('tension');
        msg.className = 'room-msg tense';
        msg.innerHTML = jackpotTense ? 'Deux 7… <b>Le jackpot est possible</b>' : `Deux ${SYMBOLS[r[0]]}… <b>un troisième ?</b>`;
        sfx.tension((durations[2] - durations[1]) / 1000);
        setTimeout(() => whisper(VIBES.whispersTense), 600);
        api.haptic([10, 80, 10, 80, 10]);
        const wr = win.getBoundingClientRect();
        tensionTimer = setInterval(() => {
          fx.emit(wr.left + 4, wr.top + wr.height / 2, 3, { angle: Math.PI, spread: 1.2, speed: 4, life: 30 });
          fx.emit(wr.right - 4, wr.top + wr.height / 2, 3, { angle: 0, spread: 1.2, speed: 4, life: 30 });
        }, 70);
      }
      if (i === 2) { clearInterval(tensionTimer); finish(); }
    }

    function finish() {
      room.classList.remove('spinning', 'tension');
      win.classList.remove('tense');
      KEYS.forEach((key) => q(`.live-row[data-k="${key}"]`).classList.add(key === k ? 'hit' : 'miss'));
      res.msg ||= lines?.[k] ?? say(k === 'seven' ? 'slotJackpot' : k === 'triple' ? 'slotTriple' : k === 'pair' ? 'slotPair' : 'slotNothing');
      api.save();
      setTimeout(() => banner(res.msg, res.win ? `+${res.win} jetons` : '', `bn-res bn-${k}`, k === 'seven' ? 3000 : 2400), k === 'seven' || k === 'triple' ? 1500 : 1100);
      const pop = q('.win-pop');
      const wr = win.getBoundingClientRect();
      const cx = wr.left + wr.width / 2, cy = wr.top + wr.height / 2;
      if (res.win) {
        win.classList.add('hit');
        room.classList.add('won');
        pop.textContent = `+${res.win}`;
        pop.className = `win-pop show ${k}`;
        msg.className = `room-msg win ${k}`;
        msg.innerHTML = `<b>${res.msg}</b> · +${res.win} jetons`;
        sfx.win(k !== 'pair');
        if (k === 'pair') {
          fx.emit(cx, cy, 60, { speed: 8 });
          api.haptic([25, 40, 25]);
        } else {
          room.classList.add('big');
          api.haptic([40, 60, 40, 60, 120]);
          const bursts = k === 'seven' ? 9 : 4;
          for (let b = 0; b < bursts; b++) {
            setTimeout(() => {
              fx.emit(innerWidth * (0.15 + Math.random() * 0.7), innerHeight * (0.12 + Math.random() * 0.4), 90, { speed: 9, g: 0.12, life: 70 });
              if (b % 2 === 0) sfx.win(false);
            }, b * 260);
          }
          let f = 0;
          const fountain = setInterval(() => {
            fx.emit(0, innerHeight, 10, { angle: -Math.PI / 3, spread: 0.5, speed: 14, g: 0.22, life: 70 });
            fx.emit(innerWidth, innerHeight, 10, { angle: (-2 * Math.PI) / 3, spread: 0.5, speed: 14, g: 0.22, life: 70 });
            if (++f > (k === 'seven' ? 40 : 18)) clearInterval(fountain);
          }, 60);
          room.classList.add('flash');
          setTimeout(() => room.classList.remove('flash'), 700);
        }
      } else {
        msg.className = 'room-msg lose';
        msg.textContent = res.msg;
        sfx.lose();
        room.classList.add('shake');
        setTimeout(() => room.classList.remove('shake'), 500);
      }
      spinning = false;
      drawCounters();
      if (d.spins.length >= spinsTotal) setTimeout(showEnd, res.win >= PAY.triple ? 2600 : 1500);
    }
  }

  function showEnd() {
    if (closed) return;
    const t = total();
    const end = document.createElement('div');
    end.className = 'room-end';
    end.innerHTML = `
      <div class="end-card">
        <div class="end-cap">Fin des tours gratuits</div>
        <div class="end-total">${t ? `+${t}` : '0'}</div>
        <div class="end-sub">jeton${t > 1 ? 's' : ''} gagné${t > 1 ? 's' : ''}</div>
        <ul>${d.spins.map((s, i) => `<li><span>Tour ${i + 1}</span><span>${s.r.map((x) => SYMBOLS[x]).join(' ')}</span><b>${s.win ? `+${s.win}` : '0'}</b></li>`).join('')}</ul>
        <p>${t ? 'La maison paie. Tes jetons sont sur ton compte.' : 'La maison gagne… cette fois.'}</p>
        <button class="lever end-btn">Encaisser et sortir</button>
      </div>`;
    room.append(end);
    if (t) { const r = end.querySelector('.end-total').getBoundingClientRect(); fx.emit(r.left + r.width / 2, r.top + r.height / 2, 70, { speed: 8 }); }
    end.querySelector('.end-btn').onclick = () => close(true);
  }

  function close(finished = false) {
    if (closed) return;
    closed = true;
    removeEventListener('hashchange', onHash);
    fx.destroy();
    room.classList.remove('open');
    document.body.classList.remove('in-room');
    setTimeout(() => room.remove(), 250);
    api.refresh();
    onClose?.(finished || d.spins.length >= spinsTotal);
  }
  const onHash = () => close();
  addEventListener('hashchange', onHash);

  room.addEventListener('pointerdown', unlockAudio, true);
  lever.onclick = () => { unlockAudio(); spin(); };
  q('.room-quit').onclick = () => { if (!spinning) close(); };
  q('.room-sound').onclick = (e) => {
    sound.on = !sound.on;
    try { localStorage.setItem('cra_sound', sound.on ? 'on' : 'off'); } catch {}
    e.target.textContent = sound.on ? '♪ on' : '♪ off';
    if (sound.on) { unlockAudio(); sfx.test(); api.haptic([30, 60, 30]); }
  };
  if (d.spins.length >= spinsTotal) showEnd();
}
