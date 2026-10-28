// Visualizers: replay a trace recorded by lib/tracer.py, frame by frame, with the code line highlighted.
// SA.viz.mount(host, viz) builds the controls; SA.viz.renderers draw one layout item from a frame's channels.
(function (SA) {
  'use strict';
  const { el, icon } = SA;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const lit = (v) => (v === null || v === undefined ? '—' : window.SADiff.pylit(v));
  const val = (v) => (v === null || v === undefined ? '' : typeof v === 'string' ? v : window.SADiff.pylit(v));

  function svg(tag, attrs, ...kids) {
    const e = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v);
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) e.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    return e;
  }
  const asList = (x) => (Array.isArray(x) ? x : x && x.$set ? x.$set : []);
  const keyRC = (rc) => `${rc[0]},${rc[1]}`;
  const slotOf = (i) => (i < 3 ? `p${i + 1}` : 'p0');
  const TRI = '<svg viewBox="0 0 12 8" aria-hidden="true"><path d="M0 0h12L6 8z"/></svg>';

  // Pointer labels above cells: several pointers on one cell share one marker ("l=r").
  function pointerMarkers(pointers) {
    const byIndex = new Map();
    Object.entries(pointers || {}).forEach(([label, idx], order) => {
      if (idx === null || idx === undefined) return;
      if (!byIndex.has(idx)) byIndex.set(idx, []);
      byIndex.get(idx).push({ label, order });
    });
    return byIndex;
  }

  const R = {};

  // Wide drawings (call trees, trees, graphs): shrink to the panel's width, down to 55%. Past that the drawing
  // scrolls sideways, kept centred on focusX (in drawing units), such as the call being made right now.
  function fitSvg(c, host, g, natural, focusX) {
    const avail = c.clientWidth || host.clientWidth || 0;
    if (!avail) return;
    const scale = Math.max(0.55, Math.min(1, avail / natural));
    g.setAttribute('width', String(Math.round(natural * scale)));
    if (natural * scale > avail && focusX !== undefined && focusX !== null) host.scrollLeft = Math.max(0, focusX * scale - avail / 2);
  }

  R.array = (c, ch, opt) => {
    const values = ch.values;
    if (!Array.isArray(values)) {
      c.replaceChildren();
      return;
    }
    const range = Array.isArray(ch.range) ? ch.range : null;
    const win = Array.isArray(ch.window) ? ch.window : null;
    const pair = new Set(asList(ch.pair));
    const found = new Set(asList(ch.found));
    const visited = new Set(asList(ch.visited));
    const labels = ch.labels || {};
    const ptrs = pointerMarkers(ch.pointers);
    const cells = el('div', { class: 'cells' + (ptrs.size ? '' : ' noptr'), role: 'img', 'aria-label': `${opt.name || 'array'}: ${values.map(val).join(', ')}` });
    // A label is centred over its cell, so "left=right" on the first or last cell would hang past the edge.
    // Reserve room for the longest label the pointers can form: all of them on one cell.
    const longest = Object.keys(ch.pointers || {}).join('=').length;
    const overhang = Math.max(0, Math.ceil((longest * 7.4 + 14 - 44) / 2));
    if (overhang) cells.style.paddingInline = `${2 + overhang}px`;
    values.forEach((v, k) => {
      let cls = 'cell';
      if (range && (k < range[0] || k > range[1])) cls += ' out';
      if (win && k >= win[0] && k <= win[1]) cls += ' win';
      if (visited.has(k)) cls += ' visited';
      if (found.has(k)) cls += ' found';
      else if (pair.has(k)) cls += ' pair';
      const cell = el('div', { class: cls }, el('div', { class: 'box' }, val(v)), el('div', { class: 'idx' }, labels[k] !== undefined ? labels[k] : k));
      const here = ptrs.get(k);
      if (here) {
        const first = here[0];
        cell.append(el('div', { class: `ptr ${slotOf(first.order)}` }, el('span', { class: 'lab' }, here.map((p) => p.label).join('=')), el('span', { html: TRI })));
      }
      cells.append(cell);
    });
    const head = opt.name ? el('div', { class: 'viz-label' }, opt.name) : null;
    c.replaceChildren(...[head, el('div', { class: 'cells-scroll' }, cells)].filter(Boolean));
  };

  // Vertical bars scaled to the tallest value, with pointers below and optional water.
  // fill: [l, r, level] draws one container; water: [w0, w1, ...] stacks water on each bar;
  // rect: [l, r, height] outlines a rectangle covering bars l..r up to height.
  R.bars = (c, ch, opt) => {
    const values = Array.isArray(ch.values) ? ch.values : [];
    if (!values.length) {
      c.replaceChildren();
      return;
    }
    const water = Array.isArray(ch.water) ? ch.water : null;
    const fill = Array.isArray(ch.fill) ? ch.fill : null;
    const rect = Array.isArray(ch.rect) ? ch.rect : null;
    const top = Math.max(1, ...values.map((v, i) => v + (water && water[i] ? water[i] : 0)), fill ? fill[2] : 0, rect ? rect[2] : 0);
    const BW = 26;
    const GAP = 6;
    const H = 120;
    const PAD = 20;
    const W = values.length * (BW + GAP) + GAP;
    const y = (v) => PAD + H - (v / top) * H;
    const range = Array.isArray(ch.range) ? ch.range : null;
    const pair = new Set(asList(ch.pair));
    const ptrs = pointerMarkers(ch.pointers);
    const rows = Math.max(1, ...[...ptrs.values()].map((x) => x.length));
    const g = svg('svg', { viewBox: `0 0 ${W} ${PAD + H + 20 + rows * 15}`, width: W, class: 'vz-svg vz-bars', role: 'img', 'aria-label': `${opt.name || 'bars'}: ${values.join(', ')}` });
    const cx = (i) => GAP + i * (BW + GAP) + BW / 2;
    if (fill && fill[1] > fill[0] && fill[2] > 0) {
      g.append(svg('rect', { class: 'vz-water', x: cx(fill[0]), y: y(fill[2]), width: cx(fill[1]) - cx(fill[0]), height: PAD + H - y(fill[2]) }));
    }
    values.forEach((v, i) => {
      const x = GAP + i * (BW + GAP);
      const out = range && (i < range[0] || i > range[1]);
      if (water && water[i] > 0) g.append(svg('rect', { class: 'vz-water', x, y: y(v + water[i]), width: BW, height: y(v) - y(v + water[i]) }));
      g.append(svg('rect', { class: 'vz-bar' + (pair.has(i) ? ' pair' : '') + (out ? ' out' : ''), x, y: y(v), width: BW, height: Math.max(1, PAD + H - y(v)), rx: 2 }));
      g.append(svg('text', { class: 'vz-bar-val', x: cx(i), y: y(v) - 5 }, v));
      g.append(svg('text', { class: 'vz-bar-idx', x: cx(i), y: PAD + H + 13 }, i));
      (ptrs.get(i) || []).forEach((p, k) => g.append(svg('g', { class: `vz-ptr ${slotOf(p.order)}` },
        svg('text', { x: cx(i), y: PAD + H + 28 + k * 15 }, svg('tspan', { class: 'dot' }, '▲ '), p.label))));
    });
    if (rect && rect[1] >= rect[0] && rect[2] > 0) {
      const x0 = GAP + rect[0] * (BW + GAP) - GAP / 2;
      const x1 = GAP + rect[1] * (BW + GAP) + BW + GAP / 2;
      g.append(svg('rect', { class: 'vz-rect', x: x0, y: y(rect[2]), width: x1 - x0, height: PAD + H - y(rect[2]), rx: 2 }));
    }
    c.replaceChildren(...[opt.name ? el('div', { class: 'viz-label' }, opt.name) : null, el('div', { class: 'svg-scroll' }, g)].filter(Boolean));
  };

  R.vars = (c, ch, opt) => {
    const items = Object.entries(ch).map(([k, v]) => el('span', { class: 'var' }, el('span', { class: 'k' }, k), ' = ', el('b', null, lit(v))));
    c.replaceChildren(el('div', { class: 'readout' }, opt.name ? el('span', { class: 'viz-label inline' }, opt.name) : null, items));
  };

  R.map = (c, ch, opt) => {
    const entries = ch.entries && ch.entries.$map ? ch.entries.$map : ch.entries && typeof ch.entries === 'object' ? Object.entries(ch.entries) : [];
    const hit = ch.hit;
    const rows = entries.map(([k, v]) => el('div', { class: 'map-row' + (hit !== undefined && hit !== null && JSON.stringify(k) === JSON.stringify(hit) ? ' hit' : '') },
      el('span', { class: 'mk' }, lit(k)), el('span', { class: 'arrow', 'aria-hidden': 'true' }, '→'), el('span', { class: 'mv' }, lit(v))));
    c.replaceChildren(el('div', { class: 'viz-label' }, opt.name || 'map'), el('div', { class: 'map' }, rows.length ? rows : el('span', { class: 'empty-note' }, 'empty')));
  };

  function lineCells(items, opt, ends) {
    const list = Array.isArray(items) ? items : [];
    const row = el('div', { class: 'seq' }, list.length ? list.map((x, i) => el('div', { class: 'seq-cell' + (i === list.length - 1 && ends.last ? ' last' : '') + (i === 0 && ends.first ? ' first' : '') }, val(x)))
      : el('span', { class: 'empty-note' }, 'empty'));
    return el('div', { class: 'seq-wrap' }, el('div', { class: 'viz-label' }, opt.name || ends.name, list.length ? el('span', { class: 'ends' }, ends.text) : null), el('div', { class: 'cells-scroll' }, row));
  }
  R.stack = (c, ch, opt) => c.replaceChildren(lineCells(ch.items, opt, { name: 'stack', last: true, text: 'bottom → top' }));
  R.queue = (c, ch, opt) => c.replaceChildren(lineCells(ch.items, opt, { name: 'queue', first: true, text: 'front → back' }));

  function treeLayout(nodes, root, childrenOf) {
    // x = in-order position (binary) or leaf order (n-ary); y = depth
    const pos = new Map();
    let x = 0;
    const visit = (id, depth) => {
      const kids = childrenOf(id);
      if (kids.binary) {
        if (kids.left !== null && kids.left !== undefined) visit(kids.left, depth + 1);
        pos.set(id, { x: x++, y: depth });
        if (kids.right !== null && kids.right !== undefined) visit(kids.right, depth + 1);
      } else if (!kids.list.length) {
        pos.set(id, { x: x++, y: depth });
      } else {
        kids.list.forEach((k) => visit(k, depth + 1));
        const xs = kids.list.map((k) => pos.get(k).x);
        pos.set(id, { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: depth });
      }
    };
    for (const r of Array.isArray(root) ? root : [root]) if (r !== null && r !== undefined) visit(r, 0);  // several roots: a forest
    return pos;
  }

  R.tree = (c, ch, opt) => {
    const t = ch.tree;
    if (!t || !Array.isArray(t.nodes) || !t.nodes.length) {
      c.replaceChildren(el('div', { class: 'viz-label' }, opt.name || 'tree'), el('span', { class: 'empty-note' }, 'empty tree'));
      return;
    }
    const byId = new Map(t.nodes.map((n) => [n.id, n]));
    const nary = t.nodes.some((n) => Array.isArray(n.kids));  // tries: any number of children, in order
    const roots = Array.isArray(t.roots) ? t.roots : [t.root];  // a union-find forest has several roots
    const pos = treeLayout(t.nodes, roots, (id) => {
      const n = byId.get(id);
      return nary ? { binary: false, list: n ? n.kids : [] } : { binary: true, left: n ? n.left : null, right: n ? n.right : null };
    });
    const visited = new Set(asList(ch.visited));
    const path = new Set(asList(ch.path));
    const labels = ch.labels || {};
    const W = 40;
    const H = 52;
    const maxX = Math.max(...[...pos.values()].map((p) => p.x));
    const maxY = Math.max(...[...pos.values()].map((p) => p.y));
    const g = svg('svg', { viewBox: `0 0 ${(maxX + 1) * W + 16} ${(maxY + 1) * H + 14}`, class: 'vz-svg', width: (maxX + 1) * W + 16, role: 'img', 'aria-label': opt.name || 'tree' });
    const P = (id) => ({ x: pos.get(id).x * W + W / 2 + 8, y: pos.get(id).y * H + 24 });
    for (const n of t.nodes) {
      if (!pos.has(n.id)) continue;
      for (const k of nary ? n.kids : [n.left, n.right]) if (k !== null && k !== undefined && pos.has(k)) g.append(svg('line', { class: 'vz-edge' + (path.has(n.id) && path.has(k) ? ' on' : ''), x1: P(n.id).x, y1: P(n.id).y, x2: P(k).x, y2: P(k).y }));
    }
    for (const n of t.nodes) {
      if (!pos.has(n.id)) continue;
      const cls = 'vz-node' + (n.id === ch.current ? ' cur' : '') + (path.has(n.id) ? ' path' : '') + (visited.has(n.id) ? ' seen' : '') + (n.end ? ' end' : '');
      g.append(svg('g', { class: cls }, svg('circle', { cx: P(n.id).x, cy: P(n.id).y, r: 16 }),
        n.end ? svg('circle', { class: 'ring', cx: P(n.id).x, cy: P(n.id).y, r: 12.5 }) : null,  // a double ring: a word ends here
        svg('text', { x: P(n.id).x, y: P(n.id).y }, val(n.val)),
        labels[n.id] !== undefined ? svg('text', { class: 'sub', x: P(n.id).x, y: P(n.id).y + 26 }, labels[n.id]) : null));
    }
    const host = el('div', { class: 'svg-scroll' }, g);
    c.replaceChildren(...[opt.name ? el('div', { class: 'viz-label' }, opt.name) : null, host].filter(Boolean));
    fitSvg(c, host, g, (maxX + 1) * W + 16, pos.has(ch.current) ? P(ch.current).x : P(roots[0]).x);
  };

  R.heap = (c, ch, opt) => {
    const items = Array.isArray(ch.items) ? ch.items : [];
    const swap = new Set(asList(ch.swap));
    const nodes = items.map((v, i) => ({ id: i, val: v, left: 2 * i + 1 < items.length ? 2 * i + 1 : null, right: 2 * i + 2 < items.length ? 2 * i + 2 : null }));
    const treeBox = el('div');
    R.tree(treeBox, { tree: { root: items.length ? 0 : null, nodes }, current: null, path: [...swap], labels: Object.fromEntries(items.map((_, i) => [i, `[${i}]`])) }, { name: '' });
    const arr = el('div');
    R.array(arr, { values: items, pair: [...swap] }, { name: '' });
    c.replaceChildren(el('div', { class: 'viz-label' }, opt.name || 'heap'), treeBox, arr);
  };

  R.list = (c, ch, opt) => {
    const nodes = Array.isArray(ch.nodes) ? ch.nodes : [];
    if (!nodes.length) {
      c.replaceChildren(el('div', { class: 'viz-label' }, opt.name || 'list'), el('span', { class: 'empty-note' }, 'empty list'));
      return;
    }
    const order = Array.isArray(ch.order) && ch.order.length ? ch.order : nodes.map((n) => n.id);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const xOf = new Map(order.map((id, i) => [id, i]));
    const W = 72;
    const boxW = 44;
    const top = 40;
    const width = order.length * W + 40;
    const g = svg('svg', { viewBox: `0 0 ${width} 132`, width, class: 'vz-svg', role: 'img', 'aria-label': opt.name || 'linked list' });
    g.append(svg('defs', null, svg('marker', { id: 'vz-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, svg('path', { d: 'M0 0L10 5L0 10z', class: 'vz-arrowhead' }))));
    const cx = (id) => 20 + xOf.get(id) * W + boxW / 2;
    for (const n of nodes) {
      if (!xOf.has(n.id)) continue;
      const x1 = cx(n.id);
      if (n.next === null || n.next === undefined) {
        g.append(svg('line', { class: 'vz-edge null', x1: x1 + boxW / 2, y1: top + 14, x2: x1 + boxW / 2 + 14, y2: top + 14, 'marker-end': 'url(#vz-arrow)' }));
        g.append(svg('text', { class: 'vz-none', x: x1 + boxW / 2 + 18, y: top + 18 }, '∅'));
      } else if (xOf.has(n.next)) {
        const x2 = cx(n.next);
        const d = xOf.get(n.next) - xOf.get(n.id);
        if (d === 1) g.append(svg('line', { class: 'vz-edge link', x1: x1 + boxW / 2, y1: top + 14, x2: x2 - boxW / 2 - 2, y2: top + 14, 'marker-end': 'url(#vz-arrow)' }));
        else {
          const below = d < 0;
          const yy = below ? top + 28 : top;
          const bend = below ? top + 28 + 22 + Math.abs(d) * 6 : top - 22 - Math.abs(d) * 4;
          g.append(svg('path', { class: 'vz-edge link', d: `M${x1} ${yy} C ${x1} ${bend}, ${x2} ${bend}, ${x2} ${yy + (below ? 2 : -2)}`, 'marker-end': 'url(#vz-arrow)' }));
        }
      }
    }
    const ptrs = new Map();
    Object.entries(ch.pointers || {}).forEach(([label, id], order) => {
      if (id === null || id === undefined || !xOf.has(id)) return;
      if (!ptrs.has(id)) ptrs.set(id, []);
      ptrs.get(id).push({ label, order });
    });
    for (const id of order) {
      const n = byId.get(id);
      if (!n) continue;
      const x = cx(id) - boxW / 2;
      const here = ptrs.get(id);
      g.append(svg('g', { class: 'vz-lnode' + (here ? ' pointed' : '') }, svg('rect', { x, y: top, width: boxW, height: 28, rx: 6 }), svg('text', { x: x + boxW / 2, y: top + 14 }, val(n.val))));
      if (here) {
        here.forEach((p, k) => g.append(svg('g', { class: `vz-ptr ${slotOf(p.order)}` },
          svg('text', { x: x + boxW / 2, y: top + 46 + k * 15 }, svg('tspan', { class: 'dot' }, '▲ '), p.label))));
      }
    }
    c.replaceChildren(...[opt.name ? el('div', { class: 'viz-label' }, opt.name) : null, el('div', { class: 'svg-scroll' }, g)].filter(Boolean));
  };

  R.graph = (c, ch, opt) => {
    const nodes = opt.nodes || [];
    const edges = opt.edges || [];
    const visited = new Set(asList(ch.visited));
    const frontier = new Set(asList(ch.frontier));
    const done = new Set(asList(ch.done));
    const on = new Set(asList(ch.edges_on).map((e) => `${e[0]}-${e[1]}`));
    const dist = ch.dist && ch.dist.$map ? Object.fromEntries(ch.dist.$map.map(([k, v]) => [String(k), v])) : ch.dist || {};
    const S = 4;
    const xs = nodes.map((n) => n.x * S);
    const ys = nodes.map((n) => n.y * S);
    const minX = Math.min(...xs) - 30;
    const minY = Math.min(...ys) - 30;
    const w = Math.max(...xs) - minX + 30;
    const h = Math.max(...ys) - minY + 40;
    const g = svg('svg', { viewBox: `${minX} ${minY} ${w} ${h}`, width: w, class: 'vz-svg', role: 'img', 'aria-label': opt.name || 'graph' });
    g.append(svg('defs', null, svg('marker', { id: 'vz-garrow', viewBox: '0 0 10 10', refX: 24, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, svg('path', { d: 'M0 0L10 5L0 10z', class: 'vz-arrowhead' }))));
    const at = Object.fromEntries(nodes.map((n) => [String(n.id), { x: n.x * S, y: n.y * S }]));
    for (const e of edges) {
      const a = at[String(e.a)];
      const b = at[String(e.b)];
      if (!a || !b) continue;
      const isOn = on.has(`${e.a}-${e.b}`) || (!e.directed && on.has(`${e.b}-${e.a}`));
      g.append(svg('line', { class: 'vz-edge' + (isOn ? ' on' : ''), x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'marker-end': e.directed ? 'url(#vz-garrow)' : null }));
      if (e.w !== undefined) g.append(svg('text', { class: 'vz-w', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 6 }, e.w));
    }
    for (const n of nodes) {
      const p = at[String(n.id)];
      const cls = 'vz-node' + (n.id === ch.current ? ' cur' : done.has(n.id) ? ' done' : frontier.has(n.id) ? ' frontier' : visited.has(n.id) ? ' seen' : '');
      const d = dist[String(n.id)];
      g.append(svg('g', { class: cls }, svg('circle', { cx: p.x, cy: p.y, r: 16 }), svg('text', { x: p.x, y: p.y }, n.label !== undefined ? n.label : n.id),
        d !== undefined ? svg('text', { class: 'sub', x: p.x, y: p.y + 28 }, d === null || d === 'inf' || d === Infinity ? '∞' : d) : null));
    }
    c.replaceChildren(...[opt.name ? el('div', { class: 'viz-label' }, opt.name) : null, el('div', { class: 'svg-scroll' }, g)].filter(Boolean));
  };

  R.grid = (c, ch, opt) => {
    const values = Array.isArray(ch.values) ? ch.values : [];
    const cur = Array.isArray(ch.cell) ? keyRC(ch.cell) : null;
    const deps = new Set(asList(ch.deps).map(keyRC));
    const visited = new Set(asList(ch.visited).map(keyRC));
    const path = new Set(asList(ch.path).map(keyRC));
    const rows = ch.rows || opt.rows;
    const cols = ch.cols || opt.cols;
    const blank = opt.blank === undefined ? null : opt.blank;
    const table = el('table', { class: 'vz-grid' });
    if (cols) table.append(el('thead', null, el('tr', null, rows ? el('th') : null, cols.map((x) => el('th', null, val(x))))));
    const body = el('tbody');
    values.forEach((row, r) => {
      const tr = el('tr', null, rows ? el('th', null, val(rows[r])) : null);
      (Array.isArray(row) ? row : [row]).forEach((v, k) => {
        const key = `${r},${k}`;
        const cls = [key === cur ? 'cur' : '', deps.has(key) ? 'dep' : '', path.has(key) ? 'path' : '', visited.has(key) ? 'seen' : ''].filter(Boolean).join(' ');
        tr.append(el('td', { class: cls || null }, v === blank || v === null ? '' : val(v)));
      });
      body.append(tr);
    });
    table.append(body);
    c.replaceChildren(...[opt.name ? el('div', { class: 'viz-label' }, opt.name) : null, el('div', { class: 'grid-scroll' }, table)].filter(Boolean));
  };

  R.calltree = (c, ch, opt, ctx) => {
    const calls = (ctx.frame && ctx.frame.calls) || [];
    if (!calls.length) {
      c.replaceChildren(el('div', { class: 'viz-label' }, opt.name || 'calls'), el('span', { class: 'empty-note' }, 'no calls yet'));
      return;
    }
    const kids = new Map(calls.map((x) => [x.id, []]));
    let root = null;
    for (const x of calls) {
      if (x.parent === null || x.parent === undefined) root = root === null ? x.id : root;
      else if (kids.has(x.parent)) kids.get(x.parent).push(x.id);
    }
    const pos = treeLayout(calls, root, (id) => ({ binary: false, list: kids.get(id) || [] }));
    const newest = Math.max(...calls.map((x) => x.id));
    const W = Math.max(58, Math.min(110, 7.2 * Math.max(...calls.map((x) => String(x.label).length + (x.ret !== null && x.ret !== undefined ? String(lit(x.ret)).length + 3 : 0))) + 14));
    const H = 50;
    const maxX = Math.max(...[...pos.values()].map((p) => p.x));
    const maxY = Math.max(...[...pos.values()].map((p) => p.y));
    const g = svg('svg', { viewBox: `0 0 ${(maxX + 1) * W + 16} ${(maxY + 1) * H + 10}`, width: (maxX + 1) * W + 16, class: 'vz-svg', role: 'img', 'aria-label': opt.name || 'call tree' });
    const P = (id) => ({ x: pos.get(id).x * W + W / 2 + 8, y: pos.get(id).y * H + 20 });
    for (const x of calls) if (x.parent !== null && x.parent !== undefined && pos.has(x.parent) && pos.has(x.id)) g.append(svg('line', { class: 'vz-edge', x1: P(x.parent).x, y1: P(x.parent).y + 12, x2: P(x.id).x, y2: P(x.id).y - 12 }));
    for (const x of calls) {
      if (!pos.has(x.id)) continue;
      const p = P(x.id);
      const text = x.state === 'done' && x.ret !== null && x.ret !== undefined ? `${x.label} → ${lit(x.ret)}` : x.label;
      const cls = 'vz-call ' + (x.id === newest && x.state === 'active' ? 'cur' : x.state === 'active' ? 'active' : 'done');
      g.append(svg('g', { class: cls }, svg('rect', { x: p.x - W / 2 + 3, y: p.y - 12, width: W - 6, height: 24, rx: 6 }), svg('text', { x: p.x, y: p.y }, text)));
    }
    const host = el('div', { class: 'svg-scroll' }, g);
    c.replaceChildren(el('div', { class: 'viz-label' }, opt.name || 'calls', el('span', { class: 'ends' }, `${calls.length} call${calls.length === 1 ? '' : 's'}`)), host);
    const focus = calls.filter((x) => x.state === 'active').map((x) => x.id).pop();
    fitSvg(c, host, g, (maxX + 1) * W + 16, focus !== undefined && pos.has(focus) ? P(focus).x : P(root).x);
  };

  R.intervals = (c, ch, opt) => {
    const items = Array.isArray(ch.items) ? ch.items : [];
    const merged = Array.isArray(ch.merged) ? ch.merged : [];
    const all = items.concat(merged);
    if (!all.length) {
      c.replaceChildren(el('span', { class: 'empty-note' }, 'no intervals'));
      return;
    }
    const lo = Array.isArray(ch.axis) ? ch.axis[0] : Math.min(...all.map((x) => x[0]));
    const hi = Array.isArray(ch.axis) ? ch.axis[1] : Math.max(...all.map((x) => x[1]));
    const span = Math.max(1, hi - lo);
    const bar = (iv, cls) => el('div', { class: 'iv-row' }, el('div', { class: 'iv-track' }, el('i', { class: cls, style: `left:${(100 * (iv[0] - lo)) / span}%;width:${Math.max(1.5, (100 * (iv[1] - iv[0])) / span)}%` })),
      el('span', { class: 'iv-lab' }, `[${iv[0]}, ${iv[1]}]`));
    c.replaceChildren(
      el('div', { class: 'viz-label' }, opt.name || 'intervals', el('span', { class: 'ends' }, `${lo} … ${hi}`)),
      el('div', { class: 'iv' }, items.map((iv, i) => bar(iv, i === ch.current ? 'cur' : ''))),
      merged.length ? el('div', { class: 'viz-label' }, opt.mergedName || 'merged') : null,
      merged.length ? el('div', { class: 'iv' }, merged.map((iv) => bar(iv, 'merged'))) : null);
  };

  R.bits = (c, ch, opt) => {
    const values = asList(ch.values);
    const width = ch.width || opt.width || 8;
    const labels = ch.labels || opt.labels || [];
    const mask = typeof ch.mask === 'number' ? ch.mask : null;
    const rows = values.map((v, i) => {
      const n = typeof v === 'number' ? v : 0;
      const cells = [];
      for (let b = width - 1; b >= 0; b--) {
        const bit = Number((BigInt.asUintN(width, BigInt(n)) >> BigInt(b)) & 1n);
        const hot = mask !== null && ((mask >> b) & 1);
        cells.push(el('span', { class: 'bit' + (bit ? ' one' : '') + (hot ? ' hot' : '') }, bit));
      }
      return el('div', { class: 'bit-row' }, el('span', { class: 'bit-lab' }, labels[i] !== undefined ? labels[i] : ''), el('span', { class: 'bits' }, cells), el('span', { class: 'bit-dec' }, `= ${v}`));
    });
    c.replaceChildren(...[opt.name ? el('div', { class: 'viz-label' }, opt.name) : null, el('div', { class: 'cells-scroll' }, el('div', { class: 'bit-table' }, rows))].filter(Boolean));
  };

  // ------------------------------------------------------------------ static: how running time grows
  // No trace: a slider picks n, the chart plots each class on log-log axes, and the table gives the step count
  // and a rough running time at that n.
  const STEPS_PER_SECOND = 1e7; // a rough speed for simple steps in plain Python
  const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sup = (k) => String(k).replace(/\d/g, (d) => SUPERSCRIPT[d]);
  const log2Steps = (n) => Math.max(1, Math.round(Math.log2(n)));
  const smoothLog2 = (n) => Math.max(1, Math.log2(n));
  const GROWTH = [
    { label: 'O(1)', name: '1', count: () => 1, lg: () => 0 },
    { label: 'O(log n)', name: 'log n', count: (n) => log2Steps(n), lg: (n) => Math.log10(smoothLog2(n)) },
    { label: 'O(n)', name: 'n', count: (n) => n, lg: (n) => Math.log10(n) },
    { label: 'O(n log n)', name: 'n log n', count: (n) => n * log2Steps(n), lg: (n) => Math.log10(n) + Math.log10(smoothLog2(n)) },
    { label: 'O(n²)', name: 'n²', count: (n) => n * n, lg: (n) => 2 * Math.log10(n) },
    { label: 'O(2ⁿ)', name: '2ⁿ', count: (n) => 2 ** n, lg: (n) => n * Math.log10(2) },
  ];
  const fmtOps = (x) => x.toLocaleString('en-US');
  function fmtTime(lg) {
    const s = 10 ** (lg - Math.log10(STEPS_PER_SECOND));
    const per = (v, unit) => `${fmtOps(Math.round(v))} ${unit}${Math.round(v) === 1 ? '' : 's'}`;
    if (s < 1e-3) return 'under 1 ms';
    if (s < 1) return `${Math.round(s * 1000)} ms`;
    if (s < 60) return `${Math.round(s)} s`;
    if (s < 3600) return `${Math.round(s / 60)} min`;
    if (s < 48 * 3600) return per(s / 3600, 'hour');
    if (s < 2 * 365.25 * 86400) return per(s / 86400, 'day');
    if (s < 13.8e9 * 365.25 * 86400) return per(s / (365.25 * 86400), 'year');
    return 'longer than the universe has existed';
  }
  function growthRows(n) {
    return GROWTH.map((c) => {
      const exact = c.count(n);
      const big = !Number.isFinite(exact) || exact >= 1e15;
      const lg = big ? c.lg(n) : Math.log10(exact);
      return { label: c.label, name: c.name, lg, ops: big ? `a number with ${fmtOps(Math.floor(lg) + 1)} digits` : fmtOps(exact), time: fmtTime(lg) };
    });
  }

  const GROWTH_NS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1e3, 2e3, 5e3, 1e4, 2e4, 5e4, 1e5, 2e5, 5e5, 1e6];
  function growthView(host, spec, args) {
    // The chart is drawn at the panel's real width (one SVG unit per pixel), so its labels keep their size on a
    // phone instead of shrinking with the drawing. It's redrawn when the panel's width changes.
    const TOP = 12;
    const second = Math.log10(STEPS_PER_SECOND);
    const axisLabel = (e) => (e === 0 ? '1' : e < 4 ? fmtOps(10 ** e) : `10${sup(e)}`);
    const chartHost = el('div', { class: 'growth-chart' });
    let geom = null;
    let marks = null;
    function drawChart() {
      const W = Math.round(Math.max(300, Math.min(640, chartHost.clientWidth || 480)));
      const H = Math.round(Math.max(210, Math.min(280, W * 0.52)));
      const PL = 50, PR = 62, PT = 12, PB = 30;
      const X = (lgN) => PL + (lgN / 6) * (W - PL - PR);
      const Y = (lgOps) => PT + (1 - lgOps / TOP) * (H - PT - PB);
      const base = svg('g', null);
      for (let e = 0; e <= TOP; e += 3) {
        base.append(svg('line', { class: 'grid', x1: PL, x2: W - PR, y1: Y(e), y2: Y(e) }), svg('text', { class: 'tick', x: PL - 6, y: Y(e) + 4, 'text-anchor': 'end' }, axisLabel(e)));
      }
      const every = (W - PL - PR) / 6 < 44 ? 2 : 1;  // skip every other n label when they'd collide
      for (let e = 0; e <= 6; e += every) base.append(svg('text', { class: 'tick', x: X(e), y: H - PB + 16, 'text-anchor': 'middle' }, axisLabel(e)));
      base.append(svg('text', { class: 'tick', x: W - PR, y: H - 2, 'text-anchor': 'end' }, 'n'));
      base.append(svg('line', { class: 'second', x1: PL, x2: W - PR, y1: Y(second), y2: Y(second) }),
        svg('text', { class: 'second-label', x: PL + 6, y: Y(second) - 5 }, 'about 1 second of Python'));
      for (const c of GROWTH) {
        const pts = [];
        for (let t = 0; t <= 6.0001; t += 0.02) {
          const v = c.lg(10 ** t);
          if (v > TOP) {
            const prev = pts.length ? pts[pts.length - 1] : null;
            if (prev) pts.push([prev[0] + (t - prev[0]) * ((TOP - prev[1]) / (v - prev[1])), TOP]);
            break;
          }
          pts.push([t, v]);
        }
        const end = pts[pts.length - 1];
        base.append(svg('polyline', { class: 'curve', points: pts.map(([a, b]) => `${X(a).toFixed(1)},${Y(b).toFixed(1)}`).join(' ') }),
          svg('text', { class: 'curve-label', x: X(end[0]) + 6, y: end[1] >= TOP ? Y(TOP) + 10 : Y(end[1]) + 4 }, c.name));
      }
      marks = svg('g', null);
      chartHost.replaceChildren(svg('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': 'Steps for each complexity class as n grows. Both axes are logarithmic.' }, base, marks));
      geom = { W, X, Y, PT, H, PB };
    }

    let k = GROWTH_NS.indexOf(args && args.n);
    if (k < 0) k = GROWTH_NS.indexOf(1e3);
    const nOut = el('output', { class: 'growth-n' });
    const slider = el('input', { type: 'range', class: 'scrub', min: '0', max: String(GROWTH_NS.length - 1), step: '1', value: String(k), 'aria-label': 'n, the size of the input' });
    const tbody = el('tbody');
    const draw = () => {
      const n = GROWTH_NS[k];
      nOut.textContent = `n = ${fmtOps(n)}`;
      slider.setAttribute('aria-valuetext', `n = ${fmtOps(n)}`);
      const rows = growthRows(n);
      tbody.replaceChildren(...rows.map((r) => el('tr', { class: r.lg > second ? 'slow' : null },
        el('th', { scope: 'row' }, r.label), el('td', { class: 'num' }, r.ops), el('td', { class: 'num' }, r.time))));
      const { X, Y, PT, H, PB } = geom;
      const x = X(Math.log10(n));
      marks.replaceChildren(svg('line', { class: 'marker', x1: x, x2: x, y1: PT, y2: H - PB }),
        ...rows.map((r) => (r.lg <= TOP ? svg('circle', { class: 'dot', cx: x, cy: Y(r.lg), r: 4.5 }) : svg('path', { class: 'dot', d: `M${x - 5} ${PT + 7}l5 -7l5 7z` }))));
    };
    slider.addEventListener('input', () => { k = Number(slider.value); draw(); });
    const table = el('table', { class: 'growth-table' },
      el('thead', null, el('tr', null, el('th', { scope: 'col' }, 'Class'), el('th', { scope: 'col', class: 'num' }, 'Steps'), el('th', { scope: 'col', class: 'num' }, 'Rough time'))), tbody);
    host.replaceChildren(el('section', { class: 'viz growth', 'aria-label': `Visualizer: ${spec.title}` },
      el('div', { class: 'viz-head' }, el('span', { class: 'vt' }, 'Visualizer', el('b', null, spec.title))),
      el('div', { class: 'growth-body' },
        el('label', { class: 'growth-pick' }, nOut, slider),
        chartHost,
        el('div', { class: 'grid-scroll' }, table),
        el('p', { class: 'viz-note' }, 'Times assume about 10 million simple steps per second, a rough speed for plain Python. Real code does more or less per step, so read them as orders of magnitude. Rows in red take more than a second.'))));
    drawChart();
    draw();
    if (window.ResizeObserver) {
      new ResizeObserver(() => {
        const w = chartHost.clientWidth;
        if (w && Math.abs(Math.min(640, Math.max(300, w)) - geom.W) > 24) {
          drawChart();
          draw();
        }
      }).observe(chartHost);
    }
  }

  // ------------------------------------------------------------------ the player
  function parseInput(spec, raw) {
    const name = spec.label || spec.name;
    const s = String(raw).trim();
    const fail = (msg) => {
      throw new Error(`${name}: ${msg}`);
    };
    let v;
    if (spec.type === 'int') {
      if (!/^-?\d+$/.test(s)) fail('enter a whole number.');
      v = Number(s);
    } else if (spec.type === 'int[]') {
      const parts = s.replace(/^\[|\]$/g, '').split(/[\s,]+/).filter(Boolean);
      if (parts.some((x) => !/^-?\d+$/.test(x))) fail('enter whole numbers separated by commas.');
      v = parts.map(Number);
    } else if (spec.type === 'str') {
      v = s.replace(/^["']|["']$/g, '');
    } else if (spec.type === 'words') {
      v = s.split(/[\s,]+/).filter(Boolean);
    } else {
      try {
        v = JSON.parse(s);
      } catch (e) {
        fail('enter a JSON value, for example [[1, 3], [2, 6]].');
      }
    }
    const len = Array.isArray(v) || typeof v === 'string' ? v.length : null;
    const unit = (n) => SA.count(n, spec.type === 'words' ? 'word' : 'item');
    if (spec.minLen !== undefined && len !== null && len < spec.minLen) fail(`use at least ${unit(spec.minLen)}.`);
    if (spec.maxLen !== undefined && len !== null && len > spec.maxLen) fail(`use at most ${unit(spec.maxLen)}, so the trace stays readable.`);
    const nums = typeof v === 'number' ? [v] : Array.isArray(v) ? v.filter((x) => typeof x === 'number') : [];
    if (spec.min !== undefined && nums.some((x) => x < spec.min)) fail(`use ${typeof v === 'number' ? 'a number' : 'numbers'} of at least ${spec.min}.`);
    if (spec.max !== undefined && nums.some((x) => x > spec.max)) fail(`use ${typeof v === 'number' ? 'a number' : 'numbers'} of at most ${spec.max}.`);
    if (spec.sorted && Array.isArray(v) && v.some((x, i) => i && x < v[i - 1])) fail('this algorithm needs the numbers in ascending order. Sort them first.');
    return v;
  }
  // Parses every field; an input with `sameLenAs` must have as many items as the input it names.
  function parseInputs(inputs, raws) {
    const args = {};
    inputs.forEach((inp, k) => { args[inp.name] = parseInput(inp, raws[k]); });
    for (const inp of inputs) {
      const n = inp.sameLenAs && args[inp.sameLenAs].length;
      if (n !== undefined && n !== false && args[inp.name].length !== n) {
        throw new Error(`${inp.label || inp.name}: enter ${SA.count(n, 'item')}, one for each of the ${inp.sameLenAs}.`);
      }
    }
    return args;
  }
  const show = (v, inp) => (Array.isArray(v) && (inp.type === 'words' || v.every((x) => typeof x === 'number')) ? v.join(', ') : typeof v === 'string' ? v : JSON.stringify(v));

  function mount(host, viz) {
    const spec = viz.spec;
    if (spec.static) {
      const fn = SA.viz.statics[spec.renderer];
      if (fn) fn(host, spec, viz.args);
      return null;
    }
    let frames = viz.trace ? viz.trace.frames : [];
    let codeLines = viz.trace ? viz.trace.code.slice() : [];
    while (codeLines.length && !codeLines[codeLines.length - 1].trim()) codeLines.pop();
    let i = 0;
    let timer = null;
    let speed = 1;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const layout = spec.layout || [];
    const items = layout.map((it) => el('div', { class: `viz-item viz-${it.type}` }));
    const caption = el('div', { class: 'caption', 'aria-live': 'polite' });
    const truncNote = el('p', { class: 'viz-note', hidden: true }, 'This trace stops after 400 steps. Try a smaller input to see the whole run.');
    const codeHost = el('pre', { 'aria-label': 'Python code for this trace' });
    let lineEls = [];
    const drawCode = () => {
      lineEls = codeLines.map((src, k) => el('span', { class: 'ln', html: `<span class="no">${k + 1}</span>${window.PyHL.highlight(src) || ' '}` }));
      codeHost.replaceChildren(...lineEls);
    };
    drawCode();
    const stepLabel = el('span', { class: 'step' });
    const scrub = el('input', { type: 'range', class: 'scrub', min: '0', value: '0', 'aria-label': 'Step', id: `${viz.id}-scrub` });
    const playBtn = el('button', { class: 'btn primary small', type: 'button' });
    const backBtn = el('button', { class: 'btn small', type: 'button', 'aria-label': 'Step back' }, icon('prev', 14));
    const fwdBtn = el('button', { class: 'btn small', type: 'button', 'aria-label': 'Step forward' }, icon('next', 14));
    const resetBtn = el('button', { class: 'btn ghost small', type: 'button', 'aria-label': 'Back to the start' }, icon('reset', 14));
    const speedSel = el('select', { 'aria-label': 'Playback speed', id: `${viz.id}-speed` }, ['0.5×', '1×', '2×'].map((v) => el('option', { value: v, selected: v === '1×' }, v)));

    function draw() {
      const f = frames[i];
      if (!f) return;
      items.forEach((node, k) => {
        const it = layout[k];
        const r = R[it.type];
        if (r) r(node, (f.channels && f.channels[k]) || {}, it.options || {}, { frame: f, prev: frames[i - 1], spec });
      });
      caption.textContent = f.caption || '';
      lineEls.forEach((ln, k) => ln.classList.toggle('on', k + 1 === f.line));
      stepLabel.textContent = `step ${i + 1} / ${frames.length}`;
      scrub.max = String(frames.length - 1);
      scrub.value = String(i);
      backBtn.disabled = i === 0;
      fwdBtn.disabled = i === frames.length - 1;
      playBtn.replaceChildren(icon(timer ? 'pause' : 'play', 14), timer ? 'Pause' : i === frames.length - 1 ? 'Replay' : 'Play');
    }
    function go(k) {
      i = Math.max(0, Math.min(frames.length - 1, k));
      draw();
    }
    function stop() {
      clearInterval(timer);
      timer = null;
      draw();
    }
    function play() {
      if (i >= frames.length - 1) i = 0;
      timer = setInterval(() => {
        if (i >= frames.length - 1) stop();
        else go(i + 1);
      }, (reduce ? 1400 : 1000) / speed);
      draw();
    }
    playBtn.addEventListener('click', () => (timer ? stop() : play()));
    backBtn.addEventListener('click', () => { stop(); go(i - 1); });
    fwdBtn.addEventListener('click', () => { stop(); go(i + 1); });
    resetBtn.addEventListener('click', () => { stop(); go(0); });
    scrub.addEventListener('input', () => {
      const k = Number(scrub.value); // read first: stop() redraws and resets the slider
      stop();
      go(k);
    });
    speedSel.addEventListener('change', () => {
      speed = parseFloat(speedSel.value);
      if (timer) { stop(); play(); }
    });

    const inputs = spec.inputs || [];
    let editBtn = null;
    let form = null;
    if (inputs.length && viz.src) {
      const fields = inputs.map((inp) => el('input', { id: `${viz.id}-${inp.name}`, value: show(viz.args[inp.name], inp), spellcheck: 'false', autocapitalize: 'off', inputmode: inp.type === 'int' ? 'numeric' : null }));
      const err = el('div', { class: 'err', hidden: true, role: 'alert' });
      const submit = el('button', { class: 'btn small', type: 'submit' }, 'Trace again');
      form = el('form', { class: 'viz-edit', hidden: true },
        inputs.map((inp, k) => el('label', { class: inp.type === 'int' ? 'tgt' : 'nums', for: fields[k].id }, inp.label || inp.name, fields[k])), submit, err);
      editBtn = el('button', { class: 'btn ghost small', type: 'button', 'aria-expanded': 'false' }, icon('edit', 14), 'Edit input');
      editBtn.addEventListener('click', () => {
        form.hidden = !form.hidden;
        editBtn.setAttribute('aria-expanded', String(!form.hidden));
        if (!form.hidden) fields[0].focus();
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        let args;
        try {
          args = { ...viz.args, ...parseInputs(inputs, fields.map((f) => f.value)) };
        } catch (ex) {
          err.textContent = ex.message;
          err.hidden = false;
          return;
        }
        err.hidden = true;
        submit.disabled = true;
        submit.textContent = SA.py.state === 'ready' ? 'Tracing…' : 'Starting Python…';
        const r = await SA.py.call('trace', { code: viz.src, spec, args });
        submit.disabled = false;
        submit.textContent = 'Trace again';
        if (r.timeout || r.unavailable || r.crashed || !r.frames) {
          err.textContent = r.unavailable ? `Python isn't available here: ${r.error}` : r.timeout ? 'That input took too long to trace. Try a smaller one.' : `The trace failed: ${r.error || 'unknown error'}`;
          err.hidden = false;
          return;
        }
        if (r.error && !r.frames.length) {
          err.textContent = `Python raised ${r.error}`;
          err.hidden = false;
          return;
        }
        frames = r.frames;
        codeLines = r.code.slice();
        while (codeLines.length && !codeLines[codeLines.length - 1].trim()) codeLines.pop();
        drawCode();
        truncNote.hidden = !r.truncated;
        stop();
        go(0);
      });
    }

    const root = el('section', { class: 'viz', 'aria-label': `Visualizer: ${spec.title}`, tabindex: '0' },
      el('div', { class: 'viz-head' }, el('span', { class: 'vt' }, 'Visualizer', el('b', null, spec.title)), editBtn),
      el('div', { class: 'viz-body' }, el('div', { class: 'viz-stage' }, items, caption, truncNote), el('div', { class: 'viz-code' }, codeHost)),
      el('div', { class: 'viz-controls' }, resetBtn, backBtn, playBtn, fwdBtn, scrub, stepLabel, el('span', { class: 'spacer' }), speedSel),
      form);
    root.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); stop(); go(i + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); go(i - 1); }
      if (e.key === ' ') { e.preventDefault(); if (timer) stop(); else play(); }
    });
    host.replaceChildren(root);
    truncNote.hidden = !(viz.trace && viz.trace.truncated);
    if (frames.length) draw();
    else caption.textContent = 'No trace was recorded for this visualizer.';
    return { go, play, stop, get frames() { return frames; } };
  }

  SA.viz = { mount, renderers: R, statics: { growth: growthView }, parseInput, parseInputs, growth: { rows: growthRows, fmtOps, fmtTime } };
})(window.SA);
