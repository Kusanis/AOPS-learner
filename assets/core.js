/* =========================================================
   AoPS Learner — core.js
   Chapter registry, reading progress, step-by-step reveal,
   chapter chrome (top bar, contents, prev/next) and the hub.
   No dependencies. KaTeX (if loaded) renders the math.
   ========================================================= */
(function () {
  "use strict";

  var CHAPTERS = [
    { num: 1, slug: "01-exponents-and-logarithms", title: "Exponents and Logarithms", group: "algebra", blurb: "Powers, roots, radicals, rationalizing, and the logarithm that undoes them all." },
    { num: 2, slug: "02-complex-numbers", title: "Complex Numbers", group: "algebra", blurb: "Meet i, the square root of −1, and learn to compute in the complex plane." },
    { num: 3, slug: "03-linear-equations", title: "Linear Equations", group: "algebra", blurb: "Solve one or many equations and turn word problems into algebra." },
    { num: 4, slug: "04-proportions", title: "Proportions", group: "algebra", blurb: "Direct and inverse variation, conversion factors, and percent." },
    { num: 5, slug: "05-using-the-integers", title: "Using the Integers", group: "algebra", blurb: "Divisibility, number bases, last digits, modular arithmetic, primes, GCD and LCM." },
    { num: 6, slug: "06-quadratic-equations", title: "Quadratic Equations", group: "algebra", blurb: "Factoring, the quadratic formula, Vieta's relations and beyond." },
    { num: 7, slug: "07-special-factorizations", title: "Special Factorizations and Clever Manipulations", group: "algebra", blurb: "The factorizations and tricks that crack problems open." },
    { num: 8, slug: "08-what-numbers-really-are", title: "What Numbers Really Are", group: "algebra", blurb: "Integers, rationals, irrationals and the complex numbers, carefully." },
    { num: 9, slug: "09-introduction-to-circles", title: "An Introduction to Circles", group: "geometry", blurb: "Radius, diameter, circumference, area and the magic of π." },
    { num: 10, slug: "10-angles", title: "Angles", group: "geometry", blurb: "Measuring angles, parallel lines, arcs, and angles made by circles." },
    { num: 11, slug: "11-triangles", title: "Triangles, a.k.a. Geometry", group: "geometry", blurb: "Congruence, similarity, Pythagoras, trigonometry and area." },
    { num: 12, slug: "12-quadrilaterals", title: "Quadrilaterals", group: "geometry", blurb: "Trapezoids, parallelograms, rhombi, rectangles and squares." },
    { num: 13, slug: "13-polygons", title: "Polygons", group: "geometry", blurb: "Angle sums, regular polygons and the friendly hexagon." },
    { num: 14, slug: "14-angle-chasing", title: "Angle Chasing", group: "geometry", blurb: "Follow the angles around a figure until the answer falls out." },
    { num: 15, slug: "15-areas", title: "Areas", group: "geometry", blurb: "Similar figures, same base or altitude, and complicated regions." },
    { num: 16, slug: "16-power-of-coordinates", title: "The Power of Coordinates", group: "geometry", blurb: "Lines, slopes, distance and circles on the coordinate plane." },
    { num: 17, slug: "17-power-of-a-point", title: "Power of a Point", group: "geometry", blurb: "One beautiful theorem about chords, secants and tangents." },
    { num: 18, slug: "18-three-dimensional-geometry", title: "Three Dimensional Geometry", group: "geometry", blurb: "Spheres, boxes, prisms, cylinders, pyramids, cones and polyhedra." },
    { num: 19, slug: "19-transformations", title: "Shifts, Turns, Flips, Stretches, and Squeezes", group: "geometry", blurb: "Translations, rotations, reflections, dilations and what they preserve." },
    { num: 20, slug: "20-geometry-potpourri", title: "A Potpourri of Geometry", group: "geometry", blurb: "A mixed bag of geometric ideas that tie the subject together." },
    { num: 21, slug: "21-functions", title: "Functions", group: "advanced", blurb: "Inputs and outputs, graphs, even and odd, floors, and transformations." },
    { num: 22, slug: "22-inequalities", title: "Inequalities", group: "advanced", blurb: "Linear, quadratic and absolute value inequalities, and a trivial one." },
    { num: 23, slug: "23-operations-and-relations", title: "Operations and Relations", group: "advanced", blurb: "Invented operations, their properties, and relations." },
    { num: 24, slug: "24-sequences-and-series", title: "Sequences and Series", group: "advanced", blurb: "Arithmetic and geometric series, infinite sums, sigma notation and means." },
    { num: 25, slug: "25-learning-to-count", title: "Learning to Count", group: "advanced", blurb: "Multiplication principle, permutations, combinations and clever counting." },
    { num: 26, slug: "26-statistics-and-probability", title: "Statistics and Probability", group: "advanced", blurb: "Averages, probability, casework, odds and expected value." },
    { num: 27, slug: "27-sets", title: "Sets", group: "advanced", blurb: "Set language, operations, Venn diagrams and subsets." },
    { num: 28, slug: "28-prove-it", title: "Prove It", group: "advanced", blurb: "Contradiction, converses, induction and the pigeonhole principle." },
    { num: 29, slug: "29-parting-shots", title: "Parting Shots", group: "advanced", blurb: "A final round of problem-solving wisdom and mixed challenges." }
  ];
  var GROUPS = {
    algebra: { title: "Algebra & Number", range: "Chapters 1–8", desc: "The language of algebra and the integers." },
    geometry: { title: "Geometry", range: "Chapters 9–20", desc: "Angles, triangles, circles, coordinates and space." },
    advanced: { title: "Advanced Topics", range: "Chapters 21–29", desc: "Functions, counting, probability and proof." }
  };
  var TIERS = ["warmup", "core", "stretch", "challenge"];
  var TIER_NAMES = { warmup: "Warm-up", core: "Core", stretch: "Stretch", challenge: "Challenge" };

  /* ---------- storage ---------- */
  var KEY = "aops-learner:v1";
  function load() {
    try {
      var s = JSON.parse(window.localStorage.getItem(KEY) || "{}");
      return s && typeof s === "object" ? s : {};
    } catch (e) { return {}; }
  }
  var state = load();
  state.done = state.done || {};
  state.got = state.got || {};
  state.steps = state.steps || {};
  state.totals = state.totals || {};
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable: progress lasts this visit only */ }
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function chapterPrefix(num) { return "c" + pad(num) + "-"; }
  function countDone(num) {
    var p = chapterPrefix(num), n = 0, seen = {};
    Object.keys(state.done).concat(Object.keys(state.got)).forEach(function (k) {
      if (k.indexOf(p) === 0 && !seen[k]) { seen[k] = 1; n++; }
    });
    return n;
  }
  function chapterProgress(num) {
    var total = state.totals[num] || 0, done = countDone(num);
    return { total: total, done: Math.min(done, total || done), frac: total ? Math.min(1, done / total) : 0 };
  }
  function resetProgress() {
    state = { done: {}, got: {}, steps: {}, totals: state.totals || {} };
    save();
  }

  /* ---------- theme ---------- */
  var THEME_KEY = "aops-learner:theme";
  function getTheme() { try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; } }
  function applyTheme(t) {
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }
  function effectiveTheme() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  function toggleTheme() {
    var next = effectiveTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
    document.dispatchEvent(new CustomEvent("aops:theme"));
    updateThemeButtons();
  }
  function updateThemeButtons() {
    var dark = effectiveTheme() === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.textContent = dark ? "☀" : "☾";
      b.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
      b.title = b.getAttribute("aria-label");
    });
  }
  applyTheme(getTheme());

  /* ---------- small DOM helpers ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "text") el.textContent = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.slice(0, 2) === "on" && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  }
  var STAR_PATH = "M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z";
  function starSvg(cls, filled) {
    var ns = "http://www.w3.org/2000/svg";
    var s = document.createElementNS(ns, "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("class", cls || "");
    s.setAttribute("aria-hidden", "true");
    var p = document.createElementNS(ns, "path");
    p.setAttribute("d", STAR_PATH);
    p.setAttribute("fill", filled ? "var(--accent)" : "none");
    p.setAttribute("stroke", "var(--accent)");
    p.setAttribute("stroke-width", "1.6");
    p.setAttribute("stroke-linejoin", "round");
    s.appendChild(p);
    return s;
  }
  var BRAND_SVG = '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="none" stroke="var(--accent)" stroke-opacity=".5"/><path d="M16 5l3 8 8 .6-6.2 5.2 2 8L16 22.4 9.2 26.8l2-8L5 13.6l8-.6z" fill="var(--accent)"/></svg>';

  function renderMath(root) {
    if (typeof window.renderMathInElement !== "function") return;
    try {
      window.renderMathInElement(root || document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false },
          { left: "$", right: "$", display: false }
        ],
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option", "input"],
        ignoredClasses: ["no-math"],
        throwOnError: false
      });
    } catch (e) { console.error(e); }
  }

  /* ---------- top bar ---------- */
  function buildTopbar(opts) {
    var root = opts.root || "./";
    var bar = h("header", { class: "topbar" });
    bar.appendChild(h("a", { class: "brand", href: root + "index.html", html: BRAND_SVG + '<span class="brand-text">AoPS Learner</span>', "aria-label": "AoPS Learner home: course map" }));
    bar.appendChild(h("span", { class: "crumb", text: opts.crumb || "" }));
    if (opts.meter) {
      var m = h("div", { class: "meter", role: "progressbar", "aria-label": "Chapter reading progress", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0" }, h("span"));
      bar.appendChild(m);
    }
    var actions = h("div", { class: "actions" });
    actions.appendChild(h("button", { class: "icon-btn", type: "button", "data-theme-toggle": "", onclick: toggleTheme }));
    bar.appendChild(actions);
    document.body.insertBefore(bar, document.body.firstChild);
    document.body.insertBefore(h("a", { class: "skip-link", href: "#main", text: "Skip to content" }), bar);
    updateThemeButtons();
    return bar;
  }

  /* ---------- chapter page ---------- */
  var activeExample = null;

  function enhanceChapter(main) {
    var num = parseInt(main.getAttribute("data-chapter"), 10);
    var ch = CHAPTERS[num - 1];
    var prefix = chapterPrefix(num);
    document.title = document.title || ("Chapter " + num + ": " + ch.title + " · AoPS Learner");
    main.id = main.id || "main";

    var bar = buildTopbar({ root: "../../", crumb: "Chapter " + num + " · " + ch.title, meter: true });
    var meter = bar.querySelector(".meter");

    // shell + contents
    var shell = h("div", { class: "chapter-shell" });
    main.parentNode.insertBefore(shell, main);
    var toc = h("nav", { class: "toc", "aria-label": "Sections in this chapter" }, h("h2", { text: "In this chapter" }));
    var tocList = h("ol");
    toc.appendChild(tocList);
    shell.appendChild(toc);
    shell.appendChild(main);
    main.classList.add("chapter-main");

    var lessons = Array.prototype.slice.call(main.querySelectorAll("section.lesson"));
    var allExamples = [];
    var tocEntries = [];

    lessons.forEach(function (sec, si) {
      if (!sec.id) sec.id = "s" + num + "-" + (si + 1);
      var heading = sec.querySelector("h2");
      var titleText = sec.getAttribute("data-title") || (heading ? heading.textContent.replace(/^\s*[\d.]+\s*/, "") : "Section " + (si + 1));
      var secNum = (heading && heading.querySelector(".sec-num")) ? heading.querySelector(".sec-num").textContent : (num + "." + (si + 1));

      var exs = Array.prototype.slice.call(sec.querySelectorAll("article.example"));
      // tier ladder header for the examples block
      var exWrap = sec.querySelector(".examples");
      if (exWrap && exs.length) {
        var headEl = exWrap.querySelector(".examples-head");
        if (!headEl) {
          headEl = h("div", { class: "examples-head" },
            h("div", { class: "block-label", text: "Worked examples · " + exs.length }),
            ladder());
          exWrap.insertBefore(headEl, exWrap.firstChild);
        }
      }
      var lastTier = -1;
      exs.forEach(function (ex, ei) {
        var t = TIERS.indexOf(ex.getAttribute("data-tier"));
        if (t < 0) { console.warn("Example without a valid data-tier in " + sec.id); t = 1; ex.setAttribute("data-tier", "core"); }
        if (t < lastTier) console.warn("Examples out of difficulty order in " + sec.id + " (example " + (ei + 1) + ")");
        lastTier = Math.max(lastTier, t);
        ex.id = ex.id || (prefix + sec.id + "-e" + (ei + 1));
        if (ex.id.indexOf(prefix) !== 0) ex.id = prefix + ex.id;
        enhanceExample(ex, secNum + "." + (ei + 1), num, ch, update);
        allExamples.push(ex);
      });

      var a = h("a", { href: "#" + sec.id });
      a.appendChild(starSvg("toc-star", false));
      a.appendChild(h("span", { text: titleText }));
      var cnt = h("span", { class: "toc-count" });
      a.appendChild(cnt);
      tocList.appendChild(h("li", null, a));
      tocEntries.push({ sec: sec, a: a, cnt: cnt, exs: exs });
    });

    state.totals[num] = allExamples.length;
    save();

    // explorers
    mountWidgets(main);

    // chapter end: prev/next
    var navWrap = h("nav", { class: "chapter-nav", "aria-label": "Chapter navigation" });
    if (num > 1) {
      var p = CHAPTERS[num - 2];
      navWrap.appendChild(h("a", { class: "prev", href: "../" + p.slug + "/index.html" }, h("small", { text: "← Chapter " + p.num }), p.title));
    }
    if (num < CHAPTERS.length) {
      var n = CHAPTERS[num];
      navWrap.appendChild(h("a", { class: "next", href: "../" + n.slug + "/index.html" }, h("small", { text: "Chapter " + n.num + " →" }), n.title));
    }
    main.appendChild(navWrap);

    // footer
    document.body.appendChild(siteFooter("../../"));

    function update() {
      var done = 0;
      allExamples.forEach(function (ex) { if (isDone(ex.id)) done++; });
      var pct = allExamples.length ? Math.round(100 * done / allExamples.length) : 0;
      if (meter) {
        meter.firstChild.style.width = pct + "%";
        meter.setAttribute("aria-valuenow", String(pct));
        meter.title = done + " of " + allExamples.length + " examples read";
      }
      tocEntries.forEach(function (e) {
        var d = 0;
        e.exs.forEach(function (ex) { if (isDone(ex.id)) d++; });
        e.cnt.textContent = d + "/" + e.exs.length;
        var path = e.a.querySelector("path");
        if (path) path.setAttribute("fill", e.exs.length && d === e.exs.length ? "var(--accent)" : "none");
      });
    }
    update();

    // current-section highlighting
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            tocEntries.forEach(function (e) { e.a.classList.toggle("is-current", e.sec === en.target); if (e.sec === en.target) e.a.setAttribute("aria-current", "true"); else e.a.removeAttribute("aria-current"); });
          }
        });
      }, { rootMargin: "-40% 0px -55% 0px" });
      lessons.forEach(function (s) { io.observe(s); });
    }

    // keyboard shortcuts: N = next step, F = full solution (for the active example)
    document.addEventListener("keydown", function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var tag = (e.target && e.target.tagName) || "";
      if (/INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)) return;
      var ex = activeExample || nearestExample(allExamples);
      if (!ex || !ex._reveal) return;
      if (e.key === "n" || e.key === "N") { e.preventDefault(); setActive(ex); ex._reveal.next(true); }
      else if (e.key === "f" || e.key === "F") { e.preventDefault(); setActive(ex); ex._reveal.all(true); }
    });

    renderMath(main);
    document.dispatchEvent(new CustomEvent("aops:ready", { detail: { chapter: num } }));
  }

  function nearestExample(list) {
    var best = null, bestD = Infinity, mid = window.innerHeight / 2;
    list.forEach(function (ex) {
      var r = ex.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var d = Math.abs((r.top + r.bottom) / 2 - mid);
      if (d < bestD) { bestD = d; best = ex; }
    });
    return best;
  }
  function setActive(ex) {
    if (activeExample && activeExample !== ex) activeExample.classList.remove("is-active");
    activeExample = ex;
    ex.classList.add("is-active");
  }
  function isDone(id) { return !!(state.done[id] || state.got[id]); }

  function ladder() {
    var l = h("div", { class: "tier-ladder", "aria-label": "Difficulty climbs from Warm-up to Challenge" });
    TIERS.forEach(function (t, i) {
      if (i) l.appendChild(h("i", { "aria-hidden": "true", text: "→" }));
      l.appendChild(h("span", { "data-t": t, text: TIER_NAMES[t] }));
    });
    return l;
  }

  function enhanceExample(ex, label, num, ch, onChange) {
    var tier = ex.getAttribute("data-tier");
    var title = ex.querySelector("h3");
    var head = h("div", { class: "example-head" });
    var titleBox = h("div", { style: "flex:1;min-width:0" });
    titleBox.appendChild(h("span", { class: "example-num", text: "Example " + label }));
    if (title) { titleBox.appendChild(title); }
    head.appendChild(titleBox);
    head.appendChild(h("span", { class: "tier-badge", text: TIER_NAMES[tier] }));
    head.appendChild(starSvg("done-star", true));
    ex.insertBefore(head, ex.firstChild);
    ex.setAttribute("tabindex", "-1");

    var list = ex.querySelector("ol.steps");
    if (!list) return;
    list.id = ex.id + "-steps";
    list.setAttribute("aria-live", "polite");

    // expand "pause and think" prompts into their own revealable item
    Array.prototype.slice.call(list.children).forEach(function (li) {
      if (!li.classList.contains("think-prompt")) li.classList.add("step");
      var q = li.getAttribute("data-think");
      if (q) {
        var tp = h("li", { class: "think-prompt" });
        tp.innerHTML = "<strong>Pause and think:</strong> " + q;
        list.insertBefore(tp, li);
      }
    });
    var items = Array.prototype.slice.call(list.children);
    var tail = Array.prototype.slice.call(ex.querySelectorAll(":scope > .answer, :scope > .key-idea, :scope > .book-next"));
    var realSteps = items.filter(function (li) { return li.classList.contains("step"); }).length;

    var shown = Math.min(state.steps[ex.id] || 0, items.length);
    if (state.done[ex.id]) shown = items.length;

    var nextBtn = h("button", { class: "btn btn-primary btn-small", type: "button", "aria-controls": list.id });
    var allBtn = h("button", { class: "btn btn-small", type: "button", "aria-controls": list.id, text: "Show full solution" });
    var resetBtn = h("button", { class: "btn btn-ghost btn-small", type: "button", "aria-controls": list.id, text: "Hide solution" });
    var gotBtn = h("button", { class: "btn btn-small got-it", type: "button", "aria-pressed": state.got[ex.id] ? "true" : "false", text: "Got it" });
    var prog = h("span", { class: "progress-text", "aria-hidden": "true" });
    var controls = h("div", { class: "step-controls", role: "group", "aria-label": "Solution controls for example " + label }, nextBtn, allBtn, resetBtn, gotBtn, prog);
    ex.appendChild(controls);

    function render(animateFrom) {
      items.forEach(function (li, i) {
        var vis = i < shown;
        li.hidden = !vis;
        if (vis && animateFrom != null && i >= animateFrom) { li.classList.remove("reveal-in"); void li.offsetWidth; li.classList.add("reveal-in"); }
      });
      var complete = shown >= items.length;
      tail.forEach(function (t) { t.hidden = !complete; if (complete && animateFrom != null) { t.classList.add("reveal-in"); } });
      var stepsShown = items.slice(0, shown).filter(function (li) { return li.classList.contains("step"); }).length;
      var nextIsThink = !complete && items[shown] && items[shown].classList.contains("think-prompt");
      nextBtn.textContent = shown === 0 ? (nextIsThink ? "Start: pause and think" : "Reveal step 1") : complete ? "Solution complete" : (nextIsThink ? "Pause and think" : "Next step");
      nextBtn.disabled = complete;
      allBtn.hidden = complete;
      resetBtn.hidden = shown === 0;
      prog.textContent = complete ? "✓ All " + realSteps + " steps" : "Step " + stepsShown + " of " + realSteps;
      ex.classList.toggle("is-done", isDone(ex.id));
    }
    function persist() {
      state.steps[ex.id] = shown;
      if (shown >= items.length) state.done[ex.id] = 1;
      state.last = { ch: num, title: ch.title, href: "chapters/" + ch.slug + "/index.html#" + ex.id, label: "Example " + label, t: Date.now() };
      save();
      onChange();
    }
    var api = {
      next: function (fromKey) {
        if (shown >= items.length) return;
        var from = shown; shown++; render(from); persist();
        if (fromKey) items[from].scrollIntoView({ block: "nearest", behavior: "smooth" });
        if (shown >= items.length) gotBtn.focus();
      },
      all: function () { var from = shown; shown = items.length; render(from); persist(); },
      reset: function () { shown = 0; render(); state.steps[ex.id] = 0; save(); nextBtn.focus(); }
    };
    ex._reveal = api;
    nextBtn.addEventListener("click", function () { setActive(ex); api.next(false); });
    allBtn.addEventListener("click", function () { setActive(ex); api.all(); });
    resetBtn.addEventListener("click", function () { setActive(ex); api.reset(); });
    gotBtn.addEventListener("click", function () {
      setActive(ex);
      if (state.got[ex.id]) delete state.got[ex.id]; else state.got[ex.id] = 1;
      gotBtn.setAttribute("aria-pressed", state.got[ex.id] ? "true" : "false");
      persist(); render();
    });
    ex.addEventListener("focusin", function () { setActive(ex); });
    ex.addEventListener("pointerdown", function () { setActive(ex); });
    render();
  }

  /* ---------- widgets ---------- */
  var widgets = {};
  function registerWidget(name, fn) { widgets[name] = fn; }
  function mountWidgets(root) {
    Array.prototype.slice.call(root.querySelectorAll("figure.explore[data-widget]")).forEach(function (fig) {
      var name = fig.getAttribute("data-widget");
      var body = h("div", { class: "explore-body" });
      fig.appendChild(body);
      var fn = widgets[name];
      if (!fn) { console.error("Missing explorer widget: " + name); body.textContent = "This explorer could not be loaded."; return; }
      try { fn(body, fig); } catch (e) { console.error("Explorer '" + name + "' failed", e); body.textContent = "This explorer could not be loaded."; }
    });
  }

  /* ---------- footer ---------- */
  function siteFooter(root) {
    var f = h("footer", { class: "site-footer" });
    f.appendChild(h("span", { html: "A study companion for <em>The Art of Problem Solving, Volume 1: The Basics</em> by Sandor Lehoczky &amp; Richard Rusczyk. All explanations and examples here are original; keep the book beside you." }));
    var actions = h("span", { style: "display:flex;gap:8px;flex-wrap:wrap" });
    actions.appendChild(h("a", { class: "btn btn-small", href: root + "index.html", text: "Course map" }));
    actions.appendChild(h("button", {
      class: "btn btn-ghost btn-small", type: "button", text: "Reset progress",
      onclick: function () {
        if (window.confirm("Reset all reading progress on this device? This cannot be undone.")) { resetProgress(); window.location.reload(); }
      }
    }));
    f.appendChild(actions);
    return f;
  }

  /* ---------- hub ---------- */
  function renderHub() {
    buildTopbar({ root: "./", crumb: "Course map" });
    var totalDone = 0, totalKnown = 0, chaptersDone = 0;
    CHAPTERS.forEach(function (c) {
      var p = chapterProgress(c.num);
      totalDone += p.done; totalKnown += p.total;
      if (p.total && p.done >= p.total) chaptersDone++;
    });

    // hero
    var cont = document.getElementById("continue");
    if (cont) {
      if (state.last && state.last.href) {
        cont.href = state.last.href;
        cont.innerHTML = "Continue: Chapter " + state.last.ch + " · " + escapeHtml(state.last.label) + " →";
      } else {
        cont.href = "chapters/" + CHAPTERS[0].slug + "/index.html";
        cont.textContent = "Begin with Chapter 1 →";
      }
    }
    var stats = document.getElementById("hub-stats");
    if (stats) {
      stats.innerHTML = "";
      [[totalDone, "examples read"], [chaptersDone + " / 29", "chapters complete"], [countStarted(), "chapters started"]].forEach(function (s) {
        stats.appendChild(h("div", null, h("b", { text: String(s[0]) }), s[1]));
      });
    }

    drawSky(document.getElementById("sky"));

    var groupsEl = document.getElementById("groups");
    if (groupsEl) {
      var i = 0;
      Object.keys(GROUPS).forEach(function (g) {
        var G = GROUPS[g];
        var sec = h("section", { class: "group", "aria-labelledby": "g-" + g });
        sec.appendChild(h("div", { class: "group-head" }, h("h2", { id: "g-" + g, text: G.title }), h("p", { text: G.range + " · " + G.desc })));
        var cards = h("div", { class: "cards" });
        CHAPTERS.filter(function (c) { return c.group === g; }).forEach(function (c) {
          var p = chapterProgress(c.num);
          var pct = Math.round(100 * p.frac);
          var status = !p.total ? "Not started" : p.done >= p.total ? "Complete ✦" : p.done + " of " + p.total + " examples";
          var card = h("a", { class: "card" + (p.total && p.done >= p.total ? " is-complete" : ""), href: "chapters/" + c.slug + "/index.html", style: "--i:" + (i++) },
            h("span", { class: "card-num", text: "CHAPTER " + pad(c.num) }),
            h("h3", { text: c.title }),
            h("p", { text: c.blurb }),
            h("div", { class: "bar", role: "progressbar", "aria-label": "Progress in chapter " + c.num, "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pct) }, h("span", { style: "width:" + pct + "%" })),
            h("div", { class: "status" }, h("span", { text: status }), h("span", { text: p.total ? pct + "%" : "" }))
          );
          cards.appendChild(card);
        });
        sec.appendChild(cards);
        groupsEl.appendChild(sec);
      });
    }
    document.body.appendChild(siteFooter("./"));
  }
  function countStarted() {
    var n = 0;
    CHAPTERS.forEach(function (c) { if (countDone(c.num) > 0) n++; });
    return n;
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function drawSky(host) {
    if (!host) return;
    var ns = "http://www.w3.org/2000/svg";
    var W = 1200, H = 470;
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "group");
    svg.setAttribute("aria-label", "Constellation map of all 29 chapters. Stars brighten as you read.");
    function S(tag, attrs, parent) {
      var e = document.createElementNS(ns, tag);
      Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
      (parent || svg).appendChild(e);
      return e;
    }
    // hand-placed constellation layout (x, y) per chapter
    var pos = [
      [70, 300], [130, 210], [215, 260], [190, 360], [285, 395], [330, 300], [300, 190], [390, 140],          // 1–8
      [480, 230], [545, 150], [620, 205], [600, 300], [680, 350], [720, 255], [790, 190], [770, 100], [700, 60], [860, 120], [870, 260], [800, 330], // 9–20
      [930, 380], [960, 290], [1010, 210], [990, 120], [1070, 80], [1120, 170], [1090, 260], [1130, 350], [1060, 410] // 21–29
    ];
    var labels = [["algebra", 210, 448], ["geometry", 665, 448], ["advanced", 1025, 448]];
    labels.forEach(function (l) { var t = S("text", { x: l[1], y: l[2], "text-anchor": "middle", class: "group-label" }); t.textContent = GROUPS[l[0]].title; });
    var lines = S("g", { "aria-hidden": "true" });
    for (var i = 0; i < pos.length - 1; i++) {
      if (i === 7 || i === 19) continue; // break between constellations
      var lit = countDone(i + 1) > 0 && countDone(i + 2) > 0;
      S("line", { x1: pos[i][0], y1: pos[i][1], x2: pos[i + 1][0], y2: pos[i + 1][1], class: "constellation-line" + (lit ? " lit" : "") }, lines);
    }
    var wrap = host;
    wrap.innerHTML = "";
    var frame = h("div", { class: "sky-frame" });
    var inner = h("div", { class: "sky-wrap" });
    var tip = h("div", { class: "sky-tip", role: "presentation" });
    inner.appendChild(svg);
    inner.appendChild(tip);
    frame.appendChild(inner);
    frame.appendChild(h("div", { class: "sky-legend" },
      h("span", { text: "✦ Each star is a chapter; it glows brighter as you work through its examples." }),
      h("span", { text: "Lines light up between chapters you have both started." })));
    wrap.appendChild(frame);

    CHAPTERS.forEach(function (c, idx) {
      var p = chapterProgress(c.num);
      var started = countDone(c.num) > 0;
      var frac = p.total ? p.frac : (started ? 0.1 : 0);
      var x = pos[idx][0], y = pos[idx][1];
      var a = S("a", { href: "chapters/" + c.slug + "/index.html", class: "star-link", "aria-label": "Chapter " + c.num + ": " + c.title + (p.total ? ", " + Math.round(frac * 100) + "% read" : "") });
      var glowR = 10 + 22 * frac;
      var glow = S("circle", { cx: x, cy: y, r: glowR, class: "star-glow" + (frac > 0 ? " pulse" : "") }, a);
      glow.style.setProperty("--o", String(frac > 0 ? 0.18 + 0.4 * frac : 0));
      glow.style.opacity = frac > 0 ? 0.18 + 0.4 * frac : 0;
      var core = S("circle", { cx: x, cy: y, r: 13, class: "star-core" }, a);
      if (frac >= 1) core.style.fill = "var(--accent)";
      else if (frac > 0) core.style.fill = "color-mix(in srgb, var(--accent) " + Math.round(25 + 50 * frac) + "%, var(--surface-solid))";
      var t = S("text", { x: x, y: y + 4, "text-anchor": "middle", class: "star-num" }, a);
      t.textContent = c.num;
      if (frac >= 1) t.style.fill = "var(--accent-ink)";
      function show() {
        tip.textContent = "Ch. " + c.num + " · " + c.title + (p.total ? " — " + Math.round(frac * 100) + "%" : "");
        var r = svg.getBoundingClientRect();
        var px = x / W * r.width, py = y / H * r.height;
        tip.style.left = Math.min(Math.max(px - 100, 8), r.width - 220) + "px";
        tip.style.top = Math.max(py - 56, 6) + "px";
        tip.style.opacity = 1;
      }
      function hide() { tip.style.opacity = 0; }
      a.addEventListener("mouseenter", show);
      a.addEventListener("focus", show);
      a.addEventListener("mouseleave", hide);
      a.addEventListener("blur", hide);
    });
  }

  /* ---------- boot ---------- */
  window.AOPS = {
    CHAPTERS: CHAPTERS,
    TIERS: TIERS,
    registerWidget: registerWidget,
    renderMath: renderMath,
    theme: effectiveTheme,
    state: function () { return state; }
  };

  function boot() {
    var main = document.querySelector("main.chapter[data-chapter]");
    if (main) enhanceChapter(main);
    else if (document.body.getAttribute("data-page") === "hub") renderHub();
    updateThemeButtons();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
