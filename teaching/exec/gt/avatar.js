/* ---- The programme's avatars (Ryan's idea, 18 Sep 2026): on the morning of
   day one each person builds a small face on their phone, and it is theirs
   through all eight modules: on a ship's deck, an aircraft, a carriage, the
   top-of-the-table boards, the podium. The drawing lives here once, for the
   phone step (/go/names.js) and for every deck that wants a face. It is the
   plain-face kit of m5/games/flight.js, generalised: flat, inked, warm paper,
   friendly, nobody's likeness, and no part is labelled as anybody's.

   An avatar is seven small numbers, the PARTS:
     skin 0-8 (0 is PAPER, a face not painted yet)   head 0-4 (the jaw)
     hair 0-13 (none, crop, short, side part, receding, curls, full curls,
       bob, long, long curls, bun, ponytail, headscarf, turban)
     hcol 0-7 (hair colour; on the two covered styles it is the cloth's colour)
     beard 0-3 (none, moustache, trimmed, full)      specs 0-2 (none, round, square)
     cloth 0-11 (the clothes' colour)
   and its CODE is one short line: a version letter and one base-36 character
   per part in that order, 'a' + 7 characters, e.g. 'a4021003'.

   Where a code is kept: the phone posts 'code|Name' as a /say line to the
   room gt-avatars, beside its name claim in gt-names and never inside it, so
   no reader of gt-names (the name guard, the points system, the Poll Desk, a
   page cached on a phone from before avatars) can ever take an avatar for a
   name. roster() joins the two rooms: an avatar line counts only while the
   phone that sent it still claims that name in gt-names, which is the points
   system's own rule (latest claim per phone), and which means a gt-avatars
   room left over from an earlier cohort is harmless once gt-names is reset.

   The API:
     GT_AVATAR.fromName(name[,{full:true}])  parts derived from the name, the same
                          every time, so anyone who skips the step still has a
                          face and nobody is blank. It is deliberately modest:
                          paper skin, an everyday hairstyle, no beard, no
                          glasses, nothing covered, never grey, because nobody
                          chose it. {full:true} draws on every option instead
                          (the trial page uses it to show a built room).
     GT_AVATAR.parse(code[,name])  parts from a code. Garbage, an unknown
                          version or a missing code gives fromName(name); one
                          bad character gives that one part from fromName.
     GT_AVATAR.code(parts)         the code for some parts.
     GT_AVATAR.cycle(parts,key)    the next option of one part (wraps round).
     GT_AVATAR.random(parts)       every part at random EXCEPT the skin, which
                          is the person's own call and is left as it stands.
     GT_AVATAR.draw(parent,parts,{x,y,size,bust,anchor,mood,bare,ink})
                          draws into an SVG node and returns the <g>. size is
                          the HEIGHT in the parent's units; bust:true (the
                          default) is head and shoulders, bust:false the head
                          alone. x,y is the middle of the bottom edge (the
                          default, anchor:'bottom': it stands ON something) or
                          the centre of the box (anchor:'center'). The box is
                          the same for every hairstyle, so a row of them lines
                          up. mood is 'smile' (default), 'firm' or 'glum';
                          bare:true leaves the face off (the hair button);
                          ink:n sets the line's width in the parent's units.
                          Legible from 28 (a head on a deck) to 160 and over.
     GT_AVATAR.tick(g,dt)          call from the caller's own frame loop with
                          the seconds gone by and the face blinks now and then.
     GT_AVATAR.icon(svg,kind,parts)  the phone step's button glyphs, drawn
                          into a 40x40 viewBox; kind is a part's key or 'dice'.
     GT_AVATAR.roster([api])       a promise of a Map from the normalised name
                          (GT_AVATAR.norm) to parts, one entry for every name
                          claimed in gt-names: the latest avatar that name's
                          phones sent (those parts carry built:true), else
                          fromName. Never rejects; a room it cannot read gives
                          an empty Map.
     GT_AVATAR.of(roster,name)     the parts for a name: the roster's, else
                          fromName(name), so a caller never has to check.

   Every node is made with createElementNS and placed by its transform
   attribute (no innerHTML, no CSS transforms on SVG). Nothing here knows
   about a deck or a page: the caller owns the frame loop. ---- */
window.GT_AVATAR=(function(){
  const NS='http://www.w3.org/2000/svg';
  function mk(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e;}
  function hash(v){let h=2166136261;v=String(v);for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619);}
    h^=h>>>16;h=Math.imul(h,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);h^=h>>>16;return h>>>0;}
  const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
  const INK='#1B1C19', CARD='#F7F2E6', RED='#CE1E32', WHITE='#FFFDF6';
  const SKIN=[CARD,'#F6DCC4','#EFC9A4','#E0AC7E','#C99266','#AD7A4E','#8D5B36','#6F4429','#4F3020'];
  const HCOL=['#2A2622','#4E3420','#8A5A2B','#9A4A2A','#C9A24B','#E3CD8C','#9A968C','#D8D4C8'];   /* black, dark brown, brown, auburn, blond, fair, grey, silver */
  const WRAP=['#2B3A55','#6B2D3E','#35584A','#7A4E8A','#C9A227','#E9E2D2','#59949C','#B5573A'];   /* the covered styles take their cloth from the same tap */
  const CLOTH=['#2B3A55','#37658A','#59949C','#26713D','#4A5A52','#8A6A2B','#C9A227','#B5573A','#CE1E32','#6B2D3E','#7A4E8A','#3A3B37'];
  const KEYS=['skin','head','hair','hcol','beard','specs','cloth'];
  const N={skin:SKIN.length,head:5,hair:14,hcol:HCOL.length,beard:4,specs:3,cloth:CLOTH.length};
  const COVERED=[12,13], MODEST_HAIR=[1,2,3,5,6,7], MODEST_HCOL=[0,1,2,3,4];

  /* ================= the parts and the code ================= */
  function fromName(name,o){
    const h=hash(norm(name)), h2=hash(norm(name)+'/2');
    if(o&&o.full)return {skin:1+h%(N.skin-1),head:(h>>>4)%N.head,hair:(h>>>8)%N.hair,hcol:(h>>>13)%N.hcol,beard:(h2%3===0&&((h>>>8)%N.hair<7||(h>>>8)%N.hair===13))?1+(h2>>>3)%3:0,specs:(h2>>>6)%4===0?1+(h2>>>9)%2:0,cloth:(h2>>>12)%N.cloth};
    return {skin:0,head:(h>>>4)%N.head,hair:MODEST_HAIR[(h>>>8)%MODEST_HAIR.length],hcol:MODEST_HCOL[(h>>>13)%MODEST_HCOL.length],beard:0,specs:0,cloth:(h2>>>12)%N.cloth};
  }
  function parse(code,name){
    const d=fromName(name);
    if(typeof code!=='string'||!/^a[0-9a-z]{7}/.test(code))return d;          /* an unknown version or garbage: the face from the name */
    const p={};KEYS.forEach((k,i)=>{const v=parseInt(code[1+i],36);p[k]=v<N[k]?v:d[k];});
    return p;
  }
  function code(p){return 'a'+KEYS.map(k=>(((p&&p[k])|0)%N[k]).toString(36)).join('');}
  function cycle(p,k){const q=Object.assign({},p);q[k]=((q[k]|0)+1)%N[k];return q;}
  function random(p){const q={skin:p?p.skin|0:0},r=n=>Math.floor(Math.random()*n);
    q.head=r(N.head);q.hair=r(N.hair);q.hcol=r(N.hcol);q.beard=(q.hair<7||q.hair===13)&&r(3)===0?1+r(3):0;q.specs=r(3)===0?1+r(2):0;q.cloth=r(N.cloth);return q;}

  /* ================= the drawing =================
     Design units: the origin is the middle of the head, the head is 124 wide
     and 140 tall before the jaw is chosen. Every head shares its top half, so
     every hairstyle fits every head; only the jaw changes. */
  const TOP=-122, BOT_BUST=168, BOT_HEAD=86;
  const CROWN='M-62 0 C-62 -38.7 -34.2 -70 0 -70 C34.2 -70 62 -38.7 62 0 ';
  const JAW=[
    'C62 38.7 34.2 70 0 70 C-34.2 70 -62 38.7 -62 0',                                                          /* oval */
    'C63 42 40 65 0 65 C-40 65 -63 42 -62 0',                                                                  /* round */
    'C62 44 32 82 0 82 C-32 82 -62 44 -62 0',                                                                  /* long */
    'C62 30 60 52 40 64 C28 71 12 72 0 72 C-12 72 -28 71 -40 64 C-60 52 -62 30 -62 0',                         /* square */
    'C62 30 40 58 14 72 C6 76 -6 76 -14 72 C-40 58 -62 30 -62 0'];                                             /* tapered */
  const CAP='M-63 -6 Q-68 -78 0 -79 Q68 -78 63 -6 Q44 -44 0 -45 Q-44 -44 -63 -6 Z', SCALP='M-60 -18 Q-60 -70 0 -71 Q60 -70 60 -18 Q46 -55 0 -56 Q-46 -55 -60 -18 Z';
  /* curls are circles on an arc: [x,y,r] */
  function ring(cy,rx,ry,a0,a1,n,r){const o=[];for(let i=0;i<n;i++){const a=(a0+(a1-a0)*i/(n-1))*Math.PI/180;o.push([+(Math.cos(a)*rx).toFixed(1),+(cy+Math.sin(a)*ry).toFixed(1),r]);}return o;}
  const HAIR=[
    {},                                                                                                         /* 0 none */
    {f:[SCALP]},                                                                                                /* 1 crop */
    {f:[CAP]},                                                                                                  /* 2 short */
    {f:['M-64 2 Q-72 -80 6 -80 Q70 -76 63 -8 Q54 -46 -14 -50 Q-46 -42 -64 2 Z']},                               /* 3 side part */
    {f:['M-63 8 Q-71 -44 -42 -65 Q-48 -44 -49 -22 Q-51 -4 -55 10 Z','M63 8 Q71 -44 42 -65 Q48 -44 49 -22 Q51 -4 55 10 Z']}, /* 4 receding */
    {f:[SCALP],fc:ring(-4,56,60,192,348,10,15)},                                                                /* 5 curls */
    {bc:ring(-10,70,74,158,382,14,22),f:[SCALP],fc:ring(-10,70,74,204,336,8,22)},                               /* 6 full curls */
    {b:['M-73 38 Q-86 -88 0 -88 Q86 -88 73 38 Q64 54 48 44 L46 -10 L-46 -10 L-48 44 Q-64 54 -73 38 Z'],f:['M-63 -4 Q-64 -78 0 -79 Q64 -78 63 -4 Q54 -30 30 -37 Q0 -28 -30 -37 Q-54 -30 -63 -4 Z']}, /* 7 bob */
    {b:['M-74 78 Q-90 -88 0 -88 Q90 -88 74 78 Q60 90 44 78 L44 -10 L-44 -10 L-44 78 Q-60 90 -74 78 Z'],f:['M-63 -8 Q-62 -76 0 -77 Q62 -76 63 -8 Q34 -48 0 -46 Q-34 -48 -63 -8 Z']}, /* 8 long */
    {bc:ring(-10,68,72,166,374,12,20).concat([[-68,22,20],[68,22,20],[-66,48,20],[66,48,20],[-62,72,18],[62,72,18]]),f:[SCALP],fc:ring(-8,60,64,200,340,8,17)}, /* 9 long curls */
    {bun:[0,-92,25],f:['M-63 -6 Q-68 -78 0 -79 Q68 -78 63 -6 Q44 -40 0 -41 Q-44 -40 -63 -6 Z']},                /* 10 bun */
    {b:['M34 -66 Q98 -70 94 6 Q92 48 74 76 Q66 44 66 10 Q62 -22 40 -40 Z'],f:[CAP]},                            /* 11 ponytail */
    {scarf:1},                                                                                                  /* 12 headscarf */
    {f:['M-67 -18 Q-80 -104 0 -106 Q80 -104 67 -18 Q34 -52 0 -34 Q-34 -52 -67 -18 Z'],folds:['M-54 -84 Q-8 -66 0 -36','M54 -84 Q8 -66 0 -36']}]; /* 13 turban */
  const SCARF_BUST='M-72 -8 Q-78 -94 0 -94 Q78 -94 72 -8 Q76 40 92 118 Q40 138 0 138 Q-40 138 -92 118 Q-76 40 -72 -8 Z', SCARF_HEAD='M-72 -8 Q-78 -94 0 -94 Q78 -94 72 -8 Q74 50 40 80 Q0 96 -40 80 Q-74 50 -72 -8 Z',
        SCARF_FACE='M-50 2 C-50 -34 -28 -58 0 -58 C28 -58 50 -34 50 2 C50 38 28 64 0 64 C-28 64 -50 38 -50 2 Z';

  /* shapes that overlap and must read as ONE inked shape (a head of curls):
     stroke them all at double width, then fill them all again on top, so
     only the outline of the whole survives */
  function blob(parent,paths,circles,fill,sw){
    const a=mk('g',{fill:fill,stroke:INK,'stroke-width':sw*2,'stroke-linejoin':'round'},parent), b=mk('g',{fill:fill,stroke:'none'},parent);
    [a,b].forEach(g=>{(paths||[]).forEach(d=>mk('path',{d:d},g));(circles||[]).forEach(c=>mk('circle',{cx:c[0],cy:c[1],r:c[2]},g));});
  }

  function draw(parent,parts,o){
    o=o||{};
    const p=parse(code(parts||{})), bust=o.bust!==false, size=o.size||100, mood=o.mood||'smile';
    const bot=bust?BOT_BUST:BOT_HEAD, s=size/(bot-TOP), fine=size>=48;
    const sw=(o.ink||Math.max(1.15,Math.min(3.6,size*.026)))/s;                   /* the ink line, in design units: about 1.2 px small, 3.6 px large */
    const oy=o.anchor==='center'?-(TOP+bot)/2*s:-bot*s;
    const g=mk('g',{transform:'translate('+(+(o.x||0)).toFixed(2)+' '+((+(o.y||0))+oy).toFixed(2)+') scale('+s.toFixed(4)+')'},parent);
    const LN={stroke:INK,'stroke-width':sw.toFixed(2),'stroke-linejoin':'round','stroke-linecap':'round'};
    const skin=SKIN[p.skin], covered=COVERED.indexOf(p.hair)>=0, hc=covered?WRAP[p.hcol]:HCOL[p.hcol], H=HAIR[p.hair];
    if(bust){
      mk('path',Object.assign({d:'M-104 168 L-100 132 Q-94 98 -46 92 L46 92 Q94 98 100 132 L104 168 Z',fill:CLOTH[p.cloth]},LN),g);
      mk('path',Object.assign({d:'M-25 91 L0 130 L25 91 Z',fill:CARD},LN),g);
      mk('path',Object.assign({d:'M-22 50 L-22 93 Q0 108 22 93 L22 50 Z',fill:skin},LN),g);
    }
    /* behind the head */
    if(H.b)H.b.forEach(d=>mk('path',Object.assign({d:d,fill:hc},LN),g));
    if(H.bc)blob(g,null,H.bc,hc,sw);
    if(H.bun)mk('circle',Object.assign({cx:H.bun[0],cy:H.bun[1],r:H.bun[2],fill:hc},LN),g);
    /* ears, head */
    [-61,61].forEach(x=>mk('ellipse',Object.assign({cx:x,cy:8,rx:10,ry:14,fill:skin},LN),g));
    mk('path',Object.assign({d:CROWN+JAW[p.head]+' Z',fill:skin},LN),g);
    /* beard: the jaw's own line below, a soft edge round the mouth above; trimmed is the same shape, thin */
    if(p.beard>=2){
      mk('path',{d:'M-62 0 C-54 30 -38 12 -23 17 Q0 9 23 17 C38 12 54 30 62 0 '+JAW[p.head]+' Z',fill:HCOL[p.hcol],opacity:p.beard===2?.5:1,stroke:'none'},g);
      mk('path',Object.assign({d:CROWN+JAW[p.head]+' Z',fill:'none'},LN),g);                                   /* the head's line again, over the beard */
      mk('ellipse',{cx:0,cy:39,rx:24,ry:11.5,fill:skin},g);
    }
    if(p.beard===1||p.beard===3)mk('path',Object.assign({d:'M-23 23 Q-12 9 0 16 Q12 9 23 23 Q11 25 0 22 Q-11 25 -23 23 Z',fill:HCOL[p.hcol]},LN,{'stroke-width':(sw*.7).toFixed(2)}),g);
    /* the face: eyes with whites and an open smile, so it reads on every skin */
    const face=mk('g',{},g), eyes=[];
    if(!o.bare){
      [-22,22].forEach(x=>{
        const w=mk('ellipse',Object.assign({cx:x,cy:-4,rx:fine?9.5:11,ry:fine?10:11.5,fill:WHITE},fine&&!p.specs?Object.assign({},LN,{'stroke-width':(sw*.45).toFixed(2)}):{}),face);   /* behind glasses the frame is the eye's line */
        const k=mk('ellipse',{cx:x,cy:-3,rx:fine?5.6:7,ry:fine?5.6:7,fill:INK},face);eyes.push([w,k]);});
      const M={smile:'M-20 31 Q0 56 20 31 Z',firm:'M-14 38 L14 38',glum:'M-18 46 Q0 30 18 46'}, m=M[mood]?mood:'smile';
      mk('path',Object.assign({d:M[m],fill:m==='smile'?WHITE:'none'},LN,{'stroke-width':(sw*(fine?1:.85)).toFixed(2)}),face);
      if(fine&&m==='smile'&&p.beard<2)[-40,40].forEach(x=>mk('circle',{cx:x,cy:24,r:9,fill:RED,opacity:.2},face));
    }
    /* in front of the head */
    if(H.scarf){mk('path',Object.assign({d:(bust?SCARF_BUST:SCARF_HEAD)+' '+SCARF_FACE,fill:hc,'fill-rule':'evenodd'},LN),g);
      if(fine)mk('path',Object.assign({d:bust?'M-34 58 Q-4 100 50 74':'M-30 60 Q0 86 40 70',fill:'none'},LN,{'stroke-width':(sw*.7).toFixed(2)}),g);}
    if(H.fc)blob(g,H.f,H.fc,hc,sw);
    else if(H.f)H.f.forEach(d=>mk('path',Object.assign({d:d,fill:hc},LN),g));
    if(H.folds&&fine)H.folds.forEach(d=>mk('path',Object.assign({d:d,fill:'none'},LN,{'stroke-width':(sw*.7).toFixed(2)}),g));
    if(p.specs){const GL=Object.assign({fill:'none'},LN,{'stroke-width':(sw*(fine?.95:.8)).toFixed(2)});
      [-22,22].forEach(x=>p.specs===1?mk('circle',Object.assign({cx:x,cy:-4,r:18},GL),g):mk('rect',Object.assign({x:x-19,y:-18,width:38,height:28,rx:7},GL),g));
      mk('path',Object.assign({d:'M-5 -7 Q0 -11 5 -7',fill:'none'},GL),g);}
    g.__gt={eyes:eyes,fine:fine,blink:1+Math.random()*4,parts:p};
    return g;
  }
  /* blink now and then; the caller's frame loop passes the seconds gone by */
  function tick(g,dt){const a=g&&g.__gt;if(!a)return;a.blink-=dt;const shut=a.blink<0;
    if(a.blink<-.13)a.blink=2.2+Math.random()*3.8;
    if(shut!==a.shut){a.shut=shut;a.eyes.forEach(e=>{e[0].setAttribute('ry',shut?1.2:(a.fine?10:11.5));e[1].setAttribute('ry',shut?1:(a.fine?5.6:7));});}}

  /* ================= the phone step's glyphs (a 40x40 viewBox) ================= */
  function icon(svg,kind,parts){
    while(svg.firstChild)svg.firstChild.remove();
    const p=parse(code(parts||{})), L={stroke:INK,'stroke-width':2.4,'stroke-linejoin':'round','stroke-linecap':'round'};
    const head=(fill,par)=>mk('path',Object.assign({d:CROWN+JAW[p.head]+' Z',fill:fill,transform:'translate(20 21) scale(.2)','stroke-width':12,stroke:INK,'stroke-linejoin':'round'}),par||svg);
    if(kind==='skin'){mk('circle',Object.assign({cx:20,cy:20,r:15,fill:SKIN[p.skin]},L),svg);[14.5,25.5].forEach(x=>mk('circle',{cx:x,cy:17,r:2.1,fill:p.skin>6?WHITE:INK},svg));mk('path',Object.assign({d:'M14 24.5 Q20 30.5 26 24.5',fill:'none'},L,{stroke:p.skin>6?WHITE:INK,'stroke-width':2}),svg);}
    else if(kind==='head'){head('none');}
    else if(kind==='hair'){draw(svg,{skin:0,head:p.head,hair:p.hair,hcol:p.hcol,beard:0,specs:0,cloth:0},{x:20,y:21,size:39,bust:false,anchor:'center',bare:true,ink:2});}
    else if(kind==='hcol'){const c=COVERED.indexOf(p.hair)>=0?WRAP:HCOL;[[27,14,2],[13,16,1],[20,26,0]].forEach(d=>mk('circle',Object.assign({cx:d[0],cy:d[1],r:9,fill:c[(p.hcol+d[2])%c.length]},L),svg));}
    else if(kind==='beard'){head(CARD);mk('path',{d:'M-62 0 C-54 30 -38 12 -23 17 Q0 9 23 17 C38 12 54 30 62 0 '+JAW[p.head]+' Z',fill:p.beard?HCOL[p.hcol]:INK,opacity:p.beard===2?.5:1,transform:'translate(20 21) scale(.2)'},svg);head('none');}
    else if(kind==='specs'){[11,29].forEach(x=>mk('circle',Object.assign({cx:x,cy:21,r:7,fill:'none'},L),svg));mk('path',Object.assign({d:'M18 20 Q20 18 22 20',fill:'none'},L),svg);}
    else if(kind==='cloth'){mk('path',Object.assign({d:'M4 35 L5 25 Q7 15 15 14 L25 14 Q33 15 35 25 L36 35 Z',fill:CLOTH[p.cloth]},L),svg);mk('path',Object.assign({d:'M15 14 L20 23 L25 14 Z',fill:CARD},L),svg);}
    else if(kind==='dice'){mk('rect',Object.assign({x:6,y:6,width:28,height:28,rx:6,fill:CARD},L),svg);[[13,13],[27,13],[20,20],[13,27],[27,27]].forEach(d=>mk('circle',{cx:d[0],cy:d[1],r:2.6,fill:INK},svg));}
  }

  /* ================= who has which face ================= */
  const API0=(()=>{try{return new URLSearchParams(location.search).get('api');}catch(_){return null;}})()||'https://gt-poll.rlamare.workers.dev';
  function roster(api){
    const get=room=>fetch((api||API0)+'/p/'+room+'/entries').then(r=>r.json()).then(d=>d.entries||[]).catch(()=>[]);
    return Promise.all([get('gt-names'),get('gt-avatars')]).then(([names,avs])=>{
      const claim=new Map();names.forEach(e=>{if(e&&e.t)claim.set(e.v,norm(e.t));});                           /* latest claim per phone, the points system's rule */
      const shown=new Map();names.forEach(e=>{if(e&&e.t&&claim.get(e.v)===norm(e.t))shown.set(norm(e.t),String(e.t).trim());});
      const out=new Map();shown.forEach((nm,k)=>out.set(k,fromName(nm)));
      avs.forEach(e=>{const t=String(e&&e.t||''), i=t.indexOf('|');if(i<1)return;
        const k=norm(t.slice(i+1));if(k&&claim.get(e.v)===k)out.set(k,Object.assign(parse(t.slice(0,i),k),{built:true}));});                /* later lines overwrite earlier ones */
      return out;
    }).catch(()=>new Map());
  }
  function of(map,name){return (map&&map.get(norm(name)))||fromName(name);}

  return {fromName,parse,code,cycle,random,draw,tick,icon,roster,of,norm,KEYS,N,SKIN,HCOL,CLOTH};
})();
