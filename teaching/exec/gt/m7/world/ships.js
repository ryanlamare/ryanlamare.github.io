/* Module 7's closing exercise, the shared half: what a ship is. Loaded by the
   deck (the sea chart), by the phone page (so a phone can show its owner
   their own ship) and mirrored by trial/m7.js. Nothing here touches the DOM.

   The room is m7-world (?room=<x> suffixes it). Each phone sends four lines,
   one per answer, because the Worker keeps 200 characters a line:

     g‖name‖module‖the game‖hull   module: 2, 3, 4 or 5 for a game brought back
                                   from that module's closing exercise, 0 for a
                                   new one; hull: the hull colour they picked, 0–9
                                   (absent: from the voter id)
     m‖kind‖the move               kind: c commitment, t threat, p promise
     c‖key‖text                    key: ct contract, rp reputation, ir can't be undone,
                                   mo money on the line, oe something else (then the text)
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
  /* what gives the move credibility: a tap on the phone, or something else typed */
  const CRED={ct:'A contract',rp:'Long-term reputation',mo:'Money on the line',oe:'Something else'};
  /* the earlier closing exercises a game can come back from, by the name the room knew them by */
  const GAME={2:'Your branch on the tree',3:'Your zero-sum engine',4:'Your prisoner’s dilemma',5:'Your plane window'};
  const HULLS=[['#8E3E28','#C9A227'],['#1B1C19','#CE1E32'],['#6B3F47','#E9E2D2'],['#5B4636','#59949C'],
               ['#8E3E28','#E9E2D2'],['#1B1C19','#C9A227'],['#37658A','#E9E2D2'],['#26713D','#C9A227'],
               ['#5B4636','#CE1E32'],['#6B3F47','#C9A227']];
  function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function look(v,module,kind,h){
    const hs=hash(String(v)), idx=(h===undefined||h===null||h===''||isNaN(+h))?hs%HULLS.length:Math.max(0,Math.min(HULLS.length-1,+h|0)), hull=HULLS[idx];
    return {hull:hull[0],stripe:hull[1],hullIdx:idx,sail:SAIL[module]||SAIL[0],sailInk:SAIL_INK[module]||SAIL_INK[0],
            pennant:PENNANT[kind]||PENNANT.c,oars:3+(hs>>>8)%3,seed:hs};
  }
  function fleet(entries){
    const by=new Map();
    (entries||[]).forEach(e=>{const p=String(e.t||'').split('‖'), k=p[0];
      if(k!=='g'&&k!=='m'&&k!=='c'&&k!=='d')return;
      if(!by.has(e.v))by.set(e.v,{v:e.v});const r=by.get(e.v);
      if(k==='g'){r.name=p[1]||'';r.module=[2,3,4,5].includes(+p[2])?+p[2]:0;r.game=p[3]||'';r.h=p[4]===undefined?null:+p[4];}
      else if(k==='m'){r.kind=PENNANT[p[1]]?p[1]:'c';r.move=p[2]||'';}
      else if(k==='c'){r.credKey=CRED[p[1]]?p[1]:'oe';r.cred=(r.credKey!=='oe'&&CRED[r.credKey])||p[2]||p[1]||'';}
      else{r.down=p[1]||'';r.done=true;}});
    return [...by.values()].filter(r=>r.game&&r.move&&r.done);
  }
  /* the ship as an SVG string, for the phone (the deck builds the same drawing node by node in sea.js) */
  const EMBLEM={2:'M0 9 V-1 M0 -1 L-7 -8 M0 -1 L7 -8 M0 4 L-5 0 M0 4 L5 0',3:'M8 0 A8 8 0 1 1 -8 0 A8 8 0 1 1 8 0 M0 -8 V8 M-7 -4 L7 4 M-7 4 L7 -4',
    4:'M-9 -6 h9 v12 h-9 Z M1 -3 l8 -2 l3 11 l-8 2 Z',5:'M-10 0 H9 M3 0 L-4 -8 M3 0 L-4 8 M-8 0 L-11 -4 M-8 0 L-11 4',0:'M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z'};
  /* parts: which of the ship is built yet (the phone builds it answer by answer);
     the deck draws every part but the monster, which lives under an opened ship */
  function svg(L,module,parts){
    const P=Object.assign({hull:true,sail:true,pennant:true,bound:true,monster:false},parts||{});
    const ink='#1B1C19', paper='#E9E2D2', solid=module===4||!EMBLEM[module]||module===0;
    const part=(name,on,inner)=>on?'<g class="part '+name+'">'+inner+'</g>':'';
    let oars='';for(let i=0;i<L.oars;i++){const x=-18+i*(36/Math.max(L.oars-1,1));oars+='<line x1="'+x+'" y1="-4" x2="'+(x-9)+'" y2="9" stroke="'+ink+'" stroke-width="1.6" stroke-linecap="round"/>';}
    const mast=P.sail||P.pennant||P.bound;
    return '<svg viewBox="-60 -74 120 116" aria-label="Your ship">'+
      part('monster',P.monster,'<path d="M-52 30 a14 6 0 1 1 28 0 a10 4 0 1 1 -20 0 a6 2.5 0 1 1 12 0" fill="none" stroke="'+paper+'" stroke-width="1.6" stroke-linecap="round" opacity=".9"/><circle cx="-38" cy="30" r="1.8" fill="'+ink+'"/>'+
        '<path d="M40 40 C36 30 42 20 48 16 C54 12 60 16 58 22 L52 24 L48 30 L50 40 Z" fill="#26713D" stroke="'+ink+'" stroke-width="2" stroke-linejoin="round"/><circle cx="50" cy="19" r="2.2" fill="'+paper+'" stroke="'+ink+'" stroke-width="1"/><circle cx="50.6" cy="19" r="1" fill="'+ink+'"/><path d="M58 22 l8 -2 l-4 3 l4 3 l-8 -1" fill="#CE1E32" stroke="'+ink+'" stroke-width="1" stroke-linejoin="round"/>')+
      part('hull',P.hull,oars)+
      part('mast',mast,'<line x1="0" y1="-10" x2="0" y2="-64" stroke="'+ink+'" stroke-width="2.6" stroke-linecap="round"/>')+
      part('pennant',P.pennant,'<path d="M0 -64 L-20 -58.5 L0 -53 Z" fill="'+L.pennant+'" stroke="'+ink+'" stroke-width="1.5" stroke-linejoin="round"/>')+
      part('sail',P.sail,'<path d="M-22 -52 L22 -52 Q31 -37 24 -22 L-24 -22 Q-16 -37 -22 -52 Z" fill="'+L.sail+'" stroke="'+ink+'" stroke-width="2" stroke-linejoin="round"/>'+
        '<path d="'+(EMBLEM[module]||EMBLEM[0])+'" transform="translate(2 -34.5) scale(.95)" fill="'+(solid?L.sailInk:'none')+'" stroke="'+L.sailInk+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'+
        '<line x1="-25" y1="-52" x2="25" y2="-52" stroke="'+ink+'" stroke-width="2.6" stroke-linecap="round"/>')+
      part('bound',P.bound,'<path d="M-3.6 -14 L3.6 -14 L2.6 -9.5 L-2.6 -9.5 Z" fill="#CE1E32" stroke="'+ink+'" stroke-width="1"/><circle cx="0" cy="-17.2" r="3.3" fill="'+paper+'" stroke="'+ink+'" stroke-width="1.2"/>'+
        '<path d="M-5 -13.2 H5 M-5 -10.6 H5" stroke="#C9A227" stroke-width="1.4" stroke-linecap="round"/>')+
      part('hull2',P.hull,'<path d="M-44 -30 C-38 -30 -36 -22 -35 -10 L30 -10 L37 -22 L41 -20 L36 -8 L48 0 L34 0 C30 6 24 8 16 8 L-22 8 C-36 8 -42 -4 -44 -30 Z" fill="'+L.hull+'" stroke="'+ink+'" stroke-width="2" stroke-linejoin="round"/>'+
        '<path d="M-36 -5 L33 -5" stroke="'+L.stripe+'" stroke-width="2.6" stroke-linecap="round"/>'+
        '<ellipse cx="28" cy="-1.5" rx="3.4" ry="2.4" fill="'+paper+'" stroke="'+ink+'" stroke-width="1"/><circle cx="28.6" cy="-1.5" r="1.1" fill="'+ink+'"/>')+
      '<path d="M-56 9 q6 -5 12 0 q6 5 12 0 q6 -5 12 0 q6 5 12 0 q6 -5 12 0 q6 5 12 0 q6 -5 12 0 q6 5 12 0 q6 -5 12 0" fill="none" stroke="#59949C" stroke-width="2.2" stroke-linecap="round"/></svg>';
  }
  root.M7_SHIPS={SAIL,SAIL_INK,PENNANT,KIND,CRED,GAME,HULLS,look,fleet,hash,svg};
})(typeof window!=='undefined'?window:globalThis);
