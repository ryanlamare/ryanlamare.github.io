/* Module 7's closing exercise, the shared half: what a ship is. Loaded by the
   deck (the sea chart), by the phone page (so a phone can show its owner
   their own ship) and mirrored by trial/m7.js. Nothing here touches the DOM.

   The room is m7-world (?room=<x> suffixes it). Each phone sends four lines,
   one per answer, because the Worker keeps 200 characters a line:

     g‖name‖module‖the game        module: 2, 3, 4 or 5 for a game brought back
                                   from that module's closing exercise, 0 for a
                                   new one
     m‖kind‖the move               kind: c commitment, t threat, p promise
     c‖what makes it credible
     d‖the downside                the last line; a ship sails in once it lands

   The latest line of each letter wins, so a re-send corrects.

   A ship's look, by Ryan's brief (18 Sep 2026): the SAIL takes the colour of
   the module the game came from; the PENNANT at the masthead takes the kind
   of move; the hull and its stripe come from the phone's voter id, so every
   ship is its own and a phone can be shown which one is theirs. */
(function(root){
  const SAIL={2:'#26713D',3:'#37658A',4:'#C4673D',5:'#C9A227',0:'#6B3F47'};   /* green tree, blue engines, terracotta cards, ochre jet, maroon new */
  const SAIL_INK={2:'#E9E2D2',3:'#E9E2D2',4:'#E9E2D2',5:'#1B1C19',0:'#E9E2D2'};
  const PENNANT={c:'#1B1C19',t:'#CE1E32',p:'#59949C'};
  const KIND={c:'Commitment',t:'Threat',p:'Promise'};
  const HULLS=[['#8E3E28','#C9A227'],['#1B1C19','#CE1E32'],['#6B3F47','#E9E2D2'],['#5B4636','#59949C'],
               ['#8E3E28','#E9E2D2'],['#1B1C19','#C9A227'],['#37658A','#E9E2D2'],['#26713D','#C9A227'],
               ['#5B4636','#CE1E32'],['#6B3F47','#C9A227']];
  function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function look(v,module,kind){
    const h=hash(String(v)), hull=HULLS[h%HULLS.length];
    return {hull:hull[0],stripe:hull[1],sail:SAIL[module]||SAIL[0],sailInk:SAIL_INK[module]||SAIL_INK[0],
            pennant:PENNANT[kind]||PENNANT.c,oars:3+(h>>>8)%3,seed:h};
  }
  function fleet(entries){
    const by=new Map();
    (entries||[]).forEach(e=>{const p=String(e.t||'').split('‖'), k=p[0];
      if(k!=='g'&&k!=='m'&&k!=='c'&&k!=='d')return;
      if(!by.has(e.v))by.set(e.v,{v:e.v});const r=by.get(e.v);
      if(k==='g'){r.name=p[1]||'';r.module=[2,3,4,5].includes(+p[2])?+p[2]:0;r.game=p[3]||'';}
      else if(k==='m'){r.kind=PENNANT[p[1]]?p[1]:'c';r.move=p[2]||'';}
      else if(k==='c'){r.cred=p[1]||'';}
      else{r.down=p[1]||'';r.done=true;}});
    return [...by.values()].filter(r=>r.game&&r.move&&r.done);
  }
  /* the ship as an SVG string, for the phone (the deck builds the same drawing node by node in sea.js) */
  const EMBLEM={2:'M0 9 V-1 M0 -1 L-7 -8 M0 -1 L7 -8 M0 4 L-5 0 M0 4 L5 0',3:'M8 0 A8 8 0 1 1 -8 0 A8 8 0 1 1 8 0 M0 -8 V8 M-7 -4 L7 4 M-7 4 L7 -4',
    4:'M-9 -6 h9 v12 h-9 Z M1 -3 l8 -2 l3 11 l-8 2 Z',5:'M-10 0 H9 M3 0 L-4 -8 M3 0 L-4 8 M-8 0 L-11 -4 M-8 0 L-11 4',0:'M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z'};
  function svg(L,module){
    const ink='#1B1C19', paper='#E9E2D2', solid=module===4||!EMBLEM[module]||module===0;let oars='';
    for(let i=0;i<L.oars;i++){const x=-18+i*(36/Math.max(L.oars-1,1));oars+='<line x1="'+x+'" y1="-4" x2="'+(x-9)+'" y2="9" stroke="'+ink+'" stroke-width="1.6" stroke-linecap="round"/>';}
    return '<svg viewBox="-56 -72 112 88" aria-label="Your ship">'+oars+
      '<line x1="0" y1="-10" x2="0" y2="-64" stroke="'+ink+'" stroke-width="2.6" stroke-linecap="round"/>'+
      '<path d="M0 -64 L-20 -58.5 L0 -53 Z" fill="'+L.pennant+'" stroke="'+ink+'" stroke-width="1.5" stroke-linejoin="round"/>'+
      '<path d="M-22 -52 L22 -52 Q31 -35 24 -17 L-24 -17 Q-16 -35 -22 -52 Z" fill="'+L.sail+'" stroke="'+ink+'" stroke-width="2" stroke-linejoin="round"/>'+
      '<path d="'+(EMBLEM[module]||EMBLEM[0])+'" transform="translate(2 -34.5) scale(.95)" fill="'+(solid?L.sailInk:'none')+'" stroke="'+L.sailInk+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'+
      '<line x1="-25" y1="-52" x2="25" y2="-52" stroke="'+ink+'" stroke-width="2.6" stroke-linecap="round"/>'+
      '<circle cx="0" cy="-13.5" r="2.6" fill="'+paper+'" stroke="'+ink+'" stroke-width="1.2"/>'+
      '<path d="M-44 -30 C-38 -30 -36 -22 -35 -10 L30 -10 L37 -22 L41 -20 L36 -8 L48 0 L34 0 C30 6 24 8 16 8 L-22 8 C-36 8 -42 -4 -44 -30 Z" fill="'+L.hull+'" stroke="'+ink+'" stroke-width="2" stroke-linejoin="round"/>'+
      '<path d="M-36 -5 L33 -5" stroke="'+L.stripe+'" stroke-width="2.6" stroke-linecap="round"/>'+
      '<ellipse cx="28" cy="-1.5" rx="3.4" ry="2.4" fill="'+paper+'" stroke="'+ink+'" stroke-width="1"/><circle cx="28.6" cy="-1.5" r="1.1" fill="'+ink+'"/>'+
      '<path d="M-48 9 q6 -5 12 0 q6 5 12 0 q6 -5 12 0 q6 5 12 0 q6 -5 12 0 q6 5 12 0 q6 -5 12 0 q6 5 12 0" fill="none" stroke="#59949C" stroke-width="2.2" stroke-linecap="round"/></svg>';
  }
  root.M7_SHIPS={SAIL,SAIL_INK,PENNANT,KIND,look,fleet,hash,svg};
})(typeof window!=='undefined'?window:globalThis);
