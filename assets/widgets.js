/* =========================================================
   AoPS Learner — widgets.js
   A tiny toolkit for building "Explore" visuals with SVG.
   Exposed as window.W. Chapter pages register explorers with
   AOPS.registerWidget(name, function (body, figure) { ... }).
   ========================================================= */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs) {
    var e = document.createElement(tag);
    setAttrs(e, attrs);
    for (var i = 2; i < arguments.length; i++) append(e, arguments[i]);
    return e;
  }
  function s(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    setAttrs(e, attrs);
    for (var i = 2; i < arguments.length; i++) append(e, arguments[i]);
    return e;
  }
  function setAttrs(e, attrs) {
    if (!attrs) return e;
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.slice(0, 2) === "on" && typeof v === "function") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    });
    return e;
  }
  function append(parent, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(parent, x); }); return; }
    parent.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  /* An <svg class="stage"> sized by viewBox, appended to body. */
  function stage(body, opts) {
    opts = opts || {};
    var w = opts.w || 600, h = opts.h || 360;
    var svg = s("svg", { class: "stage", viewBox: "0 0 " + w + " " + h, role: "img", "aria-label": opts.label || "Interactive diagram" });
    svg._w = w; svg._h = h;
    body.appendChild(svg);
    return svg;
  }
  function controls(body) { var c = el("div", { class: "controls" }); body.appendChild(c); return c; }

  /* Slider with live label. Returns { input, value(), set(v) }. */
  var uid = 0;
  function slider(parent, o) {
    var id = "w-sl-" + (++uid);
    var fmt = o.format || function (v) { return String(v); };
    var out = el("output", { for: id });
    var input = el("input", { type: "range", id: id, min: o.min, max: o.max, step: o.step || 1, value: o.value });
    var wrap = el("div", { class: "ctl" }, el("label", { for: id }, el("span", { text: o.label }), out), input);
    parent.appendChild(wrap);
    function val() { return parseFloat(input.value); }
    function sync() { out.textContent = fmt(val()); input.setAttribute("aria-valuetext", o.label + " " + fmt(val())); }
    input.addEventListener("input", function () { sync(); if (o.onInput) o.onInput(val()); });
    sync();
    return { input: input, value: val, set: function (v) { input.value = v; sync(); if (o.onInput) o.onInput(val()); } };
  }

  /* Segmented buttons. options: [{value, label}] */
  function segmented(parent, o) {
    var group = el("div", { class: "seg", role: "group", "aria-label": o.label || "Options" });
    var current = o.value;
    var buttons = o.options.map(function (opt) {
      var b = el("button", { type: "button", "aria-pressed": String(opt.value === current), text: opt.label });
      b.addEventListener("click", function () {
        current = opt.value;
        buttons.forEach(function (x, i) { x.setAttribute("aria-pressed", String(o.options[i].value === current)); });
        if (o.onChange) o.onChange(current);
      });
      group.appendChild(b);
      return b;
    });
    var wrap = o.title ? el("div", { class: "ctl" }, el("span", { class: "ctl-label", text: o.title }), group) : group;
    parent.appendChild(wrap);
    return { value: function () { return current; } };
  }

  function button(parent, label, onClick, cls) {
    var b = el("button", { type: "button", class: "btn btn-small " + (cls || ""), text: label });
    b.addEventListener("click", onClick);
    parent.appendChild(b);
    return b;
  }

  /* Readout box. set(html) renders math inside it. */
  function readout(parent, opts) {
    var r = el("div", { class: "readout", "aria-live": (opts && opts.live === false) ? "off" : "polite" });
    parent.appendChild(r);
    return {
      el: r,
      set: function (html) { r.innerHTML = html; if (window.AOPS) window.AOPS.renderMath(r); },
      tex: function (t, display) { tex(r, t, display !== false); }
    };
  }
  function tex(node, t, display) {
    if (window.katex) {
      try { window.katex.render(t, node, { displayMode: !!display, throwOnError: false }); return; } catch (e) { /* fall through */ }
    }
    node.textContent = t;
  }

  /* Coordinate plane mapped into an svg stage.
     opts: { x:[min,max], y:[min,max], pad, grid:true, axes:true, step:1, labels:true } */
  function plane(svg, opts) {
    opts = opts || {};
    var W = svg._w, H = svg._h, pad = opts.pad == null ? 24 : opts.pad;
    var x0 = opts.x[0], x1 = opts.x[1], y0 = opts.y[0], y1 = opts.y[1];
    function X(x) { return pad + (x - x0) / (x1 - x0) * (W - 2 * pad); }
    function Y(y) { return H - pad - (y - y0) / (y1 - y0) * (H - 2 * pad); }
    function ix(px) { return x0 + (px - pad) / (W - 2 * pad) * (x1 - x0); }
    function iy(py) { return y0 + (H - pad - py) / (H - 2 * pad) * (y1 - y0); }
    var g = s("g");
    var step = opts.step || 1, ystep = opts.ystep || step;
    if (opts.grid !== false) {
      var grid = s("g", { class: "grid" });
      for (var gx = Math.ceil(x0 / step) * step; gx <= x1 + 1e-9; gx += step) grid.appendChild(s("line", { x1: X(gx), y1: Y(y0), x2: X(gx), y2: Y(y1) }));
      for (var gy = Math.ceil(y0 / ystep) * ystep; gy <= y1 + 1e-9; gy += ystep) grid.appendChild(s("line", { x1: X(x0), y1: Y(gy), x2: X(x1), y2: Y(gy) }));
      g.appendChild(grid);
    }
    if (opts.axes !== false) {
      var ax = s("g", { class: "axis" });
      if (y0 <= 0 && y1 >= 0) ax.appendChild(s("line", { x1: X(x0), y1: Y(0), x2: X(x1), y2: Y(0) }));
      if (x0 <= 0 && x1 >= 0) ax.appendChild(s("line", { x1: X(0), y1: Y(y0), x2: X(0), y2: Y(y1) }));
      g.appendChild(ax);
      if (opts.labels !== false) {
        var tk = s("g", { class: "tick" });
        var every = opts.labelEvery || 1;
        var k = 0;
        for (var lx = Math.ceil(x0 / step) * step; lx <= x1 + 1e-9; lx += step, k++) {
          if (Math.abs(lx) < 1e-9 || k % every) continue;
          tk.appendChild(s("text", { x: X(lx), y: Math.min(Math.max(Y(0) + 14, 14), H - 4), "text-anchor": "middle", text: fmt(lx) }));
        }
        k = 0;
        for (var ly = Math.ceil(y0 / ystep) * ystep; ly <= y1 + 1e-9; ly += ystep, k++) {
          if (Math.abs(ly) < 1e-9 || k % every) continue;
          tk.appendChild(s("text", { x: Math.min(Math.max(X(0) - 6, 22), W - 4), y: Y(ly) + 4, "text-anchor": "end", text: fmt(ly) }));
        }
        g.appendChild(tk);
      }
    }
    svg.appendChild(g);
    return { X: X, Y: Y, ix: ix, iy: iy, g: g, x: [x0, x1], y: [y0, y1] };
  }

  /* Path "d" for y = f(x) across the plane; breaks where f is not finite or leaves view. */
  function fnPath(P, f, opts) {
    opts = opts || {};
    var a = opts.from == null ? P.x[0] : opts.from, b = opts.to == null ? P.x[1] : opts.to;
    var n = opts.samples || 400, d = "", pen = false;
    var ylo = P.y[0] - (P.y[1] - P.y[0]) * 2, yhi = P.y[1] + (P.y[1] - P.y[0]) * 2;
    for (var i = 0; i <= n; i++) {
      var x = a + (b - a) * i / n, y = f(x);
      if (!isFinite(y) || y < ylo || y > yhi) { pen = false; continue; }
      d += (pen ? "L" : "M") + P.X(x).toFixed(2) + " " + P.Y(y).toFixed(2);
      pen = true;
    }
    return d;
  }

  /* Draggable handle (circle) with pointer + keyboard support.
     o: { x, y (svg units), r, label, onMove(x, y) -> optional [x, y] to constrain, keyStep } */
  function handle(svg, o) {
    var halo = s("circle", { class: "halo", cx: o.x, cy: o.y, r: (o.r || 9) + 9 });
    var c = s("circle", { class: "handle", cx: o.x, cy: o.y, r: o.r || 9, tabindex: "0", role: "slider", "aria-label": o.label || "Draggable point" });
    if (o.color) c.style.fill = o.color;
    svg.appendChild(halo); svg.appendChild(c);
    var pos = { x: o.x, y: o.y };
    function set(x, y, silent) {
      var r = o.onMove && !silent ? o.onMove(x, y) : null;
      if (r) { x = r[0]; y = r[1]; }
      pos.x = x; pos.y = y;
      c.setAttribute("cx", x); c.setAttribute("cy", y);
      halo.setAttribute("cx", x); halo.setAttribute("cy", y);
      if (o.valueText) c.setAttribute("aria-valuetext", o.valueText(x, y));
    }
    function toSvg(e) {
      var pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      var m = svg.getScreenCTM();
      if (!m) return { x: pos.x, y: pos.y };
      var p = pt.matrixTransform(m.inverse());
      return { x: Math.max(0, Math.min(svg._w, p.x)), y: Math.max(0, Math.min(svg._h, p.y)) };
    }
    var dragging = false;
    c.addEventListener("pointerdown", function (e) { dragging = true; c.classList.add("dragging"); c.setPointerCapture(e.pointerId); e.preventDefault(); });
    c.addEventListener("pointermove", function (e) { if (!dragging) return; var p = toSvg(e); set(p.x, p.y); });
    function end() { dragging = false; c.classList.remove("dragging"); }
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
    c.addEventListener("keydown", function (e) {
      var st = (o.keyStep || 6) * (e.shiftKey ? 4 : 1), dx = 0, dy = 0;
      if (e.key === "ArrowLeft") dx = -st; else if (e.key === "ArrowRight") dx = st;
      else if (e.key === "ArrowUp") dy = -st; else if (e.key === "ArrowDown") dy = st;
      else return;
      e.preventDefault();
      set(pos.x + dx, pos.y + dy);
    });
    set(o.x, o.y, true);
    return { el: c, set: set, pos: pos };
  }

  /* number formatting */
  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    d = d == null ? 3 : d;
    var r = Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
    if (Object.is(r, -0)) r = 0;
    return String(r);
  }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
  function frac(n, d) {
    if (d === 0) return "\\text{undefined}";
    var g = gcd(n, d) || 1; n /= g; d /= g;
    if (d < 0) { n = -n; d = -d; }
    if (d === 1) return String(n);
    return (n < 0 ? "-" : "") + "\\tfrac{" + Math.abs(n) + "}{" + d + "}";
  }
  function primeFactors(n) {
    var out = [], p = 2;
    n = Math.abs(Math.round(n));
    while (n > 1 && p * p <= n) { while (n % p === 0) { out.push(p); n /= p; } p++; }
    if (n > 1) out.push(n);
    return out;
  }
  function onTheme(fn) { document.addEventListener("aops:theme", fn); }
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  window.W = {
    el: el, s: s, clear: clear, stage: stage, controls: controls, slider: slider, segmented: segmented,
    button: button, readout: readout, tex: tex, plane: plane, fnPath: fnPath, handle: handle,
    fmt: fmt, gcd: gcd, frac: frac, primeFactors: primeFactors, onTheme: onTheme, cssVar: cssVar
  };
})();
