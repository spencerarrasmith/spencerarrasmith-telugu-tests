const h = require('./harness')('alphabet/03_conjuncts.html');
const { w, d, tick, ok, front, $ } = h;
const G = h.game;                                          // the round: G().deck, .current, .total, .completed
const live = () => [...d.querySelectorAll('#kb-area button.kb-btn[data-ipa]')];      // the game's keys (not ౧౨౩ or ⌫, not the dimmed ones)
const btn = ipa => live().find(b => b.dataset.ipa === ipa);
const faces = (page, i) => [...d.querySelectorAll(`#kb-area .gkb-${page} > .kb-row`)[i].children].map(b => (b.classList.contains('gkb-off') ? '·' : '') + b.textContent).join(' ');
const cur = () => G().current;
const slots = () => [...d.querySelectorAll('#slots .slot')];
const val = i => slots()[i].querySelector('.slot-val').textContent;
const inject = glyphEscaped => w.eval(`(()=>{const i=CLUSTERS.findIndex(c=>c.glyph==='${glyphEscaped}');GameCore.current.put(CLUSTERS[i]);})()`);
(async () => {
  ok(!$('include-uncommon').checked && $('include-uncommon').parentElement.textContent.includes('Include uncommon clusters'), 'unchecked by default, labeled "Include uncommon clusters"');
  ok(G().total === 40 && G().deck.every(c => !c.uncommon), 'default session: 40 cards, no uncommon clusters');
  ok(live().length === 34 && !btn('ɽ') && !!btn('ŋ') && !!btn('ɲ'), '34 keys: the book\'s consonants, ఙ ఞ among them; no ఱ');
  ok(faces('letters', 0) === '·ɐ ·aː ·i ·iː ·u ·uː ·ru ·ruː ·e ·eː' && faces('letters', 1) === '·ai ·o ·oː ·au ·ɐm ·ɐʰ k kʰ ɡ ɡʱ' && faces('digits', 2).startsWith('ɲ ·◌ఁ ·@'),
    'the whole Telugu keyboard, each consonant where it sits (ఞ on the second page); the vowels are there too, dimmed, written as sounds as the keys are: no conjunct asks for one');
  ok(d.querySelectorAll('#kb-area .gkb-letters .gkb-off').length === 16 + 4 && !d.querySelector('#kb-area .gkb-letters .gkb-off.gkb-back'), 'on the first page: the 16 vowel keys and , space . ⏎ dimmed; ⌫ is a key of the game\'s here');

  // జ్ఞ with its note
  inject('జ్ఞ');
  let c0 = cur();
  ok(c0.glyph === 'జ్ఞ' && slots().length === 2, 'జ్ఞ card: 2 slots (జ + ఞ)');
  ok($('feedback').classList.contains('hint') && $('feedback').textContent.includes('/ɡɲɐ/') && $('feedback').textContent.includes('as written'), 'hint warns: pick as written, usually said /ɡɲɐ/');
  ok($('cat-badge').textContent === 'Palatal + Nasal' && $('rare-badge').style.display === 'none', 'card label names the classes (Palatal + Nasal), no rare badge (it is a classic conjunct)');
  btn('dʒ').click(); btn('ɲ').click();
  ok($('char-card').classList.contains('correct'), 'picking జ then ఞ is correct');
  ok($('feedback').textContent.trim() === '✓  /dʒɲɐ/  ·  usually said /ɡɲɐ/', 'feedback shows written + spoken: ' + $('feedback').textContent.trim());
  await tick(); await tick();

  const P = w.TeluguProgress;
  ok(P.missCount() === 0, 'no misses recorded yet (only correct answers so far)');
  // picking the "spoken" sounds is wrong by the written-letters rule
  inject('జ్ఞ');
  btn('ɡ').click(); btn('ɲ').click();
  ok($('char-card').classList.contains('wrong') && $('feedback').textContent === '✗  /ɡɲɐ/' && btn('dʒ').classList.contains('ok'), 'picking ɡ + ɲ (the spoken form) is marked wrong; the line shows what was picked (/ɡɲɐ/), not the answer, and the right keys are lit');
  ok(/GameCore\.create\(\{[^}]*?errMs:\s*1500\b/.test(require('fs').readFileSync(require('path').join(require('./config').SITE_DIR, 'alphabet/03_conjuncts.html'), 'utf8')), 'Conjuncts: a wrong pick stays on screen for 1.5 seconds (errMs: 1500)');
  await tick(); await tick();
  const m = P.misses().find(x => x.game === 'conjuncts');
  ok(m && m.key === 'జ్ఞ' && m.ask === 'telugu' && !('answer' in m) && h.shown(m).prompt === 'జ్ఞ' && h.shown(m).answer.includes('/dʒɲɐ/') && h.shown(m).answer.includes('usually said /\u0261ɲɐ/'), 'wrong answer recorded for Review; shown with its written + spoken answer: ' + (m && h.shown(m).answer));

  // ordinary cluster has no note
  front(x => x.spoken === null);
  ok(!$('feedback').textContent.includes('usually'), 'ordinary clusters show the standard hint');
  btn(cur().parts[0].ipa).click(); btn(cur().parts[1].ipa).click();
  ok(!$('feedback').textContent.includes('usually said'), 'and no spoken note after answering');
  await tick(); await tick();

  let g = 0;
  while (!$('g-complete').classList.contains('show') && g++ < 800) { cur().parts.forEach(p => btn(p.ipa).click()); await tick(); await tick(); }
  ok($('g-complete').classList.contains('show'), 'default session completes');
  { const r = P.runs('conjuncts').at(-1); ok(r && r.ok === G().completed && r.tries === G().attempts && r.n === G().total && r.end === 'done' && !('dir' in r) && !('isComplete' in P), 'the session is recorded for the Profile page (forward); nothing is marked complete'); }

  $('retry-btn').click();
  ok(!$('setup').hidden && $('g-complete').classList.contains('show'), '"Practice Again" opens the session popup');
  $('include-uncommon').click(); $('setup-start').click();
  ok(live().length === 34 && !btn('ɽ') && G().deck.every(c => c.parts.every(p => p.inBook)), 'checked: the same 34 keys: no uncommon cluster uses a letter out of use (ఱ ౘ ౙ are on the Bookish Telugu page)');
  ok(w.eval('CLUSTERS.filter(c=>!c.core).length') === 9, '9 uncommon clusters available when checked');
  h.done();
})();
