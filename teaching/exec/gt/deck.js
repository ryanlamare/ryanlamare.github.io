/* Shared deck engine for the /teaching/exec/gt/ modules.
   Same contract as the LSE decks: .slide[data-i] in document order, one
   .tick per slide, [data-step] progressive reveal. Additions here:
   keys are ignored while a form control inside a .widget has focus,
   and touch swipe advances (for phone previews). */
/* step helper: <span data-step="N" data-stepcall="mxMark" data-cells="id1,id2" data-cls="hot|eq|dead">
   toggles the class on the listed elements as the step shows/hides */
window.mxMark=function(el,on){
  (el.dataset.cells||'').split(',').forEach(id=>{
    const c=document.getElementById(id.trim());
    if(c)c.classList.toggle(el.dataset.cls||'hot',on);
  });
};
/* poll rows of figures (25 Sep 2026): every option's figures stay on one line,
   at one size for all the rows of a poll, so the longest row is the biggest
   count and no figure is left alone on a second line (his filled-grid rule).
   Pass the poll's lanes after drawing them; figures shrink only when the
   biggest count would not fit at their own size. */
window.fitLanes=function(lanes){
  lanes=[...lanes].filter(Boolean);
  const units=lanes.map(l=>[...l.querySelectorAll('.u')]);
  units.flat().forEach(u=>u.style.width='');
  const max=Math.max(0,...units.map(u=>u.length));if(!max)return;
  const u0=units.find(u=>u.length)[0], w0=u0.offsetWidth;
  const inner=l=>{const c=getComputedStyle(l);return l.clientWidth-parseFloat(c.paddingLeft)-parseFloat(c.paddingRight);};
  const W=Math.min(...lanes.map(inner)), gap=parseFloat(getComputedStyle(lanes[0]).columnGap)||0;
  if(W<=0||max*(w0+gap)-gap<=W)return;
  const w=Math.max(8,Math.floor(((W+gap)/max-gap)*10)/10);
  units.flat().forEach(u=>u.style.width=w+'px');
};
(function(){
const slides=[...document.querySelectorAll('.slide')];
const ticksEl=document.querySelector('.ticks');
const built=slides.length;
let cur=0, step=0;
/* flex mode is gone (25 Sep 2026): F used to skip the slides marked "flex", and
   Ryan found FLEX SLIDES OFF under m6 without knowing a key had turned it on.
   A hidden key that silently skips slides is a trap in a room, so every slide
   shows and a slide is skipped by pressing on. The class "flex" on a slide
   now does nothing; a browser that had the switch on forgets it here. */
try{localStorage.removeItem('gt-flex-'+location.pathname);}catch(_){}
function fit(){const s=Math.min(innerWidth/1280,innerHeight/720);document.documentElement.style.setProperty('--scale',s);}
addEventListener('resize',fit);fit();
function maxStep(i){const ds=[...slides[i].querySelectorAll('[data-step]')].map(e=>+e.dataset.step||0);return ds.length?Math.max(...ds):0;}
function applySteps(){slides[cur].querySelectorAll('[data-step]').forEach(e=>{
  const on=(+e.dataset.step||0)<=step;
  e.classList.toggle('shown',on);
  if(e.dataset.stepcall){const was=e.dataset.stepon==='1';
    if(was!==on){e.dataset.stepon=on?'1':'0';try{window[e.dataset.stepcall](e,on);}catch(_){}}}
});}
/* the slide goes into the address as #N, so a reload (a clicker's F5, a
   stray Cmd-R) lands on the same slide, at its first step, not on slide 1
   (Ryan, 24 Sep 2026). The step stays out on purpose: replaying one could
   re-run a reveal. Written only once the deck has read its own address. */
let armed=false;
function render(){slides.forEach((s,i)=>s.classList.toggle('active',i===cur));
  [...ticksEl.children].forEach((t,i)=>t.classList.toggle('on',i===cur));
  ticksEl.classList.toggle('lightticks',slides[cur].classList.contains('cover'));applySteps();
  if(armed&&location.hash!=='#'+cur){try{history.replaceState(null,'','#'+cur);}catch(_){}}
  tellNow();}
/* On the screen now (25 Sep 2026): arriving at a slide with a QR tells the
   poll server which QR it is (room gt-now, "date|path of the QR image"), so
   someone too far back to scan can type ryanlamare.com/go and find that page
   first, in red. /go keeps the list of what each QR opens. Only a change is
   sent, and nothing from ?edit. */
let nowSent='';
function tellNow(){
  const q=slides[cur].querySelector('img[src*="qr-"]');
  if(!q||typeof POLL_API==='undefined'||/[?&]edit\b/.test(location.search))return;
  const path=new URL(q.getAttribute('src'),location.href).pathname;
  if(path===nowSent)return;nowSent=path;
  const d=new Date(),day=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  fetch(POLL_API+'/p/gt-now/say',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({t:day+'|'+path,v:'deck-'+Math.random().toString(36).slice(2,12)})}).catch(()=>{});
}
function next(){if(step<maxStep(cur)){step++;applySteps();return;}
  if(cur+1<built){cur++;step=0;render();}}
function prev(){if(step>0){step--;applySteps();return;}
  if(cur>0){cur--;step=maxStep(cur);render();}}
addEventListener('keydown',e=>{
  const t=document.activeElement;
  const inControl=t&&(t.tagName==='INPUT'||t.tagName==='SELECT'||t.tagName==='BUTTON'||t.tagName==='A'||t.isContentEditable);
  if(e.key==='ArrowRight'||e.key==='PageDown'){next();e.preventDefault();}
  else if(e.key==='ArrowDown'){if(!inControl){next();e.preventDefault();}}
  else if(e.key===' '||e.key==='Spacebar'){if(!inControl){next();e.preventDefault();}}
  else if(e.key==='ArrowLeft'||e.key==='PageUp'){prev();e.preventDefault();}
  else if(e.key==='ArrowUp'){if(!inControl){prev();e.preventDefault();}}
});
let tx=null,ty=null;
addEventListener('touchstart',e=>{if(e.target.closest('.widget'))return;tx=e.touches[0].clientX;ty=e.touches[0].clientY;},{passive:true});
addEventListener('touchend',e=>{if(tx===null)return;const dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;
  if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){dx<0?next():prev();}tx=ty=null;},{passive:true});
render();
window.deckGoto=function(i){if(i>=0&&i<built){cur=i;step=0;render();}};
/* #N in the URL opens slide N (zero-based); #N.S also applies S reveal steps */
function fromHash(){const m=location.hash.match(/^#(\d+)(?:\.(\d+))?$/);
  if(m){const i=+m[1];if(i>=0&&i<built){cur=i;step=m[2]?+m[2]:0;render();}}}
addEventListener('hashchange',fromHash);fromHash();armed=true;
/* the page's head may have shown the addressed slide early (#deckjump); from here the deck draws it */
{const dj=document.getElementById('deckjump');if(dj)dj.remove();}
})();

/* extra resources (a module's last slide): a card carrying data-yt plays in
   place, over the slide, so the deck is never left; CLOSE or Esc goes back to
   the list, and the deck does not move underneath while a clip is up. Without
   script a card is an ordinary link. In ?edit the cards are text, not buttons. */
/* Since 23 Sep 2026 anything marked .ytplay with a data-yt (and a data-title
   for the player's bar) opens the same player, so a tile on a teaching slide
   can play its clip without a frame of its own (m7's Dr. Strangelove tile). */
(function(){
let open=null;
function close(){if(open){open.remove();open=null;}document.documentElement.classList.remove('rplaying');}
document.addEventListener('click',e=>{
  const a=e.target.closest&&e.target.closest('a.rcard,.ytplay');
  if(!a)return;
  if(new URLSearchParams(location.search).has('edit')){e.preventDefault();return;}
  if(!a.dataset.yt)return;
  e.preventDefault();close();
  const slide=a.closest('.slide');
  open=document.createElement('div');open.className='rplayer';
  const f=document.createElement('iframe');
  f.src='https://www.youtube.com/embed/'+a.dataset.yt+'?autoplay=1'+(a.dataset.start?'&start='+a.dataset.start:'')+(a.dataset.end?'&end='+a.dataset.end:'');
  f.title=a.dataset.title||(a.querySelector('.rtt')||{}).textContent||'';
  f.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  f.allowFullscreen=true;
  const bar=document.createElement('div');bar.className='rbar';
  const now=document.createElement('div');now.className='rnow';now.textContent=f.title;
  const b=document.createElement('button');b.type='button';b.textContent='Close';b.addEventListener('click',close);
  bar.appendChild(now);bar.appendChild(b);open.appendChild(f);open.appendChild(bar);slide.appendChild(open);
  document.documentElement.classList.add('rplaying');
});
addEventListener('keydown',e=>{
  if(!open)return;
  if(e.key==='Escape')close();
  e.stopImmediatePropagation();
  if(e.key!=='Escape'&&e.key!=='Tab')e.preventDefault();
},true);
})();
