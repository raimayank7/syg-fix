/* calc.js: the page calculators (epoch converter, live Unix clock, byte converter, download time, storage, data rate, server time zones). Browser only, nothing sent anywhere. Uses TimeCore. */
(function () {
  'use strict';
  var d = document, T = window.TimeCore, S = window.SYG;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function row(k, v) { return '<dt>' + esc(k) + '</dt><dd>' + v + '</dd>'; }
  function err(m) { return '<div class="result bad" role="alert"><p>' + esc(m) + '</p></div>'; }
  var ZONES = ['UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'];
  var local = (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } })();
  function copy(t) { return ' <button type="button" class="btn sm ghost" data-c="' + esc(t) + '">Copy</button>'; }
  function rel(ms) {
    var s = Math.round((ms - Date.now()) / 1000), a = Math.abs(s), u = a < 90 ? [a, 'second'] : a < 5400 ? [Math.round(a / 60), 'minute'] : a < 129600 ? [Math.round(a / 3600), 'hour'] : a < 5184000 ? [Math.round(a / 86400), 'day'] : a < 63072000 ? [Math.round(a / 2629800), 'month'] : [Math.round(a / 31557600), 'year'];
    return s === 0 ? 'now' : (s > 0 ? 'in ' : '') + u[0] + ' ' + u[1] + (u[0] > 1 ? 's' : '') + (s < 0 ? ' ago' : '');
  }
  function epochOut(ms, tz, note) {
    if (!isFinite(ms) || Math.abs(ms) > 8.64e15) return err('That time is outside the range this tool can show.');
    var p = T.parts(ms, tz), iso = new Date(ms).toISOString(), sec = Math.floor(ms / 1000);
    var h = '<div class="result"><h2>' + esc(iso) + '</h2>' + (note ? '<p class="note">' + esc(note) + '</p>' : '') + '<dl class="facts">';
    h += row('Seconds', '<code>' + sec + '</code>' + copy(String(sec)));
    h += row('Milliseconds', '<code>' + Math.round(ms) + '</code>' + copy(String(Math.round(ms))));
    h += row('UTC', esc(iso));
    h += row(tz, esc(T.wall(ms, tz)) + ' ' + esc(p.zone) + ' <small>(' + esc(T.offsetText(T.offsetMin(ms, tz))) + ')</small>');
    h += row('Weekday (in ' + tz + ')', esc(p.weekday));
    h += row('Relative to now', esc(rel(ms)));
    return h + '</dl></div>';
  }
  var CALC = {
    epoch: function (f) {
      var t = (f.a || '').trim(), tz = f.tz || 'UTC'; if (!t) return '';
      if (/^-?\d+(\.\d+)?$/.test(t)) {
        var n = Number(t), u = T.unitOf(n), ms = T.toMs(n, u);
        return epochOut(ms, tz, 'Read as ' + ({ s: 'seconds', ms: 'milliseconds', us: 'microseconds', ns: 'nanoseconds' }[u]) + ' since 1970-01-01 00:00:00 UTC (the unit is guessed from the number of digits).');
      }
      var r = T.parseDate(t, tz);
      if (!r) return err('Type a number of seconds (1700000000), milliseconds (1700000000000) or a date such as 2026-11-13 10:20, 2026-11-13T10:20:00Z or 2026-11-13T10:20:00+05:30.');
      if (!r.ms.length) return err('That wall-clock time does not exist in ' + tz + ': the clocks were moved forward over it.');
      var note = r.zoned ? 'The date had its own time zone, so it was used as written.' : 'No time zone in the text, so it was read as ' + tz + ' time.';
      if (r.ms.length > 1) note += ' This time happened twice when the clocks went back; the first one is shown, the second is ' + Math.floor(r.ms[1] / 1000) + '.';
      return epochOut(r.ms[0], tz, note);
    },
    bytes: function (f) {
      var v = parseFloat(f.a); if (!isFinite(v) || v < 0) return err('Type a number, for example 1.5.'); var b = T.toBytes(v, f.u);
      var rows = ['bit', 'B', 'KB', 'MB', 'GB', 'TB', 'PB', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'].map(function (u) { return '<tr><td data-l="Unit">' + u + '</td><td data-l="Value"><code>' + esc(T.sig(b / T.BYTE[u])) + '</code></td></tr>'; });
      return '<div class="result"><h2>' + esc(T.sig(v)) + ' ' + esc(f.u) + '</h2><div class="tbl"><table class="stack"><thead><tr><th>Unit</th><th>Value</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div><p class="hint">KB, MB, GB use powers of 1000 (SI). KiB, MiB, GiB use powers of 1024 (IEC).</p></div>';
    },
    rate: function (f) {
      var v = parseFloat(f.a); if (!isFinite(v) || v < 0) return err('Type a number, for example 100.'); var bps = v * T.RATE[f.u];
      var rows = Object.keys(T.RATE).map(function (u) { return '<tr><td data-l="Unit">' + u + '</td><td data-l="Value"><code>' + esc(T.sig(bps / T.RATE[u])) + '</code></td></tr>'; });
      return '<div class="result"><h2>' + esc(T.sig(v)) + ' ' + esc(f.u) + '</h2><div class="tbl"><table class="stack"><thead><tr><th>Unit</th><th>Value</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div><p class="hint">Provider speeds are in bits per second (Mbit/s). Download programs usually show bytes per second (MB/s). Divide Mbit/s by 8 for MB/s.</p></div>';
    },
    download: function (f) {
      var size = parseFloat(f.a), sp = parseFloat(f.b), eff = parseFloat(f.e) / 100; if (!(size > 0) || !(sp > 0)) return err('Type a file size and a speed above zero.');
      var bits = T.toBytes(size, f.u) * 8, rate = sp * T.RATE[f.v] * eff, sec = bits / rate;
      return '<div class="result"><h2>' + esc(T.duration(sec)) + '</h2><dl class="facts">' + row('File size', esc(T.sig(size)) + ' ' + esc(f.u) + ' = ' + esc(T.sig(bits / 8e6)) + ' MB') + row('Connection', esc(T.sig(sp)) + ' ' + esc(f.v)) + row('Usable share of the speed', esc(f.e) + '%') + row('Effective speed', esc(T.sig(rate / 8e6)) + ' MB/s') + row('Seconds', esc(T.sig(sec))) + '</dl><p class="hint">Real downloads are slower than the line speed because of protocol overhead, the server and Wi-Fi. 80 to 90 percent is a common allowance.</p></div>';
    },
    storage: function (f) {
      var cap = parseFloat(f.a), fs = parseFloat(f.b); if (!(cap > 0) || !(fs > 0)) return err('Type a capacity and a file size above zero.');
      var cb = T.toBytes(cap, f.u), fb = T.toBytes(fs, f.v), n = Math.floor(cb / fb);
      return '<div class="result"><h2>' + n.toLocaleString('en-IN') + ' files</h2><p>' + esc(T.sig(cap)) + ' ' + esc(f.u) + ' holds about ' + n.toLocaleString('en-IN') + ' files of ' + esc(T.sig(fs)) + ' ' + esc(f.v) + ' each.</p><p class="hint">A drive that is sold as "1 TB" holds 10<sup>12</sup> bytes, which your computer shows as about 931 GiB (it counts in powers of 1024). The formatted capacity is also a little smaller. Leave room for the system and for growth.</p></div>';
    },
    zones: function (f) {
      var t = (f.a || '').trim(), tz = f.tz || 'UTC'; if (!t) return '';
      var r = T.parseDate(t, tz); if (!r) return err('Type a date and time such as 2026-11-13 09:00.'); if (!r.ms.length) return err('That time does not exist in ' + tz + ' (clocks moved forward).');
      var ms = r.ms[0], zs = [local].concat(ZONES.filter(function (z) { return z !== local; }));
      return '<div class="result"><h2>' + esc(new Date(ms).toISOString()) + '</h2><div class="tbl"><table class="stack"><thead><tr><th>Zone</th><th>Local time</th><th>Offset</th></tr></thead><tbody>' + zs.map(function (z, i) { var p = T.parts(ms, z); return '<tr><td data-l="Zone">' + esc(z) + (i === 0 ? ' (your device)' : '') + '</td><td data-l="Local time">' + esc(T.wall(ms, z)) + ' ' + esc(p.zone) + ' <small>' + esc(p.weekday.slice(0, 3)) + '</small></td><td data-l="Offset">' + esc(T.offsetText(T.offsetMin(ms, z))) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    }
  };

  function fill(sel) { if (!sel) return; var zs = [local].concat(ZONES.filter(function (z) { return z !== local; })); sel.innerHTML = zs.map(function (z, i) { return '<option value="' + z + '">' + (i === 0 ? 'Your time zone (' + z + ')' : z) + '</option>'; }).join(''); }
  d.querySelectorAll('[data-calc]').forEach(function (root) {
    var kind = root.getAttribute('data-calc'), out = root.querySelector('[data-out]');
    fill(root.querySelector('[data-f=tz]'));
    function vals() { var o = {}; root.querySelectorAll('[data-f]').forEach(function (e) { o[e.getAttribute('data-f')] = e.value; }); return o; }
    function run() {
      out.innerHTML = CALC[kind](vals());
      out.querySelectorAll('[data-c]').forEach(function (b) { b.addEventListener('click', function () { S.copy(b.getAttribute('data-c'), 'Copied'); }); });
      var a = root.querySelector('[data-f=a]'); try { if (a && (kind === 'epoch' || kind === 'zones')) history.replaceState(null, '', '#q=' + encodeURIComponent(a.value)); } catch (e) { /* ignore */ }
    }
    var m = location.hash.match(/^#q=(.*)/); var a0 = root.querySelector('[data-f=a]'); if (m && a0) a0.value = decodeURIComponent(m[1]);
    root.addEventListener('input', run); root.addEventListener('change', function (e) { var t = e.target; if (t.tagName === 'SELECT' || /^(checkbox|radio|color|date|file|range)$/.test(t.type)) run(); });
    root.querySelectorAll('[data-preset]').forEach(function (b) { b.addEventListener('click', function () { a0.value = b.getAttribute('data-preset'); run(); }); });
    var now = root.querySelector('[data-now]'); if (now) now.addEventListener('click', function () { a0.value = String(Math.floor(Date.now() / 1000)); run(); });
    run();
  });
  /* live clock */
  var live = d.querySelector('[data-live]');
  if (live) {
    var el = live.querySelector('[data-sec]'), iso = live.querySelector('[data-iso]'), loc = live.querySelector('[data-loc]'), ms = live.querySelector('[data-ms]');
    fill(live.querySelector('[data-f=tz]'));
    var tzs = live.querySelector('[data-f=tz]');
    var tick = function () { var n = Date.now(); el.textContent = Math.floor(n / 1000); ms.textContent = n; iso.textContent = new Date(n).toISOString(); var z = tzs.value; loc.textContent = T.wall(n, z) + ' ' + T.parts(n, z).zone + ' (' + T.offsetText(T.offsetMin(n, z)) + ')'; };
    tick(); setInterval(tick, 1000);
  }
  d.querySelectorAll('pre.code[data-static]').forEach(function (pre) { var b = d.createElement('button'); b.type = 'button'; b.className = 'copy'; b.textContent = 'Copy'; b.addEventListener('click', function () { S.copy(pre.querySelector('code').textContent, 'Copied'); }); pre.appendChild(b); });
})();
