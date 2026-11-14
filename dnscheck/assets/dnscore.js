/* dnscore.js: DNS-over-HTTPS answers (Cloudflare and Google JSON formats) and RDAP domain records (RFC 9083) turned into plain facts.
   Browser: window.DnsCore. Node: module.exports. Tested by test_dns.py against recorded answers and against nslookup. Network calls are in dns.js, not here. */
(function (root) {
  'use strict';
  var TYPES = { A: 1, NS: 2, CNAME: 5, SOA: 6, MX: 15, TXT: 16, AAAA: 28, SRV: 33, CAA: 257, DS: 43, DNSKEY: 48, PTR: 12, HTTPS: 65 };
  var NAMES = {}; Object.keys(TYPES).forEach(function (k) { NAMES[TYPES[k]] = k; });
  var RCODE = { 0: 'NOERROR (the name exists and the answer is below)', 1: 'FORMERR (the resolver could not read the question)', 2: 'SERVFAIL (the resolver could not get a valid answer: a broken or unreachable name server, or a failed DNSSEC check)', 3: 'NXDOMAIN (this name does not exist)', 4: 'NOTIMP', 5: 'REFUSED (the resolver refused to answer)' };
  /* Accepts "example.com", "https://Example.com/path?x", "user@example.com", "bücher.de"; returns the ASCII host name or throws */
  function normalize(input) {
    var s = String(input || '').trim();
    if (!s) throw new Error('Type a domain name such as example.com.');
    s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^.*@/, '').split(/[\/?#]/)[0].replace(/:\d+$/, '').replace(/\.$/, '');
    if (/\s/.test(s) || !s) throw new Error('A domain name has no spaces.');
    var h; try { h = new URL('http://' + s).hostname; } catch (e) { throw new Error('"' + s + '" is not a valid domain name.'); }
    h = h.toLowerCase().replace(/\.$/, '');
    if (h.length > 253 || h.split('.').some(function (l) { return !l || l.length > 63; })) throw new Error('A domain name may be at most 253 characters, and each part at most 63.');
    if (!/^[a-z0-9_.-]+$/.test(h)) throw new Error('"' + h + '" has characters that are not allowed in a domain name.');
    if (h.split('.').some(function (l) { return !/^[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?$/.test(l); })) throw new Error('A part of a domain name may not start or end with a hyphen, and may only have letters, digits and hyphens.');
    return h;
  }
  function dohUrl(provider, name, type) {
    var t = encodeURIComponent(type), n = encodeURIComponent(name);
    return provider === 'google' ? 'https://dns.google/resolve?name=' + n + '&type=' + t : 'https://cloudflare-dns.com/dns-query?name=' + n + '&type=' + t;
  }
  function unquoteTxt(s) { var parts = String(s).match(/"((?:[^"\\]|\\.)*)"/g); return parts ? parts.map(function (p) { return p.slice(1, -1).replace(/\\(.)/g, '$1'); }).join('') : String(s); }
  function record(a) {
    var t = NAMES[a.type] || ('TYPE' + a.type), d = String(a.data || ''), r = { name: a.name.replace(/\.$/, ''), type: t, ttl: a.TTL, raw: d, text: d };
    if (t === 'TXT') r.text = unquoteTxt(d);
    else if (t === 'MX') { var m = /^(\d+)\s+(\S+)$/.exec(d); if (m) { r.pref = +m[1]; r.text = m[2].replace(/\.$/, ''); } }
    else if (t === 'CNAME' || t === 'NS' || t === 'PTR') r.text = d.replace(/\.$/, '');
    else if (t === 'SOA') { var s = d.split(/\s+/); if (s.length >= 7) r.text = 'primary ' + s[0].replace(/\.$/, '') + ', serial ' + s[2] + ', refresh ' + s[3] + 's, retry ' + s[4] + 's, expire ' + s[5] + 's, minimum ' + s[6] + 's'; }
    return r;
  }
  function parseDoh(j) {
    if (!j || typeof j.Status !== 'number') throw new Error('The resolver did not answer in the expected format.');
    var ans = (j.Answer || []).map(record), aut = (j.Authority || []).map(record);
    return { status: j.Status, statusText: RCODE[j.Status] || ('RCODE ' + j.Status), answers: ans, authority: aut, dnssec: !!j.AD, truncated: !!j.TC };
  }
  function ttlText(s) { s = +s; return s >= 86400 ? Math.round(s / 86400 * 10) / 10 + ' days' : s >= 3600 ? Math.round(s / 3600 * 10) / 10 + ' hours' : s >= 60 ? Math.round(s / 60 * 10) / 10 + ' minutes' : s + ' seconds'; }
  /* RDAP (RFC 9083) domain object -> plain summary */
  function parseRdap(j) {
    if (!j || j.objectClassName !== 'domain') throw new Error('The registry did not answer with a domain record.');
    var ev = {}; (j.events || []).forEach(function (e) { ev[e.eventAction] = e.eventDate; });
    var reg = null;
    (function walk(es) { (es || []).forEach(function (e) { if ((e.roles || []).indexOf('registrar') > -1 && !reg) { var v = e.vcardArray && e.vcardArray[1] ? e.vcardArray[1].filter(function (x) { return x[0] === 'fn'; })[0] : null; reg = v ? v[3] : (e.handle || ''); } walk(e.entities); }); })(j.entities);
    return { name: (j.ldhName || '').toLowerCase(), status: j.status || [], registered: ev.registration || '', expires: ev.expiration || '', changed: ev['last changed'] || '', registrar: reg || '', nameservers: (j.nameservers || []).map(function (n) { return (n.ldhName || '').toLowerCase(); }), dnssec: j.secureDNS ? !!j.secureDNS.delegationSigned : null };
  }
  var STATUS = {
    'client transfer prohibited': 'The registrar has locked the domain against transfer to another registrar.', 'client delete prohibited': 'The registrar has locked the domain against deletion.', 'client update prohibited': 'The registrar has locked the domain against changes.',
    'server transfer prohibited': 'The registry has locked the domain against transfer.', 'server delete prohibited': 'The registry has locked the domain against deletion.', 'server update prohibited': 'The registry has locked the domain against changes.',
    'active': 'The domain is registered and active.', 'ok': 'The domain is registered and active.', 'pending delete': 'The domain is going to be deleted soon.', 'redemption period': 'The domain expired and may still be restored by its owner for a fee.', 'client hold': 'The registrar has taken the domain out of the DNS: it does not resolve.', 'server hold': 'The registry has taken the domain out of the DNS: it does not resolve.', 'inactive': 'The domain has no name servers set and does not resolve.' };
  function statusText(s) { return STATUS[String(s).toLowerCase()] || ''; }
  function daysLeft(iso, now) { var t = Date.parse(iso); return isNaN(t) ? null : Math.floor((t - (now || Date.now())) / 86400000); }
  function tld(name) { var p = name.split('.'); return p[p.length - 1]; }
  var api = { TYPES: TYPES, normalize: normalize, dohUrl: dohUrl, parseDoh: parseDoh, parseRdap: parseRdap, statusText: statusText, ttlText: ttlText, daysLeft: daysLeft, tld: tld, unquoteTxt: unquoteTxt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DnsCore = api;
})(typeof window !== 'undefined' ? window : this);
