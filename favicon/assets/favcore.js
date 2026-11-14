/* favcore.js: builds the files of a favicon pack from PNG bytes: ICO (PNG inside), ZIP (stored), web manifest and the HTML snippet. No canvas here (see fav.js).
   Browser: window.FavCore. Node: module.exports. Tested by test_fav.py: the zip is read by Python's zipfile (CRC checked), the ICO by Pillow. */
(function (root) {
  'use strict';
  var te = typeof TextEncoder !== 'undefined' ? new TextEncoder() : new (require('node:util').TextEncoder)();
  var CRC = (function () { var t = new Uint32Array(256), n, k, c; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF, i; for (i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function u16(v) { return [v & 255, (v >> 8) & 255]; }
  function u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
  function pngSize(b) { /* reads width and height from the IHDR chunk */
    var sig = [137, 80, 78, 71, 13, 10, 26, 10], i;
    for (i = 0; i < 8; i++) if (b[i] !== sig[i]) throw new Error('Not a PNG file.');
    var dv = new DataView(b.buffer, b.byteOffset, b.byteLength); return { w: dv.getUint32(16), h: dv.getUint32(20) };
  }
  /* ICO with PNG images inside (supported since Windows Vista and by browsers). images: [Uint8Array of PNG] */
  function ico(images) {
    var n = images.length, head = [0, 0, 1, 0].concat(u16(n)), off = 6 + 16 * n, dir = [], parts = [], total = 0;
    images.forEach(function (png) {
      var s = pngSize(png); if (s.w !== s.h || s.w > 256) throw new Error('ICO images must be square and at most 256 pixels.');
      dir = dir.concat([s.w === 256 ? 0 : s.w, s.h === 256 ? 0 : s.h, 0, 0], u16(1), u16(32), u32(png.length), u32(off + total)); total += png.length; parts.push(png);
    });
    var out = new Uint8Array(off + total); out.set(head.concat(dir), 0); var p = off; parts.forEach(function (x) { out.set(x, p); p += x.length; }); return out;
  }
  /* ZIP, method 0 (stored). files: [{name, data: Uint8Array}] */
  function zip(files) {
    var locals = [], cds = [], off = 0, dt = [0, 0, 0x21, 0x00]; /* 1980-01-01 00:00 */
    files.forEach(function (f) {
      var nm = te.encode(f.name), crc = crc32(f.data), loc = [0x50, 0x4b, 3, 4].concat(u16(20), u16(0x0800), u16(0), [0, 0, 0x21, 0], u32(crc), u32(f.data.length), u32(f.data.length), u16(nm.length), u16(0));
      var l = new Uint8Array(loc.length + nm.length + f.data.length); l.set(loc, 0); l.set(nm, loc.length); l.set(f.data, loc.length + nm.length); locals.push(l);
      cds.push([0x50, 0x4b, 1, 2].concat(u16(20), u16(20), u16(0x0800), u16(0), [0, 0, 0x21, 0], u32(crc), u32(f.data.length), u32(f.data.length), u16(nm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off)).concat(Array.prototype.slice.call(nm)));
      off += l.length;
    });
    var cdLen = cds.reduce(function (s, c) { return s + c.length; }, 0), end = [0x50, 0x4b, 5, 6, 0, 0, 0, 0].concat(u16(files.length), u16(files.length), u32(cdLen), u32(off), u16(0));
    var out = new Uint8Array(off + cdLen + end.length), p = 0;
    locals.forEach(function (l) { out.set(l, p); p += l.length; }); cds.forEach(function (c) { out.set(c, p); p += c.length; }); out.set(end, p); return out;
  }
  function manifest(o) {
    var icons = [{ src: o.base + 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: o.base + 'icon-512.png', sizes: '512x512', type: 'image/png' }];
    if (o.maskable) icons.push({ src: o.base + 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' });
    var m = { name: o.name || 'My site', short_name: o.short || (o.name || 'My site').slice(0, 12), icons: icons, theme_color: o.theme || '#ffffff', background_color: o.bg || '#ffffff', display: 'standalone', start_url: o.start || '/' };
    return JSON.stringify(m, null, 2) + '\n';
  }
  function snippet(o) {
    var b = o.base, l = ['<link rel="icon" href="' + b + 'favicon.ico" sizes="48x48">', '<link rel="icon" type="image/png" sizes="32x32" href="' + b + 'favicon-32.png">', '<link rel="icon" type="image/png" sizes="16x16" href="' + b + 'favicon-16.png">', '<link rel="apple-touch-icon" sizes="180x180" href="' + b + 'apple-touch-icon.png">', '<link rel="manifest" href="' + b + 'site.webmanifest">'];
    if (o.theme) l.push('<meta name="theme-color" content="' + o.theme + '">');
    return l.join('\n') + '\n';
  }
  var api = { crc32: crc32, pngSize: pngSize, ico: ico, zip: zip, manifest: manifest, snippet: snippet };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FavCore = api;
})(typeof window !== 'undefined' ? window : this);
