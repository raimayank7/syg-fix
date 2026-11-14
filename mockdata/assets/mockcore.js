/* mockcore.js: fake test data (made-up people, example.com e-mail addresses, Indian cities) with a seed, written as CSV, JSON or SQL.
   No field makes an ID number of any kind (PAN, Aadhaar, GSTIN, bank account, phone): none is offered on purpose. Browser: window.MockCore. Node: module.exports. Tested by test_mock.py. */
(function (root) {
  'use strict';
  var FIRST = ['Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Ishaan', 'Kabir', 'Rohan', 'Karan', 'Manav', 'Nikhil', 'Harpreet', 'Gurpreet', 'Jaspreet', 'Simran', 'Navneet', 'Ananya', 'Diya', 'Isha', 'Kavya', 'Meera', 'Priya', 'Riya', 'Sana', 'Tara', 'Neha', 'Pooja', 'Anjali', 'Sunita', 'Rajesh', 'Suresh'];
  var LAST = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Kaur', 'Mehta', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Das', 'Bose', 'Khan', 'Ahmed', 'Joshi', 'Kulkarni', 'Chopra', 'Malhotra', 'Bhatia', 'Sethi', 'Gill', 'Sandhu', 'Mishra', 'Yadav', 'Pillai'];
  var CITY = [['Ludhiana', 'Punjab'], ['Amritsar', 'Punjab'], ['Jalandhar', 'Punjab'], ['Delhi', 'Delhi'], ['Mumbai', 'Maharashtra'], ['Pune', 'Maharashtra'], ['Nagpur', 'Maharashtra'], ['Bengaluru', 'Karnataka'], ['Mysuru', 'Karnataka'], ['Chennai', 'Tamil Nadu'], ['Coimbatore', 'Tamil Nadu'], ['Hyderabad', 'Telangana'], ['Kolkata', 'West Bengal'], ['Ahmedabad', 'Gujarat'], ['Surat', 'Gujarat'], ['Jaipur', 'Rajasthan'], ['Udaipur', 'Rajasthan'], ['Lucknow', 'Uttar Pradesh'], ['Kanpur', 'Uttar Pradesh'], ['Patna', 'Bihar'], ['Bhopal', 'Madhya Pradesh'], ['Indore', 'Madhya Pradesh'], ['Kochi', 'Kerala'], ['Thiruvananthapuram', 'Kerala'], ['Guwahati', 'Assam'], ['Chandigarh', 'Chandigarh'], ['Dehradun', 'Uttarakhand'], ['Ranchi', 'Jharkhand']];
  var WORDS = ['order', 'invoice', 'delivery', 'sample', 'urgent', 'repeat', 'payment', 'pending', 'checked', 'ready', 'stock', 'price', 'quote', 'return', 'refund', 'support', 'meeting', 'update', 'report', 'review'];
  var FIELDS = { id: 'Number (1, 2, 3...)', uuid: 'UUID-shaped text', first_name: 'First name', last_name: 'Last name', full_name: 'Full name', email: 'E-mail (example.com)', city: 'City', state: 'State of the city', age: 'Age (18 to 80)', joined: 'Date (2020 to 2025)', amount: 'Amount (0 to 100000)', active: 'True or false', score: 'Score (1 to 5)', note: 'Short note' };
  function rng(seed) { var a = (seed >>> 0) || 1; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function pick(r, a) { return a[Math.floor(r() * a.length)]; }
  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
  function rows(fields, n, seed) {
    var r = rng(seed), out = [], i;
    for (i = 1; i <= n; i++) {
      var f = pick(r, FIRST), l = pick(r, LAST), c = pick(r, CITY), o = {};
      var d = new Date(Date.UTC(2020, 0, 1) + Math.floor(r() * 2192) * 86400000);
      var hex = ''; for (var k = 0; k < 32; k++) hex += Math.floor(r() * 16).toString(16);
      var vals = { id: i, uuid: hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-4' + hex.slice(13, 16) + '-' + '89ab'[Math.floor(r() * 4)] + hex.slice(17, 20) + '-' + hex.slice(20, 32), first_name: f, last_name: l, full_name: f + ' ' + l,
        email: f.toLowerCase() + '.' + l.toLowerCase() + i + '@example.com', city: c[0], state: c[1], age: 18 + Math.floor(r() * 63), joined: d.toISOString().slice(0, 10), amount: Math.round(r() * 10000000) / 100, active: r() < 0.5, score: 1 + Math.floor(r() * 5),
        note: pick(r, WORDS) + ' ' + pick(r, WORDS) + ' ' + pick(r, WORDS) };
      fields.forEach(function (k2) { o[k2] = vals[k2]; });
      out.push(o);
    }
    return out;
  }
  function csvCell(v) { var s = String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function csv(fields, data) { return fields.join(',') + '\r\n' + data.map(function (r) { return fields.map(function (k) { return csvCell(r[k]); }).join(','); }).join('\r\n') + '\r\n'; }
  function json(data) { return JSON.stringify(data, null, 2) + '\n'; }
  var NUMERIC = { id: 1, age: 1, amount: 1, score: 1 };
  function sqlv(k, v) { return typeof v === 'boolean' ? (v ? '1' : '0') : NUMERIC[k] ? String(v) : "'" + String(v).replace(/'/g, "''") + "'"; }
  function sql(fields, data, table) {
    var T = (table || 'people').replace(/[^A-Za-z0-9_]/g, '_') || 'people', ty = function (k) { return k === 'id' || k === 'age' || k === 'score' || k === 'active' ? 'INTEGER' : k === 'amount' ? 'REAL' : 'TEXT'; };
    var s = 'CREATE TABLE ' + T + ' (' + fields.map(function (k) { return k + ' ' + ty(k); }).join(', ') + ');\n';
    data.forEach(function (r) { s += 'INSERT INTO ' + T + ' (' + fields.join(', ') + ') VALUES (' + fields.map(function (k) { return sqlv(k, r[k]); }).join(', ') + ');\n'; });
    return s;
  }
  var api = { FIELDS: FIELDS, CITY: CITY, rows: rows, csv: csv, json: json, sql: sql, rng: rng };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MockCore = api;
})(typeof window !== 'undefined' ? window : this);
