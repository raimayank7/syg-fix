/* mod.js: the cost comparison. Browser only. Uses ModCore; the model list is embedded in the page by build.py. */
(function () {
  'use strict';
  var d = document, K = window.ModCore, root = d.querySelector('[data-mod]'); if (!root) return;
  var models = JSON.parse(d.getElementById('mod-data').textContent);
  function num(k) { var v = parseFloat(root.querySelector('[data-f=' + k + ']').value); return isFinite(v) && v >= 0 ? v : 0; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function usd(x) { return x >= 1000 ? '$' + Math.round(x).toLocaleString('en-US') : x >= 1 ? '$' + x.toFixed(2) : '$' + x.toFixed(4); }
  function run() {
    var today = new Date().toISOString().slice(0, 10), batch = root.querySelector('[data-f=batch]').checked, r = K.rank(models, today, num('i'), num('o'), num('r'), batch);
    root.querySelector('[data-out]').innerHTML = '<div class="result"><div class="tbl"><table class="stack"><thead><tr><th>Model</th><th>Price in / out per million</th><th>One request</th><th>Per month</th></tr></thead><tbody>' + r.map(function (x) {
      return '<tr><td data-l="Model">' + esc(x.name) + '<br><small>' + esc(x.maker) + '</small></td><td data-l="Price">$' + x.price[0] + ' / $' + x.price[1] + (x.until ? '<br><small>' + (x.which === 'now' ? 'until ' + x.until + '; then a higher price: ' + usd(x.laterMonth) + ' a month' : 'price after ' + x.until) + '</small>' : '') + '</td><td data-l="One request">' + usd(x.perRequest) + '</td><td data-l="Per month"><b>' + usd(x.month) + '</b></td></tr>'; }).join('') + '</tbody></table></div><p class="hint">Prices in US dollars as the makers\' pages showed them on 14 November 2026. Today\'s date on your device decides which price applies when a model has a dated price change. ' + (batch ? 'Batch: the 50 percent discount is applied to Anthropic models only (Gemini lists its own batch prices, not included).' : '') + '</p></div>';
  }
  root.addEventListener('input', run); root.addEventListener('change', function (e) { if (e.target.type === 'checkbox') run(); }); run();
})();
