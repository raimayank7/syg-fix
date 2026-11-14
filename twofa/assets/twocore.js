/* twocore.js: Base32 (RFC 4648), HOTP (RFC 4226) and TOTP (RFC 6238) with WebCrypto, and otpauth address building / reading.
   Browser: window.TwoCore. Node: module.exports. Tested by test_two.py against the RFC test vectors and Python's hmac. Secrets never leave the browser. */
(function (root) {
  'use strict';
  var A32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  var subtle = (typeof crypto !== 'undefined' && crypto.subtle) ? crypto.subtle : (typeof require !== 'undefined' ? require('node:crypto').webcrypto.subtle : null);
  var rnd = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? function (a) { return crypto.getRandomValues(a); } : function (a) { return require('node:crypto').webcrypto.getRandomValues(a); };
  function b32decode(s) {
    s = String(s).toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
    if (!s) throw new Error('The secret is empty.');
    var bits = '', i, c;
    for (i = 0; i < s.length; i++) { c = A32.indexOf(s[i]); if (c < 0) throw new Error('The character "' + s[i] + '" is not in the Base32 alphabet (A to Z and 2 to 7).'); bits += ('00000' + c.toString(2)).slice(-5); }
    var out = new Uint8Array(Math.floor(bits.length / 8));
    for (i = 0; i < out.length; i++) out[i] = parseInt(bits.substr(i * 8, 8), 2);
    return out;
  }
  function b32encode(bytes) {
    var bits = '', i, out = '';
    for (i = 0; i < bytes.length; i++) bits += ('00000000' + bytes[i].toString(2)).slice(-8);
    for (i = 0; i < bits.length; i += 5) out += A32[parseInt((bits.substr(i, 5) + '0000').slice(0, 5), 2)];
    while (out.length % 8) out += '=';
    return out;
  }
  var HASH = { SHA1: 'SHA-1', SHA256: 'SHA-256', SHA512: 'SHA-512' };
  function hotp(keyBytes, counter, digits, alg) {
    var buf = new Uint8Array(8), c = BigInt(counter), i;
    for (i = 7; i >= 0; i--) { buf[i] = Number(c & 255n); c >>= 8n; }
    return subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: HASH[alg || 'SHA1'] }, false, ['sign']).then(function (k) { return subtle.sign('HMAC', k, buf); }).then(function (sig) {
      var h = new Uint8Array(sig), off = h[h.length - 1] & 15, bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
      var mod = Math.pow(10, digits), n = bin % mod, s = String(n); while (s.length < digits) s = '0' + s; return s;
    });
  }
  function totp(keyBytes, unixSeconds, step, digits, alg, t0) { var t = Math.floor((Math.floor(unixSeconds) - (t0 || 0)) / step); return hotp(keyBytes, t, digits, alg); }
  function randomSecret(nBytes) { var a = new Uint8Array(nBytes || 20); rnd(a); return b32encode(a).replace(/=+$/, ''); }
  function uri(o) {
    var label = (o.issuer ? encodeURIComponent(o.issuer) + ':' : '') + encodeURIComponent(o.account || 'user'), q = ['secret=' + String(o.secret).replace(/[\s=-]/g, '').toUpperCase()];
    if (o.issuer) q.push('issuer=' + encodeURIComponent(o.issuer));
    if (o.alg && o.alg !== 'SHA1') q.push('algorithm=' + o.alg);
    if (o.digits && +o.digits !== 6) q.push('digits=' + o.digits);
    if (o.type === 'hotp') q.push('counter=' + (o.counter || 0)); else if (o.period && +o.period !== 30) q.push('period=' + o.period);
    return 'otpauth://' + (o.type || 'totp') + '/' + label + '?' + q.join('&');
  }
  function parseUri(s) {
    var m = /^otpauth:\/\/(totp|hotp)\/([^?]*)\?(.*)$/i.exec(String(s).trim());
    if (!m) throw new Error('This is not an otpauth:// address.');
    var p = {}; m[3].split('&').forEach(function (kv) { var i = kv.indexOf('='); p[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1)); });
    var label = decodeURIComponent(m[2]), parts = label.split(':');
    return { type: m[1].toLowerCase(), issuer: p.issuer || (parts.length > 1 ? parts[0] : ''), account: parts.length > 1 ? parts.slice(1).join(':').trim() : label, secret: p.secret || '', alg: (p.algorithm || 'SHA1').toUpperCase(), digits: +(p.digits || 6), period: +(p.period || 30), counter: +(p.counter || 0) };
  }
  var api = { b32decode: b32decode, b32encode: b32encode, hotp: hotp, totp: totp, randomSecret: randomSecret, uri: uri, parseUri: parseUri };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TwoCore = api;
})(typeof window !== 'undefined' ? window : this);
