# spencerarrasmith-telugu-tests

Regression tests for the Telugu app that lives in
[spencerarrasmith.com](https://github.com/spencerarrasmith/spencerarrasmith.com) at `html/content/lang/telugu/`.
They are kept in this separate repo so nothing test-related lands in the website. A GitHub Action checks the website out, then runs everything.

## Run it on GitHub

1. Create a **public** repo named `spencerarrasmith-telugu-tests` under your account, push this folder to its `main` branch.
2. **Actions → Telugu app tests → Run workflow.** The `ref` box takes any branch, tag, or commit of the website (default `master`). It also runs on every push here. The job summary lists each suite and the exact failing checks.

The website is public, so no token is needed to check it out. If you move the app inside the website repo, change `APP_PATH` at the top of `.github/workflows/test.yml`.

### Run it from the website's build pipeline
`test.yml` can be called by the website's workflow, which runs the tests on the exact commit being built and stops the image from being pushed if they fail. In the website's `.github/workflows/docker-image.yml`:

```yaml
jobs:
  test:
    uses: spencerarrasmith/spencerarrasmith-telugu-tests/.github/workflows/test.yml@main

  build:
    needs: test            # new line; the rest of the build job is unchanged
    runs-on: ubuntu-latest
    steps:
      ...
```

This needs no secrets or tokens. The tests repo has to be public, because a public repo (the website) cannot call a workflow in a private one.

## Run it on your machine

Needs Node 20+, and Python 3 for the one font check.

```
git clone https://github.com/spencerarrasmith/spencerarrasmith.com site
npm ci
npx playwright install chromium
pip install fonttools uharfbuzz        # optional: only for the font check
npm test
```

`site/` is where the tests look by default. To test a checkout elsewhere, set `SITE_DIR` to its `html/content/lang/telugu` folder.
To run some suites only: `npm test -- e2e_index e2e_signs`.

## What is checked

| Suites | What they cover |
|---|---|
| `e2e_links`, `static_css` | Every stylesheet, script, and `@import` resolves; no old file names left; pages are numbered `NN_name.html` (from `00` or `01`); one stylesheet per kind of page (`home.css`, `game.css`, `shell.css`, `reference.css`); color tokens, reset, and fonts only in `base.css` |
| `unit_*` | `settings.js`, `units.js`, `telugu-data.js` (letters, both notations, `read()`), `lookalikes-data.js`, `progress.js` (including the stored format and the upgrade of an old store) |
| `e2e_index`, `e2e_review`, `e2e_lesson`, `e2e_placeholder` | Home page (sections that fold away, tiles, routes, ✓, and counts), Review, the lesson template, the 34 "Coming soon" pages drawn from `units.js` |
| `e2e_gamecore` | `game-core.js` on its own with a three-card deck: deal, sample a session, judge, re-queue, counters, complete screen, empty pool, ✓, and Review; and that none of the four games keeps a copy of the round |
| `e2e_pho*`, `e2e_dia*`, `e2e_conj*`, `e2e_look`, `e2e_builder` | The games and the Lookalike Builder, click by click; the builder's letters, sounds, flags, and CSV reading against the shared data |
| `e2e_external` | The External Links page: the links, that each opens in a new tab, and that every thumbnail is requested from the linked site and falls back to the site's initial when it cannot be loaded. Wikipedia's answer is stood in for; no test touches another site |
| `e2e_rosetta`, `e2e_signs`, `e2e_sounds` | The three reference pages. `e2e_sounds` checks that every Telugu and English sound is drawn once, in the right box of the consonant grid or spot on the vowel chart |
| `e2e_iso` | Every page again for a reader who chose ISO on the home page: spellings like `ka`, `kā`, `kṣa` and no slashes anywhere. The other suites run in IPA, the default |
| `e2e_browser` | Real Chromium: all 44 routes open in the iframe, scripts load, no errors or 404s, and each kind of page really gets its stylesheet (jsdom ignores CSS, so this is the only place that is checked) |
| `verify_notes` | The Signs & Conjuncts notes against Noto Sans Telugu's own shaping data |

Some assertions deliberately pin current content (43 tiles, which pages are live, 7 + 8 + 8 + 12 + 8 per section, 34 placeholders, the number of notes). When you add a page or turn a tile from "Soon" to live, expect `unit_units`, `e2e_index`, `e2e_links`, `e2e_placeholder`, `static_css`, and `e2e_browser` to need their numbers updated; that failure is the reminder.

**IPA and ISO.** `require('./harness')(page)` loads a page as a first-time visitor gets it, in IPA. `require('./harness')(page, { notation: 'iso' })` loads it with ISO already chosen. `h.shown(miss)` gives a stored miss as Review would draw it now, since the store keeps the character and not the text.

**How the game suites read the round.** All four games are built on `game-core.js`, which exposes the round as `GameCore.current` (`deck`, `current`, `total`, `completed`, `start()`, `front(pred)`, `put(card)`). The suites reach it through `h.game()` in `tests/harness.js` and never evaluate a page's round variables. What they still read from a page is its own data and helpers (`keys`, `custom`, `CLUSTERS`, `deal()`, `buildCards()`).

`tests/fixtures/` holds a copy of the Lookalike CSV that two suites import.