/* The Junction Gazette, one front page a week. Shared by the deck (the
   paper overlay on the board slide, read aloud before a week opens) and
   the phones (a small card of the same edition). Week 5 is the rule
   change. The district round-up uses the room's own numbers from the
   week before, computed by whoever is showing the page.

   GAZETTE.edition(w, ctx) -> {mast, kicker, headline, paras:[..], notice:[..]|null, roundup:{...}|null}
   ctx: {shock:bool, last:{n, held, cut, earned, possible}|null, meetings:int|null}
   Text is Claude's draft (16 Sep 2026), every line for Ryan's veto. */
const GAZETTE = (() => {
  const k = v => '£' + v + 'k';
  function roundup(last) {
    if (!last || !last.n) return null;
    return {
      title: 'Around the district',
      lines: [
        last.n + ' signs went up on Monday: ' + last.held + ' at £1.50 and ' + last.cut + ' at £1.40.',
        'Between them the stations took ' + k(last.earned) + ' of the ' + k(last.possible) + ' that was there to be taken.' +
          (last.possible > last.earned ? ' The rest went to the motorists of the district, who say thank you.' : ' Nobody left a penny on the table.'),
      ],
    };
  }
  function edition(w, ctx) {
    ctx = ctx || {};
    const shock = !!ctx.shock;
    const ru = w >= 2 ? roundup(ctx.last) : null;
    const E = { mast: 'The Junction Gazette', kicker: 'Monday morning · Week ' + w, headline: '', paras: [], notice: null, roundup: ru };
    if (w === 1) {
      E.kicker = 'Monday morning · Week 1 · New season';
      E.headline = 'New season opens at the junction';
      E.paras = [
        'Two stations, one crossroads, and a hundred cars a week that can read both signs before they choose a side. Aura Fuels and Buco’s Service Station open the season this morning selling the same fuel at whatever price is on their boards.',
        'Our reporter asked both managers what Monday’s sign would say. Neither would comment.',
        'Weather: dry all week. Good driving.',
      ];
    } else if (w === 2) {
      const cut = ctx.last ? ctx.last.cut : 0;
      E.headline = cut ? 'Price cuts at the junction' : 'Peace at the pumps';
      E.paras = [
        cut ? 'Drivers coming through the junction this week found signs at £1.40 for the first time this season. Regulars at the stations that held say they are staying loyal. Everyone else is following the cheaper sign.'
            : 'Every sign at the junction said £1.50 this week, and the traffic split the way it always has. Not a single driver had a reason to change sides.',
        'Both managers were asked whether next week’s price would change. Both said they would see.',
      ];
    } else if (w === 3) {
      E.kicker = 'Monday morning · Week 3 · Bank holiday';
      E.headline = 'Bank holiday weekend brings twice the traffic';
      E.paras = [
        'Every car that fills up at the junction this week counts for double. The stations know it, the drivers know it, and this paper suspects the signs know it too.',
        (ctx.meetings ? 'Our reporter saw managers from rival stations talking in a car park on Sunday evening, and could not hear a word of it.'
                      : 'Our reporter watched the car park on Sunday evening and saw nobody from either station. Whatever goes on the signs on Monday was decided alone.'),
      ];
    } else if (w === 4) {
      E.headline = 'After the bank holiday, the pumps settle';
      E.paras = [
        'The double week is over and the road is back to its usual hundred cars. Two ordinary weeks remain before the end of the season, and one of them pays double.',
        'A reader writes to ask why two stations selling the same fuel ever post different prices. The editor has passed the question to both managers.',
      ];
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
        E.headline = 'A quiet week before the last one';
        E.paras = [
          'An ordinary week at the junction, and the last one before the season’s closing double. Both managers were seen studying the other side’s sign for longer than usual.',
        ];
      }
    } else {
      if (shock) {
        E.kicker = 'Monday morning · Week 6 · Final week';
        E.headline = 'Last week of the season, and the app is watching';
        E.paras = [
          'FuelWatch now shows the junction to every driver in the district, and whatever goes on the signs this morning is the last word of the season. There are no more meetings.',
          'Undercut alone and the app sends the district to your forecourt: £72k. Match, and it is £12k each at £1.50 or £9k each at £1.40.',
        ];
      } else {
        E.kicker = 'Monday morning · Week 6 · Final week';
        E.headline = 'Last week of the season, and it pays double';
        E.paras = [
          'The season closes this week with the second double: every car that fills up counts twice. Before the signs go up the stations may meet one last time, one person each, if both ask.',
          'After Sunday there is no next week. The paper will be watching the signs on Monday morning like everyone else.',
        ];
      }
    }
    return E;
  }
  return { edition, roundup };
})();
if (typeof module !== 'undefined') module.exports = GAZETTE;
