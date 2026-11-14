/* circui.js: the calculator pages. Browser only. Uses Circ. */
(function () {
  'use strict';
  var d = document, K = window.Circ, S = window.SYG;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function err(m) { return '<div class="result bad" role="alert"><p>' + esc(m) + '</p></div>'; }
  function row(k, v) { return '<dt>' + esc(k) + '</dt><dd>' + v + '</dd>'; }
  var COL = { black: '#111', brown: '#7b4a22', red: '#d1242f', orange: '#e8710a', yellow: '#f2c40c', green: '#2e9d4f', blue: '#2563eb', violet: '#7c3aed', grey: '#8a8f98', white: '#f5f5f5', gold: '#c9a227', silver: '#b4b8c0' };
  function swatch(c) { return '<span class="band" style="background:' + COL[c] + '" title="' + c + '"></span>'; }
  function val(root, k) { var e = root.querySelector('[data-f=' + k + ']'); return e ? e.value : ''; }
  function num(root, k, req) { var s = val(root, k).trim(); if (!s) { if (req) throw new Error('Fill in all the fields.'); return null; } return K.parse(s); }
  var CALC = {
    ohm: function (r) {
      var o = { V: num(r, 'V'), I: num(r, 'I'), R: num(r, 'R'), P: num(r, 'P') }, x = K.ohm(o);
      return '<div class="result"><dl class="facts">' + row('Voltage', K.eng(x.V, 'V')) + row('Current', K.eng(x.I, 'A')) + row('Resistance', K.eng(x.R, 'Ω')) + row('Power', K.eng(x.P, 'W')) + '</dl>' +
        '<p class="hint">Power is the heat the part must lose. Choose a resistor rated for at least twice this power.</p></div>';
    },
    colors: function (r) {
      var mode = val(r, 'mode');
      if (mode === 'bands') {
        var n = +val(r, 'n'), b = [], i; for (i = 1; i <= n; i++) b.push(val(r, 'b' + i));
        var x = K.fromBands(b), h = '<div class="result"><div class="bands">' + b.map(swatch).join('') + '</div><h2>' + K.eng(x.ohms, 'Ω') + ' ±' + x.tol + '%</h2>';
        if (x.tempco) h += '<p>Temperature coefficient: ' + x.tempco + ' ppm/°C.</p>';
        return h + '<p class="hint">Hold the resistor so that the tolerance band (gold or silver, set a little apart) is on the right and read from the left.</p></div>';
      }
      var ohms = num(r, 'ohms', true), nb = +val(r, 'nb'), tol = val(r, 'tol'), bands = K.toBands(ohms, nb, tol);
      return '<div class="result"><div class="bands">' + bands.map(swatch).join('') + '</div><h2>' + bands.join(', ') + '</h2><p>' + K.eng(ohms, 'Ω') + ' with ' + nb + ' bands, tolerance ±' + K.TOL[tol] + '%.</p></div>';
    },
    led: function (r) {
      var o = { Vs: num(r, 'Vs', true), Vf: num(r, 'Vf', true), If: num(r, 'If', true), n: +val(r, 'n') }, x = K.led(o);
      var line = function (l, v) { return '<tr><td data-l="Choice">' + l + '</td><td data-l="Resistor">' + K.eng(v.R, 'Ω') + '</td><td data-l="Current">' + K.eng(v.I, 'A') + '</td><td data-l="Resistor power">' + K.eng(v.P, 'W') + '</td></tr>'; };
      return '<div class="result"><h2>' + K.eng(x.R, 'Ω') + '</h2><p>The resistor drops ' + K.sig(x.drop, 4) + ' V at ' + K.eng(o.If, 'A') + '. Use a standard value at or above the result, so the current stays at or below your target:</p>' +
        '<div class="tbl"><table class="stack"><thead><tr><th>Choice</th><th>Resistor</th><th>Current</th><th>Resistor power</th></tr></thead><tbody>' + line('Exact value', x.exact) + line('Next E12 value up', x.e12) + line('Next E24 value up', x.e24) + '</tbody></table></div>' +
        '<p class="hint">A resistor of 0.25 W is enough when the power is well below 0.125 W. Many LEDs are rated for about 20 mA: check the data sheet of yours.</p></div>';
    },
    sp: function (r) {
      var vs = val(r, 'list').split(/[\s,;]+/).filter(Boolean).map(K.parse);
      if (vs.length < 2) throw new Error('Type at least two values, separated by spaces or commas.');
      if (vs.some(function (v) { return !(v > 0); })) throw new Error('Values must be larger than zero.');
      return '<div class="result"><dl class="facts">' + row('In series', K.eng(K.seriesR(vs), 'Ω')) + row('In parallel', K.eng(K.parallelR(vs), 'Ω')) + '</dl><p class="hint">Series: add them. Parallel: add the reciprocals, then take the reciprocal of the sum. Two equal resistors in parallel give half the value.</p></div>';
    },
    divider: function (r) {
      var Vin = num(r, 'Vin', true), R1 = num(r, 'R1', true), R2 = num(r, 'R2', true), RL = num(r, 'RL'), x = K.divider({ Vin: Vin, R1: R1, R2: R2, RL: RL || 0 });
      var h = '<div class="result"><dl class="facts">' + row('Output voltage (no load)', K.eng(x.Vout, 'V')) + row('Current through the divider', K.eng(x.I, 'A'));
      if (RL) h += row('Output with the load connected', K.eng(x.VoutLoaded, 'V'));
      h += '</dl>';
      if (RL) h += '<p class="hint">The load is in parallel with R2, which pulls the output down. Make R2 much smaller than the load to keep the loss small.</p>';
      var tv = num(r, 'Vt'); if (tv) h += '<p>To get ' + K.eng(tv, 'V') + ' from ' + K.eng(Vin, 'V') + ' with R1 = ' + K.eng(R1, 'Ω') + ', R2 should be ' + K.eng(K.dividerR2(Vin, tv, R1), 'Ω') + ' (nearest E24 value: ' + K.eng(K.series(K.E24, K.dividerR2(Vin, tv, R1), 'near'), 'Ω') + ').</p>';
      return h + '</div>';
    },
    rc: function (r) {
      var R = num(r, 'R', true), C = num(r, 'C', true), x = K.rc(R, C);
      return '<div class="result"><dl class="facts">' + row('Time constant τ = R × C', K.eng(x.tau, 's')) + row('Cut-off frequency 1 / (2πRC)', K.eng(x.fc, 'Hz')) + row('Rise time, 10% to 90%', K.eng(x.t1090, 's')) + row('Time to reach 99%', K.eng(x.t99, 's')) + '</dl>' +
        '<p class="hint">After one time constant a charging capacitor has reached about 63% of the supply voltage; after five, about 99%.</p></div>';
    }
  };
  d.querySelectorAll('[data-calc]').forEach(function (root) {
    var kind = root.getAttribute('data-calc'), out = root.querySelector('[data-out]');
    function sync() {
      if (kind === 'colors') {
        var bands = root.querySelector('[data-f=mode]').value === 'bands';
        root.querySelectorAll('[data-m=bands]').forEach(function (e) { e.hidden = !bands; }); root.querySelectorAll('[data-m=value]').forEach(function (e) { e.hidden = bands; });
        var n = +val(root, 'n'); root.querySelectorAll('[data-bi]').forEach(function (e) { var i = +e.getAttribute('data-bi'); e.hidden = !bands || i > n; });
      }
    }
    function run() { sync(); try { out.innerHTML = CALC[kind](root); } catch (e) { out.innerHTML = err(e.message); } }
    root.addEventListener('input', run); root.addEventListener('change', function (e) { var t = e.target; if (t.tagName === 'SELECT' || /^(checkbox|radio|color|date|file|range)$/.test(t.type)) run(); });
    root.querySelectorAll('[data-preset]').forEach(function (b) { b.addEventListener('click', function () { var p = JSON.parse(b.getAttribute('data-preset')); Object.keys(p).forEach(function (k) { var e = root.querySelector('[data-f=' + k + ']'); if (e) e.value = p[k]; }); run(); }); });
    run();
  });
  d.querySelectorAll('pre.code[data-static]').forEach(function (pre) { var b = d.createElement('button'); b.type = 'button'; b.className = 'copy'; b.textContent = 'Copy'; b.addEventListener('click', function () { S.copy(pre.querySelector('code').textContent, 'Copied'); }); pre.appendChild(b); });
})();
