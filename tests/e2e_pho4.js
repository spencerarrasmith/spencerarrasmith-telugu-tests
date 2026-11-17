const h = require('./harness')('alphabet/01_phonemes.html');
const { w, d, tick, ok, front, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const D = w.TeluguData;
const vis    = () => [...d.querySelectorAll('.kb-btn')].filter(b => b.style.display !== 'none');
const groups = () => d.querySelectorAll('#kb-area .kb-group').length;
const labels = () => d.querySelectorAll('#kb-area .kb-label').length;
const order  = () => vis().map(b => b.dataset.ch).join('|');
const alpha  = D.letters.filter(l => l.core).map(l => l.ch).join('|');
const same   = (a, b) => [...a.split('|')].sort().join() === [...b.split('|')].sort().join();
const tickBox = id => $(id).click();                       // like a tap on the label
const pointerdown = el => el.dispatchEvent(new w.Event('pointerdown', { bubbles: true }));
(async () => {
  /* ── the ⋮ menu ── */
  ok(!d.querySelector('.g-controls') && !d.querySelector('.g-controls-sep'), 'the old controls bar is gone');
  ok($('menu-btn') && $('menu-btn').closest('.g-right') && $('menu-btn').closest('.g-header-top') && $('g-title').closest('.g-header-top'), 'the ⋮ button is in the header');
  ok($('menu-btn').closest('.g-header-top').lastElementChild === $('menu-btn').closest('.g-right') && $('menu-btn').closest('.g-right').lastElementChild === $('menu-wrap'), 'and it is the last item: top right');
  ok($('menu-btn').querySelectorAll('circle').length === 3 && $('menu-btn').getAttribute('aria-label') === 'Options', 'three dots, labelled "Options"');
  ok($('opts-menu').hidden && $('menu-btn').getAttribute('aria-expanded') === 'false', 'menu starts closed');
  ok([...d.querySelectorAll('#opts-menu .menu-opt')].map(l => l.textContent.replace(/Off while keyboard is shuffled/, '').trim()).join('|') === 'Show categories|Shuffle keyboard|Include extra letters|Highlight correct answer', 'menu items, in order');
  ok($('show-cat').checked && !$('shuffle-kb').checked && !$('include-extra').checked && $('highlight-correct').checked, 'defaults: categories on, highlight on, shuffle + extras off');

  $('menu-btn').click();
  ok(!$('opts-menu').hidden && $('menu-btn').getAttribute('aria-expanded') === 'true', '⋮ opens the menu');
  tickBox('highlight-correct');
  ok(!$('highlight-correct').checked && !$('opts-menu').hidden, 'a checkbox is clickable inside the menu, and the menu stays open');
  tickBox('highlight-correct');
  pointerdown($('opts-menu').querySelector('.menu-opt'));
  ok(!$('opts-menu').hidden, 'tapping inside the menu does not close it');
  pointerdown($('kb-area'));
  ok($('opts-menu').hidden && $('menu-btn').getAttribute('aria-expanded') === 'false', 'tapping outside closes it');
  $('menu-btn').click(); $('menu-btn').click();
  ok($('opts-menu').hidden, '⋮ again closes it');
  $('menu-btn').click();
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok($('opts-menu').hidden && d.activeElement === $('menu-btn'), 'Escape closes it and returns focus to ⋮');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok($('opts-menu').hidden, 'Escape with the menu closed does nothing');

  /* every option still works from the menu */
  $('menu-btn').click();
  front(x => x.ipa === 'k'); tickBox('highlight-correct');
  vis().find(b => b.dataset.ipa === 'ɡ').click();
  ok(d.querySelectorAll('.kb-btn.ok').length === 0, 'highlight option works from the menu');
  await tick(); await tick(); tickBox('highlight-correct');
  tickBox('include-extra'); ok(G().total === 54 && vis().length === 54, 'extra letters option works from the menu (54)');
  tickBox('include-extra'); ok(G().total === 51, '…and off again (51)');
  tickBox('show-cat'); ok(groups() === 1 && labels() === 0 && $('cat-badge').style.visibility === 'hidden', 'categories option works from the menu (flat, card label hidden)');
  tickBox('show-cat'); ok(groups() === 9 && labels() === 9 && $('cat-badge').style.visibility === '', '…and back');

  /* ── shuffle keyboard ── */
  ok(order() === alpha || groups() === 9, 'starts in alphabet order, grouped');
  tickBox('shuffle-kb');
  ok($('shuffle-kb').checked && !$('show-cat').checked, 'ticking Shuffle forces "Show categories" off');
  ok($('show-cat').disabled && $('show-cat').closest('.menu-opt').classList.contains('disabled') && !$('cat-note').hidden, '…and holds it there (disabled, with a note)');
  ok(groups() === 1 && labels() === 0, 'one unlabelled block');
  ok($('cat-badge').style.visibility === 'hidden', 'card category label hidden too');
  const A = order();
  ok(vis().length === 51 && same(A, alpha) && A !== alpha, 'IPA keys: all 51, same letters, random order (not alphabetical)');
  ok(vis().every(b => !b.classList.contains('te')), 'IPA face');
  $('show-cat').dispatchEvent(new w.Event('change'));        // the menu asks the page to redraw its keyboard
  ok(order() === A, 'the order is stable within a round (rebuilds keep it)');
  tickBox('highlight-correct'); tickBox('highlight-correct');
  ok(order() === A, 'toggling other options does not reshuffle');
  const done0 = G().completed;
  front(x => x.ipa === 'k'); vis().find(b => b.dataset.ipa === 'k').click();
  ok($('char-card').classList.contains('correct') && G().completed === done0 + 1, 'the shuffled keyboard plays normally');
  await tick(); await tick();
  G().start();
  const B = order();
  ok(same(B, alpha) && B !== A, 'each new round reshuffles');

  /* Telugu keyboard */
  $('rev-btn').click();
  const T = order();
  ok(vis().length === 51 && vis().every(b => b.classList.contains('te')) && same(T, alpha) && T !== alpha && groups() === 1 && labels() === 0, 'Telugu keys: shuffled too, flat, unlabelled');
  ok($('shuffle-kb').checked && $('show-cat').disabled, 'shuffle setting survives switching direction');
  $('include-extra').click();
  ok(vis().length === 54 && vis().some(b => b.dataset.ch === 'ఌ') && groups() === 1, 'extra letters join the shuffled keyboard (54)');
  $('include-extra').click();
  front(x => x.ipa === 'k'); vis().find(b => b.dataset.ch === 'క').click();
  ok($('char-card').classList.contains('correct'), 'shuffled Telugu keyboard plays too');
  await tick(); await tick();

  /* un-shuffle */
  tickBox('shuffle-kb');
  ok(!$('shuffle-kb').checked && !$('show-cat').disabled && !$('cat-note').hidden === false, 'unticking Shuffle frees the categories box');
  ok(!$('show-cat').checked && groups() === 1 && order() === alpha, 'categories stay off; keys return to alphabet order');
  ok(!$('show-cat').closest('.menu-opt').classList.contains('disabled'), 'box no longer looks disabled');
  tickBox('show-cat');
  ok(groups() === 9 && labels() === 9, 'ticking categories again regroups');
  tickBox('shuffle-kb'); tickBox('shuffle-kb'); tickBox('show-cat'); tickBox('show-cat');
  ok(true, 'rapid toggling does not throw');

  /* builder option */
  const host = d.createElement('div'); d.body.appendChild(host);
  const rev = [...D.letters].reverse();
  const flat = D.buildKeyboard(host, { grouped: false, order: rev });
  ok(flat.map(b => b.dataset.ch).join('') === rev.map(l => l.ch).join(''), 'buildKeyboard: `order` lays the flat block out in that order');
  const grp = D.buildKeyboard(host, { grouped: true, order: rev });
  ok(grp.map(b => b.dataset.ch).join('') === D.letters.map(l => l.ch).join('') && host.querySelectorAll('.kb-group').length === 9, 'buildKeyboard: `order` is ignored when grouped');
  h.done();
})();
