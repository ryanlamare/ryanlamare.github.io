/* Information Asymmetries in Negotiations (29 Oct 2026): the five-day programme's new session, from the gt suite's Module 8,
   built on the kit with two role plays, Ugli Orange (moved here from Session 1) and the PON's DS-30 (his pick, 29 Oct 2026, in
   place of the Zalada Crisis). Shared by the deck (info/) and the phone page (info/deal/). Its rooms are its own (neginfo-*), so
   nothing here touches Session 1's Ugli room. DS-30 is a licensed PON case: the wording of each side's private facts and of the
   inspection question reaches the phones only from info/forms.enc, opened with the key in the session's link, and the deck takes
   the same wording, the case's standards and the reveal from the session's private file. In the clear a fact is a number and the
   inspection an issue code (I1, I2...). The demo rooms below are invented. */
NK.session({
  n: 'info', prefix: 'neginfo', title: 'Information Asymmetries in Negotiations',
  steps: [
    /* Session 1's step as it stands (his LER 543 outcomes sheet): the plan, the price offered to him as Mr. Cardoza, conditions */
    {id:'ugli', type:'deal', name:'Ugli Orange', group:'pair', max:24,
     roles:[{k:'j', n:'Dr. Jones'}, {k:'r', n:'Dr. Roland'}],
     wait:[{k:'j', q:'What are Dr. Jones’s interests?', short:'Dr. Jones'}, {k:'r', q:'What are Dr. Roland’s interests?', short:'Dr. Roland'}],
     fields:[{k:'who', type:'choice', q:'Who will buy the oranges?', short:'Buying', o:['Dr. Jones', 'Dr. Roland', 'Both of us, together']},
             {k:'price', type:'money', cur:'$', q:'The price you will offer Mr. Cardoza', short:'Price', min:0, max:9999999, optional:true}],
     recordQ:'Record your plan', sentWord:'Plan recorded', nodealButton:'We did not reach an agreement', nodealTitle:'No agreement',
     dealAfterAll:'We did reach an agreement',
     extras:[{k:'plan', q:'What do you plan to do?', short:'Plan'},
             {k:'cond', q:'Any special conditions, on delivery or anything else?', short:'Conditions'}],
     demo:{seed:20261029, groups:12, gen:(r, n) => {
       if (n === 4 || n === 10) return {x:true};
       const P = {1:[2, 'We pool our money and buy all the oranges together', 140000],
                  2:[0, 'Dr. Jones buys them all and gives Dr. Roland first refusal next season', 185000],
                  3:[2, 'We split the oranges half and half, and share the cost', 160000],
                  5:[1, 'Dr. Roland buys them, because his deadline comes first', 205000],
                  6:[2, 'We buy together, and one lab collects them and shares out what each of us needs', 120000],
                  7:[0, 'Dr. Jones buys them all', 230000],
                  8:[2, 'We split the oranges half and half', 175000],
                  9:[2, 'We make one joint offer and share the oranges between our labs', 110000],
                  11:[1, 'Dr. Roland buys them and pays Dr. Jones to stay out of the bidding', 195000],
                  12:[2, 'We buy together and work out who gets what afterwards', 150000]};
       const C = {1:'Delivery to one lab within the week', 6:'Mr. Cardoza keeps the sale confidential', 9:'Half paid now, half on delivery'};
       const p = P[n], d = {vals:{who:p[0], price:p[2]}, texts:{plan:p[1]}};
       if (C[n]) d.texts.cond = C[n];
       return d;
     }}},
    /* DS-30 (PON): the compensation Veritas pays, when, whether there is an inspection, anything else; then what each person
       learned of the other side's private facts, yes or no, even with no agreement (always), each for themselves (own). */
    {id:'ds30', type:'deal', name:'DS-30', group:'pair', max:24, forms:true,
     roles:[{k:'p', n:'Pulchra’s deputy foreign minister'}, {k:'v', n:'Veritas’s assistant secretary'}],
     /* for pairs that finish early: each side's interests (his LER 543 sheets), then the preparation memo's first question */
     wait:[{k:'p', q:'What are Pulchra’s interests?', short:'Pulchra'}, {k:'v', q:'What are Veritas’s interests?', short:'Veritas'},
           {k:'l', q:'What did you want to learn from the other side, and how did you try to learn it?', short:'What we wanted to learn'}],
     fields:[
       {k:'comp', type:'money', cur:'$', q:'Total compensation Veritas pays', short:'Compensation', min:0, max:999999999, placeholder:'e.g. 62,500,000'},
       {k:'when', type:'choice', q:'When is it paid?', short:'Paid', o:['All of it now', 'Part now, the rest later', 'All of it later']},
       {k:'i', type:'option', n:3, code:'I', q:'Issue I', short:'Issue I'},
       ...[1, 2, 3, 4, 5].map(i => ({k:'v' + i, type:'choice', roles:['p'], own:true, always:true, o:['Yes', 'No'], q:'Fact ' + i, short:'Fact ' + i,
         head: i === 1 ? 'What did you learn from the other side?' : null})),
       ...[1, 2, 3, 4, 5].map(i => ({k:'p' + i, type:'choice', roles:['v'], own:true, always:true, o:['Yes', 'No'], q:'Fact ' + i, short:'Fact ' + i,
         head: i === 1 ? 'What did you learn from the other side?' : null})),
     ],
     recordQ:'Record your agreement', sentWord:'Agreement recorded', extra:'Anything else you agreed?',
     nodealButton:'We did not reach an agreement', nodealTitle:'No agreement', dealAfterAll:'We did reach an agreement',
     /* invented: twelve pairs' settlements, and how much each side learned (higher where Pulchra learned fact 1) */
     demo:{seed:20261031, groups:12, gen:(r, n) => {
       const learned = pre => { const v = {}; for (let i = 1; i <= 5; i++) v[pre + i] = r() < .2 + (n % 4) * .15 ? 0 : 1; return v; };
       const per = {p:learned('v'), v:learned('p')};
       if (n === 5) return {x:true, per};
       const comp = Math.round((42 + r() * 28 + (per.p.v1 === 0 ? 22 : 0)) / 2.5) * 2.5 * 1e6;
       const T = {2:'Veritas buys next year’s crop from the farmers who lost theirs', 6:'A joint statement to the press', 9:'A joint team tests the soil each year'};
       return {vals:{comp, when:Math.floor(r() * 3), i:Math.floor(r() * 3)}, per, text:T[n]};
     }}},
  ],
});
