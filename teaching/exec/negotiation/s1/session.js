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
  ],
});
