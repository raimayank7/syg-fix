/* tok.js: the token estimator page. Browser only; the text you paste is not sent anywhere. Uses TokCore. */
(function () {
  'use strict';
  var d = document, K = window.TokCore, root = d.querySelector('[data-tok]'); if (!root) return;
  function $(s) { return root.querySelector(s); }
  function num(k) { var v = parseFloat($('[data-f=' + k + ']').value); return isFinite(v) && v >= 0 ? v : 0; }
  function n(x) { return Math.round(x).toLocaleString('en-IN'); }
  function money(x) { return x >= 1 ? x.toFixed(2) : x.toFixed(4); }
  function run() {
    var t = $('[data-f=text]').value, e = K.estimate(t), out = $('[data-out]');
    if (!t.trim()) { out.innerHTML = '<p class="hint">Paste or type some text above.</p>'; return; }
    var win = num('win'), reserve = num('reserve'), pin = num('pin'), pout = num('pout'), outTok = num('outtok');
    var h = '<div class="result"><h2>About ' + n(e.low) + ' to ' + n(e.high) + ' tokens</h2><dl class="facts"><dt>Characters</dt><dd>' + n(e.chars) + '</dd><dt>Words</dt><dd>' + n(e.words) + '</dd><dt>By the 4-characters rule</dt><dd>' + n(e.byChars) + '</dd><dt>By the words rule (60 to 80 words per 100 tokens)</dt><dd>' + n(e.wordsLow) + ' to ' + n(e.wordsHigh) + '</dd></dl>';
    if (e.nonLatin > 0.2) h += '<p class="hint">Much of this text is not in the Latin alphabet. The rules of thumb are for English, and the real count is usually higher for other scripts: use the maker\'s own counter.</p>';
    if (win) { var f = K.fit(e.high, win, reserve); h += '<h3>Context window</h3><p>' + (f.fits ? 'The text should fit: even the high estimate uses ' + Math.round(f.share * 100) + '% of the ' + n(f.free) + ' tokens available.' : 'The text may not fit: the high estimate is more than the ' + n(f.free) + ' tokens available.') + '</p>'; }
    if (pin || pout) { var ci = K.cost(e.low, pin) + K.cost(outTok, pout), ch = K.cost(e.high, pin) + K.cost(outTok, pout); h += '<h3>Cost of one request</h3><p>Between ' + money(ci) + ' and ' + money(ch) + ' in the currency of your prices (' + n(e.low) + ' to ' + n(e.high) + ' input tokens at ' + pin + ' per million, and ' + n(outTok) + ' output tokens at ' + pout + ' per million).</p>'; }
    out.innerHTML = h + '<p class="hint">Estimates only. The maker\'s own counter gives the real number.</p></div>';
  }
  root.addEventListener('input', run); run();
})();
