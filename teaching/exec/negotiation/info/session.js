/* Information Asymmetries in Negotiations (29 Oct 2026): the five-day programme's new session, from the gt suite's Module 8,
   built on the kit with two role plays, the PON's Appleton v. Baker (10 Nov 2026, his yes: in place of Ugli Orange, which Session 1
   runs) and the PON's DS-30 (his pick, 29 Oct 2026, in place of the Zalada Crisis). Shared by the deck (info/) and the phone page
   (info/deal/). Its rooms are its own (neginfo-*). Both are licensed PON cases. Appleton v. Baker's limits reach the deck only from
   the session's private file. DS-30's wording of each side's private facts and of the inspection question reaches the phones only
   from info/forms.enc, opened with the key in the session's link, and the deck takes the same wording, the case's standards and
   the reveal from the private file. In the clear a fact is a number and the inspection an issue code (I1, I2...). The demo rooms
   below are invented. */
NK.session({
  n: 'info', prefix: 'neginfo', title: 'Information Asymmetries in Negotiations',
  steps: [
    /* Appleton v. Baker: the price, and what each person told the other side about their limit (own: each answers for
       themselves, and the deck only ever shows totals by side) */
    {id:'ab', type:'deal', name:'Appleton v. Baker', group:'pair', max:24,
     roles:[{k:'a', n:'Appleton’s agent'}, {k:'b', n:'Baker’s agent'}],
     fields:[{k:'price', type:'money', cur:'$', q:'The price for the half lot', short:'Price', min:0, max:9999999},
             {k:'told', type:'choice', own:true, always:true, q:'What did you tell the other side about your limit?', short:'About my limit',
              head:'The screen will only show totals', o:['The truth', 'Nothing', 'Something that was not true']}],
     recordQ:'Record your deal',
     /* invented: fourteen pairs, prices spread across an invented zone, one pair with no deal */
     demo:{seed:20261110, groups:14, gen:(r, n) => {
       const A = [0, 1, 1, 2, 1, 0, 2, 1, 2, 0, 1, 1, 2, 0], Bk = [1, 0, 1, 1, 2, 0, 1, 2, 1, 0, 1, 2, 1, 1];
       const per = {a:{told:A[n - 1]}, b:{told:Bk[n - 1]}};
       if (n === 3) return {x:true, per};
       const P = {1:8500, 2:15500, 4:9000, 5:12500, 6:11000, 7:17500, 8:6500, 9:13000, 10:10000, 11:14000, 12:8000, 13:16000, 14:11500};
       return {vals:{price:P[n]}, per};
     }}},
    /* the same pairs again, once the deck has shown each side's limit (the teaching note's renegotiation with full
       information); same: the phone keeps the pair number and role it gave for the first round */
    {id:'ab2', type:'deal', name:'Round two', group:'pair', max:24, same:'ab',
     roles:[{k:'a', n:'Appleton’s agent'}, {k:'b', n:'Baker’s agent'}],
     fields:[{k:'price', type:'money', cur:'$', q:'The new price for the half lot', short:'New price', min:0, max:9999999}],
     recordQ:'Record your new price', sentWord:'New price recorded',
     /* invented: the middle stays put, the ends move in, and two pairs do not agree the second time */
     demo:{seed:20261111, groups:14, gen:(r, n) => {
       if (n === 7 || n === 8) return {x:true};
       const P = {1:10500, 2:13000, 3:12000, 4:10500, 5:12500, 6:11000, 9:12500, 10:11000, 11:13000, 12:11000, 13:13500, 14:11500};
       return {vals:{price:P[n]}};
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
