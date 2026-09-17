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
  window.M6_CALL_COLOUR={B:'var(--teal)',I:'var(--terracotta)',N:'var(--ochre)',G:'var(--green)',O:'var(--maroon)'};
})();
