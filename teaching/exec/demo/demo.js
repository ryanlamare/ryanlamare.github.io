/* The demo: the programme as fully built on 19 Sep 2026 (tag gt-full-production-2026-09-19),
   every scene, avatar and game, to play with for fun. Every page here loads this file first.
   It sends each call to the poll server to the same room with -demo on the end, so games
   played here never touch the rooms exec/gt runs a real session in. Reset them from this
   folder's own Poll Desk (/teaching/exec/demo/poll-desk/), which goes through this file too. */
(function () {
  var P = 'https://gt-poll.rlamare.workers.dev/p/';
  var real = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    if (url.indexOf(P) !== 0) return real(input, init);
    var moved = url.replace(/^(https:\/\/gt-poll\.rlamare\.workers\.dev\/p\/)([a-z0-9-]+)/, function (_, a, id) {
      return a + (/-demo$/.test(id) ? id : id + '-demo');
    });
    return real(typeof input === 'string' ? moved : new Request(moved, input), init);
  };
})();
