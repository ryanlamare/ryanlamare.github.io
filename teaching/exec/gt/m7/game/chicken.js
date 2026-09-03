/* The chicken game's shared rules — loaded by the phones (game/index.html)
   and the Module 7 deck, and mirrored in go/scores.js (scoreChicken). The
   three MUST agree, because nobody adjudicates: every phone and the big
   screen read the same room and work out every round for themselves.

   Wire, room m7-chicken, one line per move: "A|B|n|seat|x", the first
   driver's name always first, seat a = A, seat b = B.
     join            "A|B|0|a|j"
     rounds 1-3      x = s (swerve) or g (go straight)
     rounds 4-6      first x = w (throw the steering wheel out of the window)
                     or k (keep the wheel); then, for a driver who kept it,
                     x = s or g. A thrown wheel IS a straight — no drive
                     line is needed or read for that driver.
   Latest line per pair, round, seat and phase wins. Payoffs are Ren and
   Chuck's: both swerve 0,0; swerve v straight -10,+10; both straight
   -100,-100. */
(function(root){
  const N=6, WHEEL_FROM=4;
  const PAY={ss:[0,0],sg:[-10,10],gs:[10,-10],gg:[-100,-100]};
  const norm=n=>String(n).trim().toLowerCase().replace(/\s+/g,' ');
  const pairKey=(a,b)=>[norm(a),norm(b)].sort().join('~');
  function parse(lines){
    const joins=new Set(), pairs=new Map();
    lines.forEach(t=>{
      const p=String(t).split('|').map(s=>s.trim());
      if(p.length!==5||!p[0]||!p[1]||!/^\d{1,2}$/.test(p[2])||!/^[ab]$/.test(p[3]))return;
      const key=pairKey(p[0],p[1]);
      if(p[4]==='j'){joins.add(key);if(!pairs.has(key))pairs.set(key,{A:p[0],B:p[1],key,r:{}});return;}
      if(!/^[sgwk]$/.test(p[4]))return;
      const n=+p[2]; if(n<1||n>N)return;
      joins.add(key);
      if(!pairs.has(key))pairs.set(key,{A:p[0],B:p[1],key,r:{}});
      const pr=pairs.get(key);
      pr.r[n]=pr.r[n]||{a:{},b:{}};
      const slot=pr.r[n][p[3]];
      if(p[4]==='w'||p[4]==='k')slot.c=p[4]; else slot.d=p[4];
    });
    return {joins,pairs};
  }
  /* one round, worked out from the pair's lines: ca/cb = the wheel decisions
     (rounds 4-6 only), a/b = what each driver ended up doing */
  function round(pr,n){
    const r=(pr.r&&pr.r[n])||{a:{},b:{}}, A=r.a||{}, B=r.b||{};
    if(n<WHEEL_FROM){
      const done=!!(A.d&&B.d);
      return {n,done,a:A.d,b:B.d,pay:done?PAY[A.d+B.d]:null};
    }
    const ca=A.c, cb=B.c;
    if(!(ca&&cb))return {n,done:false,ca,cb};
    const a=ca==='w'?'g':A.d, b=cb==='w'?'g':B.d;
    const done=!!(a&&b);
    return {n,done,ca,cb,a,b,pay:done?PAY[a+b]:null};
  }
  /* running totals over the finished rounds, and the first unfinished round */
  function totals(pr){
    let a=0,b=0,rounds=0,next=N+1;
    for(let n=1;n<=N;n++){
      const rd=round(pr,n);
      if(!rd.done){next=Math.min(next,n);continue;}
      rounds++;a+=rd.pay[0];b+=rd.pay[1];
    }
    return {a,b,rounds,next};
  }
  root.CHICKEN={N,WHEEL_FROM,PAY,norm,pairKey,parse,round,totals};
})(typeof window!=='undefined'?window:globalThis);
