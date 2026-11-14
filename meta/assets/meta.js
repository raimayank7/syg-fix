/* meta.js: the three page tools (head tag generator, JSON-LD generator, sitemap generator). Browser only, nothing is sent anywhere. Uses MetaCore. */
(function () {
  'use strict';
  var d = document, M = window.MetaCore, S = window.SYG;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function val(root) { var o = {}; root.querySelectorAll('[data-f]').forEach(function (e) { o[e.getAttribute('data-f')] = e.type === 'checkbox' ? e.checked : e.value; }); return o; }
  function checkList(cs) { return cs.length ? '<ul class="checks">' + cs.map(function (c) { return '<li class="' + c.level + '"><span class="tag">' + ({ bad: 'Fix', note: 'Note', good: 'OK' }[c.level]) + '</span> ' + esc(c.msg) + '</li>'; }).join('') + '</ul>' : ''; }
  function codeBox(t) { return '<pre class="code" data-live><code>' + esc(t) + '</code><button type="button" class="copy">Copy</button></pre>'; }
  function wireCopy(root) { root.querySelectorAll('pre.code .copy').forEach(function (b) { b.addEventListener('click', function () { S.copy(b.parentNode.querySelector('code').textContent, 'Copied'); }); }); }
  var root = d.querySelector('[data-tool]'); if (!root) return;
  var kind = root.getAttribute('data-tool'), out = root.querySelector('[data-out]');
  function run() {
    var o = val(root), h = '';
    if (kind === 'head') {
      var t = M.headTags(o);
      h = '<div class="result"><h2>Your tags</h2><p class="hint">Paste inside the &lt;head&gt; of the page.</p>' + codeBox(t) + '<h2>Checks</h2>' + checkList(M.checks(o)) +
        '<h2>Search result sketch</h2><div class="serp"><div class="serp-url">' + esc(o.canonical || 'https://example.com/page') + '</div><div class="serp-title">' + esc(o.title || '(no title)') + '</div><div class="serp-desc">' + esc(o.description || '(no description: the search engine writes its own)') + '</div></div><p class="hint">A sketch only. Search engines choose and cut the text themselves.</p>' +
        '<p class="counts">Title: ' + (o.title || '').length + ' characters. Description: ' + (o.description || '').length + ' characters.</p></div>';
    } else if (kind === 'ld') {
      var type = root.querySelector('[data-f=type]').value;
      root.querySelectorAll('[data-for]').forEach(function (e) { e.hidden = e.getAttribute('data-for').split(' ').indexOf(type) < 0; });
      var f = {}; root.querySelectorAll('[data-for]:not([hidden]) [data-g]').forEach(function (e) { f[e.getAttribute('data-g')] = e.value; });
      var ld = M.ld(type, f), warn = [];
      if (type === 'LocalBusiness' && (!f.name || !f.street)) warn.push({ level: 'note', msg: 'Google lists address and name as required for local business markup.' });
      if (type === 'Article' && !f.headline) warn.push({ level: 'note', msg: 'Add a headline.' });
      if (type === 'Product' && !f.name) warn.push({ level: 'note', msg: 'A product needs a name.' });
      if (type === 'Product' && f.price && !/^\d+(\.\d+)?$/.test(f.price)) warn.push({ level: 'bad', msg: 'The price must be a plain number such as 1999 or 1999.50, without a currency sign or commas.' });
      [['published', 'datePublished'], ['modified', 'dateModified']].forEach(function (p) { if (f[p[0]] && !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})?)?$/.test(f[p[0]])) warn.push({ level: 'bad', msg: p[1] + ' should look like 2026-11-14 or 2026-11-14T08:00:00+05:30 (ISO 8601).' }); });
      ['url', 'logo', 'authorUrl'].forEach(function (k) { if (f[k] && !M.isUrl(f[k])) warn.push({ level: 'bad', msg: k + ' should be a full address starting with https://.' }); });
      h = '<div class="result"><h2>Your JSON-LD</h2><p class="hint">Paste into the page, in the head or the body.</p>' + codeBox(M.ldText(ld)) + checkList(warn) +
        '<p class="hint">This is valid schema.org markup. Whether a search engine shows anything special for it is up to the search engine. Fill in only what is really on the page.</p></div>';
    } else if (kind === 'sitemap') {
      var s = M.sitemap(o.urls, { lastmod: o.lastmod ? o.lastmod : '' });
      h = '<div class="result"><h2>' + s.count + ' addresses, ' + s.bytes.toLocaleString('en-IN') + ' bytes</h2>' + (s.errors.length ? '<ul class="checks">' + s.errors.slice(0, 12).map(function (e) { return '<li class="bad"><span class="tag">Fix</span> ' + esc(e) + '</li>'; }).join('') + (s.errors.length > 12 ? '<li class="note"><span class="tag">Note</span> ' + (s.errors.length - 12) + ' more.</li>' : '') + '</ul>' : '') + (s.count ? codeBox(s.count > 200 ? s.xml.slice(0, 4000) + '\n... (the download has all ' + s.count + ' addresses)' : s.xml) + '<p><button type="button" class="btn sm" data-dl>Download sitemap.xml</button></p>' : '') + '</div>';
      out.innerHTML = h; wireCopy(out);
      var dl = out.querySelector('[data-dl]'); if (dl) dl.addEventListener('click', function () { var a = d.createElement('a'); a.href = URL.createObjectURL(new Blob([s.xml], { type: 'application/xml' })); a.download = 'sitemap.xml'; d.body.appendChild(a); a.click(); a.remove(); });
      return;
    }
    out.innerHTML = h; wireCopy(out);
  }
  root.addEventListener('input', run); root.addEventListener('change', function (e) { var t = e.target; if (t.tagName === 'SELECT' || /^(checkbox|radio|color|date|file|range)$/.test(t.type)) run(); });
  var smp = root.querySelector('[data-sample]');
  if (smp) smp.addEventListener('click', function () {
    var j = JSON.parse(d.getElementById('sample-data').textContent), scope = root;
    if (j.type) { root.querySelector('[data-f=type]').value = j.type; scope = root.querySelector('[data-for="' + j.type + '"]') || root; }
    Object.keys(j).forEach(function (k) { var e = scope.querySelector('[data-f="' + k + '"],[data-g="' + k + '"]'); if (e && k !== 'type') { if (e.type === 'checkbox') e.checked = !!j[k]; else e.value = j[k]; } });
    run();
  });
  run();
  d.querySelectorAll('pre.code[data-static]').forEach(function (pre) { var b = d.createElement('button'); b.type = 'button'; b.className = 'copy'; b.textContent = 'Copy'; b.addEventListener('click', function () { S.copy(pre.querySelector('code').textContent, 'Copied'); }); pre.appendChild(b); });
})();
