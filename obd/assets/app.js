/* obd: decoder for any OBD-II code, recently viewed, list filter */
(function () {
  'use strict';
  var d = document, S = window.SYG, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var KEY = 'syg-obd-recent';

  var art = $('[data-g]');
  if (art) S.recent(KEY, { u: '/obd/' + art.getAttribute('data-g') + '/', t: art.getAttribute('data-name') });

  /* list filter (several tables on one page) */
  var lq = $('#lq');
  if (lq) {
    var rows = $$('table.filt tbody tr'), cnt = $('#lcount');
    lq.addEventListener('input', function () {
      var v = lq.value.trim().toLowerCase(), n = 0;
      rows.forEach(function (r) { var ok = !v || r.getAttribute('data-q').indexOf(v) > -1; r.hidden = !ok; if (ok) n++; });
      cnt.textContent = v ? (n ? n + ' of ' + rows.length + ' codes shown' : 'Nothing matches. Try the first three characters of the code, such as P03.') : '';
    });
  }

  var q = $('#q'), res = $('#res');
  if (!q || !res) return;
  var DATA = null;
  var AREA = { P: ['Powertrain', 'engine, fuel, ignition, emissions and gearbox'], C: ['Chassis', 'brakes, ABS, steering and suspension'], B: ['Body', 'airbags, seats, windows and climate control'], U: ['Network', 'communication between the car\'s computers'] };
  var PSYS = { '0': 'Fuel and air metering, and auxiliary emission controls', '1': 'Fuel and air metering', '2': 'Fuel and air metering: injector circuits', '3': 'Ignition system or misfire', '4': 'Auxiliary emission controls',
    '5': 'Vehicle speed, idle control and auxiliary inputs', '6': 'Computer and its output circuits', '7': 'Transmission', '8': 'Transmission', '9': 'Transmission', 'A': 'Hybrid propulsion', 'B': 'Hybrid propulsion', 'C': 'Hybrid propulsion' };
  var SEV = { 1: 'Low', 2: 'Medium', 3: 'High' };
  var generic = function (c) {
    var a = c[0], b = c[1];
    if (b === '0') return true;
    if (b === '1') return false;
    if (b === '2') return a === 'P';
    if (a === 'P') return parseInt(c.slice(1), 16) >= 0x3400;   /* P3400 to P3999 generic, P3000 to P3399 maker-specific */
    return a === 'U';
  };
  var show = function () {
    var v = q.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!v) { res.hidden = true; return; }
    res.hidden = false;
    if (/^[0-9][0-9A-F]{3}$/.test(v)) v = 'P' + v;   /* many tools show only the digits */
    if (!/^[PCBU]/.test(v)) { res.innerHTML = '<p>A fault code starts with P, C, B or U. Check the first character on your scan tool.</p>'; return; }
    if (v.length < 5) { res.innerHTML = '<p>Keep typing: a code has five characters, such as ' + v[0] + '0' + (v[0] === 'U' ? '100' : '171') + '.</p>'; return; }
    if (!/^[PCBU][0-3][0-9A-F]{3}$/.test(v)) { res.innerHTML = '<p><b>' + S.esc(v) + '</b> is not a valid OBD-II code. The second character must be 0, 1, 2 or 3, and the last three must be digits or the letters A to F.</p>'; return; }
    if (!DATA) { res.innerHTML = '<p>Loading the code list…</p>'; return; }
    var hit = DATA[v], gen = generic(v), area = AREA[v[0]];
    var html = '<h2>' + v + (hit ? ': ' + S.esc(hit[0]) : '') + '</h2>';
    if (hit) {
      html += '<p><b>How serious: ' + SEV[hit[3]] + '.</b> This code belongs to the group "' + S.esc(hit[2]) + '".</p><div class="acts"><a class="btn" href="/obd/' + hit[1] + '/#' + v.toLowerCase() + '">Read the full explanation</a>' +
        '<button class="btn ghost" type="button" data-copy="' + S.esc(v + ': ' + hit[0] + ' https://fix.shareyourgroup.com/obd/' + hit[1] + '/') + '">Copy</button></div>';
      S.recent(KEY, { u: '/obd/' + hit[1] + '/#' + v.toLowerCase(), t: v + ' ' + hit[2] });
    } else if (!gen) {
      html += '<p><b>This is a maker-specific code.</b> Each car maker gives it its own meaning, so it differs between brands. Look it up in the workshop information for your make, or ask a dealer or specialist. The breakdown below still tells you which area of the car it belongs to.</p>';
    } else {
      html += '<p>This has the form of a generic code, but we do not have a plain-language page for it. It may be a less common code, or a number that is not in use. The breakdown below tells you what its characters mean. Nearby codes in <a href="/obd/codes/">the full list</a> may describe the same system.</p>';
    }
    html += '<ul class="parts"><li><b>' + v[0] + '</b>' + area[0] + ': ' + area[1] + '</li><li><b>' + v[1] + '</b>' + (gen ? 'Generic code: the same meaning on every make' : 'Maker-specific code: meaning set by the car maker') + '</li>';
    if (v[0] === 'P' && gen) html += '<li><b>' + v[2] + '</b>' + (PSYS[v[2]] || 'System group ' + v[2]) + '</li><li><b>' + v.slice(3) + '</b>The exact fault within that system</li>';
    else html += '<li><b>' + v.slice(2) + '</b>The exact fault' + (gen ? '' : ', as defined by the car maker') + '</li>';
    html += '</ul><p class="hint"><b>Have a mechanic confirm.</b> A code points to a system, not to a failed part. <a href="/obd/learn/how-to-read-obd-codes/">How to read a code</a>.</p>';
    res.innerHTML = html;
  };
  q.addEventListener('input', show);
  S.json('/obd/data/codes.json').then(function (j) { DATA = j; show(); }).catch(function () { res.hidden = false; res.innerHTML = '<p>The code list could not be loaded. Check your connection and reload the page.</p>'; });
  var p = new URLSearchParams(location.search).get('code');
  if (p) { q.value = p; show(); }
  var rec = S.recent(KEY);
  if (rec.length) { $('#recent-list').innerHTML = rec.map(function (r) { return '<a href="' + S.esc(r.u) + '">' + S.esc(r.t) + '</a>'; }).join(''); $('#recent').hidden = false; }
})();
