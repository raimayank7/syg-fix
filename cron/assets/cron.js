/* cron.js: the page tool. Reads the cron expression, shows it in plain English, the field by field table and the next run times.
   Nothing typed leaves the browser. Uses CronCore (croncore.js). */
(function () {
  'use strict';
  var d = document, C = window.CronCore, S = window.SYG;
  var root = d.querySelector('[data-cron]'); if (!root || !C) return;
  var inp = root.querySelector('[data-expr]'), dia = root.querySelector('[data-dialect]'), tzs = root.querySelector('[data-tz]'), cnt = root.querySelector('[data-count]');
  var out = root.querySelector('[data-out]'), userPickedDialect = false, lastWritten = '';
  var NAMES = { sec: 'Seconds', min: 'Minute', hour: 'Hour', dom: 'Day of month', mon: 'Month', dow: 'Day of week', year: 'Year' };
  var ZONES = ['UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var localTz = (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } })();
  (function fillZones() {
    var list = [localTz].concat(ZONES.filter(function (z) { return z !== localTz; }));
    tzs.innerHTML = list.map(function (z, i) { return '<option value="' + z + '">' + (i === 0 ? 'Your time zone (' + z + ')' : z) + '</option>'; }).join('');
  })();

  function fmtTime(t, tz) {
    var o = { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
    var s = new Intl.DateTimeFormat('en-GB', o).format(new Date(t));
    var sec = new Date(t).getUTCSeconds(); if (sec) s += ':' + (sec < 10 ? '0' : '') + sec;
    return s;
  }
  function rel(ms) {
    var s = Math.round(ms / 1000);
    if (s < 90) return 'in ' + s + ' seconds';
    var m = Math.round(s / 60); if (m < 90) return 'in ' + m + ' minutes';
    var h = Math.round(m / 60); if (h < 36) return 'in ' + h + ' hours';
    var dd = Math.round(h / 24); if (dd < 90) return 'in ' + dd + ' days';
    var mo = Math.round(dd / 30.4); if (mo < 36) return 'in ' + mo + ' months';
    return 'in about ' + Math.round(dd / 365) + ' years';
  }
  function fieldRows(P) {
    var f = P.f, keys = P.dialect === 'quartz' ? ['sec', 'min', 'hour', 'dom', 'mon', 'dow', 'year'] : ['min', 'hour', 'dom', 'mon', 'dow'];
    return keys.map(function (k) {
      var x = f[k]; if (!x) return '';
      var what;
      if (x.any) what = 'any (the ? means "no specific value")';
      else if (x.extra) what = 'a special rule: ' + esc(x.raw);
      else if (x.set === null || (x.star && k === 'year')) what = 'every value';
      else if (x.star) what = 'every value';
      else what = x.set.map(function (v) { return k === 'dow' ? (P.dialect === 'quartz' ? C.DAYS[v - 1] : C.DAYS[v]).slice(0, 3) : k === 'mon' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][v - 1] : v; }).join(', ');
      if (what.length > 120) what = what.slice(0, 117) + '...';
      return '<tr><th scope="row">' + NAMES[k] + '</th><td data-l="Written"><code>' + esc(x.raw) + '</code></td><td data-l="Means">' + esc(what) + '</td></tr>';
    }).join('');
  }

  function run() {
    var raw = inp.value, n = raw.trim().split(/\s+/).filter(Boolean).length;
    if (!userPickedDialect && raw.trim().charAt(0) !== '@') dia.value = (n >= 6) ? 'quartz' : (dia.value === 'quartz' ? 'unix' : dia.value);
    var P = C.parse(raw, dia.value), h = '';
    if (!P.ok) {
      h = '<div class="result bad" role="alert"><h2>This cron expression has a problem</h2><ul>' + P.errors.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul></div>';
      out.innerHTML = h; return;
    }
    var tz = tzs.value, count = +cnt.value || 10, now = Date.now();
    var runs = C.nextRuns(P, tz, now, count);
    h += '<div class="result"><h2>In plain English</h2><p class="big sentence">' + esc(C.describe(P)) + '</p>';
    if (P.macro) h += '<p class="hint">' + esc(P.macro) + ' is a shortcut for <code>' + esc(C.MACROS[P.macro.toLowerCase()]) + '</code>.</p>';
    P.warnings.forEach(function (w) { h += '<p class="note">' + esc(w) + '</p>'; });
    h += '</div>';
    h += '<h2>The fields, one by one</h2><div class="tbl"><table class="stack"><thead><tr><th>Field</th><th>You wrote</th><th>Which means</th></tr></thead><tbody>' + fieldRows(P) + '</tbody></table></div>';
    h += '<h2>Next ' + count + ' run times <small>(' + esc(tz) + ')</small></h2>';
    if (!runs.length) h += '<p class="note">No run time was found in the next 40 years. Check the day and month fields: they may never meet.</p>';
    else {
      var lines = runs.map(function (t) { return fmtTime(t, tz); });
      h += '<ol class="runs">' + runs.map(function (t, i) { return '<li><span>' + esc(lines[i]) + '</span> <small>' + rel(t - now) + '</small></li>'; }).join('') + '</ol>';
      if (tz !== 'UTC') h += '<p class="hint">In UTC the first run is ' + esc(fmtTime(runs[0], 'UTC')) + '.</p>';
      h += '<p><button class="btn sm ghost" type="button" data-copyruns>Copy these times</button></p>';
      out._lines = lines;
    }
    if (P.dialect !== 'quartz') {
      var q = C.toQuartz(P.src);
      if (q && q.expr) h += '<h2>The same schedule written for Quartz</h2><pre class="code"><code>' + esc(q.expr) + '</code></pre><p class="hint">Quartz has a seconds field in front and uses <code>?</code> in one of the two day fields. Its days of the week count Sunday as 1.</p>';
      else if (q) h += '<h2>Quartz</h2><p class="note">' + esc(q.why) + '</p>';
    }
    out.innerHTML = h;
    out.querySelectorAll('pre.code').forEach(function (pre) {
      var b = d.createElement('button'); b.type = 'button'; b.className = 'copy'; b.textContent = 'Copy';
      b.addEventListener('click', function () { S.copy(pre.querySelector('code').textContent, 'Copied'); });
      pre.appendChild(b);
    });
    var cr = out.querySelector('[data-copyruns]');
    if (cr) cr.addEventListener('click', function () { S.copy(out._lines.join('\n'), 'Run times copied'); });
    lastWritten = raw.trim();
    try { history.replaceState(null, '', '#e=' + encodeURIComponent(raw.trim()) + '&t=' + dia.value); } catch (e) { /* file or sandbox */ }
  }

  function fromHash() {
    var h0 = location.hash.match(/^#e=([^&]*)(?:&t=(\w+))?/);
    if (!h0) return false;
    inp.value = decodeURIComponent(h0[1]);
    if (h0[2] && /^(unix|gha|k8s|quartz)$/.test(h0[2])) { dia.value = h0[2]; userPickedDialect = true; }
    return true;
  }
  var h0 = fromHash();
  if (!h0) { if (root.getAttribute('data-start')) inp.value = root.getAttribute('data-start'); }
  if (root.getAttribute('data-dialect-start') && !h0) { dia.value = root.getAttribute('data-dialect-start'); userPickedDialect = true; }
  window.addEventListener('hashchange', function () { if (fromHash() && decodeURIComponent((location.hash.match(/^#e=([^&]*)/) || [0, ''])[1]) !== lastWritten) run(); });
  inp.addEventListener('input', run);
  dia.addEventListener('change', function () { userPickedDialect = true; run(); });
  tzs.addEventListener('change', run); cnt.addEventListener('change', run);
  root.querySelectorAll('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () { inp.value = b.getAttribute('data-preset'); var dd = b.getAttribute('data-d'); if (dd) { dia.value = dd; userPickedDialect = true; } run(); inp.focus(); });
  });
  run();
})();
