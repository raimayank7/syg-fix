/* icons.js: the icon finder. Loads the Lucide icon list once (/data/icons.json, about 128 KB compressed), searches in the browser, and makes SVG or PNG. Uses IconsCore. */
(function () {
  'use strict';
  var d = document, K = window.IconsCore, S = window.SYG, root = d.querySelector('[data-icons]'); if (!root) return;
  var list = [], shown = 0, PAGE = 96, cur = null, results = [];
  function $(s) { return root.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function opts() { return { size: Math.max(8, Math.min(512, parseInt($('[data-f=size]').value, 10) || 24)), stroke: Math.max(0.25, Math.min(4, parseFloat($('[data-f=stroke]').value) || 2)), color: $('[data-f=usecolor]').checked ? $('[data-f=color]').value : 'currentColor', title: $('[data-f=title]').value.trim() }; }
  function cell(it) { return '<button type="button" class="icon-cell" data-name="' + esc(it[0]) + '" aria-label="' + esc(it[0]) + '" title="' + esc(it[0]) + '">' + K.svg(it[0], it[2], { size: 28 }) + '<span>' + esc(it[0]) + '</span></button>'; }
  function more() { var g = $('[data-grid]'), end = Math.min(results.length, shown + PAGE), h = ''; for (var i = shown; i < end; i++) h += cell(results[i]); g.insertAdjacentHTML('beforeend', h); shown = end; $('[data-more]').hidden = shown >= results.length; $('[data-count]').textContent = results.length + ' icons' + (shown < results.length ? ', showing ' + shown : ''); }
  function find() { results = K.search(list, $('[data-f=q]').value); shown = 0; $('[data-grid]').innerHTML = ''; if (!results.length) { $('[data-count]').textContent = 'No icon matches. Try another word, such as arrow, user, file, camera or heart.'; $('[data-more]').hidden = true; return; } more(); }
  function detail() {
    var box = $('[data-detail]'); if (!cur) { box.hidden = true; return; } box.hidden = false;
    var o = opts(), code = K.svg(cur[0], cur[2], o);
    $('[data-name]').textContent = cur[0]; $('[data-preview]').innerHTML = K.svg(cur[0], cur[2], { size: Math.min(o.size, 128), stroke: o.stroke, color: o.color === 'currentColor' ? 'currentColor' : o.color }); $('[data-code]').textContent = code;
  }
  function download(name, type, data) { var a = d.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: type })); a.download = name; d.body.appendChild(a); a.click(); a.remove(); }
  root.addEventListener('input', function (e) { if (e.target.getAttribute('data-f') === 'q') find(); else detail(); });
  root.addEventListener('change', function (e) { var t = e.target; if (t.type === 'checkbox' || t.type === 'color') detail(); });
  $('[data-grid]').addEventListener('click', function (e) { var b = e.target.closest('.icon-cell'); if (!b) return; cur = list.filter(function (x) { return x[0] === b.getAttribute('data-name'); })[0]; detail(); $('[data-detail]').scrollIntoView({ block: 'nearest' }); });
  $('[data-more]').addEventListener('click', more);
  $('[data-copy]').addEventListener('click', function () { S.copy($('[data-code]').textContent, 'Copied'); });
  $('[data-svg]').addEventListener('click', function () { download(cur[0] + '.svg', 'image/svg+xml', K.svg(cur[0], cur[2], opts())); });
  $('[data-png]').addEventListener('click', function () {
    var o = opts(), col = o.color === 'currentColor' ? '#111111' : o.color, s = K.svg(cur[0], cur[2], { size: o.size, stroke: o.stroke, color: col }), im = new Image(), px = Math.max(o.size, 64);
    im.onload = function () { var c = d.createElement('canvas'); c.width = c.height = px; c.getContext('2d').drawImage(im, 0, 0, px, px); c.toBlob(function (b) { download(cur[0] + '.png', 'image/png', b); }, 'image/png'); };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  });
  fetch('/icons/data/icons.json').then(function (r) { return r.json(); }).then(function (j) { list = j; find(); }, function () { $('[data-count]').textContent = 'The icon list could not be loaded. Check your connection and reload.'; });
})();
