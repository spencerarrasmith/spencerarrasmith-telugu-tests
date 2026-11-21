const h = require('./harness')('alphabet/02_diacritics.html');
const { w, d, tick, ok, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const D = w.TeluguData, P = w.TeluguProgress;
const kb     = k => [...d.querySelectorAll(`#kb-area button.kb-btn[data-kind="${k}"]`)];
const groups = () => d.querySelectorAll('#kb-area .kb-group').length;
const labels = () => [...d.querySelectorAll('#kb-area .kb-label')].map(x => x.textContent);
const mode   = () => d.querySelector('#kb-area .gkb').dataset.mode;
const faces  = (page, i) => [...d.querySelectorAll(`#kb-area .gkb-${page} > .kb-row`)[i].children].map(b => (b.classList.contains('gkb-off') ? '·' : '') + b.textContent).join(' ');
const chOf   = ipa => w.eval(`CONSONANTS.find(c => c.ipa === ${JSON.stringify(ipa)}).ch`);     // the letter a consonant key stands for
const syl    = () => d.querySelector('#kb-area .gkb').classList.contains('syl');
const btn    = (k, ipa) => kb(k).find(b => b.dataset.ipa === ipa);
const clickBox = id => $(id).click();
const inject = (cIpa, vIpa) => w.eval(`(()=>{const c=CONSONANTS.find(x=>x.ipa==='${cIpa}'),v=VOWELS.find(x=>x.ipa==='${vIpa}');GameCore.current.put({c,v,glyph:c.ch+v.sign,cat:c.cat,rare:c.rare||v.rare});})()`);
const cur = () => G().current;
const KA = 'క', KH = 'kʰ', AA = 'aː', II = 'iː';
(async () => {
  ok(!$('group-kb').checked && $('cat-badge').style.visibility === 'hidden' && d.querySelectorAll('#kb-area .kb-label').length === 0, 'not grouped to begin with: the Telugu keyboard\'s layout, no label on the card');
  $('group-kb').click();                                    // on for the rest of this suite, which is mostly about the grouped keyboard
  /* ── the swap button ── */
  ok($('rev-btn') && $('rev-btn').textContent === '🔀' && $('rev-btn').getAttribute('aria-pressed') === 'false', 'swap button present (same 🔀 as Phonemes)');
  ok($('rev-btn').closest('#setup') && !d.querySelector('.g-header .rev-btn') && $('setup-dir').textContent === 'Diacritics → IPA', 'it is in the session popup, next to the direction, and no longer in the header');
  ok($('g-title').textContent === 'Diacritics → IPA' && !d.querySelector('.kb-btn.te') && !$('tel-char').classList.contains('ipa-face'), 'forward: IPA keys, Telugu syllable on the card');

  /* ── switch ── */
  const fwdDeck = G().deck.length;
  h.flip();
  ok($('g-title').textContent === 'IPA → Diacritics' && $('setup-dir').textContent === 'IPA → Diacritics' && $('rev-btn').getAttribute('aria-pressed') === 'true', 'title and button state flip');
  ok(G().completed === 0 && G().deck.length === 51 && G().total === 51 && fwdDeck === 51, 'a fresh round starts (51 cards)');
  const cons = kb('c'), vows = kb('v');
  ok(cons.length === 35 && cons.every(b => b.classList.contains('te') && b.textContent === chOf(b.dataset.ipa)), 'consonant keys: 35 Telugu letters');
  ok(cons[0].textContent === 'క' && cons.at(-1).textContent === 'క్ష', 'grouped by place, in alphabet order (క … క్ష)');
  ok(vows.length === 17 && vows.every(b => b.classList.contains('te') && b.classList.contains('sign') && !b.textContent.includes(KA)), 'vowel keys: 17 bare signs, no consonant');
  ok(btn('v', AA).textContent === 'ా' && btn('v', II).textContent === 'ీ' && btn('v', '∅').textContent === '్' && vows.some(b => b.textContent === 'ం') && vows.some(b => b.textContent === 'ః'), 'e.g. ా ీ, the virama ్, and ం ః on their own');
  ok(btn('v', 'ɐ').textContent === '\u25CC' && /no sign/.test(btn('v', 'ɐ').getAttribute('aria-label')), 'the "no sign" key is ◌, with an accessible name');
  ok(!/[A-Za-z]/.test(cons.concat(vows).map(b => b.textContent).join('')), 'no IPA left on any key');
  ok(groups() === 13 && labels().join() === 'Short · long,Diphthong,Vocalic,Nasal · aspirate,Pure consonant,Velar,Palatal,Retroflex,Dental,Labial,Approx.,Fricative,Conjunct' && !labels().includes('Vowels'), 'groups: the signs by type, then the consonants by place (' + labels().join('/') + ')');
  ok([...d.querySelectorAll('#kb-area .kb-group')[0].querySelectorAll('.kb-btn')].map(b => b.textContent).join(' ') === '◌ ా ి ీ ు ూ ె ే ొ ో', 'reversed, the sign keys pair up the same way: ◌ ా · ి ీ · ు ూ · ె ే · ొ ో');
  $('group-kb').click();
  ok(mode() === 'layout' && faces('letters', 0) === '్ ా ి ీ ు ూ ృ ౄ ె ే' && faces('letters', 1) === 'ై ొ ో ౌ ం ః క ఖ గ ఘ' && faces('digits', 2).startsWith('ఞ ·◌ఁ ◌ క్ష'),
    'laid out: each sign where its vowel sits (్ on అ, the key Gboard turns into ్), ◌ (no sign) and క్ష on the second page: ' + faces('letters', 0));
  $('group-kb').click();

  /* ── the card ── */
  inject('k', AA);
  ok($('tel-char').classList.contains('ipa-face') && $('tel-char').textContent === '/kaː/', 'card shows the sound: ' + $('tel-char').textContent);
  ok($('cat-badge').textContent === 'Velar + Long' && $('cat-badge').style.visibility === '', 'category label still shown, for the consonant and the vowel: "Velar + Long"');
  inject('k', '∅'); ok($('tel-char').textContent === '/k/', 'pure consonant is just /k/');
  inject('k', 'ɐ'); ok($('tel-char').textContent === '/kɐ/', 'no sign: /kɐ/');
  inject(KH, 'au'); ok($('tel-char').style.fontSize !== '' && $('tel-char').style.fontSize !== '5rem', 'longer sounds step down a size (' + $('tel-char').style.fontSize + ')');

  /* ── right answer ── */
  inject('k', AA);
  btn('c', 'k').click();
  const sc = $('slot-c').querySelector('.slot-val');
  ok(sc.textContent === 'క' && sc.classList.contains('te') && $('slot-c').classList.contains('filled') && btn('c', 'k').classList.contains('sel'), 'consonant pick shows in its slot in Telugu');
  // "Keyboard shows syllables" (on unless turned off in Settings): with క picked, each sign key shows the syllable it makes
  ok(syl() && btn('v', AA).textContent === 'కా' && btn('v', II).textContent === 'కీ' && btn('v', 'ɐ').textContent === 'క' && btn('v', '∅').textContent === 'క్' && btn('v', 'ɐm').textContent === 'కం',
    'with క picked the sign keys show the syllables they make: కా కీ, క (no sign), క్, కం');
  ok(kb('c').every(b => b.textContent === chOf(b.dataset.ipa)), 'the consonant keys keep their letters');
  clickBox('group-kb');
  ok(btn('c', 'k').classList.contains('sel') && sc.textContent === 'క' && mode() === 'layout' && labels().length === 0 && btn('v', AA).textContent === 'కా', 'laying the keyboard out mid-round keeps the pick, and the syllables');
  clickBox('group-kb');
  btn('v', AA).click();
  ok(!syl() && btn('v', AA).textContent === 'ా', 'once answered, the sign keys are bare again');
  ok($('slot-v').querySelector('.slot-val').textContent === 'ా', 'vowel pick shows as its key (ా)');
  ok($('char-card').classList.contains('correct') && $('feedback').textContent.trim() === '✓  కా' && $('feedback').classList.contains('te'), 'right: ✓ and the syllable revealed in Telugu: ' + $('feedback').textContent.trim());
  await tick(); await tick();
  ok(G().completed === 1, 'counted');

  /* ── wrong answer ── */
  inject('k', AA);
  const n0 = G().deck.length;
  btn('c', KH).click(); btn('v', II).click();
  ok($('char-card').classList.contains('wrong') && $('feedback').textContent.trim() === '✗  ఖీ' && $('feedback').classList.contains('err') && $('feedback').classList.contains('te'), 'wrong: ✗ and the syllable that was picked (ఖ + ీ), not the answer (కా): ' + $('feedback').textContent.trim());
  ok(btn('c', KH).classList.contains('err') && btn('v', II).classList.contains('err') && btn('c', 'k').classList.contains('ok') && btn('v', AA).classList.contains('ok'), 'wrong keys red, right keys green (both panels)');
  ok($('slot-c').classList.contains('err') && $('slot-v').classList.contains('err'), 'both slots red');
  const m = P.misses().find(x => x.game === 'diacritics-reverse');
  ok(m && m.key === 'కా' && m.ask === 'sound' && m.syllable === true && m.note === 'Long' && h.shown(m).prompt === '/kaː/' && h.shown(m).answer === 'కా', 'miss logged as its own game, asked by sound: ' + (m && `${h.shown(m).prompt} → ${h.shown(m).answer}`));
  ok(!P.misses().some(x => x.game === 'diacritics'), 'and not mixed into forward misses');
  await tick(); await tick();
  ok(G().deck.length === n0 && G().deck.some(x => x.glyph === 'కా') && $('slot-c').querySelector('.slot-val').textContent === '–', 'card re-queued; slots clear');

  /* the syllables follow the consonant picked, and go with it */
  inject('k', AA);
  btn('c', 'ɡ').click(); ok(btn('v', AA).textContent === 'గా', 'గ picked: గా');
  btn('c', 'kʂ').click(); ok(btn('v', AA).textContent === 'క్షా', 'క్ష picked instead: క్షా');
  clickBox('group-kb'); d.querySelector('#kb-area .gkb-back').click();
  ok(!syl() && btn('v', AA).textContent === 'ా' && !$('slot-c').classList.contains('filled'), '⌫ takes the consonant back: the sign keys are bare again');
  btn('v', AA).click(); ok(btn('v', AA).textContent === 'ా' && !syl(), 'a sign picked first shows no syllables (there is no consonant yet)');
  btn('c', 'k').click(); await tick(); await tick();
  clickBox('group-kb');

  /* only one half right */
  inject('k', AA);
  btn('c', 'k').click(); btn('v', II).click();
  ok(btn('c', 'k').classList.contains('ok') && !btn('c', 'k').classList.contains('err') && btn('v', II).classList.contains('err') && btn('v', AA).classList.contains('ok') && $('slot-c').classList.contains('ok') && $('slot-v').classList.contains('err'), 'consonant right + vowel wrong marks each half separately');
  await tick(); await tick();

  /* the no-sign key works as an answer */
  inject('k', 'ɐ');
  btn('c', 'k').click(); btn('v', 'ɐ').click();
  ok($('char-card').classList.contains('correct') && $('feedback').textContent.trim() === '✓  క' && $('slot-v').querySelector('.slot-val').textContent === '\u25CC', 'the no-sign key is accepted for క: ' + $('feedback').textContent.trim());
  await tick(); await tick();

  /* ── the grouping carries over ── */
  clickBox('group-kb');
  ok(mode() === 'layout' && labels().length === 0 && kb('c').length === 35 && kb('c').every(b => b.classList.contains('te')), 'unchecking "Group keyboard phonetically": the layout, still Telugu');
  clickBox('group-kb');

  /* ── back to forward ── */
  h.flip();
  ok($('g-title').textContent === 'Diacritics → IPA' && $('rev-btn').getAttribute('aria-pressed') === 'false' && !d.querySelector('#kb-area button.kb-btn.te') && kb('c')[0].textContent === 'k' && !$('tel-char').classList.contains('ipa-face') && G().completed === 0, 'back: IPA keys, syllable on the card, fresh round');
  inject('k', AA); btn('c', 'k').click();
  ok($('slot-c').querySelector('.slot-val').textContent === 'k' && !$('slot-c').querySelector('.slot-val').classList.contains('te'), 'slots back to IPA');
  ok(!syl() && btn('v', AA).textContent === 'aː', 'forward, the sign keys are sounds, and stay sounds when a consonant is picked');
  btn('v', AA).click(); await tick(); await tick();
  ok($('feedback').textContent === '' && !$('feedback').classList.contains('te'), 'feedback reset');

  /* ── finish a whole round in reverse ── */
  h.flip();
  let g = 0;
  while (!$('g-complete').classList.contains('show') && g++ < 400) { const c = cur(); btn('c', c.c.ipa).click(); btn('v', c.v.ipa).click(); await tick(); await tick(); }
  ok($('g-complete').classList.contains('show') && G().completed === 51 && $('c-accuracy').textContent === '100%', 'reverse round completes (51 cards, 100%)');
  ok($('c-sub').textContent === 'All 51 sounds correctly written as Telugu syllables.', 'complete text names the direction');
  { const r = P.runs('diacritics').at(-1); ok(r && r.ok === G().completed && r.tries === G().attempts && r.n === G().total && r.end === 'done' && r.dir === 'reverse' && !('isComplete' in P), 'the reverse session is recorded for the Profile page as reversed'); }
  h.again();
  ok(!$('g-complete').classList.contains('show') && $('g-title').textContent === 'IPA → Diacritics' && kb('c')[0].classList.contains('te'), 'Practice Again stays in reverse');

  /* ── "Keyboard shows syllables" off (Settings): the sign keys stay bare ── */
  { const g = require('./harness')('alphabet/02_diacritics.html', { storage: { 'telugu.settings.v1': JSON.stringify({ notation: 'ipa', syllables: 'off' }) } });
    g.$('group-kb').click(); g.flip();
    g.w.eval(`(()=>{const c=CONSONANTS.find(x=>x.ipa==='k'),v=VOWELS.find(x=>x.ipa==='aː');GameCore.current.put({c,v,glyph:c.ch+v.sign,cat:c.cat});})()`);
    const b = (k, ipa) => [...g.d.querySelectorAll(`#kb-area button.kb-btn[data-kind="${k}"]`)].find(x => x.dataset.ipa === ipa);
    b('c', 'k').click();
    ok(b('v', AA).textContent === 'ా' && !g.d.querySelector('#kb-area .gkb').classList.contains('syl'), 'with "Keyboard shows syllables" off in Settings, picking క leaves the sign keys bare (ా)'); }
  h.done();
})().catch(e => { console.error(e); process.exit(1); });
