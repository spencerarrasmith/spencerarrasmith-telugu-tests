const h = require('./harness')('alphabet/05_lookalikes.html');
const { w, d, tick, ok, $ } = h;
const fs = require('fs');
const CSV = fs.readFileSync(require('path').join(__dirname, 'fixtures', 'telugu_lookalikes_groups.csv'), 'utf8');
const cur = () => w.eval('deck[0]');
const keys = () => [...d.querySelectorAll('.kb-btn')];
const key = t => keys().find(b => b.dataset.text === t);
const total = () => w.eval('total');
const front = text => w.eval(`(()=>{let i=deck.findIndex(c=>c.item.text==='${text}');if(i<0){const c=buildCards([].concat($('use-builtin').checked?[BUILTIN]:[],$('use-custom').checked?[custom]:[]),$('include-extra').checked).find(c=>c.item.text==='${text}');if(!c)throw new Error('no card ${text}');deck.unshift(c);}else deck.unshift(deck.splice(i,1)[0]);renderCard();})()`);
const upload = (text, name = 'mine.csv') => new Promise(res => { w.eval('onFile').call(null, new w.File([text], name, { type: 'text/csv' })); setTimeout(res, 30); });
(async () => {
  /* ── built-in baseline ── */
  ok($('use-builtin').checked && !$('use-custom').checked && $('use-custom').disabled, 'built-in groups on; "My CSV groups" off and disabled until uploaded');
  ok($('shuffle-kb').checked && !$('include-extra').checked, 'choices shuffled by default; extras off');
  ok(total() === 40 && w.eval('deck.every(c => c.item.core)'), 'baseline: 40 cards (every character of the 12 groups), none extra');
  let c0 = cur();
  ok(/^\/.+\/$/.test($('tel-char').textContent) && $('tel-char').textContent === `/${c0.item.ipa}/`, 'card shows the sound as /ipa/: ' + $('tel-char').textContent);
  ok(keys().length === c0.options.length && $('cat-badge').textContent === `${c0.options.length} lookalikes`, 'choices = the whole group (' + keys().length + ')');
  ok(keys().every(b => b.classList.contains('te')), 'choices are Telugu keys');

  /* ── right / wrong ── */
  front('ఒ');
  ok($('tel-char').textContent === '/o/' && w.eval('cur=deck[0]').options.map(o => o.text).sort().join('') === ['ఒ', 'ఓ', 'బ', 'ఙ'].sort().join(''), 'ఒ card: /o/ among ఒ ఓ బ ఙ');
  key('బ').click();
  ok($('char-card').classList.contains('wrong') && key('బ').classList.contains('err') && key('ఒ').classList.contains('ok') && $('feedback').textContent.trim() === '✗  ఒ' && $('feedback').classList.contains('te'), 'wrong pick: red, right answer green, ✗ + the glyph');
  const P = w.TeluguProgress, m = P.misses().find(x => x.game === 'lookalikes');
  ok(m && m.key === 'ఒ' && m.prompt === '/o/' && m.answer === 'ఒ' && /Among/.test(m.note) && /బ/.test(m.note), 'miss logged as its own game: ' + (m && `${m.prompt} → ${m.answer} (${m.note})`));
  const n0 = w.eval('deck.length');
  await tick(); await tick();
  ok(w.eval('deck.length') === n0 && w.eval('deck.some(c => c.item.text === "ఒ")') && !$('char-card').classList.contains('wrong'), 'card re-queued, fresh card shown');
  front('ఒ'); key('ఒ').click();
  ok($('char-card').classList.contains('correct') && $('feedback').textContent.trim() === '✓  ఒ' && w.eval('completed') === 1, 'right pick: ✓, counted');
  await tick(); await tick();

  /* ── rare pip + the sound of a syllable ── */
  front('ఙ');
  ok($('rare-badge').style.display === '' && $('tel-char').textContent === '/ŋ/', 'ఙ carries the rare pip (from telugu-data.js)');
  front('వు');
  ok($('rare-badge').style.display === 'none' && $('tel-char').textContent === '/ʋu/' && key('పు') && key('ఘ') && key('మ'), 'వు: /ʋu/ among ఘ మ వు పు, no rare pip');

  /* ── order: shuffled vs as written ── */
  front('అ');
  $('shuffle-kb').checked = false; $('shuffle-kb').dispatchEvent(new w.Event('change', { bubbles: true }));
  ok(keys().map(b => b.dataset.text).join('') === 'అఆలత', 'shuffle off: group order as written (అఆలత)');
  const seen = new Set();
  $('shuffle-kb').checked = true; $('shuffle-kb').dispatchEvent(new w.Event('change', { bubbles: true }));
  for (let i = 0; i < 25; i++) { front('అ'); seen.add(keys().map(b => b.dataset.text).join('')); }
  ok(seen.size > 1 && [...seen].every(s => [...s].sort().join('') === [...'అఆలత'].sort().join('')), 'shuffle on: many orders, always the same four (' + seen.size + ' seen)');
  front('అ'); const before = keys().map(b => b.dataset.text).join('');
  w.eval('buildKB()');
  ok(keys().map(b => b.dataset.text).join('') === before, 'order stays fixed within a card (rebuilds keep it)');

  /* ── upload your CSV ── */
  await upload('hello');
  ok($('csv-status').classList.contains('err') && /No lookalike groups/.test($('csv-status').textContent) && w.eval('custom.length') === 0 && $('use-builtin').checked, 'a file with no groups is refused with a message; nothing changes');
  await upload(CSV, 'telugu_lookalikes_groups.csv');
  ok(w.eval('custom.length') === 3 && $('use-custom').checked && !$('use-custom').disabled && !$('use-builtin').checked, 'upload: 3 groups, "My CSV groups" on, built-in switched off');
  ok(/66 characters|3 groups/.test($('custom-note').textContent) && !$('csv-clear').hidden, 'menu shows the count: ' + $('custom-note').textContent);
  ok(/Loaded 3 groups/.test($('csv-status').textContent), 'status: ' + $('csv-status').textContent.slice(0, 70) + '…');
  ok(w.eval('localStorage.getItem(STORE)') === CSV, 'CSV text remembered in the browser');
  ok(w.eval('deck.every(c => custom.some(g => g.items.includes(c.item)))') && total() === 40, 'cards now come from your groups (sampled to 40)');
  front('ఖ');
  ok(w.eval('deck[0].options.length') === 30 && !key('ఱ'), 'default: the 31-character group has its extra ఱ hidden → 30 choices');
  $('include-extra').checked = true; $('include-extra').dispatchEvent(new w.Event('change', { bubbles: true }));
  w.eval('deck.length'); front('ఖ');
  ok(w.eval('deck[0].options.length') === 31 && !!key('ఱ') && key('ఱ').classList.contains('te'), 'Include extra letters → 31 choices with ఱ');
  front('ఱ');
  ok($('rare-badge').style.display === '' && $('tel-char').textContent === '/ɽ/', 'ఱ card: /ɽ/ with the rare pip');
  front('ఙౌ');
  ok($('tel-char').textContent === '/ŋau/' && key('ఙ') && key('ఙౌ').classList.contains('long'), 'syllable ఙౌ: /ŋau/ (wide key)');
  $('include-extra').checked = false; $('include-extra').dispatchEvent(new w.Event('change', { bubbles: true }));

  /* ── sets ── */
  $('use-custom').checked = false; $('use-custom').dispatchEvent(new w.Event('change', { bubbles: true }));
  ok($('use-custom').checked, 'the last ticked set cannot be switched off');
  $('use-builtin').checked = true; $('use-builtin').dispatchEvent(new w.Event('change', { bubbles: true }));
  $('use-custom').checked = true;  $('use-custom').dispatchEvent(new w.Event('change', { bubbles: true }));
  ok(w.eval('deck.some(c => custom.some(g => g.items.includes(c.item)))') && w.eval('deck.some(c => BUILTIN.some(g => g.items.includes(c.item)))'), 'both sets on: cards from both');

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
  w.eval(`deck.unshift(buildCards([custom], false).find(c => c.item.text === 'క' && c.options.some(o => o.text === 'క్'))); renderCard();`);
  ok(w.eval('deck[0].options.length') === 2 && $('tel-char').textContent === '/k/', 'క and క్ are both /k/ (క is in two groups, so it gets two cards)');
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

  /* ── nothing to practise ── */
  w.eval('BUILTIN.splice(0, BUILTIN.length)'); w.eval('initGame()');
  ok(total() === 0 && /No lookalike groups/.test($('kb-area').textContent), 'no cards → a helpful message, no crash');
  h.done();
})();
