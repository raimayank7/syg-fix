/* circ.js: electronics maths: Ohm's law, resistor colour code, LED series resistor with E-series values, series/parallel, voltage divider, RC time constant, AWG wire size, value parsing and SI formatting.
   Browser: window.Circ. Node: module.exports. Tested by test_circ.py against independent Python code. Pure functions; no page code here. */
(function (root) {
  'use strict';
  var PRE = { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };
  /* "4.7k", "2.2u", "4k7" (letter in place of the point), "470", "1e3" -> number; throws with a plain message */
  function parse(s) {
    s = String(s).trim().replace(/\s+/g, '').replace(/[ΩΩ]|ohms?$/gi, '').replace(/[VAFWvafw]$/, '');
    if (!s) throw new Error('Type a number, for example 4.7k or 220.');
    var m = /^([0-9]*)([pnuµmkKMG])([0-9]+)$/.exec(s);
    if (m && (m[1] || m[3])) return parseFloat((m[1] || '0') + '.' + m[3]) * PRE[m[2]];
    m = /^([+-]?(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:e[+-]?[0-9]+)?)([pnuµmkKMG]?)$/i.exec(s);
    if (!m) throw new Error('"' + s + '" is not a number. Use forms such as 4.7k, 2.2u, 470 or 4k7.');
    var v = parseFloat(m[1]) * (m[2] ? PRE[m[2]] : 1);
    if (!isFinite(v)) throw new Error('That number is too large.');
    return v;
  }
  function sig(x, n) { n = n || 4; if (x === 0) return '0'; var p = Number(x.toPrecision(n)); return String(p); }
  function eng(x, unit) {
    if (!isFinite(x)) return 'infinite';
    if (x === 0) return '0 ' + unit;
    var a = Math.abs(x), t = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']], i;
    for (i = 0; i < t.length; i++) if (a >= t[i][0] * 0.99995) return sig(x / t[i][0], 4) + ' ' + t[i][1] + unit;
    return sig(x / 1e-12, 4) + ' p' + unit;
  }
  /* Ohm's law: any two of V, I, R, P (numbers or null) -> all four */
  function ohm(o) {
    var V = o.V, I = o.I, R = o.R, P = o.P, k = [V, I, R, P].filter(function (x) { return x !== null && x !== undefined; }).length, e = null;
    if (k < 2) throw new Error('Fill in any two of voltage, current, resistance and power.');
    if (k > 2) throw new Error('Fill in only two values: the others are worked out.');
    [V, I, R, P].forEach(function (x) { if (x !== null && x !== undefined && !(x > 0)) e = 1; });
    if (e) throw new Error('Values must be larger than zero.');
    var has = function (x) { return x !== null && x !== undefined; };
    if (has(V) && has(I)) { R = V / I; P = V * I; } else if (has(V) && has(R)) { I = V / R; P = V * V / R; } else if (has(V) && has(P)) { I = P / V; R = V * V / P; }
    else if (has(I) && has(R)) { V = I * R; P = I * I * R; } else if (has(I) && has(P)) { V = P / I; R = P / (I * I); } else { V = Math.sqrt(P * R); I = Math.sqrt(P / R); }
    return { V: V, I: I, R: R, P: P };
  }
  /* ---- resistor colour code (the digits and multipliers of IEC 60062 as printed in common references) ---- */
  var DIG = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white'];
  var MULT = { black: 1, brown: 10, red: 100, orange: 1e3, yellow: 1e4, green: 1e5, blue: 1e6, violet: 1e7, grey: 1e8, white: 1e9, gold: 0.1, silver: 0.01 };
  var TOL = { brown: 1, red: 2, green: 0.5, blue: 0.25, violet: 0.1, grey: 0.05, gold: 5, silver: 10, none: 20 };
  var TEMPCO = { black: 250, brown: 100, red: 50, orange: 15, yellow: 25, green: 20, blue: 10, violet: 5, grey: 1 };
  function fromBands(b) {
    var n = b.length;
    if ([4, 5, 6].indexOf(n) < 0) throw new Error('A resistor has 4, 5 or 6 bands.');
    var nd = n === 4 ? 2 : 3, d = 0, i;
    for (i = 0; i < nd; i++) { var x = DIG.indexOf(b[i]); if (x < 0) throw new Error('Band ' + (i + 1) + ' (' + b[i] + ') cannot be a digit band.'); d = d * 10 + x; }
    var m = MULT[b[nd]]; if (m === undefined) throw new Error('Band ' + (nd + 1) + ' (' + b[nd] + ') cannot be the multiplier.');
    var t = TOL[b[nd + 1]]; if (t === undefined) throw new Error('Band ' + (nd + 2) + ' (' + b[nd + 1] + ') cannot be the tolerance.');
    var r = { ohms: Math.round(d * m * 1e6) / 1e6, tol: t };
    if (n === 6) { var tc = TEMPCO[b[5]]; if (tc === undefined) throw new Error('Band 6 (' + b[5] + ') cannot be the temperature coefficient.'); r.tempco = tc; }
    return r;
  }
  /* value in ohms -> bands (4 or 5), picking the multiplier that keeps the significant digits */
  function toBands(ohms, n, tolColor) {
    if (!(ohms >= 0.01) || ohms > 1e12) throw new Error('Colour bands cover 0.01 ohm up to 999 gigaohm.');
    var nd = n === 5 ? 3 : 2, lo = Math.pow(10, nd - 1), hi = Math.pow(10, nd), found = null, e;
    for (e = -2; e <= 9 && !found; e++) {
      var m = Math.pow(10, e), d = ohms / m, r = Math.round(d);
      if (r >= lo && r < hi && Math.abs(d - r) <= d * 1e-9) { var name = null; Object.keys(MULT).forEach(function (c) { if (Math.abs(MULT[c] - m) <= m * 1e-9) name = c; }); if (name) found = { digits: r, mult: name }; }
    }
    if (!found) throw new Error('This value needs more significant digits than ' + n + ' bands can show' + (n === 4 ? '. Try 5 bands, or use a standard value.' : '. Use a standard value.'));
    var ds = String(found.digits), bands = [], i;
    for (i = 0; i < ds.length; i++) bands.push(DIG[+ds[i]]);
    bands.push(found.mult); bands.push(tolColor || 'gold');
    return bands;
  }
  /* ---- E-series ---- */
  var E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
  var E24 = [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91];
  function series(list, ohms, dir) { /* dir 'up': smallest standard value >= ohms; 'down': largest <= ohms; 'near' */
    var best = null, dec = Math.floor(Math.log10(ohms)), c = [], d;
    for (d = dec - 1; d <= dec + 1; d++) list.forEach(function (v) { c.push(v * Math.pow(10, d - 1)); });
    c.sort(function (a, b) { return a - b; });
    if (dir === 'up') { c.some(function (v) { if (v >= ohms * (1 - 1e-9)) { best = v; return true; } }); }
    else if (dir === 'down') { c.forEach(function (v) { if (v <= ohms * (1 + 1e-9)) best = v; }); }
    else { var bd = Infinity; c.forEach(function (v) { var dd = Math.abs(Math.log(v / ohms)); if (dd < bd) { bd = dd; best = v; } }); }
    return Math.round(best * 1e9) / 1e9;
  }
  /* LED resistor: R = (Vs - Vf) / If; the standard value above it keeps the current at or below the target */
  function led(o) {
    if (!(o.Vs > 0 && o.Vf > 0 && o.If > 0)) throw new Error('Supply voltage, LED voltage and current must be larger than zero.');
    if (o.Vs <= o.Vf) throw new Error('The supply voltage must be higher than the LED voltage, or no current flows.');
    var n = o.n && o.n > 1 ? o.n : 1, drop = o.Vs - n * o.Vf;
    if (drop <= 0) throw new Error('The supply voltage must be higher than the sum of the LED voltages.');
    var R = drop / o.If, r12 = series(E12, R, 'up'), r24 = series(E24, R, 'up');
    var f = function (r) { var I = drop / r; return { R: r, I: I, P: I * I * r }; };
    return { R: R, drop: drop, e12: f(r12), e24: f(r24), exact: f(R) };
  }
  function seriesR(a) { return a.reduce(function (s, x) { return s + x; }, 0); }
  function parallelR(a) { return 1 / a.reduce(function (s, x) { return s + 1 / x; }, 0); }
  function divider(o) {
    var out = {};
    if (o.R1 > 0 && o.R2 > 0) { out.Vout = o.Vin * o.R2 / (o.R1 + o.R2); if (o.RL > 0) { var r2 = parallelR([o.R2, o.RL]); out.VoutLoaded = o.Vin * r2 / (o.R1 + r2); } out.I = o.Vin / (o.R1 + o.R2); }
    return out;
  }
  function dividerR2(Vin, Vout, R1) { if (!(Vout > 0 && Vout < Vin && R1 > 0 && Vin > 0)) throw new Error('The target must be larger than zero and smaller than the input.'); return R1 * Vout / (Vin - Vout); }
  function rc(R, C) { var tau = R * C; return { tau: tau, fc: 1 / (2 * Math.PI * tau), t1090: Math.log(9) * tau, t99: Math.log(100) * tau }; }
  /* AWG (ASTM B258 definition): d = 0.127 mm x 92^((36 - n)/39); n = -3 for 0000, -2 for 000, -1 for 00 */
  function awg(n) { var d = 0.127 * Math.pow(92, (36 - n) / 39); return { n: n, d: d, area: Math.PI * d * d / 4 }; }
  function awgName(n) { return n >= 0 ? String(n) : ['0000', '000', '00'][n + 3]; }
  var api = { parse: parse, eng: eng, sig: sig, ohm: ohm, fromBands: fromBands, toBands: toBands, DIG: DIG, MULT: MULT, TOL: TOL, TEMPCO: TEMPCO, E12: E12, E24: E24, series: series, led: led, seriesR: seriesR, parallelR: parallelR, divider: divider, dividerR2: dividerR2, rc: rc, awg: awg, awgName: awgName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Circ = api;
})(typeof window !== 'undefined' ? window : this);
