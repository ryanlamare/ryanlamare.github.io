/* The Junction Gazette, one front page a week, shown on the deck over the
   board and read aloud before the week opens (Ryan, 16 Sep: not on the
   phones). Three headlines from the week before, all holding, all
   cutting, or a mix, a one-line report in the old arcade style, a small
   weather icon, and a small advertisement that is a player from Module 8.
   Week 5 is the rule change. Text is Claude's draft, every line for veto.

   GAZETTE.edition(w, ctx) -> {mast, kicker, headline, paras, notice, roundup, weather:{icon,word}, ad:{name,line}}
   ctx: {shock:bool, last:{n, held, cut, earned, possible, junctions:[{k, pa, pb, ma, mb}]}|null, meetings:int} */
const GAZETTE = (() => {
  const k = v => '£' + v + 'k';
  const ADS = [
    { name: 'Tapas Airways', line: 'Wherever you’re going, we’re going too.' },
    { name: 'Banco Meridiano', line: 'Money, patiently.' },
    { name: 'Northlake Leasing', line: 'Yours until it isn’t.' },
    { name: 'Kestrel Aero Finance', line: 'We build them. We’ll finance them.' },
    { name: 'Granito Air', line: 'Old engines, honest miles.' },
    { name: 'Castellane Capital', line: 'Returns, eventually.' },
  ];
  /* two small stories a week with nothing to do with the stations, so it reads like a paper (Claude's, for veto) */
  const FILLERS = [
    ['Roundabout to be repainted for the third time this year', 'The council says the last coat was the wrong white.'],
    ['Lost tortoise found asleep in the car wash', 'Owner says he has done it before.'],
    ['Parish council debates the height of the new hedge', 'A decision is expected by spring, or the one after.'],
    ['Local choir seeks tenors, will settle for anyone', 'Rehearsals Tuesdays. Biscuits provided.'],
    ['Bus timetable changes, nobody sure how', 'The 41 now leaves either earlier or later.'],
    ['Bridge club welcomes its first member under sixty', 'She has already won twice.'],
    ['Reader’s letter: the potholes have names now', 'The one by the church is called Gerald.'],
    ['Chip shop extends opening hours by ten minutes', 'Queues reported.'],
    ['Weather vane restored, points the wrong way', 'The blacksmith says it is the wind that is wrong.'],
    ['Allotment marrow breaks the village record, again', 'Same grower, same marrow, some say.'],
    ['Library fines waived for the month', 'Return the atlas, whoever you are.'],
    ['Cricket club’s roller stolen, then returned', 'It had been rolled somewhere.'],
  ];
  const WEATHER = [null, { icon: 'sun', word: 'Dry all week' }, { icon: 'cloud', word: 'Overcast' }, { icon: 'sun', word: 'Bank holiday sunshine' }, { icon: 'rain', word: 'Showers' }, { icon: 'wind', word: 'Blustery' }, { icon: 'sun', word: 'Fair' }];
  function theme(last) {
    if (!last || !last.n) return 'first';
    if (last.cut === 0) return 'peace';
    if (last.held === 0) return 'war';
    return 'mixed';
  }
  /* the one-liner, in the old arcade style */
  function report(w, last) {
    const t = theme(last);
    if (t === 'first') return 'The stations are still feeling each other out.';
    if (t === 'peace') return 'What a quiet week! Every sign at the junction said £1.50 and the traffic split the way it always has.';
    if (t === 'war') return 'What a week! Every sign said £1.40, the motorists filled up cheap, and nobody gained a thing on anybody.';
    const steals = last.junctions.filter(j => j.pa !== j.pb);
    const s = steals[0];
    const who = s.pa === '1.40' ? 'Aura' : 'Buco’s', other = s.pa === '1.40' ? 'Buco’s' : 'Aura';
    let line = who + ' at junction ' + s.k + ' pulled a fast one on ' + other + ' and took £' + (s.pa === '1.40' ? s.ma : s.mb) + 'k!';
    if (steals.length > 1) line += ' And it wasn’t the only one.';
    const held = last.junctions.filter(j => j.pa === '1.50' && j.pb === '1.50').length;
    if (held) line += ' Elsewhere, peace.';
    return line;
  }
  function edition(w, ctx) {
    ctx = ctx || {};
    const shock = !!ctx.shock, last = ctx.last, t = theme(last);
    const E = { mast: 'The Junction Gazette', kicker: 'Monday morning · Week ' + w, headline: '', paras: [], notice: null, roundup: null, weather: WEATHER[w] || WEATHER[1], ad: ADS[(w - 1) % ADS.length], fillers: [FILLERS[(w - 1) * 2 % FILLERS.length], FILLERS[((w - 1) * 2 + 1) % FILLERS.length]] };
    const head = { peace: 'Peace at the pumps', war: 'Price wars erupt', mixed: 'Mixed fortunes at the pumps' }[t];
    if (last && last.n) E.roundup = last.n + ' signs went up last Monday, ' + last.held + ' at £1.50 and ' + last.cut + ' at £1.40. The junctions took ' + k(last.earned) + ' of the ' + k(last.possible) + ' there was to take.';
    if (w === 1) {
      E.kicker = 'Monday morning · Week 1 · New season';
      E.headline = 'New season opens at the junction';
      E.paras = [
        'Two stations, one crossroads, and a hundred cars a week that can read both signs before they choose a side. Aura and Buco’s open the season this morning selling the same fuel at whatever price is on their boards.',
        report(w, null),
      ];
    } else if (w === 2) {
      E.headline = head;
      E.paras = [report(w, last), 'Both managers were asked whether next week’s price would change. Both said they would see.'];
    } else if (w === 3) {
      E.kicker = 'Monday morning · Week 3 · Bank holiday';
      E.headline = head + ' as the bank holiday arrives';
      E.paras = [
        report(w, last),
        'Every car that fills up this week counts for double. ' + (ctx.meetings ? 'Our reporter saw managers from rival stations talking in a car park on Sunday evening, and could not hear a word of it.'
          : 'Our reporter watched the car park on Sunday evening and saw nobody from either station.'),
      ];
    } else if (w === 4) {
      E.headline = head + ' after the bank holiday';
      E.paras = [report(w, last), 'The road is back to its usual hundred cars. Two weeks remain, and the last one pays double.'];
    } else if (w === 5) {
      if (shock) {
        E.kicker = 'Stop the presses · Special edition · Week 5';
        E.headline = 'Price wars at the junction go digital';
        E.paras = [
          'FuelWatch, the price app sweeping the region, has just added the junction to its map. From this Monday every driver within twenty miles sees both signs, live, before choosing where to fill up.',
          'What it means is simple, and it is dynamite for the two stations. Undercut your rival on price and the app sends every car on every road to your forecourt: the week’s margin is quadrupled, seventy-two thousand pounds. The undercut station keeps only its two thousand of regulars, the handful who never look at a sign or use an app. Match each other and the app has nothing interesting to show: two signs at £1.50 still pay £12,000 each, two at £1.40 still pay £9,000 each.',
          'This paper can confirm that the week 6 doubling has been called off. These rules replace it for both of the final two weeks. One emergency meeting is on the cards before this week, if both stations ask for it. There will be no meetings after that.',
        ];
        E.notice = [
          'Undercut alone: £72k for the week. The other side gets £2k.',
          'Match each other: £12k each at £1.50, £9k each at £1.40.',
          'No doubling in week 6. One last meeting before week 5, two minutes, only if both stations ask. Then silence.',
        ];
      } else {
        E.headline = head;
        E.paras = [report(w, last), 'An ordinary week, and the last one before the season’s closing double.'];
      }
    } else {
      E.kicker = 'Monday morning · Week 6 · Final week';
      if (shock) {
        E.headline = head + ', and the app is watching';
        E.paras = [report(w, last), 'Whatever goes on the signs this morning is the last word of the season. There are no more meetings. Undercut alone and the app sends the district to your forecourt: £72k. Match, and it is £12k each at £1.50 or £9k each at £1.40.'];
      } else {
        E.headline = head + ' before the final double';
        E.paras = [report(w, last), 'The season closes this week with the second double: every car that fills up counts twice. Before the signs go up the stations may meet one last time, if both ask. After Sunday there is no next week.'];
      }
    }
    return E;
  }
  return { edition, theme, report };
})();
if (typeof module !== 'undefined') module.exports = GAZETTE;
