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
  root.M7_SHIPS={SAIL,SAIL_INK,PENNANT,KIND,look,fleet,hash};
})(typeof window!=='undefined'?window:globalThis);
