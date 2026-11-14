/* modcore.js: monthly cost of a workload at per-million-token prices, with price changes on a date. Browser: window.ModCore. Node: module.exports. Tested by test_models.py. */
(function (root) {
  'use strict';
  function phase(m, today) { return m.later && m.until && today > m.until ? { p: m.later, which: 'later' } : { p: m.now, which: m.later ? 'now' : 'only' }; }
  function cost(p, inTok, outTok, requests, batch) {
    var f = batch ? 0.5 : 1, per = (inTok * p[0] + outTok * p[1]) / 1e6 * f;
    return { perRequest: per, month: per * requests };
  }
  function rank(models, today, inTok, outTok, requests, batch) {
    return models.map(function (m) { var ph = phase(m, today), c = cost(ph.p, inTok, outTok, requests, batch && m.batch); return { name: m.name, maker: m.maker, price: ph.p, which: ph.which, perRequest: c.perRequest, month: c.month, laterMonth: m.later ? cost(m.later, inTok, outTok, requests, batch && m.batch).month : null, until: m.until || null }; })
      .sort(function (a, b) { return a.month - b.month || (a.name < b.name ? -1 : 1); });
  }
  var api = { phase: phase, cost: cost, rank: rank };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ModCore = api;
})(typeof window !== 'undefined' ? window : this);
