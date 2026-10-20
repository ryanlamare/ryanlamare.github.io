/* Two ten-minute breaks in every session (Ryan, 20 Oct 2026: his LER 543 habit, so he can pace each session and the room
   knows a short break is never far off). Every deck loads this file; a break slide carries
     <div class="brkclock" data-min="10"><div class="t">10:00</div><button type="button">START 10 MINUTES</button></div>
     <span class="hook" data-step="1" data-stepcall="brkStart"></span>
   so the clock starts on the first press (a clicker can do it) or on the button, and going back resets it. The clock
   is the Session 8 quiz timer's, a size up: red in the last minute, then TIME!. The styles live here so every deck can
   use it, kit or not. */
(function(){
  const css = [
    '.brkfig{position:absolute;left:96px;right:96px;top:214px;display:flex;flex-direction:column;align-items:center;gap:30px}',
    '.brkclock{display:flex;flex-direction:column;align-items:center;gap:16px;border:2.5px solid var(--ink);background:var(--paper-soft,var(--card));padding:24px 56px 28px}',
    '.brkclock .t{font-family:var(--display);font-weight:900;font-size:150px;line-height:.9;color:var(--ink);font-variant-numeric:tabular-nums}',
    '.brkclock .t.low,.brkclock .t.done{color:var(--red)}',
    '.brkclock button{font-family:var(--sans);font-weight:700;font-size:15px;letter-spacing:.08em;background:var(--red);color:var(--paper);border:none;padding:11px 20px;cursor:pointer}',
    '.brkclock button:hover{background:var(--ink)}',
    '.brknext{display:flex;gap:14px;align-items:baseline}',
    '.brknext span{font-weight:700;text-transform:uppercase;letter-spacing:.14em;font-size:15px;color:var(--muted)}',
    '.brknext b{font-weight:700;font-size:26px;color:var(--ink)}'
  ].join('\n');
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  function wire(box){
    const min = +box.dataset.min || 10, full = min * 60, disp = box.querySelector('.t'), btn = box.querySelector('button');
    let t = full, iv = null;
    function reset(){ if (iv) { clearInterval(iv); iv = null; } t = full; disp.textContent = fmt(t); disp.classList.remove('low', 'done'); btn.textContent = 'START ' + min + ' MINUTES'; }
    function start(){
      if (iv || t < full) return;
      btn.textContent = 'RESET';
      iv = setInterval(() => {
        t--; disp.textContent = t > 0 ? fmt(t) : 'TIME!';
        disp.classList.toggle('low', t > 0 && t <= 60);
        if (t <= 0) { clearInterval(iv); iv = null; disp.classList.add('done'); }
      }, 1000);
    }
    btn.addEventListener('click', () => { if (iv || t < full) reset(); else start(); btn.blur(); });
    box._start = start; box._reset = reset; reset();
  }
  document.querySelectorAll('.brkclock').forEach(wire);
  window.brkStart = (el, on) => { const box = el.closest('.slide').querySelector('.brkclock'); if (box) (on ? box._start : box._reset)(); };
})();
