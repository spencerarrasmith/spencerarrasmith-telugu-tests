const h = require('./harness')('alphabet/05_lookalikes.html');
const { w, d, tick, ok, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const fs = require('fs');
const CSV = fs.readFileSync(require('path').join(__dirname, 'fixtures', 'telugu_lookalikes_groups.csv'), 'utf8');
const cur = () => G().current;
const keys = () => [...d.querySelectorAll('.kb-btn')];
const key = t => keys().find(b => b.dataset.text === t);
const total = () => G().total;
// Bring a card to the front; one the round didn't deal (the session is a sample of 40) is taken from the page's own deal().
const front = text => { const is = c => c.item.text === text;
  try { G().front(is); } catch (e) { const c = w.deal().find(is); if (!c) throw new Error('no card ' + text); G().put(c); } };
const upload = (text, name = 'mine.csv') => new Promise(res => { w.eval('onFile').call(null, new w.File([text], name, { type: 'text/csv' })); setTimeout(res, 30); });
(async () => {
  /* ── built-in baseline ── */
  ok($('use-builtin').checked && !$('use-custom').checked && $('use-custom').disabled, 'built-in groups on; "My CSV groups" off and disabled until uploaded');
  ok($('shuffle-kb').checked && !$('include-extra').checked, 'choices shuffled by default; extras off');
  ok(total() === 40 && G().deck.every(c => c.item.core), 'baseline: 40 cards (every character of the 12 groups), none extra');
  let c0 = cur();
  ok(/^\/.+\/$/.test($('tel-char').textContent) && $('tel-char').textContent === `/${c0.item.ipa}/`, 'card shows the sound as /ipa/: ' + $('tel-char').textContent);
  ok(keys().length === c0.options.length && $('cat-badge').textContent === `${c0.options.length} lookalikes`, 'choices = the whole group (' + keys().length + ')');
  ok(keys().every(b => b.classList.contains('te')), 'choices are Telugu keys');

  /* ── right / wrong ── */
  front('ఒ');
  ok($('tel-char').textContent === '/o/' && G().current.options.map(o => o.text).sort().join('') === ['ఒ', 'ఓ', 'బ', 'ఙ'].sort().join(''), 'ఒ card: /o/ among ఒ ఓ బ ఙ');
  key('బ').click();
  ok($('char-card').classList.contains('wrong') && key('బ').classList.contains('err') && key('ఒ').classList.contains('ok') && $('feedback').textContent.trim() === '✗  ఒ' && $('feedback').classList.contains('te'), 'wrong pick: red, right answer green, ✗ + the glyph');
  const P = w.TeluguProgress, m = P.misses().find(x => x.game === 'lookalikes');
  ok(m && m.key === 'ఒ' && m.ask === 'sound' && !m.syllable && h.shown(m).prompt === '/o/' && h.shown(m).answer === 'ఒ' && /Among/.test(m.note) && /బ/.test(m.note), 'miss logged as its own game, asked by sound: ' + (m && `${h.shown(m).prompt} → ${h.shown(m).answer} (${m.note})`));
  const n0 = G().deck.length;
  await tick(); await tick();
  ok(G().deck.length === n0 && G().deck.some(c => c.item.text === 'ఒ') && !$('char-card').classList.contains('wrong'), 'card re-queued, fresh card shown');
  front('ఒ'); key('ఒ').click();
  ok($('char-card').classList.contains('correct') && $('feedback').textContent.trim() === '✓  ఒ' && G().completed === 1, 'right pick: ✓, counted');
  await tick(); await tick();

  /* ── rare pip + the sound of a syllable ── */
  front('ఙ');
  ok($('rare-badge').style.display === '' && $('tel-char').textContent === '/ŋ/', 'ఙ carries the rare pip (from telugu-data.js)');
  front('వు');
  ok($('rare-badge').style.display === 'none' && $('tel-char').textContent === '/ʋu/' && key('పు') && key('ఘ') && key('మ'), 'వు: /ʋu/ among ఘ మ వు పు, no rare pip');

  /* ── order: shuffled versus as written ── */
  front('అ');
  $('shuffle-kb').checked = false; $('shuffle-kb').dispatchEvent(new w.Event('change', { bubbles: true }));
  ok(keys().map(b => b.dataset.text).join('') === 'అఆలత', 'shuffle off: group order as written (అఆలత)');
  const seen = new Set();
  $('shuffle-kb').checked = true; $('shuffle-kb').dispatchEvent(new w.Event('change', { bubbles: true }));
  for (let i = 0; i < 25; i++) { front('అ'); seen.add(keys().map(b => b.dataset.text).join('')); }
  ok(seen.size > 1 && [...seen].every(s => [...s].sort().join('') === [...'అఆలత'].sort().join('')), 'shuffle on: many orders, always the same four (' + seen.size + ' seen)');
  front('అ'); const before = keys().map(b => b.dataset.text).join('');
  w.buildKB();                                              // the page redraws its choices (as the ⋮ menu asks it to)
  ok(keys().map(b => b.dataset.text).join('') === before, 'order stays fixed within a card (rebuilds keep it)');

  /* ── upload your CSV ── */
  await upload('hello');
  ok($('csv-status').classList.contains('err') && /No lookalike groups/.test($('csv-status').textContent) && w.eval('custom.length') === 0 && $('use-builtin').checked, 'a file with no groups is refused with a message; nothing changes');
  await upload(CSV, 'telugu_lookalikes_groups.csv');
  ok(w.eval('custom.length') === 3 && $('use-custom').checked && !$('use-custom').disabled && !$('use-builtin').checked, 'upload: 3 groups, "My CSV groups" on, built-in turned off');
  ok(/66 characters|3 groups/.test($('custom-note').textContent) && !$('csv-clear').hidden, 'menu shows the count: ' + $('custom-note').textContent);
  ok(/Loaded 3 groups/.test($('csv-status').textContent), 'status: ' + $('csv-status').textContent.slice(0, 70) + '…');
  ok(w.eval('localStorage.getItem(STORE)') === CSV, 'CSV text remembered in the browser');
  ok(G().deck.every(c => w.eval('custom').some(g => g.items.includes(c.item))) && total() === 40, 'cards now come from your groups (sampled to 40)');
  front('ఖ');
  ok(G().current.options.length === 30 && !key('ఱ'), 'default: the 31-character group has its extra ఱ hidden → 30 choices');
  $('include-extra').checked = true; $('include-extra').dispatchEvent(new w.Event('change', { bubbles: true }));
  front('ఖ');
  ok(G().current.options.length === 31 && !!key('ఱ') && key('ఱ').classList.contains('te'), 'Include extra letters → 31 choices with ఱ');
  front('ఱ');
  ok($('rare-badge').style.display === '' && $('tel-char').textContent === '/ɽ/', 'ఱ card: /ɽ/ with the rare pip');
  front('ఙౌ');
  ok($('tel-char').textContent === '/ŋau/' && key('ఙ') && key('ఙౌ').classList.contains('long'), 'syllable ఙౌ: /ŋau/ (wide key)');
  $('include-extra').checked = false; $('include-extra').dispatchEvent(new w.Event('change', { bubbles: true }));

  /* ── sets ── */
  $('use-custom').checked = false; $('use-custom').dispatchEvent(new w.Event('change', { bubbles: true }));
  ok($('use-custom').checked, 'the last checked set cannot be turned off');
  $('use-builtin').checked = true; $('use-builtin').dispatchEvent(new w.Event('change', { bubbles: true }));
  $('use-custom').checked = true;  $('use-custom').dispatchEvent(new w.Event('change', { bubbles: true }));
  ok(G().deck.some(c => w.eval('custom').some(g => g.items.includes(c.item))) && G().deck.some(c => w.eval('BUILTIN').some(g => g.items.includes(c.item))), 'both sets on: cards from both');

  /* ── remembered across a reload; removable ── */
  w.eval('custom = []; syncSets();');
  ok($('use-custom').disabled && !$('use-custom').checked, 'without a CSV the option is disabled again');
  w.eval('loadSaved(); syncSets();');
  ok(w.eval('custom.length') === 3 && $('use-custom').checked && !$('use-custom').disabled, 'reload: saved CSV is picked up again');
  $('csv-clear').click();
  ok(w.eval('custom.length') === 0 && $('use-builtin').checked && $('use-custom').disabled && w.eval('localStorage.getItem(STORE)') === null && $('csv-clear').hidden, 'Remove mine: back to built-in, storage cleared');

  /* ── a custom file with its own rules: pairs, dupes, unreadable cells ── */
  await upload('క,క్\nక,౫,ఖ\n,\nఓ\n');
  ok(w.eval('custom.length') === 2 && /Skipped 1/.test($('csv-status').textContent) && /౫/.test($('csv-status').textContent), 'rows: pair kept, row with one valid character dropped, ౫ reported as skipped: ' + $('csv-status').textContent.slice(-50));
  $('use-builtin').checked = false; $('use-builtin').dispatchEvent(new w.Event('change', { bubbles: true }));
  G().put(w.buildCards([w.eval('custom')], false).find(c => c.item.text === 'క' && c.options.some(o => o.text === 'క్')));
  ok(G().current.options.length === 2 && $('tel-char').textContent === '/k/', 'క and క్ are both /k/ (క is in two groups, so it gets two cards)');
  key('క్').click();
  ok($('char-card').classList.contains('correct'), 'a different character with the same sound is accepted');
  await tick(); await tick();

  /* ── finishing ── */
  $('csv-clear').click(); await tick();
  const N = total();
  for (let i = 0; i < N; i++) { const c = cur(); key(c.item.text).click(); await tick(); await tick(); }
  ok($('g-complete').classList.contains('show') && $('c-attempts').textContent === String(N) + '' && $('c-accuracy').textContent === '100%', 'perfect run → complete screen: ' + $('c-attempts').textContent + ' attempts, ' + $('c-accuracy').textContent);
  ok(P.isComplete('lookalikes'), 'completion recorded for the home-page ✓');
  $('retry-btn').click();
  ok(!$('g-complete').classList.contains('show') && total() === 40, 'Practice Again starts a new session');

  /* ── nothing to practice ── */
  w.eval('BUILTIN.splice(0, BUILTIN.length)'); G().start();
  ok(total() === 0 && /No lookalike groups/.test($('kb-area').textContent), 'no cards → a helpful message, no crash');
  h.done();
})();
