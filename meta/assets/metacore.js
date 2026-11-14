/* metacore.js: builds the <head> tags (title, description, canonical, robots, Open Graph, Twitter card), schema.org JSON-LD and sitemap.xml text, and gives plain checks.
   Browser: window.MetaCore. Node: module.exports. Tested by test_meta.py (round trip in Chrome and WebKit, JSON-LD names against the schema.org vocabulary, XML parsed by Python). */
(function (root) {
  'use strict';
  function ea(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function et(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function isUrl(u) { return /^https?:\/\/[^\s/$.?#][^\s]*$/i.test(u); }
  function headTags(o) {
    var L = [];
    if (o.charset !== false) L.push('<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">');
    if (o.title) L.push('<title>' + et(o.title) + '</title>');
    if (o.description) L.push('<meta name="description" content="' + ea(o.description) + '">');
    if (o.canonical) L.push('<link rel="canonical" href="' + ea(o.canonical) + '">');
    var rb = [];
    if (o.noindex) rb.push('noindex'); if (o.nofollow) rb.push('nofollow'); if (o.nosnippet) rb.push('nosnippet');
    if (o.maxsnippet !== undefined && o.maxsnippet !== '' && !o.nosnippet) rb.push('max-snippet:' + parseInt(o.maxsnippet, 10));
    if (o.maximage) rb.push('max-image-preview:' + o.maximage);
    if (rb.length) L.push('<meta name="robots" content="' + rb.join(', ') + '">');
    if (o.og) {
      var t = o.ogtitle || o.title, d = o.ogdesc || o.description;
      if (t) L.push('<meta property="og:title" content="' + ea(t) + '">');
      L.push('<meta property="og:type" content="' + ea(o.ogtype || 'website') + '">');
      if (o.ogimage) L.push('<meta property="og:image" content="' + ea(o.ogimage) + '">');
      var u = o.ogurl || o.canonical; if (u) L.push('<meta property="og:url" content="' + ea(u) + '">');
      if (d) L.push('<meta property="og:description" content="' + ea(d) + '">');
      if (o.sitename) L.push('<meta property="og:site_name" content="' + ea(o.sitename) + '">');
      if (o.locale) L.push('<meta property="og:locale" content="' + ea(o.locale) + '">');
    }
    if (o.twitter) {
      L.push('<meta name="twitter:card" content="' + ea(o.twcard || 'summary_large_image') + '">');
      var tt = o.ogtitle || o.title, td = o.ogdesc || o.description;
      if (tt) L.push('<meta name="twitter:title" content="' + ea(tt) + '">');
      if (td) L.push('<meta name="twitter:description" content="' + ea(td) + '">');
      if (o.ogimage) L.push('<meta name="twitter:image" content="' + ea(o.ogimage) + '">');
    }
    return L.join('\n');
  }
  function checks(o) {
    var c = [];
    function add(l, m) { c.push({ level: l, msg: m }); }
    if (!o.title) add('bad', 'Every page needs a title. It is the first line of a search result and the name of the browser tab.');
    else {
      if (o.title.length > 70) add('note', 'The title is ' + o.title.length + ' characters. Google says there is no limit, but the title shown in results is cut to fit the screen width, so the end of a long title may not be seen.');
      if (o.title.length < 10) add('note', 'The title is very short. Describe the page, not only its type (for example not just "Home").');
    }
    if (!o.description) add('note', 'No description. Google may write its own snippet from the page text; a good description can be used when it describes the page better.');
    else if (o.description.length > 170) add('note', 'The description is ' + o.description.length + ' characters. There is no limit, but the snippet is cut to fit the screen width.');
    if (o.canonical && !isUrl(o.canonical)) add('bad', 'The canonical address must be a full address that starts with https:// (or http://).');
    if (o.og) {
      if (!o.ogimage) add('note', 'Open Graph needs og:image for link previews. Without it, many apps show a plain link.');
      else if (!isUrl(o.ogimage)) add('bad', 'og:image should be a full address that starts with https://.');
      if (!(o.ogurl || o.canonical)) add('note', 'og:url is empty. The Open Graph protocol lists og:title, og:type, og:image and og:url as the four required properties.');
    }
    if (o.noindex) add('good', 'noindex asks search engines not to show this page. Do not also block the page in robots.txt: a crawler that cannot fetch the page never sees the noindex.');
    if (o.nosnippet && o.maxsnippet !== undefined && o.maxsnippet !== '') add('note', 'nosnippet and max-snippet together: Google says that when they conflict, nosnippet applies, so max-snippet was left out.');
    return c;
  }
  /* ---- JSON-LD ---- */
  function clean(o) {
    if (Array.isArray(o)) return o.map(clean).filter(function (x) { return x !== undefined; });
    if (o && typeof o === 'object') { var r = {}; Object.keys(o).forEach(function (k) { var v = clean(o[k]); if (v !== undefined && v !== '' && !(Array.isArray(v) && !v.length) && !(typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length <= 1 && v['@type'])) r[k] = v; }); return r; }
    return o === '' || o === null || o === undefined ? undefined : o;
  }
  function split(s) { return String(s || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function ld(type, f) {
    var o;
    if (type === 'Article') o = { '@context': 'https://schema.org', '@type': f.subtype || 'Article', headline: f.headline, description: f.description, image: split(f.image), datePublished: f.published, dateModified: f.modified,
      author: f.author ? { '@type': f.authorType || 'Person', name: f.author, url: f.authorUrl } : undefined, publisher: f.publisher ? { '@type': 'Organization', name: f.publisher, logo: f.logo ? { '@type': 'ImageObject', url: f.logo } : undefined } : undefined, mainEntityOfPage: f.url };
    else if (type === 'LocalBusiness') o = { '@context': 'https://schema.org', '@type': f.subtype || 'LocalBusiness', name: f.name, image: split(f.image), url: f.url, telephone: f.phone, priceRange: f.price,
      address: { '@type': 'PostalAddress', streetAddress: f.street, addressLocality: f.city, addressRegion: f.region, postalCode: f.postal, addressCountry: f.country },
      geo: f.lat && f.lng ? { '@type': 'GeoCoordinates', latitude: +f.lat, longitude: +f.lng } : undefined, openingHours: split(f.hours), sameAs: split(f.sameas) };
    else if (type === 'Product') o = { '@context': 'https://schema.org', '@type': 'Product', name: f.name, image: split(f.image), description: f.description, sku: f.sku, brand: f.brand ? { '@type': 'Brand', name: f.brand } : undefined,
      offers: f.price ? { '@type': 'Offer', url: f.url, price: String(f.price), priceCurrency: f.currency || 'INR', availability: f.availability ? 'https://schema.org/' + f.availability : undefined, itemCondition: f.condition ? 'https://schema.org/' + f.condition : undefined } : undefined,
      aggregateRating: f.rating && f.reviews ? { '@type': 'AggregateRating', ratingValue: +f.rating, reviewCount: +f.reviews } : undefined };
    else if (type === 'BreadcrumbList') o = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: split(f.items).map(function (l, i) { var p = l.split('|'); return { '@type': 'ListItem', position: i + 1, name: (p[0] || '').trim(), item: (p[1] || '').trim() || undefined }; }) };
    else if (type === 'Organization') o = { '@context': 'https://schema.org', '@type': 'Organization', name: f.name, url: f.url, logo: f.logo, email: f.email, telephone: f.phone, sameAs: split(f.sameas) };
    return clean(o);
  }
  function ldText(o) { return '<script type="application/ld+json">\n' + JSON.stringify(o, null, 2).replace(/</g, '\\u003c') + '\n</script>'; }
  /* ---- sitemap ---- */
  function sitemap(text, opt) {
    var lines = String(text || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean), errs = [], seen = {}, urls = [];
    lines.forEach(function (l, i) {
      var p = l.split(/\s+/)[0];
      if (!isUrl(p)) { errs.push('Line ' + (i + 1) + ': "' + l.slice(0, 60) + '" is not a full address starting with http:// or https://.'); return; }
      if (p.length > 2048) { errs.push('Line ' + (i + 1) + ': the address is longer than 2,048 characters.'); return; }
      if (seen[p]) { errs.push('Line ' + (i + 1) + ': duplicate address skipped.'); return; }
      seen[p] = 1; urls.push(p);
    });
    var over = urls.length > 50000;
    if (over) { errs.push('A sitemap file may hold at most 50,000 addresses. Only the first 50,000 are in the file: split the rest into more files and list them in a sitemap index.'); urls = urls.slice(0, 50000); }
    var x = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(function (u) { return '  <url>\n    <loc>' + et(u) + '</loc>' + (opt && opt.lastmod ? '\n    <lastmod>' + opt.lastmod + '</lastmod>' : '') + '\n  </url>'; }).join('\n') + '\n</urlset>\n';
    return { xml: x, count: urls.length, errors: errs, bytes: typeof Buffer !== 'undefined' ? Buffer.byteLength(x) : new Blob([x]).size };
  }
  var api = { headTags: headTags, checks: checks, ld: ld, ldText: ldText, sitemap: sitemap, isUrl: isUrl };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MetaCore = api;
})(typeof window !== 'undefined' ? window : this);
