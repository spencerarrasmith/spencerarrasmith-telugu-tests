const h = require('./harness')('alphabet/03_conjuncts.html');
const { w, d, tick, ok, front, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const kb     = () => [...d.querySelectorAll('.kb-btn')];
const groups = () => d.querySelectorAll('#kb-area .kb-group').length;
const labels = () => d.querySelectorAll('#kb-area .kb-label').length;
const order  = () => kb().map(b => b.dataset.ipa).join('|');
const alpha  = () => w.eval('keys.map(x => x.ipa)').join('|');
const same   = (a, b) => a.split('|').sort().join() === b.split('|').sort().join();
const clickBox = id => $(id).click();
const pointerdown = el => el.dispatchEvent(new w.Event('pointerdown', { bubbles: true }));
const btn = ipa => kb().find(b => b.dataset.ipa === ipa);
const cur = () => G().current;
const inject = g => w.eval(`(()=>{const i=CLUSTERS.findIndex(c=>c.glyph==='${g}');GameCore.current.put(CLUSTERS[i]);})()`);
(async () => {
  /* ── the ⋮ menu ── */
  ok(!d.querySelector('.g-controls') && !d.querySelector('.g-controls-sep') && !d.querySelector('.cat-toggle'), 'the old controls bar is gone');
  ok($('menu-btn').closest('.g-right') && $('menu-btn').closest('.g-right').parentElement.classList.contains('g-header-top') && $('menu-btn').closest('.g-right').lastElementChild === $('menu-wrap'), '⋮ is the last item of the header: top right');
  ok([...d.querySelectorAll('#opts-menu .menu-opt')].map(l => l.textContent.replace(/Off while keyboard is shuffled/, '').trim()).join('|') === 'Show categories|Shuffle keyboard|Include uncommon clusters', 'menu items, in order');
  ok($('show-cat').checked && !$('shuffle-kb').checked && !$('include-uncommon').checked, 'defaults: categories on, shuffle + uncommon off');
  ok($('opts-menu').hidden, 'menu starts closed');
  $('menu-btn').click(); ok(!$('opts-menu').hidden && $('menu-btn').getAttribute('aria-expanded') === 'true', '⋮ opens it');
  clickBox('include-uncommon'); clickBox('include-uncommon');
  ok(!$('opts-menu').hidden, 'checking boxes keeps it open');
  pointerdown($('kb-area')); ok($('opts-menu').hidden, 'tapping outside closes it');
  $('menu-btn').click(); d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok($('opts-menu').hidden && d.activeElement === $('menu-btn'), 'Escape closes it, focus back on ⋮');
  $('menu-btn').click();

  /* ── show / hide categories ── */
  ok(groups() > 1 && labels() === groups(), 'grouped by default, every block labeled');
  clickBox('show-cat');
  ok(groups() === 1 && labels() === 0 && kb().length === 34 && order() === alpha(), 'unchecked: one unlabeled block, all 34 keys, alphabet order');
  ok($('cat-badge').style.visibility === 'hidden', 'card category label hidden');
  front(x => true); ok($('cat-badge').style.visibility === 'hidden', 'and stays hidden on the next card');
  clickBox('show-cat');
  ok(groups() > 1 && labels() === groups() && $('cat-badge').style.visibility === '', 'checked again: regrouped, label back');

  /* a half-made answer survives the keyboard being rebuilt */
  inject('జ్ఞ');
  const parts = cur().parts.map(p => p.ipa);
  btn(parts[0]).click();
  ok($('slots').children[0].querySelector('.slot-val').textContent === parts[0], 'first consonant placed');
  clickBox('show-cat');
  ok($('slots').children[0].querySelector('.slot-val').textContent === parts[0] && !!btn(parts[1]), 'flattening mid-round keeps the slot');
  btn(parts[1]).click();
  ok($('char-card').classList.contains('correct'), '…and the round completes normally');
  await tick(); await tick();
  clickBox('show-cat');

  /* ── shuffle keyboard ── */
  clickBox('shuffle-kb');
  ok($('shuffle-kb').checked && !$('show-cat').checked && $('show-cat').disabled && $('show-cat').closest('.menu-opt').classList.contains('disabled') && !$('cat-note').hidden, 'Shuffle forces categories off, holds the box, shows the note');
  ok(groups() === 1 && labels() === 0 && $('cat-badge').style.visibility === 'hidden', 'flat, unlabeled, card label hidden');
  const A = order();
  ok(kb().length === 34 && same(A, alpha()) && A !== alpha(), 'same 34 keys, random order');
  $('show-cat').dispatchEvent(new w.Event('change')); ok(order() === A, 'the order is stable within a round');
  clickBox('show-cat'); ok(!$('show-cat').checked, 'a disabled "Show categories" ignores taps');
  /* play on the shuffled keyboard */
  inject('జ్ఞ');
  const p = cur().parts.map(x => x.ipa);
  btn('k').click(); btn('k').click();
  ok($('char-card').classList.contains('wrong') && btn(p[0]).classList.contains('ok') && btn(p[1]).classList.contains('ok'), 'wrong answer: right keys lit green on the shuffled keyboard');
  ok(order() === A, 'the keyboard did not reshuffle mid-round');
  await tick(); await tick();
  inject('జ్ఞ'); btn(p[0]).click(); btn(p[1]).click();
  ok($('char-card').classList.contains('correct'), 'right answer on the shuffled keyboard');
  await tick(); await tick();
  G().start();
  ok(order() !== A && same(order(), alpha()), 'a new round reshuffles');
  clickBox('include-uncommon');
  ok(kb().length === 35 && groups() === 1 && !!btn('ɽ'), 'uncommon checked: ఱ joins the shuffled keyboard (35)');
  clickBox('include-uncommon');
  ok(kb().length === 34, '…and leaves again');

  /* ── un-shuffle ── */
  clickBox('shuffle-kb');
  ok(!$('shuffle-kb').checked && !$('show-cat').disabled && $('cat-note').hidden && !$('show-cat').closest('.menu-opt').classList.contains('disabled'), 'unchecking Shuffle frees the categories box');
  ok(!$('show-cat').checked && groups() === 1 && order() === alpha(), 'categories stay off; keys back in alphabet order');
  clickBox('show-cat'); ok(groups() > 1 && labels() === groups(), 'checking categories regroups');
  clickBox('shuffle-kb'); clickBox('shuffle-kb'); clickBox('show-cat'); clickBox('show-cat');
  ok(kb().length === 34, 'rapid toggling leaves a complete keyboard');
  ok(G().total === 40, 'game state untouched by option changes (40 cards)');
  h.done();
})();
