/* memcore.js: memory estimate for running a language model locally: weights + KV cache + a margin, and the default context length Ollama picks for an amount of VRAM (from Ollama's own documentation, read 14 November 2026).
   An ESTIMATE from textbook transformer arithmetic: real programs add buffers and differ by model. Browser: window.MemCore. Node: module.exports. Tested by test_mem.py. */
(function (root) {
  'use strict';
  var GIB = 1073741824;
  function weightsBytes(paramsB, bits) { return paramsB * 1e9 * bits / 8; }
  /* KV cache: 2 (keys and values) x layers x kv heads x head dim x context tokens x bytes per value */
  function kvBytes(layers, kvHeads, headDim, ctx, bytesPer) { return 2 * layers * kvHeads * headDim * ctx * bytesPer; }
  function estimate(o) {
    var w = weightsBytes(o.paramsB, o.bits), kv = o.layers && o.kvHeads && o.headDim ? kvBytes(o.layers, o.kvHeads, o.headDim, o.ctx, o.kvBytes) : 0, sub = w + kv, tot = sub * (1 + o.margin / 100);
    return { weights: w, kv: kv, total: tot, weightsGiB: w / GIB, kvGiB: kv / GIB, totalGiB: tot / GIB, fits: o.vramGiB ? tot <= o.vramGiB * GIB : null, spareGiB: o.vramGiB ? o.vramGiB - tot / GIB : null };
  }
  /* Ollama docs, "Context length": < 24 GiB VRAM: 4k; 24-48 GiB: 32k; >= 48 GiB: 256k */
  function ollamaDefaultCtx(vramGiB) { return vramGiB < 24 ? '4k' : vramGiB < 48 ? '32k' : '256k'; }
  var api = { GIB: GIB, weightsBytes: weightsBytes, kvBytes: kvBytes, estimate: estimate, ollamaDefaultCtx: ollamaDefaultCtx };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MemCore = api;
})(typeof window !== 'undefined' ? window : this);
