/* Module 6's closing exercise: which bingo call each phone's ball carries.
   Shared by the deck (m6/index.html) and the phone page (m6/world/), so a
   phone shows its owner the same ball the room sees in the cage. Both run
   this over the room's lines in arrival order and get the same answer:
   a phone's number is a draw from its own id (1 to 75), moved on to the
   next free number if an earlier phone already holds it; the letter is
   bingo's own (B 1–15, I 16–30, N 31–45, G 46–60, O 61–75). A start-over
   keeps the ball, because a phone's place in the order is its first line. */
(function(){
  const LETTERS='BINGO';
  function draw(v){let h=2166136261;for(const ch of String(v)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}
    h^=h>>>15;h=Math.imul(h,2246822507)>>>0;h^=h>>>13;return h>>>0;}
  window.M6_CALLS=function(entries){
    const order=[], seen=new Set();
    (entries||[]).forEach(e=>{if(String(e.t||'').slice(0,2)!=='a‖')return;if(!seen.has(e.v)){seen.add(e.v);order.push(e.v);}});
    const taken=new Set(), out=new Map();
    order.forEach(v=>{let n=draw(v)%75, tries=0;while(taken.has(n)&&tries<75){n=(n+1)%75;tries++;}
      taken.add(n);out.set(v,{n:n+1,l:LETTERS[Math.floor(n/15)]});});
    return out;
  };
  /* ---- the room's bingo (Ryan, 17 Sep: unscored, just for fun, a trophy at
     the end). The deck's first draw posts "::deal"; from then on every phone
     holds a card of calls taken from the balls that were in the cage at the
     deal, nine in a 3×3 (four in a 2×2 if the room held fewer than nine),
     shuffled on the phone's own id, with its own ball in the centre if it was
     in the deal. Each settled draw is a "::draw|B12" line; the first card to
     complete a line is "::bingo|name‖name". Deck and phone read the same
     lines through M6_ROOM, so nobody reports anything. ---- */
  window.M6_ROOM=function(entries){
    const calls=window.M6_CALLS(entries), has={}, dealt=[], draws=[];let dealtAt=false, bingo=null;
    (entries||[]).forEach(e=>{const t=String(e.t||'');
      if(t==='::deal'){if(!dealtAt){dealtAt=true;calls.forEach((c,v)=>{if(has[v]===3)dealt.push({v,call:c.l+c.n});});}return;}
      if(t.slice(0,7)==='::draw|'){const c=t.slice(7);if(draws.indexOf(c)<0)draws.push(c);return;}
      if(t.slice(0,8)==='::bingo|'){if(!bingo)bingo=t.slice(8).split('‖').filter(Boolean);return;}
      if(t.slice(0,2)==='a‖')has[e.v]=(has[e.v]||0)|1;else if(t.slice(0,2)==='b‖')has[e.v]=(has[e.v]||0)|2;});
    return {calls,dealt,isDealt:dealtAt,draws,bingo};
  };
  window.M6_CARD=function(v,dealt){
    const own=dealt.find(d=>d.v===v), pool=dealt.filter(d=>d.v!==v).map(d=>d.call);
    const size=dealt.length>=9?3:dealt.length>=4?2:0;if(!size)return {size:0,cells:[]};
    let h=draw(v+'|card')||1;const rnd=()=>{h^=h<<13;h>>>=0;h^=h>>>17;h^=h<<5;h>>>=0;return h/4294967296;};
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    const n=size*size, cells=pool.slice(0,own?n-1:n);
    if(own)cells.splice(size===3?4:0,0,own.call);
    return {size,cells:cells.slice(0,n),own:own?own.call:null};
  };
  window.M6_BINGO=function(card,draws){
    if(!card.size||card.cells.length<card.size*card.size)return false;
    const L=card.size===3?[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]:[[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];
    return L.some(l=>l.every(i=>draws.indexOf(card.cells[i])>=0));
  };
  window.M6_CALL_COLOUR={B:'var(--teal)',I:'var(--terracotta)',N:'var(--ochre)',G:'var(--green)',O:'var(--maroon)'};
})();
