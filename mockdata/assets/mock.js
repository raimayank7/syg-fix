/* mock.js: the test data generator page. Browser only. Uses MockCore. */
(function () {
  'use strict';
  var d = document, M = window.MockCore, S = window.SYG, root = d.querySelector('[data-mock]'); if (!root) return;
  function $(s) { return root.querySelector(s); }
  var last = '', ext = 'csv';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function run() {
    var fields = Array.prototype.map.call(root.querySelectorAll('[data-field]:checked'), function (e) { return e.value; }), out = $('[data-out]');
    var n = Math.max(1, Math.min(5000, parseInt($('[data-f=n]').value, 10) || 0)), seed = parseInt($('[data-f=seed]').value, 10) || 1, fmt = $('[data-f=fmt]').value;
    if (!fields.length) { out.innerHTML = '<div class="result bad" role="alert"><p>Tick at least one field.</p></div>'; last = ''; return; }
    var data = M.rows(fields, n, seed); ext = fmt === 'sql' ? 'sql' : fmt;
    last = fmt === 'csv' ? M.csv(fields, data) : fmt === 'json' ? M.json(data) : M.sql(fields, data, $('[data-f=table]').value);
    var shown = last.length > 3000 ? last.slice(0, 3000).replace(/\n[^\n]*$/, '') + '\n... (the download has all ' + n + ' rows)' : last;
    out.innerHTML = '<div class="result"><p><b>' + n + ' rows</b>, seed ' + seed + ' (the same seed always gives the same rows).</p><pre class="code" data-live><code>' + esc(shown) + '</code><button type="button" class="copy">Copy all</button></pre><p><button type="button" class="btn sm" data-dl>Download</button></p></div>';
    out.querySelector('.copy').addEventListener('click', function () { S.copy(last, 'Copied'); });
    out.querySelector('[data-dl]').addEventListener('click', function () { var a = d.createElement('a'); a.href = URL.createObjectURL(new Blob([last], { type: 'text/plain;charset=utf-8' })); a.download = 'test-data.' + ext; d.body.appendChild(a); a.click(); a.remove(); });
  }
  root.addEventListener('input', run); root.addEventListener('change', function (e) { var t = e.target; if (t.tagName === 'SELECT' || /^(checkbox|radio|color|date|file|range)$/.test(t.type)) run(); }); run();
})();
