/* hdr.js: page scripts. (1) status code finder on the home page, (2) response header checker. Browser only, nothing is sent anywhere. Uses HdrCore. */
(function () {
  'use strict';
  var d = document, H = window.HdrCore;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var fin = d.querySelector('[data-codes]');
  if (fin) {
    var list = JSON.parse(d.getElementById('code-data').textContent), inp = fin.querySelector('input'), out = fin.querySelector('[data-out]');
    var show = function () {
      var q = inp.value.trim().toLowerCase(), r;
      if (!q) r = list.filter(function (c) { return c.pop; });
      else if (/^\d{1,3}$/.test(q)) r = list.filter(function (c) { return String(c.c).indexOf(q) === 0; });
      else { var ws = q.split(/\s+/); r = list.filter(function (c) { var t = (c.n + ' ' + c.k).toLowerCase(); return ws.every(function (w) { return t.indexOf(w.replace(/s$/, '')) > -1; }); }); }
      out.innerHTML = r.length ? '<ul class="grid codes">' + r.map(function (c) { return '<li><a href="' + (c.u || '#') + '"><b>' + c.c + '</b> ' + esc(c.n) + '<small>' + esc(c.s) + '</small></a></li>'; }).join('') + '</ul>' : '<div class="result bad" role="alert"><p>No status code matches. Try a number (404) or words such as redirect, forbidden, timeout.</p></div>';
    };
    inp.addEventListener('input', show); show();
  }
  var chk = d.querySelector('[data-hdr]');
  if (chk) {
    var ta = chk.querySelector('textarea'), res = chk.querySelector('[data-out]'), pages = JSON.parse(d.getElementById('hdr-pages').textContent);
    var run = function () {
      var p = H.parse(ta.value), h = '';
      if (!ta.value.trim()) { res.innerHTML = ''; return; }
      if (p.status) h += '<p class="statusline"><b>' + p.status.code + '</b> ' + esc(p.status.reason) + (pages[p.status.code] ? ' <a href="' + pages[p.status.code] + '">What does ' + p.status.code + ' mean?</a>' : '') + '</p>';
      var cs = H.checks(p);
      if (cs.length) h += '<h2>Checks</h2><ul class="checks">' + cs.map(function (c) { return '<li class="' + c.level + '"><span class="tag">' + ({ bad: 'Fix', note: 'Note', good: 'OK' }[c.level]) + '</span> ' + esc(c.msg) + '</li>'; }).join('') + '</ul>';
      if (p.headers.length) h += '<h2>Headers explained</h2><div class="tbl"><table class="stack"><thead><tr><th>Header</th><th>Value</th><th>What it does</th></tr></thead><tbody>' + p.headers.map(function (x) {
        return '<tr><td data-l="Header"><code>' + esc(x.name) + '</code></td><td data-l="Value"><code>' + esc(x.value) + '</code></td><td data-l="What it does">' + esc(H.INFO[x.lname] || 'Not in our list. Look it up in the IANA field registry or in the documentation of the software that sends it.') + '</td></tr>'; }).join('') + '</tbody></table></div>';
      res.innerHTML = '<div class="result">' + h + '</div>';
    };
    ta.addEventListener('input', run);
    chk.querySelectorAll('[data-sample]').forEach(function (b) { b.addEventListener('click', function () { ta.value = d.getElementById(b.getAttribute('data-sample')).textContent; run(); }); });
    var clr = chk.querySelector('[data-clear]'); if (clr) clr.addEventListener('click', function () { ta.value = ''; run(); ta.focus(); });
    run();
  }
  d.querySelectorAll('pre.code[data-static]').forEach(function (pre) { var b = d.createElement('button'); b.type = 'button'; b.className = 'copy'; b.textContent = 'Copy'; b.addEventListener('click', function () { window.SYG.copy(pre.querySelector('code').textContent, 'Copied'); }); pre.appendChild(b); });
})();
