// Pavilion — the emblems a champion can pick for their trophy (build step 6).
//
// ⚠️ **Nothing here is drawn new.** Every symbol is lifted from the game's own
// sprite (the five disciplines) or from the LER 565 decks, which is the house
// rule for pictograms: copy an existing isotype rather than redrawing one, so
// the whole site stays in Arntz's hand rather than in several.
//
// One module, two consumers: the Hall of Champions renders the chosen emblem,
// and the admin page shows the same grid to pick from — so what Ryan clicks is
// literally what the cabinet will show.
//
// The symbols paint with `currentColor` and knock out with `--t-bg`, so the
// colour is set by whatever encloses them (the trophy bowl, in practice).
//
// ---------------------------------------------------------------------------
// **Drawing one for a champion who asks.** This is expected, not exceptional:
// one champion a cohort, so a bespoke emblem is an afternoon's luxury the
// project can easily afford, and it is the single most personal thing on the
// site. Ask them what they want on their cup; draw it; add it here.
//
//   1. Add a `<symbol id="em-<thing>" viewBox="0 0 24 24">` to SPRITE below.
//      The `em-` prefix marks it as drawn for this cabinet rather than lifted.
//   2. Add `{ id: 'em-<thing>', label: '<Thing>' }` to EMBLEMS.
//   3. Push, then set it on the card in the admin page — in that order. The
//      cabinet falls back to a plain cup for an id it doesn't have, so a card
//      saved first is not broken, just unengraved until the deploy lands.
//
// ⚠️ **It has to work as a silhouette.** These are isotypes, not illustrations:
// one solid shape in `currentColor`, holes knocked out with
// `fill="var(--t-bg, transparent)"`, no gradients, no strokes thinner than
// about 1.5 units, no text. It is rendered at 36px inside a gold bowl and must
// stay legible in greyscale — which is the same rule the tiles follow, and the
// reason the board is readable to a colour-blind player at all.
//
// A request that cannot be a silhouette (a portrait, a logo, a word) is worth
// pushing back on with a suggestion rather than accepting badly: "a lighthouse"
// works, "my dog Biscuit" works as a dog, a signature does not.

export const EMBLEMS = [
  { id: 'ic-art', label: 'Art' },
  { id: 'ic-sci', label: 'Science' },
  { id: 'ic-mac', label: 'Machinery' },
  { id: 'ic-ele', label: 'Electricity' },
  { id: 'ic-nat', label: 'Agriculture' },
  { id: 'im-trophy', label: 'Trophy' },
  { id: 'im-podium', label: 'Podium' },
  { id: 'im-target', label: 'Target' },
  { id: 'im-shield', label: 'Shield' },
  { id: 'im-scales', label: 'Scales' },
  { id: 'im-anchor', label: 'Anchor' },
  { id: 'im-sun', label: 'Sun' },
  { id: 'im-moon', label: 'Moon' },
  { id: 'im-eye', label: 'Eye' },
  { id: 'im-coin', label: 'Coin' },
  { id: 'im-die', label: 'Die' },
  { id: 'im-mask', label: 'Mask' },
  { id: 'im-magnifier', label: 'Magnifier' },
  { id: 'im-fist', label: 'Fist' },
  { id: 'im-worker', label: 'Worker' },
  { id: 'im-crowd-grid', label: 'Crowd' },
];

export const SPRITE = `<svg style="display:none" aria-hidden="true">
  <symbol id="ic-art" viewBox="0 0 24 24">
      <ellipse cx="11.6" cy="12.6" rx="10" ry="8.8" fill="currentColor"/>
      <circle cx="20.8" cy="5.2" r="5.6" fill="var(--t-bg, transparent)"/>
      <circle cx="14.2" cy="15.2" r="2.5" fill="var(--t-bg, transparent)"/>
    </symbol>
  <symbol id="ic-sci" viewBox="0 0 24 24">
      <path d="M9.6,2.6 H14.4 V8.7 L20.9,20.0 Q21.6,21.4 20.1,21.4 H3.9 Q2.4,21.4 3.1,20.0 L9.6,8.7 Z"
            fill="currentColor"/>
    </symbol>
  <symbol id="ic-mac" viewBox="0 0 24 24">
      <path d="M14.34,9.79 L16.06,10.86 L15.59,12.15 L13.59,11.85 L12.22,13.34 L12.68,15.30 L11.43,15.88 L10.23,14.26 L8.21,14.34 L7.14,16.06 L5.85,15.59 L6.15,13.59 L4.66,12.22 L2.70,12.68 L2.12,11.43 L3.74,10.23 L3.66,8.21 L1.94,7.14 L2.41,5.85 L4.41,6.15 L5.78,4.66 L5.32,2.70 L6.57,2.12 L7.77,3.74 L9.79,3.66 L10.86,1.94 L12.15,2.41 L11.85,4.41 L13.34,5.78 L15.30,5.32 L15.88,6.57 L14.26,7.77 Z"
            fill="currentColor"/>
      <path d="M20.57,18.21 L21.72,19.48 L20.99,20.46 L19.44,19.74 L17.89,20.55 L17.62,22.24 L16.39,22.29 L16.00,20.62 L14.39,19.92 L12.90,20.76 L12.10,19.83 L13.16,18.48 L12.70,16.78 L11.12,16.14 L11.35,14.94 L13.06,14.92 L14.10,13.51 L13.62,11.87 L14.70,11.30 L15.78,12.63 L17.53,12.57 L18.51,11.16 L19.63,11.65 L19.27,13.33 L20.41,14.66 L22.12,14.55 L22.43,15.73 L20.90,16.49 Z"
            fill="currentColor"/>
      <circle cx="9" cy="9" r="2.1" fill="var(--t-bg, transparent)"/>
      <circle cx="16.8" cy="16.6" r="1.6" fill="var(--t-bg, transparent)"/>
    </symbol>
  <symbol id="ic-ele" viewBox="0 0 24 24">
      <path d="M14.4,1.6 L4.6,13.6 H9.9 L9.0,22.4 L19.2,10.0 H13.7 Z" fill="currentColor"/>
    </symbol>
  <symbol id="ic-nat" viewBox="0 0 24 24">
      <circle cx="12" cy="8.6" r="6.4" fill="currentColor"/>
      <circle cx="7.4" cy="11.4" r="4.4" fill="currentColor"/>
      <circle cx="16.6" cy="11.4" r="4.4" fill="currentColor"/>
      <rect x="10.4" y="11" width="3.2" height="11.2" rx="0.6" fill="currentColor"/>
    </symbol>
  <symbol id="im-trophy" viewBox="0 0 64 64"><path fill="var(--red,#CE1E32)" d="M18 9 h28 v11 a14 14 0 0 1 -28 0 z"></path><path fill="none" stroke="var(--ink,#1B1C19)" stroke-width="3.6" d="M18 13 h-7 a6 6 0 0 0 0 12 h4"></path><path fill="none" stroke="var(--ink,#1B1C19)" stroke-width="3.6" d="M46 13 h7 a6 6 0 0 1 0 12 h-4"></path><rect fill="var(--ink,#1B1C19)" x="29" y="34" width="6" height="11"></rect><rect fill="var(--ink,#1B1C19)" x="19" y="45" width="26" height="5"></rect><rect fill="var(--ink,#1B1C19)" x="23" y="50" width="18" height="7"></rect></symbol>
  <symbol id="im-podium" viewBox="0 0 64 64"><rect fill="var(--ink,#1B1C19)" x="24" y="16" width="16" height="42"></rect><rect fill="var(--ink,#1B1C19)" x="4" y="30" width="16" height="28"></rect><rect fill="var(--red,#CE1E32)" x="44" y="36" width="16" height="22"></rect><rect fill="var(--ink,#1B1C19)" x="2" y="58" width="60" height="3"></rect></symbol>
  <symbol id="im-target" viewBox="0 0 64 64"><circle cx="32" cy="32" r="23" fill="none" stroke="var(--ink,#1B1C19)" stroke-width="3.5"></circle><circle cx="32" cy="32" r="13" fill="none" stroke="var(--ink,#1B1C19)" stroke-width="3.5"></circle><circle fill="var(--red,#CE1E32)" cx="32" cy="32" r="5"></circle></symbol>
  <symbol id="im-shield" viewBox="0 0 64 64"><path fill="var(--ink,#1B1C19)" d="M32 6 L54 14 V32 Q54 50 32 60 Q10 50 10 32 V14 Z"></path><path fill="none" stroke="var(--paper,#E9E2D2)" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" d="M22 31 l7 7 l13 -15"></path></symbol>
  <symbol id="im-scales" viewBox="0 0 64 64"><rect fill="var(--ink,#1B1C19)" x="30" y="17" width="4" height="33"></rect><rect fill="var(--ink,#1B1C19)" x="8" y="16" width="48" height="4.4" rx="1"></rect><path fill="var(--ink,#1B1C19)" d="M21,50 L43,50 L48,59 L16,59 Z"></path><rect fill="var(--ink,#1B1C19)" x="12.2" y="20" width="2.6" height="9"></rect><path fill="var(--ink,#1B1C19)" d="M5,29 Q13.5,42 22,29 Z"></path><rect fill="var(--ink,#1B1C19)" x="49.2" y="20" width="2.6" height="9"></rect><path fill="var(--ink,#1B1C19)" d="M42,29 Q50.5,42 59,29 Z"></path><circle fill="var(--red,#CE1E32)" cx="32" cy="18.2" r="4.2"></circle></symbol>
  <symbol id="im-anchor" viewBox="0 0 64 64"><circle fill="var(--ink,#1B1C19)" cx="32" cy="10" r="6"></circle><circle fill="var(--paper,#E9E2D2)" cx="32" cy="10" r="2.5"></circle><rect fill="var(--ink,#1B1C19)" x="29.5" y="14" width="5" height="38"></rect><rect fill="var(--ink,#1B1C19)" x="20" y="22" width="24" height="5"></rect><path fill="var(--ink,#1B1C19)" d="M12 40 Q12 56 32 58 Q52 56 52 40 L46 43 Q43 50 32 50 Q21 50 18 43 Z"></path></symbol>
  <symbol id="im-sun" viewBox="0 0 64 64"><circle fill="var(--red,#CE1E32)" cx="32" cy="32" r="13"></circle><g stroke="var(--ink,#1B1C19)" stroke-width="4" stroke-linecap="round"><line x1="32" y1="5" x2="32" y2="14"></line><line x1="32" y1="50" x2="32" y2="59"></line><line x1="5" y1="32" x2="14" y2="32"></line><line x1="50" y1="32" x2="59" y2="32"></line><line x1="12.6" y1="12.6" x2="19" y2="19"></line><line x1="45" y1="45" x2="51.4" y2="51.4"></line><line x1="51.4" y1="12.6" x2="45" y2="19"></line><line x1="19" y1="45" x2="12.6" y2="51.4"></line></g></symbol>
  <symbol id="im-moon" viewBox="0 0 64 64"><path fill="var(--ink,#1B1C19)" d="M40 7 a26 26 0 1 0 4 51 a21 21 0 0 1 -4 -51 z"></path><circle fill="var(--red,#CE1E32)" cx="49" cy="20" r="3.4"></circle><circle fill="var(--red,#CE1E32)" cx="40" cy="33" r="2.3"></circle></symbol>
  <symbol id="im-eye" viewBox="0 0 64 44"><path fill="none" stroke="var(--ink,#1B1C19)" stroke-width="4" stroke-linecap="round" d="M6 22 Q32 2 58 22"></path><path fill="none" stroke="var(--ink,#1B1C19)" stroke-width="4" stroke-linecap="round" d="M6 22 Q32 42 58 22"></path><circle fill="var(--ink,#1B1C19)" cx="32" cy="22" r="9"></circle><circle fill="var(--red,#CE1E32)" cx="32" cy="22" r="4.5"></circle></symbol>
  <symbol id="im-coin" viewBox="0 0 64 64"><circle fill="var(--ink,#1B1C19)" cx="32" cy="32" r="24"></circle><circle fill="var(--paper,#E9E2D2)" cx="32" cy="32" r="19"></circle><text x="32" y="42" text-anchor="middle" font-family="Jost, sans-serif" font-weight="700" font-size="26" fill="var(--ink,#1B1C19)">$</text></symbol>
  <symbol id="im-die" viewBox="0 0 64 64"><rect x="14" y="14" width="36" height="36" rx="7" fill="none" stroke="var(--ink,#1B1C19)" stroke-width="3"></rect><circle fill="var(--ink,#1B1C19)" cx="24" cy="24" r="3.2"></circle><circle fill="var(--ink,#1B1C19)" cx="40" cy="24" r="3.2"></circle><circle fill="var(--red,#CE1E32)" cx="32" cy="32" r="3.6"></circle><circle fill="var(--ink,#1B1C19)" cx="24" cy="40" r="3.2"></circle><circle fill="var(--ink,#1B1C19)" cx="40" cy="40" r="3.2"></circle></symbol>
  <symbol id="im-mask" viewBox="0 0 64 64"><path fill="var(--ink,#1B1C19)" d="M8 22 Q32 15 56 22 Q58 41 43 45 Q35 47 32 40 Q29 47 21 45 Q6 41 8 22 Z"></path><circle fill="var(--paper,#E9E2D2)" cx="21" cy="29" r="5.4"></circle><circle fill="var(--paper,#E9E2D2)" cx="43" cy="29" r="5.4"></circle><circle fill="var(--red,#CE1E32)" cx="21" cy="29" r="2.4"></circle><circle fill="var(--red,#CE1E32)" cx="43" cy="29" r="2.4"></circle></symbol>
  <symbol id="im-magnifier" viewBox="0 0 64 64"><circle fill="none" stroke="var(--ink,#1B1C19)" stroke-width="6" cx="27" cy="27" r="17"></circle><line stroke="var(--ink,#1B1C19)" stroke-width="7" stroke-linecap="round" x1="40" y1="40" x2="55" y2="55"></line><circle fill="var(--red,#CE1E32)" cx="27" cy="27" r="6"></circle></symbol>
  <symbol id="im-fist" viewBox="0 0 64 64"><rect fill="var(--red,#CE1E32)" x="25" y="34" width="13" height="25" rx="2"></rect><rect fill="var(--red,#CE1E32)" x="21" y="19" width="21" height="18" rx="4"></rect><rect fill="var(--red,#CE1E32)" x="17" y="25" width="6" height="9" rx="3"></rect><line fill="none" stroke="var(--paper,#E9E2D2)" stroke-width="2" stroke-linecap="round" x1="26" y1="21" x2="26" y2="30"></line><line fill="none" stroke="var(--paper,#E9E2D2)" stroke-width="2" stroke-linecap="round" x1="31" y1="20" x2="31" y2="30"></line><line fill="none" stroke="var(--paper,#E9E2D2)" stroke-width="2" stroke-linecap="round" x1="37" y1="21" x2="37" y2="30"></line></symbol>
  <symbol id="im-worker" viewBox="0 0 90 132"><circle fill="var(--ink,#1B1C19)" cx="45" cy="20" r="14"></circle><path fill="var(--ink,#1B1C19)" d="M22 46 Q45 36 68 46 L60 92 L30 92 Z"></path><rect fill="var(--ink,#1B1C19)" x="31" y="92" width="12" height="36"></rect><rect fill="var(--ink,#1B1C19)" x="47" y="92" width="12" height="36"></rect></symbol>
  <symbol id="im-crowd-grid" viewBox="0 0 116 132"><circle fill="var(--ink,#1B1C19)" cx="12" cy="12" r="5"></circle><path fill="var(--ink,#1B1C19)" d="M3 21 Q12 17 21 21 L18 38 L6 38 Z"></path><circle fill="var(--ink,#1B1C19)" cx="52" cy="12" r="5"></circle><path fill="var(--ink,#1B1C19)" d="M43 21 Q52 17 61 21 L58 38 L46 38 Z"></path><circle fill="var(--ink,#1B1C19)" cx="92" cy="12" r="5"></circle><path fill="var(--ink,#1B1C19)" d="M83 21 Q92 17 101 21 L98 38 L86 38 Z"></path><circle fill="var(--ink,#1B1C19)" cx="12" cy="52" r="5"></circle><path fill="var(--ink,#1B1C19)" d="M3 61 Q12 57 21 61 L18 78 L6 78 Z"></path><circle fill="var(--red,#CE1E32)" cx="52" cy="52" r="5"></circle><path fill="var(--red,#CE1E32)" d="M43 61 Q52 57 61 61 L58 78 L46 78 Z"></path><circle fill="var(--ink,#1B1C19)" cx="92" cy="52" r="5"></circle><path fill="var(--ink,#1B1C19)" d="M83 61 Q92 57 101 61 L98 78 L86 78 Z"></path><circle fill="var(--ink,#1B1C19)" cx="12" cy="92" r="5"></circle><path fill="var(--ink,#1B1C19)" d="M3 101 Q12 97 21 101 L18 118 L6 118 Z"></path><circle fill="var(--ink,#1B1C19)" cx="52" cy="92" r="5"></circle><path fill="var(--ink,#1B1C19)" d="M43 101 Q52 97 61 101 L58 118 L46 118 Z"></path><circle fill="var(--ink,#1B1C19)" cx="92" cy="92" r="5"></circle><path fill="var(--ink,#1B1C19)" d="M83 101 Q92 97 101 101 L98 118 L86 118 Z"></path></symbol>
</svg>`;
