const h = require('./harness')('alphabet/02_diacritics.html');
const { w, d, tick, ok, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const D = w.TeluguData, P = w.TeluguProgress;
const kb     = k => [...d.querySelectorAll(`.kb-col[data-kind="${k}"] .kb-btn`)];
const groups = k => d.querySelectorAll(`.kb-col[data-kind="${k}"] .kb-group`).length;
const labels = k => [...d.querySelectorAll(`.kb-col[data-kind="${k}"] .kb-label`)].map(x => x.textContent);
const btn    = (k, ipa) => kb(k).find(b => b.dataset.ipa === ipa);
const clickBox = id => $(id).click();
const inject = (cIpa, vIpa) => w.eval(`(()=>{const c=CONSONANTS.find(x=>x.ipa==='${cIpa}'),v=VOWELS.find(x=>x.ipa==='${vIpa}');GameCore.current.put({c,v,glyph:c.ch+v.sign,cat:c.cat,rare:c.rare||v.rare});})()`);
const cur = () => G().current;
const KA = 'క', KH = 'kʰ', AA = 'aː', II = 'iː';
(async () => {
  /* ── the swap button ── */
  ok($('rev-btn') && $('rev-btn').textContent === '🔀' && $('rev-btn').getAttribute('aria-pressed') === 'false', 'swap button present (same 🔀 as Phonemes)');
  ok($('rev-btn').parentElement === $('g-title').parentElement && $('g-title').parentElement.classList.contains('g-title-row'), 'it sits next to the title');
  ok($('g-title').textContent === 'Diacritics → IPA' && !d.querySelector('.kb-btn.te') && !$('tel-char').classList.contains('ipa-face'), 'forward: IPA keys, Telugu syllable on the card');

  /* ── switch ── */
  const fwdDeck = G().deck.length;
  $('rev-btn').click();
  ok($('g-title').textContent === 'IPA → Diacritics' && $('rev-btn').getAttribute('aria-pressed') === 'true', 'title and button state flip');
  ok(G().completed === 0 && G().deck.length === 51 && G().total === 51 && fwdDeck === 51, 'a fresh round starts (51 cards)');
  const cons = kb('c'), vows = kb('v');
  ok(cons.length === 35 && cons.every(b => b.classList.contains('te') && b.textContent === b.dataset.ch), 'consonant keys: 35 Telugu letters, from the shared keyboard');
  ok(cons[0].textContent === 'క' && cons.at(-1).textContent === 'క్ష', 'in Phonemes\' alphabet order (క … క్ష)');
  ok(vows.length === 17 && vows.every(b => b.classList.contains('te') && b.classList.contains('sign') && !b.textContent.includes(KA)), 'vowel keys: 17 bare signs, no consonant');
  ok(btn('v', AA).textContent === 'ా' && btn('v', II).textContent === 'ీ' && btn('v', '∅').textContent === '్' && vows.some(b => b.textContent === 'ం') && vows.some(b => b.textContent === 'ః'), 'e.g. ా ీ, the virama ్, and ం ః on their own');
  ok(btn('v', 'a').textContent === '\u25CC' && /no sign/.test(btn('v', 'a').getAttribute('aria-label')), 'the "no sign" key is ◌, with an accessible name');
  ok([...d.querySelectorAll('.kb-col-title')].map(x => x.textContent).join('|') === 'Consonant|Vowel sign', 'panel titles');
  ok(!/[A-Za-z]/.test(cons.concat(vows).map(b => b.textContent).join('')), 'no IPA left on any key');
  ok(d.querySelectorAll('.kb-col[data-kind="c"] .kb-label').length === groups('c') && !labels('c').includes('Vowels'), 'consonant panel: labeled by place, no stray "Vowels" group');
  ok(groups('c') === 8 && labels('v').join() === 'Short,Long,Diphthong,Vocalic,Nasal · aspirate,Pure consonant', 'groups: 8 consonant, vowels by type (' + labels('v').join('/') + ')');

  /* ── the card ── */
  inject('k', AA);
  ok($('tel-char').classList.contains('ipa-face') && $('tel-char').textContent === '/kaː/', 'card shows the sound: ' + $('tel-char').textContent);
  ok($('cat-badge').textContent === 'Velar' && $('cat-badge').style.visibility === '', 'category label still shown (consonant place)');
  inject('k', '∅'); ok($('tel-char').textContent === '/k/', 'pure consonant is just /k/');
  inject('k', 'a'); ok($('tel-char').textContent === '/ka/', 'no sign: /ka/');
  inject(KH, 'au'); ok($('tel-char').style.fontSize !== '' && $('tel-char').style.fontSize !== '5rem', 'longer sounds step down a size (' + $('tel-char').style.fontSize + ')');

  /* ── right answer ── */
  inject('k', AA);
  btn('c', 'k').click();
  const sc = $('slot-c').querySelector('.slot-val');
  ok(sc.textContent === 'క' && sc.classList.contains('te') && $('slot-c').classList.contains('filled') && btn('c', 'k').classList.contains('sel'), 'consonant pick shows in its slot in Telugu');
  clickBox('show-cat');
  ok(btn('c', 'k').classList.contains('sel') && sc.textContent === 'క' && groups('c') === 1 && labels('c').length === 0, 'flattening mid-round keeps the pick');
  clickBox('show-cat');
  btn('v', AA).click();
  ok($('slot-v').querySelector('.slot-val').textContent === 'ా', 'vowel pick shows as its key (ా)');
  ok($('char-card').classList.contains('correct') && $('feedback').textContent.trim() === '✓  కా' && $('feedback').classList.contains('te'), 'right: ✓ and the syllable revealed in Telugu: ' + $('feedback').textContent.trim());
  await tick(); await tick();
  ok(G().completed === 1, 'counted');

  /* ── wrong answer ── */
  inject('k', AA);
  const n0 = G().deck.length;
  btn('c', KH).click(); btn('v', II).click();
  ok($('char-card').classList.contains('wrong') && $('feedback').textContent.trim() === '✗  కా' && $('feedback').classList.contains('err'), 'wrong: ✗ and the right syllable shown: ' + $('feedback').textContent.trim());
  ok(btn('c', KH).classList.contains('err') && btn('v', II).classList.contains('err') && btn('c', 'k').classList.contains('ok') && btn('v', AA).classList.contains('ok'), 'wrong keys red, right keys green (both panels)');
  ok($('slot-c').classList.contains('err') && $('slot-v').classList.contains('err'), 'both slots red');
  const m = P.misses().find(x => x.game === 'diacritics-reverse');
  ok(m && m.key === 'కా' && m.ask === 'sound' && m.syllable === true && m.note === 'Long' && h.shown(m).prompt === '/kaː/' && h.shown(m).answer === 'కా', 'miss logged as its own game, asked by sound: ' + (m && `${h.shown(m).prompt} → ${h.shown(m).answer}`));
  ok(!P.misses().some(x => x.game === 'diacritics'), 'and not mixed into forward misses');
  await tick(); await tick();
  ok(G().deck.length === n0 && G().deck.some(x => x.glyph === 'కా') && $('slot-c').querySelector('.slot-val').textContent === '–', 'card re-queued; slots clear');

  /* only one half right */
  inject('k', AA);
  btn('c', 'k').click(); btn('v', II).click();
  ok(btn('c', 'k').classList.contains('ok') && !btn('c', 'k').classList.contains('err') && btn('v', II).classList.contains('err') && btn('v', AA).classList.contains('ok') && $('slot-c').classList.contains('ok') && $('slot-v').classList.contains('err'), 'consonant right + vowel wrong marks each half separately');
  await tick(); await tick();

  /* the no-sign key works as an answer */
  inject('k', 'a');
  btn('c', 'k').click(); btn('v', 'a').click();
  ok($('char-card').classList.contains('correct') && $('feedback').textContent.trim() === '✓  క' && $('slot-v').querySelector('.slot-val').textContent === '\u25CC', 'the no-sign key is accepted for క: ' + $('feedback').textContent.trim());
  await tick(); await tick();

  /* ── options carry over ── */
  clickBox('show-cat');
  ok(groups('c') === 1 && groups('v') === 1 && labels('c').length + labels('v').length === 0 && kb('c').length === 35 && kb('c').map(b => b.dataset.ch).join() === w.eval('keys.c.map(c=>c.ch)').join(), 'unchecking categories: both panels flat, Telugu alphabet order');
  clickBox('show-cat');
  clickBox('shuffle-kb');
  const A = kb('c').map(b => b.dataset.ch).join(), V = kb('v').map(b => b.dataset.ipa).join();
  ok(kb('c').length === 35 && kb('v').length === 17 && groups('c') === 1 && A !== w.eval('keys.c.map(c=>c.ch)').join() && kb('c').every(b => b.classList.contains('te')), 'shuffle: both panels random, still Telugu');
  $('show-cat').dispatchEvent(new w.Event('change')); ok(kb('c').map(b => b.dataset.ch).join() === A && kb('v').map(b => b.dataset.ipa).join() === V, 'order stable within the round');
  inject('k', AA); btn('c', 'k').click(); btn('v', AA).click();
  ok($('char-card').classList.contains('correct'), 'plays normally on the shuffled keyboard');
  await tick(); await tick();
  clickBox('shuffle-kb');
  clickBox('show-cat');
  clickBox('include-extra');
  ok(kb('c').length === 36 && !!btn('c', 'r') && kb('v').length === 19 && btn('v', 'l̩').textContent === 'ౢ' && groups('c') === 8, 'extras join: ఱ and ౢ ౣ (36 + 19)');
  clickBox('include-extra');
  ok(kb('c').length === 35 && kb('v').length === 17, '…and leave');

  /* ── back to forward ── */
  $('rev-btn').click();
  ok($('g-title').textContent === 'Diacritics → IPA' && $('rev-btn').getAttribute('aria-pressed') === 'false' && !d.querySelector('.kb-btn.te') && kb('c')[0].textContent === 'k' && !$('tel-char').classList.contains('ipa-face') && G().completed === 0, 'back: IPA keys, syllable on the card, fresh round');
  inject('k', AA); btn('c', 'k').click();
  ok($('slot-c').querySelector('.slot-val').textContent === 'k' && !$('slot-c').querySelector('.slot-val').classList.contains('te'), 'slots back to IPA');
  btn('v', AA).click(); await tick(); await tick();
  ok($('feedback').textContent === '' && !$('feedback').classList.contains('te'), 'feedback reset');

  /* ── finish a whole round in reverse ── */
  $('rev-btn').click();
  let g = 0;
  while (!$('g-complete').classList.contains('show') && g++ < 400) { const c = cur(); btn('c', c.c.ipa).click(); btn('v', c.v.ipa).click(); await tick(); await tick(); }
  ok($('g-complete').classList.contains('show') && G().completed === 51 && $('c-accuracy').textContent === '100%', 'reverse round completes (51 cards, 100%)');
  ok($('c-sub').textContent === 'All 51 sounds correctly written as Telugu syllables.', 'complete text names the direction');
  ok(P.isComplete('diacritics'), 'finishing in reverse checks off the Diacritics tile');
  $('retry-btn').click();
  ok(!$('g-complete').classList.contains('show') && $('g-title').textContent === 'IPA → Diacritics' && kb('c')[0].classList.contains('te'), 'Practice Again stays in reverse');

  /* ── shared builder: skipHidden ── */
  const host = d.createElement('div'); d.body.appendChild(host);
  const consOnly = l => l.kind !== 'vowel' && l.core;
  let bs = D.buildKeyboard(host, { face: 'telugu', visible: consOnly });
  ok(bs.some(b => b.style.display === 'none') && host.querySelectorAll('.kb-label').length === 9, 'default unchanged: hidden letters still rendered, all 9 groups kept');
  bs = D.buildKeyboard(host, { face: 'telugu', visible: consOnly, skipHidden: true });
  ok(bs.length === 35 && !bs.some(b => b.style.display === 'none') && host.querySelectorAll('.kb-label').length === 8 && ![...host.querySelectorAll('.kb-label')].some(l => l.textContent === 'Vowels'), 'skipHidden: only consonants, empty "Vowels" group dropped');
  bs = D.buildKeyboard(host, { grouped: false, visible: consOnly, skipHidden: true });
  ok(bs.length === 35 && host.querySelectorAll('.kb-group').length === 1 && host.querySelectorAll('.kb-btn').length === 35, 'skipHidden + flat: one block of 35');
  bs = D.buildKeyboard(host, { grouped: false, visible: l => l.kind === 'vowel', skipHidden: true });
  ok(bs.length === D.vowels.length && host.querySelectorAll('.kb-group').length === 1, 'skipHidden works for any subset');
  h.done();
})().catch(e => { console.error(e); process.exit(1); });
