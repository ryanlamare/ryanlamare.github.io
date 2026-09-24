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
(function(){
const slides=[...document.querySelectorAll('.slide')];
const ticksEl=document.querySelector('.ticks');
const built=slides.length;
let cur=0, step=0;
/* flex mode: slides carrying class "flex" are the pre-agreed cuts for a
   session running long. Press F to skip them (and again to restore);
   their ticks are hollow, and dim while skipped. The choice sticks per
   deck in localStorage. #N in the URL still opens any slide directly. */
const FLEXKEY='gt-flex-'+location.pathname;
let skipFlex=false;try{skipFlex=localStorage.getItem(FLEXKEY)==='1';}catch(_){}
slides.forEach((s,i)=>{if(s.classList.contains('flex')&&ticksEl.children[i])ticksEl.children[i].classList.add('flex');});
function isFlex(i){return slides[i].classList.contains('flex');}
function setSkip(on){skipFlex=on;ticksEl.classList.toggle('skipping',on);try{localStorage.setItem(FLEXKEY,on?'1':'0');}catch(_){}}
setSkip(skipFlex);
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
  if(armed&&location.hash!=='#'+cur){try{history.replaceState(null,'','#'+cur);}catch(_){}}}
function next(){if(step<maxStep(cur)){step++;applySteps();return;}
  let n=cur+1;while(skipFlex&&n<built&&isFlex(n))n++;
  if(n<built){cur=n;step=0;render();}}
function prev(){if(step>0){step--;applySteps();return;}
  let n=cur-1;while(skipFlex&&n>=0&&isFlex(n))n--;
  if(n>=0){cur=n;step=maxStep(cur);render();}}
addEventListener('keydown',e=>{
  const t=document.activeElement;
  const inControl=t&&(t.tagName==='INPUT'||t.tagName==='SELECT'||t.tagName==='BUTTON'||t.tagName==='A'||t.isContentEditable);
  if(e.key==='ArrowRight'||e.key==='PageDown'){next();e.preventDefault();}
  else if(e.key==='ArrowDown'){if(!inControl){next();e.preventDefault();}}
  else if(e.key===' '||e.key==='Spacebar'){if(!inControl){next();e.preventDefault();}}
  else if(e.key==='ArrowLeft'||e.key==='PageUp'){prev();e.preventDefault();}
  else if((e.key==='f'||e.key==='F')&&!inControl){setSkip(!skipFlex);e.preventDefault();}
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
