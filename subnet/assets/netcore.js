/* netcore.js: IPv4 and IPv6 address maths with BigInt: parsing, prefixes, masks, network details, splitting, ranges to CIDR blocks.
   Works in a browser (window.NetCore) and in node (module.exports). Tested against Python's ipaddress module by test_net.py. */
(function (root) {
  'use strict';
  var ONE = 1n;

  function parse4(s) {
    s = String(s).trim();
    var m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
    if (!m) return null;
    var v = 0n;
    for (var i = 1; i <= 4; i++) {
      if (m[i].length > 1 && m[i][0] === '0') return null;   // leading zeros are ambiguous (octal in some programs)
      var n = +m[i]; if (n > 255) return null;
      v = (v << 8n) | BigInt(n);
    }
    return v;
  }
  function fmt4(v) { return [24n, 16n, 8n, 0n].map(function (sh) { return String((v >> sh) & 255n); }).join('.'); }
  function maskOf(bits, prefix) { return prefix === 0 ? 0n : (((ONE << BigInt(bits)) - ONE) >> BigInt(bits - prefix)) << BigInt(bits - prefix); }
  function prefixFromMask4(s) {
    var v = parse4(s); if (v === null) return null;
    var ones = 0, seenZero = false;
    for (var i = 31; i >= 0; i--) { var b = (v >> BigInt(i)) & 1n; if (b === 1n) { if (seenZero) return null; ones++; } else seenZero = true; }
    return ones;
  }
  function bin4(v) { return [24n, 16n, 8n, 0n].map(function (sh) { var b = Number((v >> sh) & 255n).toString(2); return '00000000'.slice(b.length) + b; }).join('.'); }

  function parse6(s) {
    s = String(s).trim().toLowerCase();
    if (!/^[0-9a-f:.]+$/.test(s) || s.indexOf(':') < 0) return null;
    var v4 = null, m = /^(.*:)(\d+\.\d+\.\d+\.\d+)$/.exec(s);
    if (m) { v4 = parse4(m[2]); if (v4 === null) return null; s = m[1] + ((v4 >> 16n).toString(16)) + ':' + ((v4 & 0xffffn).toString(16)); }
    var parts = s.split('::');
    if (parts.length > 2) return null;
    function groups(t) { if (t === '') return []; var g = t.split(':'); for (var i = 0; i < g.length; i++) if (!/^[0-9a-f]{1,4}$/.test(g[i])) return null; return g; }
    var head = groups(parts[0]), tail = parts.length === 2 ? groups(parts[1]) : [];
    if (head === null || tail === null) return null;
    var all;
    if (parts.length === 2) {
      var missing = 8 - head.length - tail.length; if (missing < 1) return null;
      all = head.concat(new Array(missing).fill('0'), tail);
    } else { all = head; if (all.length !== 8) return null; }
    var v = 0n; for (var j = 0; j < 8; j++) v = (v << 16n) | BigInt(parseInt(all[j], 16));
    return v;
  }
  function groups6(v) { var g = []; for (var i = 7; i >= 0; i--) g.push(Number((v >> BigInt(i * 16)) & 0xffffn)); return g; }
  function expand6(v) { return groups6(v).map(function (x) { var h = x.toString(16); return '0000'.slice(h.length) + h; }).join(':'); }
  function compress6(v) {  // RFC 5952: lower case, no leading zeros, longest run of two or more zero groups becomes ::, the first one when equal
    var g = groups6(v), bestS = -1, bestL = 0, i = 0;
    while (i < 8) { if (g[i] === 0) { var j = i; while (j < 8 && g[j] === 0) j++; if (j - i > bestL) { bestL = j - i; bestS = i; } i = j; } else i++; }
    var h = g.map(function (x) { return x.toString(16); });
    if (bestL < 2) return h.join(':');
    return h.slice(0, bestS).join(':') + '::' + h.slice(bestS + bestL).join(':');
  }

  function net4(ip, prefix) {
    var mask = maskOf(32, prefix), network = ip & mask, bcast = network | (~mask & 0xffffffffn), total = ONE << BigInt(32 - prefix);
    var first, last, hosts;
    if (prefix === 32) { first = last = network; hosts = 1n; }
    else if (prefix === 31) { first = network; last = bcast; hosts = 2n; }
    else { first = network + 1n; last = bcast - 1n; hosts = total - 2n; }
    return { ip: ip, prefix: prefix, mask: mask, wildcard: ~mask & 0xffffffffn, network: network, broadcast: bcast, first: first, last: last, total: total, hosts: hosts };
  }
  function net6(ip, prefix) {
    var mask = maskOf(128, prefix), network = ip & mask, last = network | (~mask & ((ONE << 128n) - ONE)), total = ONE << BigInt(128 - prefix);
    return { ip: ip, prefix: prefix, network: network, first: network, last: last, total: total };
  }
  function classOf(ip) { var o = Number(ip >> 24n); return o < 128 ? 'A' : o < 192 ? 'B' : o < 224 ? 'C' : o < 240 ? 'D (multicast)' : 'E (reserved)'; }

  /* split a network into blocks of a longer prefix (at most `limit` blocks listed) */
  function split(network, prefix, newPrefix, bits, limit) {
    var size = ONE << BigInt(bits - newPrefix), n = ONE << BigInt(newPrefix - prefix), out = [], cnt = n < BigInt(limit) ? Number(n) : limit;
    for (var i = 0; i < cnt; i++) out.push(network + BigInt(i) * size);
    return { count: n, blocks: out };
  }
  /* an address range to the shortest list of CIDR blocks */
  function rangeToCidr(start, end, bits) {
    var out = [];
    while (start <= end) {
      var size = start === 0n ? (ONE << BigInt(bits)) : (start & -start);   // largest block that starts here
      while (start + size - ONE > end) size >>= 1n;
      var len = 0; var t = size; while (t > 1n) { t >>= 1n; len++; }
      out.push([start, bits - len]);
      start += size;
    }
    return out;
  }
  function contains(network, prefix, ip, bits) { var m = maskOf(bits, prefix); return (ip & m) === (network & m); }

  /* special-purpose block of an IPv4 address from a list [[networkBigIntString, prefix, name], ...], longest prefix wins */
  function special4(ip, list) {
    var best = null;
    for (var i = 0; i < list.length; i++) { var n = BigInt(list[i][0]), p = list[i][1]; if (contains(n, p, ip, 32) && (!best || p > best[1])) best = list[i]; }
    return best;
  }
  function digits(b) { var s = b.toString(), out = '', c = 0; for (var i = s.length - 1; i >= 0; i--) { out = s[i] + out; if (++c % 3 === 0 && i > 0) out = ',' + out; } return out; }

  var api = { parse4: parse4, fmt4: fmt4, bin4: bin4, prefixFromMask4: prefixFromMask4, maskOf: maskOf, parse6: parse6, expand6: expand6, compress6: compress6, net4: net4, net6: net6, classOf: classOf, split: split, rangeToCidr: rangeToCidr, contains: contains, special4: special4, digits: digits };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.NetCore = api;
})(typeof window !== 'undefined' ? window : this);
