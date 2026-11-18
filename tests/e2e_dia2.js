const h = require('./harness')('alphabet/02_diacritics.html');
const { w, d, tick, ok, front, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const kb     = k => [...d.querySelectorAll(`.kb-col[data-kind="${k}"] .kb-btn`)];
const groups = k => d.querySelectorAll(`.kb-col[data-kind="${k}"] .kb-group`).length;
const labels = k => d.querySelectorAll(`.kb-col[data-kind="${k}"] .kb-label`).length;
const order  = k => kb(k).map(b => b.dataset.ipa).join('|');
const alpha  = k => w.eval(`keys.${k}.map(x => x.ipa)`).join('|');
const same   = (a, b) => a.split('|').sort().join() === b.split('|').sort().join();
const clickBox = id => $(id).click();
const pointerdown = el => el.dispatchEvent(new w.Event('pointerdown', { bubbles: true }));
const btn = (kind, ipa) => kb(kind).find(b => b.dataset.ipa === ipa);
const cur = () => G().current;
const inject = (cIpa, vSign) => { w.eval(`(()=>{const c=CONSONANTS.find(x=>x.ipa==='${cIpa}'),v=VOWELS.find(x=>x.sign==='${vSign}');GameCore.current.put({c,v,glyph:c.ch+v.sign,cat:c.cat,rare:c.rare||v.rare});})()`); };
(async () => {
  /* ── the ⋮ menu ── */
  ok(!d.querySelector('.g-controls') && !d.querySelector('.g-controls-sep') && !d.querySelector('.cat-toggle'), 'the old controls bar is gone');
  ok($('menu-btn').closest('.g-right') && $('menu-btn').closest('.g-right').parentElement.classList.contains('g-header-top') && $('menu-btn').closest('.g-right').lastElementChild === $('menu-wrap'), '⋮ is the last item of the header: top right');
  ok($('menu-btn').querySelectorAll('circle').length === 3 && $('menu-btn').getAttribute('aria-label') === 'Options', 'three dots, labeled "Options"');
  ok([...d.querySelectorAll('#opts-menu .menu-opt')].map(l => l.textContent.replace(/Off while keyboard is shuffled/, '').trim()).join('|') === 'Show categories|Shuffle keyboard|Include extra letters', 'menu items, in order');
  ok($('show-cat').checked && !$('shuffle-kb').checked && !$('include-extra').checked, 'defaults: categories on, shuffle + extras off');
  ok($('opts-menu').hidden && $('menu-btn').getAttribute('aria-expanded') === 'false', 'menu starts closed');
  $('menu-btn').click();
  ok(!$('opts-menu').hidden && $('menu-btn').getAttribute('aria-expanded') === 'true', '⋮ opens it');
  clickBox('include-extra'); clickBox('include-extra');
  ok(!$('opts-menu').hidden, 'checking boxes keeps it open');
  pointerdown($('kb-area')); ok($('opts-menu').hidden, 'tapping outside closes it');
  $('menu-btn').click(); d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok($('opts-menu').hidden && d.activeElement === $('menu-btn'), 'Escape closes it, focus back on ⋮');
  $('menu-btn').click();

  /* ── show / hide categories ── */
  ok(groups('c') > 1 && groups('v') > 1 && labels('c') === groups('c') && labels('v') === groups('v'), 'grouped by default: both panels labeled');
  ok($('cat-badge').style.visibility === '', 'card category label shown');
  clickBox('show-cat');
  ok(groups('c') === 1 && groups('v') === 1 && labels('c') === 0 && labels('v') === 0, 'unchecked: each panel is one unlabeled block');
  ok(kb('c').length === 35 && kb('v').length === 17, '…with every key still there (35 + 17)');
  ok(order('c') === alpha('c') && order('v') === alpha('v'), '…in alphabet order');
  ok(d.querySelectorAll('.kb-col-title').length === 2, 'the "Consonant" / "Vowel" panel titles stay');
  ok($('cat-badge').style.visibility === 'hidden', 'card category label hidden');
  front(x => true); ok($('cat-badge').style.visibility === 'hidden', 'and stays hidden on the next card');
  clickBox('show-cat');
  ok(groups('c') > 1 && labels('c') === groups('c') && $('cat-badge').style.visibility === '', 'checked again: regrouped, label back');

  /* a half-made answer survives the keyboard being rebuilt */
  inject('k', '\u0C3E');
  btn('c', 'k').click();
  ok(btn('c', 'k').classList.contains('sel') && $('slot-c').classList.contains('filled'), 'consonant picked (pending)');
  clickBox('show-cat');
  ok(btn('c', 'k').classList.contains('sel') && $('slot-c').querySelector('.slot-val').textContent === 'k', 'flattening mid-round keeps the pending pick');
  btn('v', 'aː').click();
  ok($('char-card').classList.contains('correct'), '…and the round completes normally');
  await tick(); await tick();
  clickBox('show-cat');

  /* ── shuffle keyboard ── */
  clickBox('shuffle-kb');
  ok($('shuffle-kb').checked && !$('show-cat').checked && $('show-cat').disabled && $('show-cat').closest('.menu-opt').classList.contains('disabled') && !$('cat-note').hidden, 'Shuffle forces categories off, holds the box, shows the note');
  ok(groups('c') === 1 && groups('v') === 1 && labels('c') === 0 && labels('v') === 0 && $('cat-badge').style.visibility === 'hidden', 'flat, unlabeled, card label hidden');
  const C = order('c'), V = order('v');
  ok(kb('c').length === 35 && kb('v').length === 17 && same(C, alpha('c')) && same(V, alpha('v')), 'same keys, nothing lost');
  ok(C !== alpha('c') && V !== alpha('v'), 'both panels are in a random order');
  $('show-cat').dispatchEvent(new w.Event('change')); ok(order('c') === C && order('v') === V, 'the order is stable within a round');
  clickBox('show-cat');
  ok(!$('show-cat').checked && order('c') === C, 'a disabled "Show categories" ignores taps');
  /* play on the shuffled keyboard, wrong then right */
  inject('k', '\u0C3E');
  btn('c', 'kʰ').click(); btn('v', 'aː').click();
  ok($('char-card').classList.contains('wrong') && btn('c', 'k').classList.contains('ok') && btn('c', 'kʰ').classList.contains('err'), 'wrong answer: right key lit green on the shuffled keyboard');
  ok(order('c') === C, 'the keyboard did not reshuffle mid-round');
  await tick(); await tick();
  inject('k', '\u0C3E');
  btn('c', 'k').click(); btn('v', 'aː').click();
  ok($('char-card').classList.contains('correct'), 'right answer on the shuffled keyboard');
  await tick(); await tick();
  G().start();
  ok(order('c') !== C && same(order('c'), alpha('c')), 'a new round reshuffles');
  clickBox('include-extra');
  ok(kb('c').length === 36 && kb('v').length === 19 && groups('c') === 1 && !!btn('c', 'ɽ') && !!btn('v', 'l̩'), 'extras join the shuffled keyboard (36 + 19)');
  clickBox('include-extra');
  ok(kb('c').length === 35, '…and leave again');

  /* ── un-shuffle ── */
  clickBox('shuffle-kb');
  ok(!$('shuffle-kb').checked && !$('show-cat').disabled && $('cat-note').hidden && !$('show-cat').closest('.menu-opt').classList.contains('disabled'), 'unchecking Shuffle frees the categories box');
  ok(!$('show-cat').checked && groups('c') === 1 && order('c') === alpha('c') && order('v') === alpha('v'), 'categories stay off; keys back in alphabet order');
  clickBox('show-cat');
  ok(groups('c') > 1 && labels('c') === groups('c') && groups('v') > 1, 'checking categories regroups');
  clickBox('shuffle-kb'); clickBox('shuffle-kb'); clickBox('show-cat'); clickBox('show-cat');
  ok(h.w.document.querySelectorAll('.kb-btn').length === 52, 'rapid toggling leaves a complete keyboard (35 + 17)');
  ok(cur() && G().total === 51, 'game state untouched by option changes (51 cards)');
  h.done();
})();
