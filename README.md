# telugu-tests

Regression tests for the Telugu app that lives in
[spencerarrasmith.com](https://github.com/spencerarrasmith/spencerarrasmith.com) at `html/content/lang/telugu/`.
They are kept in this separate repo so nothing test-related lands in the website. A GitHub Action checks the website out, then runs everything.

## Run it on GitHub

1. Create a **public** repo named `telugu-tests` under your account, push this folder to its `main` branch.
2. **Actions → Telugu app tests → Run workflow.** The `ref` box takes any branch, tag or commit of the website (default `master`). It also runs on every push here. The job summary lists each suite and the exact failing checks.

The website is public, so no token is needed to check it out. If you move the app inside the website repo, change `APP_PATH` at the top of `.github/workflows/test.yml`.

### Run it from the website's build pipeline
`test.yml` can be called by the website's workflow, which runs the tests on the exact commit being built and stops the image from being pushed if they fail. In the website's `.github/workflows/docker-image.yml`:

```yaml
jobs:
  test:
    uses: spencerarrasmith/telugu-tests/.github/workflows/test.yml@main

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
| `e2e_links`, `static_css` | Every stylesheet, script and `@import` resolves; no old file names left; pages are numbered `NN_name.html`; shared CSS wiring |
| `unit_*` | `telugu-data.js`, `lookalikes-data.js`, `progress.js` |
| `e2e_index`, `e2e_review`, `e2e_lesson` | Home page (sections, tiles, routes, ✓ and counts), Review, the lesson template |
| `e2e_pho*`, `e2e_dia*`, `e2e_conj*`, `e2e_look`, `e2e_builder` | The games and the Lookalike Builder, click by click |
| `e2e_rosetta`, `e2e_signs` | The two reference pages |
| `e2e_browser` | Real Chromium: all 41 tiles open in the iframe, scripts load, no errors or 404s |
| `verify_notes` | The Signs & Conjuncts notes against Noto Sans Telugu's own shaping data |

Some assertions deliberately pin current content (41 tiles, which pages are live, 5 + 8 + 8 + 12 + 8 per section, the number of notes). When you add a page or turn a tile from "Soon" to live, expect `e2e_index`, `e2e_links` and `e2e_browser` to need their numbers updated; that failure is the reminder.

`tests/fixtures/` holds a copy of the Lookalike CSV that two suites import.
