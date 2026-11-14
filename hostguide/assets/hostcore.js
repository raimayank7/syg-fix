/* hostcore.js: checks a site's size and traffic against the documented free limits of GitHub Pages, Cloudflare Pages (Free plan) and Netlify (Free plan, credit based).
   The numbers are the ones printed on the hosts' own pages on 14 November 2026 (LIMITS below): they change, so the page says so. Browser: window.HostCore. Node: module.exports. Tested by test_host.py. */
(function (root) {
  'use strict';
  var LIMITS = {
    github: { siteMB: 1024, softBandwidthGB: 100, softBuildsPerHour: 10, buildTimeoutMin: 10 },
    cloudflare: { files: 20000, fileMiB: 25, buildsPerMonth: 500, domainsPerProject: 100, buildTimeoutMin: 20 },
    netlify: { creditsPerMonth: 300, perGB: 20, per10kRequests: 2, perProdDeploy: 15 }
  };
  function evaluate(o) {
    var gbMonth = o.visits * o.pageKB / 1e6, reqs = o.visits * o.reqPerVisit, r = {}, L = LIMITS;
    r.gbMonth = gbMonth;
    var g = [];
    g.push({ ok: o.siteMB <= L.github.siteMB, what: 'Site size ' + fmt(o.siteMB) + ' MB against the 1 GB maximum of a published site.' });
    g.push({ ok: gbMonth <= L.github.softBandwidthGB, what: 'About ' + fmt(gbMonth) + ' GB a month against the soft limit of 100 GB.' });
    g.push({ ok: true, note: true, what: 'Soft limit of 10 builds per hour does not apply if you build with your own GitHub Actions workflow.' });
    r.github = g;
    var c = [];
    c.push({ ok: o.files <= L.cloudflare.files, what: o.files + ' files against the Free plan maximum of 20,000.' });
    var mib = o.bigMB * 1e6 / 1048576; r.mib = mib;
    c.push({ ok: mib <= L.cloudflare.fileMiB, what: 'Largest file ' + fmt(o.bigMB) + ' MB (' + fmt(mib) + ' MiB) against the 25 MiB maximum.' });
    c.push({ ok: o.deploys <= L.cloudflare.buildsPerMonth, what: o.deploys + ' builds a month against 500 on the Free plan.' });
    r.cloudflare = c;
    var credits = gbMonth * L.netlify.perGB + reqs / 1e4 * L.netlify.per10kRequests + o.deploys * L.netlify.perProdDeploy;
    r.netlify = [{ ok: credits <= L.netlify.creditsPerMonth, what: 'About ' + fmt(credits) + ' credits a month (bandwidth ' + fmt(gbMonth * L.netlify.perGB) + ', requests ' + fmt(reqs / 1e4 * L.netlify.per10kRequests) + ', production deploys ' + fmt(o.deploys * L.netlify.perProdDeploy) + ') against the Free limit of 300.' }];
    r.credits = credits;
    return r;
  }
  function fmt(x) { return x >= 100 ? String(Math.round(x)) : x >= 1 ? String(Math.round(x * 10) / 10) : String(Math.round(x * 1000) / 1000); }
  function verdict(list) { return list.every(function (x) { return x.ok; }); }
  var api = { LIMITS: LIMITS, evaluate: evaluate, verdict: verdict, fmt: fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HostCore = api;
})(typeof window !== 'undefined' ? window : this);
