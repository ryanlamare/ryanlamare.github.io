/* Session 5, Third Parties and Negotiation (17 Oct 2026): what the room does on its phones.
   Shared by the deck (s5/) and the phone page (s5/deal/). The demo room below is invented; Dirty Laundry's
   offer and demands come from the session's private file, dropped on the deck. */
NK.session({
  n: 5, prefix: 'neg5', title: 'Third Parties and Negotiation',
  steps: [
    /* asked before the session teaches managers as mediators, and answered again by Telepro */
    {id:'boss', type:'poll', q:'Two of your colleagues are in a conflict they cannot settle. What do you usually do?',
     o:['Look into it, and decide who is right', 'Help them find a solution together', 'Leave them to sort it out themselves', 'Pass it to human resources'],
     demo:[12, 9, 5, 6]},
    {id:'laundry', type:'deal', name:'Dirty Laundry', group:'group', max:12,
     roles:[{k:'p', n:'Plaintiff, the customer'}, {k:'d', n:'Defendant, the dry cleaner'}, {k:'m', n:'Mediator'}],
     /* for pairs that finish early, his LER 543 outcome sheets' questions (19 Oct 2026) */
     wait:[{k:'d', q:'What are the defendant’s interests?', short:'The defendant'}, {k:'p', q:'What are the plaintiff’s interests?', short:'The plaintiff'}, {k:'m', q:'What are the mediator’s interests?', short:'The mediator'}],
     fields:[
      {k:'paid', type:'money', cur:'$', q:'What the dry cleaner pays the customer', short:'Paid', min:0, max:99999},
      {k:'style', type:'choice', own:true, always:true, roles:['m'], q:'Which style did you mostly use?', short:'Style',
       o:['Facilitative: an orchestrator', 'Evaluative: a dealmaker', 'Transformative: a relationship builder']},
      {k:'sat', type:'scale', own:true, always:true, roles:['p', 'd'], q:'How satisfied are you with the process?', lo:'Not at all', hi:'Completely', short:'Satisfaction'},
     ],
     recordQ:'Record your settlement', extra:'Anything else you agreed?',
     nodealButton:'We did not settle', dealAfterAll:'We did settle', nodealTitle:'No settlement', sentWord:'Settlement recorded',
     demo:{seed:20261051, groups:9, gen:(r, n) => {
       const style = n % 3 === 0 ? 1 : n % 4 === 0 ? 2 : 0, sat = () => Math.max(1, Math.min(5, Math.round((style === 1 ? 2.6 : 3.6) + r() * 1.6 - .5)));
       if (n === 6) return {x:true, per:{m:{style:1}, p:{sat:1}, d:{sat:2}}};
       const T = {1:'A written apology from the cleaners', 4:'Free cleaning for the rest of the year', 7:'The cleaners replace one shirt with the same brand'};
       return {vals:{paid:Math.round((110 + r() * 160) / 5) * 5}, per:{m:{style}, p:{sat:sat()}, d:{sat:sat()}}, text:T[n]};
     }}},
    /* Lovely Braids (Kellogg DRRC, bought; his LER 543), in place of Telepro (Ryan, 18 Oct 2026): a director of operations
       mediating between a salon manager and the salon's star stylist. Recorded as Telepro was, so the debrief compares the
       groups where Sidney decided with the groups where Zeke and Jordan found their own solution. The demo is invented. */
    {id:'braids', type:'deal', name:'Lovely Braids', group:'group', max:12, nodeal:false,
     roles:[{k:'j', n:'Jordan, the stylist'}, {k:'z', n:'Zeke, the salon manager'}, {k:'m', n:'Sidney, the director of operations'}],
     /* for pairs that finish early, his LER 543 outcome sheets' questions (19 Oct 2026) */
     wait:[{k:'j', q:'What are Jordan’s interests?', short:'Jordan'}, {k:'m', q:'What are Sidney’s interests?', short:'Sidney'}, {k:'z', q:'What are Zeke’s interests?', short:'Zeke'}],
     fields:[
      {k:'who', type:'choice', own:true, always:true, q:'How was it resolved?', short:'Resolved',
       o:['Sidney decided', 'Zeke and Jordan found a solution, with Sidney’s help', 'It was not resolved']},
      {k:'proc', type:'scale', own:true, always:true, roles:['j', 'z'], q:'How fair was the process?', lo:'Not at all fair', hi:'Completely fair', short:'Process'},
      {k:'out', type:'scale', own:true, always:true, roles:['j', 'z'], q:'How fair is the outcome?', lo:'Not at all fair', hi:'Completely fair', short:'Outcome'},
     ],
     recordQ:'After your meeting', extra:'What did you agree?', sentWord:'Answers sent',
     demo:{seed:20261053, groups:9, gen:(r, n) => {
       const mode = n % 3 === 1 ? 0 : n === 8 ? 2 : 1;
       const sc = (lo, hi) => Math.max(1, Math.min(5, Math.round(lo + r() * (hi - lo))));
       const jz = () => mode === 1 ? {proc:sc(3.5, 5), out:sc(3, 5)} : mode === 0 ? {proc:sc(1.5, 3.5), out:sc(1.5, 4)} : {proc:sc(1, 2.5), out:sc(1, 2.5)};
       const seen = k => (mode === 1 && k === 'm' && r() < .3) ? 0 : mode;
       const T = {2:'Zeke and Jordan meet every week for a month', 5:'Nothing is enforced until the policy is in writing', 9:'Jordan trains the newer stylists on two afternoons a month'};
       return {vals:{}, per:{j:Object.assign({who:seen('j')}, jz()), z:Object.assign({who:seen('z')}, jz()), m:{who:seen('m')}}, text:T[n]};
     }}},
  ],
});
