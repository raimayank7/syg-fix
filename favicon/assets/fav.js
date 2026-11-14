/* fav.js: the favicon pack maker. Everything is drawn in your browser with canvas; no file is uploaded. Uses FavCore. */
(function () {
  'use strict';
  var d = document, F = window.FavCore, S = window.SYG, root = d.querySelector('[data-fav]'); if (!root) return;
  function $(s) { return root.querySelector(s); }
  function val(k) { var e = $('[data-f=' + k + ']'); return e ? (e.type === 'checkbox' ? e.checked : e.value) : ''; }
  var img = null, timer = null, seq = 0, last = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  /* draws one icon of size px. mode 'any' uses the chosen shape; 'maskable' fills the whole square and keeps the picture inside the circle of radius 40% of the width (the safe zone) */
  function draw(size, mode) {
    var c = d.createElement('canvas'); c.width = c.height = size; var x = c.getContext('2d'), bg = val('bg'), shape = val('shape'), pad = Math.max(0, Math.min(40, +val('pad') || 0)) / 100;
    var box, bx, by;
    if (mode === 'maskable') { x.fillStyle = bg; x.fillRect(0, 0, size, size); box = size * 0.8 / Math.SQRT2; bx = by = (size - box) / 2; }
    else {
      if (shape === 'circle') { x.beginPath(); x.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI); x.closePath(); x.fillStyle = bg; x.fill(); }
      else if (shape === 'rounded') { rr(x, 0, 0, size, size, size * 0.22); x.fillStyle = bg; x.fill(); }
      else if (shape === 'square') { x.fillStyle = bg; x.fillRect(0, 0, size, size); }
      box = size * (1 - 2 * pad); bx = by = size * pad;
      if (shape === 'circle') { box = Math.min(box, size * 0.7071); bx = by = (size - box) / 2; }
    }
    if (img) { var r = Math.min(box / img.width, box / img.height), w = img.width * r, h = img.height * r; x.drawImage(img, bx + (box - w) / 2, by + (box - h) / 2, w, h); }
    else { var t = (val('letter') || 'A').slice(0, 2); x.fillStyle = val('fg'); x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 ' + Math.round(box * (t.length > 1 ? 0.62 : 0.85)) + 'px system-ui, "Segoe UI", Arial, sans-serif'; x.fillText(t, size / 2, size / 2 + box * 0.04); }
    return c;
  }
  function png(c) { return new Promise(function (res) { c.toBlob(function (b) { b.arrayBuffer().then(function (a) { res(new Uint8Array(a)); }); }, 'image/png'); }); }
  function build() {
    var my = ++seq, base = (val('base') || '/'); if (!/\/$/.test(base)) base += '/';
    var wantMask = val('maskable'), sizes = [['favicon-16.png', 16, 'any'], ['favicon-32.png', 32, 'any'], ['favicon-48.png', 48, 'any'], ['apple-touch-icon.png', 180, 'apple'], ['icon-192.png', 192, 'any'], ['icon-512.png', 512, 'any']];
    if (wantMask) sizes.push(['maskable-512.png', 512, 'maskable']);
    var cs = sizes.map(function (s) { var c = s[2] === 'apple' ? (function () { var save = $('[data-f=shape]').value; var cc = d.createElement('canvas'); cc.width = cc.height = 180; var x = cc.getContext('2d'); x.fillStyle = val('bg'); x.fillRect(0, 0, 180, 180); var o = draw(180, 'any'); x.drawImage(o, 0, 0); return cc; })() : draw(s[1], s[2]); return { name: s[0], c: c, size: s[1] }; });
    return Promise.all(cs.map(function (s) { return png(s.c).then(function (b) { s.data = b; return s; }); })).then(function (list) {
      if (my !== seq) return null;
      var by = {}; list.forEach(function (s) { by[s.name] = s; });
      var icoBytes = F.ico([by['favicon-16.png'].data, by['favicon-32.png'].data, by['favicon-48.png'].data]);
      var files = [{ name: 'favicon.ico', data: icoBytes }].concat(list.map(function (s) { return { name: s.name, data: s.data }; }));
      var o = { base: base, name: val('name'), short: val('short'), theme: val('theme'), bg: val('bg'), maskable: wantMask };
      files.push({ name: 'site.webmanifest', data: new TextEncoder().encode(F.manifest(o)) });
      var sn = F.snippet(o); files.push({ name: 'head-snippet.html', data: new TextEncoder().encode(sn) });
      last = { files: files, list: list, snippet: sn, ico: icoBytes };
      return last;
    });
  }
  function show() {
    build().then(function (r) {
      if (!r) return;
      var pv = $('[data-preview]'); pv.innerHTML = '';
      r.list.forEach(function (s) { var f = d.createElement('figure'); var cv = d.createElement('canvas'); cv.width = cv.height = s.size; cv.style.width = Math.min(s.size, 96) + 'px'; cv.style.height = Math.min(s.size, 96) + 'px'; cv.getContext('2d').drawImage(s.c, 0, 0); cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', s.name); f.appendChild(cv); var cap = d.createElement('figcaption'); cap.textContent = s.name + ' (' + s.size + '×' + s.size + ')'; f.appendChild(cap); pv.appendChild(f); });
      $('[data-snippet]').textContent = r.snippet; $('[data-files]').textContent = r.files.map(function (f) { return f.name + ' (' + f.data.length.toLocaleString('en-IN') + ' bytes)'; }).join('\n');
    });
  }
  function later() { clearTimeout(timer); timer = setTimeout(show, 150); }
  root.addEventListener('input', later); root.addEventListener('change', function (e) { var t = e.target; if (t.tagName === 'SELECT' || /^(checkbox|radio|color|date|file|range)$/.test(t.type)) later(); });
  $('[data-file]').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) { img = null; later(); return; }
    var u = URL.createObjectURL(f), im = new Image();
    im.onload = function () { img = im.width && im.height ? im : null; $('[data-imgnote]').textContent = img ? 'Using ' + f.name + ' (' + im.width + '×' + im.height + ').' : 'This image has no size. Try a PNG, JPEG or WebP.'; show(); };
    im.onerror = function () { img = null; $('[data-imgnote]').textContent = 'This file could not be read as an image. Try PNG, JPEG, WebP or SVG.'; show(); };
    im.src = u;
  });
  $('[data-clearimg]').addEventListener('click', function () { $('[data-file]').value = ''; img = null; $('[data-imgnote]').textContent = 'No picture chosen: the letter is used.'; show(); });
  $('[data-zip]').addEventListener('click', function () {
    (last ? Promise.resolve(last) : build()).then(function (r) { var a = d.createElement('a'); a.href = URL.createObjectURL(new Blob([F.zip(r.files)], { type: 'application/zip' })); a.download = 'favicon-pack.zip'; d.body.appendChild(a); a.click(); a.remove(); });
  });
  $('[data-copysnip]').addEventListener('click', function () { S.copy($('[data-snippet]').textContent, 'Copied'); });
  show();
})();
