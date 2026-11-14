/* croncore.js: parse cron expressions (Unix/Vixie 5 fields, GitHub Actions, Kubernetes, Quartz 6-7 fields), describe them in English,
   and list the next run times in any IANA time zone. No dependencies. Works in a browser (window.CronCore) and in node (module.exports). */
(function (root) {
  'use strict';
  var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  var MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MACROS = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' };
  var LIMITS = { sec: [0, 59], min: [0, 59], hour: [0, 23], dom: [1, 31], mon: [1, 12], year: [1970, 2099] };

  function names(list, off) { var o = {}; list.forEach(function (n, i) { o[n] = i + off; }); return o; }
  function range(a, b) { var r = []; for (var i = a; i <= b; i++) r.push(i); return r; }

  /* parse one field into {set, star, raw, extra}. kind: sec min hour dom mon dow year; d = dialect */
  function field(raw, kind, d, errs, warns) {
    var lo, hi, nm = null, label = { sec: 'seconds', min: 'minute', hour: 'hour', dom: 'day of month', mon: 'month', dow: 'day of week', year: 'year' }[kind];
    if (kind === 'dow') { if (d === 'quartz') { lo = 1; hi = 7; nm = names(DOW, 1); } else { lo = 0; hi = (d === 'unix') ? 7 : 6; nm = names(DOW, 0); } }
    else if (kind === 'mon') { lo = 1; hi = 12; nm = names(MON, 1); }
    else { lo = LIMITS[kind][0]; hi = LIMITS[kind][1]; }
    var set = {}, out = { raw: raw, set: [], star: false, extra: null, any: false };
    if (raw === '') { errs.push('The ' + label + ' field is empty.'); return out; }
    if (raw === '?') {
      if (d === 'quartz' && (kind === 'dom' || kind === 'dow')) { out.any = true; out.star = true; out.set = range(lo, hi); return out; }
      if (d === 'k8s' && (kind === 'dom' || kind === 'dow')) { raw = '*'; out.raw = '*'; }
      else { errs.push('"?" is not allowed in the ' + label + ' field here. Use * for "every".'); return out; }
    }
    var parts = raw.split(','), allStar = true;
    for (var pi = 0; pi < parts.length; pi++) {
      var p = parts[pi].toUpperCase(), m;
      if (!p) { errs.push('There is an empty item in the list in the ' + label + ' field.'); continue; }
      if (d === 'quartz' && kind === 'dom') {
        if (p === 'L') { out.extra = { last: 0 }; allStar = false; continue; }
        if ((m = /^L-(\d+)$/.exec(p))) { out.extra = { last: +m[1] }; allStar = false; if (+m[1] > 30) errs.push('L-' + m[1] + ' is too large.'); continue; }
        if (p === 'LW') { out.extra = { lastWeekday: true }; allStar = false; continue; }
        if ((m = /^(\d+)W$/.exec(p))) { out.extra = { nearest: +m[1] }; allStar = false; if (+m[1] < 1 || +m[1] > 31) errs.push('Day ' + m[1] + 'W is outside 1 to 31.'); continue; }
      }
      if (d === 'quartz' && kind === 'dow') {
        if (p === 'L') { set[7] = 1; allStar = false; continue; }
        if ((m = /^([1-7A-Z]+)L$/.exec(p))) { var dv = nm[m[1]] || +m[1]; if (!(dv >= 1 && dv <= 7)) errs.push('"' + p + '" is not a valid day of the week.'); else out.extra = { lastDow: dv }; allStar = false; continue; }
        if ((m = /^([1-7A-Z]+)#(\d)$/.exec(p))) { var dv2 = nm[m[1]] || +m[1]; if (!(dv2 >= 1 && dv2 <= 7) || +m[2] < 1 || +m[2] > 5) errs.push('"' + p + '" is not valid. Use day#1 to day#5, for example 6#3.'); else out.extra = { nth: [dv2, +m[2]] }; allStar = false; continue; }
      }
      var step = 1, body = p, sp = p.indexOf('/');
      if (sp >= 0) {
        body = p.slice(0, sp); var st = p.slice(sp + 1);
        if (!/^\d+$/.test(st) || +st < 1) { errs.push('"' + parts[pi] + '": the step after / must be a whole number from 1.'); continue; }
        step = +st;
      }
      var a, b, isStar = false;
      if (body === '*' || (body === '?' && d === 'k8s')) { a = lo; b = (kind === 'dow' && d === 'unix') ? 6 : hi; isStar = true; }
      else if ((m = /^([A-Z0-9]+)-([A-Z0-9]+)$/.exec(body))) { a = val(m[1]); b = val(m[2]); }
      else {
        a = val(body); b = (sp >= 0) ? hi : a;
        if (sp >= 0 && d === 'unix') warns.push('"' + parts[pi] + '": a start with a step but no range is not in the cron(5) manual, and some cron versions reject it. Write ' + body + '-' + hi + '/' + step + ' to be safe.');
      }
      if (isNaN(a) || isNaN(b)) { errs.push('"' + parts[pi] + '" in the ' + label + ' field is not a number or a valid name.'); continue; }
      if (a < lo || a > hi || b < lo || b > hi) { errs.push('"' + parts[pi] + '" is outside ' + lo + ' to ' + hi + ' for the ' + label + ' field' + (kind === 'dow' && d === 'quartz' ? ' (Quartz counts Sunday as 1)' : '') + '.'); continue; }
      var seq;
      if (a > b) {
        if (d === 'quartz') seq = range(a, hi).concat(range(lo, b));
        else { errs.push('"' + parts[pi] + '": the range runs backwards (the first number must be the smaller one).'); continue; }
      } else seq = range(a, b);
      for (var k = 0; k < seq.length; k += step) set[seq[k]] = 1;
      if (!(isStar && step === 1)) allStar = false;
      if (isStar && step > 1) out.stepStar = true;
    }
    if (kind === 'dow' && d !== 'quartz' && set[7]) { set[0] = 1; delete set[7]; }
    out.set = Object.keys(set).map(Number).sort(function (x, y) { return x - y; });
    out.star = allStar && parts.length === 1 && !out.extra;
    return out;

    function val(t) {
      if (/^\d+$/.test(t)) return +t;
      if (nm && nm[t] !== undefined) return nm[t];
      return NaN;
    }
  }

  function parse(expr, dialect) {
    var errs = [], warns = [], s = String(expr || '').trim().replace(/\s+/g, ' ');
    var r = { ok: false, errors: errs, warnings: warns, dialect: dialect, src: s };
    if (!s) { errs.push('Type a cron expression first.'); return r; }
    if (s.charAt(0) === '@') {
      var low = s.toLowerCase();
      if (low === '@reboot') { errs.push('@reboot means "once when the computer starts". It has no times, so there is nothing to list.'); return r; }
      if (dialect === 'quartz') { errs.push('Quartz does not use @ shortcuts. Write all six or seven fields.'); return r; }
      if (dialect === 'gha') { errs.push('The GitHub Actions page does not list @ shortcuts. Write the five fields, for example 0 0 * * * for a daily run.'); return r; }
      if (!MACROS[low]) { errs.push('"' + s + '" is not a known shortcut. Known ones: @hourly, @daily, @midnight, @weekly, @monthly, @yearly, @annually.'); return r; }
      r.macro = s; s = MACROS[low];
    }
    var f = s.split(' ');
    if (dialect === 'quartz') {
      if (f.length < 6 || f.length > 7) { errs.push('A Quartz expression has 6 or 7 fields (seconds, minutes, hours, day of month, month, day of week, and an optional year). You wrote ' + f.length + '.'); return r; }
    } else if (f.length !== 5) {
      errs.push('This kind of cron expression has 5 fields (minute, hour, day of month, month, day of week). You wrote ' + f.length + (f.length === 6 || f.length === 7 ? '. Six or seven fields usually means a Quartz expression: switch the type to Quartz.' : '.')); return r;
    }
    var o = {}, i = 0;
    o.sec = (dialect === 'quartz') ? field(f[i++], 'sec', dialect, errs, warns) : { set: [0], star: false, raw: '0' };
    o.min = field(f[i++], 'min', dialect, errs, warns);
    o.hour = field(f[i++], 'hour', dialect, errs, warns);
    o.dom = field(f[i++], 'dom', dialect, errs, warns);
    o.mon = field(f[i++], 'mon', dialect, errs, warns);
    o.dow = field(f[i++], 'dow', dialect, errs, warns);
    o.year = (dialect === 'quartz' && f[i]) ? field(f[i], 'year', dialect, errs, warns) : { set: null, star: true, raw: '*' };
    if (dialect === 'quartz') {
      if (!o.dom.any && !o.dow.any) errs.push('In Quartz one of the two day fields must be ?. Put ? in the day of month or in the day of the week.');
      if (o.dom.any && o.dow.any) errs.push('Both day fields are ?. Quartz needs a real value in one of them (or * in one and ? in the other).');
    } else if (!o.dom.star && !o.dow.star) {
      warns.push('Both day fields are set. Cron runs the job when EITHER the day of the month OR the day of the week matches, not only when both match.');
    }
    if ((o.dom.stepStar && !o.dow.star) || (o.dow.stepStar && !o.dom.star)) warns.push('A */step in one day field together with a value in the other behaves differently in different cron programs. Avoid it.');
    if (!errs.length && dialect !== 'quartz' && !o.dom.star && o.dow.star && o.mon.set.length) {
      var maxd = { 1: 31, 2: 29, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31 }, ok = false;
      o.mon.set.forEach(function (m) { o.dom.set.forEach(function (d) { if (d <= maxd[m]) ok = true; }); });
      if (!ok) errs.push('None of the months you chose has the day you chose, so this never runs.');
      else if (o.dom.set.every(function (d) { return d > 28; })) warns.push('Days 29 to 31 do not exist in every month, so the job skips the months that are too short.');
    }
    r.f = o; r.ok = errs.length === 0;
    return r;
  }

  /* ---------- time zones ---------- */
  var fmtCache = {};
  function fmt(tz) {
    if (!fmtCache[tz]) fmtCache[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    return fmtCache[tz];
  }
  function wallParts(t, tz) { var p = fmt(tz).formatToParts(new Date(t)), o = {}; p.forEach(function (x) { o[x.type] = +x.value; }); return o; }
  function offsetMs(t, tz) { var o = wallParts(t, tz); return Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second) - Math.floor(t / 1000) * 1000; }
  function wallToInstants(y, mo, d, H, M, S, tz) {
    var t0 = Date.UTC(y, mo - 1, d, H, M, S), offs = {}, res = [];
    [offsetMs(t0 - 86400000, tz), offsetMs(t0 + 86400000, tz), offsetMs(t0, tz)].forEach(function (o) { offs[o] = 1; });
    Object.keys(offs).forEach(function (k) { var o = +k, inst = t0 - o; if (offsetMs(inst, tz) === o) res.push(inst); });
    return res.sort(function (a, b) { return a - b; });
  }
  function dim(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

  function dayMatches(P, y, m, d) {
    var f = P.f, wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay(), last = dim(y, m);
    if (P.dialect === 'quartz') {
      var q = wd + 1, dom = f.dom, dow = f.dow, okDom = true, okDow = true;
      if (!dom.any) {
        var ex = dom.extra, byList = dom.set.indexOf(d) >= 0;
        if (ex && ex.last !== undefined) okDom = d === last - ex.last;
        else if (ex && ex.lastWeekday) { var ld = last, lw = new Date(Date.UTC(y, m - 1, ld)).getUTCDay(); if (lw === 6) ld -= 1; else if (lw === 0) ld -= 2; okDom = d === ld; }
        else if (ex && ex.nearest) {
          var n = ex.nearest;
          if (n > last) okDom = false;
          else { var w2 = new Date(Date.UTC(y, m - 1, n)).getUTCDay(), t = n; if (w2 === 6) t = (n === 1) ? 3 : n - 1; else if (w2 === 0) t = (n === last) ? n - 2 : n + 1; okDom = d === t; }
        } else okDom = byList;
        if (ex && dom.set.length) okDom = okDom || byList;
      }
      if (!dow.any) {
        var ey = dow.extra, listOk = dow.set.indexOf(q) >= 0;
        if (ey && ey.lastDow) okDow = (q === ey.lastDow) && d + 7 > last;
        else if (ey && ey.nth) okDow = (q === ey.nth[0]) && Math.ceil(d / 7) === ey.nth[1];
        else okDow = listOk;
      }
      return okDom && okDow;
    }
    var a = f.dom.set.indexOf(d) >= 0, b = f.dow.set.indexOf(wd) >= 0;
    if (f.dom.star && f.dow.star) return true;
    if (f.dom.star) return b;
    if (f.dow.star) return a;
    return a || b;
  }

  function nextRuns(P, tz, from, count, opts) {
    opts = opts || {};
    var out = [], f = P.f, w = wallParts(from, tz), y = w.year, m = w.month, d = w.day, guard = 0, maxYear = w.year + (opts.years || 40);
    var years = f.year.set;
    while (out.length < count && y <= maxYear && guard++ < 20000) {
      if (f.mon.set.indexOf(m) < 0 || (years && years.indexOf(y) < 0)) { d = dim(y, m); }
      else if (dayMatches(P, y, m, d)) {
        for (var hi = 0; hi < f.hour.set.length; hi++) for (var mi = 0; mi < f.min.set.length; mi++) for (var si = 0; si < f.sec.set.length; si++) {
          var cands = wallToInstants(y, m, d, f.hour.set[hi], f.min.set[mi], f.sec.set[si], tz);
          for (var ci = 0; ci < cands.length; ci++) if (cands[ci] > from) out.push(cands[ci]);
        }
      }
      d++; if (d > dim(y, m)) { d = 1; m++; if (m > 12) { m = 1; y++; } }
    }
    out.sort(function (a2, b2) { return a2 - b2; });
    return out.slice(0, count);
  }

  /* ---------- plain English ---------- */
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function list(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function stepOf(set) { if (set.length < 2) return 0; var s = set[1] - set[0]; for (var i = 1; i < set.length; i++) if (set[i] - set[i - 1] !== s) return 0; return s; }
  function isRun(set) { if (set.length < 2) return false; for (var i = 1; i < set.length; i++) if (set[i] !== set[i - 1] + 1) return false; return true; }
  function fromZeroStep(set, max) { var s = stepOf(set); return (s && set[0] === 0 && set.length === Math.floor(max / s) + 1) ? s : 0; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function hourPhrase(hours) {
    if (hours.length === 24) return 'every hour';
    if (hours.length === 1) return 'during the hour starting at ' + two(hours[0]) + ':00';
    if (isRun(hours)) return 'from ' + two(hours[0]) + ':00 to ' + two(hours[hours.length - 1]) + ':59';
    var st = fromZeroStep(hours, 23);
    if (st) return 'every ' + st + ' hours';
    return 'during the hours ' + list(hours.map(two));
  }
  function describeTime(P) {
    var f = P.f, mins = f.min.set, hours = f.hour.set, secs = f.sec.set, q = P.dialect === 'quartz';
    var minAll = mins.length === 60, hrAll = hours.length === 24, secText = '';
    if (q && !(secs.length === 1 && secs[0] === 0)) {
      if (secs.length === 60) secText = 'every second';
      else { var ss = fromZeroStep(secs, 59); secText = ss ? 'every ' + ss + ' seconds' : 'at second ' + list(secs.map(String)); }
      if (minAll && hrAll) return cap(secText);
    }
    var res, mtext;
    if (minAll && hrAll) res = 'every minute';
    else if (minAll) res = 'every minute, ' + hourPhrase(hours);
    else if (mins.length === 1 && hrAll) res = mins[0] === 0 ? 'every hour, on the hour' : 'at minute ' + mins[0] + ' past every hour';
    else if (hrAll || (mins.length > 1)) {
      var st = fromZeroStep(mins, 59), step2 = stepOf(mins);
      if (st) mtext = 'every ' + st + ' minutes';
      else if (isRun(mins)) mtext = 'every minute from minute ' + mins[0] + ' to minute ' + mins[mins.length - 1];
      else if (step2 && mins.length > 2) mtext = 'every ' + step2 + ' minutes from minute ' + mins[0] + ' to minute ' + mins[mins.length - 1];
      else mtext = 'at minutes ' + list(mins.map(String));
      var wide = st || isRun(mins) || (step2 && mins.length > 2);
      if (hrAll) res = st ? mtext : mtext + (wide ? ' of every hour' : ' past every hour');
      else res = mtext + ', ' + hourPhrase(hours);
    } else if (fromZeroStep(hours, 23)) res = 'every ' + fromZeroStep(hours, 23) + ' hours' + (mins[0] === 0 ? ', on the hour' : ', at minute ' + mins[0]);
    else if (hours.length > 6 && isRun(hours)) res = (mins[0] === 0 ? 'every hour, on the hour' : 'at minute ' + mins[0] + ' past every hour') + ', between ' + two(hours[0]) + ':' + two(mins[0]) + ' and ' + two(hours[hours.length - 1]) + ':' + two(mins[0]);
    else res = 'at ' + list(hours.map(function (h) { return two(h) + ':' + two(mins[0]); }));
    if (secText) res = secText + ', ' + res;
    return cap(res);
  }
  function describeDays(P) {
    var f = P.f, parts = [], q = P.dialect === 'quartz', dom = f.dom, dow = f.dow, mon = f.mon, domTxt = '', dowTxt = '';
    function domText(set, raw) {
      var st = stepOf(set);
      if (set.length === 1) return 'on day ' + set[0] + ' of the month';
      if (st && /\//.test(raw) && set.length > 2) return 'every ' + st + ' days starting on day ' + set[0];
      if (isRun(set)) return 'on days ' + set[0] + ' to ' + set[set.length - 1] + ' of the month';
      return 'on days ' + list(set.map(String)) + ' of the month';
    }
    function dowText(set) {
      var key = set.join();
      if ((!q && key === '1,2,3,4,5') || (q && key === '2,3,4,5,6')) return 'on weekdays (Monday to Friday)';
      if ((!q && key === '0,6') || (q && key === '1,7')) return 'on weekends (Saturday and Sunday)';
      var n = set.map(function (v) { return DAYS_EN[q ? v - 1 : v]; });
      if (isRun(set) && set.length > 2) return 'on ' + n[0] + ' to ' + n[n.length - 1];
      return 'on ' + list(n);
    }
    if (q) {
      if (!dom.any) {
        var ex = dom.extra;
        if (ex && ex.last !== undefined) domTxt = ex.last === 0 ? 'on the last day of the month' : 'on the day ' + ex.last + (ex.last === 1 ? ' day' : ' days') + ' before the last day of the month';
        else if (ex && ex.lastWeekday) domTxt = 'on the last weekday of the month';
        else if (ex && ex.nearest) domTxt = 'on the weekday nearest the ' + ord(ex.nearest) + ' of the month';
        else if (!dom.star) domTxt = domText(dom.set, dom.raw);
      }
      if (!dow.any) {
        var ey = dow.extra;
        if (ey && ey.lastDow) dowTxt = 'on the last ' + DAYS_EN[ey.lastDow - 1] + ' of the month';
        else if (ey && ey.nth) dowTxt = 'on the ' + ord(ey.nth[1]) + ' ' + DAYS_EN[ey.nth[0] - 1] + ' of the month';
        else if (!dow.star) dowTxt = dowText(dow.set);
      }
      parts.push(domTxt || dowTxt);
    } else {
      if (!dom.star) domTxt = domText(dom.set, dom.raw);
      if (!dow.star) dowTxt = dowText(dow.set);
      parts.push(domTxt && dowTxt ? domTxt + ', and also ' + dowTxt : (domTxt || dowTxt));
    }
    if (!mon.star && mon.set.length === 1 && domTxt && dom.set.length === 1 && !dom.extra && !dowTxt) {
      parts = ['on ' + dom.set[0] + ' ' + MONTHS_EN[mon.set[0] - 1]];
    } else if (!mon.star && mon.set.length < 12) {
      var mn = mon.set.map(function (v) { return MONTHS_EN[v - 1]; });
      parts.push(isRun(mon.set) && mon.set.length > 2 ? 'from ' + mn[0] + ' to ' + mn[mn.length - 1] : 'in ' + list(mn));
    }
    if (f.year.set && !f.year.star) parts.push(f.year.set.length > 6 ? 'in the years ' + f.year.set[0] + ' to ' + f.year.set[f.year.set.length - 1] : 'in ' + list(f.year.set.map(String)));
    return parts.filter(Boolean).join(', ');
  }
  function describe(P) {
    if (!P.ok) return '';
    var t = describeTime(P), d = describeDays(P);
    var specific = /^At \d\d:\d\d/.test(t) || /^(Every \d+ hours|Every hour, on the hour), (on the hour|at minute|between)/.test(t) || /between/.test(t);
    if (!d && specific) d = 'every day';
    else if (d && /^(in|from) /.test(d) && specific) d = 'every day ' + d;
    return t + (d ? ', ' + d : '') + '.';
  }

  /* ---------- Unix -> Quartz ---------- */
  function toQuartz(expr) {
    var P = parse(expr, 'unix'); if (!P.ok) return null;
    var s = P.macro ? MACROS[P.macro.toLowerCase()] : P.src, f = s.split(' ');
    function shiftDow(tok) {
      return tok.split(',').map(function (p) {
        var st = '', sp = p.indexOf('/'); if (sp >= 0) { st = p.slice(sp); p = p.slice(0, sp); }
        if (p === '*') return '*' + st;
        function one(x) { if (/^\d+$/.test(x)) { var n = +x; return String(n === 7 ? 1 : n + 1); } return x.toUpperCase(); }
        var r = p.split('-').map(one).join('-');
        if (/^[A-Z0-9]+$/i.test(p) && st) r = r + '-7';
        return r + st;
      }).join(',');
    }
    var dom = f[2], dow = f[4];
    if (P.f.dom.star && P.f.dow.star) { dom = '*'; dow = '?'; }
    else if (P.f.dow.star) { dow = '?'; }
    else if (P.f.dom.star) { dom = '?'; dow = shiftDow(dow); }
    else return { expr: null, why: 'Both day fields are set. Quartz cannot do the "either one" rule of cron, so there is no direct Quartz form.' };
    return { expr: ['0', f[0], f[1], dom, f[3], dow].join(' ') };
  }

  var api = { parse: parse, nextRuns: nextRuns, describe: describe, toQuartz: toQuartz, wallParts: wallParts, MACROS: MACROS, DAYS: DAYS_EN };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CronCore = api;
})(typeof window !== 'undefined' ? window : this);
