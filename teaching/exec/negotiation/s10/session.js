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
    {id:'buggy', type:'deal', name:'The Blue Buggy', group:'pair', max:24,
     roles:[{k:'b', n:'Buyer'}, {k:'s', n:'Seller'}],
     /* for pairs that finish early, his LER 543 outcome sheets' questions (19 Oct 2026) */
     wait:[{k:'b', q:'What are the buyer’s interests?', short:'The buyer'}, {k:'s', q:'What are the seller’s interests?', short:'The seller'}],
     fields:[{k:'price', type:'money', cur:'$', q:'The price of the car', short:'Price', min:0, max:99999}],
     recordQ:'Record your deal', extra:'Anything else you agreed?',
     /* invented */
     demo:{seed:20261101, groups:14, gen:(r, n) => {
       if (n % 4 === 0) return {x:true};
       return {vals:{price:Math.round((3150 + r() * 300) / 25) * 25}, text:n === 3 ? 'The seller keeps the roof rack' : null};
     }}},
  ],
});
