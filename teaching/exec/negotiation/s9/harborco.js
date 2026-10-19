/* Harborco, as the phones record it (17 Oct 2026). Session 9 plays it and Session 10 debriefs it, so both load this file.
   Harborco is a licensed exercise (DRRC, Northwestern): the issues' names and options reach the phones only from
   s9/forms.enc, opened with the key in the session's link, and the scoring lives only in the private file dropped on
   Session 10's deck. In the clear, an issue is a letter and an option a code (A1, A2...), as the briefs number them.
   Each person records the final package and how their own party voted on it; the deck works out whether it passed. */
window.HARBORCO = {
  type:'deal', name:'Harborco', group:'group', max:8, forms:true,
  /* for tables that finish early (19 Oct 2026) */
  wait:[{k:'hard', q:'What made agreement hardest at your table?', short:'What made it hard'}, {k:'help', q:'What helped your table move forward?', short:'What helped'}],
  roles:[{k:'h', n:'Harborco'}, {k:'e', n:'Environmental League'}, {k:'p', n:'Other Ports'},
         {k:'g', n:'Governor'}, {k:'d', n:'Federal DCR'}, {k:'u', n:'The Unions'}],
  fields:[
    {k:'a', type:'option', n:3, code:'A', q:'Issue A', short:'Issue A'},
    {k:'b', type:'option', n:3, code:'B', q:'Issue B', short:'Issue B'},
    {k:'c', type:'option', n:4, code:'C', q:'Issue C', short:'Issue C'},
    {k:'d', type:'option', n:4, code:'D', q:'Issue D', short:'Issue D'},
    {k:'e', type:'option', n:5, code:'E', q:'Issue E', short:'Issue E'},
    {k:'vote', type:'choice', own:true, q:'How did your party vote on this package?', short:'Your vote', o:['For it', 'Against it']},
  ],
  recordQ:'Record the final package', extra:'Anything else your table agreed?',
  nodealButton:'No package was put to a vote', dealAfterAll:'A package was put to a vote', nodealTitle:'No package',
  nodealNote:'Record this only if your table never voted on a final package.', sentWord:'Package recorded',
  /* invented: six tables' packages and votes, for the demo rooms */
  demo:{seed:20261091, groups:6, gen:(r, n) => {
    const P = {1:[1,2,2,1,3], 2:[1,2,2,1,2], 3:[1,1,1,1,2], 4:[0,1,2,0,3], 6:[1,2,1,2,3]};
    const against = {2:['p'], 3:['e'], 4:['e', 'p'], 6:[]};
    if (n === 5) return {x:true};
    const [a, b, c, d, e] = P[n], no = against[n] || [];
    const per = {}; ['h', 'e', 'p', 'g', 'd', 'u'].forEach(k => per[k] = {vote: no.includes(k) ? 1 : 0});
    const T = {1:'Harborco funds a training programme with the unions', 6:'A joint committee reviews the ecology every year'};
    return {vals:{a, b, c, d, e}, per, text:T[n]};
  }},
};
/* the opening question in Session 9, asked again about Harborco itself in Session 10 */
window.HARBORCO_HARD = ['Managing the process', 'Keeping track of many issues', 'Building a coalition', 'Holding firm on what matters to my side'];
