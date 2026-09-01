/* The Module 4 Tapas deal game — the one piece of logic every device must
   agree on. The deck posts a single "::start|seed|n|R" line; from that
   line and the first n join lines, every phone and the board build the
   SAME schedule, so nobody has to be told who they are playing (the
   server only orders lines, exactly as it does for Module 3).

   Wire format, room m4-tapas, one line per action:
     join    "j|<voter>|<name>"          posted once by each phone
     start   "::start|<seed>|<n>|<R>"    the deck: freeze the first n joins,
                                         shuffle with seed, play R months
     move    "m|<r>|<voter>|c-or-d"      latest line per voter+month wins
                                         (c = grow responsibly, d = push for fast growth)

   There are no round markers: each pair moves on to the next month the
   moment both have played, and the board reveals nothing until the end.

   The shuffled room is cut in two. The partner arm ("p", the smaller,
   even-sized part) plays the SAME colleague every round. The stranger
   arm ("s") is split into two seats (r/a — the game is symmetric, the
   seats only keep the rotation bipartite) and rotated so everyone meets a
   different colleague every round and nobody meets twice; an odd-sized
   arm carries a bye that rotates, so nobody sits out more than one
   round. Both arms play the same number of rounds: R, capped so the
   stranger arm never repeats. */
window.TAPAS_SCHED=(function(){
  function rng(seed){
    let a=seed>>>0;
    return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
      t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  }
  function shuffle(arr,seed){
    const a=arr.slice(),r=rng(seed);
    for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}
    return a;
  }
  /* voters: distinct voter ids in join order (the first n of them) */
  function build(voters,seed,R){
    const order=shuffle(voters,seed);
    let nP=Math.floor(order.length*0.4); if(nP%2)nP--; if(order.length>=4&&nP<2)nP=2;
    const P=order.slice(0,nP), S=order.slice(nP);
    const S2=S.slice(); if(S2.length%2)S2.push(null);
    const m=S2.length/2;
    const RG=S2.slice(0,m), AG=S2.slice(m);   /* the bye, if any, sits in AG */
    const rounds=Math.max(1,Math.min(R,m));
    const by={};
    P.forEach((v,i)=>{by[v]={arm:'p',role:i%2?'a':'r',mate:{}};for(let r=1;r<=rounds;r++)by[v].mate[r]=P[i%2?i-1:i+1];});
    RG.forEach(v=>{if(v)by[v]={arm:'s',role:'r',mate:{}};});
    AG.forEach(v=>{if(v)by[v]={arm:'s',role:'a',mate:{}};});
    for(let r=1;r<=rounds;r++)for(let i=0;i<m;i++){
      const a=RG[i], b=AG[(i+r-1)%m];
      if(a)by[a].mate[r]=b;
      if(b)by[b].mate[r]=a;
    }
    return {rounds,by,P,S};
  }
  const VOTER=/^[A-Za-z0-9-]{8,64}$/;
  /* parse the room's lines into joins (distinct, join order, latest name),
     the start marker, and moves by month */
  function parse(lines){
    const joins=[], seen={}, moves={};
    let start=null;
    lines.forEach(t=>{
      const p=String(t).split('|').map(s=>s.trim());
      if(p[0]==='j'&&p.length===3&&VOTER.test(p[1])&&p[2]){
        if(seen[p[1]]===undefined){seen[p[1]]=joins.length;joins.push({v:p[1],n:p[2]});}
        else joins[seen[p[1]]].n=p[2];
      }else if(p[0]==='::start'&&p.length===4&&/^\d{1,10}$/.test(p[1])&&/^\d{1,3}$/.test(p[2])&&/^\d{1,2}$/.test(p[3])){
        if(!start)start={seed:+p[1],n:+p[2],R:+p[3]};
      }else if(p[0]==='m'&&p.length===4&&/^\d{1,2}$/.test(p[1])&&VOTER.test(p[2])&&/^[cd]$/.test(p[3])){
        (moves[+p[1]]=moves[+p[1]]||{})[p[2]]=p[3];
      }
    });
    return {joins,start,moves};
  }
  /* the schedule implied by parsed lines, or null before the start marker */
  function fromParsed(p){
    if(!p.start)return null;
    const voters=p.joins.slice(0,p.start.n).map(j=>j.v);
    const s=build(voters,p.start.seed,p.start.R);
    s.seed=p.start.seed;
    return s;
  }
  /* a player's months: complete = a bye, or both moves in */
  function complete(sch,moves,v,r){
    const o=sch.by[v]&&sch.by[v].mate[r];
    if(!o)return true;
    const mv=moves[r]||{};
    return !!(mv[v]&&mv[o]);
  }
  function finished(sch,moves,v){
    for(let r=1;r<=sch.rounds;r++)if(!complete(sch,moves,v,r))return false;
    return true;
  }
  const PAY={c:{c:3,d:0},d:{c:5,d:1}}; /* PAY[mine][theirs] */
  return {build,parse,fromParsed,complete,finished,PAY};
})();
