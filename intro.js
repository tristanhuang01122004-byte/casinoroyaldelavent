// Le tutoriel d'ouverture, façon jeu de société :
// la boîte → l'enveloppe scellée → l'invitation → « combien pourras-tu miser ? » → le livret de règles.
import { CONFIG } from './config.js';
import { RULES, esc, haptic } from './app.js';
import { tone } from './audio.js';
import { ornament } from './ornaments.js';

const KEY = 'cra_intro_off';
export const introOff = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const setOff = (v) => { try { if (v) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch {} };

// L'invitation (réutilisée le 25 décembre avec la vraie mise).
export function invitationHTML(amount) {
  return `
    <div class="invite">
      <div class="inv-top">♠ Invitation ♠</div>
      <div class="inv-name">${esc(CONFIG.playerName)},</div>
      <p class="inv-txt">tu as gagné une <b>soirée au casino</b><br>avec ta croupière.</p>
      <div class="inv-rows">
        <div><span>Date</span><b>${esc(CONFIG.casinoDate || 'à fixer ensemble')}</b></div>
        <div><span>Mise autorisée</span><b class="inv-amount ${amount == null ? 'blur' : ''}">${amount == null ? '??,?? €' : amount}</b></div>
      </div>
      <div class="inv-sign">${esc(CONFIG.dealerName)}</div>
    </div>`;
}

const sfx = {
  lid: () => tone(95, 0.35, { type: 'triangle', vol: 0.4, slide: 0.7 }),
  crack: () => { tone(2200, 0.04, { vol: 0.1 }); tone(260, 0.16, { type: 'triangle', vol: 0.35, slide: 0.5 }); },
  paper: () => tone(1800, 0.08, { type: 'triangle', vol: 0.05, slide: 0.35 }),
  tick: () => tone(1500, 0.02, { vol: 0.05 }),
  chime: () => [784, 988, 1318].forEach((f, i) => tone(f, 0.28, { type: 'triangle', vol: 0.14, delay: i * 0.09 })),
};

const BOOK = () => [
  {
    t: 'But du jeu',
    h: `<p>Chaque jour, ouvre une case du calendrier et joue dans l'appli pour gagner des jetons.</p>
      <p>Le 25 décembre, tes jetons fixent ta mise au casino : <b>10 jetons = 1 €</b>, jusqu'à <b>50 €</b>.</p>
      <p class="goal">Arrive au 25 avec un maximum de jetons.</p>`,
  },
  {
    t: 'Matériel',
    h: `<ul class="mat">
        <li><span class="mat-i">${ornament(7)}</span><div><b>Le calendrier</b><small>25 cases, une par jour.</small></div></li>
        <li><span class="mat-i"><i class="chip-ico"></i></span><div><b>Tes jetons</b><small>La monnaie du casino. Ton solde est en haut de l'écran.</small></div></li>
        <li><span class="mat-i mat-s">♠</span><div><b>Ta carte VIP</b><small>Elle t'attend dans la case 1.</small></div></li>
        <li><span class="mat-i mat-s red">♥</span><div><b>La croupière</b><small>Elle tient la caisse. Et elle t'a à l'œil.</small></div></li>
      </ul>`,
  },
  {
    t: 'Un tour de jeu',
    h: `<ol class="flow">
        <li><b>Ouvre ta case</b><small>Le jour J, à partir de minuit.</small></li>
        <li><b>Le salaire</b><small>Si ta case cache un cadeau : un petit jeu sans risque.</small></li>
        <li><b>La table</b><small>Un jeu de casino. Tu mises… ou tu passes.</small></li>
        <li><b>La caisse</b><small>Si ta case est payante : tu l'achètes ou tu la laisses.</small></li>
      </ol>
      <p class="muted">Un jour oublié ? Pas grave, tu peux le jouer plus tard.</p>`,
  },
  { t: RULES[1].title, h: RULES[1].html },
  { t: RULES[2].title, h: RULES[2].html },
  { t: RULES[3].title, h: RULES[3].html },
  { t: 'Fin de partie', h: `${RULES[4].html}<p class="goal">Le 25, l'invitation revient… avec ta vraie mise.</p>` },
  {
    t: 'À toi de jouer',
    h: `<p class="goal">La croupière t'attend.</p>
      <p>Commence par la case 1 de ton calendrier.</p>
      <p class="muted">Pour relire ce livret, touche « Livret de règles » sur l'accueil.</p>
      <label class="noshow"><input type="checkbox" ${introOff() ? 'checked' : ''}> Ne plus afficher au démarrage</label>`,
    last: true,
  },
];

export function openIntro({ startAt = 0 } = {}) {
  if (document.querySelector('.intro')) return;
  const el = document.createElement('div');
  el.className = 'intro';
  document.body.append(el);
  document.body.classList.add('in-intro');
  requestAnimationFrame(() => el.classList.add('open'));
  const steps = [box, envelope, invitation, twist, book];
  let timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  function go(i) {
    timers.forEach(clearTimeout); timers = [];
    el.innerHTML = `${i < 4 ? '<button class="intro-skip">Passer ›</button>' : ''}<div class="intro-stage s${i}"></div>`;
    el.querySelector('.intro-skip')?.addEventListener('click', () => go(4));
    steps[i](el.querySelector('.intro-stage'));
  }
  function close() {
    timers.forEach(clearTimeout);
    el.classList.remove('open');
    document.body.classList.remove('in-intro');
    setTimeout(() => el.remove(), 300);
  }

  // 1. La boîte de jeu
  function box(st) {
    st.innerHTML = `
      <button class="ibox" aria-label="Ouvrir la boîte">
        <span class="ibox-base"><span class="ibox-env"></span></span>
        <span class="ibox-lid">
          <span class="lid-band">Jeu de casino · Édition de l'Avent</span>
          <span class="lid-orn">${ornament(25)}</span>
          <span class="lid-title">Casino Royal<small>de l'Avent</small></span>
          <span class="lid-badges"><span>1 joueur</span><span>25 jours</span><span>1 croupière</span></span>
          <span class="lid-age">Âge : assez grand pour le casino</span>
        </span>
      </button>
      <p class="intro-hint">Touche la boîte pour l'ouvrir</p>`;
    const b = st.querySelector('.ibox');
    b.onclick = () => {
      if (b.classList.contains('open')) return;
      b.classList.add('open');
      sfx.lid(); haptic(25);
      st.querySelector('.intro-hint').textContent = '';
      later(() => go(1), 1300);
    };
  }

  // 2. L'enveloppe scellée
  function envelope(st) {
    st.innerHTML = `
      <div class="env">
        <div class="env-back"></div>
        <div class="env-card">${invitationHTML(null)}</div>
        <div class="env-front"></div>
        <div class="env-flap"></div>
        <button class="seal" aria-label="Briser le sceau"><span>CR</span></button>
      </div>
      <p class="intro-hint">Brise le sceau</p>`;
    const env = st.querySelector('.env');
    st.querySelector('.seal').onclick = () => {
      if (env.classList.contains('open')) return;
      env.classList.add('open');
      sfx.crack(); haptic([20, 40, 30]);
      st.querySelector('.intro-hint').textContent = '';
      later(() => sfx.paper(), 700);
      later(() => go(2), 2200);
    };
  }

  // 3. L'invitation, en grand
  function invitation(st) {
    st.innerHTML = `
      <div class="inv-wrap">${invitationHTML(null)}</div>
      <button class="btn gold intro-next">Et ma mise ?</button>`;
    sfx.chime();
    st.querySelector('.intro-next').onclick = () => go(3);
  }

  // 4. Le twist
  function twist(st) {
    st.innerHTML = `
      <div class="twist">
        <p class="tw-q">Combien pourras-tu miser ?</p>
        <div class="tw-count">0,00 €</div>
        <p class="tw-a">Ça dépend de toi.</p>
        <p class="tw-b">Gagne ta mise grâce au calendrier.<small>Jusqu'à 50 €. 10 jetons = 1 €.</small></p>
        <button class="btn gold intro-next">Ouvrir le livret de règles</button>
      </div>`;
    const c = st.querySelector('.tw-count');
    const tw = st.querySelector('.twist');
    let n = 0, delay = 45;
    const roll = () => {
      if (n++ < 20) {
        c.textContent = `${(Math.random() * 50).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
        sfx.tick();
        delay *= 1.1;
        later(roll, delay);
      } else {
        c.textContent = '? €';
        c.classList.add('done');
        haptic(30);
        later(() => tw.classList.add('a'), 500);
        later(() => tw.classList.add('b'), 1400);
        later(() => tw.classList.add('c'), 2200);
      }
    };
    later(roll, 600);
    st.querySelector('.intro-next').onclick = () => go(4);
  }

  // 5. Le livret de règles
  function book(st) {
    const pages = BOOK();
    let p = 0;
    st.innerHTML = `
      <div class="book"><div class="page"></div></div>
      <div class="book-nav">
        <button class="btn ghost prev">‹</button>
        <div class="book-dots">${pages.map(() => '<i></i>').join('')}</div>
        <button class="btn gold next"></button>
      </div>`;
    const page = st.querySelector('.page');
    const draw = (dir = 0) => {
      const pg = pages[p];
      page.className = `page ${dir > 0 ? 'in-r' : dir < 0 ? 'in-l' : ''}`;
      page.innerHTML = `
        <div class="pg-head">Livret de règles</div>
        <h3>${pg.t}</h3>
        <div class="pg-body">${pg.h}</div>
        <div class="pg-foot">${p + 1} / ${pages.length}</div>`;
      st.querySelectorAll('.book-dots i').forEach((d, k) => d.classList.toggle('on', k === p));
      st.querySelector('.prev').style.visibility = p ? 'visible' : 'hidden';
      st.querySelector('.next').textContent = pg.last ? 'Commencer' : 'Suivant ›';
      const cb = page.querySelector('.noshow input');
      if (cb) cb.onchange = () => setOff(cb.checked);
    };
    const turn = (d) => {
      const n = p + d;
      if (n < 0) return;
      if (n >= pages.length) return close();
      p = n; sfx.paper(); draw(d);
    };
    st.querySelector('.prev').onclick = () => turn(-1);
    st.querySelector('.next').onclick = () => turn(1);
    let x0 = null;
    page.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    page.addEventListener('pointerup', (e) => {
      if (x0 == null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) turn(dx < 0 ? 1 : -1);
    });
    draw();
  }

  go(startAt);
}
