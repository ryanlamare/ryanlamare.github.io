/* The sample session (14 Oct 2026): a copy of the exec gt Module 4 deck, reframed for the
   Strategic Negotiation programme (exec/negotiation/programme/). It has no live room. Every
   call to the poll server fails quietly here, so each board shows its marked DEMO DATA and
   nothing is ever read from or written to a live room. Load this before anything else. */
(function () {
  var API = 'https://gt-poll.rlamare.workers.dev';
  var real = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    if (url.indexOf(API) === 0) return Promise.reject(new TypeError('sample session: no live room'));
    return real(input, init);
  };
})();
