/* The car market's shared rules (Ryan, 23 Sep 2026: his LER 550 card game,
   merged with m2's boards). Loaded by the phones (m8/car/) and the Module 8
   deck, which MUST agree: nobody adjudicates, every phone and the big screen
   read the same room (m8-car) and work the market out for themselves.

   Wire, one line per event:
     "name|j"          a phone joins the market
     "=deal|seed"      the deck deals, at his keypress on the first rules
                       slide: everyone who has joined by then is shuffled
                       by the seed, and the first half are sellers, the
                       rest buyers (an odd one out is a buyer). Anyone who
                       joins later is a buyer. Roles hold for all three
                       rounds.
     "=open|n"         round n opens (the last step of its rules slide)
     "=close|n"        round n closes (the deck arrives on its board)
     "name|s|n|price"  a seller sold their car in round n, at that price.
                       Only a report between open and close counts; a
                       seller with none did not sell.
   Each round deals the cars afresh, shuffled by the seed and the round:
   half the sellers hold peaches and half lemons (an odd one out holds a
   lemon), so nobody carries what they learned in one round into the next.

   Values, from his resolution slide: a lemon is worth £1,000 to its seller
   and up to £1,500 to a buyer; a peach £3,000 and up to £4,000. */
(function(root){
  const N=3;
  const CARS={
    P:{k:'P',cls:'peach',kind:'PEACH',what:'A good quality car',min:3000},
    L:{k:'L',cls:'lemon',kind:'LEMON',what:'A bad quality car',min:1000}
  };
  const BUYER={L:1500,P:4000};
  const norm=n=>String(n||'').trim().toLowerCase().replace(/\s+/g,' ');
  /* a small seeded generator, so every screen shuffles the same way */
  function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(list,seed){const a=list.slice(),r=rng(seed);for(let i=a.length-1;i>0;i--){const k=Math.floor(r()*(i+1));[a[i],a[k]]=[a[k],a[i]];}return a;}
  function parse(lines){
    const L=lines.map(t=>String(t).split('|').map(x=>x.trim()));
    const joins=[], names={};
    let deal=null;
    const open={}, close={};
    /* A deal counts only if someone had joined before it, and a round's open and close only
       after that deal, the close after its open (25 Sep 2026): a click-through of the deck with
       no phones in the market leaves a deal and six markers that must not decide the day's game. */
    L.forEach((p,i)=>{
      if(p[0]==='=deal'&&deal===null&&/^\d+$/.test(p[1]||'')){if(joins.length)deal={seed:+p[1],at:i};return;}
      if(p[0]==='=open'&&/^[1-3]$/.test(p[1]||'')){if(deal&&open[p[1]]===undefined)open[p[1]]=i;return;}
      if(p[0]==='=close'&&/^[1-3]$/.test(p[1]||'')){if(open[p[1]]!==undefined&&close[p[1]]===undefined)close[p[1]]=i;return;}
      if(p[1]==='j'&&p[0]&&p[0][0]!=='='){const k=norm(p[0]);if(!names[k]){names[k]=p[0];joins.push({k,name:p[0],at:i});}}
    });
    const sellers=[], buyers=[];
    if(deal){
      const early=joins.filter(j=>j.at<deal.at), late=joins.filter(j=>j.at>deal.at);
      const order=shuffle(early.map(j=>j.k),deal.seed);
      const nS=Math.floor(order.length/2);
      order.forEach((k,i)=>(i<nS?sellers:buyers).push(k));
      late.forEach(j=>buyers.push(j.k));
    }
    /* each round's cars: the sellers shuffled by seed and round, the first half peaches */
    const cars={};
    if(deal)for(let n=1;n<=N;n++){
      const order=shuffle(sellers.slice().sort(),deal.seed*7+n*101);
      const nP=Math.floor(order.length/2);
      cars[n]={};order.forEach((k,i)=>{cars[n][k]=i<nP?'P':'L';});
    }
    /* sales: the latest report per seller inside the round's window */
    const sales={};
    for(let n=1;n<=N;n++){
      sales[n]={};
      if(open[n]===undefined)continue;
      const end=close[n]===undefined?L.length:close[n];
      L.forEach((p,i)=>{
        if(i<=open[n]||i>=end||p[1]!=='s'||+p[2]!==n)return;
        const k=norm(p[0]),price=Math.round(+p[3]);
        if(!sellers.includes(k)||!(price>0&&price<100000))return;
        sales[n][k]={k,name:names[k]||p[0],price};
      });
    }
    /* the round in play: the highest opened; closed if its close is in */
    let round=0;for(let n=1;n<=N;n++)if(open[n]!==undefined)round=n;
    const isOpen=round>0&&close[round]===undefined;
    return {joins,names,deal,sellers,buyers,cars,sales,open,close,round,isOpen,
      roleOf:k=>sellers.includes(k)?'seller':(buyers.includes(k)?'buyer':null)};
  }
  root.CAR={N,CARS,BUYER,norm,parse,shuffle};
})(typeof window!=='undefined'?window:globalThis);
