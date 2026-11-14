/* iconscore.js: writes the SVG of a Lucide icon from its node list, with size, stroke width and colour; search over names and tags.
   Browser: window.IconsCore. Node: module.exports. Tested by test_icons.py against the SVG files of the lucide-static package (ISC licence). */
(function (root) {
  'use strict';
  function ea(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function et(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function node(n) { return '<' + n[0] + Object.keys(n[1]).map(function (k) { return ' ' + k + '="' + ea(n[1][k]) + '"'; }).join('') + ' />'; }
  function svg(name, nodes, o) {
    o = o || {}; var size = o.size || 24, sw = o.stroke === undefined ? 2 : o.stroke, col = o.color || 'currentColor';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + ea(col) + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"' + (o.title ? ' role="img" aria-label="' + ea(o.title) + '"' : ' aria-hidden="true"') + '>' +
      (o.title ? '\n  <title>' + et(o.title) + '</title>' : '') + '\n' + nodes.map(function (n) { return '  ' + node(n); }).join('\n') + '\n</svg>\n';
  }
  function search(list, q) {
    q = String(q || '').toLowerCase().trim(); if (!q) return list.slice();
    var ws = q.split(/\s+/), out = [];
    list.forEach(function (it) {
      var name = it[0], tags = it[1], score = 0, ok = true;
      ws.forEach(function (w) {
        if (!ok) return;
        if (name === w) score += 10; else if (name.indexOf(w) === 0) score += 6; else if (name.split('-').indexOf(w) > -1) score += 5; else if (name.indexOf(w) > -1) score += 3; else if (tags.split(' ').indexOf(w) > -1) score += 2; else if (tags.indexOf(w) > -1) score += 1; else ok = false;
      });
      if (ok) out.push([score, it]);
    });
    return out.sort(function (a, b) { return b[0] - a[0] || (a[1][0] < b[1][0] ? -1 : 1); }).map(function (x) { return x[1]; });
  }
  var api = { svg: svg, search: search };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.IconsCore = api;
})(typeof window !== 'undefined' ? window : this);
