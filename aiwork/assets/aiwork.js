/* pcfix / phonefix: the problem finder and a Copy button on every command. Nothing typed is sent anywhere. */
(function () {
  'use strict';
  var d = document, S = window.SYG;
  var fb = d.querySelector('[data-filter]');
  if (fb) {
    var run = function () {
      var words = fb.value.trim().toLowerCase().split(/\s+/).filter(Boolean), hit = 0;
      var all = d.querySelector('[data-all]');
      if (all) all.hidden = !words.length;                 // on the home page the full list appears only while searching
      d.querySelectorAll('[data-q]').forEach(function (li) {
        var q = li.getAttribute('data-q'), ok = words.every(function (w) { return q.indexOf(w) > -1; });
        li.hidden = !ok; if (ok && !(li.closest('[data-all]') && !words.length)) hit++;
      });
      d.querySelectorAll('[data-group]').forEach(function (g) {
        if (g.hasAttribute('data-all') && !words.length) return;
        g.hidden = !g.querySelector('[data-q]:not([hidden])');
      });
      var none = d.querySelector('[data-none]'); if (none) none.hidden = hit > 0;
    };
    fb.addEventListener('input', run);
    if (location.hash.indexOf('#q=') === 0) { fb.value = decodeURIComponent(location.hash.slice(3)); run(); }
  }
  d.querySelectorAll('pre.code').forEach(function (pre) {
    var b = d.createElement('button'); b.type = 'button'; b.className = 'copy'; b.textContent = 'Copy';
    b.addEventListener('click', function () { S.copy(pre.querySelector('code').textContent, 'Command copied'); });
    pre.appendChild(b);
  });
})();
