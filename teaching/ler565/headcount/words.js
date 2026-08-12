// Headcount — the corporate word lists, and the two things built from them.
//
// Room codes and seeds are two (or three) words because their real transport
// is Zoom audio: "synergy bison" survives a bad mic, "X7K2QF" doesn't
// (HEADCOUNT.md, Identity). Shared by the browser (ui.js, net.js) and the
// relay (relay/room.js) so a code minted by the server and a seed typed by a
// player are the same shape.
//
// No ambiguous characters, nothing that reads as an instruction, and no word
// that could land badly in a class transcript.

export const ADJECTIVES = [
  'SYNERGY', 'PIVOT', 'LEVERAGE', 'CASCADE', 'QUANTUM', 'VERTICAL',
  'AGILE', 'HOLISTIC', 'DYNAMIC', 'STRATEGIC', 'ROBUST', 'SCALABLE',
];

export const NOUNS = [
  'BISON', 'MERLOT', 'FALCON', 'WALNUT', 'GLACIER', 'MARMOT',
  'JUNIPER', 'BOBCAT', 'SEQUOIA', 'PELICAN', 'GRANITE', 'OTTER',
];

// crypto.getRandomValues, not Math.random — the engine's ban on Math.random is
// about game state, but a seed *is* game state, and a room code wants to be
// unguessable enough that nobody wanders into someone else's match.
function pick(list, n) {
  const buf = new Uint32Array(n);
  crypto.getRandomValues(buf);
  return [...buf].map((v) => list[v % list.length]);
}

// SYNERGY-BISON — said aloud in a breakout room.
export function roomCode() {
  const [a] = pick(ADJECTIVES, 1);
  const [b] = pick(NOUNS, 1);
  return `${a}-${b}`;
}

// LEVERAGE-MARMOT-42 — a third element, so a recycled room code next week
// doesn't replay last week's bag.
export function freshSeed() {
  const [a] = pick(ADJECTIVES, 1);
  const [b] = pick(NOUNS, 1);
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return `${a}-${b}-${(n[0] % 90) + 10}`;
}
