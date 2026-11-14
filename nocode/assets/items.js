/* items.js: page script for the n8n item-shape checker. */
(function () {
  'use strict';
  var d = document, K = window.ItemCore, root = d.querySelector('[data-items]'); if (!root) return;
  var ta = root.querySelector('textarea'), out = root.querySelector('[data-out]'), ex = JSON.parse(d.getElementById('it-ex').textContent), last = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function run() {
    if (!ta.value.trim()) { out.innerHTML = ''; return; }
    var r = K.check(ta.value); last = r;
    var h = '<div class="result"><p class="verdict ' + (r.ok ? 'good' : 'bad') + '"><b>' + (r.ok ? 'This is the shape n8n passes between nodes (' + r.count + ' item' + (r.count === 1 ? '' : 's') + ').' : 'This is not the shape n8n passes between nodes.') + '</b></p>';
    if (r.problems.length) h += '<ul class="checks">' + r.problems.map(function (p) { return '<li class="bad"><span class="tag">Fix</span> ' + esc(p) + '</li>'; }).join('') + '</ul>';
    if (r.notes.length) h += '<ul class="checks">' + r.notes.map(function (p) { return '<li class="note"><span class="tag">Note</span> ' + esc(p) + '</li>'; }).join('') + '</ul>';
    if (r.fixed) h += '<p><button type="button" class="btn sm" data-fix>Wrap it for me</button></p>';
    out.innerHTML = h + '</div>';
  }
  ta.addEventListener('input', run);
  out.addEventListener('click', function (e) { if (e.target.closest('[data-fix]') && last && last.fixed) { ta.value = JSON.stringify(last.fixed, null, 2); run(); } });
  root.querySelectorAll('[data-ex]').forEach(function (b) { b.addEventListener('click', function () { ta.value = ex[b.getAttribute('data-ex')]; run(); }); });
  run();
})();
