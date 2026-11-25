// Symboles de cartes qui volent partout.
const SUITS = ['♠', '♥', '♦', '♣'];
const COLORS = ['#a3062a', '#ffffff', '#b80a33', '#6b0019'];
const r = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let back, front;

function suit(layer, size, color) {
  const s = document.createElement('span');
  s.className = 'suit';
  s.textContent = pick(SUITS);
  s.style.fontSize = `${size}px`;
  s.style.color = color ?? pick(COLORS);
  layer.append(s);
  return s;
}

// Un symbole entre par un bord et traverse l'écran en tournant.
function drift() {
  if (document.hidden || back.childElementCount > 16) return;
  const W = innerWidth, H = innerHeight, m = 80;
  const side = Math.floor(Math.random() * 4);
  const pts = [
    [[r(0, W), -m], [r(0, W), H + m]],
    [[r(0, W), H + m], [r(0, W), -m]],
    [[-m, r(0, H)], [W + m, r(0, H)]],
    [[W + m, r(0, H)], [-m, r(0, H)]],
  ][side];
  const s = suit(back, r(22, 76));
  const spin = r(-540, 540);
  const wob = r(-80, 80);
  const a = s.animate([
    { transform: `translate(${pts[0][0]}px, ${pts[0][1]}px) rotate(0deg) scale(1)` },
    { transform: `translate(${(pts[0][0] + pts[1][0]) / 2 + wob}px, ${(pts[0][1] + pts[1][1]) / 2 - wob}px) rotate(${spin / 2}deg) scale(1.25)` },
    { transform: `translate(${pts[1][0]}px, ${pts[1][1]}px) rotate(${spin}deg) scale(1)` },
  ], { duration: r(5000, 11000), easing: 'ease-in-out' });
  a.onfinish = () => s.remove();
}

// Explosion de symboles depuis un point.
export function burst(x, y, n = 8, big = false) {
  if (!front || calm()) return;
  for (let i = 0; i < n; i++) {
    const s = suit(front, big ? r(26, 52) : r(16, 30));
    const ang = r(0, Math.PI * 2);
    const dist = big ? r(120, 260) : r(50, 130);
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
    const a = s.animate([
      { transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(.2) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${x + dx}px, ${y + dy}px) translate(-50%, -50%) scale(1.1) rotate(${r(-360, 360)}deg)`, opacity: 1, offset: .6 },
      { transform: `translate(${x + dx * 1.15}px, ${y + dy + 140}px) translate(-50%, -50%) scale(.8) rotate(${r(-540, 540)}deg)`, opacity: 0 },
    ], { duration: r(800, 1300), easing: 'cubic-bezier(.2,.8,.3,1)' });
    a.onfinish = () => s.remove();
  }
}

// Neige qui tombe doucement.
function snow() {
  if (document.hidden || back.childElementCount > 40) return;
  const f = document.createElement('i');
  f.className = 'flake';
  const size = r(2, 5);
  f.style.width = f.style.height = `${size}px`;
  back.append(f);
  const x = r(0, innerWidth);
  const a = f.animate([
    { transform: `translate(${x}px, -10px)` },
    { transform: `translate(${x + r(-60, 60)}px, ${innerHeight + 10}px)` },
  ], { duration: r(9000, 16000), easing: 'linear' });
  a.onfinish = () => f.remove();
}

export function startFx() {
  back = document.createElement('div'); back.className = 'suits-back';
  front = document.createElement('div'); front.className = 'suits-front';
  document.body.prepend(back);
  document.body.append(front);
  if (calm()) return;
  for (let i = 0; i < 9; i++) setTimeout(drift, i * 300);
  setInterval(drift, 1100);
  for (let i = 0; i < 6; i++) setTimeout(snow, i * 200);
  setInterval(snow, 420);
  document.addEventListener('pointerdown', (e) => burst(e.clientX, e.clientY, 5), { passive: true });
}
