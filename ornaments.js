// 24 ornements de Noël, un par porte (traits fins, viewBox 40×40).
// Classes : .f = plein rouge, .rf = plein rouge + trait, .r = trait rouge.
const O = {
  1: '<path d="M20 2v4"/><rect x="16.5" y="6" width="7" height="4"/><circle cx="20" cy="23" r="12"/><path class="r" d="M8.5 20c4 3 7-3 11.5 0s7.5 3 11.5 0M9 27c4 2 7-2 11 0s7 2 11 0"/>',
  2: '<path class="rf" d="M20 4l4.1 10.3 11.1.8-8.5 7.1 2.7 10.8L20 27.1 10.6 33l2.7-10.8-8.5-7.1 11.1-.8z"/>',
  3: '<path d="M20 4v4"/><path d="M12 28c0-3 2-4 2-10a6 6 0 0 1 12 0c0 6 2 7 2 10z"/><path d="M9 28h22"/><circle class="rf" cx="20" cy="31.5" r="2.5"/>',
  4: '<path d="M19 18L15 18 14 21 11 21 10 25 7 25 6 30 10 28 12 29 13 26 16 25 16 22 19 21z"/><path d="M21 18L25 18 26 21 29 21 30 25 33 25 34 30 30 28 28 29 27 26 24 25 24 22 21 21z"/><path d="M18.5 19.5L8 28.5M21.5 19.5L32 28.5" stroke-width="1"/><circle class="f" cx="16.5" cy="14.5" r="3"/><circle class="f" cx="23.5" cy="14.5" r="3"/><circle class="f" cx="20" cy="10" r="3"/>',
  5: '<path d="M25 36V13a5.5 5.5 0 0 0-11 0v3" stroke-width="5" stroke-linecap="butt"/><path class="r" d="M25 36V13a5.5 5.5 0 0 0-11 0v3" stroke-width="5" stroke-linecap="butt" stroke-dasharray="2.6 2.6"/>',
  6: '<path d="M20 3v34M5.3 11.5l29.4 17M5.3 28.5l29.4-17"/><path class="r" d="M16 6l4 4 4-4M16 34l4-4 4 4M6.5 16.5l5.5-1.5-1.5-5.5M33.5 23.5l-5.5 1.5 1.5 5.5M6.5 23.5l5.5 1.5-1.5 5.5M33.5 16.5l-5.5-1.5 1.5-5.5"/>',
  7: '<path d="M20 5l-7 9h4l-8 10h5l-8 9h28l-8-9h5l-8-10h4z"/><path d="M18 33v4h4v-4"/><circle class="f" cx="17" cy="20" r="1.4"/><circle class="f" cx="24" cy="26" r="1.4"/><circle class="f" cx="15" cy="29" r="1.4"/><path class="rf" d="M20 1.5l.9 2 2.2.3-1.6 1.5.4 2.2-1.9-1-1.9 1 .4-2.2-1.6-1.5 2.2-.3z"/>',
  8: '<rect x="7" y="16" width="26" height="19"/><rect x="5" y="11" width="30" height="5"/><path class="r" d="M20 11v24" stroke-width="3"/><path class="r" d="M20 11c-3-6-10-6-8-1 1 2 5 1 8 1zM20 11c3-6 10-6 8-1-1 2-5 1-8 1z"/>',
  9: '<rect class="rf" x="14" y="4" width="12" height="6"/><path d="M15 10v13l-6 6c-3 3 0 8 4 6l9-7c3-2 4-4 4-7V10"/><path class="r" d="M15 16h11M15 21h11"/>',
  10: '<rect x="15" y="16" width="10" height="19"/><path d="M20 16v-3M11 35h18"/><path class="rf" d="M20 3.5c-3 4-3 7 0 8.5 3-1.5 3-4.5 0-8.5z"/><path class="r" d="M18 20v7"/>',
  11: '<circle cx="20" cy="19" r="12"/><circle cx="20" cy="19" r="7"/><path d="M11 12l3 2M29 12l-3 2M9 21l3-1M31 21l-3-1M20 7v3"/><circle class="f" cx="14" cy="10.5" r="1.4"/><circle class="f" cx="27" cy="25" r="1.4"/><circle class="f" cx="9.5" cy="16" r="1.4"/><path class="rf" d="M20 31c-4-3-8-2-7 1s5 0 7-1c2 1 6 4 7 1s-3-4-7-1z"/><path class="r" d="M20 31l-4 6M20 31l4 6"/>',
  12: '<path d="M20 3v13"/><path d="M20 16c-6 0-10 4-11 10 5 0 9-3 11-10zM20 16c6 0 10 4 11 10-5 0-9-3-11-10z"/><path class="rf" d="M15 6c2 0 5 1 5 3-2 0-5-1-5-3zM25 6c-2 0-5 1-5 3 2 0 5-1 5-3z"/><circle class="f" cx="17" cy="21" r="2"/><circle class="f" cx="23" cy="21" r="2"/><circle class="f" cx="20" cy="24" r="2"/>',
  13: '<path d="M20 5c-7 6-9 14-6 22 2 5 10 5 12 0 3-8 1-16-6-22z"/><path class="r" d="M15 13l5 4 5-4M13.5 19.5l6.5 5 6.5-5M14.5 26l5.5 4 5.5-4"/><path d="M20 5V1.5"/>',
  14: '<path d="M20 2v4"/><rect x="17" y="6" width="6" height="3"/><path d="M20 9c-6 6-11 10-11 16s5 11 11 11 11-5 11-11S26 15 20 9z"/><path class="r" d="M20 9v27M10 25h20"/><path d="M14.5 15.5c-2 6-2 13 1 19.5M25.5 15.5c2 6 2 13-1 19.5"/>',
  15: '<circle cx="20" cy="9.5" r="5"/><path d="M15 15h10l8 5-2 3-6-3v6l5 9-3 2-7-7-7 7-3-2 5-9v-6l-6 3-2-3z"/><circle class="f" cx="20" cy="19" r="1.3"/><circle class="f" cx="20" cy="23.5" r="1.3"/><path class="r" d="M18 11.5c1 1 3 1 4 0"/>',
  16: '<path d="M13 29V14c0-6 12-6 12 0v4l3-3c2-2 5 1 3 3l-6 7v4"/><rect class="rf" x="11.5" y="29" width="15" height="6"/><path class="r" d="M15 17l2 2 2-2 2 2 2-2"/>',
  17: '<path d="M23 5a15 15 0 1 0 12 22A11.5 11.5 0 1 1 23 5z"/><path class="rf" d="M28 11l1.1 2.6 2.8.3-2.1 1.8.6 2.7-2.4-1.4-2.4 1.4.6-2.7-2.1-1.8 2.8-.3z"/><circle class="f" cx="33" cy="20" r="1"/>',
  18: '<path class="rf" d="M20 17c-5-8-15-7-13-1 1 4 9 3 13 1zM20 17c5-8 15-7 13-1-1 4-9 3-13 1z"/><rect x="17.5" y="15" width="5" height="5"/><path d="M18 20l-6 15 4-2 2 3 2-16M22 20l6 15-4-2-2 3-2-16"/>',
  19: '<path d="M15 3h10M20 3v4"/><path d="M14 7h12l2 4H12z"/><rect x="13" y="11" width="14" height="19"/><path d="M12 30h16v5H12z"/><path class="rf" d="M20 15c-2.5 3.5-2.5 7 0 8.5 2.5-1.5 2.5-5 0-8.5z"/>',
  20: '<path d="M9 15h18v16a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4z"/><path d="M27 19h3a4 4 0 0 1 0 8h-3"/><path class="r" d="M14 4c-2 2 2 4 0 7M19 4c-2 2 2 4 0 7M24 4c-2 2 2 4 0 7"/><path class="r" d="M9 21h18"/>',
  21: '<path class="rf" d="M26 5l2.5 5.2 5.7.8-4.1 4 1 5.6L26 18l-5.1 2.6 1-5.6-4.1-4 5.7-.8z"/><path d="M18 20L5 33M16 14L6 24M22 23L12 35"/>',
  22: '<circle cx="20" cy="17" r="12"/><path d="M11 29h18l2 6H9z"/><path d="M14.5 24l5.5-9 5.5 9z"/><path d="M20 24v2"/><circle class="f" cx="14" cy="11" r="1"/><circle class="f" cx="25" cy="9" r="1"/><circle class="f" cx="27" cy="16" r="1"/><circle class="f" cx="12" cy="18" r="1"/>',
  23: '<path d="M20 2v4"/><rect x="16.5" y="6" width="7" height="4"/><circle cx="20" cy="23" r="12"/><path class="r" d="M8.5 19.5h23M8.5 26.5h23" stroke-width="3"/><path d="M14 23h.01M20 23h.01M26 23h.01" stroke-width="2.6"/>',
  25: '<circle cx="20" cy="20" r="16"/><circle cx="20" cy="20" r="10.5"/><path class="r" d="M20 4v5M20 31v5M4 20h5M31 20h5M8.7 8.7l3.5 3.5M27.8 27.8l3.5 3.5M31.3 8.7l-3.5 3.5M12.2 27.8l-3.5 3.5" stroke-width="3" stroke-linecap="butt"/><path class="rf" d="M20 13.5l1.9 4.3 4.6.4-3.5 3 1.1 4.6-4.1-2.5-4.1 2.5 1.1-4.6-3.5-3 4.6-.4z"/>',
  24: '<path d="M20 2v36M2 20h36M7.3 7.3l25.4 25.4M32.7 7.3L7.3 32.7" stroke-width=".9"/><path class="rf" d="M20 8l3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/><circle cx="20" cy="20" r="2"/>',
};

export const ornament = (n, cls = '') =>
  `<svg class="orn ${cls}" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${O[n] || O[1]}</svg>`;

// Branche de laurier (aplat), pour encadrer le jeton du solde.
export function laurel(side = 'l') {
  const cx = 62, cy = 60, R = 46, rad = Math.PI / 180;
  let leaves = '', pts = [];
  for (let i = 0; i < 9; i++) {
    const th = (252 - i * 13) * rad;
    const x = cx + R * Math.cos(th), y = cy - R * Math.sin(th);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    const phi = Math.atan2(Math.cos(th), Math.sin(th)); // sens de la tige (vers le haut)
    for (const k of [-38, 38]) {
      const a = phi + k * rad;
      const lx = x + 6 * Math.cos(a), ly = y + 6 * Math.sin(a);
      leaves += `<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="2.8" ry="7" transform="rotate(${(a / rad - 90).toFixed(0)} ${lx.toFixed(1)} ${ly.toFixed(1)})"/>`;
    }
  }
  return `<svg class="laurel ${side}" viewBox="0 0 60 120" aria-hidden="true"><polyline points="${pts.join(' ')}" fill="none" stroke="currentColor" stroke-width="1.8"/><g fill="currentColor">${leaves}</g></svg>`;
}
