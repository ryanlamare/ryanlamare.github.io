#!/usr/bin/env node
/* Module 1 tester: plays a room of phones into the module 1 games from the
   terminal, so one person at the deck (with his own phone as one more player)
   can rehearse a whole room. Same idea as trial/m5.js.

   Module 1's rooms have no rehearsal suffix, so THESE ARE THE REAL ROOMS
   (m1-familiarity, m1-number, m1-av): reset them in the Poll Desk afterwards.

     node trial/m1.js familiarity 22     twenty-two answers to How familiar are you?
     node trial/m1.js number 22          twenty-two bots each make ONE guess in the round that is open.
                                         Run it once per round, after Ryan has closed the round before
                                         (CLOSE ROUND & SHOW on the slide). A bot only knows what a phone
                                         knows: its own earlier guesses and whether each was high or low.
                                         It never knows the number. Most halve what is left; some wander
                                         inside it; a few creep in steps. Round 1 piles onto 50, as rooms do.
     node trial/m1.js offers 22          twenty-two offers (£10 to £90, as the phones send them) into the added
                                         value game on the screen. The QR has to be up first (the last keypress on
                                         the slide before the board), and the offers not yet revealed; --game 2 is for the game after I lose three
                                         (higher, since Ryan can walk away)
     node trial/m1.js state              what the rooms hold

   The bots are the same people every time (Bot Ana … ), so a second run in the
   same round is refused by the Worker (one guess a round), which is harmless. */
const API = process.env.GT_API || 'https://gt-poll.rlamare.workers.dev';
const args = process.argv.slice(2), cmd = args[0], N = Math.max(1, Math.min(60, parseInt(args[1], 10) || 22));
const opt = {}; for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[i + 1];
const NAMES = ['Ana','Ben','Cara','Dev','Eli','Fern','Gus','Hana','Ivo','Jo','Kim','Lou','Max','Nia','Oli','Pat','Quin','Rae','Sol','Tess','Uma','Vic','Wes','Xan','Yas','Zed','Abe','Bea','Cy','Dot','Ed','Flo','Gil','Hal','Ida','Jay','Kit','Len','Mo','Nat','Oz','Pia','Rex','Sue','Ty','Una','Val','Wyn','Yul','Zoe','Ari','Bo','Cal','Dee','Eve','Fox','Gia','Hux','Ike','Jan'];
const bot = i => ({ v: 'trial-m1-bot-' + String(i + 1).padStart(2, '0') + '-0000', n: 'Bot ' + NAMES[i] });
/* a steady per-bot coin, so a bot keeps its character from round to round */
const h01 = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; };
const post = (path, body) => fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async r => ({ status: r.status, d: await r.json().catch(() => ({})) }));
const get = path => fetch(API + path).then(r => r.json());

const cmds = {
  async familiarity() {
    /* a room that mostly has not met game theory, with a few who have */
    const w = [0.35, 0.4, 0.2, 0.05]; let ok = 0;
    for (let i = 0; i < N; i++) { const b = bot(i); let r = h01('fam' + b.v), o = 0; while (o < 3 && r > w[o]) { r -= w[o]; o++; }
      const res = await post('/p/m1-familiarity/vote', { o, v: b.v }); if (res.status === 200) ok++; }
    console.log(ok + ' of ' + N + ' answers in. Press the arrow on the deck to reveal.');
  },
  async number() {
    const t = await get('/p/m1-number/target'), all = (await get('/p/m1-number/guesses')).guesses || [];
    if (!t.set) { console.log('The number is not set on the Worker, so no guess can be answered.'); return; }
    const rd = t.round || 1; if (rd > 5) { console.log('All five rounds are closed. Reset m1-number in the Poll Desk to play again.'); return; }
    const tally = { high: 0, low: 0, correct: 0, skipped: 0, done: 0 };
    for (let i = 0; i < N; i++) {
      const b = bot(i), mine = all.filter(x => x.v === b.v);
      if (mine.some(x => x.r === 'correct')) { tally.done++; continue; }
      if (mine.some(x => x.rd === rd)) { tally.skipped++; continue; }
      let lo = 1, hi = 100; mine.forEach(x => { if (x.r === 'high') hi = Math.min(hi, x.g - 1); if (x.r === 'low') lo = Math.max(lo, x.g + 1); });
      const kind = h01('kind' + b.v), r = h01('r' + rd + b.v); let g;
      if (!mine.length) g = kind < 0.55 ? 50 : (kind < 0.75 ? [25, 75, 40, 60, 33, 66][Math.floor(r * 6)] : 1 + Math.floor(r * 100));
      else if (kind < 0.6) g = Math.round((lo + hi) / 2 + (r - 0.5) * Math.min(4, hi - lo));           /* halves what is left */
      else if (kind < 0.85) g = lo + Math.floor(r * (hi - lo + 1));                                     /* wanders inside it */
      else { const last = mine[mine.length - 1]; g = last.r === 'high' ? last.g - 10 : last.g + 10; } /* creeps in tens */
      g = Math.max(lo, Math.min(hi, Math.max(1, Math.min(100, g))));
      const res = await post('/p/m1-number/guess', { v: b.v, n: b.n, g });
      if (res.status === 200) tally[res.d.r]++; else tally.skipped++;
    }
    console.log('Round ' + rd + ': ' + (tally.high + tally.low + tally.correct) + ' guesses in (' + tally.high + ' too high, ' + tally.low + ' too low, ' + tally.correct + ' correct)' +
      (tally.done ? ', ' + tally.done + ' already solved it' : '') + (tally.skipped ? ', ' + tally.skipped + ' had already played this round' : '') + '.');
    console.log(rd < 5 ? 'Make your own guess on your phone, then CLOSE ROUND & SHOW on the slide, then run this again for round ' + (rd + 1) + '.' : 'That was the last round. CLOSE ROUND & SHOW on the slide ends the game.');
  },
  async offers() {
    const game = opt.game === '2' ? 2 : 1; let ok = 0;
    /* an offer counts only after the deck's marker for this game and before Ryan reveals the offers, so look first */
    const L = ((await get('/p/m1-av/answers')).answers || []).map(t => String(t).split('|').map(x => x.trim()));
    let g = -1, ph = 0; L.forEach((p, i) => { if (p[0] === '=game' && p[1] === 'p') { g = i; ph = +p[2]; } });
    if (g < 0) { console.log('No offers game is open yet: bring the QR code up on the slide first (the last keypress on Added value game), then run this again.'); return; }
    if (ph !== game) { console.log('The game on the screen is game ' + ph + ', not game ' + game + '. ' + (ph === 2 ? 'Add --game 2.' : 'Drop --game 2.')); return; }
    if (L.some((p, i) => i > g && p[0] === '=game' && p[1] === 'r' && +p[2] === ph)) { console.log('The offers for game ' + ph + ' have been revealed, so the game is closed.'); return; }
    for (let i = 0; i < N; i++) { const b = bot(i), r = h01('off' + game + b.v);
      /* the phones offer in tens, £10 to £90. Game 1: most offer near an even split, a few try it on, a few overpay.
         Game 2: some see that Ryan can walk away and pay up, many still anchor on 50 */
      const amt = game === 1 ? (r < 0.4 ? 50 : r < 0.52 ? 40 : r < 0.62 ? 60 : r < 0.74 ? 30 : r < 0.82 ? 20 : r < 0.86 ? 10 : r < 0.94 ? 70 : 80)
                             : (r < 0.3 ? 90 : r < 0.45 ? 80 : r < 0.58 ? 70 : r < 0.68 ? 60 : r < 0.9 ? 50 : 40);
      const res = await post('/p/m1-av/say', { t: b.n + '|o|' + amt, v: b.v + (game === 2 ? 'b' : 'a') }); if (res.status === 200) ok++; }
    console.log(ok + ' of ' + N + ' offers in for game ' + game + '. They stay hidden, counted beside the QR, until Ryan moves on to the board slide; then he decides each one.');
  },
  async state() {
    const f = await get('/p/m1-familiarity'), t = await get('/p/m1-number/target'), g = (await get('/p/m1-number/guesses')).guesses || [], a = (await get('/p/m1-av/answers')).answers || [];
    console.log('m1-familiarity: ' + (f.total || 0) + ' answers ' + JSON.stringify(f.counts || []));
    console.log('m1-number: number set ' + !!t.set + ', round ' + (t.round || 1) + ', ' + g.length + ' guesses; by round ' + [1, 2, 3, 4, 5].map(r => g.filter(x => x.rd === r).length).join(' / ') + '; solved by ' + g.filter(x => x.r === 'correct').length);
    console.log('m1-av: ' + a.length + ' lines (' + a.filter(x => /\|o\|/.test(String(x))).length + ' offers, ' + a.filter(x => /\|d\|/.test(String(x))).length + ' decided)');
  }
};
if (!cmds[cmd]) { console.log('Commands: familiarity N | number N | offers N [--game 2] | state.  These are the REAL rooms: reset them in the Poll Desk afterwards.'); process.exit(cmd ? 2 : 0); }
cmds[cmd]().catch(e => { console.error('Did not reach the Worker: ' + e.message); process.exit(1); });
