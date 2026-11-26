import { CONFIG, CASE_SIZES, DAYS } from './config.js';
import { GAMES } from './games.js';
import { say } from './vibes.js';
import { startFx, burst } from './fx.js';
import { ornament, laurel } from './ornaments.js';
import { sound, unlockAudio, setSound, music } from './audio.js';

/* ───────────── Sauvegarde ───────────── */
const KEY_REAL = 'cra_save_v1';
const KEY_TEST = 'cra_test_v1';
const KEY_MODE = 'cra_mode';

let testMode = safeGet(sessionStorage, KEY_MODE) === 'croupiere';
let S = load();

function safeGet(store, k) { try { return store.getItem(k); } catch { return null; } }
function safeSet(store, k, v) { try { store.setItem(k, v); return true; } catch { return false; } }
function key() { return testMode ? KEY_TEST : KEY_REAL; }
function fresh() { return { v: 1, balance: 0, ledger: [], vip: null, days: {}, advances: [], final: null }; }
function load() {
  try { const s = JSON.parse(safeGet(localStorage, key())); if (s && s.v === 1) return s; } catch {}
  return fresh();
}
function save() { if (!safeSet(localStorage, key(), JSON.stringify(S))) toast('Sauvegarde impossible sur cet appareil'); }

try { navigator.storage?.persist?.(); } catch {}

/* ───────────── Hasard (crypto) ───────────── */
export function rand() { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; }
export function randInt(n) { return Math.floor(rand() * n); }

/* ───────────── Jetons ───────────── */
function addLedger(amount, label, day) {
  S.balance += amount;
  S.ledger.push({ t: Date.now(), day: day ?? null, label, amount, bal: S.balance });
  save();
}
export function credit(amount, label, day) { if (amount) addLedger(Math.abs(amount), label, day); }
export function debit(amount, label, day) { if (amount) addLedger(-Math.abs(amount), label, day); }

export const eur = (tokens) => Math.min(tokens / CONFIG.tokensPerEuro, CONFIG.euroCap);
export const fmtEur = (v) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
export const fmtTok = (n) => `${n.toLocaleString('fr-FR')} jeton${Math.abs(n) > 1 ? 's' : ''}`;

/* ───────────── Dates ───────────── */
const dec = (d, h = 0) => new Date(CONFIG.year, 11, d, h);
function isUnlocked(n) { return testMode || Date.now() >= dec(n).getTime(); }
function todayNumber() {
  const now = new Date();
  if (now.getFullYear() === CONFIG.year && now.getMonth() === 11 && now.getDate() <= 25) return now.getDate();
  return null;
}
function weekKey() {
  const days = Math.floor((Date.now() - dec(1).getTime()) / 86400000);
  return days < 0 ? null : `s${Math.floor(days / 7)}`;
}

/* ───────────── Petits outils UI ───────────── */
const $ = (sel, root = document) => root.querySelector(sel);
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Vibrations : Android via navigator.vibrate. iPhone (iOS 18+) n'a pas cette API :
// on déclenche le retour haptique natif d'un interrupteur caché.
let iosSwitch = null;
function iosTap() {
  if (!iosSwitch) {
    iosSwitch = document.createElement('label');
    iosSwitch.setAttribute('aria-hidden', 'true');
    iosSwitch.style.cssText = 'position:fixed;left:-200px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden';
    const i = document.createElement('input');
    i.type = 'checkbox';
    i.setAttribute('switch', '');
    i.tabIndex = -1;
    iosSwitch.append(i);
    document.body.append(iosSwitch);
  }
  iosSwitch.click();
}
export function haptic(p = 15) {
  try {
    if (typeof navigator.vibrate === 'function') { navigator.vibrate(p); return; }
    let t = 0;
    (Array.isArray(p) ? p : [p]).forEach((d, i) => { if (i % 2 === 0) setTimeout(iosTap, t); t += d; });
  } catch {}
}

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
}

export function modal({ title, body, actions }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        ${title ? `<h3>${title}</h3>` : ''}
        <div class="modal-body">${body || ''}</div>
        <div class="modal-actions"></div>
      </div>`;
    const bar = $('.modal-actions', wrap);
    actions.forEach((a) => {
      const b = document.createElement('button');
      b.className = `btn ${a.kind || ''}`;
      b.textContent = a.label;
      b.onclick = () => { const v = a.value ?? a.label; wrap.remove(); resolve(typeof a.get === 'function' ? a.get(wrap) : v); };
      bar.append(b);
    });
    document.body.append(wrap);
    $('input', wrap)?.focus();
  });
}

let shownBalance = null;
export function refreshBalance(animate = true) {
  const el = $('#hdr-bal');
  if (!el) return;
  const from = shownBalance ?? S.balance;
  const to = S.balance;
  shownBalance = to;
  if (!animate || from === to) { el.textContent = to.toLocaleString('fr-FR'); return; }
  const t0 = performance.now(), dur = 700;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))).toLocaleString('fr-FR');
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  const pill = el.closest('.bal-pill');
  pill?.classList.remove('flash-up', 'flash-down');
  void pill?.offsetWidth;
  pill?.classList.add(to > from ? 'flash-up' : 'flash-down');
}

/* ───────────── En-tête + mode croupière ───────────── */
let taps = [];
function renderHeader() {
  const hdr = $('#hdr');
  hdr.innerHTML = `
    ${testMode ? `<div class="test-banner"><span>Mode croupière · test</span>
        <button id="t-menu">Outils</button></div>` : ''}
    <div class="hdr-row">
      <button class="logo" id="logo" aria-label="Accueil">
        <span class="logo-suit">${ornament(24)}</span>
        <span class="logo-txt">Casino Royal<small>de l'Avent</small></span>
      </button>
      <div class="hdr-right">
      <button class="snd ${sound.on ? '' : 'off'}" id="snd" aria-label="Musique">♪</button>
      <a class="bal-pill" href="#/releve" aria-label="Solde et relevé">
        <span class="chip-ico" aria-hidden="true"></span>
        <span id="hdr-bal">${S.balance.toLocaleString('fr-FR')}</span>
      </a>
      </div>
    </div>`;
  shownBalance = S.balance;
  $('#logo').onclick = onLogoTap;
  $('#snd').onclick = () => { setSound(!sound.on); $('#snd').classList.toggle('off', !sound.on); if (sound.on) music.play(document.body.classList.contains('in-room') ? 'room' : 'lounge'); };
  $('#t-menu')?.addEventListener('click', adminMenu);
}

async function onLogoTap() {
  const now = Date.now();
  taps = taps.filter((t) => now - t < 2500);
  taps.push(now);
  if (taps.length >= 5) {
    taps = [];
    if (testMode) return adminMenu();
    const code = await modal({
      title: 'Accès croupière',
      body: '<input class="input" type="password" inputmode="numeric" autocomplete="off" placeholder="Code" />',
      actions: [
        { label: 'Annuler', value: null },
        { label: 'Entrer', kind: 'gold', get: (w) => $('input', w).value },
      ],
    });
    if (!code) return;
    if ((await sha256(code)) === CONFIG.adminHash) {
      testMode = true;
      safeSet(sessionStorage, KEY_MODE, 'croupiere');
      S = load();
      toast('Mode croupière : tous les jours sont ouverts');
      render();
    } else toast(say('wrongCode'));
    return;
  }
  if (location.hash && location.hash !== '#/') location.hash = '#/';
}

async function sha256(txt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function adminMenu() {
  const v = await modal({
    title: 'Outils de la croupière',
    body: '<p>Ces outils ne touchent que la sauvegarde de test. Celle de Tristan reste intacte.</p>',
    actions: [
      { label: '+100 jetons', value: 'add' },
      { label: 'Effacer la sauvegarde de test', value: 'reset', kind: 'danger' },
      { label: 'Quitter le mode croupière', value: 'quit', kind: 'gold' },
      { label: 'Fermer', value: null },
    ],
  });
  if (v === 'add') { credit(100, 'Test : jetons ajoutés'); render(); }
  if (v === 'reset') { S = fresh(); save(); toast('Sauvegarde de test effacée'); location.hash = '#/'; render(); }
  if (v === 'quit') {
    testMode = false;
    try { sessionStorage.removeItem(KEY_MODE); } catch {}
    S = load();
    location.hash = '#/';
    render();
  }
}

/* ───────────── Avancement des jours ───────────── */
function dayState(n) { return (S.days[n] ||= { steps: {} }); }

function stepsFor(n) {
  const d = DAYS[n];
  if (d.custom) return GAMES[d.custom].steps();
  const out = [];
  if (d.kind === 'gift') out.push(openStep(n));
  if (d.salary) out.push(gameStep('salary', d.salary, 'Le salaire', 'Sans risque : tu gagnes selon ta réussite.'));
  if (d.jackpot) out.push(jackpotStep());
  if (d.table) out.push(gameStep('table', d.table, 'La table', 'Facultatif : tu mises, le hasard décide.', true));
  if (d.kind === 'case') out.push(caisseStep(n));
  if (d.kind === 'final') out.push(cashoutStep());
  return out;
}

function dayDone(n) {
  const st = S.days[n]?.steps || {};
  return stepsFor(n).every((s) => st[s.id]?.done);
}

/* Étapes génériques */
function openStep(n) {
  return {
    id: 'open',
    title: 'Le cadeau',
    summary: () => `Case ${n} ouverte`,
    render(el, api) {
      el.innerHTML = `
        <div class="open-box">
          <div class="big-num">${ornament(n)}<span>${n}</span></div>
          <p>Ouvre la case <b>${n}</b> de ton calendrier.</p>
        </div>
        <button class="btn gold block">C'est ouvert</button>`;
      $('button', el).onclick = () => api.complete();
    },
  };
}

function jackpotStep() {
  return {
    id: 'jackpot',
    title: 'Jour jackpot',
    summary: () => `+${CONFIG.jackpotBonus} jetons`,
    render(el, api) {
      el.innerHTML = `
        <p class="lead">C'est un jour jackpot : la maison t'offre <b>${CONFIG.jackpotBonus} jetons</b>.</p>
        <button class="btn gold block">Encaisser</button>`;
      $('button', el).onclick = () => {
        credit(CONFIG.jackpotBonus, `Jour ${api.n} : bonus jackpot`, api.n);
        rain(el);
        api.complete();
      };
    },
  };
}

function gameStep(id, gameId, title, sub, optional = false) {
  const g = GAMES[gameId];
  if (!g) {
    return {
      id, title, optional,
      summary: () => 'Passé',
      render(el, api) {
        el.innerHTML = `
          <p class="muted">${sub}</p>
          <div class="soon">La croupière installe encore cette table.<br>Reviens un peu plus tard.</div>
          ${testMode ? '<button class="btn ghost block">Passer (test)</button>' : ''}`;
        $('button', el)?.addEventListener('click', () => api.complete({ skipped: true }));
      },
    };
  }
  return {
    id, optional,
    title: `${title} · ${g.title}`,
    summary: (data) => g.summary?.(data) ?? (data.skipped ? 'Passé' : 'Terminé'),
    render(el, api) {
      el.innerHTML = `<p class="muted">${sub}</p><div class="game"></div>${optional ? '<button class="btn ghost block skip">Je passe mon tour</button>' : ''}`;
      g.render($('.game', el), api);
      const skip = $('.skip', el);
      if (skip) {
        skip.onclick = () => {
          if (api.data.started) return toast('La partie est lancée, termine-la');
          api.complete({ skipped: true });
        };
      }
    },
  };
}

function caisseStep(n) {
  const c = CASE_SIZES[DAYS[n].size];
  return {
    id: 'caisse',
    title: `La caisse · ${c.label}`,
    summary: (data) => data.paid ? `Payée ${c.price} jetons` : 'Laissée à la croupière',
    render(el, api) {
      if (S.final) {
        el.innerHTML = `<p>Le casino a fermé ses comptes : cette case revient à la croupière.</p>`;
        return api.complete({ paid: false, late: true }, false);
      }
      const can = S.balance >= c.price;
      el.innerHTML = `
        <div class="case-card size-${DAYS[n].size}">
          <div class="case-lid">${n}</div>
          <div><b>${c.label}</b><br><span class="price">${fmtTok(c.price)}</span> · ${fmtEur(c.price / CONFIG.tokensPerEuro)} de casino</div>
        </div>
        <p class="muted">Ce qu'il y a dedans ? Mystère. Si tu paies, tu l'ouvres. Sinon, la croupière la garde.</p>
        ${can ? '' : `<p class="warn">Il te manque ${fmtTok(c.price - S.balance)}. Tu peux revenir plus tard, ou la laisser.</p>`}
        <button class="btn gold block pay" ${can ? '' : 'disabled'}>Payer ${c.price} et ouvrir</button>
        <button class="btn ghost block leave">Laisser la case à la croupière</button>`;
      $('.pay', el).onclick = () => {
        debit(c.price, `Jour ${n} : ${c.label.toLowerCase()} achetée`, n);
        haptic([20, 40, 20]);
        api.complete({ paid: true });
        toast(say('paid', n));
      };
      $('.leave', el).onclick = async () => {
        const ok = await modal({
          title: say('leaveTitle'),
          body: `<p>La case ${n} sera perdue pour de bon. Tu gardes tes ${c.price} jetons pour le casino.</p>`,
          actions: [{ label: 'Annuler', value: false }, { label: say('leaveOk'), value: true, kind: 'gold' }],
        });
        if (ok) { S.ledger.push({ t: Date.now(), day: n, label: `Jour ${n} : case laissée à la croupière`, amount: 0, bal: S.balance }); api.complete({ paid: false }); }
      };
    },
  };
}

function cashoutStep() {
  return {
    id: 'cashout',
    title: 'L\'encaissement',
    summary: () => S.final ? `Bon de ${fmtEur(S.final.euros)}` : '',
    render(el, api) {
      if (S.final) return renderVoucher(el);
      const pending = Object.keys(DAYS).map(Number)
        .filter((d) => DAYS[d].kind === 'case' && !S.days[d]?.steps?.caisse?.done);
      el.innerHTML = `
        <p class="lead">Le casino ferme ses comptes. Tes jetons deviennent ton budget pour la soirée au casino.</p>
        <div class="convert">
          <div><span>${fmtTok(S.balance)}</span><small>solde</small></div>
          <div class="arrow">→</div>
          <div><span>${fmtEur(eur(S.balance))}</span><small>pour le casino</small></div>
        </div>
        <p class="muted">${CONFIG.tokensPerEuro} jetons = 1 €, plafond ${CONFIG.euroCap} €.</p>
        ${pending.length ? `<p class="warn">Cases non réglées : ${pending.join(', ')}. Après l'encaissement, elles reviennent à la croupière.</p>` : ''}
        <button class="btn gold block">Encaisser mes jetons</button>`;
      $('button', el).onclick = async () => {
        const ok = await modal({
          title: 'Encaisser ?',
          body: '<p>C\'est définitif : plus aucune mise ni aucun achat après ça.</p>',
          actions: [{ label: 'Pas encore', value: false }, { label: 'Encaisser', value: true, kind: 'gold' }],
        });
        if (!ok) return;
        S.final = { balance: S.balance, euros: eur(S.balance), at: Date.now() };
        S.ledger.push({ t: Date.now(), day: 25, label: `Encaissement : bon de ${fmtEur(S.final.euros)}`, amount: 0, bal: S.balance });
        haptic([30, 60, 30, 60, 80]);
        api.complete();
      };
    },
  };
}

function renderVoucher(el) {
  const f = S.final;
  const paid = S.ledger.filter((l) => l.amount < 0).reduce((a, l) => a - l.amount, 0);
  const won = S.ledger.filter((l) => l.amount > 0).reduce((a, l) => a + l.amount, 0);
  const opened = Object.values(S.days).filter((d) => d.steps?.caisse?.paid).length;
  el.innerHTML = `
    <div class="voucher">
      <div class="v-top">♠ Casino Royal ♠</div>
      <div class="v-title">Bon pour une soirée au casino</div>
      <div class="v-amount">${fmtEur(f.euros)}</div>
      <div class="v-name">au nom de ${esc(CONFIG.playerName)}</div>
      <div class="v-foot">Membre ${CONFIG.memberNo} · émis le ${new Date(f.at).toLocaleDateString('fr-FR')}</div>
    </div>
    <div class="stats">
      <div><b>${won.toLocaleString('fr-FR')}</b><small>jetons gagnés</small></div>
      <div><b>${paid.toLocaleString('fr-FR')}</b><small>jetons dépensés</small></div>
      <div><b>${opened}</b><small>cases achetées</small></div>
    </div>
    <p class="final-msg">Joyeux Noël. Le casino t'attend.</p>`;
}

/* ───────────── Vues ───────────── */
function render() {
  renderHeader();
  const main = $('#main');
  const hash = location.hash || '#/';
  const m = hash.match(/^#\/jour\/(\d+)$/);
  main.scrollTop = 0;
  window.scrollTo(0, 0);
  if (m && DAYS[+m[1]]) return renderDay(+m[1], main);
  if (hash === '#/releve') return renderLedger(main);
  if (hash === '#/carte') return renderCard(main);
  renderHome(main);
}

function renderHome(main) {
  const today = todayNumber();
  const open = isUnlocked(1);
  const wk = weekKey();
  const canAdvance = !S.final && S.vip && S.balance < CONFIG.advance.threshold && (testMode || (wk && !S.advances.includes(wk)));
  const before = !open ? Math.ceil((dec(1) - Date.now()) / 86400000) : 0;
  const euros = eur(S.balance);

  main.innerHTML = `
    <section class="hero">
      ${S.final ? `
        <div class="token-wrap">${laurel('l')}<div class="token"><div class="hero-bal small">${fmtEur(S.final.euros)}</div><small>bon casino</small></div>${laurel('r')}</div>
        <div class="hero-label"><span>Les comptes sont fermés</span></div>` : `
        <div class="token-wrap">${laurel('l')}<div class="token"><div class="hero-bal">${S.balance.toLocaleString('fr-FR')}</div><small>jetons</small></div>${laurel('r')}</div>
        <div class="hero-label"><span>${say('heroLabel')}</span></div>
        <div class="hero-sub">${fmtEur(euros)} pour le casino${S.balance >= CONFIG.euroCap * CONFIG.tokensPerEuro ? ' · plafond atteint' : ''}</div>`}
    </section>
    ${!open ? `<div class="notice">${say('beforeOpen', before)}</div>` : ''}
    ${canAdvance ? `<button class="notice advance" id="adv">${say('advance', CONFIG.advance.amount)}</button>` : ''}
    <section class="doors">
      ${Object.keys(DAYS).map(Number).map((n) => doorHTML(n, today)).join('')}
    </section>
    <nav class="links">
      <a href="#/releve" class="btn ghost">Relevé de compte</a>
      <a href="#/carte" class="btn ghost">Carte VIP & règles</a>
    </nav>`;

  main.querySelectorAll('.door').forEach((d) => {
    d.onclick = () => {
      const n = +d.dataset.n;
      if (!isUnlocked(n)) { haptic(8); d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); return toast(say('locked', n)); }
      if (n > 1 && !dayDone(1)) return toast(say('startFirst'));
      location.hash = `#/jour/${n}`;
    };
  });
  $('#adv')?.addEventListener('click', () => {
    if (!testMode) S.advances.push(wk);
    credit(CONFIG.advance.amount, 'Avance de la croupière');
    haptic([20, 30, 20]);
    render();
  });
}

function doorHTML(n, today) {
  const d = DAYS[n];
  const unlocked = isUnlocked(n);
  const done = unlocked && dayDone(n);
  const started = unlocked && !done && S.days[n] && Object.keys(S.days[n].steps).length;
  const cls = ['door', unlocked ? 'unlocked' : 'locked', done ? 'done' : '', n === today && !done ? 'today' : '', d.jackpot || n === 21 ? 'jackpot' : '', d.kind === 'final' ? 'final' : ''].join(' ');
  let badge = '';
  if (done && d.kind === 'case') badge = S.days[n].steps.caisse?.paid ? '<i class="tag">ouverte</i>' : '<i class="tag off">laissée</i>';
  else if (done) badge = '<i class="tag">✓</i>';
  else if (started) badge = '<i class="tag live">en cours</i>';
  return `<button class="${cls}" data-n="${n}" aria-label="Jour ${n}">
      <span class="d-num">${d.kind === 'final' ? `${n} décembre · Encaissement` : n}</span>
      ${unlocked ? ornament(n) : `<span class="d-back" aria-hidden="true">${'♠♥♦♣'[n % 4]}</span>`}
      ${n === today && !done ? '<span class="sticker">Aujourd\'hui</span>' : ''}
      ${badge}
    </button>`;
}

function renderDay(n, main) {
  if (!isUnlocked(n) || (n > 1 && !dayDone(1))) { location.hash = '#/'; return; }
  const d = DAYS[n];
  const steps = stepsFor(n);
  const st = dayState(n).steps;
  const current = steps.findIndex((s) => !st[s.id]?.done);
  const label = d.kind === 'case' ? `${CASE_SIZES[d.size].label} · ${CASE_SIZES[d.size].price} jetons` : d.kind === 'final' ? 'Encaissement' : d.jackpot ? 'Jour jackpot' : 'Cadeau offert';

  main.innerHTML = `
    <div class="day-head">
      <a href="#/" class="back" aria-label="Retour">‹</a>
      <div><div class="day-title">${n} décembre</div><div class="day-sub">${label}</div></div>
    </div>
    ${d.kind === 'case' && !st.caisse?.done ? `<div class="notice">La case <b>${n}</b> est payante : ne l'ouvre pas avant d'être passé à la caisse.</div>` : ''}
    <ol class="steps"></ol>
    ${current === -1 && d.kind !== 'final' ? `<div class="day-end">${esc(say('dayEnd', CONFIG.playerName))}</div><a href="#/" class="btn gold block">Retour au calendrier</a>` : ''}`;

  const ol = $('.steps', main);
  steps.forEach((s, i) => {
    const data = st[s.id] || {};
    const li = document.createElement('li');
    li.className = `step ${data.done ? 'is-done' : i === current ? 'is-current' : 'is-next'}`;
    li.innerHTML = `
      <div class="step-head"><span class="step-dot">${data.done ? '✓' : i + 1}</span>
        <span class="step-title">${s.title}</span>
        ${data.done ? `<span class="step-sum">${s.summary?.(data) ?? ''}</span>` : s.optional && i === current ? '<span class="step-sum">facultatif</span>' : ''}
      </div>
      <div class="step-body"></div>`;
    ol.append(li);
    const body = $('.step-body', li);
    if (i === current || (d.kind === 'final' && data.done) || (s.keepOpen && data.done)) {
      const api = makeApi(n, s, () => render());
      s.render(body, api);
    }
  });
  const cur = ol.children[current];
  if (cur && current > 0) setTimeout(() => cur.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
}

function makeApi(n, step, rerender) {
  const st = dayState(n).steps;
  const data = (st[step.id] ||= {});
  return {
    n,
    data,
    save: () => save(),
    rand, randInt, credit, debit, haptic, toast, modal, esc, fmtTok,
    balance: () => S.balance,
    maxBet: () => Math.floor(S.balance * CONFIG.tableMaxShare),
    state: () => S,
    refresh: () => refreshBalance(),
    rain: (el, k) => rain(el, k),
    complete(extra = {}, redraw = true) {
      Object.assign(data, extra, { done: true });
      save();
      refreshBalance();
      if (redraw) setTimeout(rerender, 350);
    },
  };
}

function renderLedger(main) {
  const rows = [...S.ledger].reverse();
  main.innerHTML = `
    <div class="day-head"><a href="#/" class="back" aria-label="Retour">‹</a>
      <div><div class="day-title">Relevé de compte</div><div class="day-sub">Chaque tirage, chaque mise, chaque paiement</div></div></div>
    ${rows.length ? `<ul class="ledger">${rows.map((r) => `
      <li><div><div class="l-label">${esc(r.label)}</div>
        <div class="l-date">${new Date(r.t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div></div>
        <div class="l-amt ${r.amount > 0 ? 'pos' : r.amount < 0 ? 'neg' : ''}">${r.amount > 0 ? '+' : ''}${r.amount ? r.amount.toLocaleString('fr-FR') : '·'}</div>
        <div class="l-bal">${r.bal.toLocaleString('fr-FR')}</div></li>`).join('')}</ul>`
      : '<p class="muted center">Aucune opération pour l\'instant.</p>'}`;
}

function renderCard(main) {
  main.innerHTML = `
    <div class="day-head"><a href="#/" class="back" aria-label="Retour">‹</a>
      <div><div class="day-title">Carte VIP & règles</div></div></div>
    ${S.vip ? vipCardHTML(S.vip) : '<p class="muted center">Ta carte t\'attend dans la case 1.</p>'}
    <div class="rules-list">${RULES.map((r) => `<div class="rule"><h4>${r.title}</h4>${r.html}</div>`).join('')}</div>`;
}

export function vipCardHTML(vip) {
  return `
    <div class="vip-card">
      <div class="vip-top"><span>♠ Casino Royal</span><span class="vip-badge">VIP</span></div>
      <div class="vip-chip" aria-hidden="true"></div>
      <div class="vip-name">${esc(CONFIG.playerName)}</div>
      <div class="vip-meta"><span>N° ${CONFIG.memberNo}</span><span>Depuis le ${vip?.at ? new Date(vip.at).toLocaleDateString('fr-FR') : '1/12/' + CONFIG.year}</span></div>
      <div class="vip-sign">${vip?.sig ? `<img src="${vip.sig}" alt="Signature" />` : '<span>Signature</span>'}</div>
    </div>`;
}

export const RULES = [
  {
    title: 'Le salaire',
    html: `<p>Certains jours, un jeu parle du cadeau de ta case : un quiz, un memory, une photo à deviner…</p>
      <p>C'est sans risque. Tu gagnes des jetons selon ta réussite, pas selon la chance.</p>`,
  },
  {
    title: 'La table',
    html: `<p>Chaque jour, une table de casino. Elle est <b>facultative</b>.</p>
      <p>Tu mises ce que tu veux, jusqu'à la moitié de ton solde. Les vraies règles, les vraies probabilités, affichées sur chaque table.</p>
      <p>Le tirage est enregistré dès que tu valides ta mise : recharger la page ne change rien. Tout est noté dans ton relevé.</p>`,
  },
  {
    title: 'La caisse',
    html: `<p>Certaines cases se paient pour être ouvertes :</p>
      <ul><li>Petite case : <b>10</b> jetons</li><li>Case moyenne : <b>25</b> jetons</li><li>Grosse case : <b>50</b> jetons</li></ul>
      <p>Tu ne sais pas ce qu'il y a dedans. Si tu ne paies pas, la croupière garde la case.</p>`,
  },
  {
    title: 'Le 25 décembre',
    html: `<p>Tes jetons sont convertis : <b>10 jetons = 1 €</b>, jusqu'à <b>50 €</b>. Tu reçois un bon pour une soirée au casino avec cette somme.</p>
      <p>Chaque case achetée, c'est du budget casino en moins. À toi de choisir.</p>
      <p class="muted">Sous 10 jetons, la croupière te fait une avance de 20 jetons, une fois par semaine.</p>`,
  },
];

/* ───────────── Pluie de jetons ───────────── */
export function rain(anchor, count = 14) {
  const r = anchor.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, Math.min(24, count), true);
  for (let i = 0; i < count; i++) {
    const c = document.createElement('span');
    c.className = 'fly-chip';
    c.style.left = `${r.left + r.width / 2 + (rand() - 0.5) * r.width * 0.8}px`;
    c.style.top = `${r.top + r.height / 2}px`;
    c.style.setProperty('--dx', `${(rand() - 0.5) * 160}px`);
    c.style.setProperty('--dy', `${-120 - rand() * 160}px`);
    c.style.animationDelay = `${i * 30}ms`;
    document.body.append(c);
    setTimeout(() => c.remove(), 1400 + i * 30);
  }
}

/* ───────────── Démarrage ───────────── */
window.addEventListener('hashchange', render);
startFx();
render();

// La musique démarre au premier appui (les navigateurs l'exigent).
music.want = 'lounge';
document.addEventListener('pointerdown', () => {
  unlockAudio();
  if (sound.on && !music.cur && !music.token) music.play(document.body.classList.contains('in-room') ? 'room' : 'lounge');
}, true);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || !hadController) return;
    reloaded = true;
    location.reload();
  });
}
