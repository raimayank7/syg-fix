/* host.js: the "will my site fit" page. Browser only. Uses HostCore. */
(function () {
  'use strict';
  var d = document, H = window.HostCore, root = d.querySelector('[data-host]'); if (!root) return;
  function num(k) { var v = parseFloat(root.querySelector('[data-f=' + k + ']').value); return isFinite(v) && v >= 0 ? v : 0; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function run() {
    var o = { siteMB: num('siteMB'), files: Math.round(num('files')), bigMB: num('bigMB'), pageKB: num('pageKB'), visits: Math.round(num('visits')), reqPerVisit: num('req'), deploys: Math.round(num('deploys')) }, r = H.evaluate(o);
    function card(name, list) { var ok = H.verdict(list); return '<div class="hostcard ' + (ok ? 'good' : 'bad') + '"><h3>' + name + ': ' + (ok ? 'within the free limits' : 'over a free limit') + '</h3><ul>' + list.map(function (x) { return '<li class="' + (x.note ? 'note' : x.ok ? 'good' : 'bad') + '"><span class="tag">' + (x.note ? 'Note' : x.ok ? 'OK' : 'Over') + '</span> ' + esc(x.what) + '</li>'; }).join('') + '</ul></div>'; }
    root.querySelector('[data-out]').innerHTML = '<div class="result"><p>Traffic: about ' + H.fmt(r.gbMonth) + ' GB a month.</p>' + card('GitHub Pages', r.github) + card('Cloudflare Pages (Free plan)', r.cloudflare) + card('Netlify (Free plan)', r.netlify) + '<p class="hint">Limits as printed on the hosts\' pages on 14 November 2026. They change: check the pages named below before you decide.</p></div>';
  }
  root.addEventListener('input', run); run();
})();
