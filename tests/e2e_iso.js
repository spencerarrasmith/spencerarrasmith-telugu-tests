// The whole app for a reader who chose ISO on the home page: every page writes sounds as ISO 15919
// spellings (ka, kā, kṣa), with no slashes. The other suites cover the same pages in IPA, the default.
const load = require('./harness');
const ISO = { notation: 'iso' };
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const noSlash = s => !/\//.test(s);
const IPA_ONLY = /[ɡʂʈɖɳɲŋʃʰʱɽːɦʒʋɭ]/;                        // letters IPA uses and ISO never does

(async () => {
  /* ── Phonemes ── */
  {
    const h = load('alphabet/01_phonemes.html', ISO); const { w, d, tick, $ } = h, G = h.game, P = w.TeluguProgress, D = w.TeluguData;
    const kb = () => [...d.querySelectorAll('.kb-btn')].filter(b => b.style.display !== 'none'), key = ch => kb().find(b => b.dataset.ch === ch);
    ok(D.notation.id === 'iso' && $('g-title').textContent === 'Telugu → ISO' && /ISO to Telugu/.test($('rev-btn').getAttribute('aria-label')), 'Phonemes: title and swap button say ISO');
    ok(key('క').textContent === 'ka' && key('ఖ').textContent === 'kha' && key('ట').textContent === 'ṭa' && key('ఆ').textContent === 'ā' && key('అం').textContent === 'aṁ' && key('క్ష').textContent === 'kṣa' && key('ఋ').textContent === 'r̥', 'Phonemes: keys spell each letter in ISO, consonants with their a (ka kha ṭa ā aṁ kṣa r̥)');
    ok(kb().length === 51 && kb().every(b => noSlash(b.textContent) && !IPA_ONLY.test(b.textContent)) && key('క').dataset.ipa === 'k', 'Phonemes: no slashes or IPA letters on any key; data-ipa is still the key\'s identity');
    ok(kb().map(b => b.textContent).join(' ') === D.pool(D.letters, false).map(l => l.iso).join(' '), 'Phonemes: every key is the letter\'s iso from telugu-data.js');
    h.front(c => c.ch === 'క'); key('క').click();
    ok($('char-card').classList.contains('correct') && G().completed === 1, 'Phonemes: the ka key answers క');
    await tick(); await tick();
    h.front(c => c.ch === 'గ'); key('క').click();
    ok($('feedback').textContent === '✗  ga' && $('char-card').classList.contains('wrong'), 'Phonemes: a wrong answer shows the spelling, with no slashes (✗ ga)');
    const m = P.misses().find(x => x.key === 'గ');
    ok(m.ask === 'telugu' && h.shown(m).answer === 'ga' && !('answer' in m), 'Phonemes: the miss stores the letter; shown in ISO it is ga');
    await tick(); await tick();
    $('rev-btn').click();
    ok($('g-title').textContent === 'ISO → Telugu' && /Telugu to ISO/.test($('rev-btn').getAttribute('aria-label')) && kb().every(b => b.classList.contains('te')), 'Phonemes reversed: ISO → Telugu, Telugu keys');
    h.front(c => c.ch === 'ఖ');
    ok($('tel-char').classList.contains('ipa-face') && $('tel-char').textContent === 'kha' && !$('tel-char').querySelector('.sl') && $('tel-char').innerHTML === 'kha', 'Phonemes reversed: the card shows kha, plain (no slash spans)');
    key('ఖ').click(); ok($('char-card').classList.contains('correct'), 'Phonemes reversed: ఖ answers kha');
    await tick(); await tick();
    let guard = 0; while (!$('g-complete').classList.contains('show') && guard++ < 200) { key(G().current.ch).click(); await tick(); await tick(); }
    ok($('c-sub').textContent === 'All 51 ISO spellings correctly matched to their Telugu akshara.' && P.isComplete('phonemes'), 'Phonemes: the complete screen says "ISO spellings"; the tile is ticked as usual');
  }

  /* ── Diacritics ── */
  {
    const h = load('alphabet/02_diacritics.html', ISO); const { w, d, tick, $ } = h, G = h.game, D = w.TeluguData, P = w.TeluguProgress;
    const keys = k => [...d.querySelectorAll(`.kb-btn[data-kind="${k}"]`)], key = (k, ipa) => keys(k).find(b => b.dataset.ipa === ipa);
    const C = ch => D.letters.find(l => l.ch === ch), V = sg => D.signs.find(g => g.sign === sg);
    const put = (c, v) => G().put({ c: C(c), v: V(v), glyph: c + v, cat: V(v).grp, rare: false });
    ok($('g-title').textContent === 'Diacritics → ISO', 'Diacritics: title says ISO');
    ok(keys('c').map(b => b.textContent).join(' ') === D.pool([...D.consonants, ...D.conjunctLetters], false).map(l => l.isoStem).join(' ') && key('c', 'k').textContent === 'k' && key('c', 'kʂ').textContent === 'kṣ', 'Diacritics: consonant keys are the bare consonants (k … kṣ): the vowel is the other pick');
    ok(keys('v').map(b => b.textContent).join(' ') === 'a i u e o ā ī ū ē ō ai au r̥ r̥̄ aṁ aḥ ∅', 'Diacritics: vowel keys are what each sign adds (a … ā … aṁ aḥ), ∅ for the pollu');
    ok([...keys('c'), ...keys('v')].every(b => noSlash(b.textContent) && !IPA_ONLY.test(b.textContent)), 'Diacritics: no slashes or IPA letters on any key');
    put('క', 'ా'); key('c', 'k').click();
    ok($('slot-c').querySelector('.slot-val').textContent === 'k', 'Diacritics: the consonant slot shows k');
    key('v', 'aː').click();
    ok($('char-card').classList.contains('correct') && $('feedback').textContent === '✓  kā', 'Diacritics: k + ā answers కా; feedback ✓ kā');
    await tick(); await tick();
    put('క', 'ం'); key('c', 'k').click(); key('v', 'a').click();
    ok($('char-card').classList.contains('wrong') && $('feedback').textContent === '✗  kaṁ', 'Diacritics: a wrong vowel on కం shows ✗ kaṁ');
    const m = P.misses().find(x => x.key === 'కం');
    ok(m.ask === 'telugu' && m.syllable === true && h.shown(m).answer === 'kaṁ', 'Diacritics: the miss stores the syllable; shown in ISO it is kaṁ');
    await tick(); await tick();
    $('rev-btn').click();
    ok($('g-title').textContent === 'ISO → Diacritics', 'Diacritics reversed: ISO → Diacritics');
    const face = () => $('tel-char').textContent;
    put('క', 'ా'); const a = face(); put('క', ''); const b = face(); put('క', '్'); const c = face(); put('క్ష', 'ై'); const e = face(); put('ఖ', 'ం'); const f = face();
    ok(a === 'kā' && b === 'ka' && c === 'k' && e === 'kṣai' && f === 'khaṁ' && !$('tel-char').querySelector('.sl'), 'Diacritics reversed: cards read kā, ka (no sign), k (pollu), kṣai, khaṁ; no slashes');
    put('క', 'ా'); key('c', 'k').click(); key('v', 'aː').click();
    ok($('char-card').classList.contains('correct') && $('feedback').textContent === '✓  కా', 'Diacritics reversed: క + ా answers kā');
  }

  /* ── Conjuncts ── */
  {
    const h = load('alphabet/03_conjuncts.html', ISO); const { w, d, tick, $ } = h, G = h.game, D = w.TeluguData, P = w.TeluguProgress;
    const kb = () => [...d.querySelectorAll('#kb-area .kb-btn')], ipaKey = ipa => kb().find(b => b.dataset.ipa === ipa), key = ch => kb().find(b => b.dataset.ch === ch);
    const put = g => G().put(D.clusters.find(c => c.glyph === g));
    const vals = () => [...d.querySelectorAll('#slots .slot-val')].map(s => s.textContent).join('|');
    ok($('g-title').textContent === 'Conjuncts → ISO' && kb().length === 34 && kb().map(b => b.textContent).join(' ') === D.pool(D.consonants, false).map(l => l.isoStem).join(' '), 'Conjuncts: title says ISO; keys are the 34 bare consonants in ISO');
    put('క్ష'); ipaKey('k').click(); ok(vals() === 'k|–', 'Conjuncts: a pick shows in its slot as k');
    ipaKey('ʂ').click();
    ok($('char-card').classList.contains('correct') && $('feedback').textContent === '✓  kṣa', 'Conjuncts: k + ṣ answers క్ష; feedback ✓ kṣa');
    await tick(); await tick();
    put('జ్ఞ'); ipaKey('dʒ').click(); ipaKey('ɲ').click();
    ok($('feedback').textContent === '✓  jña  ·  usually said /ɡɲa/', 'Conjuncts: జ్ఞ is jña; how it is usually SAID stays in IPA, between slashes');
    await tick(); await tick();
    put('క్య'); ipaKey('k').click(); ipaKey('r').click();
    const m = P.misses().find(x => x.key === 'క్య');
    ok($('feedback').textContent === '✗  kya' && m.ask === 'telugu' && h.shown(m).answer === 'kya', 'Conjuncts: a miss shows ✗ kya and is stored as the conjunct');
    await tick(); await tick();
    $('rev-btn').click();
    ok($('g-title').textContent === 'ISO → Conjuncts', 'Conjuncts reversed: ISO → Conjuncts');
    put('క్ష'); ok($('tel-char').textContent === 'kṣa' && !$('tel-char').querySelector('.sl'), 'Conjuncts reversed: the card shows kṣa, plain');
    put('ష్ట్ర'); ok($('tel-char').textContent === 'ṣṭra', 'Conjuncts reversed: three letters → ṣṭra');
    put('జ్ఞ'); ok($('tel-char').textContent === 'jña' && $('feedback').textContent === 'This is the spelling as written · spoken Telugu usually says /ɡɲa/', 'Conjuncts reversed: జ్ఞ shows jña, and the hint calls it the spelling');
    key('జ').click(); key('ఞ').click(); ok($('char-card').classList.contains('correct'), 'Conjuncts reversed: జ + ఞ answers jña');
    ok(D.clusters.every(c => { G().put(c); return $('tel-char').textContent === c.iso && noSlash($('tel-char').textContent); }), 'Conjuncts reversed: all 92 cards show their ISO spelling');
  }

  /* ── Lookalikes ── */
  {
    const h = load('alphabet/05_lookalikes.html', ISO); const { w, d, tick, $ } = h, G = h.game, L = w.LookalikeData, P = w.TeluguProgress;
    const opt = t => [...d.querySelectorAll('#kb-area .kb-btn')].find(b => b.textContent.replace(/rare$/, '') === t || b.dataset.text === t);
    const card = (t, others) => G().put({ item: L.item(t), options: [t, ...others].map(L.item) });
    ok(d.querySelector('.kb-label').textContent === 'Which one is spelled this way?', 'Lookalikes: the question is about the spelling');
    card('ఒ', ['బ', 'ఓ']);
    ok($('tel-char').textContent === 'o' && !$('tel-char').querySelector('.sl'), 'Lookalikes: the card shows o, plain');
    card('బ', ['ఒ', 'ఓ']); ok($('tel-char').textContent === 'ba', 'Lookalikes: a consonant is spelled with its a (ba)');
    card('వు', ['పు', 'ఘ']); ok($('tel-char').textContent === 'vu', 'Lookalikes: a letter with a sign (vu)');
    ok(G().deck.every(c => { G().put(c); return $('tel-char').textContent === c.item.iso; }), 'Lookalikes: every dealt card shows its item\'s iso');
    // క and క్ sound the same in IPA (/k/), so either is accepted there; in ISO they are ka and k
    card('క', ['క్', 'ఖ']);
    ok($('tel-char').textContent === 'ka', 'Lookalikes: క is ka …');
    opt('క్').click();
    ok($('char-card').classList.contains('wrong') && opt('క').classList.contains('ok') && !opt('క్').classList.contains('ok'), '… so క్ (k) is wrong for ka, and only క is shown as the answer');
    const m = P.misses().find(x => x.key === 'క');
    ok(m.ask === 'sound' && h.shown(m).prompt === 'ka' && h.shown(m).answer === 'క', 'Lookalikes: the miss replays as ka → క');
    await tick(); await tick();
    card('క్', ['క', 'ఖ']); ok($('tel-char').textContent === 'k', 'Lookalikes: క్ is k');
    opt('క్').click(); ok($('char-card').classList.contains('correct'), 'Lookalikes: క్ answers k');
  }
  {
    const h = load('alphabet/05_lookalikes.html'); const { d, $ } = h, G = h.game, L = h.w.LookalikeData;
    const opt = t => [...d.querySelectorAll('#kb-area .kb-btn')].find(b => b.textContent.replace(/rare$/, '') === t || b.dataset.text === t);
    G().put({ item: L.item('క'), options: ['క', 'క్', 'ఖ'].map(L.item) }); opt('క్').click();
    ok($('tel-char').textContent === '/k/' && $('char-card').classList.contains('correct') && d.querySelector('.kb-label').textContent === 'Which one makes this sound?', 'Lookalikes in IPA (for contrast): /k/ is answered by క or క్, and the question is about the sound');
  }

  /* ── Lookalike Builder ── */
  {
    const h = load('alphabet/04_lookalike-builder.html', ISO); const { w, d, $ } = h, D = w.TeluguData;
    const name = () => $('promptName').textContent, key = ch => [...d.querySelectorAll('.key')].find(b => b.dataset.ch === ch);
    const title = k => k.title.replace(' (the character shown)', '');
    ok(name() === 'a · vowel', 'Builder: the character shown is named in ISO (a · vowel)');
    ok(title(key('క')) === 'ka' && title(key('ట')) === 'ṭa' && title(key('ఆ')) === 'ā' && [...d.querySelectorAll('#kVowels .key, #kCons .key')].every(k => title(k) === D.letters.find(l => l.ch === k.dataset.ch).iso), 'Builder: every letter key\'s tooltip is its ISO spelling');
    ok([...d.querySelectorAll('#signs .key')].map(k => k.title).join(' | ').startsWith('vowel sign ā | vowel sign i | vowel sign ī') && d.querySelector('#signs .key[data-sign="్"]').title === 'no vowel (pollu)' && d.querySelector('#signs .key[data-sign="ం"]').title === 'vowel sign aṁ', 'Builder: sign keys say what the sign adds, in ISO');
    const typed = t => { $('other').value = t; $('otherPrompt').click(); return name(); };
    ok(typed('కా').startsWith('kā ·') && typed('క్ష').startsWith('kṣa ·') && typed('క్ప్త').startsWith('kpta ·') && typed('౫').startsWith('5 ·'), 'Builder: typed characters are named in ISO (kā, kṣa, kpta); a digit is still its number');
    ok(noSlash(name()) && [...d.querySelectorAll('.key')].every(k => noSlash(k.title)), 'Builder: no slashes anywhere');
  }

  /* ── Signs & Conjuncts reference ── */
  {
    const h = load('reference/02_signs-conjuncts.html', ISO); const { w, d } = h, D = w.TeluguData, SD = w.SignsConjunctsData;
    const heads = [...d.querySelectorAll('#chart thead th.s small')].map(s => s.textContent), rowsH = [...d.querySelectorAll('#chart tbody th.row small')].map(s => s.textContent);
    ok(heads.join(' ') === SD.SIGN_ORDER.map(s => D.signs.find(g => g.sign === s).isoSound).join(' ') && heads[0] === 'ā' && heads.includes('aṁ'), 'Signs & Conjuncts: column heads give what each sign adds, in ISO (ā … aṁ aḥ)');
    ok(rowsH[0] === 'ka' && rowsH.join(' ') === D.letters.filter(l => l.cat !== 'Vowel').map(l => l.iso).join(' '), 'Signs & Conjuncts: row heads spell each letter (ka kha …)');
    ok([...d.querySelectorAll('.cj .tag.ipa')].map(t => t.textContent).join(' ') === D.consonants.map(l => l.iso).join(' '), 'Signs & Conjuncts: conjunct cards carry the ISO spelling');
    ok([...heads, ...rowsH].every(noSlash), 'Signs & Conjuncts: no slashes');
  }

  /* ── Rosetta Stone: unaffected, it always shows both ── */
  {
    const a = load('reference/01_rosetta.html', ISO), b = load('reference/01_rosetta.html');
    const txt = h => h.d.getElementById('list').textContent;
    ok(txt(a) === txt(b) && /\/k\//.test(txt(a)) && /ISOka/.test(txt(a)), 'Rosetta Stone reads the same under either setting: IPA and ISO side by side');
  }

  /* ── Lesson template ── */
  {
    const h = load('lesson-template.html', ISO); const { w, d } = h, P = w.TeluguProgress;
    const cells = [...d.querySelectorAll('#panel-learn tbody tr')].map(r => r.children[1].textContent), eg = [...d.querySelectorAll('#panel-learn .example .ipa')].map(e => e.textContent);
    ok(cells.join(' ') === 'ka kha ga gha', 'Lesson template: the table column written with notation shows ka kha ga gha');
    ok(eg.join(' | ') === 'ka | kā | kāki', 'Lesson examples: a single character is read from the data (ka, kā); a word shows the iso the lesson gave (kāki)');
    d.getElementById('tab-practice').click();
    const btns = () => [...d.querySelectorAll('#d-opts button')], cur = () => d.getElementById('d-prompt').textContent;
    ok(btns().map(b => b.textContent).sort().join(' ') === 'ga gha ka kha', 'Lesson drill: the options are ISO spellings');
    const missed = cur(), isoOf = ch => w.TeluguData.letters.find(l => l.ch === ch);
    btns().find(b => b.dataset.ipa !== isoOf(missed).ipa).click();
    const m = P.misses().find(x => x.game === 'lesson-template');
    ok(d.getElementById('d-fb').textContent === '✗  ' + isoOf(missed).iso && m.ask === 'telugu' && h.shown(m).answer === isoOf(missed).iso, 'Lesson drill: feedback and the stored miss follow the notation');
  }
  {
    const h = load('lesson-template.html');
    ok([...h.d.querySelectorAll('#panel-learn .example .ipa')].map(e => e.textContent).join(' | ') === '/k/ | /kaː/ | /kaːki/' && [...h.d.querySelectorAll('#panel-learn tbody tr')].map(r => r.children[1].textContent).join(' ') === '/k/ /kʰ/ /ɡ/ /ɡʱ/', 'Lesson template in IPA (for contrast): /k/ /kaː/ /kaːki/, table /k/ …');
  }

  /* ── no page prints a sound without asking the notation ── */
  {
    const fs = require('fs'), path = require('path'), { SITE_DIR } = require('./config');
    const pages = ['alphabet/01_phonemes.html', 'alphabet/02_diacritics.html', 'alphabet/03_conjuncts.html', 'alphabet/04_lookalike-builder.html', 'alphabet/05_lookalikes.html', 'reference/02_signs-conjuncts.html', 'review.html', 'lesson-template.html'];
    const bad = [];
    pages.forEach(f => { const s = fs.readFileSync(path.join(SITE_DIR, f), 'utf8').split('<script>').pop();
      s.split('\n').forEach((ln, i) => { const code = ln.replace(/\/\/.*$/, '');
        if (/['"`]\/['"`]?\s*\+|\+\s*['"`]\/['"`]|`[^`]*\/\$\{(?!c\.spoken|cur\.spoken|r\.spoken)[^`]*\}\//.test(code)) bad.push(f + ':' + (i + 1));
        if (/textContent\s*=\s*[a-z.]*\.ipa\b|\$\{[a-z.]*\.(ipa|sound)\}/i.test(code) && !/dataset|data-ipa=/.test(code)) bad.push(f + ':' + (i + 1) + ' (prints .ipa)'); }); });
    ok(bad.length === 0, 'no page wraps a sound in slashes or prints .ipa/.sound itself; all go through TeluguData.notation (the "usually said" note aside) ' + bad.join(', '));
    ok(pages.every(f => /TeluguData\.notation|TD\.notation/.test(fs.readFileSync(path.join(SITE_DIR, f), 'utf8'))), 'each of those ' + pages.length + ' pages takes its notation from TeluguData.notation');
  }
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
