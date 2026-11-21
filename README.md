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

Needs Node 20+, and Python 3 for the two font checks.

```
git clone https://github.com/spencerarrasmith/spencerarrasmith.com site
npm ci
npx playwright install chromium
pip install fonttools uharfbuzz brotli # optional: only for the two font checks
npm test
```

`site/` is where the tests look by default. To test a checkout elsewhere, set `SITE_DIR` to its `html/content/lang/telugu` folder.
To run some suites only: `npm test -- e2e_index e2e_signs`.

## What is checked

| Suites | What they cover |
|---|---|
| `e2e_links`, `static_css` | Every stylesheet, script, and `@import` resolves; no old file names left; pages are numbered `NN_name.html` (from `00` or `01`); one stylesheet per kind of page (`home.css`, `game.css`, `shell.css`, `reference.css`); color tokens, reset, and fonts only in `base.css`; the fonts are files in the app's own `fonts/` folder, each with its license, and no page or stylesheet asks another site for one |
| `unit_*` | `settings.js` (and how two devices' choices are reconciled: the later wins), `units.js` (and that every section, tile, page title, and heading is in title case), `telugu-data.js` (letters, both notations, `read()`), `lookalikes-data.js`, `progress.js` (misses, and the runs the Profile page charts; the stored format, the upgrade of an old store, and that `reset()` erases everything; and syncing: `merge()` gives the same store in either order and again, keeps every run once and the later copy of each miss, and what Review cleared or a reset erased stays erased on every copy; `absorb()` and `forget()`) |
| `e2e_index`, `e2e_review`, `e2e_lesson`, `e2e_placeholder` | Home page (the title that flips between Latin and Telugu; the Profile button and the Settings menu, ☰, at the top right; sections that fold away, each heading line one button from its name across to its arrow, which points left once folded (no "x of y ready"); tiles (icon and title on one line, the description under them) and routes; Review as the first tile of Training, highlighted with the Training arrow while items wait in its list; and that nothing is ever marked "complete"), Review, the lesson template (which has no "Completed" pill), the 31 "Coming soon" pages drawn from `units.js` |
| `e2e_account` | Logging in and syncing (`sync.js`) on the home page, against a stand-in for the account server that answers as PocketBase does (one record per user, keys sorted): Log In / the name and Log Out at the top right, the popup (Google; a code by email, a wrong one, a short one), the first sync bringing in what was played before logging in, a session sent a moment later, nothing written when nothing is new, another device's sessions and settings arriving, the server not answering (and trying again), Log Out asking first when something has not reached the account, a browser holding another account's progress, a login that has run out, and that nothing of this runs from a file or without the client |
| `e2e_keyboard` | The on-screen Telugu keyboard (`telugu-keyboard.js`) and its workbench (Training → Telugu Keyboard): Gboard's layout, ten keys a row, and its second page (౧౨౩: digits, ఞ and ఁ, symbols, ? and ! over , and . beside ⌫, the same bottom row); no letter out of use (ఌ ౡ ఱ ౘ ౙ) on either; after a consonant the vowel keys type its sign and show the syllable (కి, క్శా) and అ becomes ్; after ్ the consonant keys show the conjunct each makes (క్ష, క్ష్మ్య); ం ః ఁ always signs; a long press offers the consonant joined to the one before (క్శ), its pure form and its conjuncts (from `telugu-data.js`), and ్ + ZWNJ under ్; typing at the cursor, backspace (and holding it), digits and punctuation, the readout, and "Keyboard shows syllables", which is the app setting (`settings.js`); and that a key keeps its height and the last two rows their place on either page (sliding to a choice, and the sizes, are checked in `e2e_browser`) |
| `e2e_board` | `TeluguKeyboard.board()`, the games' keyboard, on its own: the whole Telugu keyboard, both pages, each key where its letter sits and every other key dimmed (spans, hidden from screen readers); a key with no place on the second page, after ఁ; turning the page, and `reveal()`; ⌫ a key of the game's with `onBack`, off until `back(true)`; `relabel()` for faces in the making; grouped, only the game's keys in labeled groups; `syllables()`, the app setting; and the CSS that keeps keys, rows, slots, and the counters from changing size |
| `e2e_profile` | The Profile page: a card for each charted game (Phonemes, Diacritics, Conjuncts, Words; none for Lookalikes), its two-panel chart (correct answers and error rate against the same runs), the readout for the pointer and the arrow keys, the table of the same numbers, and the Danger Zone whose "Reset statistics" takes two clicks and erases every session and the Review list; and Words, whose runs carry their own count of wrong answers (a card is a word, an answer one of its sounds) |
| `e2e_gamecore` | `game-core.js` on its own with a three-card deck: deal, sample a session, judge, re-queue, counters, complete screen, empty pool, Review, and the record of each session played to its end; a session's own length and game over, and missed cards that do not come back; a card that takes several answers (`step()` for each, counted one by one, a wrong one held on screen before play goes on, then `judge({ counted })`); `record: false` for a game whose sessions are not kept; and that none of the five games keeps a copy of the round |
| `e2e_setup` | The session popup (`game-setup.js`) on Phonemes, which has no ⋮ menu: opens with the page, Cancel left and Start right, the direction switch, the rounds slider and its text box, the "Game over" slider, the three checkboxes at the right of their rows below them ("Group keyboard phonetically" starts off: the keyboard laid out as the Telugu keyboard, and no label on the card), Cancel putting everything back, "Missed guesses reappear" (off: a wrong guess is not shown again, and every card is shown once), game over ("Game over" at 3 ends the session on the third mistake, 1 on the first; the note under the slider says so, and the header counts the mistakes left down in hearts), and Cancel leaving the lesson only before anything is played. Then the same popup on Diacritics and Conjuncts: their own checkboxes, and Conjuncts starting at its usual 40 rounds of 83 |
| `e2e_pho*`, `e2e_dia*`, `e2e_conj*`, `e2e_look` | The games, click by click. Each game's keyboard laid out as the Telugu keyboard (every key in its letter's place, the keys a game does not use dimmed, a key with no place on the second page), or grouped by sound with "Group keyboard phonetically"; nothing of the letters out of use. Diacritics and Conjuncts: ⌫ takes back the last pick, and in reverse, with "Keyboard shows syllables" (on unless turned off), the keys show what the picks so far make (కా, క్ష, ష్ట్ర) |
| `e2e_bookish` | The Bookish Telugu page: a card for each letter and sign out of use (from `telugu-data.js`) and for ఁ, the Sanskrit loanwords with their sounds, both in the reader's notation; and that no game offers those letters any more |
| `unit_words` | Reading a whole word (`TeluguData.syllables()`, `notation.piece()` and `notation.word()`): how a word splits into its written characters and the sounds each spells, in IPA and ISO, in step with `read()` for every syllable and cluster. And the Words list (`alphabet/words-data.js`): 250 words, none longer than five characters, about two and a half on average, every sound on the game's keyboards |
| `e2e_words` | The Words game: its popup (no direction), the keyboard (laid out as the Telugu keyboard, or grouped), the card (meaning above, the character being spelled highlighted, a box for every sound), right picks, ం answered by its own key or by the nasal it is said as there (ŋ ɲ ɳ n, or m before any other letter or at the end of the word; a wrong nasal lights both right keys), a wrong pick (one mistake, that character over, play going on after the pause), what "Highlight correct answer" shows and hides, the end of a word, game over mid-word, missed words that do not come back, the record of each session, Review, and all 250 words spelled key by key; then again in ISO |
| `e2e_builder` | The Lookalike Builder: the Character / Looks Like switch, choosing and picking, conjuncts limited to the listed ones (every key offered is one the Lookalikes game can read), stored picks, CSV export and import, and its letters, sounds, and flags against the shared data |
| `e2e_external` | The External Links page: the links, that each opens in a new tab, and that every thumbnail is requested from the linked site and falls back to the site's initial when it cannot be loaded. Wikipedia's answer is stood in for; no test touches another site |
| `e2e_rosetta`, `e2e_signs`, `e2e_sounds` | The three reference pages. `e2e_sounds` checks that every Telugu and English sound is drawn once, in the right box of the consonant grid or spot on the vowel chart |
| `e2e_iso` | Every page again for a reader who chose ISO on the home page: spellings like `ka`, `kā`, `kṣa` and no slashes anywhere. The other suites run in IPA, the default |
| `e2e_browser` | Real Chromium: all 44 routes open in the iframe, scripts load, no errors or 404s, and each kind of page really gets its stylesheet (jsdom ignores CSS, so this is the only place that is checked). Also the layout that only a browser can show: the session popup, the Settings menu, the Profile page's charts and its red Danger Zone; the games' keyboard (five rows of ten keys of one width, the bottom row 1½ 1 5 1 1½, every key one height, ⌫ and the bottom row in one place on both pages, dimmed keys taking no taps) on a desktop and a phone, and that nothing moves while a game is played: not the keys when conjuncts or syllables are printed on them, not the slots when they fill, not the header when a counter gains a digit |
| `verify_notes` | The Signs & Conjuncts notes against Noto Sans Telugu's own shaping data |
| `verify_fonts` | The app's own font files (`fonts/`): each holds the weights `base.css` declares for it, and every Telugu character and every sound character (IPA and ISO) that the app's pages and data contain is in the font meant to draw it |

Some assertions deliberately pin current content (44 tiles, which pages are live, 8 + 4 + 4 + 8 + 12 + 8 per section, 31 placeholders, the 250 words and their lengths, the number of notes, the sounds and rare/extra flags of the letters, the links on External Links). When you change a sound or a flag in `telugu-data.js`, expect the game, Review, and reference suites to need their expected strings updated. When you add a page or turn a tile from "Soon" to live, expect `unit_units`, `e2e_index`, `e2e_links`, `e2e_placeholder`, `static_css`, and `e2e_browser` to need their numbers updated; that failure is the reminder.

**IPA and ISO.** `require('./harness')(page)` loads a page as a first-time visitor gets it, in IPA. `require('./harness')(page, { notation: 'iso' })` loads it with ISO already chosen. `h.shown(miss)` gives a stored miss as Review would draw it now, since the store keeps the character and not the text.

**The session popup.** A game that opens with the popup (Phonemes, Diacritics, Conjuncts) is loaded with Start already pressed, so a suite begins in a session with the defaults. `require('./harness')(page, { setup: 'open' })` leaves the popup open. `h.setup(fn)` opens the popup, runs `fn` (check a box, move a slider), and presses Start. `h.flip()` turns the direction around that way, and `h.again()` presses "Practice Again" and then Start.

**How the game suites read the round.** All five games are built on `game-core.js`, which exposes the round as `GameCore.current` (`deck`, `current`, `total`, `completed`, `start()`, `front(pred)`, `put(card)`). The suites reach it through `h.game()` in `tests/harness.js` and never evaluate a page's round variables. What they still read from a page is its own data and helpers (`keys`, `custom`, `CLUSTERS`, `deal()`, `buildCards()`).

`tests/fixtures/` holds a copy of the Lookalike CSV that two suites import.