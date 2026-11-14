/* dns.js: the page tools: DNS record lookup (DNS over HTTPS), domain record lookup (RDAP) and domain name check. Uses DnsCore.
   Privacy: the name you type is sent to the resolver (Cloudflare or Google) or to the registry's RDAP service that you see named on the page. Nothing goes to ShareYourGroup. */
(function () {
  'use strict';
  var d = document, C = window.DnsCore, S = window.SYG, root = d.querySelector('[data-dns]'); if (!root) return;
  var kind = root.getAttribute('data-dns'), out = root.querySelector('[data-out]'), inp = root.querySelector('[data-f=name]'), boot = null, bootP = null, seq = 0;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function err(m) { return '<div class="result bad" role="alert"><p>' + esc(m) + '</p></div>'; }
  function loadBoot() { if (!bootP) bootP = fetch('/dnscheck/data/rdap.json').then(function (r) { return r.json(); }).then(function (j) { boot = j; return j; }); return bootP; }
  function timeout(p, ms) { return new Promise(function (res, rej) { var t = setTimeout(function () { rej(new Error('No answer in ' + ms / 1000 + ' seconds.')); }, ms); p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); }); }); }
  function doh(provider, name, type) { return timeout(fetch(C.dohUrl(provider, name, type), { headers: { accept: 'application/dns-json' } }).then(function (r) { if (!r.ok) throw new Error('The resolver answered HTTP ' + r.status + '.'); return r.json(); }), 12000).then(C.parseDoh); }
  function rdap(name) {
    return loadBoot().then(function (b) {
      var t = C.tld(name), u = b.services[t]; if (!u) return { nosvc: true, tld: t };
      var url = u[0].replace(/\/$/, '') + '/domain/' + name;
      return timeout(fetch(url, { headers: { accept: 'application/rdap+json' } }), 15000).then(function (r) {
        if (r.status === 404) return { notfound: true, svc: u[0], tld: t };
        if (!r.ok) throw new Error('The registry answered HTTP ' + r.status + '.');
        return r.json().then(function (j) { return { rec: C.parseRdap(j), svc: u[0], tld: t }; });
      });
    });
  }
  function recTable(rows) {
    return '<div class="tbl"><table class="stack"><thead><tr><th>Name</th><th>Type</th><th>Value</th><th>TTL</th></tr></thead><tbody>' + rows.map(function (a) {
      return '<tr><td data-l="Name">' + esc(a.name) + '</td><td data-l="Type">' + esc(a.type) + '</td><td data-l="Value"><code>' + (a.pref !== undefined ? a.pref + ' ' : '') + esc(a.text) + '</code></td><td data-l="TTL">' + esc(C.ttlText(a.ttl)) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function runDns() {
    var my = ++seq, name, type = root.querySelector('[data-f=type]').value, prov = root.querySelector('[data-f=prov]').value;
    try { name = C.normalize(inp.value); } catch (e) { out.innerHTML = inp.value.trim() ? err(e.message) : ''; return; }
    var types = type === 'ALL' ? ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'CAA', 'SOA'] : [type];
    out.innerHTML = '<p class="hint">Asking ' + (prov === 'google' ? 'Google Public DNS' : 'Cloudflare 1.1.1.1') + ' about ' + esc(name) + '...</p>';
    Promise.all(types.map(function (t) { return doh(prov, name, t).then(function (r) { return { t: t, r: r }; }, function (e) { return { t: t, e: e }; }); })).then(function (rs) {
      if (my !== seq) return;
      var h = '<div class="result"><h2>' + esc(name) + '</h2>';
      var anyErr = rs.filter(function (x) { return x.e; });
      var rows = []; rs.forEach(function (x) { if (x.r) rows = rows.concat(x.r.answers.filter(function (a) { return a.type === x.t || type === 'ALL' || true; })); });
      var seen = {}; rows = rows.filter(function (a) { var k = a.name + '|' + a.type + '|' + a.raw; if (seen[k]) return false; seen[k] = 1; return true; });
      var first = rs.filter(function (x) { return x.r; })[0];
      if (anyErr.length === rs.length) { out.innerHTML = err('The lookup failed: ' + anyErr[0].e.message + ' Check your connection, or try the other resolver.'); return; }
      if (first && first.r.status !== 0) h += '<p><b>' + esc(first.r.statusText) + '</b></p>';
      if (rows.length) h += recTable(rows);
      else if (!first || first.r.status === 0) h += '<p>No ' + esc(types.join(', ')) + ' records for this name. The name exists, but has none of the type you asked for.</p>';
      if (first && first.r.dnssec) h += '<p class="hint">The resolver says the answer passed DNSSEC validation (the AD flag).</p>';
      h += '<p class="hint">Answered by ' + (prov === 'google' ? 'Google Public DNS (dns.google)' : 'Cloudflare (cloudflare-dns.com)') + ' over HTTPS. Resolvers keep answers for the TTL, so a record you changed a moment ago may still show its old value.</p></div>';
      out.innerHTML = h;
    });
  }
  function runDomain() {
    var my = ++seq, name; try { name = C.normalize(inp.value); } catch (e) { out.innerHTML = inp.value.trim() ? err(e.message) : ''; return; }
    out.innerHTML = '<p class="hint">Asking the registry...</p>';
    rdap(name).then(function (r) {
      if (my !== seq) return;
      if (r.nosvc) { out.innerHTML = '<div class="result"><p>The registry of .' + esc(r.tld) + ' has no public RDAP service in the IANA list, so this tool cannot look it up.</p></div>'; return; }
      if (r.notfound) { out.innerHTML = '<div class="result"><h2>' + esc(name) + '</h2><p>The registry has no record of this name. It may be unregistered, or it may be a name the registry does not allow, or a subdomain (RDAP knows registered domains, not their subdomains).</p><p class="hint">Registry service: ' + esc(r.svc) + '</p></div>'; return; }
      var x = r.rec, dl = C.daysLeft(x.expires), h = '<div class="result"><h2>' + esc(x.name) + '</h2><dl class="facts">';
      if (x.registrar) h += '<dt>Registrar</dt><dd>' + esc(x.registrar) + '</dd>';
      if (x.registered) h += '<dt>Registered</dt><dd>' + esc(x.registered.slice(0, 10)) + '</dd>';
      if (x.expires) h += '<dt>Expires</dt><dd>' + esc(x.expires.slice(0, 10)) + (dl !== null ? ' (' + (dl >= 0 ? dl + ' days from now' : -dl + ' days ago') + ')' : '') + '</dd>';
      if (x.changed) h += '<dt>Last changed</dt><dd>' + esc(x.changed.slice(0, 10)) + '</dd>';
      if (x.nameservers.length) h += '<dt>Name servers</dt><dd>' + x.nameservers.map(function (n) { return '<code>' + esc(n) + '</code>'; }).join(' ') + '</dd>';
      if (x.dnssec !== null) h += '<dt>DNSSEC</dt><dd>' + (x.dnssec ? 'signed' : 'not signed') + '</dd>';
      h += '</dl>';
      if (x.status.length) h += '<h3>Status</h3><ul>' + x.status.map(function (s) { return '<li><code>' + esc(s) + '</code>' + (C.statusText(s) ? ': ' + esc(C.statusText(s)) : '') + '</li>'; }).join('') + '</ul>';
      h += '<p class="hint">Source: the RDAP service of the .' + esc(r.tld) + ' registry (' + esc(r.svc) + '). Personal details of owners are usually hidden by registries.</p></div>';
      out.innerHTML = h;
    }, function (e) { if (my === seq) out.innerHTML = err('The lookup failed: ' + e.message + ' Some registries are busy or limit requests; try again in a minute.'); });
  }
  var TLDS = ['com', 'net', 'org', 'in', 'dev', 'app', 'info', 'biz', 'xyz', 'online', 'site', 'tech', 'store'];
  function runAvail() {
    var my = ++seq, base = (inp.value || '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split(/[\/.]/)[0];
    if (!base) { out.innerHTML = ''; return; }
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(base) || base.length > 63) { out.innerHTML = err('Type one word, with letters, digits and hyphens only (not at the start or the end), for example mybrand.'); return; }
    out.innerHTML = '<p class="hint">Asking the registries...</p>';
    loadBoot().then(function (b) {
      var list = TLDS.filter(function (t) { return b.services[t]; });
      return Promise.all(list.map(function (t) { return rdap(base + '.' + t).then(function (r) { return { t: t, r: r }; }, function (e) { return { t: t, e: e }; }); }));
    }).then(function (rs) {
      if (my !== seq) return;
      var rows = rs.map(function (x) {
        var st = x.e ? 'could not check' : x.r.notfound ? 'no registration record' : x.r.rec ? 'registered' : 'unknown';
        var cls = x.e ? 'note' : x.r.notfound ? 'good' : 'bad', extra = x.r && x.r.rec ? ' until ' + x.r.rec.expires.slice(0, 10) : '';
        return '<li class="' + cls + '"><span class="tag">' + (x.e ? '?' : x.r.notfound ? 'Free?' : 'Taken') + '</span> <b>' + esc(base + '.' + x.t) + '</b>: ' + st + esc(extra) + '</li>';
      }).join('');
      out.innerHTML = '<div class="result"><ul class="checks">' + rows + '</ul><p class="hint">"No registration record" means the registry has nothing under that name. A name can still be reserved, blocked or priced as premium, so confirm at a registrar before you plan around it. Some registries do not offer RDAP and are not listed. A question mark means the check could not be completed in your browser: try again, or try another browser.</p></div>';
    }, function (e) { if (my === seq) out.innerHTML = err('The check failed: ' + e.message); });
  }
  var run = kind === 'dns' ? runDns : kind === 'domain' ? runDomain : runAvail, tm = null;
  function later() { clearTimeout(tm); tm = setTimeout(run, 450); }
  root.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); clearTimeout(tm); run(); });
  root.querySelectorAll('select').forEach(function (s) { s.addEventListener('change', run); });
  root.querySelectorAll('[data-preset]').forEach(function (b) { b.addEventListener('click', function () { inp.value = b.getAttribute('data-preset'); run(); }); });
  var m = location.hash.match(/^#q=(.*)/); if (m) { inp.value = decodeURIComponent(m[1]); run(); }
  d.querySelectorAll('pre.code[data-static]').forEach(function (pre) { var b = d.createElement('button'); b.type = 'button'; b.className = 'copy'; b.textContent = 'Copy'; b.addEventListener('click', function () { S.copy(pre.querySelector('code').textContent, 'Copied'); }); pre.appendChild(b); });
})();
