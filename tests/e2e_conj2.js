// Conjuncts: its options, and ⌫. The consonants laid out as the Telugu keyboard (the vowels there too, dimmed), or
// with "Group keyboard phonetically" in groups by place. ⌫ clears the last filled slot, from the first pick until
// the last slot is filled.
const h = require('./harness')('alphabet/03_conjuncts.html');
const { w, d, tick, ok, front, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const kb     = () => [...d.querySelectorAll('#kb-area button.kb-btn[data-ipa]')];
const groups = () => d.querySelectorAll('#kb-area .kb-group').length;
const labels = () => d.querySelectorAll('#kb-area .kb-label').length;
const mode   = () => d.querySelector('#kb-area .gkb').dataset.mode;
const backs  = () => [...d.querySelectorAll('#kb-area .gkb-back')];
const backOn = () => backs().map(b => !b.disabled).join();
const vals   = () => [...d.querySelectorAll('#slots .slot-val')].map(v => v.textContent).join('|');
const clickBox = id => $(id).click();
const btn = ipa => kb().find(b => b.dataset.ipa === ipa);
const cur = () => G().current;
const inject = g => w.eval(`(()=>{const i=CLUSTERS.findIndex(c=>c.glyph==='${g}');GameCore.current.put(CLUSTERS[i]);})()`);
(async () => {
  /* ── the options: in the session popup ── */
  ok(!d.querySelector('.g-controls') && !d.querySelector('.g-controls-sep') && !d.querySelector('.cat-toggle'), 'the old controls bar is gone');
  ok(!$('menu-btn') && !$('opts-menu') && !$('menu-wrap'), 'no ⋮ menu on this page');
  ok([...d.querySelectorAll('#setup .menu-opt')].map(l => l.textContent.trim()).join('|') === 'Group keyboard phonetically|Include uncommon clusters|Missed guesses reappear', 'the checkboxes are in the session popup, in order');
  ok(!$('group-kb').checked && !$('include-uncommon').checked && $('missed-again').checked && !$('show-cat') && !$('shuffle-kb'), 'defaults: not grouped, no uncommon clusters ("Missed guesses reappear" on); no "Show categories" or "Shuffle keyboard"');
  ok($('setup').hidden && G().total === 40, 'the suite starts in a session with the defaults (the harness pressed Start)');

  /* ── laid out, or grouped ── */
  ok(mode() === 'layout' && groups() === 0 && labels() === 0 && $('cat-badge').style.visibility === 'hidden', 'to begin with: the Telugu keyboard\'s layout, and no category label on the card');
  clickBox('group-kb');
  ok(mode() === 'grouped' && groups() === 7 && labels() === 7 && $('cat-badge').style.visibility === '' && !d.querySelector('#kb-area .gkb-off') && backs().length === 0, 'checked: seven groups by place, labeled, the card labeled; only the game\'s keys (no dimmed vowels, no ⌫)');
  clickBox('group-kb');
  ok(mode() === 'layout' && labels() === 0 && kb().length === 34 && $('cat-badge').style.visibility === 'hidden', 'unchecked: the layout again, all 34 keys, card label hidden');
  front(x => true); ok($('cat-badge').style.visibility === 'hidden', 'and it stays hidden on the next card');

  /* a half-made answer survives the keyboard being redrawn */
  inject('జ్ఞ');
  const parts = cur().parts.map(p => p.ipa);
  btn(parts[0]).click();
  ok(vals() === parts[0] + '|–', 'first consonant placed');
  clickBox('group-kb');
  ok(vals() === parts[0] + '|–' && !!btn(parts[1]), 'grouping mid-round keeps the slot');
  clickBox('group-kb');
  ok(vals() === parts[0] + '|–' && backOn() === 'true,true', 'and so does going back to the layout, ⌫ on as before');
  btn(parts[1]).click();
  ok($('char-card').classList.contains('correct'), '…and the round completes normally');
  await tick(); await tick();

  /* ── ⌫ clears the last filled slot ── */
  inject('ష్ట్ర');
  ok(backs().length === 2 && backs().every(b => b.tagName === 'BUTTON' && b.textContent === '⌫') && backOn() === 'false,false', '⌫, on both pages, is a key of the game\'s: off before the first pick');
  btn('ʂ').click();
  ok(backOn() === 'true,true', 'on after the first pick');
  btn('k').click();
  ok(vals() === 'ʂ|k|–' && backOn() === 'true,true', 'two of three picked, one of them wrong');
  backs()[0].click();
  ok(vals() === 'ʂ|–|–' && !$('char-card').classList.contains('wrong') && backOn() === 'true,true', '⌫ clears the last one only (ʂ stays), and judges nothing');
  backs()[1].click();
  ok(vals() === '–|–|–' && backOn() === 'false,false', 'again (from the second page\'s ⌫): the first slot clears too, and ⌫ is off');
  backs()[0].click();
  ok(vals() === '–|–|–', 'with nothing picked, ⌫ does nothing');
  btn('ʂ').click(); btn('ʈ').click(); $('slots').children[0].click();
  ok(vals() === '–|ʈ|–', 'a slot can still be cleared by tapping it');
  backs()[0].click();
  ok(vals() === '–|–|–', 'and ⌫ then clears the last filled one, wherever it is');
  btn('ʂ').click(); btn('ʈ').click(); btn('ɾ').click();
  ok($('char-card').classList.contains('correct') && backOn() === 'false,false', 'filled right: correct, and ⌫ off while the answer shows');
  await tick(); await tick();
  ok(backOn() === 'false,false' && G().completed === 2, 'still off on the next card; nothing ⌫ cleared counted as an answer');

  /* a wrong answer: the right keys lit */
  inject('జ్ఞ');
  const p = cur().parts.map(x => x.ipa);
  btn('k').click(); btn('k').click();
  ok($('char-card').classList.contains('wrong') && btn(p[0]).classList.contains('ok') && btn(p[1]).classList.contains('ok') && backOn() === 'false,false', 'wrong answer: the right keys lit green; ⌫ off');
  await tick(); await tick();

  /* ── uncommon clusters: settled by Start, on the same keys ── */
  clickBox('include-uncommon');
  ok(kb().length === 34 && G().total === 40, 'checking "Include uncommon clusters" changes nothing by itself: it is settled by Start');
  clickBox('include-uncommon');
  h.setup(() => clickBox('include-uncommon'));
  ok(kb().length === 34 && !btn('ɽ') && mode() === 'layout', 'uncommon checked: the same 34 keys (no ఱ)');
  h.setup(() => clickBox('include-uncommon'));
  for (let i = 0; i < 6; i++) clickBox('group-kb');
  ok(kb().length === 34 && mode() === 'layout', 'rapid toggling leaves a complete keyboard');
  ok(G().total === 40, 'game state untouched by option changes (40 cards)');
  h.done();
})();
