/* Session 10, Harborco Debrief and Wrap-Up (17 Oct 2026): what the phones ask, in order, and what the deck reads.
   Harborco and the opening question were played in Session 9, so the deck reads those rooms (prefix neg9) and the
   phones never ask them again (phone:false). Then the hardest part of Harborco, asked now, and the Blue Buggy. */
NK.session({
  n: 10, prefix: 'neg10', title: 'Harborco Debrief and Wrap-Up',
  steps: [
    Object.assign({id:'harborco', prefix:'neg9', phone:false}, window.HARBORCO),
    {id:'expect', prefix:'neg9', phone:false, type:'poll', q:'What do you expect to be the hardest part of a six-party negotiation?',
     o:window.HARBORCO_HARD, demo:[9, 6, 12, 5]},
    {id:'hardest', type:'poll', q:'Looking back, what was the hardest part of Harborco for you?', o:window.HARBORCO_HARD, demo:[13, 10, 5, 4]},
    /* Chiptech (PON, bought; his LER 543), before the Blue Buggy (Ryan, 18 Oct 2026): a CFO and the head of HR over next year's
       HR budget. Phones record the increase agreed, as a percentage of this year's budget, and anything else; the two
       positions and what each side really needed come only from the private file. The demo is invented. */
    {id:'chiptech', type:'deal', name:'Chiptech', group:'pair', max:24,
     roles:[{k:'c', n:'Chris Brown, CFO'}, {k:'t', n:'Terry Austin, head of HR'}],
     fields:[{k:'pct', type:'money', cur:'', suffix:'%', q:'The increase in HR’s budget (%)', short:'Increase', min:0, max:100}],
     recordQ:'Record your agreement', extra:'Anything else you agreed?',
     nodealButton:'We could not set the budget', nodealTitle:'No budget', dealAfterAll:'We did set the budget', sentWord:'Agreement recorded',
     demo:{seed:20261054, groups:14, gen:(r, n) => {
       if (n === 6 || n === 11) return {x:true};
       const P = {1:8, 2:15, 3:8, 4:20, 5:12, 7:8, 8:17, 9:24, 10:10, 12:8, 13:16, 14:11};
       const T = {1:'The rest is phased in over three years', 3:'Two divisions try the new model first', 7:'Savings from lower turnover are measured and returned to HR', 12:'A review in six months decides the next step'};
       return {vals:{pct:P[n]}, text:T[n]};
     }}},
    {id:'buggy', type:'deal', name:'The Blue Buggy', group:'pair', max:24,
     roles:[{k:'b', n:'Buyer'}, {k:'s', n:'Seller'}],
     fields:[{k:'price', type:'money', cur:'$', q:'The price of the car', short:'Price', min:0, max:99999}],
     recordQ:'Record your deal', extra:'Anything else you agreed?',
     /* invented */
     demo:{seed:20261101, groups:14, gen:(r, n) => {
       if (n % 4 === 0) return {x:true};
       return {vals:{price:Math.round((3150 + r() * 300) / 25) * 25}, text:n === 3 ? 'The seller keeps the roof rack' : null};
     }}},
  ],
});
