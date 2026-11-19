const h = require('./harness')('alphabet/01_phonemes.html');
const { w, d, tick, ok, front, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const D = w.TeluguData;
const vis    = () => [...d.querySelectorAll('.kb-btn')].filter(b => b.style.display !== 'none');
const groups = () => d.querySelectorAll('#kb-area .kb-group').length;
const labels = () => [...d.querySelectorAll('#kb-area .kb-label')].map(e => e.textContent);
const showCat = on => { $('show-cat').checked = on; $('show-cat').dispatchEvent(new w.Event('change')); };
const alpha = D.letters.filter(l => l.core).map(l => l.ch).join('|');
(async () => {
  /* forward (IPA) keyboard is always grouped, whatever the checkbox says */
  ok(groups() === 9 && labels().length === 9, 'forward: 9 labeled groups');
  showCat(false);
  ok(groups() === 1 && labels().length === 0 && vis().length === 51 && vis()[0].textContent === 'a' && vis().every(b => !b.classList.contains('te')), 'forward: unchecking "Show categories" flattens the IPA keyboard too');
  ok($('cat-badge').style.visibility === 'hidden', 'forward: card category label hidden when unchecked');
  showCat(true);
  ok(groups() === 9 && labels().length === 9, 'forward: checking regroups the IPA keyboard');

  /* reverse + checked = grouped Telugu keyboard (as before) */
  h.flip();
  ok(groups() === 9 && labels().join() === D.letterGroups.map(g => g.lbl).join(), 'reverse + checked: grouped and labeled');

  /* reverse + unchecked = one plain block */
  front(x => x.ipa === 'k');
  const before = { deck: G().deck.length, done: G().completed, top: G().current.ch };
  showCat(false);
  ok(groups() === 1 && labels().length === 0 && d.querySelectorAll('#kb-area .kb-row').length === 1, 'reverse + unchecked: a single group, no labels, one row');
  ok(vis().length === 51 && vis().every(b => b.classList.contains('te')) && vis().map(b => b.textContent).join('|') === alpha, 'still 51 Telugu keys, still in alphabet order');
  ok(G().deck.length === before.deck && G().completed === before.done && G().current.ch === before.top, 'regrouping does not restart or change the round');
  ok($('cat-badge').style.visibility === 'hidden', 'card category label hidden too');

  /* the flat keyboard still plays */
  const right = vis().find(b => b.dataset.ch === 'క'); right.click();
  ok($('char-card').classList.contains('correct') && G().completed === before.done + 1, 'answering on the flat keyboard works');
  await tick(); await tick();
  front(x => x.ipa === 'ʈ');
  const wrong = vis().find(b => b.dataset.ch === 'క'); wrong.click();
  ok(wrong.classList.contains('err') && vis().find(b => b.dataset.ch === 'ట').classList.contains('ok'), 'wrong answer + highlight work on the flat keyboard');
  await tick(); await tick();

  /* the choice sticks across rebuilds */
  h.setup(() => { $('include-extra').checked = true; $('include-extra').dispatchEvent(new w.Event('change')); });
  ok(groups() === 1 && labels().length === 0 && vis().length === 54, 'extras on: still flat, 54 keys');
  h.setup(() => { $('include-extra').checked = false; $('include-extra').dispatchEvent(new w.Event('change')); });
  ok(groups() === 1 && vis().length === 51, 'extras off: still flat');
  h.flip(); ok(groups() === 1 && labels().length === 0 && vis()[0].textContent === 'a', 'back to forward: IPA keyboard also flat (setting is shared)');
  h.flip(); ok(groups() === 1 && labels().length === 0, 'reverse again: remembers unchecked → flat');
  showCat(true);
  ok(groups() === 9 && labels().length === 9 && $('cat-badge').style.visibility === '', 'checking again regroups and restores the card label');

  /* builder on its own */
  const host = d.createElement('div'); d.body.appendChild(host);
  const flat = D.buildKeyboard(host, { face: 'telugu', grouped: false });
  ok(flat.length === 54 && host.querySelectorAll('.kb-group').length === 1 && host.querySelectorAll('.kb-label').length === 0, 'buildKeyboard({grouped:false}): one group, no labels, 54 keys');
  ok(flat.map(b => b.dataset.ch).join('') === D.letters.map(l => l.ch).join(''), '…in alphabet order');
  const grp = D.buildKeyboard(host, {});
  ok(grp.length === 54 && host.querySelectorAll('.kb-group').length === 9, 'default stays grouped');
  h.done();
})();
