// Les jeux du calendrier. Chaque jeu : { title, render(el, api), summary?(data) }.
// Le jour 1 est un déroulé sur mesure : { steps() }.
import { CONFIG } from './config.js';
import { vipCardHTML, RULES, rain } from './app.js';
import { say } from './vibes.js';
import { ornament } from './ornaments.js';

const $ = (s, r) => r.querySelector(s);

/* ───────────── Machine à sous (réutilisable) ───────────── */
const SYMBOLS = ['7', '♠', '♥', '♦', '♣'];
const PAY = { seven: 10, triple: 6, pair: 2 };

function slotOutcome(r) {
  if (r[0] === r[1] && r[1] === r[2]) return r[0] === 0 ? { win: PAY.seven, kind: 'Jackpot 7 7 7' } : { win: PAY.triple, kind: 'Brelan' };
  if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) return { win: PAY.pair, kind: 'Paire' };
  return { win: 0, kind: 'Rien' };
}

function symHTML(i) { return `<span class="sym ${i === 0 ? 'seven' : i === 2 || i === 3 ? 'red' : ''}">${SYMBOLS[i]}</span>`; }

function slotMachine(el, { spinsTotal, label, api, onAllDone }) {
  const d = api.data;
  d.spins ||= [];
  const last = d.spins[d.spins.length - 1];
  el.innerHTML = `
    <div class="slot">
      <div class="slot-top">Tours gratuits</div>
      <div class="reels">${[0, 1, 2].map((i) => `<div class="reel"><div class="strip">${symHTML(last ? last.r[i] : [0, 1, 2][i])}</div></div>`).join('')}</div>
      <div class="slot-msg" aria-live="polite">${last ? resultText(last) : say('slotIdle')}</div>
      <div class="spin-dots">${Array.from({ length: spinsTotal }, (_, i) => `<i class="${i < d.spins.length ? 'used' : ''}"></i>`).join('')}</div>
    </div>
    <button class="btn gold block spin"></button>
    <details class="odds"><summary>Gains et probabilités</summary>
      <table>
        <tr><td>7 7 7</td><td>+${PAY.seven}</td><td>0,8 %</td></tr>
        <tr><td>Brelan (3 symboles identiques)</td><td>+${PAY.triple}</td><td>3,2 %</td></tr>
        <tr><td>Paire</td><td>+${PAY.pair}</td><td>48 %</td></tr>
        <tr><td>Rien</td><td>0</td><td>48 %</td></tr>
      </table>
      <p>5 symboles par rouleau, chacun avec 1 chance sur 5. Tirage fait au moment où tu appuies.</p>
    </details>`;

  const btn = $('.spin', el);
  const msg = $('.slot-msg', el);
  const setBtn = () => {
    const left = spinsTotal - d.spins.length;
    if (left > 0) { btn.textContent = `Lancer · tour ${d.spins.length + 1}/${spinsTotal}`; btn.disabled = false; }
    else {
      const total = d.spins.reduce((a, s) => a + s.win, 0);
      btn.textContent = 'Continuer';
      btn.disabled = false;
      btn.onclick = () => onAllDone(total);
    }
  };
  setBtn();
  btn.onclick = spinsTotal - d.spins.length > 0 ? spin : btn.onclick;

  function spin() {
    if (d.spins.length >= spinsTotal || btn.disabled) return;
    btn.disabled = true;
    // Le tirage est fait et enregistré AVANT l'animation.
    const r = [api.randInt(5), api.randInt(5), api.randInt(5)];
    const o = slotOutcome(r);
    const res = { r, win: o.win, kind: o.kind };
    d.spins.push(res);
    d.started = true;
    if (o.win) api.credit(o.win, `${label}, tour ${d.spins.length} : ${o.kind.toLowerCase()}`, api.n);
    else api.save();
    api.haptic(10);
    msg.textContent = '…';
    const reels = el.querySelectorAll('.reel');
    const h = reels[0].offsetHeight;
    reels.forEach((reel, i) => {
      const strip = $('.strip', reel);
      const n = 18 + i * 6;
      const cur = strip.lastElementChild?.outerHTML || symHTML(0);
      let html = cur;
      for (let k = 0; k < n; k++) html += symHTML(api.randInt(5));
      html += symHTML(r[i]);
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0)';
      strip.innerHTML = html;
      void strip.offsetHeight;
      strip.style.transition = `transform ${900 + i * 450}ms cubic-bezier(.15,.85,.25,1.02)`;
      strip.style.transform = `translateY(-${(n + 1) * h}px)`;
    });
    setTimeout(() => {
      reels.forEach((reel, i) => { const s = $('.strip', reel); s.style.transition = 'none'; s.style.transform = 'none'; s.innerHTML = symHTML(r[i]); });
      msg.innerHTML = resultText(res);
      el.querySelectorAll('.spin-dots i').forEach((dot, i) => dot.classList.toggle('used', i < d.spins.length));
      if (res.win) { api.haptic([25, 40, 25]); rain($('.slot', el), res.win >= 6 ? 22 : 8); el.querySelector('.slot').classList.add('win'); setTimeout(() => el.querySelector('.slot')?.classList.remove('win'), 1200); }
      api.refresh();
      setBtn();
      if (d.spins.length < spinsTotal) btn.onclick = spin;
    }, 900 + 2 * 450 + 120);
  }
}

function resultText(s) {
  s.msg ||= say(s.win === PAY.seven ? 'slotJackpot' : s.win === PAY.triple ? 'slotTriple' : s.win ? 'slotPair' : 'slotNothing');
  return s.win ? `<b>${s.msg}</b> · +${s.win} jetons` : s.msg;
}

/* ───────────── Jour 1 : bienvenue ───────────── */
const welcome = {
  steps: () => [
    {
      id: 'open',
      title: 'La lettre',
      summary: () => 'Case 1 ouverte',
      render(el, api) {
        el.innerHTML = `
          <div class="open-box">
            <div class="big-num">${ornament(1)}<span>1</span></div>
            <p>Ouvre la case <b>1</b> de ton calendrier.<br>Une lettre t'y attend : lis-la avant de continuer.</p>
          </div>
          <button class="btn gold block">J'ai lu ma lettre</button>`;
        $('button', el).onclick = () => api.complete();
      },
    },
    {
      id: 'vip',
      title: 'Ta carte VIP',
      summary: () => 'Signée',
      render(el, api) {
        el.innerHTML = `
          <p class="lead">Bienvenue au Casino Royal de l'Avent, ${api.esc(CONFIG.playerName)}. Voici ta carte de membre.</p>
          ${vipCardHTML(null)}
          <p class="muted">Signe dans le cadre avec ton doigt pour entrer.</p>
          <div class="sign-pad"><canvas></canvas><span class="sign-hint">Signe ici</span></div>
          <div class="row">
            <button class="btn ghost clear">Effacer</button>
            <button class="btn gold sign" disabled>Signer</button>
          </div>`;
        const canvas = $('canvas', el);
        const pad = $('.sign-pad', el);
        const signBtn = $('.sign', el);
        const ctx = canvas.getContext('2d');
        let ink = 0, drawing = false, lx = 0, ly = 0;
        const setup = () => {
          const r = pad.getBoundingClientRect();
          const dpr = Math.min(3, window.devicePixelRatio || 1);
          canvas.width = r.width * dpr; canvas.height = r.height * dpr;
          canvas.style.width = `${r.width}px`; canvas.style.height = `${r.height}px`;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#f3e6c4';
          ink = 0; signBtn.disabled = true; pad.classList.remove('inked');
        };
        setup();
        const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
        canvas.addEventListener('pointerdown', (e) => { drawing = true; canvas.setPointerCapture(e.pointerId); [lx, ly] = pos(e); pad.classList.add('inked'); });
        canvas.addEventListener('pointermove', (e) => {
          if (!drawing) return;
          const [x, y] = pos(e);
          ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y); ctx.stroke();
          ink += Math.hypot(x - lx, y - ly); lx = x; ly = y;
          if (ink > 60) signBtn.disabled = false;
        });
        const end = () => { drawing = false; };
        canvas.addEventListener('pointerup', end);
        canvas.addEventListener('pointercancel', end);
        $('.clear', el).onclick = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); setup(); };
        signBtn.onclick = () => {
          const S = api.state();
          S.vip = { sig: canvas.toDataURL('image/png'), at: Date.now() };
          api.haptic([15, 30, 15]);
          api.complete();
        };
      },
    },
    {
      id: 'bonus',
      title: 'Bonus de bienvenue',
      summary: () => `+${CONFIG.startBonus} jetons`,
      render(el, api) {
        el.innerHTML = `
          <div class="bonus">
            <div class="stack" aria-hidden="true">${'<i></i>'.repeat(6)}</div>
            <p class="lead">La croupière t'offre <b>${CONFIG.startBonus} jetons</b> pour commencer.</p>
          </div>
          <button class="btn gold block">Recevoir mes ${CONFIG.startBonus} jetons</button>`;
        $('button', el).onclick = (e) => {
          e.target.disabled = true;
          api.credit(CONFIG.startBonus, 'Jour 1 : bonus de bienvenue', 1);
          api.haptic([20, 40, 20, 40, 40]);
          rain($('.bonus', el), 24);
          api.complete();
        };
      },
    },
    {
      id: 'slots',
      title: 'Trois tours gratuits',
      summary: (d) => `+${(d.spins || []).reduce((a, s) => a + s.win, 0)} jetons`,
      render(el, api) {
        slotMachine(el, { spinsTotal: 3, label: 'Jour 1 : machine à sous', api, onAllDone: (total) => api.complete({ total }) });
      },
    },
    {
      id: 'rules',
      title: 'Les règles',
      summary: () => 'Lues',
      render(el, api) {
        let i = 0;
        const draw = () => {
          const r = RULES[i];
          el.innerHTML = `
            <div class="rule-card">
              <div class="rule-step">${i + 1} / ${RULES.length}</div>
              <h4>${r.title}</h4>${r.html}
            </div>
            <div class="dots">${RULES.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
            <div class="row">
              ${i > 0 ? '<button class="btn ghost prev">Retour</button>' : ''}
              <button class="btn gold next">${i < RULES.length - 1 ? 'Suivant' : 'C\'est parti'}</button>
            </div>`;
          $('.prev', el)?.addEventListener('click', () => { i--; draw(); });
          $('.next', el).onclick = () => { if (i < RULES.length - 1) { i++; draw(); } else api.complete(); };
        };
        draw();
      },
    },
  ],
};

export const GAMES = {
  welcome,
};

export { slotMachine };
