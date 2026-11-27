// Les jeux du calendrier. Chaque jeu : { title, render(el, api), summary?(data) }.
// Le jour 1 est un déroulé sur mesure : { steps() }.
import { CONFIG } from './config.js';
import { vipCardHTML, rain } from './app.js';
import { say, SLOT_LINES, COIN_LINES } from './vibes.js';
import { openCoinRoom, SIDES } from './coin.js';
import { ornament } from './ornaments.js';
import { openSlotRoom, SYMBOLS } from './slot.js';

const $ = (s, r) => r.querySelector(s);

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
        const SPINS = 3;
        const draw = () => {
          const d = api.data;
          d.spins ||= [];
          const left = SPINS - d.spins.length;
          const total = d.spins.reduce((a, x) => a + x.win, 0);
          el.innerHTML = `
            <div class="slot-teaser">
              <div class="teaser-reels">${['7', '♥', '7'].map((x, i) => `<span class="${i !== 1 ? 'seven' : 'red'}">${x}</span>`).join('')}</div>
              <p class="lead">${left === SPINS ? 'La maison t\'offre <b>3 tours</b> sur sa machine à sous.'
                : left > 0 ? `Il te reste <b>${left} tour${left > 1 ? 's' : ''}</b>. Gains : +${total}.`
                : `Tours terminés. Gains : <b>+${total} jetons</b>.`}</p>
              ${d.spins.length ? `<ul class="teaser-log">${d.spins.map((x, i) => `<li>Tour ${i + 1} · ${x.r.map((k) => SYMBOLS[k]).join(' ')} · ${x.win ? '+' + x.win : '0'}</li>`).join('')}</ul>` : ''}
              <p class="muted">Les probabilités s'affichent en direct pendant toute la partie.</p>
            </div>
            <button class="btn gold block go">${left === SPINS ? 'Entrer dans la salle des machines' : left > 0 ? 'Retourner à la machine' : 'Continuer'}</button>`;
          el.querySelector('.go').onclick = () => {
            if (left <= 0) return api.complete({ total });
            openSlotRoom({ api, spinsTotal: SPINS, label: 'Jour 1 : machine à sous', lines: SLOT_LINES[1], onClose: (finished) => {
              if (finished) api.complete({ total: api.data.spins.reduce((a, x) => a + x.win, 0) });
              else draw();
            } });
          };
        };
        draw();
      },
    },
  ],
};

/* ───────────── Jour 2 : Pile ou Face, quitte ou double ───────────── */
const d2 = {
  title: 'Pile ou Face',
  summary: (d) => d.skipped ? 'Passé' : `${(d.cashed || 0) - d.bet >= 0 ? '+' : ''}${(d.cashed || 0) - d.bet} jetons`,
  render(el, api) {
    const d = api.data;
    const draw = () => {
      d.flips ||= [];
      const over = d.state === 'cashed' || d.state === 'lost';
      el.innerHTML = `
        <div class="coin-teaser">
          <div class="mini-coin"><span>♠</span></div>
          <p class="lead">${!d.state ? `Mise tes jetons sur <b>Pile</b> ou sur <b>Face</b>.</p>
              <ul class="howto">
                <li>Tu as droit à <b>3 lancers</b> maximum.</li>
                <li>Chaque lancer gagné double ta mise : <b>×2</b>, puis <b>×4</b>, puis <b>×8</b>. ×8, c\'est le maximum.</li>
                <li>Après chaque lancer gagné, tu choisis : <b>encaisser</b> tes gains, ou <b>relancer</b>.</li>
                <li>Un lancer perdu, et toute la mise est perdue.</li>
              </ul><p class="lead" hidden>`
            : over ? (d.state === 'lost' ? `Perdu sur ta mise de ${d.bet}.` : `Encaissé : <b>+${d.cashed}</b> sur une mise de ${d.bet}.`)
            : `Partie en cours : pot de <b>${d.bet * 2 ** d.flips.filter((f) => f.win).length} jetons</b>.`}</p>
          <p class="muted">Une seule partie par jour. 50 % de chances à chaque lancer.</p>
        </div>
        <button class="btn gold block go">${!d.state ? 'S\'asseoir à la table' : over ? 'Continuer' : 'Retourner à la table'}</button>`;
      el.querySelector('.go').onclick = () => {
        if (over) return api.complete();
        openCoinRoom({ api, label: 'Jour 2 : pile ou face', lines: COIN_LINES, onClose: (finished) => finished ? api.complete() : draw() });
      };
    };
    draw();
  },
};

export const GAMES = {
  welcome,
  d2,
};

