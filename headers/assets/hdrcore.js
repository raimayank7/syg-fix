/* hdrcore.js: reads pasted HTTP response text (status line + headers) and explains each header, with plain good-practice checks.
   Browser: window.HdrCore. Node: module.exports. The checks are advice, not a security verdict. */
(function (root) {
  'use strict';
  var INFO = {
    'content-type': 'The format of the body (for example text/html; charset=utf-8). Browsers use it to decide how to show the data.',
    'content-length': 'The size of the body in bytes.',
    'content-encoding': 'How the body was compressed (gzip, br). The browser undoes it.',
    'cache-control': 'Rules for caches: how long a copy may be reused (max-age), or whether it may be stored at all (no-store).',
    'etag': 'A label for this version of the file. Browsers send it back in If-None-Match so the server can answer 304 when nothing changed.',
    'last-modified': 'When the file last changed. Used in If-Modified-Since checks.',
    'expires': 'An older way to say when a cached copy goes stale. Cache-Control: max-age takes priority.',
    'vary': 'Names the request headers that change the answer (for example Accept-Encoding), so caches keep separate copies.',
    'age': 'How many seconds a shared cache has held this copy.',
    'date': 'When the server made the response.',
    'location': 'The address to go to next (for redirects) or the address of a newly created item (201).',
    'set-cookie': 'Asks the browser to store a cookie. Attributes such as Secure, HttpOnly and SameSite control how it is used.',
    'www-authenticate': 'Says how to sign in. A 401 response must carry it.',
    'allow': 'The methods the address supports. A 405 response must carry it.',
    'retry-after': 'How long to wait before trying again (seconds or a date). Used with 429, 503 and some redirects.',
    'content-range': 'Which part of the file a 206 response carries, for example bytes 0-99/1000.',
    'accept-ranges': 'bytes means the server supports range requests (resumable downloads, video seeking).',
    'strict-transport-security': 'Tells browsers to use only https for this site for the given number of seconds (HSTS).',
    'content-security-policy': 'A list of rules about where scripts, images and other content may be loaded from.',
    'x-content-type-options': 'nosniff stops browsers from guessing a different content type than the one sent.',
    'x-frame-options': 'Controls whether other sites may show this page in a frame. Content-Security-Policy frame-ancestors is the newer way.',
    'referrer-policy': 'How much of the page address is sent along when a visitor follows a link.',
    'permissions-policy': 'Switches browser features (camera, location and so on) on or off for the page.',
    'access-control-allow-origin': 'CORS: which other sites\' scripts may read this response.',
    'access-control-allow-methods': 'CORS: which methods other sites may use.',
    'access-control-allow-headers': 'CORS: which request headers other sites may send.',
    'server': 'Names the server software. Exact version numbers help attackers, so many sites hide them.',
    'x-powered-by': 'Names the framework or language behind the site. Not needed by browsers.',
    'connection': 'Controls whether the connection is kept open (keep-alive) or closed.',
    'transfer-encoding': 'How the body is sent in pieces (chunked) when the length is not known in advance.',
    'upgrade': 'Offers or asks for a switch to another protocol.',
    'link': 'Related addresses, such as preloaded files or the canonical page.',
    'content-disposition': 'Suggests a file name and whether to show the file or download it.',
    'x-xss-protection': 'An old browser filter switch. Modern browsers ignore it; a good Content-Security-Policy replaces it.'
  };
  function parse(text) {
    var lines = String(text || '').replace(/\r/g, '').split('\n'), status = null, hs = [], i = 0, started = false;
    for (; i < lines.length; i++) {
      var l = lines[i];
      if (!l.trim()) { if (started) break; else continue; }
      var m = /^HTTP\/[\d.]+\s+(\d{3})\s*(.*)$/i.exec(l.trim());
      if (m && !started) { status = { code: +m[1], reason: m[2] }; started = true; continue; }
      var h = /^([A-Za-z0-9!#$%&'*+.^_`|~-]+)\s*:\s*(.*)$/.exec(l);
      if (h) { hs.push({ name: h[1], lname: h[1].toLowerCase(), value: h[2].trim() }); started = true; }
      else if (/^\s+\S/.test(l) && hs.length) hs[hs.length - 1].value += ' ' + l.trim();
    }
    return { status: status, headers: hs };
  }
  function get(p, n) { return p.headers.filter(function (h) { return h.lname === n; }); }
  function checks(p) {
    var out = [], c = p.status ? p.status.code : 0, ct = get(p, 'content-type')[0], cc = get(p, 'cache-control')[0];
    function add(level, msg) { out.push({ level: level, msg: msg }); }
    if (!p.headers.length) { add('bad', 'No headers found. Paste the response as it appears in your browser developer tools or from curl -i, starting with a line such as HTTP/1.1 200 OK.'); return out; }
    if (c >= 300 && c < 400 && c !== 304 && !get(p, 'location').length) add('bad', 'A ' + c + ' redirect should have a Location header that says where to go.');
    if (c === 401 && !get(p, 'www-authenticate').length) add('bad', 'A 401 response must have a WWW-Authenticate header (RFC 9110).');
    if (c === 405 && !get(p, 'allow').length) add('bad', 'A 405 response must have an Allow header (RFC 9110).');
    if (c === 426 && !get(p, 'upgrade').length) add('bad', 'A 426 response must have an Upgrade header (RFC 9110).');
    if (c === 206 && !get(p, 'content-range').length) add('bad', 'A 206 response to a single range needs a Content-Range header.');
    if ((c === 429 || c === 503) && !get(p, 'retry-after').length) add('note', 'A ' + c + ' response can carry Retry-After to tell clients how long to wait.');
    if (c === 201 && !get(p, 'location').length) add('note', 'A 201 response usually has a Location header with the address of the new item.');
    if ((c === 200 || c === 201 || c === 202) && !ct && !get(p, 'content-length').length && !get(p, 'transfer-encoding').length) add('note', 'No Content-Type: the browser has to guess what the body is.');
    if (ct && /^(text\/|application\/(json|javascript|xml))/i.test(ct.value) && !/charset=/i.test(ct.value) && /^text\/html/i.test(ct.value)) add('note', 'text/html without a charset. Add charset=utf-8, or declare it in the page itself.');
    if (c >= 200 && c < 300 && ct && /^text\/html/i.test(ct.value)) {
      if (!get(p, 'strict-transport-security').length) add('note', 'No Strict-Transport-Security header. On an https site it tells browsers to always use https.');
      if (!get(p, 'content-security-policy').length) add('note', 'No Content-Security-Policy header. It limits where scripts and other content may load from.');
      var xo = get(p, 'x-content-type-options')[0];
      if (!xo) add('note', 'No X-Content-Type-Options: nosniff header.'); else if (!/nosniff/i.test(xo.value)) add('bad', 'X-Content-Type-Options should have the value nosniff.');
      if (!get(p, 'referrer-policy').length) add('note', 'No Referrer-Policy header. Browsers then use their own default.');
    }
    get(p, 'set-cookie').forEach(function (h) {
      var n = h.value.split('=')[0], v = h.value.toLowerCase(), miss = [];
      if (!/;\s*secure/.test(v)) miss.push('Secure');
      if (!/;\s*httponly/.test(v)) miss.push('HttpOnly');
      if (!/;\s*samesite=/.test(v)) miss.push('SameSite');
      if (/;\s*samesite=none/.test(v) && !/;\s*secure/.test(v)) add('bad', 'Cookie "' + n + '": SameSite=None needs the Secure attribute.');
      if (miss.length) add('note', 'Cookie "' + n + '" has no ' + miss.join(', ') + '. Session cookies usually should have all three; a cookie that scripts must read cannot be HttpOnly.');
    });
    if (cc) {
      var v2 = cc.value.toLowerCase();
      if (/no-store/.test(v2)) add('good', 'Cache-Control: no-store tells caches not to keep any copy. Right for private pages, costly for static files.');
      else if (/max-age=0|no-cache/.test(v2)) add('good', 'Cache-Control makes caches check with the server before reusing a copy (no-cache or max-age=0).');
      else { var ma = /max-age=(\d+)/.exec(v2); if (ma) add('good', 'Cache-Control: copies may be reused for ' + ma[1] + ' seconds (about ' + fmt(+ma[1]) + ').'); }
      if (/immutable/.test(v2) && !/max-age/.test(v2)) add('note', 'immutable has no effect without max-age.');
    } else if (c >= 200 && c < 300) add('note', 'No Cache-Control header. Caches may then decide for themselves how long to keep a copy.');
    var names = {}; p.headers.forEach(function (h) { if (h.lname !== 'set-cookie' && h.lname !== 'link' && h.lname !== 'www-authenticate') { names[h.lname] = (names[h.lname] || 0) + 1; } });
    Object.keys(names).forEach(function (k) { if (names[k] > 1) add('note', 'The header ' + k + ' appears ' + names[k] + ' times. For most headers this is unusual and some clients take only one value.'); });
    if (get(p, 'server').some(function (h) { return /\d/.test(h.value); })) add('note', 'The Server header shows a version number. It is not needed by browsers and helps attackers pick known problems.');
    if (get(p, 'x-powered-by').length) add('note', 'X-Powered-By names the framework. It can usually be turned off.');
    return out;
  }
  function fmt(s) { return s >= 86400 * 365 ? Math.round(s / 86400 / 365 * 10) / 10 + ' years' : s >= 86400 ? Math.round(s / 86400 * 10) / 10 + ' days' : s >= 3600 ? Math.round(s / 3600 * 10) / 10 + ' hours' : s >= 60 ? Math.round(s / 60) + ' minutes' : s + ' seconds'; }
  var api = { parse: parse, checks: checks, INFO: INFO };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HdrCore = api;
})(typeof window !== 'undefined' ? window : this);
