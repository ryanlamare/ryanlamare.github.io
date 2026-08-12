// Pavilion — the Fair word lists, and the two things built from them.
//
// Room codes and seeds are two (or three) words because their real transport
// is Zoom audio: "ferris norway" survives a bad mic, "X7K2QF" doesn't
// (PAVILION.md, Identity). Shared by the browser (ui.js, net.js) and the
// relay (relay/room.js) so a code minted by the server and a seed typed by a
// player are the same shape.
//
// Icon plus national pavilion, both from the 1893 World's Columbian
// Exposition: FERRIS-NORWAY, MIDWAY-BRAZIL, TESLA-CEYLON. No ambiguous
// characters, nothing that needs spelling out, and A–Z only — the Worker
// checks incoming codes against /^[A-Z]+-[A-Z]+$/.
//
// ⚠️ Two deliberate exclusions (PAVILION.md, Naming). **Nothing from the
// Midway's ethnographic villages** — that part of the Fair's history is real
// and explicitly out of scope here. And **none of the five discipline names**:
// a room called MACHINERY-something sitting beside a Machinery tile is a
// needless collision.

export const ICONS = [
  'FERRIS', 'MIDWAY', 'WHITECITY', 'PERISTYLE', 'LAGOON', 'REPUBLIC',
  'GOLDENDOOR', 'WOODEDISLE', 'JACKSONPARK', 'BURNHAM', 'OLMSTED', 'TESLA',
  'EDISON', 'CRACKERJACK', 'BLUERIBBON', 'SHREDDEDWHEAT',
];

export const PAVILIONS = [
  'JAPAN', 'NORWAY', 'GERMANY', 'FRANCE', 'BRAZIL', 'SWEDEN', 'SPAIN',
  'CEYLON', 'TURKEY', 'IRELAND', 'CANADA', 'ITALY', 'GREECE', 'DENMARK',
  'SIAM', 'MEXICO',
];

// crypto.getRandomValues, not Math.random — the engine's ban on Math.random is
// about game state, but a seed *is* game state, and a room code wants to be
// unguessable enough that nobody wanders into someone else's match.
function pick(list, n) {
  const buf = new Uint32Array(n);
  crypto.getRandomValues(buf);
  return [...buf].map((v) => list[v % list.length]);
}

// FERRIS-NORWAY — said aloud in a breakout room.
export function roomCode() {
  const [a] = pick(ICONS, 1);
  const [b] = pick(PAVILIONS, 1);
  return `${a}-${b}`;
}

// TESLA-CEYLON-47 — a third element, so a recycled room code next week
// doesn't replay last week's bag.
export function freshSeed() {
  const [a] = pick(ICONS, 1);
  const [b] = pick(PAVILIONS, 1);
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return `${a}-${b}-${(n[0] % 90) + 10}`;
}
