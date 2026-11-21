// The Words game (alphabet/04_words.html): a whole Telugu word on the card, its meaning above it, spelled out
// one sound at a time. Each pick is one answer. A wrong pick is one mistake and ends that character: play goes
// on with the next one. A word that took a mistake comes back later, like a missed card in the other games.
const load = require('./harness');
const fs = require('fs'), path = require('path'), { SITE_DIR } = require('./config');
const PAGE = 'alphabet/04_words.html';
const HEARTS = { none: '❤️×♾️', two: '\u{1F90D}\u{1F9E1}', one: '\u{1F9E1}', out: '⭕' };

// What a page under test offers, the same for every part of this suite
function tools(h) {
  const { w, d, $ } = h, G = h.game, W = w.TeluguWords;
  const keys  = () => [...d.querySelectorAll('#kb-area button.kb-btn[data-ipa]')];      // the game's keys (not ౧౨౩, not the dimmed ones)
  const keyOf = p => keys().find(b => b.dataset.kind === p.kind && b.dataset.ipa === p.key);
  const parts = () => G().current.syllables.flatMap(s => s.parts);
  const want  = () => parts()[[...d.querySelectorAll('.sp-slot')].findIndex(b => b.classList.contains('cur'))];      // the sound being asked for
  const right = () => keyOf(want()).click();
  const wrong = (kind = 'c', ipa = null) => { const p = want(); (ipa ? keys().find(b => b.dataset.ipa === ipa) : keys().find(b => b.dataset.kind === kind && b.dataset.ipa !== p.key)).click(); };
  // the row under the card: boxes grouped by character; ! the missed sound, ~ a sound that was never asked
  const spell = () => [...d.querySelectorAll('.sp-syl')].map(g => [...g.children].map(b => (b.textContent || '_') + (b.classList.contains('slip') ? '!' : b.classList.contains('skip') ? '~' : '')).join(' ')).join(' | ');
  // the word on the card: [the character being spelled] {a missed one}
  const card  = () => [...d.querySelectorAll('#tel-char .syl')].map(e => (e.classList.contains('now') ? '[' + e.textContent + ']' : e.classList.contains('miss') ? '{' + e.textContent + '}' : e.textContent)).join('');
  const put   = te => G().put(W.get(te));
  const slide = (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event('input', { bubbles: true })); };
  const fb    = () => $('feedback').textContent;
  return { G, W, P: w.TeluguProgress, keys, keyOf, want, right, wrong, spell, card, put, slide, fb };
}

(async () => {
  /* ══ the popup the page opens with ══ */
  const first = load(PAGE, { setup: 'open' }), ok = first.ok;            // one tally for every page this suite opens
  {
    const { w, d, $ } = first, { G, W, slide } = tools(first);
    ok(d.title === 'Words' && $('g-title').textContent === 'Words → IPA' && !$('setup').hidden && $('setup-title').textContent === 'Words', 'the page is "Words → IPA" and opens with the session popup');
    const rows = [...$('setup').querySelectorAll('.setup-label, .setup-opt .menu-txt > span:first-child')].map(e => e.textContent).join(' | ');
    ok(rows === 'Number of rounds | Game over | Group keyboard phonetically | Highlight correct answer | Missed guesses reappear', 'its options, in order: ' + rows);
    ok(!$('setup-dir-row') && !$('rev-btn') && !d.querySelector('.menu-btn') && !$('opts-menu'), 'the game plays one way (word → sounds): no direction row, no 🔀, and no ⋮ menu');
    ok($('setup-rounds').value === '20' && $('setup-rounds').max === '250' && $('setup-rounds-n').value === '20' && $('setup-misses-out').textContent === 'Unlimited',
      'a session is 20 words by default, of the 250 in the list; no game over');
    ok(!$('group-kb').checked && $('highlight-correct').checked && $('missed-again').checked && !$('show-cat') && !$('shuffle-kb'), 'highlight and "Missed guesses reappear" on; not grouped (no "Show categories" or "Shuffle keyboard")');
    ok(G().total === 20 && G().deck.every(c => W.words.includes(c)) && new Set(G().deck).size === 20, 'behind the popup 20 different words are already dealt');
    slide('setup-rounds', 250); $('setup-start').click();
    ok($('setup').hidden && G().total === 250 && new Set(G().deck.map(c => c.te)).size === 250, 'the rounds slider at its top end deals every word, each once');
  }

  /* ══ the keyboards ══ */
  const h = load(PAGE), { w, d, $, tick } = h, { G, W, P, keys, keyOf, want, right, wrong, spell, card, put, slide, fb } = tools(h);
  const D = w.TeluguData, N = D.notation;
  {
    const faces = (page, n) => [...d.querySelectorAll(`#kb-area .gkb-${page} > .kb-row`)[n].children].map(b => (b.classList.contains('gkb-off') ? '·' : '') + b.textContent).join(' ');
    const cons = () => keys().filter(b => b.dataset.kind === 'c'), vows = () => keys().filter(b => b.dataset.kind !== 'c');
    ok(!d.querySelector('.kb-cols, .kb-col, .kb-col-title, .kb-pair') && d.querySelector('#kb-area .gkb').dataset.mode === 'layout' && keys().length === 50, 'one keyboard, laid out as the Telugu keyboard: 50 keys');
    ok(faces('letters', 0) === 'ɐ aː i iː u uː ru ruː e eː' && faces('letters', 1) === 'ai o oː au ṁ ◌ʰ k kʰ ɡ ɡʱ' && faces('letters', 4) === 'j ɾ l ʋ ɭ ʃ ʂ s ɦ ·⌫' && faces('digits', 2).startsWith('ɲ ·◌ఁ ·@'),
      'each vowel sound where its vowel sits, ం (ṁ, whichever nasal it is said as) and ః on a dotted circle on theirs, each consonant on its letter (ఞ on the second page); ⌫ dimmed: ' + faces('letters', 1));
    ok(cons().map(b => b.dataset.ipa).sort().join(' ') === D.pool(D.consonants, false).map(c => c.ipa).sort().join(' ') && cons().length === 34 && cons().every(b => b.textContent === b.dataset.ipa) && !keys().some(b => b.dataset.ipa === 'kʂ' || b.dataset.ipa === 'ɽ'),
      'the 34 usual consonants, each key its sound; క్ష has no key of its own (it is k, then ʂ), nor has ఱ');
    ok(vows().map(b => b.textContent).join(' ') === 'ɐ aː i iː u uː ru ruː e eː ai o oː au ṁ ◌ʰ' && vows().map(b => b.dataset.kind).join('') === 'vvvvvvvvvvvvvvmm', 'the 14 vowel sounds and the two marks: ' + vows().map(b => b.textContent).join(' '));
    ok(vows().slice(-2).map(b => b.getAttribute('aria-label')).join() === 'anusvara (ం),visarga (ః)' && !keys().some(b => b.dataset.ipa === '∅' || b.textContent === '∅'), 'the two marks are named for a screen reader; there is no "no vowel" key');
    $('group-kb').click();
    const labels = () => [...d.querySelectorAll('#kb-area .kb-label')].map(e => e.textContent).join(' | ');
    ok(labels() === 'Short · long | Diphthong | Vocalic | Nasal · aspirate | Velar | Palatal | Retroflex | Dental | Labial | Approx. | Fricative' && keys().length === 50 && [...d.querySelectorAll('#kb-area .kb-group')][0].textContent.includes('ɐaːiiːuuːeeːooː'),
      '"Group keyboard phonetically" groups the keys, each long vowel beside its short one: ' + labels());
    const before = G().current;
    $('group-kb').click();
    ok(d.querySelector('#kb-area .gkb').dataset.mode === 'layout' && keys().length === 50 && G().current === before, 'and unchecked lays them out again, without restarting the word');
  }

  /* ══ the card ══ */
  put('పుస్తకం');
  {
    const area = d.querySelector('.card-area');
    ok($('word-en').textContent === 'book' && [...area.children].map(e => e.id).join() === 'word-en,char-card,spell,feedback', 'the meaning is above the card ("book"); under the card, the row of sounds, then the feedback line');
    ok($('tel-char').textContent === 'పుస్తకం' && [...d.querySelectorAll('#tel-char .syl')].map(e => e.textContent).join('|') === 'పు|స్త|కం' && $('tel-char').dataset.n === '3', 'the word, one span to a character (పు · స్త · కం), sized by how many it has');
    ok(card() === '[పు]స్తకం' && d.querySelectorAll('#tel-char .syl.now').length === 1, 'the first character is the one highlighted: ' + card());
    ok(spell() === '_ _ | _ _ _ | _ _ _' && d.querySelectorAll('.sp-slot.cur').length === 1 && d.querySelector('.sp-syl.now .sp-slot.cur') === d.querySelector('.sp-slot'), 'a box for every sound, grouped by character; the first is the one asked for: ' + spell());
    ok(fb() === 'Pick each sound of the highlighted character, in order' && $('feedback').classList.contains('hint'), 'until the first pick the line under the card says what to do');
    ok(!d.querySelector('.cat-badge') && !d.querySelector('.rare-badge'), 'the card has no category label: nothing on it hints at the answer');
    put('ధన్యవాదాలు'); ok($('tel-char').dataset.n === '5' && $('word-en').textContent === 'thanks' && d.querySelectorAll('.sp-slot').length === 11, 'the longest word: five characters, eleven sounds');
    put('ఈ'); ok($('tel-char').dataset.n === '1' && d.querySelectorAll('.sp-slot').length === 1 && $('word-en').textContent === 'this', 'the shortest: one character, one sound');
  }

  /* ══ spelling a word ══ */
  put('పుస్తకం');
  const a0 = G().attempts, m0 = G().misses, c0 = G().completed;
  right(); right(); right();
  ok(card() === 'పు[స్త]కం' && spell() === 'p u | s _ _ | _ _ _' && G().attempts === a0 + 3 && G().misses === m0 && !G().locked && fb() === '', 'right picks fill the boxes, in order, and the highlight moves to the next character: ' + card() + '  ' + spell());
  ok(d.querySelectorAll('.kb-btn.ok, .kb-btn.err').length === 0 && !$('char-card').classList.contains('correct'), 'a right pick leaves no mark on the keyboard or the card: only the box');
  wrong('c', 'k');
  ok(G().misses === m0 + 1 && G().attempts === a0 + 4, 'a wrong pick is one answer and one mistake');
  ok(fb() === '✗  /k/' && $('feedback').classList.contains('err') && $('char-card').classList.contains('wrong'), 'the line under the card says what was picked, never the answer: ' + fb());
  ok(card() === 'పు{స్త}కం' && !d.querySelector('.sp-slot.cur'), 'that character is over: it turns red in the word, and nothing is asked while the pick is showing: ' + card());
  ok(spell() === 'p u | s t̪! ɐ~ | _ _ _', 'with "Highlight correct answer" its boxes show what it spells: the missed sound marked, the rest never asked: ' + spell());
  ok(keyOf({ kind: 'c', key: 'k' }).classList.contains('err') && keyOf({ kind: 'c', key: 't̪' }).classList.contains('ok') && d.querySelectorAll('.kb-btn.ok, .kb-btn.err').length === 2, 'the key pressed turns red and the right key is lit');
  { const a = G().attempts; keyOf({ kind: 'c', key: 'k' }).click(); keyOf({ kind: 'v', key: 'ɐ' }).click();
    ok(G().locked && G().attempts === a && G().misses === m0 + 1, 'picks made while it is showing are ignored'); }
  $('group-kb').click();
  ok(keyOf({ kind: 'c', key: 'k' }).classList.contains('err') && keyOf({ kind: 'c', key: 't̪' }).classList.contains('ok'), 'the two marks survive the keyboard being redrawn (an option changed)');
  $('group-kb').click();
  await tick();
  ok(card() === 'పు{స్త}[కం]' && !G().locked && fb() === '' && d.querySelectorAll('.kb-btn.ok, .kb-btn.err').length === 0 && d.querySelector('.sp-slot.cur') && !$('char-card').classList.contains('wrong'),
    'then play goes on with the next character; the marks are gone, the missed character stays red: ' + card());
  const deck0 = G().deck.length;
  right(); right(); right();
  ok(G().locked && fb() === '✗  2 of 3 characters right' && $('char-card').classList.contains('wrong') && spell() === 'p u | s t̪! ɐ~ | k ɐ m', 'at the end of a word that took a mistake the line says how much of it was right: ' + fb());
  ok(G().completed === c0 && G().deck.length === deck0 && G().deck[0].te !== 'పుస్తకం' && G().deck.some(c => c.te === 'పుస్తకం') && G().attempts === a0 + 7 && G().misses === m0 + 1,
    'the word is not cleared: it goes back into the deck, to come up again later (seven answers, one mistake)');
  await tick();
  ok(JSON.stringify(P.misses().map(m => [m.game, m.key, m.ask, m.note, m.count])) === '[["words","పుస్తకం","word","book",1]]' && !('prompt' in P.misses()[0]) && !('answer' in P.misses()[0]),
    'it is filed for Review as the word itself, with its meaning as the note');
  ok(h.shown(P.misses()[0]).prompt === 'పుస్తకం' && h.shown(P.misses()[0]).answer === '/pust̪ɐkɐm/', 'Review will show the word and ask for its sound: ' + h.shown(P.misses()[0]).answer);

  /* a mistake on the last character ends the word at once */
  put('అమ్మ'); right(); wrong('c', 'k');
  ok(G().locked && card() === 'అ{మ్మ}' && fb() === '✗  /k/  ·  1 of 2 characters right' && spell() === 'ɐ | m! m~ ɐ~', 'missing the last character ends the word: what was picked, then the tally: ' + fb());
  await tick();
  /* two mistakes in one word are filed once; a word costs at most one mistake a character */
  put('పుస్తకం'); const m1 = G().misses;
  wrong('c', 'k'); await tick(); wrong('c', 'k'); await tick(); wrong('c', 'p');
  ok(G().misses === m1 + 3 && fb() === '✗  /p/  ·  0 of 3 characters right' && card() === '{పు}{స్త}{కం}' && spell() === 'p! u~ | s! t̪~ ɐ~ | k! ɐ~ m~', 'every character missed: three mistakes, and no more than that: ' + spell());
  await tick();
  ok(P.misses().find(m => m.key === 'పుస్తకం').count === 2 && P.missCount() === 2, 'a word is filed once each time it is played, however many mistakes it took');

  /* without the highlight, nothing gives the answer */
  $('highlight-correct').click();
  put('అమ్మ'); wrong('v', 'i');
  ok(spell() === '✗! | _ _ _' && d.querySelectorAll('.kb-btn.ok').length === 0 && keyOf({ kind: 'v', key: 'i' }).classList.contains('err') && fb() === '✗  /i/', '"Highlight correct answer" off: a ✗ in the box and no key lit: ' + spell());
  await tick(); right(); wrong('c', 'k');
  ok(spell() === '✗! | m ✗! ·~' && !/ɐ/.test(spell().split('|')[1].replace('m', '')), 'the sounds never asked show a dot, not what they are: ' + spell());
  await tick();
  $('highlight-correct').click();

  /* a clean word */
  const dealt = () => G().deck.filter(c => c.te === 'పక్షి').length, had = dealt();      // the 20 dealt at random may hold పక్షి already
  put('పక్షి'); const c1 = G().completed, a1 = G().attempts;
  for (let i = 0; i < 4; i++) right();
  ok(card() === 'ప[క్షి]' && spell() === 'p ɐ | k ʂ _', 'క్షి asks for k, then ʂ, then i: ' + spell());
  right();
  ok(fb() === '✓  /pɐkʂi/' && $('feedback').classList.contains('ok') && $('char-card').classList.contains('correct') && card() === 'పక్షి' && G().locked, 'a word spelled without a mistake: the card turns green and the line gives its sound: ' + fb());
  await tick();
  ok(G().completed === c1 + 1 && G().attempts === a1 + 5 && $('s-done').textContent === String(c1 + 1) && dealt() === had, 'it is cleared: one more correct, five answers');

  /* ── ం: its own key, or the nasal it is said as ── */
  { const nasal = ipa => keyOf({ kind: 'c', key: ipa }), mark = () => keyOf({ kind: 'm', key: D.signs.find(g => g.sign === '\u0C02').ipa });      // ṁ, ం's own key
    const spellTo = n => { for (let i = 0; i < n; i++) right(); };
    await tick();
    const ms = G().misses;
    put('కొంచెం'); spellTo(2);
    ok(want().kind === 'm' && want().sound === 'ɲ', 'కొంచెం: after k o the ం of కొం is asked; it is said ɲ (before చ)');
    nasal('ɲ').click();
    ok(G().misses === ms && fb() === '', 'the ɲ key answers it: no mistake');
    ok(card() === 'కొం[చెం]' && spell().startsWith('k o ɲ |'), 'the box shows the nasal it is said as: ' + spell());
    spellTo(2); nasal('m').click();
    ok(fb() === '✓  /koɲtʃem/' && $('char-card').classList.contains('correct'), 'the last ం, at the end of the word, is answered by m: ✓ /koɲtʃem/');
    await tick();
    put('బంగారం'); spellTo(2); mark().click();
    ok(card() === 'బం[గా]రం', 'its own key (ṁ) still answers it (బం, said bɐŋ)');
    spellTo(4); nasal('m').click(); await tick();
    put('పండు'); spellTo(2); nasal('ɳ').click(); ok(card() === 'పం[డు]', 'పండు: ɳ (before డ)');
    spellTo(2); await tick();
    put('సంతోషం'); spellTo(2); nasal('n').click(); ok(card() === 'సం[తో]షం', 'సంతోషం: n (before త)');
    spellTo(5); await tick();
    put('సింహం'); spellTo(2); nasal('m').click(); ok(card() === 'సిం[హం]', 'సింహం: m (before హ, as at the end of a word)');
    spellTo(3); await tick();
    const m0 = G().misses;
    put('పండు'); spellTo(2); nasal('n').click();
    ok(G().misses === m0 + 1 && fb() === '✗  /n/' && nasal('n').classList.contains('err') && nasal('ɳ').classList.contains('ok') && mark().classList.contains('ok') && d.querySelectorAll('.kb-btn.ok').length === 2,
      'the wrong nasal (n before డ) is a mistake; both right keys are lit, ṁ and ɳ');
    await tick(); await tick();
    put('అమ్మ'); right(); const before = G().misses; mark().click();
    ok(G().misses === before + 1, 'ṁ answers only ం: the m of అమ్మ, written with మ, is not answered by it');
    await tick(); await tick(); }
  ok(/okMs:\s*800/.test(fs.readFileSync(path.join(SITE_DIR, PAGE), 'utf8')) && /errMs:\s*1500/.test(fs.readFileSync(path.join(SITE_DIR, PAGE), 'utf8')), 'a finished word stays up 0.8 s; a wrong pick shows for 1.5 s');

  /* every word in the list can be spelled on these keyboards */
  {
    let bad = []; const m2 = G().misses;
    for (const wd of W.words) {
      G().put(wd);
      for (let i = 0; i < wd.sounds; i++) right();
      if (fb() !== '✓  ' + N.wrap(N.word(wd.syllables)) || !$('char-card').classList.contains('correct')) bad.push(wd.te);
      await tick();
    }
    ok(bad.length === 0 && G().misses === m2, 'all 250 words can be spelled, key by key, to a ✓ ' + bad.slice(0, 8).join(' '));
  }

  /* ══ game over, in the middle of a word ══ */
  h.setup(() => { slide('setup-misses', 2); slide('setup-rounds', 3); });
  put('పుస్తకం');
  ok(G().limit === 2 && $('s-lives').textContent === HEARTS.two && G().total === 3, '3 words, game over at 2: two hearts');
  wrong('c', 'k'); await tick();
  ok($('s-lives').textContent === HEARTS.one && !G().over && card() === '{పు}[స్త]కం', 'one mistake: one heart left, and on to the next character');
  right(); wrong('c', 'k');
  ok(G().over && G().locked && $('s-lives').textContent === HEARTS.out && $('s-lives').classList.contains('out') && !$('g-complete').classList.contains('show'), 'the second mistake is game over, there and then: ⭕');
  await tick();
  ok($('g-complete').classList.contains('show') && $('c-title').textContent === 'Game Over' && $('c-sub').textContent === '0 of 3 cleared. Game over at 2 mistakes.' && $('c-attempts').textContent === '3' && $('c-accuracy').textContent === '33%' && $('c-errors').textContent === '2',
    'the complete screen: "' + $('c-sub').textContent + '" · 3 answers, 33%, 2 errors (the numbers count sounds, not words)');
  { const r = P.runs('words').at(-1);
    ok(P.runs('words').length === 1 && r.n === 3 && r.ok === 0 && r.tries === 3 && r.miss === 2 && r.end === 'out' && !('dir' in r), 'the session is recorded: 3 words, none cleared, 3 answers, 2 of them wrong: ' + JSON.stringify(r)); }

  /* ══ "Missed guesses reappear" unchecked ══ */
  $('retry-btn').click();
  ok(!$('setup').hidden && $('setup-misses').value === '2' && $('setup-rounds').value === '3', '"Practice Again" opens the popup with the last session\'s choices');
  slide('setup-misses', $('setup-misses').max); $('missed-again').click(); slide('setup-rounds', 2); $('setup-start').click();
  ok(G().total === 2 && !G().again && G().limit === null && $('s-lives').textContent === HEARTS.none, '2 words; missed words do not come back; no game over (❤️×♾️)');
  {
    const one = G().current; wrong(want().kind);
    if (one.syllables.length > 1) { await tick(); while (G().current === one && !G().locked) right(); }
    await tick();
    ok(G().dropped === 1 && G().deck.length === 1 && G().current !== one && $('s-rem').textContent === '1' && $('s-done').textContent === '0', 'a word that took a mistake is dropped: it is not shown again');
    const n2 = G().current.sounds; for (let i = 0; i < n2; i++) right(); await tick();
    ok($('g-complete').classList.contains('show') && $('c-title').textContent === 'Session Complete!' && $('c-sub').textContent === '1 of 2 correct. The 1 missed was not shown again.' && $('c-errors').textContent === '1' && +$('c-attempts').textContent === G().attempts,
      'the session ends when every word has been shown once: ' + $('c-sub').textContent);
    const r = P.runs('words').at(-1);
    ok(r.n === 2 && r.ok === 1 && r.miss === 1 && r.tries === G().attempts && r.tries > 2 && r.end === 'done', 'recorded with its own count of wrong answers (answers are sounds, cards are words): ' + JSON.stringify(r));
  }
  /* a whole clean session */
  $('retry-btn').click(); $('missed-again').click(); slide('setup-rounds', 4); $('setup-start').click();
  { let sounds = 0; while (!$('g-complete').classList.contains('show')) { sounds += G().current.sounds; const n = G().current.sounds; for (let i = 0; i < n; i++) right(); await tick(); }
    ok($('c-sub').textContent === 'All 4 words spelled out, sound by sound.' && $('c-accuracy').textContent === '100%' && $('c-errors').textContent === '0' && +$('c-attempts').textContent === sounds, 'four clean words: ' + $('c-sub').textContent + ' ' + sounds + ' answers, 100%');
    const r = P.runs('words').at(-1); ok(r.n === 4 && r.ok === 4 && r.tries === sounds && r.miss === 0 && r.end === 'done', 'recorded: 4 of 4 words, ' + sounds + ' answers, none wrong'); }

  /* ══ in ISO ══ */
  {
    const i = load(PAGE, { notation: 'iso' }), t = tools(i), $i = i.$;
    const row = n => [...i.d.querySelectorAll('#kb-area .gkb-letters > .kb-row')][n].textContent.length && [...[...i.d.querySelectorAll('#kb-area .gkb-letters > .kb-row')][n].children].map(b => b.textContent).join(' ');
    ok($i('g-title').textContent === 'Words → ISO' && row(0) === 'a ā i ī u ū r̥ r̥̄ e ē' && row(1) === 'ai o ō au ṁ ḥ k kh g gh' && row(2).startsWith('ṅ c ch j jh ṭ'), 'for a reader who chose ISO: "Words → ISO", keys in ISO, ం and ః as ṁ and ḥ');
    t.put('పుస్తకం'); t.right(); t.right(); t.right(); t.wrong('c', 'k');
    ok(t.fb() === '✗  k' && t.spell() === 'p u | s t! a~ | _ _ _', 'a wrong pick is named without slashes, and the boxes are in ISO: ' + t.fb() + '  ' + t.spell());
    await i.tick(); t.put('కొంచెం'); for (let n = 0; n < 6; n++) t.right();
    ok(t.fb() === '✓  koṁceṁ' && t.spell() === 'k o ṁ | c e ṁ', 'a finished word gives its ISO spelling: ' + t.fb());
    await i.tick(); t.put('కొంచెం'); t.right(); t.right(); t.keyOf({ kind: 'c', key: 'ɲ' }).click();
    ok(t.keyOf({ kind: 'c', key: 'ɲ' }).textContent === 'ñ' && t.spell().startsWith('k o ṁ |') && t.card() === 'కొం[చెం]', 'in ISO the ñ key answers the ం of కొం too; its box shows it as written (ṁ)');
    for (let n = 0; n < 3; n++) t.right();
    await i.tick(); t.put('పక్షి'); t.wrong('c', 'k'); await i.tick();
    ok(i.shown(t.P.misses().find(m => m.key === 'పక్షి')).answer === 'pakṣi', 'and Review will show the missed word in ISO: pakṣi');
  }

  /* ══ the page keeps to the app's conventions ══ */
  {
    const src = fs.readFileSync(path.join(SITE_DIR, PAGE), 'utf8');
    ok(/const GAME\s*=\s*'words'/.test(src) && /GameSetup\.create\(\{/.test(src) && !/direction:/.test(src.split('GameSetup.create({')[1].split('});')[0]), 'its sessions and misses are kept under the tile id "words"; the popup is given no direction');
    ok(!/\.ipa\b(?!\s*===)[^;\n]*textContent|['"`]\/['"`]\s*\+/.test(src) && /N\.wrap\(/.test(src) && /N\.piece\(/.test(src) && /N\.word\(/.test(src), 'sounds are written through TeluguData.notation, never by hand');
    ok(/game\.step\(true\)/.test(src) && /game\.step\(false,/.test(src) && /game\.judge\(missed\.size === 0, \{ counted: true/.test(src) && !/setTimeout|setInterval/.test(src), 'each pick goes through game.step(), the finished word through game.judge(); the page times nothing itself');
  }
  first.done();
})();
