/* try.js: the "try it" box of an API page. One request per click, from your browser straight to the API. Nothing goes through ShareYourGroup. */
(function () {
  'use strict';
  var d = document, S = window.SYG, root = d.querySelector('[data-try]'); if (!root) return;
  var tpl = root.getAttribute('data-url'), out = root.querySelector('[data-out]');
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function build() { var u = tpl; root.querySelectorAll('[data-in]').forEach(function (i) { u = u.split('{' + i.getAttribute('data-in') + '}').join(encodeURIComponent(i.value.trim())); }); return u; }
  function show() { root.querySelector('[data-shown]').textContent = build(); }
  root.addEventListener('input', show); show();
  root.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault(); var u = build(), t0 = performance.now(); out.innerHTML = '<p class="hint">Asking...</p>';
    fetch(u).then(function (r) {
      return r.text().then(function (txt) {
        var ms = Math.round(performance.now() - t0), body = txt;
        try { body = JSON.stringify(JSON.parse(txt), null, 2); } catch (x) { /* not JSON */ }
        var cut = body.length > 4000;
        out.innerHTML = '<div class="result"><p><b>HTTP ' + r.status + '</b> in ' + ms + ' ms</p><pre class="code"><code>' + esc(cut ? body.slice(0, 4000) + '\n... (cut)' : body) + '</code></pre>' + (r.ok ? '' : '<p class="hint">The API refused this request or found nothing: read the status code page of this site.</p>') + '</div>';
      });
    }, function (er) { out.innerHTML = '<div class="result bad" role="alert"><p>The request failed: ' + esc(er.message) + '. Possible causes: no connection, the API is down, or it does not allow browser requests from other sites (CORS).</p></div>'; });
  });
  d.querySelectorAll('pre.code[data-static]').forEach(function (pre) { var b = d.createElement('button'); b.type = 'button'; b.className = 'copy'; b.textContent = 'Copy'; b.addEventListener('click', function () { S.copy(pre.querySelector('code').textContent, 'Copied'); }); pre.appendChild(b); });
})();
