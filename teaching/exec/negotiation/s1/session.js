/* Session 1, Introduction to Negotiation (17 Oct 2026): what the room does on its phones.
   Shared by the deck (s1/) and the phone page (s1/deal/). The demo room below is invented; the real
   bargaining zone and each side's limit come from the session's private file, dropped on the deck. */
NK.session({
  n: 1, prefix: 'neg1', title: 'Introduction to Negotiation',
  steps: [
    /* his BADM 590 list of what tends to go wrong, asked of each person before the room sees the list */
    {id:'wrong', type:'poll', q:'Which of these do you do most often?',
     o:['I don’t even try to negotiate',
        'I under-prepare, or prepare the wrong way',
        'I focus on my own interests only',
        'I assume that starting out cooperative will make me look weak',
        'I weaken relationships through mistakes made while negotiating',
        'I think negotiating means I win and you lose'],
     demo:[8, 9, 4, 3, 2, 5]},
    /* the fee, then the other terms in two boxes, as his LER 543 outcomes sheet had them (18 Oct 2026) */
    {id:'sally', type:'deal', name:'Sally Soprano', group:'pair', max:24,
     roles:[{k:'a', n:'Sally’s agent'}, {k:'m', n:'Lyric Opera’s business manager'}],
     /* for pairs that finish early, his LER 543 outcome sheets' questions (19 Oct 2026) */
     wait:[{k:'s', q:'What are Sally’s interests?', short:'Sally'}, {k:'l', q:'What are Lyric Opera’s interests?', short:'Lyric Opera'}],
     fields:[{k:'fee', type:'money', cur:'$', q:'Sally’s fee for the run', short:'Fee', min:0, max:999999}],
     recordQ:'Record your agreement',
     extras:[{k:'money', q:'Any other money you agreed?', short:'Other money'},
             {k:'terms', q:'Anything non-financial you agreed?', short:'Non-financial'}],
     demo:{seed:20261017, groups:14, gen:(r, n) => {
       if (n === 9) return {x:true};
       const fee = Math.round((16000 + Math.pow(r(), 1.3) * 30000) / 500) * 500;
       const M = {3:'Travel and hotel paid by the Lyric', 7:'A fee for any recording of the run', 11:'Half the fee paid on signing'};
       const T = {2:'A joint press release on her return', 5:'Her name first on the poster and the programme',
                  7:'First refusal on next season’s lead role', 13:'Two extra rehearsals with the conductor'};
       const d = {vals:{fee}};
       if (M[n] || T[n]) { d.texts = {}; if (M[n]) d.texts.money = M[n]; if (T[n]) d.texts.terms = T[n]; }
       if (n === 12) d.diff = {m:{fee:fee + 2000}};
       if (n === 14) d.skip = ['m'];
       return d;
     }}},
    /* his LER 543 week 1 exercise, at the back of the session (18 Oct 2026), recorded as his outcomes sheet had it: what
       the pair plans to do, the price they will offer him as Mr. Cardoza, and any special conditions. Nothing here, the demo
       included, gives the case away: what each doctor needs comes only from the private file. */
    {id:'ugli', type:'deal', name:'Ugli Orange', group:'pair', max:24,
     roles:[{k:'j', n:'Dr. Jones'}, {k:'r', n:'Dr. Roland'}],
     /* for pairs that finish early, his LER 543 outcome sheets' questions (19 Oct 2026) */
     wait:[{k:'j', q:'What are Dr. Jones’s interests?', short:'Dr. Jones'}, {k:'r', q:'What are Dr. Roland’s interests?', short:'Dr. Roland'}],
     fields:[{k:'who', type:'choice', q:'Who will buy the oranges?', short:'Buying', o:['Dr. Jones', 'Dr. Roland', 'Both of us, together']},
             {k:'price', type:'money', cur:'$', q:'The price you will offer Mr. Cardoza', short:'Price', min:0, max:9999999, optional:true}],
     recordQ:'Record your plan', sentWord:'Plan recorded', nodealButton:'We did not reach an agreement', nodealTitle:'No agreement',
     dealAfterAll:'We did reach an agreement',
     extras:[{k:'plan', q:'What do you plan to do?', short:'Plan'},
             {k:'cond', q:'Any special conditions, on delivery or anything else?', short:'Conditions'}],
     demo:{seed:20261018, groups:14, gen:(r, n) => {
       if (n === 4 || n === 10 || n === 13) return {x:true};
       const P = {1:[2, 'We pool our money and buy all the oranges together', 140000],
                  2:[0, 'Dr. Jones buys them all and gives Dr. Roland first refusal next season', 185000],
                  3:[2, 'We split the oranges half and half, and share the cost', 160000],
                  5:[1, 'Dr. Roland buys them, because his deadline comes first', 205000],
                  6:[2, 'We buy together, and one lab collects them and shares out what each of us needs', 120000],
                  7:[0, 'Dr. Jones buys them all', 230000],
                  8:[2, 'We split the oranges half and half', 175000],
                  9:[2, 'We make one joint offer and share the oranges between our labs', 110000],
                  11:[1, 'Dr. Roland buys them and pays Dr. Jones to stay out of the bidding', 195000],
                  12:[2, 'We buy together and work out who gets what afterwards', 150000],
                  14:[0, 'Dr. Jones buys them; Dr. Roland gets any left over', 210000]};
       const C = {1:'Delivery to one lab within the week', 6:'Mr. Cardoza keeps the sale confidential', 9:'Half paid now, half on delivery'};
       const p = P[n], d = {vals:{who:p[0], price:p[2]}, texts:{plan:p[1]}};
       if (C[n]) d.texts.cond = C[n];
       return d;
     }}},
  ],
});
