/* The game-theory day (Sessions 6 to 8, 17 Oct 2026) is built from copies of the gt suite's modules and
   their phone pages. Every one of those pages loads this file first. It sends each call to the poll
   server to the same room with -neg on the end, so the negotiation programme never touches the rooms
   exec/gt runs its own sessions in; with ?room=<x> in a page's address it uses -neg-<x>, a rehearsal
   room. Modelled on exec/demo's demo.js. The attendee list (gt-roster) becomes gt-roster-neg, which the
   poll server keeps like any test roster; when it is empty, the games ask people to type a first name. */
(function () {
  var P = 'https://gt-poll.rlamare.workers.dev/p/';
  var x = (new URLSearchParams(location.search).get('room') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);
  var SUF = '-neg' + (x ? '-' + x : '');
  var real = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    if (url.indexOf(P) !== 0) return real(input, init);
    var moved = url.replace(/^(https:\/\/gt-poll\.rlamare\.workers\.dev\/p\/)([a-z0-9-]+)/, function (_, a, id) {
      return a + (id.slice(-SUF.length) === SUF ? id : (id + SUF).slice(0, 64));
    });
    return real(typeof input === 'string' ? moved : new Request(moved, input), init);
  };
  /* a rehearsal keeps its room when a page links on to another page */
  if (x) document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="/teaching/exec/negotiation/"]');
    if (a && !/[?&]room=/.test(a.getAttribute('href'))) { var h = a.getAttribute('href'); a.setAttribute('href', h + (h.indexOf('?') < 0 ? '?' : '&') + 'room=' + x); }
  }, true);
})();
