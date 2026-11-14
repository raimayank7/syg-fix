/* tokcore.js: rough token estimates and cost arithmetic. Estimates only: real counts come from each maker's own tokenizer. Browser: window.TokCore. Node: module.exports. Tested by test_tok.py. */
(function (root) {
  'use strict';
  function words(t) { var m = String(t).trim().match(/\S+/g); return m ? m.length : 0; }
  function chars(t) { return Array.from(String(t)).length; }   /* characters, not UTF-16 units */
  function nonLatinShare(t) { var a = Array.from(String(t).replace(/\s/g, '')), n = 0; a.forEach(function (c) { if (c.codePointAt(0) > 0x24f) n++; }); return a.length ? n / a.length : 0; }
  /* Two rules of thumb from the Gemini API documentation: about 4 characters per token, and 100 tokens is about 60 to 80 English words (1.25 to 1.67 tokens per word). */
  function estimate(t) {
    var c = chars(t), w = words(t), byChars = Math.ceil(c / 4), lo = Math.ceil(w * 100 / 80), hi = Math.ceil(w * 100 / 60);
    return { chars: c, words: w, byChars: byChars, wordsLow: lo, wordsHigh: hi, low: Math.min(byChars, lo), high: Math.max(byChars, hi), nonLatin: nonLatinShare(t) };
  }
  function cost(tokens, pricePerMillion) { return tokens / 1e6 * pricePerMillion; }
  function fit(tokens, windowSize, reserve) { var free = windowSize - (reserve || 0); return { free: free, left: free - tokens, fits: tokens <= free, share: free > 0 ? tokens / free : Infinity }; }
  var api = { words: words, chars: chars, nonLatinShare: nonLatinShare, estimate: estimate, cost: cost, fit: fit };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TokCore = api;
})(typeof window !== 'undefined' ? window : this);
