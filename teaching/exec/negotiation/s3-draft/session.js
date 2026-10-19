/* Session 3, Creating and Claiming Value II (17 Oct 2026): what the room does on its phones.
   Shared by the deck and the phone page. The demo room below is invented; the bargaining zone, the
   alternatives and the bills come from the session's private file, dropped on the deck. */
NK.session({
  n: 3, prefix: 'neg3b', title: 'Creating and Claiming Value II',
  steps: [
    /* asked before Walter and GG, answered by the room's own deals afterwards */
    {id:'first', type:'poll', q:'In a negotiation over price, should you make the first offer?',
     o:['Yes', 'No, let the other side go first', 'It depends'], demo:[9, 13, 10]},
    {id:'walter', type:'deal', name:'Walter and GG', group:'pair', max:24,
     roles:[{k:'w', n:'Walter Manufacturing'}, {k:'g', n:'GG Engineering'}],
     /* for pairs that finish early, his LER 543 outcome sheets' questions (19 Oct 2026) */
     wait:[{k:'w', q:'What are Walter Manufacturing’s interests?', short:'Walter'}, {k:'g', q:'What are GG Engineering’s interests?', short:'GG Engineering'}],
     fields:[
       {k:'price', type:'money', cur:'$', q:'The price for the half-lot', short:'Price', min:0, max:9999999},
       {k:'first', type:'choice', q:'Who made the first offer?', o:['Walter Manufacturing', 'GG Engineering'], short:'Opened', always:true},
       {k:'open', type:'money', cur:'$', q:'What was the first offer?', short:'First offer', min:0, max:9999999, always:true},
     ],
     recordQ:'Record your deal',
     demo:{seed:20261031, groups:15, gen:(r, n) => {
       const gOpen = r() < .5, open = gOpen ? Math.round((44 + r() * 16) * 1000 / 500) * 500 : Math.round((10 + r() * 12) * 1000 / 500) * 500;
       if (n === 6) return {x:true, per:{w:{first:0, open:12000}, g:{first:0, open:12000}}};
       const price = Math.round(((gOpen ? 33 : 24) + r() * 10) * 1000 / 250) * 250;
       const d = {vals:{price, first:gOpen ? 1 : 0, open}};
       if (n === 11) d.diff = {g:{price:price + 1000}};
       if (n === 15) d.skip = ['g'];
       return d;
     }}},
    {id:'bizhub', type:'deal', name:'The Broken Bizhub', group:'pair', max:24,
     roles:[{k:'p', n:'Pat Pufahl, The Pet Palace'}, {k:'r', n:'Robin Adler, Adler Office Machines'}],
     /* for pairs that finish early, his LER 543 outcome sheets' questions (19 Oct 2026) */
     wait:[{k:'p', q:'What are Pat’s interests?', short:'Pat, The Pet Palace'}, {k:'r', q:'What are Robin’s interests?', short:'Robin, Adler Office Machines'}],
     groupHint:'A different partner from Walter and GG, with the same number as you',
     fields:[
       {k:'pay', type:'money', cur:'$', q:'What the Pet Palace pays Adler for the repair', short:'Paid', min:0, max:99999},
       {k:'style', type:'choice', q:'Which best describes how you negotiated?', short:'Approach', always:true, own:true,
        o:['I pressed for the best result for my side', 'I gave ground to keep the relationship', 'We worked on a solution that met both our needs', 'I avoided the hard issues']},
     ],
     recordQ:'Record your settlement', extra:'What else did you agree?',
     nodealButton:'We did not settle', dealAfterAll:'We did settle', nodealTitle:'No settlement', sentWord:'Settlement recorded',
     demo:{seed:20261032, groups:14, gen:(r, n) => {
       const st = () => { const x = r(); return x < .3 ? 0 : x < .45 ? 1 : x < .9 ? 2 : 3; };
       if (n === 4 || n === 12) return {x:true, per:{p:{style:0}, r:{style:st()}}};
       const pay = Math.round((420 + r() * 330) / 10) * 10;
       const T = {1:'Adler services the clinic’s machines for a year at cost', 2:'A written estimate before any future repair', 3:'Robin apologises to Pat in front of the staff',
                  6:'Pat pays the first bill and Adler waives the FedEx charge', 8:'Adler lends a machine whenever one is in for repair', 9:'Free boarding for Robin’s dog for a month',
                  11:'A service contract with a 24-hour repair guarantee', 13:'Adler helps plan the clinic’s new computer system'};
       return {vals:{pay}, per:{p:{style:st()}, r:{style:st()}}, text:T[n]};
     }}},
  ],
});
