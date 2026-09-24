/* =============================================================
   Applied Game Theory decks: live text editor  ·  gt/edit.js
   One line in a deck:  <script defer src="/teaching/exec/gt/edit.js"></script>

   Open any module with ?edit on the address (…/m5/?edit, or …/m5/?edit#6
   for the seventh slide). Text you may change gets a dashed outline: click
   it, type, and press SAVE (or Cmd/Ctrl+S). Live about a minute later.

   WHY THIS IS NOT /edit.js (the LER 565 editor). That one saves by copying
   the whole live page back to GitHub. These decks redraw themselves while
   they run (boards, counts, the room's names, demo data, which slide is up),
   so a copy of the live page would write all of that, real participants'
   names included, into a public file, and the next load would draw it twice.
   This editor never saves the page. It fetches the SOURCE file from GitHub,
   finds the one stretch of text you changed, replaces only that, checks that
   nothing else in the file moved, and commits. If it cannot place an edit
   with certainty it refuses and says so; a refused edit changes nothing.

   WHAT IT WILL NOT DO. Text only: no adding or removing bullets or slides.
   Text a script writes (board lines, counts, verdicts), text inside drawings
   (SVG), and the phones' pages are not editable here. The commit message
   names the slides you touched. (The decks carried a screen-reader transcript
   until 20 Sep 2026; Ryan dropped it for the exec suite, so there is nothing
   to bring into line after an edit.)

   The GitHub token is the one /edit.js already keeps in this browser
   (localStorage, never written into any file). Nothing shows without ?edit.
   ============================================================= */
(function(){
'use strict';
if(!/(\?|&)edit\b/.test(location.search)) return;

var LS='lm_gh_cfg_v1';
function loadCfg(){try{return JSON.parse(localStorage.getItem(LS))||{};}catch(_){return {};}}
function cfg(){var c=loadCfg();c.owner=c.owner||'ryanlamare';c.repo=c.repo||'ryanlamare.github.io';c.branch=c.branch||'main';return c;}
function repoPath(){var p=location.pathname;if(p.charAt(p.length-1)==='/')p+='index.html';else if(!/\.html?$/i.test(p))p+='/index.html';return p.replace(/^\//,'');}

/* ---------- which elements are text a person may edit ---------- */
var INLINE={B:1,I:1,EM:1,STRONG:1,SPAN:1,A:1,BR:1,U:1,SUP:1,SUB:1,SMALL:1};
/* an id, a data- attribute or an inline handler means a script owns the node */
function hooked(e){
  if(e.id)return true;
  for(var i=0;i<e.attributes.length;i++){var n=e.attributes[i].name;
    if(n.indexOf('data-')===0&&n!=='data-step')return true;
    if(n.indexOf('on')===0)return true;}
  return false;
}
function isLeaf(el){
  if(!el.textContent||!el.textContent.trim())return false;
  if(el.namespaceURI!=='http://www.w3.org/1999/xhtml')return false;
  if(/^(BUTTON|SELECT|INPUT|TEXTAREA|SCRIPT|STYLE|IFRAME|IMG|SVG)$/i.test(el.tagName))return false;
  if(hooked(el))return false;
  var d=el.getElementsByTagName('*');
  for(var i=0;i<d.length;i++){if(!INLINE[d[i].tagName]||hooked(d[i]))return false;}
  return true;
}
/* the outermost text blocks of one slide, in document order */
function leaves(slide){
  var out=[];
  (function walk(n){
    for(var c=n.firstElementChild;c;c=c.nextElementSibling){
      if(c.namespaceURI!=='http://www.w3.org/1999/xhtml')continue;
      if(isLeaf(c))out.push(c);else walk(c);
    }
  })(slide);
  return out;
}
function slidesOf(doc){return Array.prototype.slice.call(doc.querySelectorAll('section.slide[data-i]'));}
function parse(src){return new DOMParser().parseFromString(src,'text/html');}

/* ---------- finding a leaf's text in the raw source ---------- */
function esc(s){return s.replace(/[.*+?^${}()|[\]\\\/]/g,'\\$&');}
/* innerHTML as the browser writes it, turned into a pattern that also matches
   how a person wrote it: &rsquo; for ’, <br/> for <br>, loose white space */
function pattern(S,tag){
  var out='',i=0,m;
  while(i<S.length){
    if(S.substr(i,5)==='&amp;'){out+='(?:&amp;|&(?![a-zA-Z#]))';i+=5;continue;}
    if(S.substr(i,4)==='&lt;'){out+='&lt;';i+=4;continue;}
    if(S.substr(i,4)==='&gt;'){out+='(?:&gt;|>)';i+=4;continue;}
    if(S.substr(i,6)==='&nbsp;'){out+='(?:&nbsp;|&#160;|\\u00a0)';i+=6;continue;}
    if(S.substr(i,4)==='<br>'){out+='<br\\s*\\/?>';i+=4;continue;}
    var c=S.charAt(i);
    if(/\s/.test(c)){while(i<S.length&&/\s/.test(S.charAt(i)))i++;out+='\\s+';continue;}
    if(c==='"'){out+='(?:["\']|&quot;|&#34;)';i++;continue;}
    if(c==="'"){out+="(?:'|&#39;|&apos;)";i++;continue;}
    var cp=S.codePointAt(i),ch=String.fromCodePoint(cp);
    if(cp>126){out+='(?:'+esc(ch)+'|&[a-zA-Z]+[0-9]*;|&#[0-9]+;|&#[xX][0-9a-fA-F]+;)';i+=ch.length;continue;}
    out+=esc(c);i++;
  }
  /* only as the whole content of an element of this kind: its opening tag before, a tag after.
     The opening group is lazy so that white space at the start of the text stays with the text. */
  return new RegExp('(<'+tag.toLowerCase()+'\\b[^>]*>)('+out+')(?=\\s*<)','gi');
}
/* the stretch of the source that is slide n */
function slideRange(src,n){
  var re=/<section\b[^>]*\bclass="slide\b[^"]*"[^>]*>/g,m,starts=[];
  while((m=re.exec(src)))starts.push({at:m.index,tag:m[0]});
  for(var k=0;k<starts.length;k++){
    var di=/\bdata-i="(\d+)"/.exec(starts[k].tag);
    if(di&&+di[1]===n){
      var end=k+1<starts.length?starts[k+1].at:src.length;
      var t=src.indexOf('<div class="ticks"',starts[k].at);if(t>-1&&t<end)end=t;
      var sr=src.indexOf('<section class="sr-only"',starts[k].at);if(sr>-1&&sr<end)end=sr;
      return {from:starts[k].at,to:end};
    }
  }
  return null;
}
/* the decks write their punctuation as named entities (&rsquo; &ndash; &pound;); an edited line keeps to that, so the file stays in one style */
var ENT={'\u2019':'&rsquo;','\u2018':'&lsquo;','\u201c':'&ldquo;','\u201d':'&rdquo;','\u2013':'&ndash;','\u2014':'&mdash;','\u2026':'&hellip;','\u00b7':'&middot;','\u00a3':'&pound;','\u00d7':'&times;'};
function housestyle(h){return h.replace(/[\u2019\u2018\u201c\u201d\u2013\u2014\u2026\u00b7\u00a3\u00d7]/g,function(c){return ENT[c];});}
/* where this text sits in the source: one hit per identical text block of the slide, or null if that cannot be said for sure */
function places(src,slide,tag,was,same){
  var r=slideRange(src,slide);if(!r)return null;
  var seg=src.slice(r.from,r.to),re=pattern(was,tag),m,hits=[];
  while((m=re.exec(seg))){hits.push({from:r.from+m.index+m[1].length,to:r.from+m.index+m[0].length});if(m[0].length===0)re.lastIndex++;}
  return hits.length===same?hits:null;
}
/* edits: [{slide, tag, was, now, ord}] where ord counts identical leaves in that slide.
   Returns {src} or {error}. Never returns a source it has not verified. */
function applyEdits(src,edits){
  var before=slidesOf(parse(src)).map(function(s){return leaves(s).map(function(l){return l.tagName+'|'+l.innerHTML;});});
  var cuts=[];
  for(var e=0;e<edits.length;e++){
    var ed=edits[e],r=slideRange(src,ed.slide);
    /* a piece inside the text that appears on its own keypress, or sits on its own line, is part of the slide's build, not of its wording:
       deleting one (m1 slide 13, 21 Sep 2026) ran two lines together and lost the reveal. Retype inside it, or send it to Claude. */
    var tw=document.createElement('template'),tn=document.createElement('template');tw.innerHTML=ed.was;tn.innerHTML=ed.now;
    if(tn.content.querySelectorAll('[data-step],[style]').length<tw.content.querySelectorAll('[data-step],[style]').length)
      return {error:'That edit on slide '+(ed.slide+1)+' deleted a piece that appears on its own keypress or sits on its own line. Nothing was saved. Press Revert and retype inside that piece, or send this one to Claude.'};
    if(!r)return {error:'Slide '+(ed.slide+1)+' is not where it was in the file on GitHub. Reload and try again.'};
    var list=before[ed.slide]||[],same=list.filter(function(k){return k===ed.tag+'|'+ed.was;}).length;
    if(same<ed.ord+1)return {error:'The file on GitHub no longer has that text on slide '+(ed.slide+1)+'. Reload and try again.'};
    var hits=places(src,ed.slide,ed.tag,ed.was,same);
    if(!hits)return {error:'Could not place the edit on slide '+(ed.slide+1)+' with certainty. Nothing was saved; send this one to Claude.'};
    cuts.push({from:hits[ed.ord].from,to:hits[ed.ord].to,now:housestyle(ed.now)});
  }
  cuts.sort(function(a,b){return b.from-a.from;});
  for(var c=1;c<cuts.length;c++){if(cuts[c].to>cuts[c-1].from)return {error:'Two edits overlap. Save them one at a time.'};}
  var out=src;
  cuts.forEach(function(c){out=out.slice(0,c.from)+c.now+out.slice(c.to);});
  /* verify: every text block of every slide is as it was, except the ones edited, which are as typed */
  var want=before.map(function(l){return l.slice();});
  edits.forEach(function(ed){
    var seen=-1;for(var k=0;k<want[ed.slide].length;k++){
      if(before[ed.slide][k]===ed.tag+'|'+ed.was){seen++;if(seen===ed.ord){var t=document.createElement('template');t.innerHTML=ed.now;want[ed.slide][k]=ed.tag+'|'+t.innerHTML;}}}
  });
  var after=slidesOf(parse(out)).map(function(s){return leaves(s).map(function(l){return l.tagName+'|'+l.innerHTML;});});
  if(JSON.stringify(after)!==JSON.stringify(want))return {error:'The edit would have changed more than the text you typed. Nothing was saved; send this one to Claude.'};
  if(parse(out).getElementsByTagName('*').length-parse(src).getElementsByTagName('*').length!==edits.reduce(function(n,ed){
      var a=document.createElement('template'),b=document.createElement('template');a.innerHTML=ed.now;b.innerHTML=ed.was;
      return n+a.content.querySelectorAll('*').length-b.content.querySelectorAll('*').length;},0))
    return {error:'The edit would have changed the structure of the page. Nothing was saved; send this one to Claude.'};
  return {src:out};
}
/* exposed for testing; harmless */
window.GTEdit={leaves:leaves,slidesOf:slidesOf,parse:parse,applyEdits:applyEdits,pattern:pattern};

/* ---------- the editor ---------- */
var pairs=[],dirty=new Set(),statusEl=null,bar=null;
function setStatus(t,bad){if(statusEl){statusEl.textContent=t;statusEl.style.color=bad?'#ff8a80':'';}}
/* what was typed, as it should be written: no editor leftovers */
function typed(el,was){
  var c=el.cloneNode(true);
  c.querySelectorAll('[contenteditable]').forEach(function(n){n.removeAttribute('contenteditable');n.removeAttribute('spellcheck');});
  /* the deck marks a revealed step with class "shown" while it runs; that is the state of the room, not of the file
     (saved once by mistake on m1 slide 16, 21 Sep 2026: the two lines came up already revealed) */
  c.querySelectorAll('[data-step]').forEach(function(n){n.classList.remove('shown');if(!n.getAttribute('class'))n.removeAttribute('class');n.removeAttribute('data-stepon');});
  c.querySelectorAll('font,span[style]').forEach(function(n){while(n.firstChild)n.parentNode.insertBefore(n.firstChild,n);n.remove();});
  c.querySelectorAll('div,p').forEach(function(n){while(n.firstChild)n.parentNode.insertBefore(n.firstChild,n);n.remove();});
  var h=c.innerHTML.replace(/(<br>)+$/,'');
  if(was.indexOf('&nbsp;')<0)h=h.replace(/&nbsp;/g,' ');
  return h.replace(/\s+$/,'')===was.replace(/\s+$/,'')?was:h;
}
function start(served){
  var pris=slidesOf(parse(served)),live=slidesOf(document);
  pris.forEach(function(ps){
    var n=+ps.getAttribute('data-i'),ls=live.filter(function(s){return +s.getAttribute('data-i')===n;})[0];if(!ls)return;
    var pl=leaves(ps),ll=leaves(ls),count={},used=new Set();
    pl.forEach(function(p){
      var key=p.tagName+'|'+p.innerHTML,ord=count[key]=(count[key]===undefined?0:count[key]+1);
      /* the live twin: same tag, same words, same place among identical ones; a block a script has rewritten has no twin */
      var seen=-1,twin=null;
      for(var k=0;k<ll.length;k++){if(ll[k].tagName+'|'+ll[k].innerHTML===key){seen++;if(seen===ord){twin=ll[k];break;}}}
      if(!twin||used.has(twin))return;
      /* a block whose text cannot be found for certain in the source (a lone comma in a matrix cell) is left alone, so nothing is outlined that would be refused at the save */
      var same=pl.filter(function(q){return q.tagName+'|'+q.innerHTML===key;}).length;
      if(!places(served,n,p.tagName,p.innerHTML,same))return;
      used.add(twin);
      twin.setAttribute('contenteditable','true');twin.setAttribute('spellcheck','false');
      pairs.push({el:twin,slide:n,tag:p.tagName,was:p.innerHTML,ord:ord});
    });
  });
  /* text inside a link, a clip tile or a clip cover is edited, not followed: a click in it would open the article
     or start the clip instead (the dating apps tile on m4, 24 Sep 2026). */
  window.addEventListener('click',function(e){var h=e.target&&e.target.closest&&e.target.closest('[contenteditable="true"]');
    if(h&&h.closest('a,button,.ytplay')){e.preventDefault();e.stopPropagation();}},true);
  document.addEventListener('input',function(e){var h=e.target&&e.target.closest&&e.target.closest('[contenteditable="true"]');if(h){dirty.add(h);mark();}});
  document.addEventListener('paste',function(e){var el=document.activeElement;if(!el||!el.isContentEditable)return;e.preventDefault();
    document.execCommand('insertText',false,(e.clipboardData||window.clipboardData).getData('text/plain'));});
  /* while the caret is in text, no key reaches the deck (arrows would change slide, D and N run the committee clock) */
  window.addEventListener('keydown',function(e){
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){e.preventDefault();e.stopPropagation();save();return;}
    var el=document.activeElement;
    if(el&&el.isContentEditable){
      if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();el.blur();}
      e.stopPropagation();
    }
  },true);
  window.addEventListener('beforeunload',function(e){if(changed().length){e.preventDefault();e.returnValue='';}});
  setStatus(pairs.length+' pieces of text can be edited. Click one.');
}
function changed(){
  var out=[];pairs.forEach(function(p){if(!dirty.has(p.el))return;var now=typed(p.el,p.was);if(now!==p.was)out.push({slide:p.slide,tag:p.tag,was:p.was,now:now,ord:p.ord,pair:p});});
  return out;
}
function mark(){var n=changed().length;if(bar)bar.classList.toggle('dirty',n>0);setStatus(n?n+' unsaved change'+(n===1?'':'s'):'No changes');}
function b64(str){var by=new TextEncoder().encode(str),bin='',CH=0x8000;for(var i=0;i<by.length;i+=CH)bin+=String.fromCharCode.apply(null,by.subarray(i,i+CH));return btoa(bin);}
function unb64(s){var bin=atob(s.replace(/\s/g,'')),by=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)by[i]=bin.charCodeAt(i);return new TextDecoder().decode(by);}
var saving=false;
/* a save that GitHub turns away never costs the edits: they stay on the page, and the message says which of the three things went wrong */
function Refused(msg,retry){this.message=msg;this.retry=retry;}
function save(retried){
  retried=retried===true;
  if(saving)return;var ed=changed();if(!ed.length){setStatus('Nothing to save');return;}
  var c=cfg();if(!c.token){if(askToken())save();return;}
  saving=true;setStatus('Saving…');
  var path=repoPath(),base='https://api.github.com/repos/'+c.owner+'/'+c.repo+'/contents/'+path.split('/').map(encodeURIComponent).join('/');
  var headers={'Authorization':'Bearer '+c.token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  fetch(base+'?ref='+encodeURIComponent(c.branch),{headers:headers,cache:'no-store'}).then(function(g){
    /* 401: a token GitHub no longer knows (fine-grained tokens expire, after 30 days unless a longer life was chosen). 403: one it knows but will not let read this. */
    if(g.status===401)throw new Refused('GitHub no longer accepts the saved token (401): it has most likely expired.',true);
    if(g.status===403)throw new Refused('GitHub would not let the saved token read this file (403).',true);
    if(g.status!==200)throw new Refused('Could not read the file from GitHub ('+g.status+').',false);
    return g.json();
  }).then(function(j){
    var res=applyEdits(unb64(j.content),ed);
    if(res.error)throw new Refused(res.error,false);
    var nums=ed.map(function(x){return x.slide+1;}).filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(a,b){return a-b;});
    var msg='Live text edit, '+path.replace(/^teaching\/exec\/gt\//,'exec/gt ').replace(/\/index\.html$/,'')+': slide'+(nums.length===1?' ':'s ')+nums.join(', ')+'.';
    return fetch(base,{method:'PUT',headers:headers,body:JSON.stringify({message:msg,content:b64(res.src),sha:j.sha,branch:c.branch})});
  }).then(function(p){
    if(p.status===403||p.status===404)throw new Refused('The saved token can read this repository but not write to it ('+p.status+'). It needs Contents: Read and write on ryanlamare.github.io.',true);
    if(p.status===409)throw new Refused('The file changed on GitHub while you were editing (409). Press Save again.',false);
    if(p.status!==200&&p.status!==201)return p.text().then(function(x){throw new Refused('GitHub did not take the save ('+p.status+'). '+x.slice(0,100),false);});
    ed.forEach(function(x){x.pair.was=x.now;dirty.delete(x.pair.el);});
    saving=false;mark();setStatus('Saved ✓ live in about a minute.');
  }).catch(function(err){
    saving=false;
    var msg=err&&err.message?err.message:'The save did not reach GitHub. Try again.';
    /* a bad token: take a new one now and try once more, so nothing typed is lost to a reload */
    if(err&&err.retry&&!retried&&askToken(msg+' Your edits are still on the page. ')){save(true);return;}
    setStatus('⚠ '+msg+(err&&err.retry?' Press Token to paste a new one; your edits are still here.':''),true);
  });
}
function askToken(lead){
  var t=prompt((lead||'')+'Paste a GitHub token (fine-grained, this repository only, Contents: Read and write). It stays in this browser only.');
  if(t&&t.trim()){var c=loadCfg();c.token=t.trim();try{localStorage.setItem(LS,JSON.stringify(c));}catch(_){}setStatus('Token saved');return true;}
  return false;
}
function ui(){
  var st=document.createElement('style');
  st.textContent='#gt-edit{position:fixed;left:12px;bottom:12px;z-index:99999;display:flex;align-items:center;gap:8px;background:#1b1b19;color:#e8e1d2;font:600 13px/1 system-ui,sans-serif;padding:8px 10px;border-radius:6px;box-shadow:0 4px 18px rgba(0,0,0,.35)}'+
    '#gt-edit b{letter-spacing:.12em;font-size:11px;color:#ff6b5e}#gt-edit button{font:inherit;color:inherit;background:#33322e;border:0;border-radius:4px;padding:7px 10px;cursor:pointer}'+
    '#gt-edit button:hover{background:#4a4943}#gt-edit.dirty button.save{background:#c8202f;color:#fff}#gt-edit span{font-weight:500;max-width:46vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
    '[contenteditable="true"]{outline:1.5px dashed rgba(200,32,47,.55);outline-offset:3px;cursor:text}[contenteditable="true"]:hover{outline-style:solid}[contenteditable="true"]:focus{outline:2px solid #c8202f;background:rgba(200,32,47,.08)}'+
    '@media print{#gt-edit{display:none}}';
  document.head.appendChild(st);
  bar=document.createElement('div');bar.id='gt-edit';
  var lab=document.createElement('b');lab.textContent='EDIT';bar.appendChild(lab);
  function btn(t,cls,fn){var x=document.createElement('button');x.type='button';x.textContent=t;if(cls)x.className=cls;x.addEventListener('click',fn);bar.appendChild(x);return x;}
  btn('Save','save',save);
  btn('Token','',function(){askToken();});
  btn('Revert','',function(){if(!changed().length||confirm('Discard unsaved edits and reload?')){dirty.clear();location.reload();}});
  btn('Exit','',function(){if(!changed().length||confirm('Leave without saving?')){dirty.clear();location.href=location.pathname+location.hash;}});
  statusEl=document.createElement('span');bar.appendChild(statusEl);
  document.body.appendChild(bar);
}
function boot(){
  ui();
  if(!cfg().token)askToken();
  setStatus('Reading the page…');
  fetch(location.pathname,{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.text();}).then(start)
    .catch(function(){setStatus('⚠ Could not read this page’s source, so nothing is editable.',true);});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
