/* gitcheat.js: the "what happened to me?" finder. Words typed are matched against the situations (title, question, commands, extra words); best matches first. Browser only. */
(function () {
  'use strict';
  var d = document, root = d.querySelector('[data-git]'); if (!root) return;
  var data = JSON.parse(d.getElementById('git-data').textContent), inp = root.querySelector('input'), out = root.querySelector('[data-out]');
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function words(s) { return (s.toLowerCase().match(/[a-z0-9~@{}.-]+/g) || []).filter(function (w) { return w.length > 1 && ['the', 'my', 'is', 'to', 'in', 'of', 'and', 'for', 'how', 'do', 'can', 'did', 'was', 'git', 'what', 'it', 'on', 'that', 'this', 'with'].indexOf(w) < 0; }); }
  function stem(w) { return w.replace(/(ing|ed|es|s)$/, ''); }
  function score(item, ws) {
    var h = (item.h + ' ' + item.q).toLowerCase(), c = (item.cmds + ' ' + item.k).toLowerCase(), n = 0;
    ws.forEach(function (w) { var t = stem(w); if (h.indexOf(t) > -1) n += 3; else if (c.indexOf(t) > -1) n += 2; });
    return n;
  }
  function show() {
    var ws = words(inp.value), list;
    if (!ws.length) list = data.slice(0, 6).map(function (x) { return { x: x, n: 0 }; });
    else list = data.map(function (x) { return { x: x, n: score(x, ws) }; }).filter(function (r) { return r.n > 0; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 6);
    if (!list.length) { out.innerHTML = '<div class="result bad" role="alert"><p>No page matches those words. Try other words, such as undo, commit, branch, stash, merge or conflict, or see <a href="/gitcheat/guides/">all pages</a>.</p></div>'; return; }
    out.innerHTML = '<ul class="found">' + list.map(function (r) {
      return '<li><a class="ftitle" href="/gitcheat/' + r.x.s + '/">' + esc(r.x.h) + '</a><p>' + esc(r.x.q) + '</p><pre class="code" data-static><code>' + esc(r.x.cmds) + '</code></pre></li>';
    }).join('') + '</ul>';
    out.querySelectorAll('pre.code').forEach(function (pre) { var b = d.createElement('button'); b.type = 'button'; b.className = 'copy'; b.textContent = 'Copy'; b.addEventListener('click', function () { window.SYG.copy(pre.querySelector('code').textContent, 'Copied'); }); pre.appendChild(b); });
  }
  inp.addEventListener('input', show); show();
})();
