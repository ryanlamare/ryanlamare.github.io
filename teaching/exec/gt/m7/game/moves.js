/* Shared rules for the Module 7 callback games — loaded by the phones
   (game/index.html) and the deck's boards, and mirrored in go/scores.js.
   Nobody adjudicates: every phone and the big screen read the same room and
   work out every round for themselves, so the copies MUST agree.

   All pair games use the Module 6 wire, "A|B|n|seat|x", the first player's
   name first (seat a = A, the one who picked the partner; seat b = B).
   Latest line per pair, round, seat and PHASE wins. Join is "A|B|0|a|j".

   SPLIT OR STEAL (room m7-gb), two rounds, a £1,000 pot each round.
     both rounds   x = s (split) or t (steal)
     round 2 only  seat b, BEFORE choosing: x = n (used the move: told the
                   partner they will steal no matter what and hand over
                   half afterwards) or q (did not say it)
                   seat b, AFTER a steal against a split: x = h (hand over
                   half) or k (keep it all)
     Money: split/split 500 each; steal/split 1000 to the stealer, then
     500 each if the half is handed over; steal/steal nothing.

   STAG HUNT (room m7-stag), two rounds, no talking.
     both rounds   x = s (stag) or h (hare)
     round 2 only  seat b, before choosing: x = m (sent the assurance "I am
                   going for the stag") or q (sent nothing); the partner's
                   phone shows the message before they choose.
     Payoffs from Module 5: stag/stag 3,3; stag/hare 0,1; hare/stag 1,0;
     hare/hare 1,1.

   THE AUCTION (room m7-auction), the whole room, points for a pot of
   POT points. The deck opens rounds with "::open|n" (latest marker wins);
   in a round each phone posts one bid "name|n|amount" (whole points,
   above the standing high bid) or a pass "name|n|p"; latest line per name
   per round wins. Standing bid = a name's highest bid so far. Winner = the
   highest standing bid (ties: the earlier line); runner-up = the next
   name. The winner pays their bid and takes the pot; the runner-up pays
   their bid and gets nothing. */
(function(root){
  const norm=n=>String(n).trim().toLowerCase().replace(/\s+/g,' ');
  const pairKey=(a,b)=>[norm(a),norm(b)].sort().join('~');

  /* generic pair-line parser: phases map a code to a slot letter */
  function parsePairs(lines,phases,maxN){
    const joins=new Set(), pairs=new Map();
    lines.forEach(t=>{
      const p=String(t).split('|').map(s=>s.trim());
      if(p.length!==5||!p[0]||!p[1]||!/^\d{1,2}$/.test(p[2])||!/^[ab]$/.test(p[3]))return;
      const key=pairKey(p[0],p[1]);
      if(p[4]==='j'){joins.add(key);if(!pairs.has(key))pairs.set(key,{A:p[0],B:p[1],key,r:{}});return;}
      const slot=phases[p[4]]; if(!slot)return;
      const n=+p[2]; if(n<1||n>maxN)return;
      joins.add(key);
      if(!pairs.has(key))pairs.set(key,{A:p[0],B:p[1],key,r:{}});
      const pr=pairs.get(key);
      pr.r[n]=pr.r[n]||{a:{},b:{}};
      pr.r[n][p[3]][slot]=p[4];
    });
    return {joins,pairs};
  }

  /* ---------- split or steal ---------- */
  const GB={N:2,POT:1000,MOVE_ROUND:2,mover:'b'};
  GB.parse=lines=>parsePairs(lines,{s:'d',t:'d',n:'c',q:'c',h:'e',k:'e'},GB.N);
  /* one round: a/b = split or steal, said = the mover used the move,
     hand = the mover handed over half; money for a and b; done */
  GB.round=function(pr,n){
    const r=(pr.r&&pr.r[n])||{a:{},b:{}}, A=r.a||{}, B=r.b||{};
    const out={n,a:A.d,b:B.d,said:n===GB.MOVE_ROUND?B.c:undefined,hand:undefined,done:false,money:[0,0]};
    if(n===GB.MOVE_ROUND&&!B.c)return out;         /* the mover decides first */
    if(!(A.d&&B.d))return out;
    if(A.d==='s'&&B.d==='s'){out.money=[500,500];out.done=true;return out;}
    if(A.d==='t'&&B.d==='t'){out.money=[0,0];out.done=true;return out;}
    if(A.d==='t'){out.money=[1000,0];out.done=true;return out;}   /* a stole, b split */
    /* b stole, a split: the mover may hand over half (round 2 only) */
    if(n===GB.MOVE_ROUND){
      if(!B.e)return out;
      out.hand=B.e;
      out.money=B.e==='h'?[500,500]:[0,1000];
    }else out.money=[0,1000];
    out.done=true;return out;
  };
  GB.totals=function(pr){
    let a=0,b=0,rounds=0,next=GB.N+1;
    for(let n=1;n<=GB.N;n++){const rd=GB.round(pr,n);if(!rd.done){next=Math.min(next,n);continue;}rounds++;a+=rd.money[0];b+=rd.money[1];}
    return {a,b,rounds,next};
  };

  /* ---------- stag hunt ---------- */
  const STAG={N:2,MOVE_ROUND:2,mover:'b',PAY:{ss:[3,3],sh:[0,1],hs:[1,0],hh:[1,1]}};
  STAG.parse=lines=>parsePairs(lines,{s:'d',h:'d',m:'c',q:'c'},STAG.N);
  STAG.round=function(pr,n){
    const r=(pr.r&&pr.r[n])||{a:{},b:{}}, A=r.a||{}, B=r.b||{};
    const out={n,a:A.d,b:B.d,sent:n===STAG.MOVE_ROUND?B.c:undefined,done:false,pay:null};
    if(n===STAG.MOVE_ROUND&&!B.c)return out;
    if(!(A.d&&B.d))return out;
    out.pay=STAG.PAY[A.d+B.d];out.done=true;return out;
  };
  STAG.totals=function(pr){
    let a=0,b=0,rounds=0,next=STAG.N+1;
    for(let n=1;n<=STAG.N;n++){const rd=STAG.round(pr,n);if(!rd.done){next=Math.min(next,n);continue;}rounds++;a+=rd.pay[0];b+=rd.pay[1];}
    return {a,b,rounds,next};
  };

  /* ---------- the auction ---------- */
  const AUCTION={POT:10,MAX_BID:50};
  /* -> {round, bids:{round:[{name,amt,idx}]}, standing:[{name,amt,idx}] desc,
         high, second, sold} */
  AUCTION.parse=function(lines){
    let round=0; const bids={}, best=new Map();
    lines.forEach((t,idx)=>{
      const p=String(t).split('|').map(s=>s.trim());
      if(p[0]==='::open'&&p.length===2&&/^\d{1,3}$/.test(p[1])){round=Math.max(round,+p[1]);return;}
      if(p[0]==='::sold'){round=-Math.abs(round||1);return;}
      if(p.length!==3||!p[0]||p[0][0]===':'||!/^\d{1,3}$/.test(p[1]))return;
      const n=+p[1]; if(n<1)return;
      if(p[2]==='p'){bids[n]=bids[n]||{};bids[n][norm(p[0])]={name:p[0],amt:null,idx};return;}
      if(!/^\d{1,3}$/.test(p[2]))return;
      const amt=+p[2]; if(amt<1||amt>AUCTION.MAX_BID)return;
      bids[n]=bids[n]||{};bids[n][norm(p[0])]={name:p[0],amt,idx};
    });
    const sold=round<0; round=Math.abs(round);
    Object.keys(bids).map(Number).sort((x,y)=>x-y).forEach(n=>{
      Object.values(bids[n]).forEach(b=>{
        if(b.amt===null)return;
        const cur=best.get(norm(b.name));
        if(!cur||b.amt>cur.amt)best.set(norm(b.name),{name:b.name,amt:b.amt,idx:b.idx,round:n});
      });
    });
    const standing=[...best.values()].sort((x,y)=>y.amt-x.amt||x.idx-y.idx);
    return {round,sold,bids,standing,high:standing[0]||null,second:standing[1]||null};
  };
  /* what a name pays and gets if the auction ended now */
  AUCTION.outcome=function(state,name){
    const k=norm(name);
    if(state.high&&norm(state.high.name)===k)return {role:'high',pay:state.high.amt,get:AUCTION.POT};
    if(state.second&&norm(state.second.name)===k)return {role:'second',pay:state.second.amt,get:0};
    return {role:'out',pay:0,get:0};
  };

  root.MOVES={norm,pairKey,parsePairs,GB,STAG,AUCTION};
})(typeof window!=='undefined'?window:globalThis);
