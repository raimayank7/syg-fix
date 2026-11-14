/* net.js: the calculators and the port search. Everything runs in the browser; nothing typed is sent anywhere. Uses NetCore (netcore.js). */
(function () {
  'use strict';
  var d = document, N = window.NetCore, S = window.SYG;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function row(k, v) { return '<dt>' + esc(k) + '</dt><dd>' + v + '</dd>'; }
  function code(v) { return '<code>' + esc(v) + '</code>'; }
  function err(m) { return '<div class="result bad" role="alert"><p>' + esc(m) + '</p></div>'; }
  var SP4 = (window.NET_SPECIAL && window.NET_SPECIAL.v4) || [], SP6 = (window.NET_SPECIAL && window.NET_SPECIAL.v6) || [];

  /* parse "a.b.c.d/n", "a.b.c.d n", "a.b.c.d 255.255.255.0", or a bare address (then /32) */
  function in4(t) {
    t = t.trim().replace(/\s+/g, ' ');
    var m = /^([\d.]+)(?:\s*\/\s*(\d{1,2})|\s+([\d.]+))?$/.exec(t); if (!m) return null;
    var ip = N.parse4(m[1]); if (ip === null) return null;
    var p = 32;
    if (m[2] !== undefined) { p = +m[2]; if (p > 32) return null; }
    else if (m[3] !== undefined) { p = N.prefixFromMask4(m[3]); if (p === null) { var inv = N.parse4(m[3]); if (inv !== null) { var w = N.prefixFromMask4(N.fmt4(~inv & 0xffffffffn)); if (w !== null) p = w; } } if (p === null) return null; }
    return { ip: ip, p: p };
  }
  function in6(t) {
    var m = /^([0-9a-fA-F:.]+)(?:\s*\/\s*(\d{1,3}))?$/.exec(t.trim()); if (!m) return null;
    var ip = N.parse6(m[1]); if (ip === null) return null;
    var p = m[2] === undefined ? 128 : +m[2]; if (p > 128) return null;
    return { ip: ip, p: p };
  }
  function kind4(ip) {
    var s = N.special4(ip, SP4);
    var first = Number(ip >> 24n);
    if (s) return s[2] + ' (IANA special-purpose registry)';
    if (first >= 224 && first <= 239) return 'Multicast (224.0.0.0/4)';
    return 'Public: not in the IANA special-purpose registry';
  }
  function kind6(ip) {
    var best = null;
    SP6.forEach(function (x) { if (N.contains(BigInt(x[0]), x[1], ip, 128) && (!best || x[1] > best[1])) best = x; });
    if (best) return best[2] + ' (IANA special-purpose registry)';
    if (N.contains(0xff00n << 112n, 8, ip, 128)) return 'Multicast (ff00::/8)';
    return 'Global or other: not in the IANA special-purpose registry';
  }
  function copyBtn(text) { return ' <button type="button" class="btn sm ghost" data-c="' + esc(text) + '">Copy</button>'; }

  var CALC = {
    v4: function (t) {
      var x = in4(t); if (!x) return err('Type an IPv4 address with a prefix or a mask, for example 192.168.1.130/26 or 10.0.5.9 255.255.255.0.');
      var n = N.net4(x.ip, x.p), s = '<div class="result"><h2>' + esc(N.fmt4(n.network)) + '/' + x.p + '</h2><dl class="facts">';
      s += row('Subnet mask', code(N.fmt4(n.mask)) + copyBtn(N.fmt4(n.mask)));
      s += row('Wildcard mask', code(N.fmt4(n.wildcard)));
      s += row('Network address', code(N.fmt4(n.network)) + copyBtn(N.fmt4(n.network)));
      s += row(x.p >= 31 ? 'Last address' : 'Broadcast address', code(N.fmt4(n.broadcast)));
      s += row('First usable host', code(N.fmt4(n.first)));
      s += row('Last usable host', code(N.fmt4(n.last)));
      s += row('Addresses in the block', N.digits(n.total));
      s += row('Usable hosts', N.digits(n.hosts) + (x.p === 31 ? ' (point-to-point link, RFC 3021)' : x.p === 32 ? ' (a single host)' : ''));
      s += row('Your address', code(N.fmt4(x.ip)) + ' ' + (x.ip === n.network && x.p < 31 ? '(this is the network address itself)' : x.ip === n.broadcast && x.p < 31 ? '(this is the broadcast address)' : ''));
      s += row('Type', esc(kind4(x.ip)));
      s += row('Historical class', esc(N.classOf(x.ip)) + ' <small>(classful addressing is no longer used)</small>');
      s += '</dl><h3>In binary</h3><pre class="code bin"><code>address  ' + N.bin4(x.ip) + '\nmask     ' + N.bin4(n.mask) + '\nnetwork  ' + N.bin4(n.network) + '</code></pre></div>';
      return s;
    },
    v6: function (t) {
      var x = in6(t); if (!x) return err('Type an IPv6 address with an optional prefix length, for example 2001:db8:abcd:12::1/64.');
      var n = N.net6(x.ip, x.p), s = '<div class="result"><h2>' + esc(N.compress6(n.network)) + '/' + x.p + '</h2><dl class="facts">';
      s += row('Your address, shortest form', code(N.compress6(x.ip)) + copyBtn(N.compress6(x.ip)));
      s += row('Your address, full form', code(N.expand6(x.ip)));
      s += row('Network (first address)', code(N.compress6(n.network)));
      s += row('Last address', code(N.compress6(n.last)));
      s += row('Addresses in the block', N.digits(n.total) + (n.total > 10n ** 12n ? ' <small>(about 10<sup>' + (n.total.toString().length - 1) + '</sup>)</small>' : ''));
      s += row('Number of /64 subnets', x.p <= 64 ? N.digits(1n << BigInt(64 - x.p)) : 'less than one /64');
      s += row('Type', esc(kind6(x.ip)));
      return s + '</dl></div>';
    },
    cidr: function (t) {
      t = t.trim();
      if (t.indexOf(':') > -1) { var y = in6(t); if (!y) return err('That is not a valid IPv6 block.'); var m = N.net6(y.ip, y.p); return '<div class="result"><h2>' + esc(N.compress6(m.first)) + ' to ' + esc(N.compress6(m.last)) + '</h2><p>' + N.digits(m.total) + ' addresses in ' + esc(N.compress6(m.network)) + '/' + y.p + '</p></div>'; }
      var x = in4(t); if (!x) return err('Type a CIDR block such as 203.0.113.0/24.');
      var n = N.net4(x.ip, x.p);
      return '<div class="result"><h2>' + esc(N.fmt4(n.network)) + ' to ' + esc(N.fmt4(n.broadcast)) + '</h2><p>' + N.digits(n.total) + ' addresses in <code>' + esc(N.fmt4(n.network)) + '/' + x.p + '</code>' + (x.p <= 30 ? '; usable hosts ' + esc(N.fmt4(n.first)) + ' to ' + esc(N.fmt4(n.last)) + '.' : '.') + '</p>' + (x.ip !== n.network ? '<p class="note">You typed ' + esc(N.fmt4(x.ip)) + ', which is inside the block. The block itself starts at ' + esc(N.fmt4(n.network)) + '.</p>' : '') + '</div>';
    },
    range: function (t) {
      var m = /^\s*([\d.]+)\s*(?:-|to|,|\s)\s*([\d.]+)\s*$/i.exec(t); if (!m) return err('Type two IPv4 addresses, for example 192.168.1.10 - 192.168.1.200.');
      var a = N.parse4(m[1]), b = N.parse4(m[2]); if (a === null || b === null) return err('One of the addresses is not a valid IPv4 address.');
      if (a > b) { var tmp = a; a = b; b = tmp; }
      var list = N.rangeToCidr(a, b, 32);
      return '<div class="result"><h2>' + list.length + ' CIDR block' + (list.length > 1 ? 's' : '') + '</h2><ul class="blocks">' + list.map(function (x) { return '<li>' + code(N.fmt4(x[0]) + '/' + x[1]) + ' <small>' + N.digits(1n << BigInt(32 - x[1])) + ' addresses</small></li>'; }).join('') + '</ul><p>' + N.digits(b - a + 1n) + ' addresses in all, from ' + esc(N.fmt4(a)) + ' to ' + esc(N.fmt4(b)) + '.</p>' + copyBtn(list.map(function (x) { return N.fmt4(x[0]) + '/' + x[1]; }).join('\n')).replace('Copy', 'Copy the list') + '</div>';
    },
    split: function (t, extra) {
      var x = in4(t); if (!x) return err('Type the network to divide, for example 192.168.10.0/24.');
      var np = +extra; if (!(np > x.p && np <= 32)) return err('The new prefix must be longer than /' + x.p + ' and at most /32.');
      var n = N.net4(x.ip, x.p), r = N.split(n.network, x.p, np, 32, 256), s = '<div class="result"><h2>' + N.digits(r.count) + ' subnets of /' + np + '</h2><p>Each has ' + N.digits(1n << BigInt(32 - np)) + ' addresses' + (np <= 30 ? ' and ' + N.digits((1n << BigInt(32 - np)) - 2n) + ' usable hosts' : '') + '.</p>';
      s += '<div class="tbl"><table class="stack"><thead><tr><th>#</th><th>Subnet</th><th>First host</th><th>Last host</th><th>Broadcast</th></tr></thead><tbody>' + r.blocks.map(function (b, i) { var q = N.net4(b, np); return '<tr><td data-l="#">' + (i + 1) + '</td><td data-l="Subnet">' + esc(N.fmt4(q.network)) + '/' + np + '</td><td data-l="First host">' + esc(N.fmt4(q.first)) + '</td><td data-l="Last host">' + esc(N.fmt4(q.last)) + '</td><td data-l="Broadcast">' + esc(N.fmt4(q.broadcast)) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      if (r.count > 256n) s += '<p class="hint">Only the first 256 of ' + N.digits(r.count) + ' subnets are listed.</p>';
      return s + '</div>';
    },
    contains: function (t, extra) {
      var c = in4(extra || ''), ip = N.parse4(t); if (!c) return err('Type a network such as 10.0.0.0/8 in the second box.'); if (ip === null) return err('Type the IPv4 address to test in the first box.');
      var n = N.net4(c.ip, c.p), yes = N.contains(n.network, c.p, ip, 32);
      return '<div class="result' + (yes ? '' : ' bad') + '"><h2>' + (yes ? 'Yes' : 'No') + '</h2><p><code>' + esc(N.fmt4(ip)) + '</code> is ' + (yes ? '' : '<b>not</b> ') + 'inside <code>' + esc(N.fmt4(n.network)) + '/' + c.p + '</code>, which runs from ' + esc(N.fmt4(n.network)) + ' to ' + esc(N.fmt4(n.broadcast)) + '.</p></div>';
    },
    mask: function (t) {
      t = t.trim(); var p = null;
      if (/^\/?\d{1,2}$/.test(t)) { p = +t.replace('/', ''); if (p > 32) p = null; }
      else { p = N.prefixFromMask4(t); if (p === null) { var inv = N.parse4(t); if (inv !== null) { var w = N.prefixFromMask4(N.fmt4(~inv & 0xffffffffn)); if (w !== null) p = w; } } }
      if (p === null) return err('Type a prefix length (24 or /24), a subnet mask (255.255.255.0) or a wildcard mask (0.0.0.255). A mask must be a run of ones followed by zeros.');
      var m = N.maskOf(32, p), total = 1n << BigInt(32 - p);
      return '<div class="result"><h2>/' + p + '</h2><dl class="facts">' + row('Subnet mask', code(N.fmt4(m))) + row('Wildcard mask', code(N.fmt4(~m & 0xffffffffn))) + row('Addresses', N.digits(total)) + row('Usable hosts', N.digits(p >= 31 ? (p === 31 ? 2n : 1n) : total - 2n)) + row('Mask in binary', code(N.bin4(m))) + '</dl></div>';
    }
  };

  d.querySelectorAll('[data-calc]').forEach(function (root) {
    var kind = root.getAttribute('data-calc'), a = root.querySelector('[data-a]'), b = root.querySelector('[data-b]'), out = root.querySelector('[data-out]');
    function run() {
      var v = a.value; if (!v.trim()) { out.innerHTML = ''; return; }
      out.innerHTML = CALC[kind](v, b ? b.value : undefined);
      out.querySelectorAll('[data-c]').forEach(function (btn) { btn.addEventListener('click', function () { S.copy(btn.getAttribute('data-c'), 'Copied'); }); });
      out.querySelectorAll('pre.code:not(.bin)').forEach(function () { /* copy buttons are made by data-c */ });
      try { history.replaceState(null, '', '#q=' + encodeURIComponent(v) + (b ? '&b=' + encodeURIComponent(b.value) : '')); } catch (e) { /* ignore */ }
    }
    var m = location.hash.match(/^#q=([^&]*)(?:&b=(.*))?/);
    if (m) { a.value = decodeURIComponent(m[1]); if (b && m[2] !== undefined) b.value = decodeURIComponent(m[2]); }
    a.addEventListener('input', run); if (b) b.addEventListener('input', run); if (b && b.tagName === 'SELECT') b.addEventListener('change', run);
    root.querySelectorAll('[data-preset]').forEach(function (btn) { btn.addEventListener('click', function () { a.value = btn.getAttribute('data-preset'); var pb = btn.getAttribute('data-b'); if (b && pb) b.value = pb; run(); }); });
    run();
  });

  /* port search over /data/ports.json: [port, protocols, name, description] */
  var ps = d.querySelector('[data-ports]');
  if (ps) {
    var box = ps.querySelector('input'), out2 = ps.querySelector('[data-found]'), data = null, tm;
    function show() {
      var q = box.value.trim().toLowerCase(); if (q.length < 1) { out2.innerHTML = '<p class="hint">Type a port number (443) or a name (ssh, mysql, mail).</p>'; return; }
      var hits = data.filter(function (r) { return String(r[0]) === q || r[2].toLowerCase().indexOf(q) > -1 || r[3].toLowerCase().indexOf(q) > -1; }).slice(0, 60);
      out2.innerHTML = hits.length ? '<div class="tbl"><table class="stack"><thead><tr><th>Port</th><th>Protocol</th><th>Name</th><th>Registered description</th></tr></thead><tbody>' + hits.map(function (r) { return '<tr><td data-l="Port">' + r[0] + '</td><td data-l="Protocol">' + esc(r[1]) + '</td><td data-l="Name">' + esc(r[2]) + '</td><td data-l="Description">' + esc(r[3]) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="note">No registered port matches. Many ports have no registration.</p>';
    }
    function go() { if (data) return show(); fetch('/subnet/data/ports.json').then(function (r) { return r.json(); }).then(function (j) { data = j; show(); }).catch(function () { out2.innerHTML = '<p class="note">The port list could not be loaded.</p>'; }); }
    box.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(go, 150); });
    var h = location.hash.match(/^#q=(.*)/); if (h) { box.value = decodeURIComponent(h[1]); go(); }
  }
  d.querySelectorAll('pre.code[data-static]').forEach(function (pre) {
    var b = d.createElement('button'); b.type = 'button'; b.className = 'copy'; b.textContent = 'Copy'; b.addEventListener('click', function () { S.copy(pre.querySelector('code').textContent, 'Copied'); }); pre.appendChild(b);
  });
})();
