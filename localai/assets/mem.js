/* mem.js: the memory estimator page. Browser only. Uses MemCore. */
(function () {
  'use strict';
  var d = document, M = window.MemCore, root = d.querySelector('[data-mem]'); if (!root) return;
  function num(k) { var v = parseFloat(root.querySelector('[data-f=' + k + ']').value); return isFinite(v) && v >= 0 ? v : 0; }
  function g(x) { return (Math.round(x * 100) / 100).toLocaleString('en-US') + ' GiB'; }
  function run() {
    var o = { paramsB: num('p'), bits: num('b'), layers: Math.round(num('l')), kvHeads: num('h'), headDim: num('hd'), ctx: Math.round(num('c')), kvBytes: num('kb'), margin: num('m'), vramGiB: num('v') }, e = M.estimate(o), h = '<div class="result"><dl class="facts"><dt>Weights</dt><dd>' + g(e.weightsGiB) + '</dd><dt>KV cache (' + o.ctx.toLocaleString('en-US') + ' tokens)</dt><dd>' + (e.kv ? g(e.kvGiB) : 'not counted: fill in layers, KV heads and head size') + '</dd><dt>Total with ' + o.margin + '% margin</dt><dd><b>' + g(e.totalGiB) + '</b></dd></dl>';
    if (o.vramGiB) h += '<p class="verdict ' + (e.fits ? 'good' : 'bad') + '">' + (e.fits ? 'It should fit in ' + g(o.vramGiB) + ', with about ' + g(e.spareGiB) + ' to spare.' : 'It does not fit in ' + g(o.vramGiB) + ': it needs about ' + g(-e.spareGiB) + ' more. Use fewer bits, a shorter context or a smaller model.') + '</p><p>For ' + g(o.vramGiB) + ' of VRAM, Ollama\'s documentation says its default context length is ' + M.ollamaDefaultCtx(o.vramGiB) + ' tokens.</p>';
    root.querySelector('[data-out]').innerHTML = h + '<p class="hint">An estimate from arithmetic. Programs add buffers, and models differ: check with the real program (in Ollama, <code>ollama ps</code> shows the size and the GPU/CPU split).</p></div>';
  }
  root.addEventListener('input', run); run();
})();
