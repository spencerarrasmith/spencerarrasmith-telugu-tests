// Phonemes: its keyboard. Not grouped (the default), it is the whole Telugu keyboard, both pages: each key
// where its letter sits on Gboard's Telugu keyboard, every other key (⌫, space, the digits …) drawn dimmed.
// "Group keyboard phonetically" lays the same keys out in labeled groups by sound instead.
const h = require('./harness')('alphabet/01_phonemes.html');
const { w, d, tick, ok, front, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const D = w.TeluguData, K = w.TeluguKeyboard;
const live   = () => [...d.querySelectorAll('#kb-area button.kb-btn[data-ipa]')];   // the game's keys
const byCh   = ch => live().find(b => b.dataset.ch === ch);
const groups = () => d.querySelectorAll('#kb-area .kb-group').length;
const labels = () => [...d.querySelectorAll('#kb-area .kb-label')].map(e => e.textContent);
const mode   = () => d.querySelector('#kb-area .gkb').dataset.mode;
const group  = on => { $('group-kb').checked = on; $('group-kb').dispatchEvent(new w.Event('change')); };
const rows   = page => [...d.querySelectorAll(`#kb-area .gkb-${page} > .kb-row`)];
const faces  = (page, n) => [...rows(page)[n].children].map(b => (b.classList.contains('gkb-off') ? '·' : '') + b.textContent).join(' ');
const onPage = () => d.querySelector('#kb-area .gkb-page.on').classList.contains('gkb-letters') ? 1 : 2;
(async () => {
  /* ── not grouped: the Telugu keyboard ── */
  ok(!$('group-kb').checked && mode() === 'layout' && groups() === 0 && labels().length === 0, 'not grouped to begin with: the keyboard is laid out as the Telugu keyboard, with no labels');
  ok(d.querySelectorAll('#kb-area .gkb-page').length === 2 && rows('letters').length === 6 && rows('digits').length === 5 && onPage() === 1,
    'both of its pages are drawn (the letters showing, the second behind ౧౨౩): six rows and five');
  ok(faces('letters', 0) === 'ɐ aː i iː u uː ru ruː e eː' && faces('letters', 1) === 'ai o oː au ɐm ɐʰ k kʰ ɡ ɡʱ' && faces('letters', 2) === 'ŋ tʃ tʃʰ dʒ dʒʱ ʈ ʈʰ ɖ ɖʱ ɳ' && faces('letters', 3) === 't̪ t̪ʰ d̪ d̪ʱ n p pʰ b bʱ m' && faces('letters', 4) === 'j ɾ l ʋ ɭ ʃ ʂ s ɦ ·⌫',
    'forward, each sound where its letter sits on the Telugu keyboard (అం\'s on ం); ⌫ dimmed: ' + faces('letters', 1));
  ok(faces('letters', 5) === '౧౨౩ ·, ·తెలుగు ·. ·⏎' && d.querySelector('.gkb-letters .gkb-flip').tagName === 'BUTTON' && !d.querySelector('.gkb-letters .gkb-flip').disabled,
    'the bottom row is the Telugu keyboard\'s: ౧౨౩ works, the rest (, space . ⏎) is dimmed');
  ok(faces('digits', 0) === '·౧ ·౨ ·౩ ·౪ ·౫ ·౬ ·౭ ·౮ ·౯ ·౦' && faces('digits', 2) === 'ɲ ·◌ఁ kʂ ·# ·% ·& ·+ ·* ·" ·\'' && faces('digits', 3) === '·- ·/ ·? ·: ·; ·( ·) ·! ·₹ ·⌫' && faces('digits', 4) === 'అఆ ·, ·తెలుగు ·. ·⏎',
    'the second page is the Telugu keyboard\'s too: ఞ where it sits there; క్ష, which has no place on either page, at the first symbol after ఁ; the digits dimmed');
  ok(live().length === 51 && d.querySelectorAll('#kb-area .gkb-letters .gkb-off').length === 5 && d.querySelectorAll('#kb-area .gkb-digits .gkb-off').length === 42 && [...d.querySelectorAll('#kb-area .gkb-off')].every(s => s.tagName === 'SPAN' && s.getAttribute('aria-hidden') === 'true'),
    'all 51 letters are keys; the other keys (5 on the first page, 42 on the second) are dimmed spans, hidden from screen readers');
  // every key sits where its letter sits on the Telugu keyboard
  const placeOf = ch => (ch.length === 2 && /[ంః]/.test(ch[1]) ? ch[1] : ch);
  const at = b => { const r = b.closest('.kb-row'), page = b.closest('.gkb-page').classList.contains('gkb-letters') ? K.ROWS : K.NUM_ROWS; return page[[...r.parentElement.children].indexOf(r)][[...r.children].indexOf(b)]; };
  const misplaced = live().filter(b => b.dataset.ch !== 'క్ష' && at(b) !== placeOf(b.dataset.ch)).map(b => b.dataset.ch);
  ok(misplaced.length === 0, 'every key is in its letter\'s place, on either page ' + misplaced.join(' '));

  /* the pages */
  d.querySelector('.gkb-letters .gkb-flip').click();
  ok(onPage() === 2 && d.querySelector('.gkb-letters').getAttribute('aria-hidden') === 'true' && [...d.querySelectorAll('.gkb-letters button')].every(b => b.tabIndex === -1), '౧౨౩ turns to the second page; the first is hidden from the keyboard and screen readers');
  front(x => x.ipa === 'kʂ'); byCh('క్ష').click();
  ok($('char-card').classList.contains('correct'), 'క్ష is answered from the second page');
  await tick(); await tick();
  d.querySelector('.gkb-digits .gkb-flip').click();
  ok(onPage() === 1, 'అఆ goes back to the letters');
  front(x => x.ipa === 'ɲ'); byCh('న').click();
  ok(byCh('ఞ').classList.contains('ok') && onPage() === 2, 'a miss whose answer is on the second page turns to it, so the lit answer is seen');
  await tick(); await tick();
  ok(onPage() === 2, '(and the page stays where it was turned)');
  d.querySelector('.gkb-digits .gkb-flip').click();

  /* reversed: the same places, Telugu faces */
  h.flip();
  ok(mode() === 'layout' && faces('letters', 0) === 'అ ఆ ఇ ఈ ఉ ఊ ఋ ౠ ఎ ఏ' && faces('letters', 1) === 'ఐ ఒ ఓ ఔ అం అః క ఖ గ ఘ' && faces('digits', 2).startsWith('ఞ ·◌ఁ క్ష'),
    'reversed, the same places with Telugu faces: ' + faces('letters', 1));
  ok(live().every(b => b.classList.contains('te')) && live().length === 51, 'all 51 Telugu-faced');

  /* ── grouped ── */
  front(x => x.ipa === 'k');
  const before = { deck: G().deck.length, done: G().completed, top: G().current.ch };
  group(true);
  ok(mode() === 'grouped' && groups() === 9 && labels().join() === D.letterGroups.map(g => g.lbl).join() && !d.querySelector('#kb-area .gkb-page, #kb-area .gkb-off, #kb-area .gkb-flip'),
    'grouped: the nine groups, labeled, holding only the game\'s keys (no pages, nothing dimmed)');
  ok(live().length === 51 && $('cat-badge').style.visibility === '', 'still 51 keys; the card shows its group');
  ok(G().deck.length === before.deck && G().completed === before.done && G().current.ch === before.top, 'regrouping does not restart or change the round');
  byCh('క').click();
  ok($('char-card').classList.contains('correct'), 'the grouped keyboard plays');
  await tick(); await tick();
  ok([...d.querySelectorAll('#kb-area .kb-group')].every(g => +g.style.getPropertyValue('--k') === Math.min(10, g.querySelectorAll('.kb-btn').length)), 'each group is as wide as its keys, ten at most to a line (--k, for game.css)');
  h.flip(); ok(mode() === 'grouped' && live()[0].textContent === 'ɐ', 'the choice is kept when the direction is turned');
  group(false);
  ok(mode() === 'layout' && $('cat-badge').style.visibility === 'hidden' && faces('letters', 0).startsWith('ɐ aː'), 'unchecked: the Telugu keyboard again, and the card\'s label hidden');
  h.done();
})();
