/* Session 4, Perception, Persuasion and Communication (17 Oct 2026): what the room does on its phones.
   Shared by the deck (s4/) and the phone page (s4/deal/). The survey is his BADM 590 survey, which
   came in six versions so that the room was split for the framing questions; here each phone is shown
   one version of each question. Adapted for the room: a group instead of a class; a soft drink instead
   of a beer; the rich uncle's coin flip is a choice between two projects; the question on homicides
   and suicides is left out. The demo room below is invented. */
NK.session({
  n: 4, prefix: 'neg4', title: 'Perception, Persuasion and Communication',
  steps: [
    {id:'survey', type:'survey', name:'A few questions', sendQ:'Send your answers',
     qs:[
      {k:'bday', type:'choice', q:'A group has 25 people in it. What is the chance that two of them share a birthday?',
       o:['Less than one percent', 'Approximately 10 percent', 'Approximately 25 percent', 'Better than 50 percent']},
      {k:'risk', type:'choice', o:['The certain return', 'The equal chance of three times as much, or nothing'], versions:[
       {q:'Your organisation can take one of two projects. One is certain to bring in $10 million. The other has an equal chance of bringing in $30 million or nothing. Which would you take?'},
       {q:'Your organisation can take one of two projects. One is certain to bring in $1,000. The other has an equal chance of bringing in $3,000 or nothing. Which would you take?'}]},
      {k:'pay', type:'money', cur:'$', versions:[
       {q:'While at the cinema last week you may have been exposed to a rare, fatal disease. The chance that you have caught it is exactly .001, one chance in 1,000. There is no cure, but an inoculation taken now will prevent it. Supplies are limited, and they will go to the highest bidders. What is the most you would be willing to pay for the inoculation?'},
       {q:'While at the cinema last week you may have been exposed to a rare, fatal disease. The chance that you have caught it is exactly .004, four chances in 1,000. There is no cure, but an inoculation taken now will reduce the risk to .003, three chances in 1,000. Supplies are limited, and they will go to the highest bidders. What is the most you would be willing to pay for the inoculation?'},
       {q:'Professors at a medical school are researching a rare, fatal disease. They need volunteers who will accept a .001 risk, one chance in 1,000, of catching it, with no inoculation available. The volunteer from this group who asks for the least money will be taken. What is the least amount of money you would require to take part?'}]},
      {k:'fair', type:'choice', o:['I think the company’s decision is acceptable', 'I think the company’s decision is unfair'], versions:[
       {q:'A company is making a small profit. It is located in a community experiencing a recession with substantial unemployment but no inflation. The company decides to decrease wages and salaries 7 percent this year.'},
       {q:'A small company employs several people. The workers’ incomes have been about average for the community. In recent months business for the company has not increased as it had before. The owners reduce the workers’ wages by 10 percent for the next year.'},
       {q:'A company is making a small profit. It is located in a community experiencing a recession with substantial unemployment and inflation of 12 percent. The company decides to increase salaries only 5 percent this year.'}]},
      {k:'born', type:'date', q:'When is your birthday? The month and the day only.'},
      {k:'drink', type:'money', cur:'$', versions:[
       {q:'You are lying on the beach on a hot day, and all you have to drink is iced water. For the last hour you have been thinking about a cold bottle of your favourite soft drink. A companion offers to bring one back from the only place nearby that sells it: a fancy resort hotel. It might be expensive, so they ask how much you are willing to pay. They will buy it if it costs that much or less, and there is no bargaining with the seller. What price are you willing to pay?'},
       {q:'You are lying on the beach on a hot day, and all you have to drink is iced water. For the last hour you have been thinking about a cold bottle of your favourite soft drink. A companion offers to bring one back from the only place nearby that sells it: a small, run-down grocery shop. It might be expensive, so they ask how much you are willing to pay. They will buy it if it costs that much or less, and there is no bargaining with the seller. What price are you willing to pay?'}]},
     ],
     demo:{seed:20261041, people:32, gen:(r, i, ver) => {
       const pick = w => { let x = r() * w.reduce((a, b) => a + b, 0); for (let k = 0; k < w.length; k++) { x -= w[k]; if (x < 0) return k; } return w.length - 1; };
       const a = {bday:pick([10, 8, 6, 8])};
       a.risk = r() < (ver.risk === 0 ? .84 : .32) ? 0 : 1;
       const pay = [() => Math.round(Math.exp(5 + r() * 5)), () => Math.round(Math.exp(4 + r() * 4.5)), () => Math.round(Math.exp(11 + r() * 7))][ver.pay || 0];
       a.pay = Math.round(pay() / 10) * 10;
       a.fair = r() < [.45, .2, .62][ver.fair || 0] ? 0 : 1;
       a.born = i === 7 || i === 23 ? 314 : (1 + Math.floor(r() * 12)) * 100 + 1 + Math.floor(r() * 28);
       a.drink = Math.round((ver.drink === 0 ? 3 + r() * 6 : 1.5 + r() * 3) * 2) / 2 | 0 || 1;
       if (i === 5) delete a.pay;
       return a;
     }}},
    {id:'perf', type:'deal', name:'The Performance Interview', group:'pair', max:24, nodeal:false,
     roles:[{k:'c', n:'Chris Amon, brand manager'}, {k:'l', n:'Lee Petty, product manager'}],
     fields:[
      {k:'raised', type:'choice', own:true, q:'Did the sensitive matter in your brief come up?', o:['Yes, I raised it', 'Yes, the other person raised it', 'No, it never came up'], short:'Came up'},
      {k:'comfort', type:'scale', own:true, q:'How comfortable did you feel at the end?', lo:'Very uncomfortable', hi:'Very comfortable', short:'Comfort'},
      {k:'trust', type:'scale', own:true, q:'How much do you trust the other person now?', lo:'Not at all', hi:'Completely', short:'Trust'},
     ],
     recordQ:'After your interview', sentWord:'Answers sent',
     demo:{seed:20261042, groups:14, gen:(r, n) => {
       const came = r() < .55, who = r() < .5 ? 'c' : 'l';
       const sc = (lo, hi) => Math.max(1, Math.min(5, Math.round(lo + r() * (hi - lo))));
       const one = k => ({raised:came ? (k === who ? 0 : 1) : 2, comfort:came ? sc(3, 5) : sc(1, 3.4), trust:came ? sc(3, 5) : sc(1, 3.6)});
       const d = {vals:{}, per:{c:one('c'), l:one('l')}};
       if (n === 13) d.skip = ['l'];
       return d;
     }}},
    {id:'newt', type:'deal', name:'Hiring a Newtonian', group:'pair', max:24,
     roles:[{k:'h', n:'Human resources director'}, {k:'e', n:'Prospective employee'}],
     fields:[
      {k:'salary', type:'money', cur:'$', q:'The salary you agreed', short:'Salary', min:0, max:999999},
      {k:'start', type:'choice', q:'The day of the week the employee starts', o:['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], short:'Starts on'},
      {k:'hol', type:'choice', q:'Paid holidays agreed beyond the standard benefits', o:['None', 'One', 'Two', 'Three or more'], short:'Extra holidays'},
     ],
     recordQ:'Record your agreement', extra:'Anything else you agreed?',
     nodealButton:'We did not reach an agreement', dealAfterAll:'We did reach an agreement', nodealTitle:'No agreement', sentWord:'Agreement recorded',
     demo:{seed:20261043, groups:14, gen:(r, n) => {
       if (n === 10) return {x:true};
       const sal = 51000 + Math.floor(r() * 6) * 1000 + (r() < .4 ? Math.floor(r() * 9) * 100 + 1 : 0);
       const d = {vals:{salary:sal, start:[0, 0, 1, 2, 4, 4, 4][Math.floor(r() * 7)], hol:[0, 0, 1, 3, 3][Math.floor(r() * 5)]}};
       const T = {2:'A month’s trial before the contract is signed', 6:'Time off for the employee’s mother’s birthday', 11:'A salary review after six months'};
       if (T[n]) d.text = T[n];
       return d;
     }}},
  ],
});
