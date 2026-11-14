/* errors.js: the paste box (finds the pages whose message matches the text you paste) and the filter on the list pages. Nothing leaves the browser. */
(function () {
  'use strict';
  var d = document;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var KIND = { python: 'Python', js: 'JavaScript', excel: 'Excel', git: 'Git' };

  var paste = d.querySelector('[data-paste]');
  if (paste) {
    var box = paste.querySelector('textarea'), out = paste.querySelector('[data-found]'), data = null, t;
    function load(cb) {
      if (data) return cb();
      fetch('/errors/data/errors.json').then(function (r) { return r.json(); }).then(function (j) { data = j.map(function (e) { var re = null; try { re = new RegExp(e.pat, 'i'); } catch (x) { re = null; } e.re = re; return e; }); cb(); })
        .catch(function () { out.innerHTML = '<p class="note">The list could not be loaded. Check your connection and try again.</p>'; });
    }
    function words(s) { return s.toLowerCase().replace(/[^a-z0-9#!?']+/g, ' ').split(' ').filter(function (w) { return w.length > 2; }); }
    function run() {
      var text = box.value.trim();
      if (text.length < 3) { out.innerHTML = ''; return; }
      load(function () {
        var ws = words(text), res = [];
        data.forEach(function (e) {
          var s = 0;
          if (e.re && e.re.test(text)) s += 10;
          var hay = ' ' + e.tags + ' ' + e.short.toLowerCase() + ' ';
          ws.forEach(function (w) { if (hay.indexOf(' ' + w + ' ') > -1) s += 1.5; else if (w.length > 4 && hay.indexOf(w) > -1) s += 0.5; });
          if (s >= 2) res.push([s, e]);
        });
        res.sort(function (a, b) { return b[0] - a[0]; });
        if (!res.length) { out.innerHTML = '<p class="note">No page matches this text yet. Try copying only the last line of the error, without file names. The guide on searching for error messages shows how.</p>'; return; }
        out.innerHTML = '<h2>Best matches</h2><ul class="grid">' + res.slice(0, 6).map(function (r) {
          var e = r[1]; return '<li><a href="/errors/' + e.s + '/">' + esc(e.short) + '<small>' + esc(KIND[e.kind] || '') + ': ' + esc(e.msg.slice(0, 90)) + '</small></a></li>';
        }).join('') + '</ul>';
      });
    }
    box.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 200); });
    if (location.hash.indexOf('#q=') === 0) { box.value = decodeURIComponent(location.hash.slice(3)); run(); }
  }

  var fb = d.querySelector('[data-filter]');
  if (fb) {
    fb.addEventListener('input', function () {
      var ws = fb.value.trim().toLowerCase().split(/\s+/).filter(Boolean), hit = 0;
      d.querySelectorAll('[data-q]').forEach(function (li) {
        var ok = ws.every(function (w) { return li.getAttribute('data-q').indexOf(w) > -1; });
        li.hidden = !ok; if (ok) hit++;
      });
      var none = d.querySelector('[data-none]'); if (none) none.hidden = hit > 0;
    });
  }
  d.querySelectorAll('pre.code').forEach(function (pre) {
    var b = d.createElement('button'); b.type = 'button'; b.className = 'copy'; b.textContent = 'Copy';
    b.addEventListener('click', function () { window.SYG.copy(pre.querySelector('code').textContent, 'Copied'); });
    pre.appendChild(b);
  });
})();
