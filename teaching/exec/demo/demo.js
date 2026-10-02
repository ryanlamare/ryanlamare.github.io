/* The demo's class (2 Oct 2026): the eight modules as RRPF had them, to play with for fun.
   Every page in demo/ (but not demo/reel/) loads this file first. It sends each call to the
   poll server to the same room with -demo on the end, so games played here never touch the
   rooms exec/gt runs a real session in, and it answers the attendee list from names.json
   instead of the server. Reset the rooms from demo/poll-desk/, which goes through here too. */
(function () {
  var P = 'https://gt-poll.rlamare.workers.dev/p/', SUF = '-demo';
  var real = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    if (url.indexOf(P) !== 0) return real(input, init);
    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    if (method === 'GET' && url.split('?')[0] === P + 'gt-roster/roster') {
      return real('/teaching/exec/demo/names.json').then(function (r) { return r.json(); }).then(function (names) {
        return new Response(JSON.stringify({ names: names, total: names.length }), { headers: { 'content-type': 'application/json' } });
      });
    }
    var moved = url.replace(/^(https:\/\/gt-poll\.rlamare\.workers\.dev\/p\/)([a-z0-9-]+)/, function (_, a, id) {
      return a + (id.slice(-SUF.length) === SUF ? id : id + SUF);
    });
    return real(typeof input === 'string' ? moved : new Request(moved, input), init);
  };
})();
