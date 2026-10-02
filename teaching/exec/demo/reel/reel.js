/* The demo's blooper reel (2 Oct 2026): the programme as fully built on 19 Sep (tag
   gt-full-production-2026-09-19), every scene and game the plain pass took out. Every page in
   demo/reel/ loads this file first. It sends each call to the poll server to the same room
   with -reel on the end, apart from the class in demo/ (-demo) and from the real sessions'
   rooms. The name picker here reads reel/go/roster.json; reel/poll-desk/ resets the rooms. */
(function () {
  var P = 'https://gt-poll.rlamare.workers.dev/p/', SUF = '-reel';
  var real = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    if (url.indexOf(P) !== 0) return real(input, init);
    var moved = url.replace(/^(https:\/\/gt-poll\.rlamare\.workers\.dev\/p\/)([a-z0-9-]+)/, function (_, a, id) {
      return a + (id.slice(-SUF.length) === SUF ? id : id + SUF);
    });
    return real(typeof input === 'string' ? moved : new Request(moved, input), init);
  };
})();
