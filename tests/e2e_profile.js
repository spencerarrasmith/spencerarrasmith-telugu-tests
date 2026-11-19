// The Profile page (profile.html): each practice game's sessions over time, as progress.js keeps them.
// A card to a game (the tiles marked `stats` in units.js); in each, two lines against the same runs, correct
// answers above and error rate below; a readout for the pointer and the arrow keys; the same numbers as a
// table; and, under all the cards, a Danger Zone whose "Reset statistics" erases every record of earlier attempts.
const load = require('./harness');
const fs = require('fs'), path = require('path'), { SITE_DIR } = require('./config');
const PAGE = 'profile.html', KEY = 'telugu.progress.v1';
const raw = fs.readFileSync(path.join(SITE_DIR, PAGE), 'utf8');

// Sample history. Phonemes: 14 runs, the error rate falling from 38% to 4%; run 3 ran out of mistakes, runs 5 and 10
// were reversed, run 6 was a short session. Diacritics: 40 runs (more than a chart marks one by one). Conjuncts: one.
const DAY = 864e5, NOW = Date.UTC(2026, 10, 19, 9, 0);
function history() {
  const errs = [38, 33, 35, 27, 24, 26, 19, 15, 17, 12, 9, 11, 6, 4];
  const phonemes = errs.map((e, i) => {
    const n = i === 5 ? 20 : 51, out = i === 2, ok = out ? 9 : n, tries = out ? 14 : Math.round(ok / (1 - e / 100));
    const r = { t: NOW - (errs.length - i) * DAY, n, ok, tries, end: out ? 'out' : 'done' };
    if (i === 4 || i === 9) r.dir = 'reverse';
    return r;
  });
  const diacritics = Array.from({ length: 40 }, (_, i) => ({ t: NOW - (40 - i) * 3600e3, n: 51, ok: i === 7 ? 3 : 51, tries: i === 7 ? 6 : 51 + (40 - i), end: i === 7 ? 'out' : 'done' }));
  const conjuncts = [{ t: NOW - 3600e3, n: 40, ok: 40, tries: 50, end: 'done' }];
  return { phonemes, diacritics, conjuncts };
}
const store = (runs, misses = {}) => ({ [KEY]: JSON.stringify({ v: 2, misses, runs }) });
const MISS = { 'phonemes|క': { game: 'phonemes', key: 'క', ask: 'telugu', note: 'Velar', count: 1, streak: 0, last: 1 } };

(async () => {
  /* ══ a first visit: nothing recorded ══ */
  const first = load(PAGE), ok = first.ok;                    // one tally for every page this suite opens
  {
    const h = first, { w, d, $ } = h, U = w.TeluguUnits;
    const cards = [...d.querySelectorAll('.pf-card')];
    ok(d.title === 'Profile' && d.querySelector('.g-header .g-title').textContent === 'Profile' && $('stat').textContent === '0 sessions', 'the page is titled "Profile"; nothing recorded reads "0 sessions"');
    ok(cards.map(c => c.dataset.game).join() === 'phonemes,diacritics,conjuncts,lookalikes' && cards.map(c => c.dataset.game).join() === U.all.filter(t => t.stats).map(t => t.id).join(), 'a card for each game that units.js marks `stats`, in app order');
    ok(cards.every(c => { const t = U.get(c.dataset.game); return c.querySelector('.pf-name').textContent === t.title && c.querySelector('.pf-icon').textContent === t.icon && c.querySelector('.pf-sub').textContent === t.desc; }), 'each card carries its tile\'s icon, title, and description');
    ok(cards.every(c => /^No sessions yet\. Play .+ to its end and it shows up here\.$/.test(c.querySelector('.pf-empty').textContent) && !c.querySelector('svg') && !c.querySelector('.pf-figs') && !c.querySelector('.pf-table')), 'with nothing recorded each card says so, and draws no chart');
    const zone = d.querySelector('.pf-danger'), FOLLOWS = 4;
    ok(zone && zone.querySelector('h2').textContent === 'Danger Zone' && zone.getAttribute('aria-labelledby') === zone.querySelector('h2').id && ($('cards').compareDocumentPosition(zone) & FOLLOWS) && zone.parentElement === $('cards').parentElement && zone.parentElement.lastElementChild === zone,
      'the Danger Zone is a section of its own, after all the cards, the last thing on the page');
    ok(zone.contains($('reset')) && d.querySelectorAll('#reset, .pf-reset').length === 1 && $('reset').textContent === 'Reset statistics' && $('reset').type === 'button' && /cannot be undone/.test(zone.querySelector('p').textContent) && /Review/.test(zone.querySelector('p').textContent),
      '"Reset statistics" is in it, and nowhere else, beside a line saying what it erases and that it cannot be undone');
    ok($('reset').disabled, 'with nothing to erase the button is off');
    const css = raw.match(/<style>([\s\S]*?)<\/style>/)[1];
    ok(/\.pf-reset \{[^}]*color: #0b0c18;[^}]*background: var\(--error\);/.test(css) && /\.pf-danger h2 \{[^}]*color: var\(--error\)/.test(css) && /\.pf-danger \{[^}]*border: 1px solid rgba\(248, 113, 113/.test(css), 'the button is red (dark text on the error color), under a red heading, in a red-edged box');
    ok(/<link rel="stylesheet" href="game\.css">\s*<link rel="stylesheet" href="reference\.css">/.test(raw) && ['settings.js', 'units.js', 'progress.js'].every(f => raw.includes(`<script src="${f}"></script>`)) && !/https?:\/\//.test(raw.replace('http://www.w3.org/2000/svg', '')) && !/localStorage/.test(raw),
      'the page uses the shared stylesheets and scripts, draws its charts itself (no library, nothing fetched), and reads the store only through progress.js');
    // a session finished somewhere else (a game in another tab) shows up without a reload
    w.TeluguProgress.run('conjuncts', { total: 40, correct: 40, attempts: 44 });
    ok($('stat').textContent === '1 session' && d.querySelectorAll('.pf-empty').length === 3 && !!d.querySelector('[data-game="conjuncts"] svg') && !$('reset').disabled, 'a session recorded while the page is open appears at once: "1 session", a chart for Conjuncts, the reset button on');
  }

  /* ══ with a history ══ */
  {
    const h = load(PAGE, { storage: store(history(), MISS) }), { w, d, $ } = h, P = w.TeluguProgress;
    const card = id => d.querySelector(`.pf-card[data-game="${id}"]`), svg = id => card(id).querySelector('[data-chart] svg');
    const texts = (id, cls) => [...svg(id).querySelectorAll(cls ? 'text.' + cls : 'text:not([class])')].map(t => t.textContent);
    const figs = id => [...card(id).querySelectorAll('.pf-fig')].map(f => f.querySelector('.pf-fig-val').textContent + ' ' + f.querySelector('.pf-fig-lbl').textContent).join(' | ');
    ok($('stat').textContent === '55 sessions' && d.querySelectorAll('.pf-empty').length === 1 && !!card('lookalikes').querySelector('.pf-empty') && !$('reset').disabled, '55 sessions across three games; Lookalikes, never played, still says so');
    ok(figs('phonemes') === '14 sessions | 4% errors, last session | 4% fewest errors' && figs('conjuncts') === '1 session | 20% errors, last session | 20% fewest errors', 'three figures per card: sessions, the last error rate, the lowest: ' + figs('phonemes'));

    /* the chart: two lines against the same runs */
    const s = svg('phonemes'), lines = [...s.querySelectorAll('path.line')];
    ok(s.getAttribute('role') === 'img' && s.getAttribute('tabindex') === '0' && /^Correct answers and error rate over 14 runs\. The last run: 51 correct, 4% errors\./.test(s.getAttribute('aria-label')), 'the chart is one focusable picture, described for a screen reader: ' + s.getAttribute('aria-label').slice(0, 70));
    ok(lines.length === 2 && lines.every(l => l.getAttribute('d').split('L').length === 14 && /^M[\d.]+ [\d.]+ L/.test(l.getAttribute('d'))) && lines[0].getAttribute('stroke') === 'var(--correct)' && lines[1].getAttribute('stroke') === 'var(--errors)',
      'two lines of 14 points: correct answers in one color, error rate in the other');
    ok(texts('phonemes', 'ttl').join() === 'Correct answers,Error rate' && [...s.querySelectorAll('line[stroke-linecap]')].map(l => l.getAttribute('stroke')).join() === 'var(--correct),var(--errors)', 'each has its own panel, named beside a stroke of its color (the words are never colored)');
    const tickTexts = texts('phonemes');
    ok(tickTexts.join(' ').startsWith('0 20 40 60 0% 10% 20% 30% 40%'), 'each panel has its own scale from 0, ending on a round number: 0–60 answers, 0%–40% errors');
    ok(texts('phonemes', 'end').join() === '51,4%', 'the last value is written at the end of each line: ' + texts('phonemes', 'end').join(' and '));
    ok(tickTexts.slice(9).join(' ') === '1 4 7 10 14 Run', 'the runs are numbered along the bottom, a few of them: ' + tickTexts.slice(9).join(' '));
    const pt = l => l.getAttribute('d').split(/[ML]/).filter(Boolean).map(p => p.trim().split(' ').map(Number)), a = pt(lines[0]), b = pt(lines[1]);
    ok(a.every((p, i) => p[0] === b[i][0]) && a.every((p, i) => !i || p[0] > a[i - 1][0]) && a[0][1] === a[13][1] && a[2][1] > a[0][1] && a[5][1] > a[0][1] && b[13][1] > b[0][1] && Math.max(...a.map(p => p[1])) < Math.min(...b.map(p => p[1])),
      'both lines share the runs left to right; the correct line dips for the session cut short and the short session, the error line falls; the first panel sits wholly above the second');
    ok(s.querySelectorAll('circle.dot:not([visibility])').length === 28 && s.querySelectorAll('circle.dot.early').length === 2 && [...s.querySelectorAll('circle.dot.early')].every(c => c.getAttribute('cx') === String(a[2][0]) || Math.abs(c.getAttribute('cx') - a[2][0]) < 0.06) && s.querySelector('circle.dot.early').getAttribute('style').includes('var(--correct)'),
      'every run has a dot on each line; run 3, which ran out of mistakes, is hollow on both');
    ok(card('phonemes').querySelector('.pf-key').textContent === 'a session that ran out of mistakes' && !card('conjuncts').querySelector('.pf-key'), 'the hollow dot is explained under the chart, only where there is one');
    const css = raw.match(/<style>([\s\S]*?)<\/style>/)[1];
    ok(/--correct: #3987e5; --errors: #d95926;/.test(css) && /\.pf-chart \.line \{[^}]*stroke-width: 2;/.test(css) && /\.pf-chart \.dot  \{ stroke: var\(--surface\); stroke-width: 2; \}/.test(css) && /\.pf-chart text \{[^}]*fill: var\(--text-muted\)/.test(css),
      'the two colors are set once; lines are 2px, dots ringed in the card\'s own color, chart text in the text color');

    /* many runs: only the last and the early endings keep a dot; one run: a dot, no line */
    ok(svg('diacritics').querySelectorAll('path.line').length === 2 && svg('diacritics').querySelectorAll('circle.dot:not([visibility])').length === 4 && svg('diacritics').querySelectorAll('circle.dot.early').length === 2 && texts('diacritics').includes('40'),
      'with 40 runs the lines stay but only the last run and the one cut short keep their dots');
    ok(svg('conjuncts').querySelectorAll('path.line').length === 0 && svg('conjuncts').querySelectorAll('circle.dot:not([visibility])').length === 2 && texts('conjuncts', 'end').join() === '40,20%' && texts('conjuncts').slice(-2).join() === '1,Run',
      'a single run is a dot in each panel (40 correct, 20% errors), with no line');

    /* reading a run: the arrow keys */
    const tip = () => card('phonemes').querySelector('.pf-tip'), cross = () => s.querySelector('.cross');
    const said = () => (tip().hidden ? '(hidden)' : [...tip().children].map(e => e.textContent).join(' / '));
    const key = k => { const e = new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }); s.dispatchEvent(e); return e.defaultPrevented; };
    ok(tip().hidden && cross().getAttribute('visibility') === 'hidden', 'nothing is read out until the chart is pointed at or focused');
    s.dispatchEvent(new w.FocusEvent('focus'));
    ok(/^Run 14 · .+ \/ 51 correct of 51 cards \/ 4% errors \(2 of 53 answers\)$/.test(said()) && cross().getAttribute('visibility') === 'visible' && Math.abs(cross().getAttribute('x1') - a[13][0]) < 0.06, 'focusing the chart reads the last run, with a reading line through it: ' + said());
    ok([...tip().querySelectorAll('.pf-tip-row b')].map(x => x.textContent).join() === '51,4%' && [...tip().querySelectorAll('.pf-tip-row i')].map(i => i.style.background).join() === 'var(--correct),var(--errors)', 'the values lead, each keyed by a stroke of its line\'s color');
    ok(key('ArrowLeft') && /^Run 13 · /.test(said()) && /6% errors/.test(said()), '← reads the run before: ' + said());
    key('Home'); ok(/^Run 1 · .+ \/ 51 correct of 51 cards \/ 38% errors \(31 of 82 answers\)$/.test(said()) && Math.abs(cross().getAttribute('x1') - a[0][0]) < 0.06, 'Home reads the first: ' + said());
    key('ArrowLeft'); ok(/^Run 1 · /.test(said()), '← at the first run stays there');
    key('ArrowRight'); key('ArrowRight');
    ok(/^Run 3 · .+ \/ 9 correct of 51 cards \/ 36% errors \(5 of 14 answers\) \/ Ended early: out of mistakes$/.test(said()), 'a run that ran out of mistakes says so: ' + said());
    key('ArrowRight'); key('ArrowRight'); ok(/^Run 5 · .+ · reversed \/ /.test(said()), 'a reversed session says so: ' + said().split(' / ')[0]);
    key('ArrowRight'); ok(/20 correct of 20 cards/.test(said()), 'a short session shows its own size: ' + said().split(' / ')[1]);
    key('End'); key('ArrowRight'); ok(/^Run 14 · /.test(said()), 'End reads the last; → stays there');
    ok(!key('a') && /^Run 14 · /.test(said()), 'other keys are left alone');
    s.dispatchEvent(new w.FocusEvent('blur')); ok(tip().hidden && cross().getAttribute('visibility') === 'hidden', 'leaving the chart puts the readout away');

    /* reading a run: the pointer only has to be nearest */
    s.getBoundingClientRect = () => ({ left: 100, top: 0, width: 560, height: 300, right: 660, bottom: 300 });
    const point = x => s.dispatchEvent(new w.MouseEvent('pointermove', { clientX: 100 + x, bubbles: true }));
    point(a[6][0] + 9); ok(/^Run 7 · /.test(said()) && Math.abs(cross().getAttribute('x1') - a[6][0]) < 0.06, 'pointing near run 7 reads run 7: ' + said().split(' / ')[0]);
    point(2); ok(/^Run 1 · /.test(said()), 'left of the first run reads the first');
    point(559); ok(/^Run 14 · /.test(said()), 'right of the last reads the last');
    s.dispatchEvent(new w.MouseEvent('pointerleave')); ok(tip().hidden, 'moving off the chart puts the readout away');

    /* the same numbers as a table */
    const table = card('phonemes').querySelector('details.pf-table'), rows = [...table.querySelectorAll('tbody tr')].map(r => [...r.children].map(c => c.textContent));
    ok(!table.open && table.querySelector('summary').textContent === 'Show as a table' && [...table.querySelectorAll('thead th')].map(t => t.textContent).join('|') === 'Run|When|Correct|Cards|Errors|Error rate|Ended', 'every chart comes with "Show as a table", closed to begin with');
    ok(rows.length === 14 && rows[0][0] === '14' && rows[13][0] === '1' && rows[0].slice(2).join('|') === '51|51|2|4%|Finished' && rows[11].slice(2).join('|') === '9|51|5|36%|Out of mistakes' && / · reversed$/.test(rows[9][1]) && !/reversed/.test(rows[0][1]),
      'the table lists all 14 runs, newest first, with what the chart shows and how each ended');

    /* ── Danger Zone: Reset statistics ── */
    const zone = d.querySelector('.pf-danger');
    ok(zone.parentElement.lastElementChild === zone && !$('reset').disabled && !$('reset').classList.contains('armed'), 'the Danger Zone is still last; the button is on');
    $('reset').click();
    ok($('reset').textContent === 'Click again to erase all history' && $('reset').classList.contains('armed') && P.runCount() === 55 && P.missCount() === 1 && $('stat').textContent === '55 sessions', 'one click erases nothing: the button asks to be clicked again');
    // left alone for more than 5 seconds, the next click only asks again
    const now = w.Date.now; w.Date.now = () => now() + 6000;
    $('reset').click();
    ok(P.runCount() === 55 && $('reset').textContent === 'Click again to erase all history', 'a second click more than 5 seconds later does not count: it asks again');
    $('reset').click(); w.Date.now = now;
    ok(P.runCount() === 0 && P.missCount() === 0 && JSON.stringify(P.runs()) === '{}', 'clicked twice in a row, it erases every record of earlier attempts: the sessions and the Review list');
    ok(JSON.stringify(Object.keys(JSON.parse(w.localStorage.getItem(KEY))).sort()) === '["misses","runs","v"]' && w.localStorage.getItem(KEY).length < 40, 'nothing of them is left in the browser\'s storage');
    ok($('stat').textContent === '0 sessions' && d.querySelectorAll('.pf-empty').length === 4 && !d.querySelector('[data-chart]') && $('reset').disabled && $('reset').textContent === 'Reset statistics' && !$('reset').classList.contains('armed'), 'the page redraws empty, and the button goes back to rest with nothing left to erase');
  }

  /* ══ odds and ends ══ */
  {
    // only missed items on record: there is still something to erase
    const h = load(PAGE, { storage: store({}, MISS) }), { w, $ } = h;
    ok(!$('reset').disabled && $('stat').textContent === '0 sessions', 'with no sessions but items waiting in Review, the button is on');
    $('reset').click(); $('reset').click();
    ok(w.TeluguProgress.missCount() === 0 && $('reset').disabled, 'and erases them');
  }
  {
    // runs of a game the app no longer has, and a store from the days of ✓ marks: neither upsets the page
    const old = { [KEY]: JSON.stringify({ v: 2, done: { phonemes: { at: 1, runs: 2, best: 90 } }, misses: {}, runs: { gone: [{ t: 1, n: 5, ok: 5, tries: 5, end: 'done' }], phonemes: [{ t: NOW, n: 51, ok: 51, tries: 51, end: 'done' }] } }) };
    const h = load(PAGE, { storage: old }), { d, $ } = h;
    ok($('stat').textContent === '1 session' && d.querySelectorAll('.pf-card').length === 4 && d.querySelectorAll('[data-chart]').length === 1 && d.querySelector('[data-game="phonemes"] .pf-fig-val').textContent === '1', 'runs of a game that is no longer listed are not drawn; an old store with ✓ marks reads fine');
    ok([...d.querySelector('[data-game="phonemes"] svg').querySelectorAll('text.end')].map(t => t.textContent).join() === '51,0%', 'a session without a mistake reads 0% errors');
  }
  first.done();
})().catch(e => { console.error(e); process.exit(1); });
