/* itemcore.js: checks whether JSON has the shape n8n passes between nodes (docs.n8n.io "Understand n8n's data structure"):
   an array of objects; each wraps its data under the key "json" (and binary data under "binary", where each file needs "data").
   The Code and Function nodes add a missing "json" key and wrap items in an array automatically (docs, since 0.166.0). */
(function (root) {
  'use strict';
  function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function check(text) {
    var r = { ok: false, problems: [], notes: [], fixed: null, count: 0 }, v;
    try { v = JSON.parse(text); } catch (e) { r.problems.push('This is not valid JSON: ' + e.message); return r; }
    var arr = Array.isArray(v), items = arr ? v : [v], fixed = [], auto = false;
    if (!arr) r.problems.push('Not an array. n8n passes data between nodes as an array of objects (items).');
    items.forEach(function (it, i) {
      var n = 'Item ' + (i + 1) + ': ';
      if (!isObj(it)) { r.problems.push(n + 'must be an object, not ' + (it === null ? 'null' : Array.isArray(it) ? 'an array' : typeof it) + '.'); fixed.push({ json: { value: it } }); return; }
      var hasJ = Object.prototype.hasOwnProperty.call(it, 'json'), hasB = Object.prototype.hasOwnProperty.call(it, 'binary');
      if (!hasJ && !hasB) { r.problems.push(n + 'has no "json" key. Wrap the data in {"json": ...}.'); fixed.push({ json: it }); return; }
      if (hasJ && !isObj(it.json)) r.problems.push(n + '"json" should be an object holding the data.');
      if (hasB) {
        if (!isObj(it.binary)) r.problems.push(n + '"binary" should be an object with one entry per file.');
        else Object.keys(it.binary).forEach(function (k) {
          var b = it.binary[k];
          if (!isObj(b) || typeof b.data !== 'string') r.problems.push(n + 'binary "' + k + '" needs a "data" text (Base64 encoded binary data).');
          else ['mimeType', 'fileExtension', 'fileName'].forEach(function (f) { if (!(f in b)) r.notes.push(n + 'binary "' + k + '" has no "' + f + '" (optional, but the docs say it is best practice to set it).'); });
        });
      }
      Object.keys(it).forEach(function (k) { if (k !== 'json' && k !== 'binary') r.notes.push(n + 'extra key "' + k + '" is not part of the documented item shape.'); });
      fixed.push(it);
    });
    r.count = items.length;
    if (!items.length) r.notes.push('The array is empty: a node that receives no items has nothing to process.');
    r.ok = !r.problems.length;
    if (!r.ok) r.fixed = fixed;
    return r;
  }
  root.ItemCore = { check: check };
  if (typeof module !== 'undefined') module.exports = root.ItemCore;
})(typeof window !== 'undefined' ? window : globalThis);
