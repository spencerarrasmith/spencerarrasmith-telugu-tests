// Phonemes: its options. No ⋮ menu: every option is in the session popup, three checkboxes, the first
// "Group keyboard phonetically". There is no "Show categories" and no "Shuffle keyboard" any more.
const h = require('./harness')('alphabet/01_phonemes.html');
const { w, d, tick, ok, front, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const live   = () => [...d.querySelectorAll('#kb-area button.kb-btn[data-ipa]')];
const groups = () => d.querySelectorAll('#kb-area .kb-group').length;
const labels = () => d.querySelectorAll('#kb-area .kb-label').length;
const mode   = () => d.querySelector('#kb-area .gkb').dataset.mode;
const clickBox = id => $(id).click();                       // like a tap on the label
(async () => {
  ok(!d.querySelector('.g-controls') && !d.querySelector('.g-controls-sep'), 'the old controls bar is gone');
  ok(!$('menu-btn') && !$('menu-wrap') && !$('opts-menu') && !d.querySelector('.g-header .menu-btn') && $('g-title').closest('.g-header-top') && $('g-title').closest('.g-header-top').lastElementChild.querySelector('.g-stats'), 'the header has no ⋮ button: the title, then the counters');
  ok([...d.querySelectorAll('#setup .setup-opt')].map(l => l.textContent.trim()).join('|') === 'Group keyboard phonetically|Highlight correct answer|Missed guesses reappear', 'the popup holds the three checkboxes, in order');
  ok([...d.querySelectorAll('#setup .setup-opt')].every(l => l.lastElementChild.type === 'checkbox' && l.firstElementChild.classList.contains('menu-txt')), 'each is a label with its checkbox after it (at the right of the row)');
  ok(!$('show-cat') && !$('shuffle-kb') && !$('include-extra') && !$('cat-note'), 'no "Show categories", "Shuffle keyboard", or "Include extra letters"');
  ok(!$('group-kb').checked && $('highlight-correct').checked && $('missed-again').checked, 'defaults: highlight and "Missed guesses reappear" on; grouping off');
  ok(mode() === 'layout' && groups() === 0 && labels() === 0 && $('cat-badge').style.visibility === 'hidden', 'so the keyboard starts as the Telugu keyboard, and the card has no group label');
  clickBox('group-kb');
  ok($('group-kb').checked && mode() === 'grouped' && groups() === 9 && labels() === 9 && $('cat-badge').style.visibility === '', 'checking "Group keyboard phonetically" groups and labels the keyboard, and labels the card');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok($('setup').hidden && G().total === 51, 'Escape during play does nothing');

  /* every option works from the popup */
  front(x => x.ipa === 'k'); clickBox('highlight-correct');
  live().find(b => b.dataset.ipa === 'ɡ').click();
  ok(d.querySelectorAll('.kb-btn.ok').length === 0, 'the highlight option works');
  await tick(); await tick(); clickBox('highlight-correct');
  const n0 = G().completed, top = G().current.ch;
  clickBox('group-kb');
  ok(mode() === 'layout' && labels() === 0 && $('cat-badge').style.visibility === 'hidden' && G().completed === n0 && G().current.ch === top, 'unchecked: the Telugu keyboard again, the card label hidden, the round untouched');
  clickBox('group-kb'); ok(groups() === 9 && labels() === 9 && $('cat-badge').style.visibility === '', '…and back');
  h.flip(); ok(mode() === 'grouped' && live().every(b => b.classList.contains('te')), 'the choice survives turning the direction around');
  front(x => x.ipa === 'k'); live().find(b => b.dataset.ch === 'క').click();
  ok($('char-card').classList.contains('correct'), 'and the grouped Telugu keyboard plays');
  await tick(); await tick();
  for (let i = 0; i < 6; i++) clickBox('group-kb');
  ok(mode() === 'grouped' && live().length === 51, 'rapid toggling does not throw, or lose a key');

  /* game-menu.js: the shared box */
  const src = require('fs').readFileSync(require('path').join(require('./config').SITE_DIR, 'game-menu.js'), 'utf8');
  ok(typeof w.GameMenu.grouped === 'function' && w.GameMenu.grouped() === true && !/shuffle-kb'\)\s*&&\s*\$\('show-cat'/.test(src) && !/show-cat/.test(src), 'game-menu.js keeps the shared box: grouped() reads "Group keyboard phonetically"; nothing of "Show categories" left');
  h.done();
})();
