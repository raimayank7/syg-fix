/* rpc.js: the message checker page. Browser only. Uses RpcCore. */
(function () {
  'use strict';
  var d = document, K = window.RpcCore, root = d.querySelector('[data-rpc]'); if (!root) return;
  var ta = root.querySelector('textarea'), out = root.querySelector('[data-out]'), ex = JSON.parse(d.getElementById('rpc-ex').textContent);
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function run() {
    if (!ta.value.trim()) { out.innerHTML = ''; return; }
    var r = K.check(ta.value), h = '<div class="result"><p><b>' + (r.kind ? 'Looks like: ' + esc(r.kind) : 'Not a JSON-RPC message') + '</b></p>';
    if (r.problems.length) h += '<ul class="checks">' + r.problems.map(function (p) { return '<li class="bad"><span class="tag">Fix</span> ' + esc(p) + '</li>'; }).join('') + '</ul>'; else if (r.kind) h += '<p class="verdict good">The shape is right.</p>';
    if (r.notes.length) h += '<ul class="checks">' + r.notes.map(function (p) { return '<li class="note"><span class="tag">Note</span> ' + esc(p) + '</li>'; }).join('') + '</ul>';
    out.innerHTML = h + '</div>';
  }
  ta.addEventListener('input', run);
  root.querySelectorAll('[data-ex]').forEach(function (b) { b.addEventListener('click', function () { ta.value = ex[b.getAttribute('data-ex')]; run(); }); });
  run();
})();
