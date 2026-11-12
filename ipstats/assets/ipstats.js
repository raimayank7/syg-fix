/* ipstats.shareyourgroup.com: every tool runs in the browser. Nothing typed here is sent anywhere.
   The home page asks two public services for the address your connection shows to the internet (see /about/). */
(function () {
  'use strict';
  var IP = {}, d, S, $;

  /* ---------- pure functions (also used by the test file) ---------- */
  IP.v4 = function (s) {            // "192.168.1.10" -> unsigned number, or null
    var m = /^\s*(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\s*$/.exec(String(s));
    if (!m) return null;
    var n = 0;
    for (var i = 1; i <= 4; i++) { var o = +m[i]; if (o > 255 || (m[i].length > 1 && m[i][0] === '0')) return null; n = n * 256 + o; }
    return n;
  };
  IP.str = function (n) { return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); };
  IP.bin = function (n) { return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].map(function (o) { return ('00000000' + o.toString(2)).slice(-8); }).join('.'); };
  IP.mask = function (p) { return p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0; };
  IP.maskToPrefix = function (s) {
    var n = IP.v4(s); if (n === null) return null;
    for (var p = 0; p <= 32; p++) if (IP.mask(p) === n) return p;
    return null;
  };
  IP.RANGES = [
    ['0.0.0.0', 8, 'This network', 'Used only as a source address while a device is still starting up. 0.0.0.0 also means "any address" in settings.'],
    ['10.0.0.0', 8, 'Private', 'Private range for home, office and mobile networks. It is never reachable directly from the internet.'],
    ['100.64.0.0', 10, 'Shared (carrier-grade NAT)', 'Used by internet providers between your router and their own network when many customers share one public address.'],
    ['127.0.0.0', 8, 'Loopback', 'The device talking to itself. 127.0.0.1 is "localhost".'],
    ['169.254.0.0', 16, 'Link-local', 'A device gives itself this address when it could not get one from the router. It usually means the connection is not working.'],
    ['172.16.0.0', 12, 'Private', 'Private range (172.16.0.0 to 172.31.255.255) for home and office networks.'],
    ['192.0.0.0', 24, 'Reserved for protocols', 'Set aside for special internet protocol uses.'],
    ['192.0.2.0', 24, 'Documentation', 'Reserved for examples in books and manuals. It is never used on a real network.'],
    ['192.88.99.0', 24, 'Reserved (old 6to4 relay)', 'Once used to carry IPv6 over IPv4. No longer in use.'],
    ['192.168.0.0', 16, 'Private', 'The most common private range for home Wi-Fi routers.'],
    ['198.18.0.0', 15, 'Benchmark testing', 'Reserved for testing network equipment.'],
    ['198.51.100.0', 24, 'Documentation', 'Reserved for examples in books and manuals.'],
    ['203.0.113.0', 24, 'Documentation', 'Reserved for examples in books and manuals.'],
    ['224.0.0.0', 4, 'Multicast', 'Used to send one stream to many devices at once, not to a single device.'],
    ['240.0.0.0', 4, 'Reserved', 'Set aside for future use. 255.255.255.255 is the broadcast address of the local network.']
  ];
  IP.kind = function (n) {
    for (var i = 0; i < IP.RANGES.length; i++) {
      var r = IP.RANGES[i], base = IP.v4(r[0]), m = IP.mask(r[1]);
      if (((n & m) >>> 0) === base) return { name: r[2], note: r[3], range: r[0] + '/' + r[1] };
    }
    return { name: 'Public', note: 'A normal internet address. It can be reached from anywhere on the internet unless a firewall stops it.', range: '' };
  };
  IP.cls = function (n) { var a = n >>> 24; return a < 128 ? 'A' : a < 192 ? 'B' : a < 224 ? 'C' : a < 240 ? 'D (multicast)' : 'E (reserved)'; };
  IP.subnet = function (ip, p) {
    var m = IP.mask(p), net = (ip & m) >>> 0, bc = (net | (~m >>> 0)) >>> 0, total = Math.pow(2, 32 - p);
    var first = p >= 31 ? net : net + 1, last = p >= 31 ? bc : bc - 1;
    return { mask: m, wild: (~m) >>> 0, net: net, bc: bc, first: first, last: last, total: total, usable: p === 32 ? 1 : p === 31 ? 2 : total - 2 };
  };
  /* IPv6: returns 8 numbers or null */
  IP.v6 = function (s) {
    s = String(s).trim().toLowerCase().replace(/%.*$/, '').replace(/^\[|\]$/g, '');
    if (!s || /[^0-9a-f:.]/.test(s)) return null;
    var m4 = /(^|:)(\d+\.\d+\.\d+\.\d+)$/.exec(s);
    if (m4) { var n = IP.v4(m4[2]); if (n === null) return null; s = s.slice(0, s.length - m4[2].length) + (n >>> 16).toString(16) + ':' + (n & 65535).toString(16); }
    var dbl = s.split('::');
    if (dbl.length > 2) return null;
    var conv = function (t) {
      if (t === '') return [];
      var list = t.split(':'), r = [];
      for (var i = 0; i < list.length; i++) { if (!/^[0-9a-f]{1,4}$/.test(list[i])) return null; r.push(parseInt(list[i], 16)); }
      return r;
    };
    var ca = conv(dbl[0]), cb = dbl.length === 2 ? conv(dbl[1]) : [], out;
    if (!ca || !cb) return null;
    if (dbl.length === 2) {
      var gap = 8 - ca.length - cb.length;
      if (gap < 1) return null;
      out = ca; for (var i = 0; i < gap; i++) out.push(0); out = out.concat(cb);
    } else out = ca;
    return out.length === 8 ? out : null;
  };
  IP.v6full = function (g) { return g.map(function (x) { return ('0000' + x.toString(16)).slice(-4); }).join(':'); };
  IP.v6short = function (g) {            // RFC 5952: longest run of two or more zero groups, the first one on a tie, lower case
    var best = -1, len = 0, cur = -1, cl = 0;
    for (var i = 0; i <= 8; i++) {
      if (i < 8 && g[i] === 0) { if (cur < 0) { cur = i; cl = 0; } cl++; }
      else { if (cur >= 0 && cl > len && cl >= 2) { best = cur; len = cl; } cur = -1; }
    }
    var h = g.map(function (x) { return x.toString(16); });
    if (best < 0) return h.join(':');
    return h.slice(0, best).join(':') + '::' + h.slice(best + len).join(':');
  };
  IP.kind6 = function (g) {
    var z = g.every(function (x) { return x === 0; });
    if (z) return ['Unspecified', 'The address "::" means "no address yet".'];
    if (g.slice(0, 7).every(function (x) { return x === 0; }) && g[7] === 1) return ['Loopback', '"::1" is the device talking to itself, the IPv6 form of 127.0.0.1.'];
    if (g.slice(0, 5).every(function (x) { return x === 0; }) && g[5] === 0xffff) return ['IPv4-mapped', 'An IPv4 address written in IPv6 form: ' + IP.str(((g[6] << 16) | g[7]) >>> 0) + '.'];
    if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every(function (x) { return x === 0; })) return ['NAT64', 'Used by IPv6-only networks (many mobile networks) to reach IPv4 websites.'];
    if ((g[0] & 0xffc0) === 0xfe80) return ['Link-local', 'Works only on the local network link. Every IPv6 device has one. It cannot be reached from the internet.'];
    if ((g[0] & 0xfe00) === 0xfc00) return ['Unique local (private)', 'The IPv6 form of a private address, for use inside a home or office.'];
    if ((g[0] & 0xff00) === 0xff00) return ['Multicast', 'Used to send to a group of devices at once.'];
    if (g[0] === 0x2001 && g[1] === 0x0db8) return ['Documentation', 'Reserved for examples in books and manuals.'];
    if ((g[0] & 0xe000) === 0x2000) return ['Global (public)', 'A normal public IPv6 address, reachable from the internet unless a firewall stops it.'];
    return ['Reserved', 'Not in a range that is given out for normal use today.'];
  };
  IP.ua = function (u) {
    var b = 'Unknown browser', v = '', m, os = 'Unknown system', dev = 'Computer';
    var pick = function (re, name) { if (b === 'Unknown browser' && (m = re.exec(u))) { b = name; v = m[1]; } };
    pick(/ipstats/Edg(?:e|A|iOS)?\/([\d.]+)/, 'Microsoft Edge'); pick(/ipstats/OPR\/([\d.]+)/, 'Opera'); pick(/ipstats/SamsungBrowser\/([\d.]+)/, 'Samsung Internet');
    pick(/ipstats/UCBrowser\/([\d.]+)/, 'UC Browser'); pick(/ipstats/YaBrowser\/([\d.]+)/, 'Yandex Browser'); pick(/ipstats/Vivaldi\/([\d.]+)/, 'Vivaldi');
    pick(/ipstats/FxiOS\/([\d.]+)/, 'Firefox'); pick(/ipstats/Firefox\/([\d.]+)/, 'Firefox'); pick(/ipstats/CriOS\/([\d.]+)/, 'Chrome'); pick(/ipstats/Chrome\/([\d.]+)/, 'Chrome');
    pick(/ipstats/Version\/([\d.]+).*Safari/, 'Safari'); pick(/ipstats/MSIE ([\d.]+)/, 'Internet Explorer'); pick(/ipstats/Trident\/.*rv:([\d.]+)/, 'Internet Explorer');
    if ((m = /Windows NT ([\d.]+)/.exec(u))) os = m[1] === '10.0' ? 'Windows 10 or 11' : m[1] === '6.3' ? 'Windows 8.1' : m[1] === '6.1' ? 'Windows 7' : 'Windows (NT ' + m[1] + ')';
    else if ((m = /Android ([\d.]+)/.exec(u))) { os = 'Android ' + m[1]; dev = /Mobile/.test(u) ? 'Phone' : 'Tablet'; }
    else if ((m = /(iPhone|iPad|iPod).*? OS ([\d_]+)/.exec(u))) { os = (m[1] === 'iPad' ? 'iPadOS ' : 'iOS ') + m[2].replace(/ipstats/_/g, '.'); dev = m[1] === 'iPad' ? 'Tablet' : 'Phone'; }
    else if (/ipstats/CrOS/.test(u)) os = 'ChromeOS';
    else if ((m = /Mac OS X ([\d_.]+)/.exec(u))) os = 'macOS';
    else if (/ipstats/Linux/.test(u)) os = 'Linux';
    var eng = /Gecko\/\d/.test(u) && /Firefox/.test(u) ? 'Gecko' : /AppleWebKit/.test(u) ? (/ipstats/Chrome|CriOS|Edg|OPR/.test(u) && !/(iPhone|iPad)/.test(u) ? 'Blink' : 'WebKit') : /Trident/.test(u) ? 'Trident' : 'Unknown';
    return { browser: b, version: v, major: v.split('.')[0], os: os, device: dev, engine: eng };
  };
  IP.dur = function (sec) {
    if (!isFinite(sec) || sec < 0) return '';
    if (sec < 1) return 'less than a second';
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.round(sec % 60), out = [];
    if (h) out.push(h + (h === 1 ? ' hour' : ' hours'));
    if (m) out.push(m + (m === 1 ? ' minute' : ' minutes'));
    if (!h && (s || !m)) out.push(s + (s === 1 ? ' second' : ' seconds'));
    return out.join(' ');
  };
  if (typeof module !== 'undefined') { module.exports = IP; return; }
  window.IPT = IP;
  d = document; S = window.SYG;
  $ = function (q, el) { return (el || d).querySelector(q); };

  /* ---------- page helpers ---------- */
  function facts(rows) {
    return '<dl class="facts">' + rows.map(function (r) { return '<dt>' + S.esc(r[0]) + '</dt><dd' + (r[2] ? ' class="mono"' : '') + '>' + S.esc(r[1]) + '</dd>'; }).join('') + '</dl>';
  }
  function show(el, htmlText) { el.innerHTML = htmlText; el.hidden = false; }
  function num(n) { return Number(n).toLocaleString('en-IN'); }

  /* filter box over rows that carry data-q */
  var fb = $('[data-filter]');
  if (fb) fb.addEventListener('input', function () {
    var q = fb.value.trim().toLowerCase(), hit = 0;
    d.querySelectorAll('[data-q]').forEach(function (r) { var ok = !q || r.getAttribute('data-q').indexOf(q) > -1; r.hidden = !ok; if (ok) hit++; });
    var none = $('[data-none]'); if (none) none.hidden = hit > 0;
  });

  /* ---------- home: my IP and browser ---------- */
  var home = $('[data-tool=me]');
  if (home) (function () {
    var n = navigator, ua = IP.ua(n.userAgent), copyText = {};
    var set = function (id, text, cls) { var e = $('#' + id); if (e) { e.textContent = text; if (cls) e.className = cls; } copyText[id] = text; };
    var get = function (url, ms) {
      var c = window.AbortController ? new AbortController() : null;
      if (c) setTimeout(function () { c.abort(); }, ms || 8000);
      return fetch(url, { cache: 'no-store', signal: c ? c.signal : undefined });
    };
    get('https://api.ipify.org?format=json').then(function (r) { return r.json(); }).then(function (j) {
      set('ip4', j.ip, 'big');
      var k = IP.v4(j.ip) !== null ? IP.kind(IP.v4(j.ip)) : null;
      if (k) set('ip4kind', k.name === 'Public' ? 'A public IPv4 address. This is what websites see when you visit them.' : k.name + ': ' + k.note);
      $('#ip4copy').hidden = false; $('#ip4copy').setAttribute('data-copy', j.ip);
    }).catch(function () { set('ip4', 'Could not read it', 'big'); set('ip4kind', 'The look-up was blocked or you are offline. An ad blocker, a firewall or an IPv6-only network can cause this. Everything below still works.'); });
    get('https://api6.ipify.org?format=json', 6000).then(function (r) { return r.json(); }).then(function (j) { set('ip6', j.ip); })
      .catch(function () { set('ip6', 'Not available on this connection'); });
    get('https://www.cloudflare.com/cdn-cgi/trace').then(function (r) { return r.text(); }).then(function (t) {
      var o = {}; t.split('\n').forEach(function (l) { var i = l.indexOf('='); if (i > 0) o[l.slice(0, i)] = l.slice(i + 1); });
      var name = o.loc || '';
      try { name = new Intl.DisplayNames(['en'], { type: 'region' }).of(o.loc) + ' (' + o.loc + ')'; } catch (e) {}
      set('loc', name || 'Not known'); set('tls', (o.tls || 'Not known') + (o.http ? ', ' + o.http.toUpperCase() : ''));
    }).catch(function () { set('loc', 'Could not read it'); set('tls', 'Could not read it'); });

    var c = n.connection || n.mozConnection || n.webkitConnection, tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
    var off = -new Date().getTimezoneOffset(), sign = off < 0 ? '-' : '+', ao = Math.abs(off);
    var rowsB = [['Browser', ua.browser + (ua.major ? ' ' + ua.major : '')], ['System', ua.os], ['Kind of device', ua.device + (n.maxTouchPoints > 0 ? ', touch screen' : '')],
      ['Languages', (n.languages && n.languages.length ? n.languages.join(', ') : n.language) || 'Not shared'],
      ['Time zone', (tz || 'Not shared') + ' (UTC' + sign + ('0' + Math.floor(ao / 60)).slice(-2) + ':' + ('0' + ao % 60).slice(-2) + ')'],
      ['Cookies', n.cookieEnabled ? 'Allowed' : 'Blocked'],
      ['"Do not track" signal', n.globalPrivacyControl ? 'Global Privacy Control is on' : n.doNotTrack === '1' ? 'On' : 'Off or not set']];
    var rowsS = [['Screen', screen.width + ' × ' + screen.height + ' pixels'], ['Page area (viewport)', window.innerWidth + ' × ' + window.innerHeight + ' pixels'],
      ['Pixel ratio', String(Math.round((window.devicePixelRatio || 1) * 100) / 100)], ['Colour depth', screen.colorDepth + ' bit'],
      ['Colour scheme asked for', matchMedia('(prefers-color-scheme:dark)').matches ? 'Dark' : 'Light'],
      ['Processor threads', n.hardwareConcurrency ? String(n.hardwareConcurrency) : 'Not shared'],
      ['Memory (rounded by the browser)', n.deviceMemory ? n.deviceMemory + ' GB or more' : 'Not shared by this browser']];
    var rowsC = [['Online', n.onLine ? 'Yes' : 'No'], ['Connection quality (browser estimate)', c && c.effectiveType ? c.effectiveType.toUpperCase() + '-like' : 'Not shared by this browser'],
      ['Speed estimate', c && c.downlink ? c.downlink + ' Mbps (a rough figure, capped by the browser)' : 'Not shared by this browser'],
      ['Round trip estimate', c && typeof c.rtt === 'number' ? c.rtt + ' ms' : 'Not shared by this browser'],
      ['Data saver', c && typeof c.saveData === 'boolean' ? (c.saveData ? 'On' : 'Off') : 'Not shared by this browser'],
      ['Connection type', c && c.type ? c.type : 'Not shared by this browser']];
    show($('#me-browser'), facts(rowsB)); show($('#me-screen'), facts(rowsS)); show($('#me-conn'), facts(rowsC));
    $('#me-ua').textContent = n.userAgent;
    $('#copyall').addEventListener('click', function () {
      var t = ['IPv4: ' + (copyText.ip4 || ''), 'IPv6: ' + (copyText.ip6 || ''), 'Country seen: ' + (copyText.loc || ''), 'Security: ' + (copyText.tls || '')]
        .concat(rowsB.concat(rowsS, rowsC).map(function (r) { return r[0] + ': ' + r[1]; })).concat(['User agent: ' + n.userAgent]).join('\n');
      S.copy(t, 'Details copied');
    });
    window.addEventListener('resize', function () { rowsS[1][1] = window.innerWidth + ' × ' + window.innerHeight + ' pixels'; show($('#me-screen'), facts(rowsS)); });
  })();

  /* ---------- subnet calculator ---------- */
  var sub = $('[data-tool=subnet]');
  if (sub) (function () {
    var ipEl = $('#s-ip'), pEl = $('#s-prefix'), out = $('#s-out');
    for (var p = 32; p >= 1; p--) { var o = d.createElement('option'); o.value = p; o.textContent = '/' + p + '  (' + IP.str(IP.mask(p)) + ')'; if (p === 24) o.selected = true; pEl.appendChild(o); }
    function run() {
      var raw = ipEl.value.trim(), m = /^(.*?)\/(\d{1,2})$/.exec(raw);
      if (m && +m[2] >= 1 && +m[2] <= 32) { raw = m[1]; pEl.value = +m[2]; }
      var ip = IP.v4(raw);
      if (ip === null) { show(out, '<p><b>That is not a valid IPv4 address.</b> Type four numbers from 0 to 255 with dots between them, for example 192.168.1.10.</p>'); return; }
      var pr = +pEl.value, r = IP.subnet(ip, pr), k = IP.kind(ip);
      show(out, '<h2>' + S.esc(IP.str(r.net) + '/' + pr) + '</h2>' + facts([
        ['Network address', IP.str(r.net), 1], ['Subnet mask', IP.str(r.mask), 1], ['Wildcard mask', IP.str(r.wild), 1],
        ['First usable address', IP.str(r.first), 1], ['Last usable address', IP.str(r.last), 1], ['Broadcast address', pr >= 31 ? 'None (a /' + pr + ' has no broadcast address)' : IP.str(r.bc), pr < 31],
        ['Addresses in the block', num(r.total)], ['Usable for devices', num(r.usable)], ['Kind of address', k.name + (k.range ? ' (' + k.range + ')' : '')], ['Old class', IP.cls(ip)],
        ['Address in binary', IP.bin(ip), 1], ['Mask in binary', IP.bin(r.mask), 1]]) +
        '<div class="acts"><button class="btn sm" type="button" data-copy="' + S.esc('Network ' + IP.str(r.net) + '/' + pr + ', mask ' + IP.str(r.mask) + ', hosts ' + IP.str(r.first) + ' to ' + IP.str(r.last) + ', broadcast ' + IP.str(r.bc)) + '">Copy result</button></div>');
    }
    $('#s-go').addEventListener('click', run); pEl.addEventListener('change', run);
    ipEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    run();
  })();

  /* ---------- IP converter ---------- */
  var cv = $('[data-tool=convert]');
  if (cv) (function () {
    var inp = $('#c-in'), out = $('#c-out');
    function run() {
      var raw = inp.value.trim(), n = IP.v4(raw), from = 'address';
      if (n === null && /^\d{1,10}$/.test(raw) && +raw <= 4294967295) { n = +raw; from = 'number'; }
      if (n === null && /^0x[0-9a-f]{1,8}$/i.test(raw)) { n = parseInt(raw, 16); from = 'hex'; }
      if (n === null) { show(out, '<p><b>Type an IPv4 address</b> such as 192.168.1.1, a whole number from 0 to 4294967295, or a hex value such as 0xC0A80101.</p>'); return; }
      show(out, '<h2>' + S.esc(IP.str(n)) + '</h2>' + facts([['Dotted decimal', IP.str(n), 1], ['Whole number (decimal)', String(n), 1], ['Hexadecimal', '0x' + ('00000000' + n.toString(16).toUpperCase()).slice(-8), 1],
        ['Binary', IP.bin(n), 1], ['Octal', '0' + n.toString(8), 1], ['IPv4-mapped IPv6', '::ffff:' + IP.str(n), 1], ['Kind of address', IP.kind(n).name]]) +
        '<p class="hint">Read as ' + (from === 'address' ? 'a dotted address' : from === 'hex' ? 'a hexadecimal number' : 'a whole number') + '.</p>');
    }
    $('#c-go').addEventListener('click', run); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    run();
  })();

  /* ---------- check an address ---------- */
  var ck = $('[data-tool=check]');
  if (ck) (function () {
    var inp = $('#k-in'), out = $('#k-out');
    function run() {
      var raw = inp.value.trim(), n = IP.v4(raw);
      if (n !== null) {
        var k = IP.kind(n);
        show(out, '<h2>' + S.esc(IP.str(n)) + ' is ' + (/^[aeiou]/i.test(k.name) ? 'an ' : 'a ') + S.esc(k.name.charAt(0).toLowerCase() + k.name.slice(1)) + ' IPv4 address</h2><p>' + S.esc(k.note) + '</p>' +
          facts([['Version', 'IPv4'], ['Range it belongs to', k.range || 'Public internet space'], ['Reachable from the internet', k.name === 'Public' ? 'Yes, unless a firewall blocks it' : 'No'], ['Old class', IP.cls(n)]]));
        return;
      }
      var g = IP.v6(raw);
      if (g) {
        var k6 = IP.kind6(g);
        show(out, '<h2>' + S.esc(IP.v6short(g)) + ' is ' + (/^[aeiou]/i.test(k6[0]) ? 'an ' : 'a ') + S.esc(k6[0].charAt(0).toLowerCase() + k6[0].slice(1)) + ' IPv6 address</h2><p>' + S.esc(k6[1]) + '</p>' +
          facts([['Version', 'IPv6'], ['Short form', IP.v6short(g), 1], ['Full form', IP.v6full(g), 1]]));
        return;
      }
      show(out, '<p><b>' + S.esc(raw || 'That') + ' is not a valid IP address.</b> An IPv4 address is four numbers from 0 to 255 with dots (203.0.113.7). An IPv6 address is up to eight groups of hex digits with colons (2001:db8::1).</p>');
    }
    $('#k-go').addEventListener('click', run); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    d.querySelectorAll('[data-try]').forEach(function (b) { b.addEventListener('click', function () { inp.value = b.getAttribute('data-try'); run(); }); });
    run();
  })();

  /* ---------- IPv6 expand and shorten ---------- */
  var v6 = $('[data-tool=v6]');
  if (v6) (function () {
    var inp = $('#v-in'), out = $('#v-out');
    function run() {
      var g = IP.v6(inp.value);
      if (!g) { show(out, '<p><b>That is not a valid IPv6 address.</b> Use hex digits (0 to 9, a to f) in groups of up to four, with colons between groups, and "::" at most once. Example: 2001:db8:0:0:0:0:0:1</p>'); return; }
      var k = IP.kind6(g);
      show(out, '<h2>' + S.esc(IP.v6short(g)) + '</h2>' + facts([['Short form', IP.v6short(g), 1], ['Full form', IP.v6full(g), 1], ['Kind of address', k[0]],
        ['First 64 bits (network part)', IP.v6short(g.slice(0, 4).concat([0, 0, 0, 0])) + '/ipstats/64', 1]]) + '<p>' + S.esc(k[1]) + '</p>' +
        '<div class="acts"><button class="btn sm" type="button" data-copy="' + S.esc(IP.v6short(g)) + '">Copy short form</button><button class="btn sm ghost" type="button" data-copy="' + S.esc(IP.v6full(g)) + '">Copy full form</button></div>');
    }
    $('#v-go').addEventListener('click', run); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    run();
  })();

  /* ---------- download time ---------- */
  var dl = $('[data-tool=dltime]');
  if (dl) (function () {
    var size = $('#d-size'), unit = $('#d-unit'), sp = $('#d-speed'), su = $('#d-sunit'), out = $('#d-out');
    function run() {
      var s = parseFloat(size.value), v = parseFloat(sp.value);
      if (!(s > 0) || !(v > 0)) { show(out, '<p><b>Type a file size and a speed, both more than zero.</b></p>'); return; }
      var bytes = s * { KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12 }[unit.value], bps = v * { Kbps: 1e3, Mbps: 1e6, Gbps: 1e9, 'MB/s': 8e6 }[su.value], sec = bytes * 8 / bps;
      var mbps = bps / 1e6;
      show(out, '<h2>About ' + S.esc(IP.dur(sec)) + '</h2>' + facts([['File size', s + ' ' + unit.value + ' (' + num(Math.round(bytes / 1e6 * 100) / 100) + ' MB)'], ['Speed', (Math.round(mbps * 100) / 100) + ' Mbps = ' + (Math.round(mbps / 8 * 100) / 100) + ' MB each second'],
        ['Data moved in one minute', num(Math.round(mbps / 8 * 60 * 10) / 10) + ' MB'], ['Data moved in one hour', num(Math.round(mbps / 8 * 3600 / 1000 * 100) / 100) + ' GB']]) +
        '<p class="hint">This is the time at a steady speed. Real downloads are usually a little slower: speed rises and falls, and other devices share the line.</p>');
    }
    [size, unit, sp, su].forEach(function (e) { e.addEventListener('input', run); e.addEventListener('change', run); });
    run();
  })();

  /* ---------- user agent ---------- */
  var uaT = $('[data-tool=ua]');
  if (uaT) (function () {
    var inp = $('#u-in'), out = $('#u-out');
    inp.value = navigator.userAgent;
    function run() {
      var u = inp.value.trim();
      if (!u) { show(out, '<p><b>Paste a user agent line, or tap "Use mine".</b></p>'); return; }
      var r = IP.ua(u);
      show(out, '<h2>' + S.esc(r.browser + (r.major ? ' ' + r.major : '')) + ' on ' + S.esc(r.os) + '</h2>' + facts([['Browser', r.browser], ['Full version in the line', r.version || 'Not stated'], ['System', r.os], ['Kind of device', r.device], ['Engine', r.engine]]) +
        (/ipstats/Windows NT 10\.0/.test(u) ? '<p class="hint">The line says "Windows NT 10.0" on both Windows 10 and Windows 11, so a user agent alone cannot tell the two apart.</p>' : '') +
        (/ipstats/Mac OS X 10_15_7/.test(u) ? '<p class="hint">Browsers on a Mac have kept the text "Mac OS X 10_15_7" for years, whatever the real macOS version is.</p>' : ''));
    }
    $('#u-go').addEventListener('click', run);
    $('#u-mine').addEventListener('click', function () { inp.value = navigator.userAgent; run(); });
    run();
  })();

  /* ---------- screen ---------- */
  var sc = $('[data-tool=screen]');
  if (sc) (function () {
    var out = $('#sc-out');
    function run() {
      var dpr = window.devicePixelRatio || 1, o = (screen.orientation && screen.orientation.type) || (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
      show(out, '<h2>' + screen.width + ' × ' + screen.height + '</h2>' + facts([['Screen size (CSS pixels)', screen.width + ' × ' + screen.height], ['Real pixels (size × pixel ratio)', Math.round(screen.width * dpr) + ' × ' + Math.round(screen.height * dpr)],
        ['Pixel ratio', String(Math.round(dpr * 100) / 100)], ['Page area now (viewport)', window.innerWidth + ' × ' + window.innerHeight], ['Space the system leaves for windows', screen.availWidth + ' × ' + screen.availHeight],
        ['Colour depth', screen.colorDepth + ' bit'], ['Direction', /portrait/.test(o) ? 'Portrait (upright)' : 'Landscape (sideways)'], ['Touch points', String(navigator.maxTouchPoints || 0)],
        ['Colour scheme asked for', matchMedia('(prefers-color-scheme:dark)').matches ? 'Dark' : 'Light'], ['Less motion asked for', matchMedia('(prefers-reduced-motion:reduce)').matches ? 'Yes' : 'No']]) +
        '<p class="hint">Turn the phone or resize the window: the figures change as you do.</p>');
    }
    window.addEventListener('resize', run); run();
  })();

  /* ---------- response time test ---------- */
  var lt = $('[data-tool=latency]');
  if (lt) (function () {
    var out = $('#l-out'), btn = $('#l-go'), busy = false;
    btn.addEventListener('click', function () {
      if (busy) return; busy = true; btn.textContent = 'Testing...';
      var times = [], i = 0, total = 10;
      function one() {
        var t0 = performance.now();
        fetch('/ipstats/robots.txt?t=' + Date.now() + '-' + i, { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function () {
          var t = performance.now() - t0; if (i > 0) times.push(t);     // the first request also opens the connection, so it is left out
          show(out, '<p>Request ' + (i + 1) + ' of ' + total + ': ' + Math.round(t) + ' ms</p>');
          if (++i < total) setTimeout(one, 150); else done();
        }).catch(function () { busy = false; btn.textContent = 'Start the test'; show(out, '<p><b>The test could not reach the site.</b> You may be offline. Check the connection and try again.</p>'); });
      }
      function done() {
        var s = times.slice().sort(function (a, b) { return a - b; }), med = s[Math.floor(s.length / 2)], j = 0;
        for (var k = 1; k < times.length; k++) j += Math.abs(times[k] - times[k - 1]);
        j = j / (times.length - 1);
        var word = med < 60 ? 'Very quick' : med < 150 ? 'Good' : med < 300 ? 'Fair' : 'Slow';
        show(out, '<h2>' + Math.round(med) + ' ms: ' + word + '</h2>' + facts([['Typical (median) response', Math.round(med) + ' ms'], ['Fastest', Math.round(s[0]) + ' ms'], ['Slowest', Math.round(s[s.length - 1]) + ' ms'],
          ['Jitter (average change between requests)', Math.round(j) + ' ms'], ['Requests measured', String(times.length)]]) +
          '<p class="hint">This is the time for a tiny request to go to this site\'s server and come back, measured by your browser. It is close to, but a little more than, a "ping".</p>');
        busy = false; btn.textContent = 'Test again';
      }
      one();
    });
  })();
})();
