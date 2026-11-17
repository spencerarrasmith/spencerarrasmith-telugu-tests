const h = require('./harness')('alphabet/03_conjuncts.html');
const { w, d, tick, ok, front, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const btn = ipa => [...d.querySelectorAll('.kb-btn')].find(b => b.dataset.ipa === ipa);
const cur = () => G().current;
const slots = () => [...d.querySelectorAll('#slots .slot')];
const val = i => slots()[i].querySelector('.slot-val').textContent;
const inject = glyphEscaped => w.eval(`(()=>{const i=CLUSTERS.findIndex(c=>c.glyph==='${glyphEscaped}');GameCore.current.put(CLUSTERS[i]);})()`);
(async () => {
  ok(!$('include-uncommon').checked && $('include-uncommon').parentElement.textContent.includes('Include uncommon clusters'), 'unchecked by default, labelled "Include uncommon clusters"');
  ok(G().total === 40 && G().deck.every(c => !c.uncommon), 'default session: 40 cards, no uncommon clusters');
  ok(d.querySelectorAll('.kb-btn').length === 34 && !btn('ɽ') && !!btn('ŋ') && !!btn('ɲ'), '34 keys: ఱ hidden, ఙ ఞ kept');

  // జ్ఞ with its note
  inject('జ్ఞ');
  let c0 = cur();
  ok(c0.glyph === 'జ్ఞ' && slots().length === 2, 'జ్ఞ card: 2 slots (జ + ఞ)');
  ok($('feedback').classList.contains('hint') && $('feedback').textContent.includes('/ɡɲa/') && $('feedback').textContent.includes('as written'), 'hint warns: pick as written, usually said /ɡɲa/');
  ok($('cat-badge').textContent === 'Palatal + Nasal' && $('rare-badge').style.display === 'none', 'card label names the classes (Palatal + Nasal), no rare badge (it is a classic conjunct)');
  btn('dʒ').click(); btn('ɲ').click();
  ok($('char-card').classList.contains('correct'), 'picking జ then ఞ is correct');
  ok($('feedback').textContent.trim() === '✓  /dʒɲa/  ·  usually said /ɡɲa/', 'feedback shows written + spoken: ' + $('feedback').textContent.trim());
  await tick(); await tick();

  const P = w.TeluguProgress;
  ok(P.missCount() === 0, 'no misses recorded yet (only correct answers so far)');
  // picking the "spoken" sounds is wrong by the written-letters rule
  inject('జ్ఞ');
  btn('ɡ').click(); btn('ɲ').click();
  ok($('char-card').classList.contains('wrong') && $('feedback').textContent.includes('✗'), 'picking ɡ + ɲ (the spoken form) is marked wrong, with the note shown');
  await tick(); await tick();
  const m = P.misses().find(x => x.game === 'conjuncts');
  ok(m && m.key === 'జ్ఞ' && m.prompt === 'జ్ఞ' && m.answer.includes('/dʒɲa/') && m.answer.includes('usually said /\u0261ɲa/'), 'wrong answer recorded for Review with written + spoken answer: ' + (m && m.answer));

  // ordinary cluster has no note
  front(x => x.spoken === null);
  ok(!$('feedback').textContent.includes('usually'), 'ordinary clusters show the standard hint');
  btn(cur().parts[0].ipa).click(); btn(cur().parts[1].ipa).click();
  ok(!$('feedback').textContent.includes('usually said'), 'and no spoken note after answering');
  await tick(); await tick();

  let g = 0;
  while (!$('g-complete').classList.contains('show') && g++ < 800) { cur().parts.forEach(p => btn(p.ipa).click()); await tick(); await tick(); }
  ok($('g-complete').classList.contains('show'), 'default session completes');
  ok(P.isComplete('conjuncts'), 'completion recorded for the Conjuncts tile');

  $('retry-btn').click();
  $('include-uncommon').checked = true; $('include-uncommon').dispatchEvent(new w.Event('change'));
  ok(d.querySelectorAll('.kb-btn').length === 35 && !!btn('ɽ'), 'ticked: 35 keys, ఱ appears');
  ok(w.eval('CLUSTERS.filter(c=>!c.core).length') === 9, '9 uncommon clusters available when ticked');
  h.done();
})();
