/* The chicken game's shared rules — loaded by the phones (game/index.html)
   and the Module 7 deck, and mirrored in go/scores.js (scoreChicken). The
   three MUST agree, because nobody adjudicates: every phone and the big
   screen read the same room and work out every round for themselves.

   Every round runs on a clock (CLOCK seconds): the two cars close over
   the whole clock, and a driver who has not chosen when it runs out is
   going straight — their own phone sends the straight. From WHEEL_FROM
   a driver may, at any moment before choosing, throw the steering wheel
   out of the window: an irreversible straight the other driver is shown
   at once. Not throwing needs no line; a driver who keeps the wheel just
   swerves or goes straight.

   Wire, room m7-chicken, one line per move: "A|B|n|seat|x|t", the first
   driver's name always first, seat a = A, seat b = B, t = the seconds
   that driver took (a full clock is a driver who froze).
     join            "A|B|0|a|j"
     any round       x = s (swerve) or g (go straight)
     rounds 4-6      x = w (throw the wheel out); a thrown wheel IS a
                     straight, and no drive line is read for that driver
     ready           x = r: this driver has pressed to start round n; the
                     phones start the clock once both are in. Never a rule.
   Latest line per pair, round, seat and phase wins; a throw beats a drive
   line. Lines with five fields (no time) and the retired "k" (keep the
   wheel) line are read for what they say and otherwise ignored. Payoffs
   are Ren and Chuck's: both swerve 0,0; swerve v straight -10,+10; both
   straight -100,-100. The time field is never a rule: it feeds the board's
   frozen count and the Quick draw / Careful marksman awards. */
(function(root){
  const N=6, WHEEL_FROM=4, CLOCK=30;
  const PAY={ss:[0,0],sg:[-10,10],gs:[10,-10],gg:[-100,-100]};
  const norm=n=>String(n).trim().toLowerCase().replace(/\s+/g,' ');
  const pairKey=(a,b)=>[norm(a),norm(b)].sort().join('~');
  function parse(lines){
    const joins=new Set(), pairs=new Map();
    lines.forEach(t=>{
      const p=String(t).split('|').map(s=>s.trim());
      if((p.length!==5&&p.length!==6)||!p[0]||!p[1]||!/^\d{1,2}$/.test(p[2])||!/^[ab]$/.test(p[3]))return;
      const key=pairKey(p[0],p[1]);
      if(p[4]==='j'){joins.add(key);if(!pairs.has(key))pairs.set(key,{A:p[0],B:p[1],key,r:{}});return;}
      if(!/^[sgw]$/.test(p[4]))return;
      const n=+p[2]; if(n<1||n>N)return;
      if(p[4]==='w'&&n<WHEEL_FROM)return;
      joins.add(key);
      if(!pairs.has(key))pairs.set(key,{A:p[0],B:p[1],key,r:{}});
      const pr=pairs.get(key);
      pr.r[n]=pr.r[n]||{a:{},b:{}};
      const slot=pr.r[n][p[3]];
      const secs=p.length===6&&/^\d{1,3}$/.test(p[5])?Math.min(+p[5],CLOCK):null;
      if(p[4]==='w'){slot.w=true;slot.wt=secs;}
      else{slot.d=p[4];slot.dt=secs;}
    });
    return {joins,pairs};
  }
  /* one seat's outcome for a round: what they did, whether they threw,
     the seconds they took, and whether they froze (a full clock, and no
     choice of their own) */
  function seatOf(slot){
    if(slot.w)return {x:'g',threw:true,t:slot.wt,froze:false};
    if(slot.d)return {x:slot.d,threw:false,t:slot.dt,froze:slot.d==='g'&&slot.dt!==null&&slot.dt>=CLOCK};
    return {x:null,threw:false,t:null,froze:false};
  }
  /* one round, worked out from the pair's lines: a/b = what each driver
     ended up doing, ca/cb = 'w' for a thrown wheel or 'k' for a kept one
     (rounds 4-6), ta/tb = seconds taken, fa/fb = froze */
  function round(pr,n){
    const r=(pr.r&&pr.r[n])||{a:{},b:{}}, A=seatOf(r.a||{}), B=seatOf(r.b||{});
    const done=!!(A.x&&B.x);
    const out={n,done,a:A.x,b:B.x,ta:A.t,tb:B.t,fa:A.froze,fb:B.froze,pay:done?PAY[A.x+B.x]:null};
    if(n>=WHEEL_FROM){out.ca=A.threw?'w':(A.x?'k':undefined);out.cb=B.threw?'w':(B.x?'k':undefined);out.wa=A.threw;out.wb=B.threw;}
    return out;
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
  root.CHICKEN={N,WHEEL_FROM,CLOCK,PAY,norm,pairKey,parse,round,totals};
})(typeof window!=='undefined'?window:globalThis);
