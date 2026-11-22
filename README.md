# AoPS Learner

An interactive study companion for *The Art of Problem Solving, Volume 1: The Basics* (Sandor Lehoczky & Richard Rusczyk).
Each of the book's 29 chapters gets its own page with hands-on explorers and fully worked examples that climb from **Warm-up → Core → Stretch → Challenge**. The learner reveals each solution one step at a time, at their own pace.

There are no quizzes, scores, accounts or tracking. All explanations and examples are original; the book stays the primary text, and each chapter points back to its examples, exercises and problems.

## Site structure

```
index.html                     Course map: constellation of all 29 chapters, progress, "continue" button
chapters/NN-slug/index.html    One self-contained page per chapter
assets/styles.css              Design system (night-sky theme, light/dark, reduced motion)
assets/core.js                 Chapter registry, step-by-step reveal, reading progress, contents, navigation, hub
assets/widgets.js              Small SVG toolkit used by each chapter's "Explore" visuals
tools/verify.js                Headless checks (Playwright), not needed to run the site
```

Every chapter section follows the same flow: **Hook → Concept → Explore → Worked examples**.
Chapter pages are plain HTML. Math is written as `$…$` / `$$…$$` and rendered by [KaTeX](https://katex.org) (pinned 0.16.11 from jsDelivr). `core.js` turns the markup into the interactive page: it numbers examples, adds the reveal controls (button or <kbd>N</kbd> for the next step, <kbd>F</kbd> for the full solution), and builds the contents sidebar and previous/next links.

### Adding or editing an example

```html
<article class="example" data-tier="core">            <!-- warmup | core | stretch | challenge -->
  <h3>Title</h3>
  <div class="problem"><p>Evaluate $8^{2/3}$.</p></div>
  <ol class="steps">
    <li data-think="Optional pause-and-think prompt"><div class="do"><p>…</p></div><p class="why">…</p></li>
  </ol>
  <p class="answer">$4$</p>
  <p class="key-idea">Optional takeaway.</p>
  <p class="book-next">Optional pointer into the book.</p>
</article>
```

Keep each section's examples in order of difficulty, since tiers must never go backwards. Write `<` as `&lt;`, even inside math.

### Progress

Reading progress (examples fully revealed or marked "Got it", plus your last position) is saved in the browser's `localStorage` on this device only. Use **Reset progress** in any page footer to clear it.

## Publishing with GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick your branch (e.g. `main`) and the **/ (root)** folder, then **Save**.
4. After a minute the site is live at `https://<user>.github.io/<repo>/`. All paths are relative, so it works under any repository name.

There is no build step. To preview locally:

```bash
python3 -m http.server 8000
# open http://localhost:8000/
```

## Checking the site

`tools/verify.js` uses Playwright (`npm i -D playwright && npx playwright install chromium` if you don't have it) to load every page and check for console errors, unrendered math, broken internal links, explorers that don't respond, step reveal by mouse and keyboard, difficulty order, progress persistence and horizontal overflow at 360px:

```bash
node tools/verify.js                     # all pages
node tools/verify.js --only 1,2 --shots shots/   # some chapters, plus screenshots
```

If the machine can't reach the jsDelivr CDN, pass `--katex-dir path/to/katex` (an unpacked `katex` npm package) to serve KaTeX locally.
