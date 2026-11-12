/* fix.shareyourgroup.com/privacy: three tools and the tickable checklists. Everything runs in the browser.
   Nothing typed or pasted here is sent anywhere or stored (the checklist ticks are kept in this browser only). */
(function () {
  'use strict';
  var P = {};

  /* ---------- reading a web address ---------- */
  // endings where the registered name is the label before a two-part ending (a short list of the common ones)
  P.TWO = ['co.in', 'gov.in', 'nic.in', 'ac.in', 'org.in', 'net.in', 'res.in', 'edu.in', 'gen.in', 'firm.in', 'ind.in', 'bank.in', 'fin.in', 'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'com.au', 'net.au', 'org.au', 'gov.au',
    'co.nz', 'co.jp', 'co.za', 'com.br', 'com.sg', 'com.my', 'com.pk', 'com.bd', 'com.np', 'com.cn', 'co.id', 'co.kr', 'com.tr', 'com.mx', 'com.hk', 'co.th', 'com.ph', 'com.ng', 'co.ke', 'com.sa', 'com.eg', 'co.il', 'com.vn', 'com.tw', 'com.ua', 'com.ar'];
  P.SHORT = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'cutt.ly', 'rb.gy', 'ow.ly', 'shorturl.at', 'tiny.cc', 'rebrand.ly', 'buff.ly', 't.ly', 's.id', 'lnkd.in', 'wa.me', 'youtu.be', 'amzn.to', 'fkrt.it', 'dl.flipkart.com'];
  P.ODD = ['xyz', 'top', 'club', 'online', 'site', 'icu', 'buzz', 'work', 'click', 'link', 'live', 'shop', 'vip', 'cfd', 'sbs', 'rest', 'monster', 'quest', 'loan', 'win', 'bid', 'tk', 'ml', 'ga', 'cf', 'gq', 'cc', 'pw', 'support', 'info', 'biz'];
  P.BAIT = ['login', 'log-in', 'signin', 'verify', 'verification', 'secure', 'security', 'update', 'kyc', 'ekyc', 'reward', 'rewards', 'bonus', 'prize', 'gift', 'free', 'claim', 'refund', 'support', 'helpdesk', 'customer', 'care',
    'account', 'wallet', 'bank', 'upi', 'pay', 'payment', 'recharge', 'offer', 'lucky', 'winner', 'alert', 'suspend', 'blocked', 'unlock', 'confirm', 'challan', 'electricity', 'bill', 'delivery', 'parcel', 'track', 'aadhaar', 'aadhar', 'pan', 'apk'];
  P.url = function (raw) {
    var s = String(raw || '').trim(), out = { input: s, flags: [], good: [] };
    if (!s) return null;
    if (/\s/.test(s)) s = s.split(/\s+/)[0];
    var m = /^([a-z][a-z0-9+.-]*):\/\//i.exec(s);
    out.scheme = m ? m[1].toLowerCase() : '';
    var rest = m ? s.slice(m[0].length) : s;
    if (/^(mailto|tel|sms|javascript|data|intent|upi|market|whatsapp):/i.test(s)) { out.scheme = s.split(':')[0].toLowerCase(); out.special = true; out.flags.push(['high', 'This is not a web address. It starts with "' + out.scheme + ':", which makes the phone do something else (' + (out.scheme === 'upi' ? 'open a payment in a UPI app' : /^(intent|market)$/.test(out.scheme) ? 'open or install an app' : 'start a call, a message or a command') + ').']); return out; }
    var cut = rest.search(/[\/?#]/), auth = cut < 0 ? rest : rest.slice(0, cut);
    out.path = cut < 0 ? '' : rest.slice(cut);
    var at = auth.lastIndexOf('@');
    if (at > -1) { out.userinfo = auth.slice(0, at); auth = auth.slice(at + 1); }
    var pm = /:(\d+)$/.exec(auth); if (pm) { out.port = pm[1]; auth = auth.slice(0, -pm[0].length); }
    var host = auth.toLowerCase().replace(/\.$/, '');
    out.host = host;
    if (!host || !/^[a-z0-9.\-\[\]:_%\u0080-￿]+$/.test(host) || host.indexOf('.') < 0 && !/^\[/.test(host)) { out.bad = true; return out; }
    out.ip = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^\[/.test(host) || /^\d+$/.test(host) || /^0x/.test(host);
    var labels = host.split('.');
    if (!out.ip) {
      var two = labels.slice(-2).join('.'), n = P.TWO.indexOf(two) > -1 && labels.length > 2 ? 3 : 2;
      out.domain = labels.slice(-n).join('.'); out.name = labels[labels.length - n]; out.tld = labels.slice(-(n - 1)).join('.'); out.sub = labels.slice(0, -n).join('.');
    }
    // flags
    if (out.scheme === 'http') out.flags.push(['mid', 'The address begins with http, not https. Anything typed on this page travels unencrypted. Never enter a password or card details on it.']);
    if (out.scheme && out.scheme !== 'http' && out.scheme !== 'https') out.flags.push(['mid', 'It uses "' + out.scheme + '://", which is not an ordinary web page.']);
    if (out.userinfo !== undefined) out.flags.push(['high', 'It contains an "@" sign before the site name. Everything before the @ ("' + out.userinfo.slice(0, 40) + '") is ignored by the browser and is there only to mislead. The real site is what follows the @.']);
    if (out.ip) out.flags.push(['high', 'The site is given as a bare number, not a name. Genuine organisations use their names. Treat this as unsafe.']);
    if (/xn--/.test(host)) out.flags.push(['high', 'The name contains "xn--", which means it uses letters from another script that can look exactly like English letters. This is a common way to imitate a known name.']);
    if (/[\u0080-￿]/.test(host)) out.flags.push(['high', 'The name contains letters that are not plain English letters. They may be look-alikes of English letters.']);
    if (out.port && out.port !== '80' && out.port !== '443') out.flags.push(['mid', 'It names a port number (:' + out.port + '). Ordinary websites do not need one.']);
    if (!out.ip) {
      if (P.SHORT.indexOf(out.domain) > -1 || P.SHORT.indexOf(host) > -1) out.flags.push(['mid', 'This is a shortened link (' + out.domain + '). It hides the real destination. You cannot tell where it leads from the address.']);
      if (out.sub && out.sub.split('.').length >= 3) out.flags.push(['mid', 'There are many parts in front of the real domain (' + out.sub + '). Long chains of names before the domain are often used to push the real domain out of sight.']);
      var subWords = (out.sub || '').split(/[.\-]/).filter(Boolean);
      var looks = (out.sub || '').match(/(?:^|\.)([a-z0-9-]+\.(?:com|in|org|net|gov|co))(?:\.|$)/);
      if (looks) out.flags.push(['high', 'A different site name ("' + looks[1] + '") appears in front of the real domain. It is only a label. The site belongs to ' + out.domain + '.']);
      if (P.ODD.indexOf(labels[labels.length - 1]) > -1) out.flags.push(['mid', 'The ending ".' + labels[labels.length - 1] + '" is cheap to register and is used by many fraud pages. A genuine site can use it, but check carefully whose site this is.']);
      var hy = (out.name.match(/-/g) || []).length;
      if (hy >= 2) out.flags.push(['mid', 'The domain name has several hyphens. Names stitched together with hyphens are typical of imitation sites.']);
      var bait = P.BAIT.filter(function (w) { return out.name.split('-').indexOf(w) > -1 || subWords.indexOf(w) > -1; });
      if (bait.length) out.flags.push(['mid', 'The name uses the word' + (bait.length > 1 ? 's' : '') + ' "' + bait.slice(0, 4).join('", "') + '". Organisations rarely put such words in their address; fraud pages often do.']);
      if (/\d/.test(out.name) && /[a-z]/.test(out.name) && /[a-z]\d[a-z]|^[a-z]+\d+$/.test(out.name) && out.name.length > 5) out.flags.push(['low', 'The name mixes letters and digits. Check that a digit has not replaced a letter (0 for o, 1 for l).']);
      if (/rn|vv|ii/.test(out.name)) out.flags.push(['low', 'The name contains "' + /rn|vv|ii/.exec(out.name)[0] + '", which can be made to look like another letter (rn looks like m, vv like w). Read it letter by letter.']);
      if (out.name.length > 25) out.flags.push(['low', 'The domain name is unusually long.']);
      if (/\.gov\.in$|\.nic\.in$/.test('.' + out.domain)) out.good.push('The domain ends in .' + out.tld + ', which is reserved for Indian government bodies.');
    }
    if (/\.apk(\?|#|$)/i.test(out.path)) out.flags.push(['high', 'The link leads to a file ending in .apk, which is an Android app, not a page or document. Do not install it.']);
    else if (/\.(exe|msi|bat|scr|dmg|pkg|js|vbs|jar)(\?|#|$)/i.test(out.path)) out.flags.push(['high', 'The link leads to a program file. Do not run it.']);
    if (/(https?%3a|https?:\/\/)/i.test(out.path)) out.flags.push(['low', 'The address carries another web address inside it. The page may pass you on to that second site.']);
    if (s.length > 200) out.flags.push(['low', 'The address is very long, which makes the real domain easy to miss.']);
    return out;
  };

  /* ---------- signs of a scam in a message ---------- */
  P.SIGNS = [
    ['urgent', 'Pressure and deadlines', /\b(immediately|urgent(ly)?|within \d+ ?(hours?|hrs?|minutes?|mins?)|today only|last (chance|day|warning)|final (notice|reminder)|expire[sd]? (today|tonight|soon)|tonight at|at \d{1,2}[.:]\d{2} ?pm|right now|act now|turant|abhi|aaj hi|आज ही|तुरंत)\b/i, 'Fraud depends on hurry. A genuine organisation gives written notice and time.'],
    ['threat', 'A threat', /\b(block(ed)?|suspend(ed)?|disconnect(ed|ion)?|deactivat(e|ed|ion)|terminat(e|ed)|legal action|arrest(ed)?|warrant|fir\b|court|penalty|seiz(e|ed)|freez(e|ing)|frozen|band ho|बंद|काट दी)\b/i, 'Threats of blocking, disconnection or arrest are meant to stop you thinking.'],
    ['secret', 'Asks for a secret', /\b(otp|one[- ]time password|pin\b|upi pin|mpin|cvv|password|passcode|card (number|details)|expiry date|net ?banking (id|password)|verification code|share (the )?code|ओटीपी|पिन)\b/i, 'No genuine caller or message needs your OTP, PIN, CVV or password.'],
    ['kyc', 'KYC or account update', /\b(kyc|e-?kyc|re-?kyc|update (your )?(pan|aadhaa?r|account|details|kyc)|pan (card )?(not )?(updated?|link(ed)?)|aadhaa?r (update|link)|account (will be|has been|is) (blocked|suspended|closed))\b/i, 'KYC is done at the branch or inside the official app, never through a link or a caller.'],
    ['prize', 'A prize, reward or easy money', /\b(won|winner|lottery|lucky draw|prize|reward points?|cash ?back|bonus|gift (card|voucher)|free (gift|recharge|laptop)|congratulations|kbc|jackpot|lakh|crore|earn (rs|₹|inr)?\.? ?\d|daily income|per day|work from home|part[- ]time job|guaranteed (return|profit)|double your)\b/i, 'You cannot win a draw you did not enter, and real work does not pay for tapping "like".'],
    ['pay', 'Asks you to pay or approve', /\b(processing fee|registration fee|pay (rs|₹|inr)|pay only|small (fee|amount|charge)|customs (duty|charge)|advance (fee|payment|tax)|tax (to|for) (release|claim)|approve (the )?request|scan (the |this )?qr|collect request|refundable deposit|security deposit|redelivery (fee|charge))\b/i, 'Being asked to pay, scan or approve in order to receive money is the mark of a fraud.'],
    ['install', 'Asks you to install or share your screen', /\b(\.apk\b|install (the |this |our )?(app|application|apk)|download (the |this )?(app|apk|file)|anydesk|teamviewer|quick ?support|rustdesk|screen ?shar(e|ing)|remote (access|support))\b/i, 'Installing an app or sharing your screen for a caller hands over your phone.'],
    ['contact', 'Gives a personal number to call', /(call|contact|whatsapp|dial)[^.\n]{0,40}(\+?91[\s-]?)?[6-9]\d{9}\b|\b(electricity|customer care|helpline|officer)[^.\n]{0,30}[6-9]\d{9}\b/i, 'Organisations use helplines and registered sender names, not a ten-digit mobile number in a text.'],
    ['official', 'Uses an official-sounding name', /\b(rbi|reserve bank|income tax|customs|cbi|police|cyber cell|trai|telecom department|dot\b|narcotics|ncb|enforcement directorate|\bed\b|court|uidai|npci|sebi|electricity (office|officer|board|department))\b/i, 'Officials do not message or call from personal numbers to demand money or codes.'],
    ['secrecy', 'Asks you to keep it secret', /\b((do not|don'?t|never) (tell|inform) (anyone|any ?one|anybody|your family|family|others)|keep (it|this) (secret|confidential)|strictly confidential|kisi ko mat (batana|bataye))\b/i, 'Real offices never forbid you to speak to your family.'],
    ['greet', 'A vague greeting or odd English', /\b(dear (customer|user|sir\/madam|consumer|costumer|client|member|account holder)|respected (sir|customer)|kindly (do the needful|revert|click)|your (a\/c|ac) (no|number))\b/i, 'Your own bank usually addresses you by name and never asks you to click to keep the account alive.']
  ];
  P.message = function (text) {
    var t = String(text || ''), hits = [], links = [];
    P.SIGNS.forEach(function (s) { var m = s[2].exec(t); if (m) hits.push({ id: s[0], name: s[1], found: m[0].trim().slice(0, 60), why: s[3] }); });
    // a genuine alert warns you NOT to share the code; that is the opposite of asking for it
    var warns = /\b(do not|don'?t|never|kabhi na)\s+(share|disclose|give|tell|reveal)/i.test(t) && !/\b(share|send|tell|give|provide|forward)\s+(me |us |the |your |this )?(otp|code|pin)\s+(to|with|on|at)\b/i.test(t);
    if (warns) hits = hits.filter(function (h) { return h.id !== 'secret'; });
    var re = /((?:https?:\/\/|www\.)[^\s<>"')]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|in|org|net|co|info|xyz|top|online|site|link|live|shop|app|ly|me|cc|club|icu|vip|click|io)(?:\/[^\s<>"')]*)?)/ig, m2;
    while ((m2 = re.exec(t)) && links.length < 5) { var u = P.url(m2[1].replace(/[.,;:!?]+$/, '')); if (u && !u.bad) links.push(u); }
    var linkBad = links.filter(function (u) { return u.flags.some(function (f) { return f[0] !== 'low'; }); }).length;
    var score = hits.length + (links.length ? 1 : 0) + linkBad;
    var strong = ['secret', 'install', 'pay'].filter(function (k) { return hits.some(function (h) { return h.id === k; }); }).length;
    var level = score === 0 ? 0 : (strong || score >= 4) ? 3 : score >= 2 ? 2 : 1;
    return { hits: hits, links: links, level: level, warns: warns && !hits.length && !links.length, phone: /(?:\+?91[\s-]?)?[6-9]\d{9}\b/.test(t) };
  };

  /* ---------- password and passphrase maker ---------- */
  P.WORDS = ('apple mango lemon guava peach grape melon olive carrot onion ginger pepper cumin basil clove sugar honey butter bread rice wheat maize millet coffee cocoa river ocean island desert forest meadow valley canyon harbour bridge tunnel tower temple market garden window ladder hammer anchor compass lantern candle mirror pillow blanket basket bucket kettle spoon saucer bottle ribbon button needle thread cotton velvet marble copper silver bronze granite pebble thunder breeze monsoon winter summer autumn sunrise shadow rainbow comet planet rocket saturn jupiter falcon parrot pigeon sparrow peacock heron tiger panda rabbit turtle dolphin camel donkey monkey beetle spider cricket violin guitar flute trumpet drum piano circus puzzle riddle story letter ticket pocket jacket sandal helmet saddle wagon tractor engine pedal signal copper orange purple yellow indigo crimson scarlet turquoise amber ivory walnut almond cashew peanut raisin biscuit noodle pickle chutney samosa paratha jalebi laddu chai lassi kite marigold jasmine lotus banyan neem tulsi bamboo coconut saffron cardamom turmeric mustard sesame tamarind jaggery acorn arrow badge bagel balloon banner barrel beacon berry bison blossom boulder branch brick bubble buffalo cabin cactus candy canoe carpet castle cedar cellar chalk cherry chimney cinnamon clover cobalt comb coral cradle crayon crystal curtain daisy dawn denim dial diamond domino dragon eagle easel ember emerald engine fabric feather fern ferry fiddle flame flannel fossil fountain fox gadget galaxy garlic gazelle geyser glacier globe goblet gondola gravel hazel hedge hermit hickory hollow horizon hornet igloo ink iris jaguar jelly jewel jungle kayak kernel kitten koala lagoon lapel lark lava leaf ledger lemur lentil lilac linen lizard lobster locket lunar magnet maple marlin mason meteor mint mitten mosaic moss muffin nectar nickel nutmeg oasis oat onyx opal orchid otter oyster paddle pagoda panther papaya parcel pasta pearl pelican pencil penguin petal pine pistol pixel plank plum pocket pollen poppy prairie prism pumpkin quartz quill radish raft raven reef rhino ridge robin ruby sage sail salmon sapphire satin scooter shell shovel sketch slate sled snail sonnet sparrow spruce squirrel stable starfish stork straw summit sunset swan syrup tablet tango teapot thimble thistle timber toffee topaz torch trail trophy tulip tunnel turnip twig umbrella vapor velcro vessel violet walrus wander weasel whale whisker willow wizard wren yarn zebra zenith zipper alpine atlas badger ballad barley bonsai burrow cobble cricket cumulus dune fjord garnet gecko harvest heron juniper kestrel lantana lichen mallet meadowlark nimbus osprey pampas quiver rattan sandbar tundra umber verdant wicket yonder zephyr').split(' ');
  P.rand = function (n) {            // unbiased whole number from 0 to n-1, from the browser's secure random source
    var c = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto : null;
    if (!c) throw new Error('no secure random source');
    var max = Math.floor(4294967296 / n) * n, a = new Uint32Array(1);
    do { c.getRandomValues(a); } while (a[0] >= max);
    return a[0] % n;
  };
  P.password = function (len, sets) {
    var pools = { lower: 'abcdefghijkmnpqrstuvwxyz', upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ', digit: '23456789', symbol: '!@#$%^&*-_=+?' }, use = [], all = '', out = [];
    ['lower', 'upper', 'digit', 'symbol'].forEach(function (k) { if (sets[k]) { use.push(pools[k]); all += pools[k]; } });
    if (!use.length) { use.push(pools.lower); all = pools.lower; }
    len = Math.max(len, use.length);
    use.forEach(function (p) { out.push(p[P.rand(p.length)]); });      // at least one from each chosen kind
    while (out.length < len) out.push(all[P.rand(all.length)]);
    for (var i = out.length - 1; i > 0; i--) { var j = P.rand(i + 1), t = out[i]; out[i] = out[j]; out[j] = t; }
    return { text: out.join(''), bits: Math.round(len * Math.log(all.length) / Math.LN2) };
  };
  P.phrase = function (n, sep, cap, num) {
    var w = [], list = P.WORDS.filter(function (x, i, a) { return a.indexOf(x) === i; });
    for (var i = 0; i < n; i++) { var x = list[P.rand(list.length)]; w.push(cap ? x.charAt(0).toUpperCase() + x.slice(1) : x); }
    var text = w.join(sep) + (num ? sep + (10 + P.rand(90)) : '');
    return { text: text, bits: Math.round(n * Math.log(list.length) / Math.LN2 + (num ? Math.log(90) / Math.LN2 : 0)) };
  };
  if (typeof module !== 'undefined') { module.exports = P; return; }

  var d = document, S = window.SYG, $ = function (q, el) { return (el || d).querySelector(q); };
  function show(el, h) { el.innerHTML = h; el.hidden = false; }
  var LV = { high: 'Strong warning', mid: 'Warning', low: 'Check' };

  /* link checker */
  if ($('[data-tool=link]')) (function () {
    var inp = $('#l-in'), out = $('#l-out');
    function run() {
      var u = P.url(inp.value);
      if (!u) return show(out, '<p>Paste a web address above. It is examined on your device and is not opened or sent anywhere.</p>');
      if (u.special) return show(out, '<h2>Not a web page</h2><ul class="flags">' + u.flags.map(function (f) { return '<li class="' + f[0] + '"><b>' + LV[f[0]] + '.</b> ' + S.esc(f[1]) + '</li>'; }).join('') + '</ul>');
      if (u.bad) return show(out, '<p><b>That does not look like a web address.</b> Paste the whole link, for example https://www.example.com/page</p>');
      var worst = u.flags.some(function (f) { return f[0] === 'high'; }) ? 'high' : u.flags.some(function (f) { return f[0] === 'mid'; }) ? 'mid' : u.flags.length ? 'low' : 'none';
      var head = worst === 'high' ? 'Strong warning signs. Do not open this link.' : worst === 'mid' ? 'Warning signs found. Do not trust this link without checking.' : worst === 'low' ? 'A few things to check' : 'No warning signs in the address itself';
      show(out, '<h2 class="lv-' + worst + '">' + head + '</h2><dl class="facts"><dt>The site this link belongs to</dt><dd class="mono">' + S.esc(u.ip ? u.host : u.domain) + '</dd>' +
        (u.sub ? '<dt>Labels in front (do not count)</dt><dd class="mono">' + S.esc(u.sub) + '</dd>' : '') + '<dt>Connection</dt><dd>' + (u.scheme === 'https' ? 'https (encrypted)' : u.scheme === 'http' ? 'http (not encrypted)' : u.scheme ? S.esc(u.scheme) : 'Not stated in the link') + '</dd>' +
        (u.path && u.path !== '/' ? '<dt>After the first slash (does not say whose site it is)</dt><dd class="mono">' + S.esc(u.path.slice(0, 120)) + (u.path.length > 120 ? '...' : '') + '</dd>' : '') + '</dl>' +
        (u.flags.length ? '<ul class="flags">' + u.flags.map(function (f) { return '<li class="' + f[0] + '"><b>' + LV[f[0]] + '.</b> ' + S.esc(f[1]) + '</li>'; }).join('') + '</ul>' : '') +
        (u.good.length ? '<ul class="flags">' + u.good.map(function (g) { return '<li class="ok"><b>Good sign.</b> ' + S.esc(g) + '</li>'; }).join('') + '</ul>' : '') +
        '<p class="hint">' + (worst === 'none' ? 'This only means the address has none of the usual tricks. The checker does not visit the site and cannot know whether <b>' + S.esc(u.ip ? u.host : u.domain) + '</b> is the organisation you expect. Compare it, letter by letter, with the address on official papers or in the official app.' :
          'The checker reads only the address. It does not visit the site. When in doubt, do not open the link: go to the organisation\'s own app or type its address yourself.') + '</p>');
    }
    $('#l-go').addEventListener('click', run); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    d.querySelectorAll('[data-try]').forEach(function (b) { b.addEventListener('click', function () { inp.value = b.getAttribute('data-try'); run(); }); });
    run();
  })();

  /* message checker */
  if ($('[data-tool=msg]')) (function () {
    var inp = $('#m-in'), out = $('#m-out');
    function run() {
      var t = inp.value.trim();
      if (!t) return show(out, '<p>Paste a message above. It stays on your device.</p>');
      var r = P.message(t), heads = ['No common scam signs found', 'One sign of a possible scam', 'Several signs of a scam', 'Strong signs of a scam'], cls = ['none', 'low', 'mid', 'high'][r.level];
      var h = '<h2 class="lv-' + cls + '">' + heads[r.level] + '</h2>';
      if (r.hits.length) h += '<ul class="flags">' + r.hits.map(function (x) { return '<li class="mid"><b>' + S.esc(x.name) + '</b> ("' + S.esc(x.found) + '"). ' + S.esc(x.why) + '</li>'; }).join('') + '</ul>';
      r.links.forEach(function (u) {
        h += '<p><b>Link in the message:</b> it belongs to <span class="mono">' + S.esc(u.ip ? u.host : u.domain) + '</span>.' + (u.flags.length ? '' : ' The address shows none of the usual tricks, but check that this is really the sender\'s site.') + '</p>' +
          (u.flags.length ? '<ul class="flags">' + u.flags.map(function (f) { return '<li class="' + f[0] + '">' + S.esc(f[1]) + '</li>'; }).join('') + '</ul>' : '');
      });
      h += r.level >= 2 ? '<p><b>What to do:</b> do not tap the link, call the number or reply. If you want to check, contact the organisation through its own app or the number on your card, bill or passbook. Report the message on Chakshu at the Sanchar Saathi portal and delete it. If you have already paid or shared details, see <a href="/privacy/after-a-fraud/">what to do after a fraud</a>.</p>' :
        r.level === 1 ? '<p><b>What to do:</b> be careful. One sign alone does not make a message a fraud, but do not act on it through any link or number inside the message.</p>' :
          (r.warns ? '<p><b>This reads like a genuine alert:</b> it tells you not to share the code, and asks for nothing. If you did not start the login or payment it mentions, do not use or share the code, and change the password of that account.</p>' : '') + '<p>The message has none of the patterns this page looks for. That is not proof that it is genuine: a new kind of fraud, or a short message such as "Hi, is this your new number?", shows no pattern. Do not send money, codes or documents on the strength of a message.</p>';
      h += '<p class="hint">This is a simple pattern check done on your device, not a verdict. It can miss scams and can flag genuine messages (a real bank alert may mention "OTP" to warn you not to share it).</p>';
      show(out, h);
    }
    $('#m-go').addEventListener('click', run);
    $('#m-clear').addEventListener('click', function () { inp.value = ''; run(); inp.focus(); });
    d.querySelectorAll('[data-sample]').forEach(function (b) { b.addEventListener('click', function () { inp.value = b.getAttribute('data-sample'); run(); }); });
    run();
  })();

  /* password maker */
  if ($('[data-tool=pass]')) (function () {
    var out = $('#p-out'), kind = 'phrase';
    function strength(bits) { return bits < 40 ? 'Weak: fine only for accounts that do not matter' : bits < 60 ? 'Fair: acceptable with two-step verification' : bits < 80 ? 'Strong' : 'Very strong'; }
    function run() {
      var r;
      try {
        r = kind === 'phrase' ? P.phrase(+$('#p-words').value, $('#p-sep').value, $('#p-cap').checked, $('#p-num').checked)
          : P.password(+$('#p-len').value, { lower: $('#p-lower').checked, upper: $('#p-upper').checked, digit: $('#p-digit').checked, symbol: $('#p-symbol').checked });
      } catch (e) { return show(out, '<p><b>This browser cannot make secure random numbers.</b> Please use an up-to-date browser.</p>'); }
      $('#p-lenv').textContent = $('#p-len').value; $('#p-wordsv').textContent = $('#p-words').value;
      show(out, '<p class="big pw" id="p-text"></p><dl class="facts"><dt>Length</dt><dd>' + r.text.length + ' characters</dd><dt>Strength</dt><dd>' + strength(r.bits) + ' (about ' + r.bits + ' bits of randomness)</dd></dl>' +
        '<div class="acts"><button class="btn sm" type="button" id="p-copy">Copy</button><button class="btn sm ghost" type="button" id="p-again">Make another</button></div>' +
        '<p class="hint">Made on your device with the browser\'s secure random source. It is not sent anywhere and not saved; when you leave the page it is gone. Save it in your password manager now.</p>');
      $('#p-text').textContent = r.text;
      $('#p-copy').addEventListener('click', function () { S.copy(r.text, 'Copied. Paste it into your password manager.'); });
      $('#p-again').addEventListener('click', run);
    }
    d.querySelectorAll('[data-kind]').forEach(function (b) {
      b.addEventListener('click', function () {
        kind = b.getAttribute('data-kind');
        d.querySelectorAll('[data-kind]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        $('#p-phrase').hidden = kind !== 'phrase'; $('#p-random').hidden = kind !== 'random'; run();
      });
    });
    ['p-words', 'p-sep', 'p-cap', 'p-num', 'p-len', 'p-lower', 'p-upper', 'p-digit', 'p-symbol'].forEach(function (i) { $('#' + i).addEventListener('input', run); $('#' + i).addEventListener('change', run); });
    run();
  })();

  /* tickable checklists: ticks stay in this browser */
  d.querySelectorAll('ol.steps[data-list]').forEach(function (ol) {
    var key = 'syg-privacy-' + ol.getAttribute('data-list'), done = [];
    try { done = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
    ol.querySelectorAll('input[type=checkbox]').forEach(function (c, i) {
      c.checked = done.indexOf(i) > -1; c.closest('li').classList.toggle('done', c.checked);
      c.addEventListener('change', function () {
        c.closest('li').classList.toggle('done', c.checked);
        var now = []; ol.querySelectorAll('input[type=checkbox]').forEach(function (x, k) { if (x.checked) now.push(k); });
        try { localStorage.setItem(key, JSON.stringify(now)); } catch (e) {}
      });
    });
    var reset = d.querySelector('[data-reset="' + ol.getAttribute('data-list') + '"]');
    if (reset) reset.addEventListener('click', function () { ol.querySelectorAll('input[type=checkbox]').forEach(function (x) { x.checked = false; x.closest('li').classList.remove('done'); }); try { localStorage.removeItem(key); } catch (e) {} });
  });
  d.querySelectorAll('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

  /* filter on the scams list */
  var fb = $('[data-filter]');
  if (fb) fb.addEventListener('input', function () {
    var q = fb.value.trim().toLowerCase(), hit = 0;
    d.querySelectorAll('[data-q]').forEach(function (r) { var ok = !q || r.getAttribute('data-q').indexOf(q) > -1; r.hidden = !ok; if (ok) hit++; });
    var none = $('[data-none]'); if (none) none.hidden = hit > 0;
  });
})();
