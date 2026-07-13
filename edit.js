/* =============================================================
   LER 565 live slide editor  ·  /edit.js   (v2)
   One line in any deck:  <script defer src="/edit.js"></script>

   VISIBILITY / SECURITY
   - The toolbar appears ONLY if a GitHub token is already saved in
     THIS browser. Visitors who add ?edit see nothing at all.
   - First-time setup on a new browser: open the page with ?edit — the
     Connect panel appears so you can paste your token once.
   - The token lives only in this browser (localStorage); it is never
     written into any saved file.

   EDITING
   - Click any text to edit. Toolbar: Bold / Italic / Link, and
     add / remove a bullet. Ctrl/Cmd+B, Ctrl/Cmd+S (save) also work.
   - Save to GitHub commits the page for you (~1 min to go live).
     Export downloads the file as a fallback.
   ============================================================= */

/* Always-on: deep links. Opening a deck with #N in the URL jumps to slide N
   (works for everyone, not just editors). */
(function(){
  function jump(){
    var m = (location.hash || '').match(/^#(\d+)$/);
    if(m && typeof goto === 'function'){ var n = parseInt(m[1], 10) - 1; if(n >= 0) goto(n); }
  }
  window.addEventListener('hashchange', jump);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', jump);
  else jump();
})();

(function(){
  'use strict';

  var editParam = /(\?|&)edit\b/.test(location.search) || /(^|#)edit/.test(location.hash);
  if(!editParam) return;

  var LS = 'lm_gh_cfg_v1';
  var enabled = false, dirty = false, statusEl = null, dotEl = null;

  function loadCfg(){ try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch(e){ return {}; } }
  function saveCfg(c){ localStorage.setItem(LS, JSON.stringify(c)); }
  function cfg(){
    var c = loadCfg();
    if(!c.owner)  c.owner  = 'ryanlamare';
    if(!c.repo)   c.repo   = 'ryanlamare.github.io';
    if(!c.branch) c.branch = 'main';
    return c;
  }

  var hasToken = !!(loadCfg().token);
  // Plain ?edit always proceeds now: with a saved token you get the full
  // toolbar; without one you just get the (harmless) Connect panel. Editing
  // itself still requires a valid token, so visitors can't change anything.

  // Text elements editable across all house decks
  var EDITABLE = [
    '.cover .tag', '.cover .sub', '.cover .byline',
    '.content .kicker', '.content h2', 'h2',
    '.ntile .pl', '.now-tag',
    'ul.body li',
    '.cap', '.capline', '.lesson', '.rnote',
    '.role .rt', '.role .rd',
    '.ruleline span:not(.rn)',
    '.nextlist .nl',
    '.duenote span',
    '.cs', '.ct', '.gl', '.gs', '.gn',
    '.pd .ch', '.pd .cl', '.pd .rl',
    '.pd .pcell .pa', '.pd .pcell .pb',
    '.fcard .fn', '.fcard .fmeta', '.fcard .farch',
    '[data-edit]', '.editable'
  ].join(',');

  function repoPath(){
    var p = location.pathname;
    if(p.charAt(p.length-1) === '/') p += 'index.html';
    else if(!/\.html?$/i.test(p)) p += '/index.html';
    return p.replace(/^\//, '');
  }

  // ---------- clean HTML for saving / exporting ----------
  function buildHTML(){
    var clone = document.documentElement.cloneNode(true);
    ['#lm-tools', '#lm-modal', '#lm-css'].forEach(function(sel){
      var n = clone.querySelector(sel); if(n) n.remove();
    });
    clone.querySelectorAll('[contenteditable]').forEach(function(n){
      n.removeAttribute('contenteditable'); n.removeAttribute('spellcheck');
    });
    var b = clone.querySelector('body'); if(b) b.classList.remove('lm-editing');
    clone.querySelectorAll('.slide').forEach(function(s){ s.classList.toggle('active', s.getAttribute('data-i') === '0'); });
    clone.querySelectorAll('[data-step]').forEach(function(n){ n.classList.remove('shown'); });
    clone.querySelectorAll('.ticks .tick').forEach(function(x){ x.classList.remove('on'); });
    clone.querySelectorAll('.ticks').forEach(function(x){ x.classList.remove('lightticks'); });
    var mp = clone.querySelector('#map'); if(mp) mp.classList.remove('open');
    clone.removeAttribute('style');
    return '<!doctype html>' + String.fromCharCode(10) + clone.outerHTML + String.fromCharCode(10);
  }

  function exportFile(){
    var blob = new Blob([buildHTML()], {type:'text/html'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'index.html';
    document.body.appendChild(a); a.click(); setDirty(false);
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    setStatus('Downloaded index.html');
  }

  function toB64(str){
    var bytes = new TextEncoder().encode(str), bin = '', CH = 0x8000;
    for(var i=0; i<bytes.length; i+=CH){ bin += String.fromCharCode.apply(null, bytes.subarray(i, i+CH)); }
    return btoa(bin);
  }

  // ---------- GitHub save ----------
  function saveGitHub(){
    var c = cfg();
    if(!c.token){ openModal(true); return; }
    var path = repoPath();
    setStatus('Saving to GitHub…');
    var base = 'https://api.github.com/repos/' + c.owner + '/' + c.repo + '/contents/' + path.split('/').map(encodeURIComponent).join('/');
    var headers = { 'Authorization':'Bearer '+c.token, 'Accept':'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28' };
    fetch(base + '?ref=' + encodeURIComponent(c.branch), {headers: headers})
      .then(function(g){
        if(g.status === 401 || g.status === 403) throw new Error('Token rejected ('+g.status+'). Check it in Settings.');
        if(g.status === 200) return g.json().then(function(j){ return j.sha; });
        return undefined;
      })
      .then(function(sha){
        var body = { message:'Edit '+path+' via live editor', content: toB64(buildHTML()), branch: c.branch };
        if(sha) body.sha = sha;
        return fetch(base, {method:'PUT', headers: headers, body: JSON.stringify(body)});
      })
      .then(function(p){
        if(p.status === 200 || p.status === 201){ setDirty(false); setStatus('Saved \u2713  live in ~1 min'); }
        else return p.text().then(function(t){ throw new Error('Save failed ('+p.status+'). '+t.slice(0,120)); });
      })
      .catch(function(err){ setStatus('\u26a0 '+err.message, true); });
  }

  // ---------- formatting helpers ----------
  function fmt(cmd){ document.execCommand('styleWithCSS', false, false); document.execCommand(cmd, false, null); setDirty(true); }
  function addLink(){ var u = prompt('Link URL:'); if(u){ document.execCommand('createLink', false, u); setDirty(true); } }
  function currentLI(){
    var n = window.getSelection().anchorNode;
    while(n && n !== document.body){ if(n.nodeType === 1 && n.matches && n.matches('li')) return n; n = n.parentNode; }
    return null;
  }
  function addBullet(){
    var li = currentLI(); if(!li){ setStatus('Put the cursor in a bullet first'); return; }
    var nl = document.createElement('li'); nl.setAttribute('contenteditable','true'); nl.setAttribute('spellcheck','false');
    nl.textContent = 'New point';
    li.parentNode.insertBefore(nl, li.nextSibling);
    var r = document.createRange(); r.selectNodeContents(nl);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); nl.focus(); setDirty(true);
  }
  function removeBullet(){
    var li = currentLI(); if(!li){ setStatus('Put the cursor in a bullet first'); return; }
    if(li.parentNode.children.length <= 1){ setStatus('Keep at least one bullet'); return; }
    li.remove(); setDirty(true);
  }
  function moveBullet(dir){
    var li = currentLI(); if(!li){ setStatus('Put the cursor in a bullet first'); return; }
    if(dir < 0 && li.previousElementSibling){ li.parentNode.insertBefore(li, li.previousElementSibling); setDirty(true); }
    else if(dir > 0 && li.nextElementSibling){ li.parentNode.insertBefore(li.nextElementSibling, li); setDirty(true); }
  }

  var snapshots = {};
  function snapshot(){ document.querySelectorAll('.slide').forEach(function(s){ snapshots[s.getAttribute('data-i')] = s.innerHTML; }); }
  function activeSlide(){ return document.querySelector('.slide.active') || document.querySelector('.slide'); }
  function reEnable(root){ root.querySelectorAll(EDITABLE).forEach(function(el){ el.setAttribute('contenteditable','true'); el.setAttribute('spellcheck','false'); }); }
  function resetSlide(){
    var s = activeSlide(); if(!s) return;
    var k = s.getAttribute('data-i');
    if(snapshots[k] == null){ setStatus('Nothing to reset'); return; }
    if(!confirm('Reset this slide to how it was when you opened edit mode?')) return;
    s.innerHTML = snapshots[k]; reEnable(s); setDirty(true); setStatus('Slide reset');
  }
  function copyLink(){
    var s = activeSlide(); var n = s ? (parseInt(s.getAttribute('data-i'), 10) + 1) : 1;
    var url = location.origin + location.pathname + '#' + n;
    if(navigator.clipboard) navigator.clipboard.writeText(url);
    setStatus('Copied ' + url);
  }

  // ---------- insert image (beta): commits the file to the repo, then drops an <img> in ----------
  function bytesToB64(bytes){ var bin='',CH=0x8000; for(var i=0;i<bytes.length;i+=CH){ bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+CH)); } return btoa(bin); }
  function insertImage(){
    var target = document.activeElement;
    if(!target || !target.isContentEditable){ setStatus('Click into a slide text area first'); return; }
    var c = cfg(); if(!c.token){ openModal(true); return; }
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', function(){
      var f = inp.files && inp.files[0]; if(!f) return;
      var reader = new FileReader();
      reader.onload = function(){
        var bytes = new Uint8Array(reader.result);
        var safe = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        var name = Date.now() + '-' + safe;
        var dir = repoPath().replace(/[^\/]*$/, '');
        var imgPath = dir + 'img/' + name;
        setStatus('Uploading image…');
        var url = 'https://api.github.com/repos/' + c.owner + '/' + c.repo + '/contents/' + imgPath.split('/').map(encodeURIComponent).join('/');
        fetch(url, { method:'PUT',
          headers:{ 'Authorization':'Bearer '+c.token, 'Accept':'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28' },
          body: JSON.stringify({ message:'Add image '+name, content: bytesToB64(bytes), branch: c.branch }) })
        .then(function(r){
          if(r.status === 200 || r.status === 201){
            target.insertAdjacentHTML('beforeend', '<img src="img/'+name+'" alt="" style="max-width:100%;height:auto">');
            setDirty(true); setStatus('Image added \u2713 Save the deck to publish it');
          } else return r.text().then(function(){ throw new Error('Image upload failed ('+r.status+')'); });
        }).catch(function(err){ setStatus('\u26a0 '+err.message, true); });
      };
      reader.readAsArrayBuffer(f);
    });
    inp.click();
  }

  // ---------- UI ----------
  function css(){
    if(document.getElementById('lm-css')) return;
    var s = document.createElement('style'); s.id = 'lm-css';
    s.textContent =
      'body.lm-editing [contenteditable]{outline:1.5px dashed color-mix(in srgb,var(--red) 55%,transparent);outline-offset:3px;cursor:text;border-radius:2px}' +
      'body.lm-editing [contenteditable]:hover{outline-style:solid;background:color-mix(in srgb,var(--red) 8%,transparent)}' +
      'body.lm-editing [contenteditable]:focus{outline:2px solid var(--red);background:color-mix(in srgb,var(--red) 12%,transparent)}' +
      '#lm-tools{position:fixed;top:14px;left:14px;z-index:60;display:flex;gap:7px;align-items:center;flex-wrap:wrap;max-width:96vw;background:var(--ink);padding:8px 10px;border-radius:6px;font-family:var(--sans);box-shadow:0 6px 24px rgba(0,0,0,.35)}' +
      '#lm-tools .lm-lab{font-weight:700;text-transform:uppercase;letter-spacing:.12em;font-size:11px;color:var(--red);padding:0 3px;display:flex;align-items:center;gap:6px}' +
      '#lm-tools .lm-dot{width:8px;height:8px;border-radius:50%;background:transparent}' +
      '#lm-tools .lm-dot.on{background:#ffcf33}' +
      '#lm-tools .lm-sep{width:1px;align-self:stretch;background:color-mix(in srgb,var(--paper) 25%,transparent);margin:0 2px}' +
      '#lm-tools button{font-family:var(--sans);font-weight:600;text-transform:uppercase;letter-spacing:.06em;font-size:11px;background:transparent;color:var(--paper);border:1.5px solid color-mix(in srgb,var(--paper) 40%,transparent);padding:7px 10px;border-radius:4px;cursor:pointer}' +
      '#lm-tools button:hover{background:var(--red);border-color:var(--red)}' +
      '#lm-tools button.lm-primary{background:var(--red);border-color:var(--red)}' +
      '#lm-tools .lm-status{font-weight:500;font-size:11px;color:color-mix(in srgb,var(--paper) 75%,transparent);padding-left:4px;min-width:6ch}' +
      '#lm-tools .lm-status.err{color:#ffb4b4}' +
      '#lm-modal{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);font-family:var(--sans)}' +
      '#lm-modal .lm-card{background:var(--paper);color:var(--ink);width:470px;max-width:92vw;padding:26px 28px;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.4)}' +
      '#lm-modal h3{font-family:var(--display);font-weight:900;font-size:26px;margin-bottom:6px}' +
      '#lm-modal p{font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:14px}' +
      '#lm-modal a{color:var(--red);font-weight:700}' +
      '#lm-modal label{display:block;font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:11px;margin:12px 0 4px}' +
      '#lm-modal input{width:100%;padding:9px 10px;border:1.5px solid var(--rule);border-radius:4px;font-family:var(--sans);font-size:14px;background:var(--paper-soft,#F0EAD9)}' +
      '#lm-modal .lm-row{display:flex;gap:10px}#lm-modal .lm-row>div{flex:1}' +
      '#lm-modal .lm-acts{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}' +
      '#lm-modal .lm-acts button{font-family:var(--sans);font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:12px;padding:10px 16px;border-radius:4px;cursor:pointer;border:1.5px solid var(--ink)}' +
      '#lm-modal .lm-acts .ok{background:var(--red);color:var(--paper);border-color:var(--red)}' +
      '#lm-modal .lm-acts .cancel{background:transparent;color:var(--ink)}' +
      '@page{size:1280px 720px;margin:0}' +
      '@media print{' +
        '#lm-tools,#lm-modal,.nav,.mapbtn,.map,.ticks{display:none!important}' +
        'html,body{height:auto!important;overflow:visible!important;background:#fff!important}' +
        '.viewport{position:static!important;display:block!important}' +
        '.stage{transform:none!important;width:1280px!important;height:auto!important}' +
        '.slide{position:relative!important;inset:auto!important;opacity:1!important;visibility:visible!important;width:1280px!important;height:720px!important;page-break-after:always;break-after:page;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
        'body.lm-editing [contenteditable]{outline:none!important;background:none!important}' +
        '[data-step]{opacity:1!important}' +
      '}';
    document.head.appendChild(s);
  }

  function setStatus(msg, isErr){ if(statusEl){ statusEl.textContent = msg || ''; statusEl.className = 'lm-status' + (isErr ? ' err' : ''); } }
  function setDirty(v){ dirty = v; if(dotEl) dotEl.className = 'lm-dot' + (v ? ' on' : ''); }
  function btn(label, cls, fn, title){
    var b = document.createElement('button'); b.type='button'; b.innerHTML=label; if(cls) b.className=cls; if(title) b.title=title;
    b.addEventListener('click', fn); return b;
  }
  function sep(){ var s=document.createElement('span'); s.className='lm-sep'; return s; }

  function buildToolbar(){
    var t = document.createElement('div'); t.id = 'lm-tools';
    var lab = document.createElement('span'); lab.className='lm-lab';
    dotEl = document.createElement('span'); dotEl.className='lm-dot';
    lab.appendChild(dotEl); lab.appendChild(document.createTextNode('Edit'));
    t.appendChild(lab);
    t.appendChild(btn('\u2039', '', function(){ if(typeof prev==='function') prev(); }, 'Previous slide'));
    t.appendChild(btn('\u203a', '', function(){ if(typeof next==='function') next(); }, 'Next slide'));
    t.appendChild(sep());
    t.appendChild(btn('<b>B</b>', '', function(){ fmt('bold'); }, 'Bold (Ctrl/Cmd+B)'));
    t.appendChild(btn('<i>I</i>', '', function(){ fmt('italic'); }, 'Italic'));
    t.appendChild(btn('Link', '', addLink, 'Make selected text a link'));
    t.appendChild(btn('Image', '', insertImage, 'Upload an image into the current text area (beta)'));
    t.appendChild(btn('+ Bullet', '', addBullet, 'Add a bullet below the cursor'));
    t.appendChild(btn('\u2212 Bullet', '', removeBullet, 'Delete the current bullet'));
    t.appendChild(btn('\u2191', '', function(){ moveBullet(-1); }, 'Move bullet up'));
    t.appendChild(btn('\u2193', '', function(){ moveBullet(1); }, 'Move bullet down'));
    t.appendChild(sep());
    t.appendChild(btn('\u2601 Save', 'lm-primary', saveGitHub, 'Save to GitHub (Ctrl/Cmd+S)'));
    t.appendChild(btn('\u2681 Export', '', exportFile, 'Download the file instead'));
    t.appendChild(btn('\u2399 PDF', '', function(){ window.print(); }, 'Print or Save as PDF — all slides'));
    t.appendChild(btn('Copy link', '', copyLink, 'Copy a link to this slide'));
    t.appendChild(btn('Reset', '', resetSlide, 'Undo all edits to this slide'));
    t.appendChild(btn('Revert', '', function(){ if(!dirty || confirm('Discard unsaved edits and reload?')){ dirty=false; location.reload(); } }, 'Discard local edits'));
    t.appendChild(btn('Settings', '', function(){ openModal(false); }, 'GitHub connection'));
    t.appendChild(btn('Exit', '', function(){ if(!dirty || confirm('Exit without saving?')){ dirty=false; location.href = location.pathname; } }, 'Leave edit mode'));
    statusEl = document.createElement('span'); statusEl.className='lm-status'; t.appendChild(statusEl);
    document.body.appendChild(t);
  }

  function openModal(focusToken){
    var c = cfg(); var m = document.getElementById('lm-modal'); if(m) m.remove();
    m = document.createElement('div'); m.id = 'lm-modal';
    m.innerHTML =
      '<div class="lm-card">' +
        '<h3>Connect to GitHub</h3>' +
        '<p>Paste a GitHub token so Save can commit for you. It stays only in this browser and is never put into any saved file. ' +
        '<a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener">Create a fine-grained token \u2197</a> ' +
        'with <b>Contents: Read and write</b> on just this one repository.</p>' +
        '<div class="lm-row"><div><label>Owner</label><input id="lm-owner"></div><div><label>Repo</label><input id="lm-repo"></div><div><label>Branch</label><input id="lm-branch"></div></div>' +
        '<label>Token</label><input id="lm-token" type="password" placeholder="github_pat_\u2026">' +
        '<div class="lm-acts"><button type="button" class="cancel" id="lm-cancel">Cancel</button><button type="button" class="ok" id="lm-ok">Save settings</button></div>' +
      '</div>';
    document.body.appendChild(m);
    m.querySelector('#lm-owner').value = c.owner;
    m.querySelector('#lm-repo').value = c.repo;
    m.querySelector('#lm-branch').value = c.branch;
    m.querySelector('#lm-token').value = c.token || '';
    m.addEventListener('click', function(e){ if(e.target === m) m.remove(); });
    m.querySelector('#lm-cancel').addEventListener('click', function(){ m.remove(); });
    m.querySelector('#lm-ok').addEventListener('click', function(){
      var nc = {
        owner:  m.querySelector('#lm-owner').value.trim(),
        repo:   m.querySelector('#lm-repo').value.trim(),
        branch: m.querySelector('#lm-branch').value.trim() || 'main',
        token:  m.querySelector('#lm-token').value.trim()
      };
      saveCfg(nc); m.remove();
      if(nc.token && !enabled){ enable(); setStatus('Connected \u2713 — start editing'); }
      else setStatus(nc.token ? 'Connected \u2713' : 'Saved (no token yet)');
    });
    if(focusToken){ var ti = m.querySelector('#lm-token'); if(ti) ti.focus(); }
  }

  // ---------- activate ----------
  function enable(){
    if(enabled) return; enabled = true;
    css();
    document.body.classList.add('lm-editing');
    document.querySelectorAll(EDITABLE).forEach(function(el){
      el.setAttribute('contenteditable','true'); el.setAttribute('spellcheck','false');
    });
    snapshot();
    buildToolbar();

    // stop deck nav keys while typing; keep formatting keys working
    window.addEventListener('keydown', function(e){
      var el = document.activeElement;
      if(el && el.isContentEditable){
        if(e.key === 'Enter'){ e.preventDefault(); el.blur(); return; }
        if(e.key === 'Escape'){ e.preventDefault(); el.blur(); return; }
        var nav = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown',' ','Spacebar'];
        if(nav.indexOf(e.key) > -1 || e.key.toLowerCase() === 'o'){ e.stopPropagation(); }
      }
    }, true);

    // Ctrl/Cmd+S = save
    window.addEventListener('keydown', function(e){
      if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's'){ e.preventDefault(); saveGitHub(); }
    });

    document.addEventListener('paste', function(e){
      var el = document.activeElement; if(!el || !el.isContentEditable) return;
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });

    document.addEventListener('input', function(e){ if(e.target && e.target.isContentEditable) setDirty(true); });
    window.addEventListener('beforeunload', function(e){ if(dirty){ e.preventDefault(); e.returnValue = ''; } });
  }

  function boot(){ css(); if(hasToken) enable(); else openModal(true); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
