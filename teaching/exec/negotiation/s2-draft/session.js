/* Session 2's second exercise (19 Oct 2026): Chiptech, moved here from Session 10 at Ryan's call, so the session has two
   exercises like the rest of the week. New Recruit runs on the sample's own system (deals.js); Chiptech runs on the kit,
   with its phone page at chiptech/ and its room neg2-chiptech. */
NK.session({
  n: 2, prefix: 'neg2', title: 'Creating and Claiming Value',
  steps: [
    /* Chiptech (PON, bought; his LER 543): a CFO and the head of HR over next year's HR budget. Phones record the increase
       agreed, as a percentage of this year's budget, and anything else; the two positions and what each side really needed
       come only from the private file. The demo is invented. */
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
  ],
});
