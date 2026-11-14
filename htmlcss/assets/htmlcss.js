window.HC_SHAPES={"triangle": "50% 0%, 0% 100%, 100% 100%", "trapezoid": "20% 0%, 80% 0%, 100% 100%, 0% 100%", "parallelogram": "25% 0%, 100% 0%, 75% 100%, 0% 100%", "rhombus": "50% 0%, 100% 50%, 50% 100%, 0% 50%", "pentagon": "50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%", "hexagon": "25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%", "octagon": "30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%", "star": "50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%", "arrow": "0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%", "cross": "35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%", "message": "0% 0%, 100% 0%, 100% 75%, 75% 75%, 75% 100%, 50% 75%, 0% 75%", "chevron": "75% 0%, 100% 50%, 75% 100%, 0% 100%, 25% 50%, 0% 0%"};
/* htmlcss.js: eight CSS generators (gradient, shadow, flexbox, grid, clip-path, glass, animation, radius). Each page holds <div data-gen="name">.
   Controls are built from a spec; the output is plain CSS you can copy. Nothing leaves the browser. */
(function () {
  'use strict';
  var d = document, S = window.SYG;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rgba(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ', ' + (+a).toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + ')'; }

  var GEN = {};

  GEN.gradient = {
    ctl: [
      { id: 'type', l: 'Type', t: 'select', o: ['linear', 'radial', 'conic'], v: 'linear' },
      { id: 'angle', l: 'Angle (degrees)', t: 'range', min: 0, max: 360, v: 135, show: function (v) { return v.type !== 'radial'; } },
      { id: 'shape', l: 'Shape', t: 'select', o: ['circle', 'ellipse'], v: 'circle', show: function (v) { return v.type === 'radial'; } },
      { id: 'cx', l: 'Centre across (%)', t: 'range', min: 0, max: 100, v: 50, show: function (v) { return v.type !== 'linear'; } },
      { id: 'cy', l: 'Centre down (%)', t: 'range', min: 0, max: 100, v: 50, show: function (v) { return v.type !== 'linear'; } },
      { id: 'c1', l: 'Colour 1', t: 'color', v: '#ff7e5f' }, { id: 'p1', l: 'Position 1 (%)', t: 'range', min: 0, max: 100, v: 0 },
      { id: 'c2', l: 'Colour 2', t: 'color', v: '#feb47b' }, { id: 'p2', l: 'Position 2 (%)', t: 'range', min: 0, max: 100, v: 55 },
      { id: 'use3', l: 'Use a third colour', t: 'check', v: true },
      { id: 'c3', l: 'Colour 3', t: 'color', v: '#6a4c93', show: function (v) { return v.use3; } }, { id: 'p3', l: 'Position 3 (%)', t: 'range', min: 0, max: 100, v: 100, show: function (v) { return v.use3; } }
    ],
    css: function (v) {
      var stops = v.c1 + ' ' + v.p1 + '%, ' + v.c2 + ' ' + v.p2 + '%' + (v.use3 ? ', ' + v.c3 + ' ' + v.p3 + '%' : '');
      if (v.type === 'linear') return 'background: linear-gradient(' + v.angle + 'deg, ' + stops + ');';
      if (v.type === 'radial') return 'background: radial-gradient(' + v.shape + ' at ' + v.cx + '% ' + v.cy + '%, ' + stops + ');';
      return 'background: conic-gradient(from ' + v.angle + 'deg at ' + v.cx + '% ' + v.cy + '%, ' + stops + ');';
    },
    box: 'pv-box'
  };

  GEN.shadow = {
    ctl: [
      { id: 'x', l: 'Horizontal offset (px)', t: 'range', min: -60, max: 60, v: 0 }, { id: 'y', l: 'Vertical offset (px)', t: 'range', min: -60, max: 60, v: 12 },
      { id: 'b', l: 'Blur (px)', t: 'range', min: 0, max: 100, v: 30 }, { id: 's', l: 'Spread (px)', t: 'range', min: -40, max: 60, v: -6 },
      { id: 'c', l: 'Colour', t: 'color', v: '#1b2a49' }, { id: 'a', l: 'Opacity', t: 'range', min: 0, max: 1, step: 0.01, v: 0.35 },
      { id: 'inset', l: 'Inset (inside the box)', t: 'check', v: false },
      { id: 'two', l: 'Add a second, softer layer', t: 'check', v: true }
    ],
    css: function (v) {
      var l1 = (v.inset ? 'inset ' : '') + v.x + 'px ' + v.y + 'px ' + v.b + 'px ' + v.s + 'px ' + rgba(v.c, v.a);
      var l2 = (v.inset ? 'inset ' : '') + Math.round(v.x / 3) + 'px ' + Math.round(v.y / 3) + 'px ' + Math.round(v.b / 3) + 'px 0 ' + rgba(v.c, v.a / 2);
      return 'box-shadow: ' + l1 + (v.two ? ',\n            ' + l2 : '') + ';';
    },
    box: 'pv-card'
  };

  GEN.flexbox = {
    ctl: [
      { id: 'dir', l: 'flex-direction', t: 'select', o: ['row', 'row-reverse', 'column', 'column-reverse'], v: 'row' },
      { id: 'wrap', l: 'flex-wrap', t: 'select', o: ['nowrap', 'wrap', 'wrap-reverse'], v: 'nowrap' },
      { id: 'jc', l: 'justify-content', t: 'select', o: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'], v: 'center' },
      { id: 'ai', l: 'align-items', t: 'select', o: ['stretch', 'flex-start', 'center', 'flex-end', 'baseline'], v: 'center' },
      { id: 'ac', l: 'align-content (when items wrap)', t: 'select', o: ['normal', 'flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'stretch'], v: 'normal' },
      { id: 'gap', l: 'gap (px)', t: 'range', min: 0, max: 40, v: 10 }, { id: 'n', l: 'Number of items', t: 'range', min: 1, max: 12, v: 4 }
    ],
    css: function (v) {
      var s = 'display: flex;\nflex-direction: ' + v.dir + ';\nflex-wrap: ' + v.wrap + ';\njustify-content: ' + v.jc + ';\nalign-items: ' + v.ai + ';';
      if (v.ac !== 'normal') s += '\nalign-content: ' + v.ac + ';';
      return s + '\ngap: ' + v.gap + 'px;';
    },
    box: 'pv-flex'
  };

  GEN.grid = {
    ctl: [
      { id: 'mode', l: 'Columns', t: 'select', o: ['fixed number', 'as many as fit (auto-fit)'], v: 'fixed number' },
      { id: 'cols', l: 'Number of columns', t: 'range', min: 1, max: 8, v: 3, show: function (v) { return v.mode === 'fixed number'; } },
      { id: 'min', l: 'Minimum column width (px)', t: 'range', min: 60, max: 300, v: 120, show: function (v) { return v.mode !== 'fixed number'; } },
      { id: 'rows', l: 'Row height', t: 'select', o: ['auto', '60px', '100px', 'minmax(60px, auto)'], v: 'auto' },
      { id: 'gap', l: 'gap (px)', t: 'range', min: 0, max: 40, v: 12 }, { id: 'n', l: 'Number of items', t: 'range', min: 1, max: 16, v: 7 },
      { id: 'ji', l: 'justify-items', t: 'select', o: ['stretch', 'start', 'center', 'end'], v: 'stretch' }
    ],
    css: function (v) {
      var cols = v.mode === 'fixed number' ? 'repeat(' + v.cols + ', 1fr)' : 'repeat(auto-fit, minmax(' + v.min + 'px, 1fr))';
      var s = 'display: grid;\ngrid-template-columns: ' + cols + ';';
      if (v.rows !== 'auto') s += '\ngrid-auto-rows: ' + v.rows + ';';
      s += '\ngap: ' + v.gap + 'px;';
      if (v.ji !== 'stretch') s += '\njustify-items: ' + v.ji + ';';
      return s;
    },
    box: 'pv-grid'
  };

  var SHAPES = window.HC_SHAPES || {};
  GEN.clip = {
    ctl: [
      { id: 'shape', l: 'Shape', t: 'select', o: ['circle', 'ellipse', 'inset (rounded rectangle)'].concat(Object.keys(SHAPES)), v: 'hexagon' },
      { id: 'r', l: 'Size (%)', t: 'range', min: 10, max: 100, v: 50, show: function (v) { return v.shape === 'circle' || v.shape === 'ellipse'; } },
      { id: 'in', l: 'Inset (%)', t: 'range', min: 0, max: 40, v: 8, show: function (v) { return v.shape.indexOf('inset') === 0; } },
      { id: 'rad', l: 'Corner radius (px)', t: 'range', min: 0, max: 80, v: 24, show: function (v) { return v.shape.indexOf('inset') === 0; } }
    ],
    css: function (v) {
      if (v.shape === 'circle') return 'clip-path: circle(' + v.r + '% at 50% 50%);';
      if (v.shape === 'ellipse') return 'clip-path: ellipse(' + v.r + '% ' + Math.round(v.r * 0.7) + '% at 50% 50%);';
      if (v.shape.indexOf('inset') === 0) return 'clip-path: inset(' + v.in + '% round ' + v.rad + 'px);';
      return 'clip-path: polygon(' + SHAPES[v.shape].replace(/, /g, ',\n                     ') + ');';
    },
    box: 'pv-clip'
  };

  GEN.glass = {
    ctl: [
      { id: 'blur', l: 'Blur (px)', t: 'range', min: 0, max: 40, v: 14 }, { id: 'a', l: 'Panel opacity', t: 'range', min: 0, max: 1, step: 0.01, v: 0.18 },
      { id: 'tint', l: 'Panel colour', t: 'color', v: '#ffffff' }, { id: 'sat', l: 'Saturation (%)', t: 'range', min: 50, max: 250, v: 140 },
      { id: 'ba', l: 'Border opacity', t: 'range', min: 0, max: 1, step: 0.01, v: 0.35 }, { id: 'rad', l: 'Corner radius (px)', t: 'range', min: 0, max: 60, v: 20 }
    ],
    css: function (v) {
      return 'background: ' + rgba(v.tint, v.a) + ';\n-webkit-backdrop-filter: blur(' + v.blur + 'px) saturate(' + v.sat + '%);\nbackdrop-filter: blur(' + v.blur + 'px) saturate(' + v.sat + '%);\nborder: 1px solid ' + rgba(v.tint, v.ba) + ';\nborder-radius: ' + v.rad + 'px;';
    },
    box: 'pv-glass'
  };

  var KF = {
    fade: '0% { opacity: 0; }\n  100% { opacity: 1; }', 'slide up': '0% { opacity: 0; transform: translateY(30px); }\n  100% { opacity: 1; transform: translateY(0); }',
    'slide in left': '0% { opacity: 0; transform: translateX(-40px); }\n  100% { opacity: 1; transform: translateX(0); }', zoom: '0% { opacity: 0; transform: scale(0.6); }\n  100% { opacity: 1; transform: scale(1); }',
    bounce: '0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-30px); }', pulse: '0%, 100% { transform: scale(1); }\n  50% { transform: scale(1.12); }',
    spin: '0% { transform: rotate(0deg); }\n  100% { transform: rotate(360deg); }', shake: '0%, 100% { transform: translateX(0); }\n  20%, 60% { transform: translateX(-10px); }\n  40%, 80% { transform: translateX(10px); }'
  };
  GEN.anim = {
    ctl: [
      { id: 'kind', l: 'Effect', t: 'select', o: Object.keys(KF), v: 'bounce' },
      { id: 'dur', l: 'Duration (seconds)', t: 'range', min: 0.2, max: 5, step: 0.1, v: 1.2 },
      { id: 'ease', l: 'Timing function', t: 'select', o: ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier(0.34, 1.56, 0.64, 1)', 'steps(6, end)'], v: 'ease-in-out' },
      { id: 'delay', l: 'Delay (seconds)', t: 'range', min: 0, max: 3, step: 0.1, v: 0 },
      { id: 'iter', l: 'Repeat', t: 'select', o: ['1', '3', 'infinite'], v: 'infinite' },
      { id: 'dirn', l: 'Direction', t: 'select', o: ['normal', 'reverse', 'alternate'], v: 'normal' }
    ],
    css: function (v) {
      var name = v.kind.replace(/ /g, '-');
      return '@keyframes ' + name + ' {\n  ' + KF[v.kind] + '\n}\n\n.element {\n  animation: ' + name + ' ' + v.dur + 's ' + v.ease + ' ' + v.delay + 's ' + v.iter + ' ' + v.dirn + ' both;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .element { animation: none; }\n}';
    },
    box: 'pv-anim'
  };

  GEN.radius = {
    ctl: [
      { id: 'tl', l: 'Top-left across (%)', t: 'range', min: 0, max: 100, v: 60 }, { id: 'tr', l: 'Top-right across (%)', t: 'range', min: 0, max: 100, v: 40 },
      { id: 'br', l: 'Bottom-right across (%)', t: 'range', min: 0, max: 100, v: 55 }, { id: 'bl', l: 'Bottom-left across (%)', t: 'range', min: 0, max: 100, v: 45 },
      { id: 'tl2', l: 'Top-left down (%)', t: 'range', min: 0, max: 100, v: 55 }, { id: 'tr2', l: 'Top-right down (%)', t: 'range', min: 0, max: 100, v: 60 },
      { id: 'br2', l: 'Bottom-right down (%)', t: 'range', min: 0, max: 100, v: 40 }, { id: 'bl2', l: 'Bottom-left down (%)', t: 'range', min: 0, max: 100, v: 45 }
    ],
    css: function (v) { return 'border-radius: ' + v.tl + '% ' + v.tr + '% ' + v.br + '% ' + v.bl + '% / ' + v.tl2 + '% ' + v.tr2 + '% ' + v.br2 + '% ' + v.bl2 + '%;'; },
    box: 'pv-blob',
    extra: '<button type="button" class="btn sm ghost" data-random>Random shape</button>'
  };

  function build(root) {
    var g = GEN[root.getAttribute('data-gen')]; if (!g) return;
    var vals = {}, ctls = '', i;
    g.ctl.forEach(function (c) { vals[c.id] = c.v; });
    var pv = d.createElement('div'); pv.className = 'pv ' + g.box;
    var inner = '';
    if (g.box === 'pv-flex' || g.box === 'pv-grid') inner = '<div class="pv-items"></div>';
    else if (g.box === 'pv-glass') inner = '<div class="pv-bg"></div><div class="pv-panel"><b>Frosted glass</b><span>The picture behind blurs</span></div>';
    else if (g.box === 'pv-card') inner = '<div class="pv-inner">Box with shadow</div>';
    else inner = '<div class="pv-inner"></div>';
    pv.innerHTML = inner;
    var form = d.createElement('div'); form.className = 'fields gen-ctl';
    g.ctl.forEach(function (c) {
      var id = 'g-' + c.id, h = '<div data-c="' + c.id + '"><label for="' + id + '">' + esc(c.l) + (c.t === 'range' ? ' <output></output>' : '') + '</label>';
      if (c.t === 'range') h += '<input type="range" id="' + id + '" min="' + c.min + '" max="' + c.max + '" step="' + (c.step || 1) + '" value="' + c.v + '">';
      else if (c.t === 'color') h += '<input type="color" id="' + id + '" value="' + c.v + '">';
      else if (c.t === 'check') h += '<input type="checkbox" id="' + id + '"' + (c.v ? ' checked' : '') + '>';
      else h += '<select id="' + id + '">' + c.o.map(function (o) { return '<option' + (o === c.v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
      form.insertAdjacentHTML('beforeend', h + '</div>');
    });
    var out = d.createElement('pre'); out.className = 'code'; out.innerHTML = '<code></code>';
    var btn = d.createElement('button'); btn.type = 'button'; btn.className = 'copy'; btn.textContent = 'Copy'; out.appendChild(btn);
    var wrap = d.createElement('div'); wrap.className = 'gen-wrap';
    wrap.appendChild(pv); wrap.appendChild(form);
    if (g.extra) { var ex = d.createElement('p'); ex.innerHTML = g.extra; wrap.appendChild(ex); }
    root.appendChild(wrap); root.appendChild(out);

    function read() {
      g.ctl.forEach(function (c) {
        var el = form.querySelector('#g-' + c.id), cell = form.querySelector('[data-c="' + c.id + '"]');
        vals[c.id] = c.t === 'check' ? el.checked : (c.t === 'range' ? parseFloat(el.value) : el.value);
        var o = cell.querySelector('output'); if (o) o.textContent = vals[c.id];
      });
      g.ctl.forEach(function (c) { var cell = form.querySelector('[data-c="' + c.id + '"]'); cell.hidden = !!(c.show && !c.show(vals)); });
    }
    function paint() {
      read();
      var css = g.css(vals);
      out.querySelector('code').textContent = css;
      var target = pv.querySelector('.pv-inner') || pv.querySelector('.pv-panel') || pv.querySelector('.pv-items');
      var key = g.box;
      if (key === 'pv-flex' || key === 'pv-grid') {
        var it = pv.querySelector('.pv-items'); it.setAttribute('style', css.replace(/\n/g, ' '));
        var n = vals.n; if (it.children.length !== n) { it.innerHTML = ''; for (var k = 1; k <= n; k++) { var s = d.createElement('span'); s.textContent = k; if (key === 'pv-flex') { s.style.padding = (8 + (k % 3) * 8) + 'px 14px'; } it.appendChild(s); } }
      } else if (key === 'pv-anim') {
        var st = d.getElementById('anim-style') || d.head.appendChild(Object.assign(d.createElement('style'), { id: 'anim-style' }));
        st.textContent = css.replace('.element', '.pv-anim .pv-inner').replace(/@media[\s\S]*$/, '');
        var el2 = pv.querySelector('.pv-inner'); el2.style.animation = 'none'; void el2.offsetWidth; el2.style.animation = '';
      } else if (key === 'pv-glass') { pv.querySelector('.pv-panel').setAttribute('style', css.replace(/\n/g, ' ')); }
      else target.setAttribute('style', css.replace(/\n/g, ' ').replace(/^\s*/, ''));
      root._css = css;
    }
    form.addEventListener('input', paint); form.addEventListener('change', function (e) { var t = e.target; if (t.tagName === 'SELECT' || /^(checkbox|radio|color|date|file|range)$/.test(t.type)) paint(); });
    btn.addEventListener('click', function () { S.copy(root._css, 'CSS copied'); });
    var rnd = root.querySelector('[data-random]');
    if (rnd) rnd.addEventListener('click', function () { g.ctl.forEach(function (c) { form.querySelector('#g-' + c.id).value = 30 + Math.floor(Math.random() * 60); }); paint(); });
    paint();
    root._vals = vals; root._paint = paint;
  }
  d.querySelectorAll('[data-gen]').forEach(build);
  /* copy buttons for static code blocks and preset cards */
  d.querySelectorAll('pre.code[data-static]').forEach(function (pre) {
    var b = d.createElement('button'); b.type = 'button'; b.className = 'copy'; b.textContent = 'Copy';
    b.addEventListener('click', function () { S.copy(pre.querySelector('code').textContent, 'CSS copied'); }); pre.appendChild(b);
  });
  d.querySelectorAll('[data-css]').forEach(function (b) { b.addEventListener('click', function () { S.copy(b.getAttribute('data-css'), 'CSS copied'); }); });
})();
