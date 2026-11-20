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
const clickBox = id => $(id).click();                       // like a tap on the label
const pointerdown = el => el.dispatchEvent(new w.Event('pointerdown', { bubbles: true }));
(async () => {
  /* ── no ⋮ menu: every option is in the session popup ── */
  ok(!d.querySelector('.g-controls') && !d.querySelector('.g-controls-sep'), 'the old controls bar is gone');
  ok(!$('menu-btn') && !$('menu-wrap') && !$('opts-menu') && !d.querySelector('.g-header .menu-btn') && $('g-title').closest('.g-header-top') && $('g-title').closest('.g-header-top').lastElementChild.querySelector('.g-stats'), 'the header has no ⋮ button: the title, then the counters');
  ok([...d.querySelectorAll('#setup .setup-opt')].map(l => l.textContent.replace(/Off while keyboard is shuffled/, '').trim()).join('|') === 'Show categories|Shuffle keyboard|Include extra letters|Highlight correct answer|Missed guesses reappear', 'the popup holds the five checkboxes, in order');
  ok([...d.querySelectorAll('#setup .setup-opt')].every(l => l.lastElementChild.type === 'checkbox' && l.firstElementChild.classList.contains('menu-txt')), 'each is a label with its checkbox after it (at the right of the row)');
  ok($('show-cat').checked && !$('shuffle-kb').checked && !$('include-extra').checked && $('highlight-correct').checked, 'defaults: categories on, highlight on, shuffle + extras off');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok($('setup').hidden && G().total === 51, 'Escape during play does nothing');

  /* every option works from the popup */
  front(x => x.ipa === 'k'); clickBox('highlight-correct');
  vis().find(b => b.dataset.ipa === 'ɡ').click();
  ok(d.querySelectorAll('.kb-btn.ok').length === 0, 'the highlight option works');
  await tick(); await tick(); clickBox('highlight-correct');
  clickBox('include-extra'); ok(G().total === 51, 'checking "Include extra letters" does not restart the session in play');
  clickBox('include-extra');
  h.setup(() => clickBox('include-extra')); ok(G().total === 54 && vis().length === 54, 'the extra letters come in at Start (54)');
  h.setup(() => clickBox('include-extra')); ok(G().total === 51, '…and go out again (51)');
  clickBox('show-cat'); ok(groups() === 1 && labels() === 0 && $('cat-badge').style.visibility === 'hidden', 'the categories box (now in the session popup) still works (flat, card label hidden)');
  clickBox('show-cat'); ok(groups() === 9 && labels() === 9 && $('cat-badge').style.visibility === '', '…and back');

  /* ── shuffle keyboard ── */
  ok(order() === alpha || groups() === 9, 'starts in alphabet order, grouped');
  clickBox('shuffle-kb');
  ok($('shuffle-kb').checked && !$('show-cat').checked, 'checking Shuffle forces "Show categories" off');
  ok($('show-cat').disabled && $('show-cat').closest('.menu-opt').classList.contains('disabled') && !$('cat-note').hidden, '…and holds it there (disabled, with a note)');
  ok(groups() === 1 && labels() === 0, 'one unlabeled block');
  ok($('cat-badge').style.visibility === 'hidden', 'card category label hidden too');
  const A = order();
  ok(vis().length === 51 && same(A, alpha) && A !== alpha, 'IPA keys: all 51, same letters, random order (not alphabetical)');
  ok(vis().every(b => !b.classList.contains('te')), 'IPA face');
  $('show-cat').dispatchEvent(new w.Event('change'));        // the box asks the page to redraw its keyboard
  ok(order() === A, 'the order is stable within a round (rebuilds keep it)');
  clickBox('highlight-correct'); clickBox('highlight-correct');
  ok(order() === A, 'toggling other options does not reshuffle');
  const done0 = G().completed;
  front(x => x.ipa === 'k'); vis().find(b => b.dataset.ipa === 'k').click();
  ok($('char-card').classList.contains('correct') && G().completed === done0 + 1, 'the shuffled keyboard plays normally');
  await tick(); await tick();
  G().start();
  const B = order();
  ok(same(B, alpha) && B !== A, 'each new round reshuffles');

  /* Telugu keyboard */
  h.flip();
  const T = order();
  ok(vis().length === 51 && vis().every(b => b.classList.contains('te')) && same(T, alpha) && T !== alpha && groups() === 1 && labels() === 0, 'Telugu keys: shuffled too, flat, unlabeled');
  ok($('shuffle-kb').checked && $('show-cat').disabled, 'shuffle setting survives switching direction');
  h.setup(() => $('include-extra').click());
  ok(vis().length === 54 && vis().some(b => b.dataset.ch === 'ఌ') && groups() === 1, 'extra letters join the shuffled keyboard (54)');
  h.setup(() => $('include-extra').click());
  front(x => x.ipa === 'k'); vis().find(b => b.dataset.ch === 'క').click();
  ok($('char-card').classList.contains('correct'), 'shuffled Telugu keyboard plays too');
  await tick(); await tick();

  /* un-shuffle */
  clickBox('shuffle-kb');
  ok(!$('shuffle-kb').checked && !$('show-cat').disabled && !$('cat-note').hidden === false, 'unchecking Shuffle frees the categories box');
  ok(!$('show-cat').checked && groups() === 1 && order() === alpha, 'categories stay off; keys return to alphabet order');
  ok(!$('show-cat').closest('.menu-opt').classList.contains('disabled'), 'box no longer looks disabled');
  clickBox('show-cat');
  ok(groups() === 9 && labels() === 9, 'checking categories again regroups');
  clickBox('shuffle-kb'); clickBox('shuffle-kb'); clickBox('show-cat'); clickBox('show-cat');
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
