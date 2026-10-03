/* Pavilion — the front door as a video game's: the 1893 World's Fair alive across
   the whole screen, PAVILION set in tiles over the sky, and "Play a game" opening
   the menu (the setup card) over a dimmed Fair. A sample (3 Oct 2026), shown only
   on ?fair until Ryan has seen it.

   Ryan's brief: "a world in motion surrounding the game opening screen…
   placing people inside the world's fair with some cool motion and animated
   drawn images to make it look alive", a day-to-night cycle, and the game's
   own story told in the picture; then (same day) treat it like a video game,
   where the front page is the scene and the title, and a button opens the card.
   So this is the Fair as an 1893 poster would have it: the White City along the
   horizon at the end of the Grand Basin, the gilded Statue of the Republic, the
   Ferris Wheel on the Midway, crowds in boaters, bowlers and leg-of-mutton
   sleeves, with Pavilion played out along the promenade. Craftspeople arrive
   at the agencies in fours, each holding up their discipline's tile; a nation
   hires every one of a discipline and they walk to its pavilion; the rest wait
   at the gate; and each crew puts its display up on the pavilion's front, which
   is the board's 5×5 wall, pattern and all. At dusk the White City lights up
   (bulbs along every cornice, the searchlights, the electric fountain, the
   Wheel) and the title's tiles glow with it; the night has fireworks; at
   closing the lights go out and a new month begins in the dark.

   Period dress, not Isotype, and not the teaching brand (Ryan, 3 Oct): this
   is a game anyone can play. The Midway's "villages" stay out (PAVILION.md,
   The register); the rest of the Midway is in.

   Decorative and outside the game: the engine, the wire and ui.js never see
   it. The title's words live in index.html with the rest of the copy; this
   file only shows them and runs the title → menu → lobby states. It draws while
   the front door or the lobby is showing and the tab is visible, stops for a
   game, and prefers-reduced-motion gets one still frame at dusk. ?fair&at=0.62
   opens the cycle at that point of the day (0 midnight, 0.25 morning, 0.585
   sunset), &still holds it there, &menu opens straight on the menu. */
(() => {
  'use strict';

  const QS = new URLSearchParams(location.search);
  if (!QS.has('fair')) return;

  const setup = document.getElementById('setup');
  const card = setup && setup.querySelector('.setup-card');
  if (!card) return;

  /* ------------------------------------------------------------------ time */

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STILL = REDUCED || QS.has('still');
  const CYCLE = 84;                                   // seconds, midnight to midnight
  const atQ = parseFloat(QS.get('at'));
  const START = Number.isFinite(atQ) ? ((atQ % 1) + 1) % 1 : (REDUCED ? 0.645 : 0.27);

  // The day, as fractions of the cycle.
  const SUNRISE = 0.045, SUNSET = 0.585;
  const LIGHTS_ON = 0.57, CLOSE = 0.955, RESET = 0.975;
  const ROUNDS_TO = 0.45, HIRES_FROM = 0.08, HIRES_TO = 0.53, LEAVE = 0.535;
  const FIRE_FROM = 0.64, FIRE_TO = 0.93;
  const HIRE_GAP = 1.35;                              // seconds between hires

  /* ---------------------------------------------------------------- colour */

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = k => k * k * (3 - 2 * k);
  const R = Math.random;
  const rr = (a, b) => a + R() * (b - a);
  const pick = a => a[(R() * a.length) | 0];

  function rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hex(c) { return '#' + c.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join(''); }
  function mix(a, b, k) { const A = rgb(a), B = rgb(b); return hex([0, 1, 2].map(i => A[i] + (B[i] - A[i]) * k)); }
  const shade = (c, k = 0.18) => mix(c, '#000000', k);
  const tint = (c, k = 0.2) => mix(c, '#FFFFFF', k);

  // A cyclic table of [f, …values], values colours or numbers, eased between rows.
  function keyed(table, f) {
    let i = 0;
    while (i < table.length - 1 && table[i + 1][0] <= f) i++;
    const a = table[i], b = i < table.length - 1 ? table[i + 1] : [1 + table[0][0], ...table[0].slice(1)];
    const k = b[0] > a[0] ? smooth((f - a[0]) / (b[0] - a[0])) : 0;
    return a.slice(1).map((v, j) => (typeof v === 'number' ? v + (b[j + 1] - v) * k : mix(v, b[j + 1], k)));
  }

  // The sky at the zenith, two-thirds down, and on the horizon.
  const SKY = [
    [0.000, '#0E1638', '#1A2350', '#2E3762'],
    [0.020, '#141C44', '#2B3060', '#5B4C78'],
    [0.052, '#41588A', '#BC8796', '#F3B68A'],
    [0.090, '#89ACCB', '#E7C9B4', '#F7DEB4'],
    [0.140, '#A8CADC', '#D9E5E0', '#F4EAD3'],
    [0.410, '#A3C5D9', '#DCE5DF', '#F2E6CE'],
    [0.490, '#93B3CD', '#E5D8BD', '#F3CF99'],
    [0.540, '#6E7DAD', '#E2A78A', '#F4A55F'],
    [0.580, '#3D4580', '#996D8E', '#DF856A'],
    [0.615, '#1A2350', '#33356A', '#6A5277'],
    [0.660, '#0E1638', '#1A2350', '#2E3762'],
  ];
  const NIGHT = [[0, 0.5], [0.03, 0.42], [0.06, 0.14], [0.1, 0], [0.54, 0], [0.585, 0.26], [0.63, 0.56], [0.97, 0.56], [1, 0.5]];
  const WARM = [[0, 0], [0.04, 0], [0.065, 0.13], [0.11, 0], [0.46, 0], [0.52, 0.1], [0.56, 0.2], [0.6, 0.06], [0.63, 0], [1, 0]];
  const CLOUD = [[0, '#2E375E'], [0.03, '#5C5478'], [0.065, '#F2C9BC'], [0.11, '#FBF6EC'], [0.46, '#FBF6EC'],
                 [0.525, '#F7D8B4'], [0.57, '#E6A28A'], [0.6, '#7B6788'], [0.65, '#2E375E'], [1, '#2E375E']];

  const INK = '#2B2620';
  // The five disciplines, in the board's order and the tiles' own colours.
  const KIND = ['art', 'sci', 'mac', 'ele', 'nat'];
  const KC = ['#8E3E28', '#37658A', '#1B1C19', '#C9A227', '#3C8B51'];
  const KIC = ['#F2ECDC', '#EFF3F7', '#E4DDCB', '#2A2206', '#F0EAD9'];
  const KBD = ['#6B2C1B', '#24486A', '#000000', '#9E7C13', '#2A6A3A'];
  const KGLOW = ['#FF9C76', '#9CD0F7', '#F6EEDC', '#FFE06A', '#9BE8AC'];
  const STONE = '#F4EFE3', STONE2 = '#E3DAC6', ARCH = '#D3C9B4', DOOR = '#C9BFA9';
  const GOLD = '#D2A535', GOLD2 = '#F3D57E', GOLDD = '#9A7518';
  const NATION = [{ a: '#CE1E32', b: '#F3EADA' }, { a: '#24356B', b: '#D9AE3A' }];
  const SKIN = ['#F1D2B6', '#E3B590', '#C8946A', '#9C6A45', '#6F4831'];
  const HAIR = ['#2B211A', '#4E3322', '#7A5230', '#B88F55', '#3B3A38', '#A9A398'];
  const SUIT = ['#2F3441', '#3F342A', '#4B4F53', '#2A3A57', '#5B4A39', '#5F5B52', '#24303F', '#4A3B44'];
  const SKIRT = ['#2B3A57', '#6E2F40', '#36594B', '#5F3B5C', '#7B5B2F', '#3F3F47', '#8B6A49', '#A0493B', '#4E6B7F'];
  const BODICE = ['#F6F1E6', '#F6F1E6', '#F6F1E6', '#E9DCC2', '#DDE4EA'];
  const RIBBON = ['#CE1E32', '#2A3A57', '#3C8B51', '#C9A227', '#7A4E8A', '#E08A9A'];
  const PARASOL = ['#F4EADA', '#E8B9B2', '#BBD0E0', '#CE1E32', '#F0D98A', '#C9D8B4'];

  /* ------------------------------------------------------------------- svg */

  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, a, p) {
    const e = document.createElementNS(NS, tag);
    if (a) for (const k in a) if (a[k] != null) e.setAttribute(k, a[k]);
    if (p) p.appendChild(e);
    return e;
  }
  // Every drawn shape gets a hairline of ink that stays a hairline at any scale.
  const LN = { stroke: INK, 'stroke-width': 0.8, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
  const NO = { stroke: 'none' };
  const path = (p, d, fill, o) => el('path', Object.assign({ d, fill }, LN, o), p);
  const rect = (p, x, y, w, h, fill, o) => el('rect', Object.assign({ x, y, width: w, height: h, fill }, LN, o), p);
  const circ = (p, cx, cy, r, fill, o) => el('circle', Object.assign({ cx, cy, r, fill }, LN, o), p);
  const ell = (p, cx, cy, rx, ry, fill, o) => el('ellipse', Object.assign({ cx, cy, rx, ry, fill }, LN, o), p);
  const line = (p, x1, y1, x2, y2, o) => el('line', Object.assign({ x1, y1, x2, y2 }, LN, o), p);
  const tr = (x, y, s, flip) => `translate(${x.toFixed(1)} ${y.toFixed(1)})` + (s ? ` scale(${(flip ? -s : s).toFixed(3)} ${s.toFixed(3)})` : '');
  // A limb or a pole: an inked stroke with a coloured one on top.
  function limb(p, x1, y1, x2, y2, w, color) {
    line(p, x1, y1, x2, y2, { stroke: INK, 'stroke-width': w + 1.3, 'vector-effect': 'none' });
    line(p, x1, y1, x2, y2, { stroke: color, 'stroke-width': w, 'vector-effect': 'none' });
  }
  function flag(p, x, y, w, h, color) {
    el('path', { class: 'flag', d: `M${x},${y} L${x + w},${y + h / 2} L${x},${y + h} Z`, fill: color, style: `animation-delay:${(-R() * 1.2).toFixed(2)}s` }, p);
  }
  // A tile, as on the board: the discipline's colour, its border, its icon.
  function tile(p, x, y, size, k) {
    rect(p, x, y, size, size, KC[k], { rx: size * 0.2, stroke: KBD[k], 'stroke-width': 1 });
    const m = size * 0.16;
    el('use', { href: '#ic-' + KIND[k], x: x + m, y: y + m, width: size - 2 * m, height: size - 2 * m, style: `color:${KIC[k]};--t-bg:${KC[k]}` }, p);
  }

  /* ---------------------------------------------------------------- people

     Drawn in local units, feet at 0 and about fifty units tall, facing right;
     the caller scales and flips. Legs, arms and skirts carry the classes the
     walk animates (style.css); the upper body bobs. A craftsperson (o.k set)
     holds up their discipline's tile on a pole. */

  function hat(p, type, color) {
    if (type === 'bowler') {
      path(p, 'M-3.9,-44.6 Q-3.9,-49.8 0.6,-49.9 Q5.1,-49.8 5.1,-44.6 Z', '#1E1C1A');
      ell(p, 0.6, -44.5, 6.2, 1.3, '#1E1C1A');
    } else if (type === 'boater') {
      rect(p, -3.6, -48.6, 8.4, 4.1, '#E2CB8C', { rx: 0.6 });
      rect(p, -3.6, -46.4, 8.4, 1.4, pick(['#1E1C1A', '#7A1E2A', '#2A3A57']), NO);
      ell(p, 0.6, -44.6, 7.3, 1.4, '#E2CB8C');
    } else if (type === 'top') {
      rect(p, -3.4, -54, 8, 9.6, '#161514', { rx: 0.5 });
      rect(p, -3.4, -46.2, 8, 1.3, '#3A3633', NO);
      ell(p, 0.6, -44.5, 6.3, 1.3, '#161514');
    } else if (type === 'cap') {
      path(p, 'M-4.1,-44.3 Q-4,-48.4 0.8,-48.2 Q5.4,-48 6.6,-44.8 Q3,-45.4 -4.1,-44.3 Z', color);
      path(p, 'M3.2,-45 Q6.8,-45.2 8.2,-44 Q5.6,-43.5 3.2,-44.1 Z', shade(color, 0.25));
    } else if (type === 'sailor') {
      path(p, 'M-3.6,-44.6 Q-3.6,-48 0.6,-48 Q4.8,-48 4.8,-44.6 Z', '#F4EFE4');
      rect(p, -3.8, -45.4, 8.8, 1.3, '#2A3A57', NO);
    }
  }

  function placard(ub, k, sleeve, skin) {
    limb(ub, 0.9, -35.6, 4, -40.2, 3.1, sleeve);
    limb(ub, 4, -40.2, 4.5, -46.6, 2.5, skin);
    circ(ub, 4.5, -47.2, 1.5, skin);
    line(ub, 4.5, -48.4, 4.5, -59.4, { stroke: '#6B5136', 'stroke-width': 1.4, 'vector-effect': 'none' });
    tile(ub, -1.6, -71.4, 12.2, k);
  }

  function gent(g, type, skin, hair, o) {
    const crafts = o.k != null, boy = type === 'boy';
    const coat = crafts ? '#EEE6D3' : (o.coat || pick(SUIT));
    const trou = crafts ? pick(['#3D3832', '#4B443B', '#33363B']) : boy ? coat : (R() < 0.55 ? coat : pick(['#3A3530', '#55504A', '#6A6358']));
    for (const side of ['b', 'a']) {
      const lg = el('g', { class: 'lg ' + side }, g);
      if (boy) { rect(lg, -1.7, -21.6, 3.6, 9, trou, { rx: 1 }); rect(lg, -1.3, -13, 2.8, 12.4, '#2C2A28', NO); }
      else rect(lg, -1.7, -21.6, 3.6, 20.9, side === 'b' ? shade(trou, 0.14) : trou, { rx: 1 });
      ell(lg, 0.9, -0.7, 2.7, 1.15, '#1E1B18');
    }
    const ub = el('g', { class: 'ub' }, g);
    const sleeve = crafts ? '#E4DAC4' : shade(coat, 0.1);
    const ba = el('g', { class: 'am b' }, ub);
    rect(ba, -1.5, -36.2, 3.2, 15.2, sleeve, { rx: 1.5 });
    circ(ba, 0.1, -20.7, 1.5, skin);
    if (crafts) {
      path(ub, 'M-5.6,-37.2 Q0,-38.5 5.6,-37.2 L6.2,-33 L5.4,-20 L-5.4,-20 L-6.2,-33 Z', coat);
      path(ub, 'M-4.4,-31.5 L4.6,-31.5 L5.4,-9.6 L-5.2,-9.6 Z', '#B89B74');
      path(ub, 'M-2.4,-36.4 L2.6,-36.4 L2.8,-31.5 L-2.6,-31.5 Z', '#B89B74');
    } else if (boy) {
      path(ub, 'M-5.4,-37.2 Q0,-38.5 5.4,-37.2 L6,-33 L5.2,-21 L-5.2,-21 L-6,-33 Z', coat);
      path(ub, 'M-5.6,-37.2 L-1.4,-37.4 L0,-33.6 L1.4,-37.4 L5.6,-37.2 L4.6,-34.6 L-4.6,-34.6 Z', '#F4EFE4');
    } else {
      const tail = R() < 0.3 ? -12.5 : -19.6;
      path(ub, `M-5.6,-37.2 Q0,-38.5 5.6,-37.2 L6.4,-33 L5.8,${tail} L-5.8,${tail} L-6.4,-33 Z`, coat);
      path(ub, 'M-1.8,-37.5 L1.8,-37.5 L0,-31.2 Z', '#F6F2E8');
      path(ub, 'M-0.6,-36.8 L0.6,-36.8 L0.3,-33.4 L-0.3,-33.4 Z', pick(['#1E1C1A', '#7A1E2A', '#2A3A57']), NO);
    }
    rect(ub, -1.1, -38.8, 2.2, 2.4, skin, NO);
    circ(ub, 0.5, -41.7, 4.3, skin);
    circ(ub, 2.9, -42.3, 0.45, INK, NO);
    path(ub, 'M-3.7,-42.4 Q-3.9,-46.6 0.5,-46.5 Q4.4,-46.3 4.7,-43.8 Q2.2,-45.3 -0.8,-44.3 Q-2.7,-43.4 -3.7,-40.8 Z', hair);
    if (!crafts && !boy && R() < 0.45) path(ub, 'M1.6,-39.6 Q3.1,-40.5 4.7,-39.4', 'none', { stroke: hair, 'stroke-width': 1.2 });
    hat(ub, crafts ? 'cap' : boy ? 'sailor' : pick(['bowler', 'bowler', 'boater', 'boater', 'boater', 'top']), crafts ? KC[o.k] : null);
    if (crafts) placard(ub, o.k, sleeve, skin);
    else {
      const fa = el('g', { class: 'am a' }, ub);
      rect(fa, -1.6, -36.6, 3.4, 15.4, coat, { rx: 1.6 });
      circ(fa, 0.1, -20.8, 1.55, skin);
    }
  }

  function lady(g, type, skin, hair, o) {
    const girl = type === 'girl', crafts = o.k != null;
    const skirt = crafts ? pick(['#3D3832', '#4B3F3A', '#33363B', '#4A4036']) : (o.skirt || pick(SKIRT));
    const bodice = crafts ? '#EEE6D3' : (R() < 0.6 ? pick(BODICE) : tint(skirt, 0.12));
    if (girl) {
      for (const side of ['b', 'a']) {
        const lg = el('g', { class: 'lg ' + side }, g);
        rect(lg, -1.3, -9, 2.7, 8.4, '#2C2A28', { rx: 0.8 });
        ell(lg, 0.8, -0.6, 2.4, 1, '#1E1B18');
      }
    } else {
      ell(g, -3.1, -0.4, 2.4, 0.95, '#1E1B18');
      ell(g, 4.5, -0.4, 2.4, 0.95, '#1E1B18');
    }
    const sk = el('g', { class: 'sk' }, g);
    if (girl) path(sk, 'M-4.2,-23.4 L4.4,-23.4 C6,-17 7.8,-12.4 8.6,-8.4 L-7.6,-8.4 C-6.8,-12.4 -5.6,-17 -4.2,-23.4 Z', skirt);
    else {
      path(sk, 'M-4.4,-23.4 L4.6,-23.4 C6.7,-14.5 9.6,-6.4 10.9,-0.3 L-9.6,-0.3 C-8.4,-6.4 -6.4,-14.5 -4.4,-23.4 Z', skirt);
      path(sk, 'M-9.3,-2 L10.6,-2', 'none', { stroke: shade(skirt, 0.3), 'stroke-width': 1.2 });
    }
    if (crafts) path(sk, 'M-3.6,-23 L4.2,-23 L5.6,-5 L-4.8,-5 Z', '#B89B74');
    else if (girl) path(sk, 'M-3.2,-23 L3.8,-23 L5,-9.6 L-4.4,-9.6 Z', '#F6F2EA');
    const ub = el('g', { class: 'ub' }, g);
    const sleeve = shade(bodice, 0.08);
    const ba = el('g', { class: 'am b' }, ub);
    ell(ba, 0, -33.6, 3.4, 4, sleeve);
    rect(ba, -1.1, -30.4, 2.3, 9.2, sleeve, { rx: 1 });
    circ(ba, 0.1, -20.9, 1.35, skin);
    path(ub, 'M-4.3,-23.4 L4.5,-23.4 L5.2,-35.6 Q0.4,-38 -4.6,-35.6 Z', bodice);
    rect(ub, -4.6, -24.8, 9.4, 1.6, crafts ? '#5A4636' : pick(['#1E1C1A', '#7A1E2A', '#2A3A57', '#6B4A2E']), NO);
    rect(ub, -1, -38.4, 2.1, 2.4, skin, NO);
    circ(ub, 0.4, -41.1, 4.1, skin);
    circ(ub, 2.7, -41.7, 0.42, INK, NO);
    path(ub, 'M-3.7,-41.6 Q-4,-45.8 0.4,-45.6 Q4.2,-45.4 4.5,-42.4 Q2.2,-44 -0.8,-43.4 Q-2.8,-42.6 -3.7,-40.4 Z', hair);
    circ(ub, -3.5, -43.2, 2.1, hair);
    if (crafts) {
      path(ub, 'M-4.4,-42 Q-4.6,-47.2 0.4,-47 Q5,-46.8 5,-42.6 Q0.4,-44.6 -4.4,-42 Z', KC[o.k]);
      path(ub, 'M-4.2,-42.4 L-6.6,-40.4 L-4.8,-40 Z', KC[o.k]);
      placard(ub, o.k, sleeve, skin);
      return;
    }
    const straw = pick(['#E6D3A3', '#E6D3A3', '#D9C08A', '#3A3634', '#F1EBDD']), rib = pick(RIBBON);
    ell(ub, 0.6, -45, girl ? 7.4 : 7.9, 1.6, straw);
    path(ub, 'M-3.2,-45.1 Q-3.2,-48.8 0.6,-48.8 Q4.4,-48.8 4.4,-45.1 Z', straw);
    rect(ub, -3.2, -46.7, 7.6, 1.3, rib, NO);
    if (R() < 0.5) path(ub, 'M-2.8,-47.8 Q-6.6,-52.6 -9.6,-50.8 Q-6.2,-50.6 -3.6,-46.8 Z', R() < 0.5 ? '#FFFFFF' : rib);
    else { circ(ub, -1.6, -48.6, 1.3, rib); circ(ub, 0.4, -49.2, 1.2, '#F6F0E2'); circ(ub, 2.2, -48.6, 1.1, pick(RIBBON)); }
    if (!girl && R() < 0.38) {
      ell(ub, 0.6, -33.4, 3.5, 4.1, bodice);
      limb(ub, 1.4, -31.6, 4.6, -29, 2.2, bodice);
      circ(ub, 4.7, -28.9, 1.35, skin);
      line(ub, 4.7, -27.4, 2.4, -58, { stroke: '#3A332B', 'stroke-width': 0.9 });
      const pc = pick(PARASOL);
      path(ub, 'M-8.6,-56.6 Q2.4,-67.6 13.4,-56.6 Q11,-54.8 8.8,-56.7 Q6.6,-54.8 4.4,-56.7 Q2.2,-54.8 0,-56.7 Q-2.2,-54.8 -4.4,-56.7 Q-6.5,-54.8 -8.6,-56.6 Z', pc);
      path(ub, 'M2.4,-62.8 L-4.4,-56.7 M2.4,-62.8 L0,-56.7 M2.4,-62.8 L4.4,-56.7 M2.4,-62.8 L8.8,-56.7', 'none', { stroke: shade(pc, 0.25), 'stroke-width': 0.6 });
    } else {
      const fa = el('g', { class: 'am a' }, ub);
      ell(fa, 0, -33.6, 3.5, 4.1, bodice);
      rect(fa, -1.15, -30.4, 2.4, 9.3, bodice, { rx: 1 });
      circ(fa, 0.1, -20.9, 1.4, skin);
    }
  }

  function person(par, type, o = {}) {
    const g = el('g', null, par);
    const skin = pick(SKIN), hair = pick(HAIR);
    if (type === 'woman' || type === 'girl') lady(g, type, skin, hair, o);
    else gent(g, type, skin, hair, o);
    return g;
  }

  /* ---------------------------------------------------------- the White City

     Each landmark is drawn in units about the size of the Administration
     Building's 120, base at 0, three times over: once in the world, once as
     a plain silhouette in the clip the night falls through, and once as the
     strings of bulbs that light it. */

  function bulbs(lt, d, u) {
    el('path', { d, fill: 'none', stroke: '#FFD27A', 'stroke-opacity': 0.3, 'stroke-width': 5 / u, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, lt);
    el('path', { d, fill: 'none', stroke: '#FFF1C4', 'stroke-width': 2 / u, 'stroke-dasharray': `0.01 ${(4.4 / u).toFixed(2)}`, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, lt);
  }
  const sil = (c, d) => el('path', { d, transform: c.t }, c.clip);   // a clipPath takes no <g>
  const arches = (g, x0, n, step, w, top, fill) => {
    for (let i = 0; i < n; i++) {
      const x = x0 + i * step;
      path(g, `M${x},-3 V${top} A${w / 2},${w / 2} 0 0 1 ${x + w},${top} V-3 Z`, fill || ARCH, NO);
    }
  };

  function admin(g, c, lt, u) {
    rect(g, -62, -30, 124, 30, STONE);
    arches(g, -55.5, 9, 12.9, 7.6, -15);
    rect(g, -64, -32.6, 128, 3, STONE2);
    for (const x of [-62, 46]) { rect(g, x, -40, 16, 40, STONE); path(g, `M${x - 1},-40 Q${x + 8},-49.5 ${x + 17},-40 Z`, STONE2); }
    rect(g, -31, -60, 62, 28, STONE);
    for (let i = 0; i < 7; i++) rect(g, -26.6 + i * 8.6, -57, 2.2, 23, STONE2, NO);
    rect(g, -33, -62.4, 66, 2.8, STONE2);
    path(g, 'M-29,-62 C-29,-84 -15,-97.5 0,-99 C15,-97.5 29,-84 29,-62 Z', '#EFE8D7');
    path(g, 'M0,-99 C15,-97.5 29,-84 29,-62 L15,-62 C15,-80 8,-94 0,-99 Z', '#DCD2BE', NO);
    for (const x of [-20, -9, 9, 20]) path(g, `M${(x * 1.38).toFixed(1)},-62 Q${(x * 1.02).toFixed(1)},-88 0,-98.6`, 'none', { stroke: GOLD, 'stroke-width': 1.1 });
    rect(g, -4.4, -107, 8.8, 8.4, STONE);
    path(g, 'M-5.6,-106.8 Q0,-113.4 5.6,-106.8 Z', GOLD);
    line(g, 0, -113, 0, -118.5, { stroke: GOLDD, 'stroke-width': 1.2 });
    flag(g, 0, -118.5, 7, 4, '#CE1E32');
    sil(c, 'M-64,0 V-40 H-31 V-62.4 H-29 C-29,-84 -15,-97.5 0,-99 C15,-97.5 29,-84 29,-62.4 H31 V-40 H64 V0 Z M-4.4,-98 H4.4 V-113 H-4.4 Z');
    bulbs(lt, 'M-64,-32.6 H64 M-62,-40 H-46 M46,-40 H62 M-33,-62.4 H33', u);
    bulbs(lt, 'M-29,-62 C-29,-84 -15,-97.5 0,-99 C15,-97.5 29,-84 29,-62', u);
    for (const x of [-20, -9, 9, 20]) bulbs(lt, `M${(x * 1.38).toFixed(1)},-62 Q${(x * 1.02).toFixed(1)},-88 0,-98.6`, u);
  }

  function manufactures(g, c, lt, u) {
    const h = 74;
    path(g, `M${-h + 8},-26 Q0,-52 ${h - 8},-26 Z`, '#C8CDCF');
    path(g, `M${-h + 20},-26 Q0,-46 ${h - 20},-26`, 'none', { stroke: '#A9AFB2', 'stroke-width': 0.7 });
    rect(g, -h, -26, 2 * h, 26, STONE);
    for (let x = -h + 4; x < h - 6; x += 7.4) if (Math.abs(x + 2.4) > 16) path(g, `M${x},-3 V-15 A2.4,2.4 0 0 1 ${x + 4.8},-15 V-3 Z`, ARCH, NO);
    rect(g, -h - 2, -28.4, 2 * h + 4, 2.4, STONE2);
    for (const x of [-h, h - 12]) rect(g, x, -34, 12, 34, STONE);
    rect(g, -14, -44, 28, 44, STONE);
    path(g, 'M-8.6,-3 V-26 A8.6,8.6 0 0 1 8.6,-26 V-3 Z', DOOR, NO);
    path(g, 'M-15.6,-44 L0,-53 L15.6,-44 Z', STONE2);
    line(g, 0, -53, 0, -60, { stroke: '#5A5148', 'stroke-width': 0.9 });
    flag(g, 0, -60, 6, 3.4, '#24356B');
    sil(c, `M${-h - 2},0 V-34 H${-h + 12} V-28 L${-h + 8},-26 Q0,-52 ${h - 8},-26 L${h - 12},-28 V-34 H${h + 2} V0 Z M-14,-30 V-44 L0,-53 L14,-44 V-30 Z`);
    bulbs(lt, `M${-h - 2},-28.4 H${h + 2} M-15.6,-44 L0,-53 L15.6,-44`, u);
  }

  function electricity(g, c, lt, u) {
    rect(g, -42, -28, 84, 28, STONE);
    for (let i = 0; i < 8; i++) { const x = -38.5 + i * 9.8; if (Math.abs(x + 2.6) > 12) path(g, `M${x},-3 V-15 A2.6,2.6 0 0 1 ${x + 5.2},-15 V-3 Z`, ARCH, NO); }
    rect(g, -44, -30.2, 88, 2.4, STONE2);
    rect(g, -12, -40, 24, 40, STONE);
    path(g, 'M-6.4,-3 V-24 A6.4,6.4 0 0 1 6.4,-24 V-3 Z', DOOR, NO);
    path(g, 'M-13.4,-40 L0,-48 L13.4,-40 Z', STONE2);
    for (const x of [-37, -23, 23, 37]) {
      rect(g, x - 3, -58, 6, 30, STONE);
      path(g, `M${x - 3.6},-58 L${x},-80 L${x + 3.6},-58 Z`, STONE2);
      line(g, x, -80, x, -86, { stroke: '#5A5148', 'stroke-width': 0.9 });
      flag(g, x, -86, 6, 3.4, x < 0 ? '#CE1E32' : '#24356B');
    }
    sil(c, 'M-44,0 V-30 H-40.6 V-58 L-37,-80 L-33.4,-58 H-26.6 L-23,-80 L-19.4,-58 V-40 H-13.4 L0,-48 L13.4,-40 H19.4 V-58 L23,-80 L26.6,-58 H33.4 L37,-80 L40.6,-58 V-30 H44 V0 Z');
    bulbs(lt, 'M-44,-30.2 H44 M-13.4,-40 L0,-48 L13.4,-40', u);
    for (const x of [-37, -23, 23, 37]) bulbs(lt, `M${x - 3.6},-58 L${x},-80 L${x + 3.6},-58`, u);
  }

  function agricultural(g, c, lt, u) {
    rect(g, -52, -26, 104, 26, STONE);
    for (let x = -48; x < 48; x += 6) if (Math.abs(x) > 16) rect(g, x, -23, 2, 20, STONE2, NO);
    rect(g, -54, -28.4, 108, 2.4, STONE2);
    for (const x of [-52, 40]) { rect(g, x, -34, 12, 34, STONE); path(g, `M${x - 1},-34 Q${x + 6},-41 ${x + 13},-34 Z`, STONE2); }
    rect(g, -17, -42, 34, 16, STONE);
    rect(g, -18.5, -43.6, 37, 2, STONE2);
    path(g, 'M-15,-43.6 C-15,-58 -7,-66 0,-66.6 C7,-66 15,-58 15,-43.6 Z', '#ECE5D3');
    path(g, 'M0,-66.6 C7,-66 15,-58 15,-43.6 L7,-43.6 C7,-56 4,-63 0,-66.6 Z', '#D9CFBA', NO);
    rect(g, -2.2, -70, 4.4, 3.6, STONE);
    path(g, 'M-1.4,-70 L-0.8,-77 L0.8,-77 L1.4,-70 Z', GOLD, { stroke: GOLDD });       // Diana, with her bow
    circ(g, 0, -78.4, 1.3, GOLD, { stroke: GOLDD });
    path(g, 'M1.2,-76 L4.6,-79.6 M4,-83 Q6.4,-79.6 4,-76', 'none', { stroke: GOLDD, 'stroke-width': 0.8 });
    sil(c, 'M-54,0 V-34 H-17 V-43.6 H-15 C-15,-58 -7,-66 0,-66.6 C7,-66 15,-58 15,-43.6 H17 V-34 H54 V0 Z M-2.2,-66 H2.2 V-80 H-2.2 Z');
    bulbs(lt, 'M-54,-28.4 H54 M-18.5,-43.6 H18.5', u);
    bulbs(lt, 'M-15,-43.6 C-15,-58 -7,-66 0,-66.6 C7,-66 15,-58 15,-43.6', u);
  }

  function machinery(g, c, lt, u) {
    rect(g, -50, -26, 100, 26, STONE);
    for (let x = -46; x < 46; x += 7) if (Math.abs(x + 2.4) > 18) path(g, `M${x},-3 V-14 A2.4,2.4 0 0 1 ${x + 4.8},-14 V-3 Z`, ARCH, NO);
    rect(g, -52, -28.4, 104, 2.4, STONE2);
    for (const x of [-15, 15]) {
      rect(g, x - 5, -58, 10, 58, STONE);
      rect(g, x - 6, -59.6, 12, 2, STONE2);
      path(g, `M${x - 5},-59.6 Q${x - 5},-67 ${x},-68.4 Q${x + 5},-67 ${x + 5},-59.6 Z`, '#ECE5D3');
      line(g, x, -68.4, x, -73, { stroke: GOLDD, 'stroke-width': 0.9 });
      circ(g, x, -73.6, 0.9, GOLD, NO);
    }
    path(g, 'M-10,-3 V-28 A10,10 0 0 1 10,-28 V-3 Z', DOOR, NO);
    sil(c, 'M-52,0 V-28.4 H-20 V-59.6 Q-20,-67 -15,-68.4 Q-10,-67 -10,-59.6 V-28.4 H10 V-59.6 Q10,-67 15,-68.4 Q20,-67 20,-59.6 V-28.4 H52 V0 Z');
    bulbs(lt, 'M-52,-28.4 H52 M-21,-59.6 H-9 M9,-59.6 H21', u);
  }

  function fineArts(g, c, lt, u) {
    path(g, 'M-12,-36 Q0,-52 12,-36 Z', '#E7DFCC');
    rect(g, -40, -22, 80, 22, STONE);
    rect(g, -42, -24.2, 84, 2.2, STONE2);
    rect(g, -14, -34, 28, 34, STONE);
    for (let x = -12; x <= 9; x += 4.2) rect(g, x, -31, 1.8, 28, STONE2, NO);
    path(g, 'M-15.6,-34 L0,-42 L15.6,-34 Z', STONE2);
    sil(c, 'M-42,0 V-24 H-14 V-34 L-12,-36 Q0,-52 12,-36 L14,-34 V-24 H42 V0 Z');
    bulbs(lt, 'M-42,-24.2 H42 M-15.6,-34 L0,-42 L15.6,-34', u);
  }

  function block(g, c, lt, u, w, h, roof) {
    rect(g, -w / 2, -h, w, h, STONE);
    for (let x = -w / 2 + 3; x < w / 2 - 5; x += 6.4) path(g, `M${x},-3 V${-h * 0.45} A2,2 0 0 1 ${x + 4},${-h * 0.45} V-3 Z`, ARCH, NO);
    rect(g, -w / 2 - 1.5, -h - 2, w + 3, 2.2, STONE2);
    let top = -h - 2;
    if (roof === 'dome') { path(g, `M${-w * 0.22},${top} Q0,${top - w * 0.36} ${w * 0.22},${top} Z`, '#ECE5D3'); top -= w * 0.18; }
    if (roof === 'tower') { rect(g, -4, top - 22, 8, 22, STONE); path(g, `M-5,${top - 22} L0,${top - 34} L5,${top - 22} Z`, STONE2); top -= 34; }
    sil(c, `M${-w / 2 - 1.5},0 V${-h - 2} H${w / 2 + 1.5} V0 Z` + (roof === 'dome' ? ` M${-w * 0.22},${-h - 2} Q0,${-h - 2 - w * 0.36} ${w * 0.22},${-h - 2} Z` : '')
      + (roof === 'tower' ? ` M-5,${-h - 2} V${-h - 24} L0,${-h - 36} L5,${-h - 24} V${-h - 2} Z` : ''));
    bulbs(lt, `M${-w / 2 - 1.5},${-h - 2} H${w / 2 + 1.5}`, u);
    return -top;
  }

  function peristyle(g, c, lt, u, half, lake) {
    rect(g, -half, -26, 2 * half, 23, lake, NO);
    rect(g, -half, -3, 2 * half, 3, STONE2);
    for (let x = -half + 2; x < half - 2; x += 5.4) if (Math.abs(x + 1) > 15) rect(g, x, -25.8, 2.3, 22.8, STONE, { 'stroke-width': 0.6 });
    rect(g, -half, -31, 2 * half, 5.2, STONE);
    rect(g, -half - 1, -32.6, 2 * half + 2, 1.8, STONE2);
    for (let x = -half + 8; x < half - 6; x += 16) if (Math.abs(x) > 18) path(g, `M${x - 1.2},-32.6 L${x - 1},-37 Q${x},-39.6 ${x + 1},-37 L${x + 1.2},-32.6 Z`, STONE2, { 'stroke-width': 0.5 });
    rect(g, -14, -47, 28, 47, STONE);
    path(g, 'M-7.4,-3 V-24 A7.4,7.4 0 0 1 7.4,-24 V-3 Z', lake, NO);
    rect(g, -15.5, -50.6, 31, 3.8, STONE2);
    for (let i = 0; i < 4; i++) {                       // the Columbus quadriga, gilded
      const x = -9 + i * 4.6;
      path(g, `M${x},-50.6 L${x + 0.4},-54.6 Q${x + 1.6},-58.6 ${x + 3.6},-58 L${x + 4.2},-56 L${x + 2.8},-55.4 L${x + 2.6},-50.6 Z`, GOLD, { stroke: GOLDD });
    }
    path(g, 'M-3,-50.6 V-56 H4 V-50.6 Z', GOLD, { stroke: GOLDD });
    circ(g, 0.5, -59.4, 1.6, GOLD, { stroke: GOLDD });
    sil(c, `M${-half - 1},0 V-32.6 H-15.5 V-50.6 H-9 V-58.6 H8 V-50.6 H15.5 V-32.6 H${half + 1} V0 Z`);
    bulbs(lt, `M${-half - 1},-32.6 H${half + 1} M-15.5,-50.6 H15.5`, u);
  }

  // The Statue of the Republic, French's "Big Mary": a draped figure, both arms raised, the staff and liberty cap in
  // one hand and the globe with its eagle in the other, a laurel crown.
  function republic(p, gold, hi) {
    const S = { stroke: GOLDD };
    path(p, 'M-6.4,-32 C-6.6,-42 -5.6,-54 -4.6,-63 Q0,-65 4.6,-63 C5.6,-54 6.6,-42 6.4,-32 Z', gold, S);
    path(p, 'M1.2,-63.6 Q3.2,-63.8 4.6,-63 C5.6,-54 6.6,-42 6.4,-32 L3,-32 C3,-42 2.4,-54 1.2,-63.6 Z', hi, NO);
    path(p, 'M-3.6,-58 C-3.8,-48 -4.2,-40 -4.4,-33 M-0.8,-60 L-0.8,-33 M2.2,-57 C2.4,-48 2.8,-40 3,-33', 'none', { stroke: GOLDD, 'stroke-width': 0.5 });
    path(p, 'M-4.8,-58.6 Q0,-57.4 4.8,-58.6', 'none', { stroke: GOLDD, 'stroke-width': 0.8 });
    path(p, 'M-5.2,-63.4 Q0,-67.2 5.2,-63.4 L4.6,-60 Q0,-62 -4.6,-60 Z', gold, S);
    path(p, 'M-4.6,-63.4 L-8.6,-76 L-7.2,-88.4 L-5.4,-88.2 L-6.2,-76.4 L-2.6,-64.4 Z', gold, S);
    path(p, 'M4.6,-63.4 L8.6,-76 L7.2,-88.4 L5.4,-88.2 L6.2,-76.4 L2.6,-64.4 Z', gold, S);
    rect(p, -0.9, -67.6, 1.8, 2.4, gold, NO);
    circ(p, 0, -69.8, 2.5, gold, S);
    path(p, 'M-2.6,-71 L-1.6,-73.4 L-0.6,-71.6 L0.4,-74 L1.2,-71.6 L2.4,-73.2 L2.7,-70.6', 'none', { stroke: GOLDD, 'stroke-width': 0.6 });
    line(p, -6.3, -82, -6.3, -101, { stroke: GOLDD, 'stroke-width': 1 });
    path(p, 'M-8.6,-100.6 Q-7.6,-105.6 -4.4,-103.6 Q-5,-101.6 -4.2,-100.6 Z', gold, S);
    circ(p, 6.3, -91.4, 3, gold, S);
    path(p, 'M1.4,-97.6 Q4,-95.2 6.3,-96 Q8.6,-95.2 11.2,-97.6 Q8.8,-97.8 6.3,-96.8 Q3.8,-97.8 1.4,-97.6 Z', gold, S);
  }

  /* ------------------------------------------------------------- the story

     It outlives a redraw: which displays each nation has up. A bay (r, c),
     row r from the top, holds kind (c − r) mod 5, the board's own wall. */

  const story = { bays: [new Array(25).fill(-1), new Array(25).fill(-1)], turn: 0, seeded: false };
  const colFor = (r, k) => (k + r) % 5;
  const kindAt = (r, c) => (c - r + 5) % 5;
  function seedBays(n) {
    for (const bays of story.bays) {
      bays.fill(-1);
      const free = [...Array(25).keys()].sort(() => R() - 0.5);
      for (let i = 0; i < n; i++) bays[free[i]] = kindAt((free[i] / 5) | 0, free[i] % 5);
    }
  }
  const builtFor = f => (f >= RESET || f < HIRES_FROM ? 0 : Math.round(clamp((f - 0.1) / 0.42, 0, 1) * 13));

  /* ---------------------------------------------------------------- layout

     One panorama for whatever shape the window is, never a frame around a
     card: the menu opens over the scene rather than living in it. A wide window
     looks down the Grand Basin to the Administration Building with the Wheel on
     the Midway at the left; a tall one (a phone) stacks the same Fair. The
     title (the arch, or the button under it on a phone) decides how tall the far
     city may stand, so the dome always clears it. */

  const body = document.body;
  const lobby = document.getElementById('lobby');
  const titleEl = document.getElementById('title');
  const playBtn = document.getElementById('btn-play');
  const backBtn = document.getElementById('btn-back');
  if (!titleEl || !playBtn || !lobby) return;

  const host = document.createElement('div');
  host.id = 'fair';
  host.setAttribute('aria-hidden', 'true');
  const scrim = document.createElement('div');
  scrim.id = 'fair-scrim';
  body.prepend(scrim);
  body.prepend(host);
  body.classList.add('fair');
  titleEl.classList.remove('hidden');
  const svg = el('svg', { focusable: 'false' }, host);

  let W = 0, H = 0;
  function measure() {
    W = document.documentElement.clientWidth; H = innerHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
  }

  function layout() {
    const land = W / H >= 1.05, L = { land };
    const pb = playBtn.getBoundingClientRect(), lb = titleEl.querySelector('.title-logo').getBoundingClientRect();
    const titleBottom = pb.height ? Math.max(pb.bottom, lb.bottom) : (land ? 0.34 : 0.32) * H;
    if (land) {
      L.hz = 0.585 * H; L.shore = 0.775 * H; L.pt = 0.79 * H;
      L.midG = 0.712 * H; L.midX1 = 0.33 * W;
      L.isle = 0.7 * H;
      L.s = clamp(H / 820, 0.6, 1.2);
      L.wX = 0.205 * W; L.wR = clamp(Math.min(0.17 * H, 0.13 * W), 40, 230);
      L.stX = 0.665 * W; L.stH = clamp(0.25 * H, 60, 280);
      L.fX = 0.4 * W; L.fY = 0.738 * H; L.fS = clamp(Math.min(0.12 * W, 0.19 * H), 40, 220);
      L.pw = clamp(Math.min(0.13 * W, 0.27 * H), 70, 240);
      L.items = [0.31, 0.405, 0.5, 0.595, 0.69].map(k => k * W); L.gateI = 2;
      L.far = [[fineArts, 0.045], [agricultural, 0.19], [manufactures, 0.335], [admin, 0.5], [electricity, 0.655], [machinery, 0.79]];
      L.peri = [0.835 * W, W + 6];
      L.balloonX = 0.9 * W;
      L.gondolaY = L.hz + 0.1 * H; L.launchY = L.shore - 0.028 * H; L.railY = L.hz + 0.045 * H;
      L.carousel = W >= 1000;
      L.beams = [[0.335, 48, -0.5], [0.655, 80, 0.35], [0.9, 34, 0.85]];
    } else {
      L.hz = 0.5 * H; L.shore = 0.685 * H; L.pt = 0.7 * H;
      L.midG = 0.655 * H; L.midX1 = 0.44 * W;
      L.isle = 0.632 * H;
      L.s = clamp(Math.min(W / 440, H / 900), 0.5, 1);
      L.wX = 0.235 * W; L.wR = clamp(Math.min(0.105 * H, 0.2 * W), 36, 160);
      L.stX = 0.8 * W; L.stH = clamp(0.19 * H, 60, 220);
      L.fX = 0.57 * W; L.fY = 0.662 * H; L.fS = clamp(Math.min(0.22 * W, 0.1 * H), 30, 140);
      L.pw = clamp(Math.min(0.25 * W, 0.15 * H), 56, 160);
      L.items = [0.34, 0.5, 0.66].map(k => k * W); L.gateI = 1;
      L.far = [[agricultural, 0.1], [admin, 0.5], [electricity, 0.88]];
      L.peri = null;
      L.balloonX = 0.86 * W;
      L.gondolaY = L.hz + 0.065 * H; L.launchY = L.shore - 0.022 * H; L.railY = L.hz + 0.03 * H;
      L.carousel = false;
      L.beams = [[0.3, 40, -0.4], [0.72, 52, 0.45]];
    }
    const P = H - L.pt;
    L.foot = [L.pt + 0.22 * P, L.pt + 0.62 * P, L.pt + 0.92 * P];
    L.kb = L.pt + 0.42 * P;
    L.pb = H - 0.012 * H;
    L.pavX = [L.pw * 0.5 + 0.014 * W, W - L.pw * 0.5 - 0.014 * W];
    L.keepOut = pb.height ? [lb, pb].map(r => [r.left, r.right, r.bottom]) : [];   // what the balloon must stay under
    const domeTop = Math.max(titleBottom + 0.03 * H, L.hz - 0.32 * H);
    L.u = clamp((L.hz - domeTop) / 119, 0.45, 2.6);
    return L;
  }

  /* ----------------------------------------------------------------- build */

  function build(f0) {
    const L = layout(), land = L.land, u = L.u, s = L.s;
    const lightAt = x => 0.15 + 1.35 * Math.abs(x - W / 2) / (W / 2);   // the illumination spreads from the middle

    // ---- defs and layers
    const defs = el('defs', null, svg);
    const sky = el('linearGradient', { id: 'fair-sky', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 0, y2: L.hz }, defs);
    const stops = [0, 0.62, 1].map(o => el('stop', { offset: o }, sky));
    const radial = (id, color, a) => { const g = el('radialGradient', { id }, defs); el('stop', { offset: 0, 'stop-color': color, 'stop-opacity': a }, g); el('stop', { offset: 1, 'stop-color': color, 'stop-opacity': 0 }, g); };
    radial('fair-halo', '#FFF2C8', 0.85);
    radial('fair-glow', '#FFDF96', 0.8);
    radial('fair-moon', '#E9ECF6', 0.45);
    const beamG = el('linearGradient', { id: 'fair-beam', x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
    el('stop', { offset: 0, 'stop-color': '#FFF8E0', 'stop-opacity': 0.9 }, beamG);
    el('stop', { offset: 1, 'stop-color': '#FFF8E0', 'stop-opacity': 0 }, beamG);
    const clip = el('clipPath', { id: 'fair-world' }, defs);
    el('rect', { x: 0, y: L.hz, width: W, height: H - L.hz }, clip);

    const skyL = el('g', null, svg), worldL = el('g', null, svg), overL = el('g', null, svg), nearL = el('g', null, svg), lightL = el('g', null, svg);
    const lights = [];                                   // groups that switch on at dusk: {g, d}
    const lit = d => { const g = el('g', { opacity: 0 }, lightL); lights.push({ g, d }); return g; };
    const twin = (x, y, sc, d) => {
      const t = tr(x, y, sc);
      return { g: el('g', { transform: t }, worldL), c: { t, clip }, l: el('g', { transform: t }, lit(d)) };
    };

    // ---- the sky
    el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#fair-sky)' }, skyL);
    const starG = el('g', { opacity: 0 }, skyL);
    for (let i = 0, n = clamp(Math.round(W * L.hz / 2600), 24, 180); i < n; i++) {
      el('circle', { class: 'star', cx: rr(0, W).toFixed(1), cy: rr(0, L.hz - 8).toFixed(1), r: rr(0.5, 1.4).toFixed(2), fill: '#F7F3E6', style: `--tw:${rr(1.6, 3.8).toFixed(2)}s;animation-delay:${(-rr(0, 4)).toFixed(2)}s` }, starG);
    }
    const moonG = el('g', null, skyL), mR = clamp(0.011 * Math.max(W, H), 9, 22);
    el('circle', { r: mR * 3.4, fill: 'url(#fair-moon)' }, moonG);
    el('circle', { r: mR, fill: '#F2F0E6' }, moonG);
    el('circle', { cx: -mR * 0.3, cy: -mR * 0.2, r: mR * 0.22, fill: '#DCD9CC' }, moonG);
    el('circle', { cx: mR * 0.35, cy: mR * 0.3, r: mR * 0.15, fill: '#DCD9CC' }, moonG);
    const sunG = el('g', null, skyL), sR = clamp(0.015 * Math.max(W, H), 11, 28);
    el('circle', { r: sR * 3.2, fill: 'url(#fair-halo)' }, sunG);
    const sunDisc = el('circle', { r: sR, fill: '#FFF4D6' }, sunG);
    const arc = p => [lerp(0.03 * W, 0.97 * W, p), L.hz + sR * 0.6 - (L.hz + sR * 0.6 - 0.1 * H) * Math.sin(Math.PI * p)];
    const cloudG = el('g', null, skyL), clouds = [], cloudTop = L.hz * 0.8;
    for (let i = 0, n = land ? 7 : 4; i < n; i++) {
      const g = el('g', null, cloudG), cs = rr(0.6, 1.2) * clamp(H / 800, 0.6, 1.4);
      for (let j = 0; j < 5; j++) el('ellipse', { cx: (j - 2) * 15 * cs, cy: -Math.sin((j + 0.5) / 5 * Math.PI) * 9 * cs, rx: rr(11, 17) * cs, ry: rr(7, 11) * cs }, g);
      el('rect', { x: -40 * cs, y: -2 * cs, width: 80 * cs, height: 6 * cs, rx: 3 * cs }, g);
      clouds.push({ g, x: rr(-60, W + 60), y: rr(0.08, 0.95) * cloudTop, v: rr(5, 11) });
    }
    const gullG = el('g', null, skyL), gulls = [];
    for (let i = 0; i < 3; i++) {
      const g = el('g', null, gullG);
      el('path', { class: 'wing', d: 'M-6,0 Q-3,-3.4 0,0 Q3,-3.4 6,0', fill: 'none', stroke: '#4A4A52', 'stroke-width': 1.3, 'stroke-linecap': 'round', style: `animation-delay:${(-R()).toFixed(2)}s` }, g);
      gulls.push({ g, x: -40 - rr(0, 900), y: rr(0.25, 0.9) * cloudTop, v: rr(26, 40) });
    }

    // ---- the far city along the horizon, the Peristyle at the lake end, the trees between
    const lakeC = '#9DB9C4';
    const treeG = el('g', null, worldL);
    for (let i = 0, n = Math.ceil(W / 24); i < n; i++) {
      const x = lerp(0, W, (i + R() * 0.6) / n), r = rr(5, 9) * u;
      ell(treeG, x, L.hz + 2 - r * 0.6, r * 1.3, r, pick(['#5F7F4E', '#6E8B57', '#557446']), { 'stroke-width': 0.6 });
      el('ellipse', { cx: x, cy: L.hz + 2 - r * 0.6, rx: r * 1.3, ry: r }, clip);
    }
    for (const [fn, k] of L.far) { const x = k * W, t = twin(x, L.hz, u, lightAt(x)); fn(t.g, t.c, t.l, u); }
    if (L.peri) {
      const half = (L.peri[1] - L.peri[0]) / u / 2, x = (L.peri[0] + L.peri[1]) / 2;
      const t = twin(x, L.hz, u, lightAt(x));
      peristyle(t.g, t.c, t.l, u, half, lakeC);
    }

    // ---- the Grand Basin, deeper towards the viewer, with the White City on it by day and its lights by night
    const wGrad = el('linearGradient', { id: 'fair-water', gradientUnits: 'userSpaceOnUse', x1: 0, y1: L.hz, x2: 0, y2: L.shore }, defs);
    const wStops = [0, 1].map(o => el('stop', { offset: o }, wGrad));
    el('rect', { x: -2, y: L.hz, width: W + 4, height: L.shore - L.hz + 1, fill: 'url(#fair-water)' }, worldL);
    const midTop = x => L.midG - 0.06 * H + 0.04 * H * smooth(clamp(x / L.midX1, 0, 1));   // the Midway's shore line
    const wet = (x, y) => !(x < L.midX1 + 0.02 * W && y > midTop(x) - 2);
    const refl = el('g', { opacity: 0.55 }, worldL);
    for (let i = 0, n = Math.round(W / 16); i < n; i++) {
      const x = rr(0, W), w = rr(8, 26);
      el('rect', { x: x.toFixed(1), y: (L.hz + rr(1, 9)).toFixed(1), width: w.toFixed(1), height: 1.4, rx: 0.7, fill: '#F7F2E6' }, refl);
    }
    const ripples = el('g', { opacity: 0.6 }, worldL);
    for (let i = 0, n = Math.round(W * (L.shore - L.hz) / 1900); i < n; i++) {
      const x = rr(0, W), y = rr(L.hz + 8, L.shore - 4);
      if (!wet(x, y)) continue;
      el('path', { class: 'star', d: `M${x.toFixed(1)},${y.toFixed(1)} h${rr(5, 14).toFixed(1)}`, stroke: '#E4F0EF', 'stroke-width': 1, style: `--tw:${rr(1.4, 3).toFixed(2)}s;animation-delay:${(-rr(0, 3)).toFixed(2)}s` }, ripples);
    }
    const shine = el('g', null, lit(0.9));
    for (let i = 0, n = Math.round(W / 9); i < n; i++) {
      const x = rr(0, W), y0 = L.hz + rr(2, 6), len = rr(14, 56) * clamp(H / 800, 0.6, 1.4);
      if (!wet(x, y0 + len)) continue;
      el('path', { d: `M${x.toFixed(1)},${y0.toFixed(1)} v${len.toFixed(1)}`, stroke: pick(['#FFE7A3', '#FFD27A', '#FFF1C4']), 'stroke-width': rr(1, 2.2).toFixed(1), 'stroke-dasharray': `${rr(2, 5).toFixed(1)} ${rr(2, 4).toFixed(1)}`, opacity: rr(0.35, 0.7).toFixed(2) }, shine);
    }

    // ---- the Intramural Railway along the far shore
    const railY = L.railY;
    {
      const g = el('g', null, worldL);
      // a light trestle, so it reads as a railway on the far shore rather than a fence across the water
      for (let x = 6; x < W; x += 44 * s) {
        line(g, x, railY + 2 * s, x - 2.5 * s, railY + 11 * s, { stroke: '#7D7468', 'stroke-width': 0.8 });
        line(g, x, railY + 2 * s, x + 2.5 * s, railY + 11 * s, { stroke: '#7D7468', 'stroke-width': 0.8 });
      }
      rect(g, -2, railY, W + 4, 2.2 * s, '#857A6C', { 'stroke-width': 0.4 });
    }
    const ts = s * 0.85;
    const train = { g: el('g', null, worldL), l: el('g', null, lit(0.8)), x: -200, v: 70 * ts, wait: rr(0, 4), len: 93 * ts };
    for (let i = 0; i < 3; i++) {
      const x = i * 31 * ts;
      rect(train.g, x, railY - 14 * ts, 29 * ts, 12 * ts, i ? '#2F4A3A' : '#3A5946', { rx: 2 * ts });
      rect(train.g, x - 1 * ts, railY - 15.6 * ts, 31 * ts, 2.4 * ts, '#5A3A2A', { rx: 1.2 * ts });
      for (let j = 0; j < 4; j++) {
        rect(train.g, x + (3 + j * 6.4) * ts, railY - 11.6 * ts, 4.2 * ts, 4.4 * ts, '#EADFC6', { 'stroke-width': 0.4 });
        el('rect', { x: x + (3 + j * 6.4) * ts, y: railY - 11.6 * ts, width: 4.2 * ts, height: 4.4 * ts, fill: '#FFE7A0' }, train.l);
      }
      circ(train.g, x + 6 * ts, railY - 1.4 * ts, 1.8 * ts, '#2B2620'); circ(train.g, x + 23 * ts, railY - 1.4 * ts, 1.8 * ts, '#2B2620');
    }
    el('circle', { cx: 93 * ts, cy: railY - 8 * ts, r: 2.4 * ts, fill: '#FFF2C0' }, train.l);

    // ---- a gondola on the far water
    const boats = [];
    {
      const g = el('g', null, worldL), l = el('g', null, lit(0.9)), bs = s * 1.05;
      const b = el('g', { transform: `scale(${bs})` }, g);
      path(b, 'M-20,-3 Q-12,2 0,2 Q12,2 20,-3 Q22,-8 24,-11 Q20,-6 14,-4 L-14,-4 Q-20,-6 -24,-10 Q-22,-7 -20,-3 Z', '#1E1C1A');
      rect(b, -6, -10, 10, 6, '#3A2E2A', { rx: 1.2 });
      circ(b, -3, -12, 2.2, pick(SKIN)); circ(b, 2, -12, 2.1, pick(SKIN));
      ell(b, -3, -14, 3, 0.8, '#E2CB8C'); ell(b, 2, -13.8, 3.2, 0.9, '#E6D3A3');
      const gd = el('g', { transform: 'translate(14 -4)' }, b);
      rect(gd, -1.4, -10, 2.8, 10, '#2A2A30', NO);
      for (let y = -17; y < -10; y += 2) rect(gd, -2.4, y, 4.8, 1, '#F1EBDD', NO);
      circ(gd, 0, -19.6, 2.2, pick(SKIN));
      ell(gd, 0, -21.4, 3, 0.8, '#E2CB8C');
      el('line', { class: 'oar', x1: 1, y1: -16, x2: -5, y2: 6, stroke: '#6B5136', 'stroke-width': 1, 'stroke-linecap': 'round' }, gd);
      el('circle', { cx: 22 * bs, cy: -12 * bs, r: 1.8 * bs, fill: '#FFD27A' }, l);
      boats.push({ g, l, x: rr(0, W), y: L.gondolaY, v: 13 * s, w: 30 * bs, lo: -60, hi: W + 60 });
    }

    // ---- the Midway: sand under the Wheel, tents, festoons, strollers, a carousel
    path(worldL, `M-4,${midTop(0)} ${[0.25, 0.5, 0.75, 1].map(k => `L${(k * L.midX1).toFixed(1)},${midTop(k * L.midX1).toFixed(1)}`).join(' ')} L${L.midX1 + 0.03 * W},${L.pt} L-4,${L.pt} Z`, '#D8CBA4', { 'stroke-width': 0.8 });
    for (let y = midTop(0) + 12 * s; y < L.pt; y += 12 * s) el('path', { d: `M0,${y.toFixed(1)} H${L.midX1}`, stroke: '#CBBD94', 'stroke-width': 0.6 }, worldL);
    {
      const x = 0.04 * W, t = el('g', { transform: tr(x, L.midG + 2, s * 1.15) }, worldL), a = '#CE1E32', b = '#F3EADA';
      path(t, 'M-11,0 L-9.6,-9 Q0,-21 9.6,-9 L11,0 Z', a);
      for (const sx of [-5.4, 0, 5.4]) path(t, `M${sx - 1.4},0 L${sx * 0.7 - 1},-11 Q${sx * 0.2},-18 ${sx * 0.7 + 1},-11 L${sx + 1.4},0 Z`, b, NO);
      path(t, 'M-2.4,0 V-6 Q0,-8 2.4,-6 V0 Z', '#3B332B', NO);
      line(t, 0, -18.4, 0, -25, { stroke: '#4A4038', 'stroke-width': 0.8 });
      flag(t, 0, -25, 5, 3, '#D9AE3A');
    }
    const ground = L.midG + (land ? 0.045 : 0.022) * H;
    const midStroll = [];
    {
      const poles = [0.01, 0.34, 0.67, 0.98].map(k => k * L.midX1);
      const fest = el('g', null, worldL), festL = el('g', null, lit(0.4));
      poles.forEach(x => line(fest, x, ground, x, ground - 46 * s, { stroke: '#4A3E33', 'stroke-width': 1.1 }));
      for (let i = 0; i < poles.length - 1; i++) {
        const xa = poles[i], xb = poles[i + 1], ya = ground - 46 * s, sag = 5 * s;
        const d = `M${xa},${ya} Q${(xa + xb) / 2},${ya + sag * 2} ${xb},${ya}`;
        el('path', { d, fill: 'none', stroke: '#4A3E33', 'stroke-width': 0.7 }, fest);
        for (let j = 1; j < 8; j++) {
          const t = j / 8, x = lerp(xa, xb, t), y = ya + sag * 2 * 2 * t * (1 - t);
          path(fest, `M${x - 2.4 * s},${y} L${x + 2.4 * s},${y} L${x},${y + 5 * s} Z`, ['#CE1E32', '#F3EADA', '#D9AE3A', '#24356B'][j % 4], { 'stroke-width': 0.4 });
        }
        el('path', { d, fill: 'none', stroke: '#FFD27A', 'stroke-opacity': 0.35, 'stroke-width': 4 }, festL);
        el('path', { d, fill: 'none', stroke: '#FFF1C4', 'stroke-width': 2, 'stroke-dasharray': '0.01 6', 'stroke-linecap': 'round' }, festL);
      }
      for (let i = 0; i < Math.max(2, Math.round(L.midX1 / 80)); i++) {
        const type = pick(['man', 'woman', 'woman', 'man', 'girl']), sc = s * 0.74 * (type === 'girl' ? 0.7 : 1);
        const a = { g: person(worldL, type), x: rr(0, L.midX1), y: ground + rr(-3, 3) * s, s: sc, face: R() < 0.5 ? 1 : -1, walking: false, v: rr(10, 18) * sc, lo: -10, hi: L.midX1 + 10, night: R() < 0.5 };
        a.g.style.setProperty('--stp', clamp(13 * a.s / a.v, 0.24, 0.6).toFixed(2) + 's');
        midStroll.push(a);
      }
    }
    let carousel = null;
    if (L.carousel) {
      const cs = s * 1.1, cx = 0.31 * W;
      const car = el('g', { transform: tr(cx, ground, cs) }, worldL);
      rect(car, -22, -4, 44, 4, '#8E3E28');
      for (const x of [-18, -6, 6, 18]) line(car, x, -4, x, -26, { stroke: '#C9A227', 'stroke-width': 1 });
      path(car, 'M-25,-26 L0,-40 L25,-26 Z', '#CE1E32');
      for (const x of [-15, 0, 15]) path(car, `M${x - 4},-26 L0,-40 L${x + 4},-26 Z`, '#F3EADA', NO);
      line(car, 0, -40, 0, -46, { stroke: '#4A3E33', 'stroke-width': 0.8 });
      flag(car, 0, -46, 5, 3, '#D9AE3A');
      const horses = el('g', null, car);
      carousel = { list: [] };
      for (let i = 0; i < 4; i++) {
        const h = el('g', null, horses);
        path(h, 'M-4,0 Q-4,-3 0,-3 L3,-3 L5,-6 L6.5,-5 L5,-2 L5,1 L-4,1 Z', pick(['#F3EADA', '#8E3E28', '#D9AE3A', '#37658A']), { 'stroke-width': 0.5 });
        carousel.list.push({ g: h, ph: i * Math.PI / 2 });
      }
      const l = el('g', { transform: tr(cx, ground, cs) }, lit(0.5));
      el('path', { d: 'M-25,-26 L0,-40 L25,-26', fill: 'none', stroke: '#FFF1C4', 'stroke-width': 1.6, 'stroke-dasharray': '0.01 4', 'stroke-linecap': 'round' }, l);
    }

    // ---- the Statue of the Republic on its island, and its gold on the water
    const stS = L.stH / 104;
    {
      path(worldL, `M${L.stX - 3},${L.isle + 4} l2,6 l-3,6 l3,6 l-2,6 l3,5`, 'none', { stroke: GOLD2, 'stroke-width': 3, opacity: 0.45, 'vector-effect': 'none' });
      const t = el('g', { transform: tr(L.stX, L.isle, stS) }, worldL);
      ell(t, 0, 1, 20, 3.2, '#CFC6B1');
      rect(t, -12.5, -3, 25, 3, STONE2); rect(t, -10, -30, 20, 27.4, STONE); rect(t, -12, -32.2, 24, 2.8, STONE2);
      republic(t, GOLD, GOLD2);
      el('path', { transform: tr(L.stX, L.isle, stS), d: 'M-12.5,0 V-32.2 H-6.4 L-4.6,-63.4 L-8.6,-76 L-7.2,-88.4 L-8.6,-100.6 L-7.6,-105.6 L-4.4,-103.6 L-5.4,-88.2 L-2.6,-64.4 H2.6 L5.4,-88.2 L3.3,-91.4 L1.4,-97.6 L6.3,-96.8 L11.2,-97.6 L9.3,-91.4 L7.2,-88.4 L8.6,-76 L4.6,-63.4 L6.4,-32.2 H12.5 V0 Z' }, clip);
      const l = el('g', { transform: tr(L.stX, L.isle, stS) }, lit(lightAt(L.stX)));
      el('ellipse', { cx: 0, cy: -60, rx: 26, ry: 44, fill: 'url(#fair-glow)', opacity: 0.55 }, l);
      republic(l, GOLD2, '#FFF3C4');
    }

    // ---- the electric fountain: white by day, changing colour at night
    const jets = [];
    {
      const x = L.fX, y = L.fY, size = L.fS;
      ell(worldL, x, y + size * 0.02, size * 0.56, size * 0.11, '#CFC6B1');
      ell(worldL, x, y, size * 0.5, size * 0.085, '#9FC2C6', { 'stroke-width': 0.6 });
      const day = el('g', { opacity: 0.88 }, worldL), night = el('g', null, lit(lightAt(x) + 0.3));
      const curves = [`M${x},${y} C${x - 1},${y - size * 0.9} ${x + 1},${y - size * 0.9} ${x},${y - size * 0.05}`];
      for (const i of [1, 2, 3]) for (const sg of [-1, 1]) {
        const x0 = x + sg * size * 0.04 * i, x1 = x + sg * size * 0.15 * i;
        curves.push(`M${x0},${y} Q${x + sg * size * 0.1 * i},${y - size * (0.62 - i * 0.12)} ${x1},${y - size * 0.02}`);
      }
      for (const d of curves) {
        el('path', { class: 'jet', d, fill: 'none', stroke: '#F4FAF8', 'stroke-width': Math.max(1.3, size * 0.022), 'stroke-dasharray': '7 5', 'stroke-linecap': 'round' }, day);
        const glow = el('path', { d, fill: 'none', 'stroke-width': Math.max(4, size * 0.07), 'stroke-opacity': 0.3, 'stroke-linecap': 'round' }, night);
        const core = el('path', { class: 'jet', d, fill: 'none', 'stroke-width': Math.max(1.5, size * 0.026), 'stroke-dasharray': '7 5', 'stroke-linecap': 'round' }, night);
        jets.push(glow, core);
      }
    }

    // ---- an electric launch near the shore: it keeps to the basin
    {
      const g = el('g', null, worldL), l = el('g', null, lit(0.9)), bs = s * 1.05;
      const b = el('g', { transform: `scale(${bs})` }, g);
      path(b, 'M-22,-4 L22,-4 Q20,2 12,3 L-14,3 Q-21,1 -22,-4 Z', '#F2EDE2');
      path(b, 'M-21,-1 H21', 'none', { stroke: '#8E3E28', 'stroke-width': 1 });
      for (const x of [-16, 8]) line(b, x, -4, x, -15, { stroke: '#4A4038', 'stroke-width': 0.8 });
      path(b, 'M-19,-15 H11 L12,-12 H-20 Z', '#CE1E32');
      for (let x = -17; x < 10; x += 6) rect(b, x, -15, 3, 3, '#F3EADA', NO);
      for (const x of [-12, -6, 0, 6]) { circ(b, x, -6.6, 2, pick(SKIN)); rect(b, x - 2, -5, 4, 1.4, pick(SUIT), NO); }
      line(b, 18, -4, 18, -12, { stroke: '#4A4038', 'stroke-width': 0.7 });
      flag(b, 18, -12, 5, 3, '#24356B');
      el('circle', { cx: -20 * bs, cy: -9 * bs, r: 1.8 * bs, fill: '#FFD27A' }, l);
      boats.push({ g, l, x: rr(L.midX1 + 0.1 * W, W), y: L.launchY, v: -18 * s, w: 30 * bs, lo: L.midX1 + 0.05 * W, hi: W + 60 });
    }

    // ---- the near shore: a white balustrade and a lawn of flowerbeds; the promenade below everything
    const shoreX = L.midX1 + 0.025 * W;
    rect(worldL, shoreX, L.shore, W - shoreX + 2, L.pt - L.shore + 2, '#A7B57A', { 'stroke-width': 0.6 });
    const bal = el('g', null, worldL);
    rect(bal, shoreX, L.shore - 7 * s, W - shoreX + 2, 1.6 * s, STONE, { 'stroke-width': 0.5 });
    rect(bal, shoreX, L.shore - 1.4 * s, W - shoreX + 2, 1.6 * s, STONE2, { 'stroke-width': 0.5 });
    for (let x = shoreX; x < W; x += 5 * s) el('rect', { x: x.toFixed(1), y: L.shore - 5.6 * s, width: 1.8 * s, height: 4.4 * s, fill: '#E9E2D2' }, bal);
    for (let x = shoreX + 10 * s; x < W - 8 * s; x += 26 * s) {
      const y = L.shore + (L.pt - L.shore) * 0.5;
      ell(worldL, x, y, 9 * s, Math.min(2.6 * s, (L.pt - L.shore) * 0.35), '#7E9A5A', { 'stroke-width': 0.4 });
      for (let j = 0; j < 5; j++) el('circle', { cx: (x + (j - 2) * 3.2 * s).toFixed(1), cy: (y - 0.6 * s + (j % 2) * 1.2 * s).toFixed(1), r: 1.1 * s, fill: ['#CE1E32', '#F3D57E', '#F3EADA'][j % 3] }, worldL);
    }
    rect(worldL, -2, L.pt, W + 4, H - L.pt + 2, '#DCCFAC', { 'stroke-width': 0.6 });
    for (let y = L.pt + 9 * s; y < H; y += 9 * s) el('path', { d: `M0,${y.toFixed(1)} H${W}`, stroke: '#CFC09A', 'stroke-width': 0.6 }, worldL);

    // ---- a mosaic plaza in the middle of the promenade: a rosette laid in the five disciplines' colours,
    // the ground itself tiled like the board, and the pigeons' favourite spot
    const plazaC = { x: 0.5 * W, y: land ? L.pt + 0.66 * (H - L.pt) : L.pt + 0.72 * (H - L.pt), rx: land ? clamp(0.2 * W, 120, 360) : clamp(0.36 * W, 90, 200) };
    plazaC.ry = plazaC.rx * (land ? 0.15 : 0.17);
    {
      const g = el('g', { transform: `translate(${plazaC.x.toFixed(1)} ${plazaC.y.toFixed(1)}) scale(1 ${(plazaC.ry / plazaC.rx).toFixed(3)})` }, worldL);
      const rx = plazaC.rx, sw = { stroke: '#6B5B44', 'stroke-width': 0.5, 'vector-effect': 'non-scaling-stroke' };
      const tc = KC.map(c => mix(c, '#E2D2AE', 0.14));
      const pt2 = (r, a) => `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
      const ring = (r0, r1, n, cols) => {
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * 2 * Math.PI + 0.012, a1 = ((i + 1) / n) * 2 * Math.PI - 0.012;
          el('path', Object.assign({ d: `M${pt2(r0, a0)} A${r0},${r0} 0 0 1 ${pt2(r0, a1)} L${pt2(r1, a1)} A${r1},${r1} 0 0 0 ${pt2(r1, a0)} Z`, fill: cols[i % cols.length] }, sw), g);
        }
      };
      el('circle', Object.assign({ r: rx, fill: '#CDBB95' }, sw), g);
      ring(rx * 0.86, rx * 0.97, 40, tc);
      ring(rx * 0.74, rx * 0.84, 32, ['#F1E7D2', '#E3D6B9']);
      for (let i = 0; i < 10; i++) el('path', Object.assign({ d: `M0,0 Q${(rx * 0.13).toFixed(1)},${(-rx * 0.32).toFixed(1)} 0,${(-rx * 0.7).toFixed(1)} Q${(-rx * 0.13).toFixed(1)},${(-rx * 0.32).toFixed(1)} 0,0 Z`, transform: `rotate(${i * 36})`, fill: tc[i % 5] }, sw), g);
      el('circle', Object.assign({ r: rx * 0.13, fill: '#D3A632' }, sw), g);
      el('circle', { r: rx * 0.07, fill: '#F3D57E' }, g);
    }
    // flags along the basin's edge, swallowtails in the Fair's colours
    {
      const g = el('g', null, worldL), cols = ['#CE1E32', '#D9AE3A', '#24356B', '#3C8B51', '#F3EADA', '#8E3E28'], ph = (land ? 0.085 : 0.07) * H;
      let i = 0;
      for (let x = shoreX + 0.04 * W; x < W - 0.02 * W; x += (land ? 0.075 : 0.13) * W) {
        if ([L.stX, L.fX].some(a => Math.abs(a - x) < (land ? 0.035 : 0.07) * W)) continue;
        limb(g, x, L.shore - 1, x, L.shore - ph, 1.2, '#F4EFE3');
        circ(g, x, L.shore - ph - 1.6, 1.7, GOLD, { 'stroke-width': 0.5 });
        el('path', { class: 'flag', d: `M${x.toFixed(1)},${(L.shore - ph + 1).toFixed(1)} h${(13 * s).toFixed(1)} l${(-3.4 * s).toFixed(1)},${(4.4 * s).toFixed(1)} l${(3.4 * s).toFixed(1)},${(4.4 * s).toFixed(1)} h${(-13 * s).toFixed(1)} Z`, fill: cols[i++ % cols.length], stroke: INK, 'stroke-width': 0.5, style: `animation-delay:${(-R() * 1.2).toFixed(2)}s` }, g);
      }
    }

    // ---- the pavilions: the board's wall, five galleries of five
    const pav = [0, 1].map(n => {
      const cx = L.pavX[n], w = L.pw, base = L.pb;
      const g = el('g', null, worldL), gl = lit(1.1);
      const pw = w * 0.04, bw = (w - 6 * pw) / 5, bh = bw * 1.08, rg = bw * 0.26;
      const plinth = bw * 0.55, facH = 5 * bh + 6 * rg;
      const top = base - plinth - facH, x0 = cx - w / 2;
      rect(g, x0 - w * 0.04, base - plinth, w * 1.08, plinth, STONE2);
      rect(g, x0, top, w, facH, STONE);
      const nat = NATION[n];
      if (n === 0) {
        rect(g, x0 - 3, top - 4, w + 6, 4, STONE2);
        path(g, `M${cx - w * 0.3},${top - 4} C${cx - w * 0.3},${top - w * 0.42} ${cx + w * 0.3},${top - w * 0.42} ${cx + w * 0.3},${top - 4} Z`, '#EDE5D2');
        path(g, `M${cx},${top - w * 0.32} C${cx + w * 0.17},${top - w * 0.31} ${cx + w * 0.3},${top - w * 0.2} ${cx + w * 0.3},${top - 4} L${cx + w * 0.14},${top - 4} C${cx + w * 0.14},${top - w * 0.2} ${cx + w * 0.07},${top - w * 0.29} ${cx},${top - w * 0.32} Z`, '#D9CFBA', NO);
        line(g, cx, top - w * 0.32, cx, top - w * 0.46, { stroke: '#4A4038', 'stroke-width': 1 });
        flag(g, cx, top - w * 0.46, w * 0.13, w * 0.08, nat.a);
      } else {
        path(g, `M${x0 - 3},${top} L${cx},${top - w * 0.2} L${x0 + w + 3},${top} Z`, STONE2);
        for (const tx of [x0 + w * 0.1, x0 + w * 0.9]) {
          rect(g, tx - w * 0.06, top - w * 0.3, w * 0.12, w * 0.3, STONE);
          path(g, `M${tx - w * 0.07},${top - w * 0.3} L${tx},${top - w * 0.42} L${tx + w * 0.07},${top - w * 0.3} Z`, nat.a);
          line(g, tx, top - w * 0.42, tx, top - w * 0.5, { stroke: '#4A4038', 'stroke-width': 1 });
          flag(g, tx, top - w * 0.5, w * 0.1, w * 0.065, nat.b);
        }
      }
      const bunt = el('g', null, g);
      for (let i = 0; i < 9; i++) {
        const bx = x0 + w * (i + 0.5) / 9, bwd = w / 9;
        path(bunt, `M${bx - bwd * 0.45},${top + 1} L${bx + bwd * 0.45},${top + 1} L${bx},${top + 1 + bwd * 0.5} Z`, i % 2 ? nat.b : nat.a, { 'stroke-width': 0.5 });
      }
      const bays = [], glows = el('g', null, gl);
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
        const bx = x0 + pw + c * (bw + pw), by = top + rg + r * (bh + rg) + bw * 0.12, k = kindAt(r, c), rad = bw / 2;
        const d = `M${bx},${by + bh} V${by + rad} A${rad},${rad} 0 0 1 ${bx + bw},${by + rad} V${by + bh} Z`;
        path(g, d, mix(KC[k], '#E8DEC9', 0.8), { 'stroke-width': 0.6 });
        if (bw > 12) el('use', { href: '#ic-' + KIND[k], x: bx + bw * 0.22, y: by + bh * 0.3, width: bw * 0.56, height: bw * 0.56, opacity: 0.32, style: `color:${KC[k]};--t-bg:transparent` }, g);
        const fillG = el('g', { class: 'bayfill', opacity: 0, display: 'none' }, g);
        path(fillG, d, KC[k], { stroke: KBD[k], 'stroke-width': 0.9 });
        if (bw > 9) el('use', { href: '#ic-' + KIND[k], x: bx + bw * 0.2, y: by + bh * 0.3, width: bw * 0.6, height: bw * 0.6, style: `color:${KIC[k]};--t-bg:${KC[k]}` }, fillG);
        const glow = el('g', { display: 'none' }, glows);
        el('ellipse', { cx: bx + bw / 2, cy: by + bh / 2, rx: bw * 0.72, ry: bh * 0.68, fill: KGLOW[k], opacity: 0.2 }, glow);
        el('path', { d, fill: mix(KGLOW[k], KC[k], 0.25) }, glow);
        if (bw > 9) el('use', { href: '#ic-' + KIND[k], x: bx + bw * 0.2, y: by + bh * 0.3, width: bw * 0.6, height: bw * 0.6, style: `color:${k === 3 ? '#3A2E06' : '#FFFBEF'};--t-bg:transparent` }, glow);
        bays.push({ fillG, glow, on: false });
      }
      const dw = bw * 0.9;
      path(g, `M${cx - dw / 2},${base} V${base - plinth * 0.9 + dw / 2 * 0.4} Q${cx},${base - plinth * 1.2} ${cx + dw / 2},${base - plinth * 0.9 + dw / 2 * 0.4} V${base} Z`, '#4A3E33', { 'stroke-width': 0.6 });
      el('path', { d: `M${cx - dw * 0.36},${base} V${base - plinth * 0.75} Q${cx},${base - plinth * 1.05} ${cx + dw * 0.36},${base - plinth * 0.75} V${base} Z`, fill: '#FFD98A', opacity: 0.7 }, gl);
      bulbs(gl, `M${x0},${top + 0.5} H${x0 + w} M${x0 - w * 0.04},${base - plinth} H${x0 + w * 1.04}`, 1);
      const scaff = el('g', { class: 'scaff' }, g);
      for (let c = 0; c <= 5; c++) line(scaff, x0 + c * (bw + pw) + pw / 2, top - w * 0.06, x0 + c * (bw + pw) + pw / 2, base - plinth, { stroke: '#8B6B45', 'stroke-width': 1.2 });
      for (let r = 0; r <= 5; r++) line(scaff, x0 - 2, top + r * (bh + rg) + rg * 0.4, x0 + w + 2, top + r * (bh + rg) + rg * 0.4, { stroke: '#9C7A50', 'stroke-width': 1.4 });
      for (let r = 0; r < 5; r++) line(scaff, x0 + pw / 2, top + r * (bh + rg) + rg * 0.4, x0 + w * 0.36, top + (r + 1) * (bh + rg) + rg * 0.4, { stroke: '#8B6B45', 'stroke-width': 0.8 });
      const mastX = n ? x0 + w * 0.22 : x0 + w * 0.78;
      line(scaff, mastX, top - w * 0.06, mastX, top - w * 0.55, { stroke: '#6B5136', 'stroke-width': 1.6 });
      line(scaff, mastX, top - w * 0.5, mastX + (n ? 1 : -1) * w * 0.3, top - w * 0.36, { stroke: '#6B5136', 'stroke-width': 1.2 });
      const hoist = el('g', { class: 'hoist', style: `--lift:${(-w * 0.12).toFixed(1)}px;animation-delay:${(-rr(0, 3)).toFixed(2)}s` }, scaff);
      const hx = mastX + (n ? 1 : -1) * w * 0.28;
      line(hoist, hx, top - w * 0.37, hx, top - w * 0.12, { stroke: '#4A4038', 'stroke-width': 0.6 });
      rect(hoist, hx - w * 0.04, top - w * 0.12, w * 0.08, w * 0.06, STONE2, { 'stroke-width': 0.6 });
      return {
        bays, door: { x: cx, y: base - 1 },
        idle: [1, 2, 3, 4].map(i => ({ x: cx + (n ? -1 : 1) * (w / 2 + 6 * s + i * 9 * s), y: base })),
        sync(list, pop) {
          let count = 0;
          list.forEach((k, i) => {
            const b = bays[i], on = k >= 0;
            if (on) count++;
            if (on === b.on) return;
            b.on = on;
            b.glow.setAttribute('display', on ? 'inline' : 'none');
            if (on) {
              b.fillG.setAttribute('display', 'inline');
              b.fillG.setAttribute('opacity', 1);
              if (pop) { b.fillG.classList.remove('pop'); void b.fillG.getBoundingClientRect(); b.fillG.classList.add('pop'); }
            } else {
              b.fillG.setAttribute('opacity', 0);
              setTimeout(() => { if (!b.on) b.fillG.setAttribute('display', 'none'); }, 1500);
            }
          });
          scaff.setAttribute('opacity', clamp(1 - count / 15, 0, 1).toFixed(2));
        },
      };
    });

    // ---- the promenade: lamps, a Cracker Jack cart, the agencies and the gate, and everyone on it
    const farLane = el('g', null, worldL), kioskL = el('g', null, worldL), craftL = el('g', null, worldL);
    const midLane = el('g', null, worldL), pigeonL = el('g', null, worldL), nearLane = el('g', null, worldL);
    const lampXs = [];
    for (let i = 0; i < L.items.length - 1; i++) lampXs.push((L.items[i] + L.items[i + 1]) / 2);
    lampXs.push(L.items[0] - 0.045 * W, L.items[L.items.length - 1] + 0.045 * W);
    for (const x of lampXs) {
      const g = el('g', { transform: tr(x, L.kb - 3 * s, s) }, kioskL);
      rect(g, -1.1, -52, 2.2, 52, '#2F3B33', NO);
      rect(g, -3, -3, 6, 3, '#2F3B33', NO);
      path(g, 'M-1,-46 Q-6,-48 -7,-52 M1,-46 Q6,-48 7,-52', 'none', { stroke: '#2F3B33', 'stroke-width': 1 });
      for (const lx of [-7, 0, 7]) circ(g, lx, lx ? -54.5 : -56.5, 2.6, '#F4EDDC', { 'stroke-width': 0.6 });
      const l = el('g', { transform: tr(x, L.kb - 3 * s, s) }, lit(lightAt(x) + 0.2));
      el('circle', { cx: 0, cy: -55, r: 20, fill: 'url(#fair-glow)' }, l);
      for (const lx of [-7, 0, 7]) el('circle', { cx: lx, cy: lx ? -54.5 : -56.5, r: 2.6, fill: '#FFF0BF' }, l);
    }
    if (land) {
      const x = L.items[L.items.length - 1] + 0.08 * W, cj = el('g', { transform: tr(x, L.foot[0], s * 1.1) }, kioskL);
      rect(cj, -10, -12, 20, 10, '#CE1E32', { rx: 1 });
      rect(cj, -8, -10, 16, 4, '#F3D57E', NO);
      circ(cj, -6, -1, 2.4, '#3A332B'); circ(cj, 6, -1, 2.4, '#3A332B');
      line(cj, -10, -12, -10, -22, { stroke: '#4A3E33', 'stroke-width': 0.8 }); line(cj, 10, -12, 10, -22, { stroke: '#4A3E33', 'stroke-width': 0.8 });
      path(cj, 'M-12,-22 H12 L10,-19 H-10 Z', '#F3EADA');
      const vendor = person(kioskL, 'man');
      vendor.setAttribute('transform', tr(x + 14 * s, L.foot[0] + 1, s * 0.95, true));
    }
    const kiosks = [];
    L.items.forEach((x, i) => {
      if (i === L.gateI) return;
      // An agency: a striped dais its four craftspeople stand up on, tiles raised, which is a display on the
      // board, and a signpost with the agency's board and pennant.
      const g = el('g', { transform: tr(x, L.kb, s) }, kioskL);
      el('ellipse', { cx: 0, cy: 0.8, rx: 28, ry: 3.4, fill: '#3C2D1E', opacity: 0.16 }, g);
      path(g, 'M-25,-8.4 L25,-8.4 L26.4,0 L-26.4,0 Z', '#CE1E32');
      for (let j = -19.8; j <= 20; j += 9.9) path(g, `M${j - 2.4},-8.4 L${j + 2.4},-8.4 L${(j + 2.4) * 1.05},0 L${(j - 2.4) * 1.05},0 Z`, '#F3EADA', NO);
      ell(g, 0, -8.4, 25, 3.3, '#EADFC6');
      line(g, 31, 0, 31, -52, { stroke: '#4A3E33', 'stroke-width': 1.3 });
      rect(g, 26, -50, 14, 10, '#F3EADA', { 'stroke-width': 0.8 });
      rect(g, 27.6, -48.4, 10.8, 1.8, '#CE1E32', NO);
      rect(g, 27.6, -45, 7.6, 1.1, '#B8A98A', NO);
      rect(g, 27.6, -42.8, 9.4, 1.1, '#B8A98A', NO);
      flag(g, 31, -58, 7, 4, '#CE1E32');
      line(g, 31, -52, 31, -58, { stroke: '#4A3E33', 'stroke-width': 0.9 });
      const l = el('g', { transform: tr(x, L.kb, s) }, lit(lightAt(x) + 0.25));
      el('circle', { cx: 31, cy: -38, r: 13, fill: 'url(#fair-glow)' }, l);
      el('circle', { cx: 31, cy: -38, r: 1.9, fill: '#FFF0BF' }, l);
      circ(g, 31, -38, 1.9, '#F4EDDC', { 'stroke-width': 0.6 });
      kiosks.push({ x, slots: [-17, -6, 6, 17].map((dx, j) => ({ x: x + dx * s, y: L.kb - (8.6 + (j % 2) * 1.1) * s, c: null })) });
    });
    const gate = { x: L.items[L.gateI], people: [], spots: [] };
    {
      const g = el('g', { transform: tr(gate.x, L.kb, s) }, kioskL);
      for (const sx of [-1, 1]) {
        rect(g, sx * 15 - 2, -34, 4, 34, '#2F3B33', NO);
        circ(g, sx * 15, -36, 2.4, '#D3A632', { 'stroke-width': 0.5 });
      }
      path(g, 'M-15,-30 Q0,-50 15,-30', 'none', { stroke: '#2F3B33', 'stroke-width': 2.2 });
      path(g, 'M-15,-26 Q0,-42 15,-26', 'none', { stroke: '#2F3B33', 'stroke-width': 1 });
      for (const sx of [-9, -3, 3, 9]) path(g, `M${sx},${-30 - (1 - (sx / 15) ** 2) * 12} q2,3 0,5 q-2,2 0,4`, 'none', { stroke: '#2F3B33', 'stroke-width': 0.8 });
      circ(g, 0, -45, 3, '#F4EDDC', { 'stroke-width': 0.6 });
      const l = el('g', { transform: tr(gate.x, L.kb, s) }, lit(0.2));
      el('circle', { cx: 0, cy: -45, r: 16, fill: 'url(#fair-glow)' }, l);
      el('circle', { cx: 0, cy: -45, r: 3, fill: '#FFF0BF' }, l);
      for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) {
        const dx = (i % 2 ? 1 : -1) * (7 + ((i / 2) | 0) * 11) + (row % 2) * 5;
        gate.spots.push({ x: gate.x + dx * s, y: L.kb + (3 + row * 5) * s, c: null });
      }
    }

    // ---- the promenade's life: a bandstand, a balloon seller, rolling chairs, a boy with a hoop and his
    // dog, pigeons on the mosaic, and a photographer with his flash powder
    if (land && W >= 1000) {
      const bx = (L.pavX[0] + L.pw / 2 + L.items[0] - 0.045 * W) / 2, by = L.foot[0] + 2 * s, bs = s * 1.05;
      const g = el('g', { transform: tr(bx, by, bs) }, kioskL);
      rect(g, -34, -11, 68, 11, '#F1E7D2');
      for (let x = -32; x < 33; x += 6) {
        line(g, x, -10, x + 5, -1, { stroke: '#B8A27A', 'stroke-width': 0.6 });
        line(g, x + 5, -10, x, -1, { stroke: '#B8A27A', 'stroke-width': 0.6 });
      }
      rect(g, -37, -14, 74, 3.2, '#CE1E32');
      [[-21, 'tuba'], [-7, 'cornet'], [7, 'cornet'], [21, 'drum']].forEach(([mx, inst], i) => {
        const m = person(g, 'man', { coat: '#24356B' });
        m.setAttribute('transform', `translate(${mx} -14) scale(.58)`);
        const ins = el('g', { class: 'play', style: `animation-delay:${(-i * 0.13).toFixed(2)}s` }, g);
        if (inst === 'tuba') {
          path(ins, `M${mx - 2},-23 q-4,6 1,9`, 'none', { stroke: GOLDD, 'stroke-width': 1.6 });
          circ(ins, mx + 2.5, -27, 5.2, GOLD, { stroke: GOLDD });
          el('circle', { cx: mx + 2.5, cy: -27, r: 2.6, fill: '#8C6A14' }, ins);
        } else if (inst === 'drum') {
          rect(ins, mx - 5, -24, 10, 8, '#F3EADA');
          rect(ins, mx - 5.5, -24.6, 11, 1.6, '#CE1E32', NO);
          rect(ins, mx - 5.5, -17, 11, 1.6, '#CE1E32', NO);
        } else path(ins, `M${mx + 2},-29 l7,-2 l1.6,2.6 l-1.6,2.6 l-7,-2 Z`, GOLD, { stroke: GOLDD });
      });
      for (const px of [-33, -16.5, 0, 16.5, 33]) limb(g, px, -14, px, -48, 1.8, '#F3EADA');
      path(g, 'M-41,-48 Q-38,-58 -22,-62 Q-7,-66 0,-79 Q7,-66 22,-62 Q38,-58 41,-48 Z', '#CE1E32');
      for (const sx of [-26, -9, 9, 26]) path(g, `M${sx - 3.5},-49 Q${(sx * 0.55 - 1.5).toFixed(1)},-63 0,-77.5 Q${(sx * 0.55 + 1.5).toFixed(1)},-63 ${sx + 3.5},-49 Z`, '#F3EADA', NO);
      const val = [];
      for (let x = -41; x < 41; x += 6.8) val.push(`Q${(x + 3.4).toFixed(1)},-43 ${(x + 6.8).toFixed(1)},-48`);
      path(g, `M-41,-48 ${val.join(' ')} Z`, '#F3EADA', { 'stroke-width': 0.5 });
      line(g, 0, -79, 0, -86, { stroke: '#4A3E33', 'stroke-width': 0.8 });
      flag(g, 0, -86, 6, 3.6, '#D9AE3A');
      for (let i = 0; i < 6; i++) {
        const nx = [-46, -40, 38, 44, -43, 41][i], ny = -30 - (i % 3) * 5;
        const n = el('g', { class: 'note', style: `animation-delay:${(i * 0.57).toFixed(2)}s` }, g);
        el('ellipse', { cx: nx, cy: ny, rx: 2.2, ry: 1.6, fill: INK, transform: `rotate(-20 ${nx} ${ny})` }, n);
        el('path', { d: `M${nx + 2},${ny} V${ny - 8} q3,1 4,4`, fill: 'none', stroke: INK, 'stroke-width': 0.9 }, n);
      }
      const l = el('g', { transform: tr(bx, by, bs) }, lit(lightAt(bx) + 0.1));
      el('ellipse', { cx: 0, cy: -30, rx: 36, ry: 18, fill: 'url(#fair-glow)', opacity: 0.6 }, l);
      bulbs(l, 'M-41,-48 Q-38,-58 -22,-62 Q-7,-66 0,-79 Q7,-66 22,-62 Q38,-58 41,-48', 1);
    }
    // the balloon seller, whose bunch now and then lets one go
    const seller = { x: land ? Math.min(0.83 * W, W - L.pw - 0.035 * W) : 0.64 * W, y: land ? L.foot[1] - 1 : L.foot[2] - 1, sc: s, next: rr(5, 10) };
    {
      const g = el('g', { transform: tr(seller.x, seller.y, seller.sc) }, midLane);
      person(g, 'man');
      const bunch = el('g', null, g);
      seller.balloons = [[-12, -78], [-4, -84], [5, -80], [13, -86], [-8, -92], [3, -95], [12, -96]].map(([bx, by], i) => {
        const b = el('g', { class: 'bob', style: `animation-delay:${(-i * 0.37).toFixed(2)}s` }, bunch);
        const col = ['#E8322F', '#2F6FD0', '#F2C230', '#3FA35A', '#9A4FD0', '#F07A2A', '#F4F0E6'][i];
        el('path', { d: `M1,-22 Q${((1 + bx) / 2 + 3).toFixed(1)},${((by - 22) / 2).toFixed(1)} ${bx},${by + 5}`, fill: 'none', stroke: '#6A5F59', 'stroke-width': 0.5 }, b);
        el('ellipse', { cx: bx, cy: by, rx: 4.6, ry: 5.6, fill: col, stroke: INK, 'stroke-width': 0.6, 'vector-effect': 'non-scaling-stroke' }, b);
        el('ellipse', { cx: bx - 1.5, cy: by - 2, rx: 1.2, ry: 1.8, fill: '#FFFFFF', opacity: 0.55 }, b);
        el('path', { d: `M${bx - 1},${by + 5.4} l1,1.2 l1,-1.2 Z`, fill: col }, b);
        return { g: b, x: bx, y: by, col, away: false };
      });
    }
    const loose = [];                                   // balloons that got away, rising over the Fair
    // rolling chairs: wicker chairs the Fair rented by the hour, pushed by an attendant
    const chairs = [];
    for (let i = 0; i < (land ? 2 : 1); i++) {
      const g = el('g', null, midLane);
      const att = person(g, 'man', { coat: '#2A3A57' });
      att.setAttribute('transform', 'translate(-18 0)');
      att.style.setProperty('--stp', '0.42s');
      if (!STILL) att.classList.add('walk');
      const skin = pick(SKIN), dress = pick(SKIRT), hatC = pick(['#E6D3A3', '#F1EBDD', '#D9C08A']);
      path(g, 'M-12,-9 L13,-9 L14,-15 L-1,-15 L-4,-33 Q-7.5,-36 -11.5,-33 Z', '#B98A4E');
      for (let y = -31; y < -10; y += 3.4) path(g, `M-10.5,${y} L${y > -15 ? 12 : -3},${y}`, 'none', { stroke: '#8C6236', 'stroke-width': 0.5 });
      path(g, 'M-1,-15 L11,-15 Q15,-13 14.5,-9 L2,-9 Z', dress);
      path(g, 'M-6.5,-15 L1,-15 L1.6,-27 Q-2.4,-29.6 -6.2,-27 Z', tint(dress, 0.25));
      circ(g, -2.4, -31.4, 3.6, skin);
      circ(g, -0.6, -32, 0.4, INK, NO);
      ell(g, -2, -34.6, 6.6, 1.4, hatC);
      path(g, 'M-5,-34.8 Q-5,-38 -2,-38 Q1,-38 1,-34.8 Z', hatC);
      circ(g, -4.4, -37.4, 1.1, pick(RIBBON), NO);
      line(g, -12.5, -30, -16.5, -27.5, { stroke: '#3A332B', 'stroke-width': 1.2 });
      line(g, -11, -33, -11, -46, { stroke: '#4A4038', 'stroke-width': 0.8 });
      line(g, 12, -15, 12, -46, { stroke: '#4A4038', 'stroke-width': 0.8 });
      path(g, 'M-14,-46 H15 L13,-42 H-12 Z', '#CE1E32');
      for (let x = -12; x < 13; x += 4) path(g, `M${x},-42 l2,2.4 l2,-2.4`, 'none', { stroke: '#F3EADA', 'stroke-width': 0.6 });
      const wheel1 = el('g', { transform: 'translate(-3 -7.5)' }, g);
      circ(wheel1, 0, 0, 7.5, 'none', { stroke: '#3A332B', 'stroke-width': 1.4 });
      for (let a = 0; a < 6; a++) line(wheel1, 0, 0, Math.cos(a * Math.PI / 3) * 7, Math.sin(a * Math.PI / 3) * 7, { stroke: '#5A4E44', 'stroke-width': 0.5 });
      circ(g, 12.5, -3.6, 3.6, 'none', { stroke: '#3A332B', 'stroke-width': 1.2 });
      chairs.push({ g, wheel: wheel1, x: rr(0, W), y: L.foot[1] + rr(-2, 2) * s, s, face: R() < 0.5 ? 1 : -1, v: rr(14, 18) * s, turn: 0 });
    }
    // a boy rolling a hoop, and his dog after him
    const runner = { g: el('g', null, nearLane), x: rr(0, W), y: L.foot[2] - 1, s: s * 1.05, face: 1, v: 46 * s, turn: 0 };
    {
      const g = runner.g, boy = person(g, 'boy');
      boy.setAttribute('transform', 'scale(.72)');
      boy.style.setProperty('--stp', '0.17s');
      if (!STILL) boy.classList.add('walk');
      runner.hoop = el('g', { transform: 'translate(16 -9.5)' }, g);
      el('circle', { r: 9.2, fill: 'none', stroke: '#8B6B45', 'stroke-width': 1.5 }, runner.hoop);
      el('path', { d: 'M0,-9.2 A9.2,9.2 0 0 1 6.5,-6.5', fill: 'none', stroke: '#CE1E32', 'stroke-width': 1.7 }, runner.hoop);
      line(g, 3.5, -16, 9.5, -15, { stroke: '#6B5136', 'stroke-width': 0.9 });
      const dog = el('g', { transform: 'translate(-26 0)', class: STILL ? '' : 'trot' }, g);
      for (const side of ['b', 'a']) {
        const lg = el('g', { class: 'lg ' + side }, dog);
        line(lg, -4.6, -6, -4.6, -0.4, { stroke: '#7A5230', 'stroke-width': 1.4 });
        line(lg, 4, -6, 4, -0.4, { stroke: '#7A5230', 'stroke-width': 1.4 });
      }
      ell(dog, 0, -7.6, 7, 3.6, '#B07A45');
      circ(dog, 7.6, -10.6, 3, '#B07A45');
      path(dog, 'M6.6,-13.2 l-1.6,4.2 l2.4,-0.8 Z', '#7A5230', NO);
      path(dog, 'M10.2,-10.6 l2.4,0.6 l-2.2,1.2 Z', '#3A2A1E', NO);
      el('path', { class: STILL ? '' : 'wag', d: 'M-6.6,-9 q-3,-4 -4.6,-5', fill: 'none', stroke: '#B07A45', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, dog);
    }
    // pigeons pecking on the mosaic, which flutter up and land somewhere else
    const plazaSpot = () => { const a = rr(0, 2 * Math.PI), r = Math.sqrt(R()) * 0.82; return { x: plazaC.x + Math.cos(a) * r * plazaC.rx, y: plazaC.y + Math.sin(a) * r * plazaC.ry }; };
    const pigeons = [];
    for (let i = 0; i < (land ? 8 : 5); i++) {
      const g = el('g', null, pigeonL), body2 = el('g', { class: STILL ? '' : 'peck', style: `animation-delay:${(-rr(0, 2)).toFixed(2)}s` }, g);
      ell(body2, 0, -3.2, 4.2, 2.6, '#8C8E96', { 'stroke-width': 0.6 });
      circ(body2, 3.6, -5.2, 1.7, '#6E7079', { 'stroke-width': 0.5 });
      path(body2, 'M5.2,-5.4 l1.7,.5 l-1.7,.5 Z', '#C9A227', NO);
      path(body2, 'M-4,-3.6 l-3,-1.2 l1,2.2 Z', '#6E7079', NO);
      const wing = el('path', { class: 'wing', d: 'M-2.4,-4 Q1,-11 4.4,-4 Z', fill: '#A9ABB3', stroke: INK, 'stroke-width': 0.5, display: 'none' }, g);
      const sp = plazaSpot();
      pigeons.push({ g, wing, x: sp.x, y: sp.y, face: R() < 0.5 ? 1 : -1, fly: null });
    }
    let nextFlutter = rr(1, 3);
    // a photographer under his black cloth, a family holding still, and now and then a puff of flash powder
    let flash = null;
    if (land && W >= 1100) {
      const px = 0.385 * W, py = L.foot[2] - 1;
      const g = el('g', { transform: tr(px, py, s) }, nearLane);
      for (const [x2, y2] of [[2, 0], [10, 0], [6, 0]]) line(g, 6, -27, x2, y2, { stroke: '#6B5136', 'stroke-width': 0.9 });
      rect(g, 1, -35, 11, 8.5, '#5A3A2A', { rx: 1 });
      rect(g, 12, -33.5, 4.4, 5, '#3A2E2A', { 'stroke-width': 0.5 });
      circ(g, 17, -31, 1.9, '#1E1C1A');
      const ph = person(g, 'man');
      ph.setAttribute('transform', 'translate(-4 0)');
      path(g, 'M-10,-41 Q-5,-53 5,-45 L4,-27 L-9.5,-24.5 Z', '#1E1C1A');
      line(g, -7, -37, -11, -57, { stroke: '#3A332B', 'stroke-width': 1 });
      rect(g, -15, -59, 8, 2, '#3A332B', NO);
      [['man', 1, 30], ['woman', 1, 38], ['girl', 0.7, 44]].forEach(([t, sc2, dx]) => {
        const f = person(g, t);
        f.setAttribute('transform', `translate(${dx} 0) scale(${-sc2} ${sc2})`);
      });
      const fx = px - 11 * s, fy = py - 59 * s, fg = el('g', { opacity: 0 }, lightL);
      el('circle', { cx: fx, cy: fy, r: 34 * s, fill: 'url(#fair-glow)' }, fg);
      el('circle', { cx: fx, cy: fy, r: 7 * s, fill: '#FFFDF2' }, fg);
      const smoke = [0, 1, 2].map(() => el('circle', { cx: fx, cy: fy, r: 4 * s, fill: '#D9D4CC', opacity: 0 }, lightL));
      flash = { g: fg, smoke, x: fx, y: fy, t: 9, next: rr(4, 8) };
    }

    // ---- the overlays the dusk and the night fall through, and the Wheel and the balloon above them
    const warm = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#F49A50', opacity: 0, 'clip-path': 'url(#fair-world)' }, overL);
    const night = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#0A1232', opacity: 0, 'clip-path': 'url(#fair-world)' }, overL);

    const wheel = { g: el('g', null, nearL), cars: [], R: L.wR, x: L.wX, a: 0 };
    {
      const Rw = wheel.R, base = L.midG + 2, hubY = base - 0.2 * Rw - Rw;
      wheel.y = hubY;
      const g = wheel.g, iron = 'var(--iron)';
      const leg = (x1, y1, x2, y2, w) => el('line', { x1, y1, x2, y2, style: `stroke:${iron}`, 'stroke-width': w, 'stroke-linecap': 'round' }, g);
      leg(wheel.x, hubY, wheel.x - Rw * 0.5, base, Rw * 0.035);
      leg(wheel.x, hubY, wheel.x + Rw * 0.5, base, Rw * 0.035);
      const rot = el('g', null, g);
      wheel.rot = rot;
      el('circle', { cx: 0, cy: 0, r: Rw, fill: 'none', style: `stroke:${iron}`, 'stroke-width': Math.max(1.6, Rw * 0.022) }, rot);
      el('circle', { cx: 0, cy: 0, r: Rw * 0.92, fill: 'none', style: `stroke:${iron}`, 'stroke-width': Math.max(1, Rw * 0.012) }, rot);
      let zig = '';
      for (let i = 0; i <= 72; i++) { const a = i / 72 * Math.PI * 2, r = i % 2 ? Rw * 0.92 : Rw; zig += (i ? 'L' : 'M') + (Math.cos(a) * r).toFixed(1) + ',' + (Math.sin(a) * r).toFixed(1); }
      el('path', { d: zig, fill: 'none', style: `stroke:${iron}`, 'stroke-width': 0.6, opacity: 0.7 }, rot);
      for (let i = 0; i < 36; i++) {
        const a = i / 36 * Math.PI * 2, b = a + 0.5;
        el('line', { x1: Math.cos(b) * Rw * 0.07, y1: Math.sin(b) * Rw * 0.07, x2: Math.cos(a) * Rw * 0.92, y2: Math.sin(a) * Rw * 0.92, style: `stroke:${iron}`, 'stroke-width': 0.5, opacity: 0.8 }, rot);
      }
      const bulbRing = el('g', { style: 'opacity:var(--lit)' }, rot);
      for (const rr0 of [Rw, Rw * 0.92]) {
        el('circle', { r: rr0, fill: 'none', stroke: '#FFD27A', 'stroke-opacity': 0.35, 'stroke-width': 4 }, bulbRing);
        el('circle', { r: rr0, fill: 'none', stroke: '#FFF1C4', 'stroke-width': 1.8, 'stroke-dasharray': '0.01 5', 'stroke-linecap': 'round' }, bulbRing);
      }
      leg(wheel.x - Rw * 0.62, base, wheel.x, hubY, Rw * 0.045);
      leg(wheel.x + Rw * 0.62, base, wheel.x, hubY, Rw * 0.045);
      leg(wheel.x - Rw * 0.62, base, wheel.x - Rw * 0.3, hubY + Rw * 0.62, Rw * 0.02);
      leg(wheel.x + Rw * 0.62, base, wheel.x + Rw * 0.3, hubY + Rw * 0.62, Rw * 0.02);
      leg(wheel.x - Rw * 0.4, hubY + Rw * 0.75, wheel.x + Rw * 0.4, hubY + Rw * 0.75, Rw * 0.02);
      el('circle', { cx: wheel.x, cy: hubY, r: Rw * 0.08, style: `fill:${iron}` }, g);
      el('circle', { cx: wheel.x, cy: hubY, r: Rw * 0.035, fill: '#C9A227' }, g);
      const cw = Rw * 0.13, ch = cw * 0.72;
      for (let i = 0; i < 36; i++) {
        const c = el('g', null, g);
        el('line', { x1: 0, y1: 0, x2: 0, y2: ch * 0.3, style: `stroke:${iron}`, 'stroke-width': 0.8 }, c);
        el('rect', { x: -cw / 2, y: ch * 0.3, width: cw, height: ch, rx: ch * 0.25, style: 'fill:var(--car)', stroke: INK, 'stroke-width': 0.6 }, c);
        el('rect', { x: -cw / 2 - 0.6, y: ch * 0.18, width: cw + 1.2, height: ch * 0.24, rx: 1, style: 'fill:var(--roof)' }, c);
        const win = el('g', { style: 'opacity:var(--lit)' }, c);
        for (let j = 0; j < 3; j++) el('rect', { x: -cw / 2 + cw * (0.12 + j * 0.28), y: ch * 0.5, width: cw * 0.2, height: ch * 0.36, fill: '#FFE59A' }, win);
        wheel.cars.push(c);
      }
      el('path', { d: `M${wheel.x - Rw * 0.62},${base} L${wheel.x + Rw * 0.62},${base}`, style: `stroke:${iron}`, 'stroke-width': 2 }, g);
    }

    const balloon = { g: el('g', null, nearL), x: L.balloonX, anchor: L.hz - 4, r: clamp(0.03 * Math.max(W, H), 10, 30) };
    {
      const br = balloon.r;
      balloon.tether = el('line', { x1: balloon.x, x2: balloon.x, y1: 0, y2: balloon.anchor, stroke: '#3A332B', 'stroke-width': 0.8 }, balloon.g);
      const b = el('g', null, balloon.g);
      balloon.body = b;
      el('circle', { cx: 0, cy: -br * 1.6, r: br, style: 'fill:var(--bal)', stroke: INK, 'stroke-width': 0.8 }, b);
      for (const k of [-0.55, 0, 0.55]) el('path', { d: `M${k * br},${-br * 2.58} Q${k * br * 1.9},${-br * 1.6} ${k * br * 0.5},${-br * 0.72}`, fill: 'none', style: 'stroke:var(--bal2)', 'stroke-width': br * 0.22 }, b);
      el('path', { d: `M${-br * 0.7},${-br * 0.9} L${-br * 0.25},0 M${br * 0.7},${-br * 0.9} L${br * 0.25},0`, stroke: '#3A332B', 'stroke-width': 0.6 }, b);
      el('rect', { x: -br * 0.28, y: 0, width: br * 0.56, height: br * 0.4, fill: '#7A5A3A', stroke: INK, 'stroke-width': 0.6 }, b);
    }

    // ---- searchlights, then fireworks over everything
    const beams = [];
    for (const [k, h, a0] of L.beams) {
      const g = el('g', { opacity: 0 }, lightL), len = Math.max(W, H) * 1.4, bw = len * 0.026;
      el('path', { d: `M0,0 L${-bw},${-len} L${bw},${-len} Z`, fill: 'url(#fair-beam)' }, g);
      beams.push({ g, x: k * W, y: L.hz - h * u, a0, ph: rr(0, 6), sp: rr(0.18, 0.3) });
    }
    const fireG = el('g', { 'stroke-linecap': 'round' }, lightL), sparks = [], rockets = [], flashes = [];
    for (let i = 0; i < 320; i++) sparks.push({ e: el('line', { x1: 0, y1: 0, x2: 0, y2: 0, stroke: '#FFF', 'stroke-width': 1.8, opacity: 0 }, fireG), life: 0 });
    for (let i = 0; i < 6; i++) flashes.push({ e: el('circle', { r: 1, fill: 'url(#fair-glow)', opacity: 0 }, fireG), t: 9 });
    let nextFire = 0;

    // ---- people: three lanes of fairgoers, and the craftspeople of the story
    const walkers = [];
    const walkerTypes = ['man', 'man', 'man', 'woman', 'woman', 'woman', 'woman', 'boy', 'girl'];
    const lanes = [[farLane, L.foot[0], 0.82], [midLane, L.foot[1], 0.95], [nearLane, L.foot[2], 1.08]];
    const counts = land ? [Math.round(W / 110), Math.round(W / 140), Math.round(W / 190)] : [5, 4, 3];
    lanes.forEach(([par, y, sc], li) => {
      for (let i = 0; i < counts[li]; i++) {
        const type = pick(walkerTypes), child = type === 'boy' || type === 'girl';
        const a = { g: person(par, type), x: rr(-20, W + 20), y: y + rr(-2, 2) * s, s: s * sc * (child ? 0.7 : rr(0.96, 1.04)), face: R() < 0.5 ? 1 : -1, walking: false, night: R() < 0.45 };
        a.v = rr(20, 34) * a.s * (child ? 1.25 : 1);
        a.g.style.setProperty('--stp', clamp(13 * a.s / a.v, 0.22, 0.6).toFixed(2) + 's');
        walkers.push(a);
      }
    });

    const crafts = [];
    function place(a) { a.g.setAttribute('transform', tr(a.x, a.y, a.s, a.face < 0)); }
    function walking(a, on) { if (on !== a.walking) { a.walking = on; a.g.classList.toggle('walk', on); } }
    function craft(k, x, y, face, state) {
      const g = person(craftL, R() < 0.32 ? 'woman' : 'man', { k });
      const a = { g, k, x, y, s: s * 0.95, face, walking: false, state, tx: x, ty: y, v: 38 * s, crew: null, slot: null };
      g.style.setProperty('--stp', '0.3s');
      crafts.push(a);
      place(a);
      return a;
    }
    function stepTo(a, dt) {
      const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
      if (d < 0.8) { a.x = a.tx; a.y = a.ty; walking(a, false); place(a); return true; }
      const m = Math.min(d, a.v * dt);
      a.x += (dx / d) * m; a.y += (dy / d) * m;
      if (Math.abs(dx) > 0.4) a.face = dx > 0 ? 1 : -1;
      walking(a, true);
      place(a);
      return false;
    }
    function drop(a) { a.state = 'gone'; a.g.remove(); }
    // A new month's crowd: four craftspeople walk in to each agency.
    function refill(instant) {
      for (const kq of kiosks) kq.slots.forEach((sl, i) => {
        const k = (R() * 5) | 0;
        if (instant) { const a = craft(k, sl.x, sl.y, sl.x < kq.x ? 1 : -1, 'wait'); sl.c = a; a.slot = sl; return; }
        const fromLeft = kq.x < W / 2 ? R() < 0.8 : R() < 0.2;
        const a = craft(k, fromLeft ? -20 - i * 14 * s - rr(0, 60) : W + 20 + i * 14 * s + rr(0, 60), L.foot[1] - 2 * s, fromLeft ? 1 : -1, 'in');
        a.tx = sl.x; a.ty = sl.y; sl.c = a; a.slot = sl;
      });
    }
    function sendToGate(a) {
      const spot = gate.spots.find(sp => !sp.c) || gate.spots[(R() * gate.spots.length) | 0];
      spot.c = a; a.slot = spot; a.state = 'toGate'; a.tx = spot.x; a.ty = spot.y; a.v = 40 * s;
      gate.people.push(a);
    }
    function freeSlot(a) { if (a.slot && a.slot.c === a) a.slot.c = null; a.slot = null; }
    // One hire: a nation takes every craftsperson of one discipline from one agency, or from the gate.
    function hire() {
      const ready = kiosks.filter(kq => kq.slots.some(sl => sl.c) && kq.slots.every(sl => !sl.c || sl.c.state === 'wait'));
      const atGate = gate.people.filter(a => a.state === 'gate');
      let pool = null, fromGate = false;
      if (ready.length && (!atGate.length || R() < 0.7)) pool = pick(ready).slots.map(sl => sl.c).filter(Boolean);
      else if (atGate.length) { pool = atGate; fromGate = true; }
      if (!pool) return false;
      const n = story.turn++ % 2, k = pick(pool).k;
      const crew = pool.filter(a => a.k === k);
      const room = [0, 1, 2, 3, 4].some(r => story.bays[n][r * 5 + colFor(r, k)] < 0);
      crew.forEach((a, i) => {
        freeSlot(a);
        if (fromGate) gate.people.splice(gate.people.indexOf(a), 1);
        a.crew = crew; a.nation = n; a.v = 52 * s;
        if (room) { a.state = 'hired'; a.tx = pav[n].door.x + (i - (crew.length - 1) / 2) * 4 * s; a.ty = pav[n].door.y; }
        else {                                           // nowhere to put them: they stand idle by the pavilion
          const spot = pav[n].idle.find(sp => !sp.c) || pav[n].idle[3];
          spot.c = a; a.slot = spot; a.state = 'toIdle'; a.tx = spot.x; a.ty = spot.y;
        }
      });
      if (!fromGate) pool.filter(a => a.k !== k).forEach(a => { freeSlot(a); sendToGate(a); });
      return true;
    }
    function putUp(n, k) {
      const bays = story.bays[n];
      const rows = [0, 1, 2, 3, 4].filter(r => bays[r * 5 + colFor(r, k)] < 0);
      if (!rows.length) return;
      const w = rows.map(r => 1 + bays.slice(r * 5, r * 5 + 5).filter(v => v >= 0).length);
      let x = R() * w.reduce((a, b) => a + b, 0), r = rows[0];
      for (let i = 0; i < rows.length; i++) { x -= w[i]; if (x <= 0) { r = rows[i]; break; } }
      bays[r * 5 + colFor(r, k)] = k;
      pav[n].sync(bays, true);
    }
    function leaveAll() {
      for (const a of crafts) if (a.state !== 'gone' && a.state !== 'leave' && a.state !== 'hired') {
        freeSlot(a);
        a.state = 'leave'; a.v = 36 * s;
        a.tx = a.x < W / 2 ? -40 : W + 40; a.ty = L.foot[1];
      }
      gate.people.length = 0;
    }

    // ---- start where the day is
    if (!story.seeded) { seedBays(builtFor(f0)); story.seeded = true; }
    pav.forEach((p, n) => p.sync(story.bays[n], false));
    if (f0 >= HIRES_FROM && f0 < ROUNDS_TO) {
      refill(true);
      for (let i = 0, n = (R() * 3) | 0; i < n; i++) { const a = craft((R() * 5) | 0, gate.x, L.kb, 1, 'gate'); sendToGate(a); a.x = a.tx; a.y = a.ty; a.state = 'gate'; place(a); }
    }
    walkers.forEach(a => { place(a); walking(a, !STILL); });
    midStroll.forEach(a => { place(a); walking(a, !STILL); });
    let hireT = 0.6, prevF = f0, frameN = 0, nightLit = null;
    const crossed = (a, p, f) => (p <= f ? p < a && a <= f : a > p || a <= f);

    /* -------------------------------------------------------------- update */
    function update(dt, f) {
      frameN++;
      const nightK = keyed(NIGHT, f)[0], warmK = keyed(WARM, f)[0];
      if (frameN % 3 === 1 || dt === 0) {
        const c = keyed(SKY, f);
        stops.forEach((st, i) => st.setAttribute('stop-color', c[i]));
        night.setAttribute('opacity', nightK.toFixed(3));
        warm.setAttribute('opacity', warmK.toFixed(3));
        starG.setAttribute('opacity', clamp((nightK - 0.25) / 0.3, 0, 1).toFixed(2));
        cloudG.setAttribute('fill', keyed(CLOUD, f)[0]);
        cloudG.setAttribute('opacity', (1 - nightK * 0.7).toFixed(2));
        wStops[0].setAttribute('stop-color', mix(c[2], '#6E9BA4', 0.42));
        wStops[1].setAttribute('stop-color', mix(c[1], '#3F6C78', 0.6));
        const nk = nightK / 0.56;
        wheel.g.style.setProperty('--iron', mix('#4A4038', '#1D1A2A', nk));
        wheel.g.style.setProperty('--car', mix(mix('#E9DDC5', '#F2B27A', warmK * 1.4), '#363452', nk));
        wheel.g.style.setProperty('--roof', mix('#8E3E28', '#2A2238', nk));
        balloon.g.style.setProperty('--bal', mix(mix('#CE1E32', '#F27A4A', warmK), '#3A2A44', nk));
        balloon.g.style.setProperty('--bal2', mix('#F3EADA', '#5A5068', nk));
      }
      // the sun and the moon
      if (f > SUNRISE && f < SUNSET) {
        const p = (f - SUNRISE) / (SUNSET - SUNRISE), [x, y] = arc(p), edge = 1 - Math.sin(Math.PI * p);
        sunG.setAttribute('display', 'inline');
        sunG.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        sunDisc.setAttribute('fill', mix('#FFF6DC', '#FF8F4F', edge * edge));
      } else sunG.setAttribute('display', 'none');
      const q = (f - SUNSET + 1) % 1;
      if (q < 0.47) { const [x, y] = arc(q / 0.47); moonG.setAttribute('display', 'inline'); moonG.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`); }
      else moonG.setAttribute('display', 'none');
      // clouds and gulls
      for (const c of clouds) { c.x += c.v * dt; if (c.x > W + 80) c.x = -80; c.g.setAttribute('transform', `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`); }
      const day = f > 0.1 && f < 0.53;
      for (const b of gulls) {
        b.x += b.v * dt;
        if (b.x > W + 30) { b.x = -30 - rr(200, 1400); b.y = rr(0.25, 0.9) * cloudTop; }
        b.g.setAttribute('display', day ? 'inline' : 'none');
        b.g.setAttribute('transform', `translate(${b.x.toFixed(1)} ${(b.y + Math.sin(b.x * 0.03) * 3).toFixed(1)})`);
      }
      // the illumination, and the title's tiles glowing with it
      let litK = 0;
      for (const L0 of lights) { const v = litAt(f, L0.d).toFixed(2); if (v !== L0.v) { L0.v = v; L0.g.setAttribute('opacity', v); } litK = Math.max(litK, +v); }
      const wl = litAt(f, 0.5);
      wheel.g.style.setProperty('--lit', wl.toFixed(2));
      if ((wl > 0.5) !== nightLit) { nightLit = wl > 0.5; titleEl.classList.toggle('nightlit', nightLit); }
      for (let i = 0; i < jets.length; i += 2) {
        if (!litK) break;
        const hue = jetColour(clockT * 0.25 + i * 0.07);
        jets[i].setAttribute('stroke', hue);
        jets[i + 1].setAttribute('stroke', tint(hue, 0.35));
      }
      // the Wheel turns, its cars hang level
      wheel.a += dt * 0.07;
      wheel.rot.setAttribute('transform', `translate(${wheel.x.toFixed(1)} ${wheel.y.toFixed(1)}) rotate(${(wheel.a * 57.2958).toFixed(2)})`);
      wheel.cars.forEach((c, i) => {
        const a = wheel.a + (i / 36) * Math.PI * 2;
        c.setAttribute('transform', `translate(${(wheel.x + Math.cos(a) * wheel.R).toFixed(1)} ${(wheel.y + Math.sin(a) * wheel.R).toFixed(1)})`);
      });
      // the captive balloon goes up and down by day and comes down for the night
      {
        const up = f > 0.09 && f < 0.54 ? smooth(clamp(Math.min(f - 0.09, 0.54 - f) / 0.04, 0, 1)) * (0.55 + 0.45 * Math.sin(clockT * 0.21)) : 0;
        let topY = L.hz - (0.12 + 0.7 * up) * (L.hz - 0.12 * H);
        for (const [x0, x1, y1] of L.keepOut) if (balloon.x > x0 - 2 * balloon.r && balloon.x < x1 + 2 * balloon.r) topY = Math.max(topY, y1 + 2.8 * balloon.r);
        const bx = balloon.x + Math.sin(clockT * 0.4) * 2, by = topY + Math.sin(clockT * 0.9) * 1.2;
        balloon.body.setAttribute('transform', `translate(${bx.toFixed(1)} ${by.toFixed(1)})`);
        balloon.tether.setAttribute('y1', by.toFixed(1));
        balloon.tether.setAttribute('x1', bx.toFixed(1));
        balloon.g.setAttribute('display', up > 0.01 ? 'inline' : 'none');
      }
      // the boats and the railway
      for (const b of boats) {
        b.x += b.v * dt;
        if (b.v > 0 && b.x > b.hi) b.x = b.lo;
        if (b.v < 0 && b.x < b.lo) b.x = b.hi;
        const t = `translate(${b.x.toFixed(1)} ${(b.y + Math.sin(clockT * 1.3 + b.w) * 0.6).toFixed(1)})` + (b.v < 0 ? ' scale(-1 1)' : '');
        b.g.setAttribute('transform', t); b.l.setAttribute('transform', t);
      }
      if (train.wait > 0) train.wait -= dt;
      else {
        train.x += train.v * dt;
        if (train.x > W + 20) { train.x = -train.len - 20; train.wait = rr(4, 11); }
      }
      const tt = `translate(${train.x.toFixed(1)} 0)`;
      train.g.setAttribute('transform', tt); train.l.setAttribute('transform', tt);
      // the fairgoers: fewer of them after dark
      const late = nightK > 0.4;
      for (const a of walkers) {
        a.x += a.v * a.face * dt;
        if (a.x > W + 30 || a.x < -30) {
          a.face = R() < 0.5 ? 1 : -1;
          a.x = a.face > 0 ? -25 : W + 25;
          a.g.setAttribute('display', late && !a.night ? 'none' : 'inline');
        }
        place(a);
      }
      for (const a of midStroll) {
        a.x += a.v * a.face * dt;
        if (a.x > a.hi || a.x < a.lo) { a.face = -a.face; a.g.setAttribute('display', late && !a.night ? 'none' : 'inline'); }
        place(a);
      }
      if (carousel) carousel.list.forEach(h => {
        const a = clockT * 0.9 + h.ph, x = Math.cos(a) * 15, y = -12 + Math.sin(clockT * 3 + h.ph) * 1.6;
        h.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${Math.sin(a) > 0 ? 1 : -1} 1)`);
        h.g.setAttribute('opacity', Math.sin(a) > 0 ? 1 : 0.55);
      });
      // the promenade's life
      for (const c of chairs) {
        c.x += c.v * c.face * dt;
        if (c.x > W + 40 || c.x < -40) { c.face = R() < 0.5 ? 1 : -1; c.x = c.face > 0 ? -35 : W + 35; c.g.setAttribute('display', late ? 'none' : 'inline'); }
        c.turn += (c.v * dt) / (7.5 * c.s);
        c.wheel.setAttribute('transform', `translate(-3 -7.5) rotate(${(c.turn * 57.3).toFixed(1)})`);
        c.g.setAttribute('transform', tr(c.x, c.y, c.s, c.face < 0));
      }
      {
        const r = runner;
        r.x += r.v * r.face * dt;
        if (r.x > W + 60) { r.x = -30; r.g.setAttribute('display', late ? 'none' : 'inline'); }
        r.turn += (r.v * dt) / (9.2 * r.s);
        r.hoop.setAttribute('transform', `translate(16 ${(-9.5 - Math.abs(Math.sin(r.turn * 2)) * 0.8).toFixed(2)}) rotate(${(r.turn * 57.3).toFixed(1)})`);
        r.g.setAttribute('transform', tr(r.x, r.y, r.s, false));
      }
      nextFlutter -= dt;
      if (nextFlutter <= 0) {
        nextFlutter = rr(1.8, 4.5);
        const pg = pick(pigeons);
        if (!pg.fly) { const to = plazaSpot(); pg.fly = { x0: pg.x, y0: pg.y, x1: to.x, y1: to.y, t: 0, d: rr(0.8, 1.3) }; pg.wing.setAttribute('display', 'inline'); }
      }
      for (const pg of pigeons) {
        if (pg.fly) {
          const F = pg.fly; F.t += dt;
          const k = Math.min(1, F.t / F.d);
          pg.x = lerp(F.x0, F.x1, k); pg.y = lerp(F.y0, F.y1, k) - Math.sin(Math.PI * k) * 24 * s;
          pg.face = F.x1 > F.x0 ? 1 : -1;
          if (k >= 1) { pg.fly = null; pg.wing.setAttribute('display', 'none'); }
        }
        pg.g.setAttribute('transform', tr(pg.x, pg.y, s, pg.face < 0));
      }
      seller.next -= dt;
      if (seller.next <= 0 && day) {
        seller.next = rr(10, 18);
        const b = pick(seller.balloons.filter(q => !q.away));
        if (b) {
          b.away = true; b.g.setAttribute('opacity', 0);
          const g = el('g', null, nearL);
          el('path', { d: `M0,5 q2,6 -1,12`, fill: 'none', stroke: '#6A5F59', 'stroke-width': 0.6 }, g);
          el('ellipse', { cx: 0, cy: 0, rx: 4.6 * seller.sc, ry: 5.6 * seller.sc, fill: b.col, stroke: INK, 'stroke-width': 0.6 }, g);
          el('ellipse', { cx: -1.5 * seller.sc, cy: -2 * seller.sc, rx: 1.2 * seller.sc, ry: 1.8 * seller.sc, fill: '#FFFFFF', opacity: 0.55 }, g);
          loose.push({ g, b, x: seller.x + b.x * seller.sc, y: seller.y + b.y * seller.sc, t: 0 });
        }
      }
      for (let i = loose.length - 1; i >= 0; i--) {
        const q = loose[i];
        q.t += dt; q.y -= (24 + q.t * 4) * dt * clamp(H / 800, 0.7, 1.4); q.x += Math.sin(q.t * 1.3) * 10 * dt + 6 * dt;
        q.g.setAttribute('transform', `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)}) scale(${Math.max(0.35, 1 - q.t * 0.05).toFixed(2)})`);
        if (q.y < -30) {
          q.g.remove(); loose.splice(i, 1);
          setTimeout(() => { q.b.away = false; q.b.g.setAttribute('opacity', 1); }, 2500);
        }
      }
      if (flash) {
        flash.next -= dt;
        if (flash.next <= 0 && !late) { flash.next = rr(8, 13); flash.t = 0; }
        if (flash.t < 3) {
          flash.t += dt;
          flash.g.setAttribute('opacity', Math.max(0, 1 - flash.t / 0.35).toFixed(2));
          flash.smoke.forEach((c, i) => {
            const k = clamp((flash.t - 0.1 - i * 0.15) / 2.2, 0, 1);
            c.setAttribute('cy', (flash.y - k * 34 * s).toFixed(1));
            c.setAttribute('cx', (flash.x + (i - 1) * 4 * s + k * 6 * s).toFixed(1));
            c.setAttribute('r', ((4 + k * 9) * s).toFixed(1));
            c.setAttribute('opacity', (k > 0 && k < 1 ? 0.55 * (1 - k) : 0).toFixed(2));
          });
        }
      }

      // the story: rounds, hires, crews putting displays up
      if (f >= HIRES_FROM && f < HIRES_TO) {
        hireT -= dt;
        if (hireT <= 0) {
          hireT = HIRE_GAP * rr(0.8, 1.25);
          if (!hire()) {
            const anyone = crafts.some(a => a.state === 'in' || a.state === 'wait' || a.state === 'toGate' || a.state === 'gate');
            if (!anyone && f < ROUNDS_TO) refill(false);
          }
        }
      }
      if (crossed(LEAVE, prevF, f)) leaveAll();
      if (crossed(RESET, prevF, f)) {
        story.bays.forEach(b => b.fill(-1));
        pav.forEach((p, n) => p.sync(story.bays[n], false));
        for (const p of pav) p.idle.forEach(sp => { sp.c = null; });
        crafts.forEach(a => { if (a.state !== 'gone') drop(a); });
      }
      for (const a of crafts) {
        if (a.state === 'gone' || a.state === 'wait' || a.state === 'gate' || a.state === 'idle') continue;
        if (!stepTo(a, dt)) continue;
        if (a.state === 'in') a.state = 'wait';
        else if (a.state === 'toGate') a.state = 'gate';
        else if (a.state === 'toIdle') a.state = 'idle';
        else if (a.state === 'leave') drop(a);
        else if (a.state === 'hired') {
          a.state = 'gone';
          a.g.style.transition = 'opacity .35s'; a.g.style.opacity = 0;
          setTimeout(() => a.g.remove(), 400);
          if (a.crew.every(m => m.state === 'gone')) putUp(a.nation, a.k);
        }
      }
      if (frameN % 120 === 0) for (let i = crafts.length - 1; i >= 0; i--) if (crafts[i].state === 'gone') crafts.splice(i, 1);
      // searchlights and fireworks
      const beamK = litAt(f, 0) * 0.32;
      for (const b of beams) {
        b.g.setAttribute('opacity', beamK.toFixed(3));
        if (beamK > 0) b.g.setAttribute('transform', `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${((b.a0 + Math.sin(clockT * b.sp + b.ph) * 0.62) * 57.2958).toFixed(2)})`);
      }
      if (f > FIRE_FROM && f < FIRE_TO && !STILL) {
        nextFire -= dt;
        if (nextFire <= 0) { nextFire = rr(0.35, 1.1); launch(); if (R() < 0.25) launch(); }
      }
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.t += dt;
        const k = Math.min(1, r.t / r.dur), y = lerp(r.y0, r.y1, 1 - (1 - k) * (1 - k));
        r.e.setAttribute('x1', r.x.toFixed(1)); r.e.setAttribute('y1', (y + 7).toFixed(1));
        r.e.setAttribute('x2', r.x.toFixed(1)); r.e.setAttribute('y2', y.toFixed(1));
        r.e.setAttribute('opacity', 0.9);
        if (k >= 1) { r.e.setAttribute('opacity', 0); burst(r.x, r.y1, r.scale); rockets.splice(i, 1); }
      }
      for (const p of sparks) {
        if (p.life <= 0) continue;
        p.age += dt;
        if (p.age >= p.life) { p.life = 0; p.e.setAttribute('opacity', 0); continue; }
        p.vx *= 0.982; p.vy = p.vy * 0.982 + 30 * p.scale * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.e.setAttribute('x1', (p.x - p.vx * 0.07).toFixed(1)); p.e.setAttribute('y1', (p.y - p.vy * 0.07).toFixed(1));
        p.e.setAttribute('x2', p.x.toFixed(1)); p.e.setAttribute('y2', p.y.toFixed(1));
        p.e.setAttribute('opacity', Math.pow(1 - p.age / p.life, 1.2).toFixed(2));
      }
      for (const fl of flashes) {
        if (fl.t > 0.5) continue;
        fl.t += dt;
        fl.e.setAttribute('opacity', Math.max(0, 1 - fl.t / 0.5).toFixed(2));
        fl.e.setAttribute('r', (fl.r * (0.6 + fl.t)).toFixed(1));
      }
      prevF = f;
    }

    function launch(cx, cy) {
      const sc = clamp(Math.min(W, H) / 560, 0.6, 1.6);
      const x = cx != null ? cx : rr(0.06, 0.94) * W, y = cy != null ? cy : rr(0.06, 1) * (L.hz - 0.14 * H);
      const free = sparks.find(p => p.life <= 0 && !p.rocket);
      if (!free) return;
      free.rocket = true;
      rockets.push({ e: free.e, x, y0: L.hz, y1: y, t: 0, dur: rr(0.55, 0.85), scale: sc });
      free.e.setAttribute('stroke', '#FFE9B0'); free.e.setAttribute('stroke-width', 1.6);
      setTimeout(() => { free.rocket = false; }, 1200);
    }
    function burst(x, y, sc) {
      const col = pick(['#FF5A5A', '#FFD25A', '#7CF29A', '#6FC8FF', '#E9A2FF', '#FFFFFF', '#FF9A4A']);
      const n = 40 + ((R() * 18) | 0), col2 = R() < 0.4 ? pick(['#FFFFFF', '#FFD25A', '#FF5A5A']) : col;
      let made = 0;
      for (const p of sparks) {
        if (made >= n) break;
        if (p.life > 0 || p.rocket) continue;
        const a = (made / n) * Math.PI * 2 + rr(-0.06, 0.06), v = rr(60, 105) * sc * (made % 2 ? 1 : 0.72);
        Object.assign(p, { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: rr(1.4, 2.3), scale: sc });
        p.e.setAttribute('stroke', made % 2 ? col : col2);
        p.e.setAttribute('stroke-width', (rr(1.4, 2.2) * Math.max(0.85, sc)).toFixed(2));
        made++;
      }
      const fl = flashes.find(q => q.t > 0.5);
      if (fl) { fl.t = 0; fl.r = 26 * sc; fl.e.setAttribute('cx', x.toFixed(1)); fl.e.setAttribute('cy', y.toFixed(1)); }
    }

    return { update, fireAt(x, y) { if (y < L.hz - 6) launch(x, y); } };
  }

  // How lit a group is at f, switching on (with a flicker) after its delay at dusk and off again at closing.
  function litAt(f, d) {
    if (f < LIGHTS_ON) return 0;
    const on = (f - LIGHTS_ON) * CYCLE - d, off = (f - CLOSE) * CYCLE - d * 0.6;
    if (on < 0) return 0;
    if (off >= 0.4) return 0;
    if (off >= 0) return 1 - off / 0.4;
    if (on < 0.35) return (Math.sin(on * 70) > -0.2 ? 1 : 0.3) * smooth(Math.min(1, on / 0.35));
    return 1;
  }
  const JET = ['#FF5D5D', '#FFC857', '#7CF29A', '#6FC3FF', '#C58CFF', '#FFFFFF'];
  function jetColour(t) {
    const i = Math.floor(t) % JET.length, k = smooth(t - Math.floor(t));
    return mix(JET[i], JET[(i + 1) % JET.length], k);
  }

  /* -------------------------------------------------------------- the loop */

  let clockT = 0, world = null, raf = 0, last = 0, running = false;
  const fNow = () => (START + clockT / CYCLE) % 1;

  function rebuild() {
    measure();
    while (svg.firstChild) svg.firstChild.remove();
    world = build(fNow());
    world.update(0, fNow());
  }
  // A slow machine (an old tablet, say) draws every other frame instead of falling behind: after five
  // seconds, if frames have been averaging slower than about 33 fps, the Fair moves at half the frame rate.
  // While the menu or the lobby is open the Fair is dimmed behind it, so it moves at half the frame rate,
  // and it holds still for the moment a card is arriving, so the card gets every frame.
  let ema = 1 / 60, slow = false, skip = false, acc = 0, calmUntil = 0;
  function frame(now) {
    raf = 0;
    if (!running) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    clockT += dt; acc += dt;
    if (now < calmUntil) { raf = requestAnimationFrame(frame); return; }
    if (body.dataset.front === 'title') ema = ema * 0.97 + dt * 0.03;
    if (!slow && clockT > 5 && ema > 0.03) slow = true;
    skip = (slow || body.dataset.front !== 'title') && !skip;
    if (!skip) { world.update(Math.min(acc, 0.1), fNow()); acc = 0; }
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running || STILL) return;
    running = true; last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /* ------------------------------------------------- the front door's states

     title: the Fair, the word, the button. menu: the setup card over a dimmed
     Fair, the word kept above it when there is room. lobby: the same for the
     lobby card. Empty in a game, when nothing here draws. Anyone with a room to
     rejoin, or coming back from a game, goes straight to the menu: the title is
     for arriving. */

  /* ---------------------------------------------- the menu's little pavilion

     Below the pitch, on a laptop: a pavilion whose front fills tile by tile
     in the board's pattern, glows when it is complete, and starts again. The
     game's goal, shown rather than told. It runs only while the menu is open. */

  const pitch = card.querySelector('.pitch');
  const learnBtn = document.getElementById('btn-learn');
  const vig = document.createElement('div');
  vig.className = 'pitch-scene';
  vig.setAttribute('aria-hidden', 'true');
  if (pitch) pitch.insertBefore(vig, learnBtn && learnBtn.parentNode === pitch ? learnBtn : null);
  const vsvg = el('svg', { focusable: 'false' }, vig);
  let V = null, vTimer = 0;
  function vBuild() {
    while (vsvg.firstChild) vsvg.firstChild.remove();
    V = null;
    const w = vig.offsetWidth, h = vig.offsetHeight;
    if (w < 60 || h < 60) return;
    vsvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const d = el('defs', null, vsvg), sg = el('linearGradient', { id: 'vig-sky', x1: 0, y1: 0, x2: 0, y2: 1 }, d);
    el('stop', { offset: 0, 'stop-color': '#B9D2DF' }, sg);
    el('stop', { offset: 0.75, 'stop-color': '#F3E6C8' }, sg);
    el('rect', { width: w, height: h, fill: 'url(#vig-sky)' }, vsvg);
    const gy = h * 0.9, hz = h * 0.66;
    // the far city in a pale line, then the promenade
    const far = el('g', { fill: '#EDE6D6', stroke: '#B8AD97', 'stroke-width': 0.6 }, vsvg);
    for (let x = 6; x < w; x += 46) {
      const bw = 30 + (x % 3) * 6, bh = 12 + ((x * 7) % 5) * 3;
      el('rect', { x, y: hz - bh, width: bw, height: bh }, far);
      if ((x / 46) % 2 < 1) el('path', { d: `M${x + bw * 0.25},${hz - bh} Q${x + bw / 2},${hz - bh - bw * 0.42} ${x + bw * 0.75},${hz - bh} Z` }, far);
    }
    for (let x = 0; x < w; x += 13) el('ellipse', { cx: x, cy: hz, rx: 9, ry: 6, fill: '#6E8B57', opacity: 0.9 }, vsvg);
    el('rect', { y: hz, width: w, height: gy - hz, fill: '#9FBFC4' }, vsvg);
    el('rect', { y: gy, width: w, height: h - gy, fill: '#DCCFAC' }, vsvg);
    // the pavilion, sized to the panel
    const pwid = Math.min(w * 0.5, (gy - h * 0.06) / 1.45);
    const pw = pwid * 0.04, bw = (pwid - 6 * pw) / 5, bh = bw * 1.08, rg = bw * 0.26, plinth = bw * 0.55;
    const cx = w / 2, base = gy + 2, top = base - plinth - (5 * bh + 6 * rg), x0 = cx - pwid / 2;
    const g = el('g', null, vsvg);
    rect(g, x0 - pwid * 0.04, base - plinth, pwid * 1.08, plinth, STONE2);
    rect(g, x0, top, pwid, base - plinth - top, STONE);
    rect(g, x0 - 3, top - 4, pwid + 6, 4, STONE2);
    path(g, `M${cx - pwid * 0.3},${top - 4} C${cx - pwid * 0.3},${top - pwid * 0.42} ${cx + pwid * 0.3},${top - pwid * 0.42} ${cx + pwid * 0.3},${top - 4} Z`, '#EDE5D2');
    line(g, cx, top - pwid * 0.32, cx, top - pwid * 0.46, { stroke: '#4A4038', 'stroke-width': 1 });
    flag(g, cx, top - pwid * 0.46, pwid * 0.13, pwid * 0.08, '#CE1E32');
    for (let i = 0; i < 9; i++) {
      const bx = x0 + pwid * (i + 0.5) / 9, bwd = pwid / 9;
      path(g, `M${bx - bwd * 0.45},${top + 1} L${bx + bwd * 0.45},${top + 1} L${bx},${top + 1 + bwd * 0.5} Z`, i % 2 ? '#F3EADA' : '#CE1E32', { 'stroke-width': 0.5 });
    }
    const bays = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      const bx = x0 + pw + c * (bw + pw), by = top + rg + r * (bh + rg) + bw * 0.12, k = kindAt(r, c), rad = bw / 2;
      const dd = `M${bx},${by + bh} V${by + rad} A${rad},${rad} 0 0 1 ${bx + bw},${by + rad} V${by + bh} Z`;
      path(g, dd, mix(KC[k], '#E8DEC9', 0.8), { 'stroke-width': 0.6 });
      el('use', { href: '#ic-' + KIND[k], x: bx + bw * 0.22, y: by + bh * 0.3, width: bw * 0.56, height: bw * 0.56, opacity: 0.32, style: `color:${KC[k]};--t-bg:transparent` }, g);
      bays.push({ d: dd, k, bx, by });
    }
    const dw = bw * 0.9;
    path(g, `M${cx - dw / 2},${base} V${base - plinth * 0.9} Q${cx},${base - plinth * 1.25} ${cx + dw / 2},${base - plinth * 0.9} V${base} Z`, '#4A3E33', { 'stroke-width': 0.6 });
    // lamp posts either side
    for (const lx of [x0 - pwid * 0.2, x0 + pwid * 1.2]) {
      rect(vsvg, lx - 1, gy - 46, 2, 46, '#2F3B33', NO);
      circ(vsvg, lx, gy - 48, 3.2, '#F4EDDC', { 'stroke-width': 0.6 });
    }
    const tiles = el('g', null, vsvg), confetti = el('g', null, vsvg);
    V = { bays, tiles, confetti, order: [...Array(25).keys()].sort(() => R() - 0.5), i: 0, hold: 0, h };
    if (STILL) for (let i = 0; i < 25; i++) vDrop(true);
  }
  function vDrop(still) {
    const b = V.bays[V.order[V.i++]];
    const t = el('g', { class: still ? 'bayon' : 'bayon drop', style: `--dy:${(-(b.by + 40)).toFixed(0)}px` }, V.tiles);
    path(t, b.d, KC[b.k], { stroke: KBD[b.k], 'stroke-width': 0.9 });
    const bw = (b.d.match(/A([\d.]+)/) || [0, 8])[1] * 2;
    el('use', { href: '#ic-' + KIND[b.k], x: b.bx + bw * 0.2, y: b.by + bw * 1.08 * 0.3, width: bw * 0.6, height: bw * 0.6, style: `color:${KIC[b.k]};--t-bg:${KC[b.k]}` }, t);
  }
  function vStep() {
    if (!V) return;
    if (V.i < 25) { vDrop(false); return; }
    if (!V.hold) {
      V.tiles.classList.add('won');
      for (let i = 0; i < 26; i++) {
        const c = el('rect', { x: rr(0, vig.offsetWidth), y: -6, width: 4, height: 6, fill: pick(['#CE1E32', '#D9AE3A', '#37658A', '#3C8B51', '#F3EADA', '#8E3E28']) }, V.confetti);
        c.animate([{ transform: 'translate(0,0) rotate(0)' }, { transform: `translate(${rr(-30, 30).toFixed(0)}px, ${(V.h + 12).toFixed(0)}px) rotate(${rr(-540, 540).toFixed(0)}deg)` }],
          { duration: rr(1600, 2600), delay: rr(0, 500), easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'both' });
      }
    }
    if (++V.hold > 6) {
      V.tiles.style.transition = 'opacity .6s'; V.tiles.style.opacity = 0;
      setTimeout(() => { if (!V) return; while (V.tiles.firstChild) V.tiles.firstChild.remove(); while (V.confetti.firstChild) V.confetti.firstChild.remove(); V.tiles.classList.remove('won'); V.tiles.style.opacity = 1; V.order.sort(() => R() - 0.5); V.i = 0; V.hold = 0; }, 650);
      V.hold = -99;
    }
  }
  function vStart() { vStop(); vBuild(); if (!STILL) vTimer = setInterval(vStep, 560); }
  function vStop() { clearInterval(vTimer); vTimer = 0; }

  // the title's tiles spin when clicked, and a click on the sky sends up a firework
  titleEl.querySelectorAll('.tl').forEach(t => {
    t.addEventListener('click', () => { t.classList.remove('spin'); void t.offsetWidth; t.classList.add('spin'); });
    t.addEventListener('animationend', e => { if (e.animationName === 'fair-spin') t.classList.remove('spin'); });
  });
  host.addEventListener('click', e => { if (body.dataset.front === 'title' && world && world.fireAt) world.fireAt(e.clientX, e.clientY); });

  const front = mode => {
    if (mode !== body.dataset.front && (mode === 'menu' || mode === 'lobby')) calmUntil = performance.now() + 750;
    body.dataset.front = mode;
    if (mode === 'menu') requestAnimationFrame(vStart); else vStop();
  };
  const visible = sec => !sec.classList.contains('hidden');
  function fit() {
    const target = visible(lobby) ? lobby.querySelector('.setup-card') : card;
    const lb = titleEl.querySelector('.title-logo').getBoundingClientRect();
    const ch = target ? target.offsetHeight : 0;             // its laid-out size: mid-animation its box is shrunk
    if (innerWidth >= 940) {
      const room = lb.bottom + 18 + ch <= innerHeight - 12;
      body.classList.toggle('fair-roomy', room);
      body.style.setProperty('--card-top', room ? Math.round(lb.bottom + 18) + 'px' : '18px');
    } else {
      body.classList.add('fair-roomy');
      body.style.setProperty('--sheet-top', Math.round(lb.bottom + 14) + 'px');
    }
  }
  function openMenu(byKey) {
    titleEl.classList.remove('intro');
    fit();
    front('menu');
    if (byKey) (card.querySelector('.seg-btn.on') || card.querySelector('button, input, select'))?.focus({ preventScroll: true });
  }
  let leaving = 0;
  function closeMenu() {
    if (body.dataset.front !== 'menu' || leaving) return;
    body.classList.add('fair-leaving');
    leaving = setTimeout(() => {
      leaving = 0;
      body.classList.remove('fair-leaving');
      front('title');
      playBtn.focus({ preventScroll: true });
    }, 240);
  }
  playBtn.addEventListener('click', e => openMenu(e.detail === 0));
  if (backBtn) backBtn.addEventListener('click', closeMenu);
  document.addEventListener('keydown', e => {
    if (body.dataset.front === 'title' && (e.key === 'Enter' || e.key === ' ') && (e.target === body || e.target === document.documentElement)) { e.preventDefault(); openMenu(true); }
    else if (body.dataset.front === 'menu' && e.key === 'Escape') closeMenu();
  });
  // A click on the Fair itself, outside the card, closes the menu; nothing else does (the end-of-game
  // dialog's Home button, say, lands here a moment after ui.js has opened the menu).
  document.addEventListener('click', e => {
    if (body.dataset.front === 'menu' && (e.target === body || e.target === document.documentElement)) closeMenu();
  });

  function sync(first) {
    const onSetup = visible(setup), onLobby = visible(lobby), on = onSetup || onLobby;
    host.classList.toggle('hidden', !on);
    scrim.classList.toggle('hidden', !on);
    titleEl.classList.toggle('hidden', !on);
    if (!on) { front(''); stop(); return; }
    if (onLobby) { titleEl.classList.remove('intro'); front('lobby'); }
    else if (first) {
      const rejoin = document.getElementById('rejoin');
      if ((rejoin && !rejoin.classList.contains('hidden')) || QS.has('menu')) front('menu');
      else { front('title'); titleEl.classList.add('intro'); setTimeout(() => titleEl.classList.remove('intro'), 3400); }
    } else { titleEl.classList.remove('intro'); front('menu'); }
    requestAnimationFrame(fit);
    start();
  }

  let pending = 0;
  addEventListener('resize', () => {
    clearTimeout(pending);
    pending = setTimeout(() => { if (visible(setup) || visible(lobby)) { rebuild(); fit(); if (body.dataset.front === 'menu') vStart(); } }, 200);
  });
  const watch = new MutationObserver(() => {
    const now = (visible(setup) ? 's' : '') + (visible(lobby) ? 'l' : '');
    if (now === watch.last) return;                     // only the screens changing matters here
    watch.last = now;
    sync(false);
  });
  watch.last = (visible(setup) ? 's' : '') + (visible(lobby) ? 'l' : '');
  for (const sec of [setup, lobby]) watch.observe(sec, { attributes: true, attributeFilter: ['class'] });

  rebuild();
  sync(true);
})();
