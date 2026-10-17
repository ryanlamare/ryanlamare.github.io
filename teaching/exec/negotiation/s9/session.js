/* Session 9, Negotiating in Groups and Teams (17 Oct 2026): what the phones ask, in order. Harborco's step is
   in harborco.js, which Session 10 shares. */
NK.session({
  n: 9, prefix: 'neg9', title: 'Negotiating in Groups and Teams',
  steps: [
    {id:'expect', type:'poll', q:'What do you expect to be the hardest part of a six-party negotiation?',
     o:window.HARBORCO_HARD, demo:[9, 6, 12, 5]},
    Object.assign({id:'harborco'}, window.HARBORCO),
  ],
});
