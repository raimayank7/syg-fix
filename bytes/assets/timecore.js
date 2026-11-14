/* timecore.js: Unix time and time zone maths (Intl based) and data size / speed conversions. Browser: window.TimeCore. Node: module.exports.
   Tested against Python (datetime, zoneinfo, decimal) by test_time.py. */
(function (root) {
  'use strict';
  var fmts = {};
  function fmt(tz) {
    if (!fmts[tz]) fmts[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short' });
    return fmts[tz];
  }
  function parts(ms, tz) {
    var o = {}; fmt(tz).formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; });
    return { year: +o.year, month: +o.month, day: +o.day, hour: +o.hour, minute: +o.minute, second: +o.second, weekday: o.weekday, zone: o.timeZoneName };
  }
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function wall(ms, tz) { var p = parts(ms, tz); return p.year + '-' + two(p.month) + '-' + two(p.day) + ' ' + two(p.hour) + ':' + two(p.minute) + ':' + two(p.second); }
  function offsetMin(ms, tz) { var p = parts(ms, tz); return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000) / 60000); }
  function offsetText(min) { var s = min < 0 ? '-' : '+', a = Math.abs(min); return 'UTC' + s + two(Math.floor(a / 60)) + ':' + two(a % 60); }
  /* all instants that show the given wall-clock time in tz (0 in a clock-change gap, 2 in the repeated hour) */
  function wallToMs(y, mo, d, H, M, S, ms, tz) {
    var t0 = Date.UTC(y, mo - 1, d, H, M, S, ms), offs = {}, res = [];
    [offsetMin(t0 - 86400000, tz), offsetMin(t0 + 86400000, tz), offsetMin(t0, tz)].forEach(function (o) { offs[o] = 1; });
    Object.keys(offs).forEach(function (k) { var inst = t0 - (+k) * 60000; if (offsetMin(inst, tz) === +k) res.push(inst); });
    return res.sort(function (a, b) { return a - b; });
  }
  /* "2026-11-13", "2026-11-13 10:20", "2026-11-13T10:20:30.5Z", "...+05:30"; returns {ms:[...], zoned:bool} or null */
  function parseDate(text, tz) {
    var m = /^\s*(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3})\d*)?)?)?\s*(Z|[+-]\d{2}:?\d{2})?\s*$/i.exec(text);
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3], H = +(m[4] || 0), M = +(m[5] || 0), S = +(m[6] || 0), f = m[7] ? +((m[7] + '00').slice(0, 3)) : 0;
    if (mo < 1 || mo > 12 || d < 1 || H > 23 || M > 59 || S > 59) return null;
    var dim = new Date(Date.UTC(y, mo, 0)).getUTCDate(); if (d > dim) return null;
    if (m[8]) {
      var z = m[8].toUpperCase(), off = 0;
      if (z !== 'Z') { var q = /^([+-])(\d{2}):?(\d{2})$/.exec(z); off = (q[1] === '-' ? -1 : 1) * (+q[2] * 60 + +q[3]); }
      return { ms: [Date.UTC(y, mo - 1, d, H, M, S, f) - off * 60000], zoned: true };
    }
    return { ms: wallToMs(y, mo, d, H, M, S, f, tz), zoned: false };
  }
  function unitOf(n) { var a = Math.abs(n); return a < 1e11 ? 's' : a < 1e14 ? 'ms' : a < 1e17 ? 'us' : 'ns'; }
  function toMs(n, unit) { return unit === 's' ? n * 1000 : unit === 'ms' ? n : unit === 'us' ? n / 1000 : n / 1e6; }

  var BYTE = { 'bit': 1 / 8, 'B': 1, 'KB': 1e3, 'MB': 1e6, 'GB': 1e9, 'TB': 1e12, 'PB': 1e15, 'KiB': 1024, 'MiB': Math.pow(1024, 2), 'GiB': Math.pow(1024, 3), 'TiB': Math.pow(1024, 4), 'PiB': Math.pow(1024, 5) };
  var RATE = { 'bit/s': 1, 'kbit/s': 1e3, 'Mbit/s': 1e6, 'Gbit/s': 1e9, 'B/s': 8, 'KB/s': 8e3, 'MB/s': 8e6, 'GB/s': 8e9, 'KiB/s': 8 * 1024, 'MiB/s': 8 * Math.pow(1024, 2), 'GiB/s': 8 * Math.pow(1024, 3) };
  function toBytes(v, u) { return v * BYTE[u]; }
  function sig(x) { if (x === 0) return '0'; var a = Math.abs(x); if (a >= 1e15 || a < 1e-4) return x.toExponential(4); var s = x.toPrecision(7); return s.indexOf('e') > -1 ? String(+s) : String(+s); }
  function duration(sec) {
    if (!isFinite(sec)) return 'never'; if (sec < 1) return (sec * 1000).toFixed(1) + ' ms'; if (sec < 60) return sec.toFixed(1) + ' seconds';
    var s = Math.round(sec), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), r = s % 60, o = [];
    if (d) o.push(d + ' day' + (d > 1 ? 's' : '')); if (h) o.push(h + ' hour' + (h > 1 ? 's' : '')); if (m) o.push(m + ' minute' + (m > 1 ? 's' : '')); if (!d && !h && r) o.push(r + ' second' + (r > 1 ? 's' : ''));
    return o.join(' ');
  }
  var api = { parts: parts, wall: wall, offsetMin: offsetMin, offsetText: offsetText, wallToMs: wallToMs, parseDate: parseDate, unitOf: unitOf, toMs: toMs, BYTE: BYTE, RATE: RATE, toBytes: toBytes, sig: sig, duration: duration };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TimeCore = api;
})(typeof window !== 'undefined' ? window : this);
