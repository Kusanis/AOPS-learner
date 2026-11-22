#!/usr/bin/env node
/*
  Site checker for AoPS Learner (uses the Playwright that is already installed; no npm install).

  Usage:
    node tools/verify.js [--katex-dir DIR] [--shots DIR] [--only 1,2,3]

  It serves the repo on a local port, loads the hub and every chapter page that exists,
  and checks: no console errors, math rendered by KaTeX, internal links resolve,
  explorers respond to input, step reveal works by mouse and keyboard, and examples are
  ordered Warm-up → Core → Stretch → Challenge (5–10 per section).

  --katex-dir points at an unpacked katex npm package (its dist/ folder). When given,
  requests to the jsDelivr KaTeX URLs are answered from it, for offline/sandboxed runs.
*/
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
function arg(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; }
const katexDir = arg("--katex-dir");
const shotsDir = arg("--shots");
const only = arg("--only") ? arg("--only").split(",").map(Number) : null;

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0].split("#")[0]);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const chapterDirs = fs.readdirSync(path.join(ROOT, "chapters")).filter(d => fs.existsSync(path.join(ROOT, "chapters", d, "index.html"))).sort();
  const pages = ["index.html"].concat(chapterDirs.filter(d => !only || only.includes(parseInt(d, 10))).map(d => `chapters/${d}/index.html`));

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  if (katexDir) {
    await ctx.route(/cdn\.jsdelivr\.net\/npm\/katex@[^/]+\/dist\/(.*)$/, (route) => {
      const rel = route.request().url().replace(/^.*\/dist\//, "");
      const f = path.join(katexDir, "dist", rel);
      if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: "" });
      route.fulfill({ status: 200, body: fs.readFileSync(f), contentType: TYPES[path.extname(f)] || "application/octet-stream" });
    });
  }

  let failures = 0;
  const report = [];
  for (const pg of pages) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", m => {
      if (m.type() !== "error" && m.type() !== "warning") return;
      const loc = (m.location() && m.location().url) || "";
      if (/fonts\.(googleapis|gstatic)/.test(loc)) return; // fonts are blocked on purpose during checks
      errors.push(`${m.type()}: ${m.text()}${loc ? " (" + loc + ")" : ""}`);
    });
    page.on("pageerror", e => errors.push("pageerror: " + e.message));
    page.on("requestfailed", r => { const u = r.url(); if (!/fonts\.(googleapis|gstatic)/.test(u)) errors.push("requestfailed: " + u); });
    await page.goto(base + pg, { waitUntil: "load" });
    await page.waitForTimeout(150);
    const problems = [];

    // internal links
    const links = await page.$$eval("a[href]", as => as.map(a => a.getAttribute("href")));
    for (const href of [...new Set(links)]) {
      if (/^(https?:|mailto:)/.test(href)) continue;
      const u = new URL(href, base + pg);
      if (u.pathname !== new URL(base + pg).pathname) {
        const f = path.join(ROOT, decodeURIComponent(u.pathname));
        if (!fs.existsSync(f)) { problems.push("broken link: " + href); continue; }
      }
      if (u.hash && u.pathname === new URL(base + pg).pathname) {
        const id = decodeURIComponent(u.hash.slice(1));
        if (id && !(await page.$(`[id="${id}"]`))) problems.push("missing anchor: " + href);
      }
    }

    // horizontal overflow at desktop
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) problems.push(`horizontal overflow ${overflow}px at 1440`);

    let summary = "";
    if (pg.startsWith("chapters/")) {
      const r = await page.evaluate(async () => {
        const out = { problems: [], sections: 0, examples: 0, widgets: 0 };
        const TIERS = ["warmup", "core", "stretch", "challenge"];
        // KaTeX rendered and no leftover delimiters
        const main = document.querySelector("main");
        out.katex = main.querySelectorAll(".katex").length;
        if (!out.katex) out.problems.push("no KaTeX output found");
        const errs = main.querySelectorAll(".katex-error");
        errs.forEach(e => out.problems.push("katex error: " + (e.getAttribute("title") || e.textContent).slice(0, 120)));
        const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest(".katex, script, style, code, .no-math") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
        let n; while ((n = walker.nextNode())) { if (/\$|\\\(|\\\[|\\frac|\\sqrt/.test(n.textContent)) { out.problems.push("unrendered math: " + n.textContent.trim().slice(0, 80)); } }

        // sections + tiers
        document.querySelectorAll("section.lesson").forEach(sec => {
          out.sections++;
          const exs = [...sec.querySelectorAll("article.example")];
          if (exs.length < 5 || exs.length > 10) out.problems.push(`${sec.id}: ${exs.length} examples (want 5–10)`);
          let last = -1;
          exs.forEach((ex, i) => {
            const t = TIERS.indexOf(ex.dataset.tier);
            if (t < 0) out.problems.push(`${sec.id} ex ${i + 1}: bad tier`);
            if (t < last) out.problems.push(`${sec.id} ex ${i + 1}: tier order ${ex.dataset.tier} after ${TIERS[last]}`);
            last = Math.max(last, t);
          });
          ["hook", "concept"].forEach(c => { if (!sec.querySelector("." + c)) out.problems.push(`${sec.id}: missing .${c}`); });
          if (!sec.querySelector("figure.explore")) out.problems.push(`${sec.id}: missing explorer`);
        });

        // explorers respond to input
        const figs = [...document.querySelectorAll("figure.explore")];
        for (const fig of figs) {
          out.widgets++;
          const name = fig.dataset.widget;
          const body = fig.querySelector(".explore-body");
          if (!body || /could not be loaded/.test(body.textContent)) { out.problems.push(`widget ${name}: failed to load`); continue; }
          const snap = () => body.innerHTML;
          const before = snap();
          let acted = false;
          const range = body.querySelector('input[type="range"]');
          const seg = body.querySelector(".seg button[aria-pressed='false'], button.btn");
          const handle = body.querySelector(".handle");
          const numberInput = body.querySelector('input[type="number"], input[type="text"], select');
          if (range) {
            const v = parseFloat(range.value), mn = parseFloat(range.min), mx = parseFloat(range.max), st = parseFloat(range.step) || 1;
            range.value = v + st <= mx ? v + st : v - st; range.dispatchEvent(new Event("input", { bubbles: true })); range.dispatchEvent(new Event("change", { bubbles: true })); acted = true;
          } else if (handle) {
            handle.focus(); handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); acted = true;
          } else if (seg) { seg.click(); acted = true; }
          else if (numberInput) { numberInput.value = numberInput.tagName === "SELECT" ? numberInput.options[numberInput.options.length - 1].value : "7"; numberInput.dispatchEvent(new Event("input", { bubbles: true })); numberInput.dispatchEvent(new Event("change", { bubbles: true })); acted = true; }
          await new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));
          if (!acted) out.problems.push(`widget ${name}: no control found`);
          else if (snap() === before) out.problems.push(`widget ${name}: did not respond to input`);
        }

        // step reveal: mouse
        const exs = [...document.querySelectorAll("article.example")];
        out.examples = exs.length;
        for (const ex of exs) {
          const items = [...ex.querySelectorAll("ol.steps > li")];
          const ctrls = ex.querySelectorAll(".step-controls button");
          const [next, all, hide] = ctrls;
          if (!next || !items.length) { out.problems.push(`${ex.id}: missing steps or controls`); continue; }
          hide.click();
          if (items.some(li => !li.hidden)) out.problems.push(`${ex.id}: steps visible after hide`);
          let clicks = 0;
          while (!next.disabled && clicks < 40) { next.click(); clicks++; }
          if (clicks !== items.length) out.problems.push(`${ex.id}: ${clicks} clicks for ${items.length} items`);
          if (items.some(li => li.hidden)) out.problems.push(`${ex.id}: hidden steps after full reveal`);
          const ans = ex.querySelector(":scope > .answer");
          if (!ans) out.problems.push(`${ex.id}: missing .answer`);
          else if (ans.hidden) out.problems.push(`${ex.id}: answer hidden after full reveal`);
          ex.querySelectorAll(".why").length || out.problems.push(`${ex.id}: no .why explanations`);
          hide.click();
        }
        return out;
      });
      // keyboard check on every example: focus it, N reveals one item, F reveals all
      const ids = await page.$$eval("article.example", els => els.map(e => e.id));
      for (const id of ids) {
        await page.focus(`[id="${id}"]`);
        await page.keyboard.press("n");
        const one = await page.$eval(`[id="${id}"]`, ex => [...ex.querySelectorAll("ol.steps > li")].filter(li => !li.hidden).length);
        await page.keyboard.press("f");
        const allShown = await page.$eval(`[id="${id}"]`, ex => [...ex.querySelectorAll("ol.steps > li")].every(li => !li.hidden));
        if (one !== 1) r.problems.push(`${id}: keyboard N revealed ${one} items`);
        if (!allShown) r.problems.push(`${id}: keyboard F did not reveal all`);
        await page.$eval(`[id="${id}"]`, ex => ex.querySelectorAll(".step-controls button")[2].click());
      }
      problems.push(...r.problems);
      summary = `${r.sections} sections, ${r.examples} examples, ${r.widgets} explorers, ${r.katex} math nodes`;
      // persistence across reload
      await page.evaluate(() => { const ex = document.querySelector("article.example"); ex.querySelectorAll(".step-controls button")[1].click(); });
      await page.reload({ waitUntil: "load" });
      const persisted = await page.evaluate(() => document.querySelector("article.example").classList.contains("is-done"));
      if (!persisted) problems.push("progress did not persist across reload");
      await page.evaluate(() => localStorage.clear());
    } else {
      const cards = await page.$$eval(".card", c => c.length);
      if (cards !== 29) problems.push(`hub shows ${cards} chapter cards (want 29)`);
      const stars = await page.$$eval(".star-link", c => c.length);
      if (stars !== 29) problems.push(`hub shows ${stars} stars (want 29)`);
      summary = `${cards} cards, ${stars} stars`;
    }

    // mobile overflow
    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(50);
    const mOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (mOverflow > 1) problems.push(`horizontal overflow ${mOverflow}px at 360`);
    await page.setViewportSize({ width: 1440, height: 900 });

    problems.push(...errors);
    const ok = problems.length === 0;
    if (!ok) failures++;
    report.push(`${ok ? "PASS" : "FAIL"}  ${pg}  (${summary})` + (ok ? "" : "\n      - " + [...new Set(problems)].slice(0, 25).join("\n      - ")));
    await page.close();
  }

  if (shotsDir) {
    fs.mkdirSync(shotsDir, { recursive: true });
    const targets = [["hub", "index.html"], ["chapter", pages.find(p => p.startsWith("chapters/")) || "index.html"]];
    for (const [name, pg] of targets) {
      for (const w of [390, 1440]) {
        const page = await ctx.newPage();
        await page.setViewportSize({ width: w, height: w < 500 ? 844 : 900 });
        await page.goto(base + pg, { waitUntil: "load" });
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(shotsDir, `${name}-${w}.png`), fullPage: false });
        if (name === "chapter") {
          await page.evaluate(() => { const ex = document.querySelector("article.example"); ex.scrollIntoView(); ex.querySelectorAll(".step-controls button")[0].click(); ex.querySelectorAll(".step-controls button")[0].click(); const fig = document.querySelector("figure.explore"); });
          await page.waitForTimeout(500);
          await page.screenshot({ path: path.join(shotsDir, `${name}-${w}-example.png`) });
          await page.evaluate(() => document.querySelector("figure.explore").scrollIntoView());
          await page.waitForTimeout(200);
          await page.screenshot({ path: path.join(shotsDir, `${name}-${w}-explore.png`) });
        }
        await page.close();
      }
    }
  }

  console.log(report.join("\n"));
  console.log(`\n${pages.length - failures}/${pages.length} pages passed.`);
  await browser.close();
  server.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(2); });
