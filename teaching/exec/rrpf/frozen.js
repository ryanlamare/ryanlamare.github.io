/* The RRPF programme as the room left it (frozen 2 Oct 2026, after day two).
   These decks are a copy of exec/gt taken at the end of the training, so exec/gt can keep
   changing for other clients without changing what RRPF were given. Every page here loads
   this file first. It answers the decks' calls to the poll server (gt-poll) from rooms.json,
   a copy of every room as it stood at the end of day two, and drops every write, so these
   pages never read or touch the live server and a reset there changes nothing here. */
(function () {
  var API = 'https://gt-poll.rlamare.workers.dev';
  var real = window.fetch.bind(window);
  var rooms = null;
  function load() {
    return rooms || (rooms = real('/teaching/exec/rrpf/rooms.json').then(function (r) { return r.json(); }));
  }
  function reply(o, status) {
    return new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json' } });
  }
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    if (url.indexOf(API) !== 0) return real(input, init);
    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    if (method !== 'GET') return Promise.resolve(reply({ ok: true }));
    var m = url.slice(API.length).split('?')[0].match(/^\/p\/([a-z0-9-]{1,64})(\/.+)?$/);
    if (!m) return Promise.resolve(reply({ error: 'not found' }, 404));
    return load().then(function (d) {
      var view = m[2] || '/', room = d.rooms[m[1]] || d.empty;
      var got = view in room ? room[view] : d.empty[view];
      return got === undefined ? reply({ error: 'not found' }, 404) : reply(got);
    });
  };
})();
