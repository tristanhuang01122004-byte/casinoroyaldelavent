// Table « Pile ou Face » en quitte ou double (jour 2).
// Le tirage de chaque lancer est fait et enregistré AVANT l'animation.
import { CONFIG } from './config.js';
import { VIBES } from './vibes.js';
import { sound, tone, unlockAudio, setSound, music } from './audio.js';
import { sparks, sfx } from './slot.js';

export const SIDES = { chaton: 'Chaton', pique: 'Tristan et son chaton' };
const MAX_WINS = 3; // ×8

// Faces de la pièce : photo si elle existe (img/coin-chaton.jpg, img/coin-pique.jpg), sinon dessin.
const CAT = `<svg viewBox="0 0 100 100" class="coin-art"><path d="M18 30 L26 8 L44 24 Q50 22 56 24 L74 8 L82 30 Q90 44 86 60 Q80 84 50 88 Q20 84 14 60 Q10 44 18 30Z" fill="currentColor"/><ellipse cx="37" cy="50" rx="5" ry="7" fill="#f7e7b4"/><ellipse cx="63" cy="50" rx="5" ry="7" fill="#f7e7b4"/><path d="M45 64 L55 64 L50 70Z" fill="#f7e7b4"/><path d="M50 70 Q44 76 38 72 M50 70 Q56 76 62 72 M20 60 L36 62 M20 68 L36 66 M80 60 L64 62 M80 68 L64 66" stroke="#f7e7b4" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`;
const faceHTML = (side) => `
  <div class="coin-face ${side}">
    <div class="coin-rim"></div>
    <div class="coin-img" style="background-image:url('img/coin-${side}.jpg')"></div>
    <div class="coin-fallback">${side === 'chaton' ? CAT : '<span>♠</span>'}</div>
    <div class="coin-label">${SIDES[side]}</div>
  </div>`;

const pct = (p) => `${(p * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
const pickNew = (list, used) => list.find((t) => !used.includes(t)) ?? list[list.length - 1];

export function openCoinRoom({ api, label, lines, onClose }) {
  const d = api.data;
  d.flips ||= [];
  const L = lines || {};

  const room = document.createElement('div');
  room.className = 'room coin-room';
  room.innerHTML = `
    <canvas class="room-sparks"></canvas>
    <div class="room-bar">
      <button class="room-quit">‹ Sortir</button>
      <div class="pot-pill">Pot : <b class="pot">0</b></div>
      <button class="room-sound" aria-label="Son">${sound.on ? '♪ on' : '♪ off'}</button>
    </div>
    <div class="marquee">
      <div class="bulbs">${'<i></i>'.repeat(15)}</div>
      <div class="marquee-title">Pile ou Face</div>
      <div class="marquee-sub">Quitte ou double, jusqu'à ×8</div>
      <div class="bulbs">${'<i></i>'.repeat(15)}</div>
    </div>
    <div class="coin-stage">
      <div class="coin-shadow"></div>
      <div class="coin-fly"><div class="coin">${faceHTML('chaton')}${faceHTML('pique')}</div></div>
    </div>
    <div class="room-msg" aria-live="polite"></div>
    <div class="live">
      <div class="live-head">
        <div><div class="live-cap">Chance de gagner</div><div class="live-state">Ce lancer</div></div>
        <div class="live-big">50 %</div>
      </div>
      ${[1, 2, 3].map((k) => `
        <div class="live-row" data-k="${k}">
          <span class="lr-label">×${2 ** k}</span>
          <span class="lr-bar"><i></i></span>
          <span class="lr-frac"></span>
          <span class="lr-pct"></span>
          <span class="lr-gain"></span>
        </div>`).join('')}
    </div>
    <div class="coin-ctrl"></div>`;
  document.body.append(room);
  document.body.classList.add('in-room');
  requestAnimationFrame(() => room.classList.add('open'));
  music.intensity(0.3);
  music.play('room');

  const q = (s) => room.querySelector(s);
  const fx = sparks(q('.room-sparks'));
  const msg = q('.room-msg');
  const ctrl = q('.coin-ctrl');
  const coin = q('.coin');
  const fly = q('.coin-fly');
  let busy = false, closed = false, angle = 0;

  // Photos des faces : on cache le dessin si la photo se charge.
  ['chaton', 'pique'].forEach((s) => {
    const im = new Image();
    im.onload = () => room.querySelectorAll(`.coin-face.${s}`).forEach((f) => f.classList.add('has-img'));
    im.src = `img/coin-${s}.jpg`;
  });

  const wins = () => d.flips.filter((f) => f.win).length;
  const pot = () => (d.bet && d.state !== 'lost' ? d.bet * 2 ** wins() : 0);
  const usedLines = () => [...d.flips.map((f) => f.msg), d.cashMsg].filter(Boolean);

  // Bannière et petit mot (même style que la machine à sous).
  const chars = (t) => {
    let i = 0;
    const step = t.length > 16 ? 28 : 45;
    const words = t.split(' ').map((w) => `<span class="w">${[...w].map((c) => `<span class="ch" style="--d:${(i++) * step}ms">${c}</span>`).join('')}</span>`);
    return `<span class="${t.length > 16 ? 'long' : ''}">${words.join(' ')}</span>`;
  };
  function banner(text, sub, cls, dur = 2400) {
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
  let side = 0;
  function whisper(list) {
    if (closed) return;
    room.querySelectorAll('.wh').forEach((w) => w.remove());
    const r = q('.coin-stage').getBoundingClientRect();
    const w = document.createElement('div');
    w.className = `wh ${side++ % 2 ? 'left' : 'right'}`;
    w.textContent = list[Math.floor(Math.random() * list.length)];
    w.style.setProperty('--y', `${r.top + 10}px`);
    room.append(w);
    setTimeout(() => w.classList.add('out'), 2000);
    setTimeout(() => w.remove(), 2500);
  }

  function showOdds() {
    const w = wins();
    const lost = d.state === 'lost';
    q('.live-big').textContent = lost ? '0 %' : w >= MAX_WINS ? '100 %' : '50 %';
    q('.live-state').textContent = lost ? 'Perdu' : w >= MAX_WINS ? 'Maximum atteint' : d.state === 'cashed' ? 'Encaissé' : w ? `Lancer n°${w + 1}` : 'Premier lancer';
    [1, 2, 3].forEach((k) => {
      const row = q(`.live-row[data-k="${k}"]`);
      const p = lost ? 0 : k <= w ? 1 : (d.state === 'cashed' ? 0 : 0.5 ** (k - w));
      row.classList.toggle('hit', k <= w);
      row.classList.toggle('zero', p === 0 && k > w);
      row.classList.remove('miss');
      row.querySelector('i').style.width = `${p * 100}%`;
      row.querySelector('.lr-pct').textContent = k <= w ? 'atteint' : pct(p);
      row.querySelector('.lr-frac').textContent = k <= w || p === 0 ? '' : `1/${2 ** (k - w)}`;
      row.querySelector('.lr-gain').textContent = d.bet ? `${d.bet * 2 ** k}` : '';
    });
    q('.live').classList.remove('bump'); void q('.live').offsetWidth; q('.live').classList.add('bump');
    q('.pot').textContent = pot();
  }

  // Panneaux de contrôle selon l'état.
  function draw() {
    showOdds();
    const max = Math.floor(api.balance() * CONFIG.tableMaxShare);
    if (!d.state) {
      d.pick ??= Math.min(5, max);
      msg.innerHTML = max < 1 ? 'Pas assez de jetons pour miser aujourd\'hui.' : 'Choisis ta mise, puis ton côté.';
      ctrl.innerHTML = `
        <div class="bet">
          <div class="bet-row">
            <button class="chip-btn" data-v="-5">−5</button>
            <button class="chip-btn" data-v="-1">−1</button>
            <div class="bet-val"><b>${d.pick}</b><small>mise · max ${max}</small></div>
            <button class="chip-btn" data-v="1">+1</button>
            <button class="chip-btn" data-v="5">+5</button>
          </div>
          <button class="tapis">Tapis (${max})</button>
        </div>
        <div class="call-row">
          <button class="lever call" data-s="chaton" ${d.pick < 1 ? 'disabled' : ''}>${SIDES.chaton}</button>
          <button class="lever call" data-s="pique" ${d.pick < 1 ? 'disabled' : ''}>${SIDES.pique}</button>
        </div>`;
      ctrl.querySelectorAll('.chip-btn').forEach((b) => b.onclick = () => { d.pick = Math.max(1, Math.min(max, d.pick + +b.dataset.v)); tone(1200, 0.04, { vol: 0.06 }); draw(); });
      ctrl.querySelector('.tapis').onclick = () => { d.pick = max; tone(900, 0.08, { vol: 0.08 }); draw(); };
      ctrl.querySelectorAll('.call').forEach((b) => b.onclick = () => { unlockAudio(); start(b.dataset.s); });
    } else if (d.state === 'playing' && !busy) {
      const w = wins();
      msg.innerHTML = w ? `Pot : <b>${pot()} jetons</b> · tu encaisses ou tu relances ?` : '';
      ctrl.innerHTML = w ? `
        <button class="lever cash">Encaisser <small>+${pot()} jetons</small></button>
        <div class="call-row">
          <button class="lever ghost call" data-s="chaton">${SIDES.chaton}<small>relancer pour ${pot() * 2}</small></button>
          <button class="lever ghost call" data-s="pique">${SIDES.pique}<small>relancer pour ${pot() * 2}</small></button>
        </div>` : '';
      ctrl.querySelector('.cash')?.addEventListener('click', cashOut);
      ctrl.querySelectorAll('.call').forEach((b) => b.onclick = () => flip(b.dataset.s));
    } else if (d.state === 'cashed' || d.state === 'lost') {
      ctrl.innerHTML = '<button class="lever end">Sortir de la table</button>';
      ctrl.querySelector('.end').onclick = () => close(true);
    }
  }

  function start(call) {
    if (busy || d.state) return;
    const max = Math.floor(api.balance() * CONFIG.tableMaxShare);
    const bet = Math.max(1, Math.min(max, d.pick));
    d.bet = bet;
    d.state = 'playing';
    d.started = true;
    api.debit(bet, `${label} : mise de ${bet}`, api.n);
    api.refresh();
    flip(call);
  }

  function flip(call) {
    if (busy || d.state !== 'playing') return;
    busy = true;
    // Tirage enregistré tout de suite.
    const result = api.randInt(2) === 0 ? 'chaton' : 'pique';
    const f = { call, result, win: call === result };
    d.flips.push(f);
    if (f.win && wins() >= MAX_WINS) { d.state = 'cashed'; d.cashed = pot(); api.credit(pot(), `${label} : ×8 encaissé automatiquement`, api.n); }
    else if (!f.win) d.state = 'lost';
    api.save();

    ctrl.innerHTML = `<div class="called">Tu as dit <b>${SIDES[call]}</b></div>`;
    msg.textContent = 'La pièce est en l\'air…';
    sfx.lever();
    api.haptic(20);
    music.intensity(0.8);
    setTimeout(() => whisper(VIBES.whispers), 700);

    // Animation : 3 s en l'air, rebond, puis la face tombe.
    const spins = 8 + api.randInt(3);
    angle = Math.ceil(angle / 360) * 360 + spins * 360 + (result === 'pique' ? 180 : 0);
    coin.style.transition = 'transform 3s cubic-bezier(.2,.75,.3,1)';
    coin.style.transform = `rotateX(${angle}deg)`;
    fly.classList.remove('toss'); void fly.offsetWidth; fly.classList.add('toss');
    q('.coin-shadow').classList.remove('toss'); void q('.coin-shadow').offsetWidth; q('.coin-shadow').classList.add('toss');
    let t = 0;
    const whoosh = setInterval(() => { if (t++ < 14) tone(500 + Math.random() * 200, 0.05, { type: 'triangle', vol: 0.03 }); }, 190);
    setTimeout(() => { clearInterval(whoosh); tone(2600, 0.06, { vol: 0.12 }); tone(1900, 0.05, { vol: 0.08, delay: 0.12 }); api.haptic(30); }, 3000);
    setTimeout(() => land(f), 3350);
  }

  function land(f) {
    if (closed) return;
    busy = false;
    music.intensity(0.3);
    const r = q('.coin-stage').getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    f.msg = f.win ? pickNew(L.win || ['Gagné !'], usedLines()) : pickNew(L.lose || ['Perdu…'], usedLines());
    api.save();
    if (f.win) {
      room.classList.add('won');
      fx.emit(cx, cy, d.state === 'cashed' ? 140 : 70, { speed: 9 });
      sfx.win(d.state === 'cashed');
      api.haptic([25, 40, 25]);
      setTimeout(() => room.classList.remove('won'), 1500);
      setTimeout(() => banner(f.msg, d.state === 'cashed' ? `×8 · +${d.cashed} jetons` : `${SIDES[f.result]} ! Pot ×${2 ** wins()}`, d.state === 'cashed' ? 'bn-res bn-seven' : 'bn-res bn-pair'), 900);
      if (d.state === 'cashed') {
        room.classList.add('flash'); setTimeout(() => room.classList.remove('flash'), 700);
        for (let b = 0; b < 6; b++) setTimeout(() => fx.emit(innerWidth * (0.15 + Math.random() * 0.7), innerHeight * (0.15 + Math.random() * 0.4), 80, { speed: 9 }), b * 260);
        api.refresh();
      }
    } else {
      sfx.lose();
      api.haptic([60, 40, 60]);
      room.classList.add('shake'); setTimeout(() => room.classList.remove('shake'), 500);
      setTimeout(() => banner(f.msg, `${SIDES[f.result]}… la mise est perdue`, 'bn-res bn-none'), 900);
    }
    draw();
    if (d.state === 'cashed' || d.state === 'lost') setTimeout(showEnd, 3300);
  }

  function cashOut() {
    if (busy || d.state !== 'playing' || !wins()) return;
    d.state = 'cashed';
    d.cashed = pot();
    d.cashMsg = pickNew(L.cash || ['Encaissé'], usedLines());
    api.credit(d.cashed, `${label} : encaissé ×${2 ** wins()}`, api.n);
    api.save();
    api.refresh();
    sfx.win(false);
    api.haptic([20, 30, 20]);
    const r = q('.pot-pill').getBoundingClientRect();
    fx.emit(r.left + r.width / 2, r.top + r.height / 2, 60, { speed: 7 });
    banner(d.cashMsg, `+${d.cashed} jetons`, 'bn-res bn-triple');
    draw();
    setTimeout(showEnd, 2600);
  }

  function showEnd() {
    if (closed || q('.room-end')) return;
    const net = (d.cashed || 0) - d.bet;
    const end = document.createElement('div');
    end.className = 'room-end';
    end.innerHTML = `
      <div class="end-card">
        <div class="end-cap">${d.state === 'lost' ? 'La maison gagne' : 'Gains encaissés'}</div>
        <div class="end-total">${net > 0 ? '+' : ''}${net}</div>
        <div class="end-sub">jetons sur ta mise de ${d.bet}</div>
        <ul>${d.flips.map((f, i) => `<li><span>Lancer ${i + 1}</span><span>${SIDES[f.call]} → ${SIDES[f.result]}</span><b>${f.win ? '✓' : '✗'}</b></li>`).join('')}</ul>
        <button class="lever end-btn">Sortir de la table</button>
      </div>`;
    room.append(end);
    if (net > 0) { const r = end.querySelector('.end-total').getBoundingClientRect(); fx.emit(r.left + r.width / 2, r.top + r.height / 2, 60, { speed: 8 }); }
    end.querySelector('.end-btn').onclick = () => close(true);
  }

  function close(finished = false) {
    if (closed || busy) return;
    closed = true;
    removeEventListener('hashchange', onHash);
    music.play('lounge');
    fx.destroy();
    room.classList.remove('open');
    document.body.classList.remove('in-room');
    setTimeout(() => room.remove(), 250);
    api.refresh();
    onClose?.(finished || d.state === 'cashed' || d.state === 'lost');
  }
  const onHash = () => { busy = false; close(); };
  addEventListener('hashchange', onHash);
  room.addEventListener('pointerdown', unlockAudio, true);
  q('.room-quit').onclick = () => close();
  q('.room-sound').onclick = (e) => {
    setSound(!sound.on);
    e.target.textContent = sound.on ? '♪ on' : '♪ off';
    if (sound.on) { sfx.test(); api.haptic([30, 60, 30]); }
    document.querySelector('#snd')?.classList.toggle('off', !sound.on);
  };

  // Reprise après une sortie ou un rechargement.
  const last = d.flips[d.flips.length - 1];
  if (last) { angle = last.result === 'pique' ? 180 : 0; coin.style.transform = `rotateX(${angle}deg)`; }
  draw();
  if (d.state === 'cashed' || d.state === 'lost') showEnd();
}
