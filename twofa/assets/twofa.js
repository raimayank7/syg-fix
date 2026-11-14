/* twofa.js: the one-time code tester (TOTP and HOTP) and the address (otpauth) builder. Browser only: the secret is used in this page and never sent anywhere. Uses TwoCore. */
(function () {
  'use strict';
  var d = document, T = window.TwoCore, S = window.SYG, root = d.querySelector('[data-otp]'); if (!root) return;
  function $(s) { return root.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var out = $('[data-out]'), timer = null, seq = 0;
  function val(k) { var e = $('[data-f=' + k + ']'); return e ? e.value : ''; }
  function fmt(c) { return c.length === 6 ? c.slice(0, 3) + ' ' + c.slice(3) : c.length === 8 ? c.slice(0, 4) + ' ' + c.slice(4) : c; }
  function run() {
    var my = ++seq, type = val('type'), digits = +val('digits'), alg = val('alg'), step = Math.max(1, +val('period') || 30), key, sec = val('secret');
    $('[data-for-totp]').hidden = type !== 'totp'; $('[data-for-hotp]').hidden = type !== 'hotp';
    if (!sec.trim()) { out.innerHTML = '<p class="hint">Type a secret in Base32 (letters A to Z and digits 2 to 7), or press "Make a random secret".</p>'; return Promise.resolve(); }
    try { key = T.b32decode(sec); } catch (e) { out.innerHTML = '<div class="result bad" role="alert"><p>' + esc(e.message) + '</p></div>'; return Promise.resolve(); }
    var warn = key.length < 16 ? '<p class="hint">This secret is only ' + key.length * 8 + ' bits. RFC 4226 requires at least 128 bits and recommends 160 bits (32 Base32 characters).</p>' : '';
    if (type === 'hotp') {
      var c = Math.max(0, Math.floor(+val('counter') || 0));
      return Promise.all([T.hotp(key, c, digits, alg), T.hotp(key, c + 1, digits, alg)]).then(function (r) { if (my !== seq) return; out.innerHTML = '<div class="result"><p class="otp-big">' + fmt(r[0]) + '</p><p>Code for counter ' + c + '. The next one (counter ' + (c + 1) + ') is <code>' + r[1] + '</code>.</p>' + warn + '</div>'; });
    }
    var now = Math.floor(Date.now() / 1000) + (+val('offset') || 0), left = step - (now % step);
    return Promise.all([T.totp(key, now - step, step, digits, alg), T.totp(key, now, step, digits, alg), T.totp(key, now + step, step, digits, alg)]).then(function (r) {
      if (my !== seq) return;
      out.innerHTML = '<div class="result"><p class="otp-big" data-code>' + fmt(r[1]) + '</p><p>Valid for another <b data-left>' + left + '</b> seconds (step ' + Math.floor(now / step) + ', ' + step + ' s).</p><div class="bar"><i style="width:' + Math.round(left / step * 100) + '%"></i></div>' +
        '<dl class="facts"><dt>Previous code</dt><dd><code>' + r[0] + '</code></dd><dt>Next code</dt><dd><code>' + r[2] + '</code></dd></dl><p class="hint">A server that allows one step of drift (RFC 6238 recommends at most one) accepts the previous, current and next codes.</p>' + warn +
        '<p><button type="button" class="btn sm ghost" data-copy="' + r[1] + '">Copy the code</button></p></div>';
      var b = out.querySelector('[data-copy]'); if (b) b.addEventListener('click', function () { S.copy(b.getAttribute('data-copy'), 'Copied'); });
    });
  }
  function schedule() { clearInterval(timer); timer = setInterval(function () { if (val('type') === 'totp' && val('secret').trim()) run(); }, 1000); }
  function uriOut() {
    var o = { type: val('type'), issuer: val('issuer'), account: val('account'), secret: val('secret'), alg: val('alg'), digits: val('digits'), period: val('period'), counter: val('counter') };
    var u = $('[data-uri]'); u.textContent = o.secret.trim() ? T.uri(o) : '(type a secret first)';
  }
  root.addEventListener('input', function () { run(); uriOut(); }); root.addEventListener('change', function (e) { var t = e.target; if (t.tagName === 'SELECT' || /^(checkbox|radio|color|date|file|range)$/.test(t.type)) { run(); uriOut(); } });
  var rb = $('[data-random]'); if (rb) rb.addEventListener('click', function () { $('[data-f=secret]').value = T.randomSecret(20); run(); uriOut(); });
  var cp = $('[data-copyuri]'); if (cp) cp.addEventListener('click', function () { S.copy($('[data-uri]').textContent, 'Copied'); });
  var rd = $('[data-readuri]'); if (rd) rd.addEventListener('click', function () {
    var m = $('[data-f=uriin]'), msg = $('[data-urimsg]');
    try { var p = T.parseUri(m.value); $('[data-f=type]').value = p.type; $('[data-f=issuer]').value = p.issuer; $('[data-f=account]').value = p.account; $('[data-f=secret]').value = p.secret; $('[data-f=alg]').value = p.alg; $('[data-f=digits]').value = String(p.digits); $('[data-f=period]').value = String(p.period); $('[data-f=counter]').value = String(p.counter); msg.textContent = 'Read.'; run(); uriOut(); }
    catch (e) { msg.textContent = e.message; }
  });
  var ex = $('[data-example]'); if (ex) ex.addEventListener('click', function () { $('[data-f=secret]').value = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; $('[data-f=type]').value = 'totp'; $('[data-f=alg]').value = 'SHA1'; $('[data-f=digits]').value = '6'; $('[data-f=offset]').value = '0'; run(); uriOut(); });
  run(); uriOut(); schedule();
  d.querySelectorAll('pre.code[data-static]').forEach(function (pre) { var b = d.createElement('button'); b.type = 'button'; b.className = 'copy'; b.textContent = 'Copy'; b.addEventListener('click', function () { S.copy(pre.querySelector('code').textContent, 'Copied'); }); pre.appendChild(b); });
})();
