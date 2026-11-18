const { SITE_DIR } = require('./config');
const { JSDOM } = require('jsdom'); const fs = require('fs');
const dir = (SITE_DIR + '/');
const html = fs.readFileSync(dir + 'review.html', 'utf8').replace(/<link[^>]*>/g, '').replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>' + fs.readFileSync(require('path').resolve(dir, require('path').dirname('review.html'), src), 'utf8') + '</script>');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/review.html' });
const w = dom.window, d = w.document; let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const P = w.TeluguProgress, $ = s => d.querySelector(s), click = s => $(s).click();
(async () => {
  ok($('.rv-empty h2').textContent === 'Nothing to review', 'empty state when there are no misses');
  P.miss({ game: 'phonemes', key: 'క', prompt: 'క', answer: '/k/', note: 'Velar' });
  P.miss({ game: 'phonemes', key: 'ఖ', prompt: 'ఖ', answer: '/kʰ/', note: 'Velar' });
  P.miss({ game: 'diacritics', key: 'కా', prompt: 'కా', answer: '/kaː/', note: 'Long' });
  await new Promise(r => setTimeout(r, 5));
  ok($('#rv-total') && $('#rv-total').textContent === '3', 'overview refreshes live when a game records a miss');
  ok([...d.querySelectorAll('.rv-game')].map(g => g.querySelector('.name').textContent + ':' + g.querySelector('.count').textContent).join() === 'Phonemes:2,Diacritics:1', 'per-game counts with friendly names');

  // review only Diacritics: show → got it
  $('[data-game="diacritics"]').click();
  ok($('#rv-prompt').textContent === 'కా' && !$('#rv-got') && !!$('#rv-show'), 'card shows the prompt, answer hidden');
  click('#rv-show');
  ok($('#rv-answer').textContent.includes('/kaː/') && $('#rv-got') && $('#rv-again'), 'answer revealed with Again / Got it');
  click('#rv-got');
  ok($('.rv-empty h2').textContent === 'Round complete' && P.misses().find(m => m.key === 'కా').streak === 1, 'one Got it: round ends, streak 1, item still listed');
  ok(P.missCount() === 3, 'nothing cleared after only one pass');
  click('#rv-back');

  // second pass clears it
  $('[data-game="diacritics"]').click(); click('#rv-show'); click('#rv-got');
  ok(P.missCount() === 2 && [...d.querySelectorAll('.stat b')][1].textContent === '1', 'second Got it in a row clears the item (summary: 1 cleared)');
  click('#rv-back');
  ok(!$('[data-game="diacritics"]'), 'cleared game disappears from the list');

  // Again re-queues until Got it
  $('#rv-all').click();
  const first = $('#rv-prompt').textContent;
  click('#rv-show'); click('#rv-again');
  ok($('.rv-meta').textContent.includes('0 of 2') && !!$('#rv-show'), 'Again keeps the item in the round (still 0 of 2)');
  let guard = 0, seen = [];
  while ($('#rv-show') && guard++ < 20) { seen.push($('#rv-prompt').textContent); click('#rv-show'); click('#rv-got'); }
  ok($('.rv-empty h2').textContent === 'Round complete' && seen.includes(first), 'round finishes once every item gets a Got it');
  ok([...d.querySelectorAll('.stat b')][2].textContent === '1', 'summary counts the "again" tap');
  ok(P.misses().every(m => m.streak === 1), 'again reset the streak; got-it after counts 1');
  click('#rv-back');

  // keyboard
  $('#rv-all').click();
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  ok(!!$('#rv-got'), 'Space reveals the answer');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  ok(d.querySelector('.rv-meta') ? $('.rv-meta').textContent.includes('1 of 2') : true, '→ grades "Got it"');
  while ($('#rv-show')) { click('#rv-show'); click('#rv-got'); }
  click('#rv-back');

  ok(P.missCount() === 0 && $('.rv-empty h2').textContent === 'Nothing to review', 'keyboard-driven passes cleared the last two items → empty state');
  P.miss({ game: 'phonemes', key: 'క', prompt: 'క', answer: '/k/' }); P.miss({ game: 'phonemes', key: 'ఖ', prompt: 'ఖ', answer: '/kʰ/' });
  // Clear list: two taps
  click('#rv-clear'); ok($('#rv-clear').textContent.includes('Tap again') && P.missCount() > 0, 'Clear list asks for a second tap');
  click('#rv-clear'); ok(P.missCount() === 0 && $('.rv-empty h2').textContent === 'Nothing to review', 'second tap clears everything');

  // names come from units.js: a `review` name, else the tile's title, else the id tidied up
  P.miss({ game: 'grammar-nouns', key: 'a', prompt: 'a', answer: 'b' });
  ok($('.rv-game .name').textContent === 'Nouns: gender & number', 'a unit with a tile is listed under its tile title');
  P.clearMisses(); P.miss({ game: 'made_up-game', key: 'a', prompt: 'a', answer: 'b' });
  ok($('.rv-game .name').textContent === 'Made up game', 'a game id with no tile still gets a readable label');
  ok(!/const LABELS/.test(fs.readFileSync(dir + 'review.html', 'utf8')) && !!w.TeluguUnits, 'Review keeps no name list of its own (it reads units.js)');
  P.clearMisses();
  // long (3+ glyph) prompts shrink
  P.miss({ game: 'conjuncts', key: 'క్ష', prompt: 'క్ష', answer: '/kʂa/' });
  d.querySelector('[data-game="conjuncts"]').click(); ok($('#rv-prompt').classList.contains('long'), 'three-glyph prompt uses the smaller size');
  while ($('#rv-show')) { click('#rv-show'); click('#rv-got'); } click('#rv-back');
  P.clearMisses(); P.miss({ game: 'phonemes-reverse', key: 'ఖ', prompt: '/kʰ/', answer: 'ఖ', note: 'Velar' });
  ok($('.rv-game .name').textContent === 'Phonemes (IPA → Telugu)', 'Review labels the reverse game "Phonemes (IPA → Telugu)"');
  d.querySelector('[data-game="phonemes-reverse"]').click(); click('#rv-show');
  ok($('.fc .prompt').textContent === '/kʰ/' && $('#rv-answer').textContent.includes('ఖ'), 'reverse card replays as /kʰ/ → ఖ');

  /* ── a miss about a character is stored as the character and drawn here, in the current notation ── */
  const mk = (notation, progress) => { const pre = (notation ? `localStorage.setItem('telugu.settings.v1', '{"notation":"${notation}"}');` : '') + (progress ? `localStorage.setItem('telugu.progress.v1', ${JSON.stringify(JSON.stringify(progress))});` : '');
    const win = new JSDOM(html.replace('<head>', '<head><script>' + pre + '</script>'), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/review.html' }).window;
    const q = s => win.document.querySelector(s);
    const play = game => { q(`[data-game="${game}"]`).click(); const note = q('.fc .cat') ? q('.fc .cat').textContent : ''; const prompt = q('.fc .prompt').textContent; q('#rv-show').click(); const answer = q('#rv-answer').textContent; q('#rv-again').click(); while (q('#rv-show')) { q('#rv-show').click(); q('#rv-got').click(); } q('#rv-back').click(); return prompt + ' → ' + answer + (note ? ' [' + note + ']' : ''); };
    return { win, q, play, P: win.TeluguProgress, names: () => [...win.document.querySelectorAll('.rv-game .name')].map(n => n.textContent).sort().join(' | ') }; };
  const fill = P => {
    P.miss({ game: 'phonemes', key: 'క', ask: 'telugu', note: 'Velar' });
    P.miss({ game: 'phonemes-reverse', key: 'ఖ', ask: 'sound', note: 'Velar' });
    P.miss({ game: 'diacritics', key: 'క', ask: 'telugu', syllable: true, note: 'Short' });
    P.miss({ game: 'diacritics-reverse', key: 'కం', ask: 'sound', syllable: true, note: 'Nasal · aspirate' });
    P.miss({ game: 'conjuncts', key: 'జ్ఞ', ask: 'telugu', syllable: true, note: 'Palatal + Nasal' });
    P.miss({ game: 'conjuncts-reverse', key: 'క్ష', ask: 'sound', syllable: true, note: 'Velar + Fricative' });
    P.miss({ game: 'lookalikes', key: 'వు', ask: 'sound', note: 'Among వు పు' });
    P.miss({ game: 'grammar-nouns', key: 'boy', prompt: 'boy', answer: 'అబ్బాయి' });
  };
  const A = mk(null); fill(A.P); await new Promise(r => setTimeout(r, 5));
  ok(A.play('phonemes') === 'క → /k/ [Velar]' && A.play('phonemes-reverse') === '/kʰ/ → ఖ [Velar]', 'IPA: a Phonemes miss replays as క → /k/, the reverse as /kʰ/ → ఖ');
  ok(A.play('diacritics') === 'క → /ka/ [Short]' && A.play('diacritics-reverse') === '/kã/ → కం [Nasal · aspirate]', 'IPA: Diacritics misses read the character as a syllable (క → /ka/, not /k/)');
  ok(A.play('conjuncts') === 'జ్ఞ → /dʒɲa/  ·  usually said /ɡɲa/ [Palatal + Nasal]' && A.play('conjuncts-reverse') === '/kʂa/ → క్ష [Velar + Fricative]', 'IPA: Conjuncts misses, with the spoken note; క్ష is /kʂa/');
  ok(A.play('lookalikes') === '/ʋu/ → వు [Among వు పు]' && A.play('grammar-nouns') === 'boy → అబ్బాయి', 'IPA: a Lookalikes miss; a lesson\'s text miss is shown as stored');
  ok(A.names() === 'Conjuncts | Conjuncts (IPA → Conjuncts) | Diacritics | Diacritics (IPA → Diacritics) | Lookalikes (IPA → Telugu) | Nouns: gender & number | Phonemes | Phonemes (IPA → Telugu)', 'IPA: game names');

  const B = mk('iso'); fill(B.P); await new Promise(r => setTimeout(r, 5));
  ok(B.play('phonemes') === 'క → ka [Velar]' && B.play('phonemes-reverse') === 'kha → ఖ [Velar]', 'ISO: the same misses replay as క → ka and kha → ఖ, with no slashes');
  ok(B.play('diacritics') === 'క → ka [Short]' && B.play('diacritics-reverse') === 'kaṁ → కం [Nasal · aspirate]', 'ISO: Diacritics misses (ka, kaṁ)');
  ok(B.play('conjuncts') === 'జ్ఞ → jña  ·  usually said /ɡɲa/ [Palatal + Nasal]' && B.play('conjuncts-reverse') === 'kṣa → క్ష [Velar + Fricative]', 'ISO: Conjuncts misses (jña, kṣa); "usually said" stays IPA');
  ok(B.play('lookalikes') === 'vu → వు [Among వు పు]' && B.play('grammar-nouns') === 'boy → అబ్బాయి', 'ISO: Lookalikes (vu); a lesson\'s text miss is unchanged');
  ok(B.names() === 'Conjuncts | Conjuncts (ISO → Conjuncts) | Diacritics | Diacritics (ISO → Diacritics) | Lookalikes (ISO → Telugu) | Nouns: gender & number | Phonemes | Phonemes (ISO → Telugu)', 'ISO: game names say ISO');
  B.q('[data-game="conjuncts-reverse"]').click();
  ok(B.q('#rv-prompt').classList.contains('long') && !/\//.test(B.q('#rv-prompt').textContent), 'ISO: a long prompt still takes the smaller size');

  /* ── a store written before this change (IPA text) is converted, then follows the notation too ── */
  const V1 = { v: 1, done: {}, misses: {
    'phonemes|క':           { game: 'phonemes', key: 'క', prompt: 'క', answer: '/k/', note: 'Velar', count: 2, streak: 0, last: 3 },
    'diacritics-reverse|కా': { game: 'diacritics-reverse', key: 'కా', prompt: '/kaː/', answer: 'కా', note: 'Long', count: 1, streak: 0, last: 2 },
    'conjuncts|క్ష':         { game: 'conjuncts', key: 'క్ష', prompt: 'క్ష', answer: '/kʂa/', note: 'Velar + Fricative', count: 1, streak: 0, last: 1 },
  } };
  const C = mk('iso', V1), E = mk(null, V1);
  ok(C.play('phonemes') === 'క → ka [Velar]' && C.play('diacritics-reverse') === 'kā → కా [Long]' && C.play('conjuncts') === 'క్ష → kṣa [Velar + Fricative]', 'old misses, read in ISO: క → ka, kā → కా, క్ష → kṣa');
  ok(E.play('phonemes') === 'క → /k/ [Velar]' && E.play('diacritics-reverse') === '/kaː/ → కా [Long]' && E.play('conjuncts') === 'క్ష → /kʂa/ [Velar + Fricative]', 'old misses, read in IPA: exactly what they showed before');
  ok(JSON.parse(C.win.localStorage.getItem('telugu.progress.v1')).v === 2, 'the old store is now version 2');

  /* ── a character the app can no longer read ── */
  const F = mk(null); F.P.miss({ game: 'phonemes', key: 'zz', ask: 'telugu' });
  await new Promise(r => setTimeout(r, 5));
  ok(F.play('phonemes') === 'zz → This character is no longer in the app.', 'a stored character that can\'t be read any more says so and can still be cleared');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
