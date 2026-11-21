// Diacritics: its options, and its keyboard. One keyboard holds the consonants and the vowel signs: laid out as the
// Telugu keyboard (each sign where its vowel sits), or with "Group keyboard phonetically" in labeled groups.
// ⌫ takes back the half of the answer picked so far.
const h = require('./harness')('alphabet/02_diacritics.html');
const { w, d, tick, ok, front, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const kb     = k => [...d.querySelectorAll(`#kb-area button.kb-btn[data-kind="${k}"]`)];
const groups = () => d.querySelectorAll('#kb-area .kb-group').length;
const labels = () => d.querySelectorAll('#kb-area .kb-label').length;
const mode   = () => d.querySelector('#kb-area .gkb').dataset.mode;
const backs  = () => [...d.querySelectorAll('#kb-area .gkb-back')];
const backOn = () => backs().map(b => !b.disabled).join();
const clickBox = id => $(id).click();
const btn = (kind, ipa) => kb(kind).find(b => b.dataset.ipa === ipa);
const inject = (cIpa, vSign) => { w.eval(`(()=>{const c=CONSONANTS.find(x=>x.ipa==='${cIpa}'),v=VOWELS.find(x=>x.sign==='${vSign}');GameCore.current.put({c,v,glyph:c.ch+v.sign,cat:c.cat,rare:c.rare||v.rare});})()`); };
(async () => {
  /* ── the options: in the session popup ── */
  ok(!d.querySelector('.g-controls') && !d.querySelector('.g-controls-sep') && !d.querySelector('.cat-toggle'), 'the old controls bar is gone');
  ok(!$('menu-btn') && !$('opts-menu') && !$('menu-wrap'), 'no ⋮ menu on this page');
  ok([...d.querySelectorAll('#setup .menu-opt')].map(l => l.textContent.trim()).join('|') === 'Group keyboard phonetically|Missed guesses reappear', 'the checkboxes are in the session popup, in order');
  ok(!$('group-kb').checked && $('missed-again').checked, 'defaults: not grouped; "Missed guesses reappear" on');
  ok($('setup').hidden && G().total === 51, 'the suite starts in a session with the defaults (the harness pressed Start)');

  /* ── laid out, or grouped ── */
  ok(mode() === 'layout' && groups() === 0 && labels() === 0 && $('cat-badge').style.visibility === 'hidden', 'to begin with: the Telugu keyboard\'s layout, and the card has no category label');
  ok(kb('c').length === 35 && kb('v').length === 17 && d.querySelectorAll('#kb-area .gkb-letters button.kb-btn[data-ipa]').length === 35 + 17 - 3, 'all 35 consonants and 17 signs are keys, all but three (ఞ, క్ష, ∅) on the first page');
  clickBox('group-kb');
  ok(mode() === 'grouped' && groups() === 13 && labels() === 13 && $('cat-badge').style.visibility === '', 'checked: thirteen labeled groups (five of signs, eight of consonants); the card label shown');
  ok(!d.querySelector('#kb-area .gkb-off, #kb-area .gkb-page') && backs().length === 0, 'grouped, only the game\'s keys: nothing dimmed, no pages, no ⌫');
  clickBox('group-kb');
  ok(mode() === 'layout' && labels() === 0 && kb('c').length === 35 && kb('v').length === 17 && $('cat-badge').style.visibility === 'hidden', 'unchecked: the layout again, every key still there (35 + 17), the card label hidden');
  front(x => true); ok($('cat-badge').style.visibility === 'hidden', 'and it stays hidden on the next card');

  /* a half-made answer survives the keyboard being redrawn */
  inject('k', 'ా');
  btn('c', 'k').click();
  ok(btn('c', 'k').classList.contains('sel') && $('slot-c').classList.contains('filled'), 'consonant picked (pending)');
  clickBox('group-kb');
  ok(btn('c', 'k').classList.contains('sel') && $('slot-c').querySelector('.slot-val').textContent === 'k', 'grouping mid-round keeps the pending pick');
  clickBox('group-kb');
  ok(btn('c', 'k').classList.contains('sel') && backOn() === 'true,true', 'and so does going back to the layout, ⌫ on as before');
  btn('v', 'aː').click();
  ok($('char-card').classList.contains('correct'), '…and the round completes normally');
  await tick(); await tick();

  /* ── ⌫ takes back the half picked so far ── */
  inject('k', 'ా');
  ok(backs().length === 2 && backs().every(b => b.tagName === 'BUTTON' && b.textContent === '⌫') && backOn() === 'false,false', '⌫, on both pages, is a key of the game\'s: off before anything is picked');
  btn('v', 'aː').click();
  ok(backOn() === 'true,true' && $('slot-v').classList.contains('filled'), 'on once a vowel sign is picked (either half can come first)');
  backs()[0].click();
  ok(!$('slot-v').classList.contains('filled') && !d.querySelector('#kb-area .kb-btn.sel') && backOn() === 'false,false' && !$('char-card').classList.contains('wrong'), '⌫ takes it back: the slot empties, no key stays marked, ⌫ is off again, nothing is judged');
  btn('c', 'kʰ').click(); backs()[1].click();
  ok(!$('slot-c').classList.contains('filled') && !btn('c', 'kʰ').classList.contains('sel'), 'the consonant too (with the ⌫ on the second page)');
  btn('c', 'k').click(); btn('v', 'aː').click();
  ok($('char-card').classList.contains('correct') && backOn() === 'false,false', 'then the right pair: correct, and ⌫ off while the answer shows');
  await tick(); await tick();
  ok(backOn() === 'false,false', 'and still off on the next card, until a pick');
  ok(G().completed === 2 && G().total === 51, 'nothing ⌫ took back counted as an answer');

  /* a wrong pair: the right keys lit, ⌫ off */
  inject('k', 'ా');
  btn('c', 'kʰ').click(); btn('v', 'aː').click();
  ok($('char-card').classList.contains('wrong') && btn('c', 'k').classList.contains('ok') && btn('c', 'kʰ').classList.contains('err') && backOn() === 'false,false', 'wrong answer: the right key lit green; ⌫ off');
  await tick(); await tick();

  for (let i = 0; i < 6; i++) clickBox('group-kb');
  ok(kb('c').length === 35 && kb('v').length === 17 && mode() === 'layout', 'rapid toggling leaves a complete keyboard (35 + 17)');
  ok(G().current && G().total === 51, 'game state untouched by option changes (51 cards)');
  h.done();
})();
