/* Pavilion — the title's lettering, for any line of words (5 Oct 2026).

   Abril Fatface, the 1890s fat face, set the way the front door sets
   PAVILION: every letter drawn five times over, a solid shade in six steps
   down and to the right (in screen space, so the light falls the same way on
   every letter), the navy edge, the ivory face, and at night a glow and a row
   of bulbs along its outline. A line stands straight or follows a gentle
   arch, each letter turned to the curve and set on it by its own width,
   kerning and all. Sizes are the drawing's own units, 100 to the em; the
   colours and the lights are style.css's (.sh .edge .face .glow .bulbs).

   The title (scene.js), the game's big moments and the winner's line (ui.js)
   all come from here, so they cannot drift apart. A plain script rather than
   a module, because scene.js is one; ui.js reads the same global. */
(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const FACE = '"Abril Fatface", Didot, "Bodoni 72", Georgia, serif';
  let made = 0;

  function el(tag, a, p) {
    const e = document.createElementNS(NS, tag);
    if (a) for (const k in a) e.setAttribute(k, a[k]);
    if (p) p.appendChild(e);
    return e;
  }

  // A line's advance widths as a running sum, in ems, measured in the face itself. A caller that knows them
  // already passes them in (the title does, so its arch is right before the face has even arrived).
  function widths(word) {
    const c = document.createElement('canvas').getContext('2d');
    c.font = `1000px ${FACE}`;
    return [...Array(word.length + 1)].map((_, i) => c.measureText(word.slice(0, i)).width / 1000);
  }

  // span: the angle the arch covers, in radians (the title's is 0.7, about 40 degrees); 0 sets it straight.
  function line(word, { span = 0, prefix = null } = {}) {
    const id = 'letters' + made++;
    prefix = prefix || widths(word);
    const F = 100, n = word.length, track = 0.03 * F, cap = 0.71 * F;
    const total = prefix[n] * F + (n - 1) * track;
    const R = span ? total / span : 0;
    const shade = [1.15, 1.45], steps = 6, pad = 13;
    const L = [];
    for (let i = 0; i < n; i++) {
      const sMid = (prefix[i] + prefix[i + 1]) / 2 * F + i * track - total / 2;
      const a = R ? sMid / R : 0, adv = (prefix[i + 1] - prefix[i]) * F;
      L.push({ ch: word[i], a, adv, x: R ? R * Math.sin(a) : sMid, y: R ? R * (1 - Math.cos(a)) : 0 });
    }
    // the drawing's own bounds: each letter's box turned with it, plus the shade and the bulbs' glow
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const l of L) {
      for (const [px, py] of [[-l.adv / 2, -cap], [l.adv / 2, -cap], [-l.adv / 2, 2], [l.adv / 2, 2]]) {
        const X = l.x + px * Math.cos(l.a) - py * Math.sin(l.a), Y = l.y + px * Math.sin(l.a) + py * Math.cos(l.a);
        x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
      }
    }
    x0 -= pad; y0 -= pad; x1 += pad + shade[0] * steps; y1 += pad + shade[1] * steps;
    const svg = el('svg', { viewBox: `${x0.toFixed(1)} ${y0.toFixed(1)} ${(x1 - x0).toFixed(1)} ${(y1 - y0).toFixed(1)}`, focusable: 'false', 'aria-hidden': 'true' });
    svg.dataset.w = (x1 - x0).toFixed(1);
    svg.dataset.h = (y1 - y0).toFixed(1);
    const defs = el('defs', null, svg);
    const blur = el('filter', { id: id + '-glow', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs);
    el('feGaussianBlur', { stdDeviation: 3.2 }, blur);
    L.forEach((l, i) => {
      const t = el('text', { id: `${id}-l${i}`, x: 0, y: 0, 'font-family': FACE, 'font-size': F, 'font-weight': 400, 'text-anchor': 'middle', transform: `translate(${l.x.toFixed(2)} ${l.y.toFixed(2)}) rotate(${(l.a * 57.2958).toFixed(2)})` }, defs);
      t.textContent = l.ch;
    });
    L.forEach((l, i) => {
      if (l.ch === ' ') return;
      const g = el('g', { class: 'tl', style: `--i:${i}` }, svg);
      const ref = `#${id}-l${i}`;
      for (let k = steps; k >= 1; k--) el('use', { href: ref, class: 'sh', transform: `translate(${(shade[0] * k).toFixed(2)} ${(shade[1] * k).toFixed(2)})` }, g);
      el('use', { href: ref, class: 'edge' }, g);
      el('use', { href: ref, class: 'face' }, g);
      el('use', { href: ref, class: 'glow', filter: `url(#${id}-glow)` }, g);
      el('use', { href: ref, class: 'bulbs' }, g);
    });
    return svg;
  }

  window.PavilionLetters = { line, FACE };
})();
