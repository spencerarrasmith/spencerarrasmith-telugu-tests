const { SITE_DIR } = require('./config');
const D = require((SITE_DIR + '/telugu-data.js'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const core = a => D.pool(a, false);
ok(D.letters.length === 56 && core(D.letters).length === 51, 'letters: 56 total, 51 in the default set');
ok(D.vowels.length === 18 && core(D.vowels).length === 16, 'vowels: 16 in the book + ఌ ౡ extra');
ok(core(D.consonants).length + core(D.conjunctLetters).length === 35, 'book consonants: 34 single + క్ష = 35');
ok(D.letters.filter(l => !l.inBook).map(l => l.ch).join('') === 'ఌౡౘౙఱ', 'extra letters are exactly ఌ ౡ ౘ ౙ ఱ');
ok(D.signs.filter(s => !s.inBook).map(s => s.ipa).length === 2 && core(D.signs).length === 17, 'signs: 19 total, ౢ ౣ extra, 17 default');
ok(D.letters.filter(l => l.rare && l.inBook).map(l => l.ch).join(' ') === 'ౠ అః ఙ', 'ౠ అః ఙ are rare AND in the default set');
ok(['ఋ', 'ఞ'].every(ch => !D.letters.find(l => l.ch === ch).rare) && !D.signs.find(g => g.sign === 'ృ').rare && D.signs.find(g => g.sign === 'ః').rare, 'ఋ ఞ and the sign ృ are not rare; the sign ః is');
ok(D.letters.every(l => l.core === l.inBook) && D.signs.every(s => s.core === s.inBook), 'core === inBook for letters and signs');
ok(D.clusters.length === 92 && core(D.clusters).length === 83, 'clusters: 92 total, 83 default');
ok(D.clusters.filter(c => c.rare).length === 9 && D.clusters.every(c => c.core === (c.inBook && !c.rare)), '9 rare clusters; core = inBook && !rare');
const j = D.clusters.find(c => c.glyph === 'జ్ఞ');
ok(j && j.sound === 'dʒɲɐ' && j.spoken === 'ɡɲɐ' && j.core, 'జ్ఞ: written /dʒɲɐ/, spoken /ɡɲɐ/, in default set');
ok(D.clusters.find(c => c.glyph === 'క్ష').spoken === null, 'క్ష cluster has no spoken note');
const cls = g => D.clusters.find(c => c.glyph === g).classes;
ok(cls('ఙ్క') === 'Nasal + Velar' && cls('క్ష') === 'Velar + Fricative' && cls('క్క') === 'Velar + Velar' && cls('జ్ఞ') === 'Palatal + Nasal' && cls('న్ద్ర') === 'Nasal + Dental + Approx.', 'cluster classes: each consonant\'s class in order (ఙ్క → Nasal + Velar)');
const KB = D.letterGroups.map(g => g.lbl);
ok(D.clusters.every(c => c.classes.split(' + ').length === c.parts.length && c.classes.split(' + ').every((k, i) => k === ('ఙఞణనమ'.includes(c.parts[i].ch) ? 'Nasal' : c.parts[i].cat) && (k === 'Nasal' || KB.includes(k)))), 'every cluster: one class per consonant; the five nasals are "Nasal", the rest their keyboard group');
ok(D.clusters.every(c => !/[\u0C00-\u0C7F]/.test(c.classes) && !/\(|ya|ra\b|la\b|va\b/.test(c.classes)) && D.clusters.some(c => /[\u0C00-\u0C7F]/.test(c.cat)), 'classes never name a letter (the set name, cat, sometimes does: "+ య (ya)")');
ok(new Set(D.clusters.map(c => c.sound)).size === D.clusters.length, 'no two clusters are written with the same sound (so a sound has one answer in the reverse game)');
ok(D.pool(D.letters, true).length === 56 && D.pool(D.letters, true) === D.letters, 'pool(items, true) returns everything');
ok(D.letterGroups.map(g => g.lbl).join() === 'Vowels,Velar,Palatal,Retroflex,Dental,Labial,Approx.,Fricative,Conjunct', 'keyboard groups in order');
ok(D.letterGroups.reduce((n, g) => n + g.ipa.length, 0) === 56, 'every letter is on the keyboard once');
ok(D.signs.find(s => s.ipa === '∅').sound === '' && D.signs.find(s => s.sign === '').sound === 'ɐ' && D.INHERENT === 'ɐ', 'pure consonant sounds as nothing; no-sign sounds "ɐ" (INHERENT)');
ok(D.digits.length === 10 && D.digits.map(g => g.ch).join('') === '౦౧౨౩౪౫౬౭౮౯' && D.digits.every((g, n) => g.value === n && g.kind === 'digit'), 'digits: ౦–౯ with values 0–9');
ok(D.letters.every(l => !D.digits.some(g => g.ch === l.ch)) && D.pool(D.letters, true).length === 56, 'digits are a set of their own, not letters');
/* ── ISO 15919 alongside IPA ── */
const L1 = ch => D.letters.find(l => l.ch === ch), G1 = sg => D.signs.find(g => g.sign === sg);
ok(D.letters.every(l => typeof l.iso === 'string' && l.iso && typeof l.isoStem === 'string' && l.isoStem), 'every letter has an ISO spelling and stem');
ok(D.vowels.map(l => l.iso).join(' ') === 'a ā i ī u ū r̥ r̥̄ l̥ l̥̄ e ē ai o ō au aṁ aḥ', 'vowels in ISO: ' + D.vowels.map(l => l.iso).join(' '));
ok(D.consonants.map(l => l.isoStem).join(' ') === 'k kh g gh ṅ c ch j jh ñ ts dz ṭ ṭh ḍ ḍh ṇ ḷ ṟ t th d dh n p ph b bh m y r l v ś ṣ s h', 'consonant stems in ISO, in keyboard order');
ok(D.consonants.every(l => l.iso === l.isoStem + 'a') && D.vowels.every(l => l.iso === l.isoStem) && L1('క').iso === 'ka' && L1('క్ష').iso === 'kṣa' && L1('క్ష').isoStem === 'kṣ', 'a consonant letter is spelled with its own a (క ka, క్ష kṣa); a vowel is its stem');
ok(new Set(D.letters.map(l => l.iso)).size === 56 && new Set(D.letters.map(l => l.ipa)).size === 56, 'no two letters share a spelling, in either notation');
ok(D.signs.map(g => g.iso).join(',') === 'a,i,u,e,o,ā,ī,ū,ē,ō,ai,au,r̥,r̥̄,l̥,l̥̄,ṁ,ḥ,' && D.signs.map(g => g.isoSound).join(',') === 'a,i,u,e,o,ā,ī,ū,ē,ō,ai,au,r̥,r̥̄,l̥,l̥̄,aṁ,aḥ,', 'signs: own spelling (ం ṁ) and what they add to a syllable (ం aṁ, after the consonant\'s a); nothing for the pollu');
ok([...D.letters, ...D.signs].every(x => x.iso === x.iso.normalize('NFC')) && L1('ౠ').iso === 'r̥̄' && D.RING === '̥' && D.MACRON === '̄', 'ISO strings are NFC; the vocalic letters use ring below (+ macron)');
ok(D.clusters.every(c => c.iso === c.parts.map(p => p.isoStem).join('') + 'a') && cls && D.clusters.find(c => c.glyph === 'క్ష').iso === 'kṣa' && D.clusters.find(c => c.glyph === 'జ్ఞ').iso === 'jña' && D.clusters.find(c => c.glyph === 'ష్ట్ర').iso === 'ṣṭra', 'clusters in ISO: the stems joined, then a (క్ష kṣa, జ్ఞ jña, ష్ట్ర ṣṭra)');
ok(new Set(D.clusters.map(c => c.iso)).size === D.clusters.length && D.clusters.every(c => c.glyph === 'క్ష' || c.glyph === 'త్స' || !D.letters.some(l => l.iso === c.iso)), 'no two clusters share an ISO spelling, and none is spelled like a single letter (క్ష is both, by design; త్స shares tsa with ౘ for now)');
ok(L1('ౘ').iso === 'tsa' && L1('ౙ').iso === 'dza' && D.clusters.find(c => c.glyph === 'త్స').iso === 'tsa' && L1('ౘ').ipa === 'ts' && L1('ౙ').ipa === 'dz', 'ౘ ౙ: ts · tsa and dz · dza (త్స is also tsa; they are never in one game)');

/* ── notation: which of the two a page shows ── */
const NI = D.notationFor('iso'), NP = D.notationFor('ipa');
ok(D.notation.id === 'ipa' && D.notation.name === 'IPA' && Object.isFrozen(D.notation), 'default notation is IPA (no settings.js loaded here)');
ok(NP.letter(L1('క')) === 'k' && NI.letter(L1('క')) === 'ka' && NP.letter(L1('ఆ')) === 'aː' && NI.letter(L1('ఆ')) === 'ā', 'letter(): క k · ka, ఆ aː · ā');
ok(NP.part(L1('క')) === 'k' && NI.part(L1('క')) === 'k' && NI.part(L1('క్ష')) === 'kṣ', 'part(): a consonant as a piece is bare in both (k, kṣ)');
ok(NP.sign(G1('ా')) === 'aː' && NI.sign(G1('ా')) === 'ā' && NI.sign(G1('ం')) === 'aṁ' && NP.sign(G1('్')) === '' && NI.sign(G1('్')) === '' && NI.sign(G1('')) === 'a', 'sign(): what it adds (ా aː · ā, ం … aṁ, pollu nothing, no sign a)');
ok(NP.syllable(L1('క'), G1('ా')) === 'kaː' && NI.syllable(L1('క'), G1('ా')) === 'kā' && NI.syllable(L1('క'), G1('')) === 'ka' && NI.syllable(L1('క'), G1('్')) === 'k' && NI.syllable(L1('క'), G1('ం')) === 'kaṁ' && NI.syllable(L1('క్ష'), G1('ై')) === 'kṣai', 'syllable(): కా kaː · kā, క ka, క్ k, కం kaṁ, క్షై kṣai');
const KS = D.clusters.find(c => c.glyph === 'క్ష');
ok(NP.cluster(KS) === 'kʂɐ' && NP.inherent === 'ɐ' && NI.inherent === 'a' && NI.cluster(KS) === 'kṣa' && NP.of({ ipa: 'x', iso: 'y' }) === 'x' && NI.of({ ipa: 'x', iso: 'y' }) === 'y', 'cluster() and of()');
ok(NP.wrap('k') === '/k/' && NI.wrap('ka') === 'ka' && NI.name === 'ISO' && NI.id === 'iso', 'wrap(): IPA between slashes, ISO plain');
ok(NP.html('k') === '<span class="sl">/</span>k<span class="sl">/</span>' && NI.html('ka') === 'ka' && NI.html('<b>') === '&lt;b&gt;' && NP.html('<') === '<span class="sl">/</span>&lt;<span class="sl">/</span>', 'html(): the card face, escaped; slashes only for IPA');
ok(D.notationFor('nonsense').id === 'ipa' && D.notationFor().id === 'ipa', 'an unknown notation id means IPA');
(() => { const fs = require('fs'), path = require('path'), { JSDOM } = require('jsdom'); const rd = f => fs.readFileSync(path.join(SITE_DIR, f), 'utf8');
  const mk = pre => new JSDOM(`<script>${pre}</script><script>${rd('settings.js')}</script><script>${rd('telugu-data.js')}</script>`, { runScripts: 'dangerously', url: 'http://localhost/' }).window;
  ok(mk('').TeluguData.notation.id === 'ipa' && mk(`localStorage.setItem('telugu.settings.v1','{"notation":"iso"}')`).TeluguData.notation.id === 'iso', 'with settings.js loaded first, TeluguData.notation is the reader\'s choice');
})();

/* ── read(): both spellings of any character ── */
const rd = (t, o) => { const r = D.read(t, o); return r ? r.ipa + ' ' + r.iso : null; };
ok(rd('క') === 'k ka' && rd('క', { syllable: true }) === 'kɐ ka' && rd('అ') === 'ɐ a' && rd('అ', { syllable: true }) === 'ɐ a' && rd('అం') === 'ɐm aṁ', 'read: a letter (క k · ka); as a syllable క is kɐ · ka; vowels unchanged');
ok(rd('కా') === 'kaː kā' && rd('క్') === 'k k' && rd('కం') === 'kɐm kaṁ' && rd('కృ') === 'kru kr̥', 'read: letter + sign (కా, క్, కం on its own is kɐm, కృ is kru)');
ok(rd('క్ష') === 'kʂ kṣa' && rd('క్ష', { syllable: true }) === 'kʂɐ kṣa' && rd('క్షా') === 'kʂaː kṣā', 'read: క్ష is the letter (kʂ) unless read as a syllable (kʂɐ)');
ok(rd('క్య') === 'kjɐ kya' && rd('క్యా') === 'kjaː kyā' && D.read('జ్ఞ').spoken === 'ɡɲɐ' && D.read('క్య').spoken === null && D.read('జ్ఞా').spoken === null, 'read: clusters, with or without a sign; spoken only for the bare cluster that has one');
ok(D.read('కా').listed && D.read('క్య').listed && rd('క్ప్త') === null && rd('క్ప్త', { any: true }) === 'kpt̪ɐ kpta' && D.read('క్ప్త', { any: true }).listed === false && rd('క్ప్తి', { any: true }) === 'kpt̪i kpti' && rd('క్ప్', { any: true }) === 'kp kp', 'read: a stack outside the cluster list only with {any}, and marked unlisted');
ok([['ఆా'], ['కాి'], ['౫'], ['a'], [''], ['ా'], ['కఖ', { any: true }], ['క్్ప', { any: true }], ['౫', { any: true }]].every(([t, o]) => D.read(t, o) === null), 'read: null for a vowel with a sign, two signs, digits, Latin, a bare sign, letters not joined by ్');
ok(D.read('ఙ').rare && D.read('ఱ').core === false && D.read('కౢ').core === false && D.read('కౄ').rare && !D.read('కృ').rare && D.read('క').core && !D.read('క').rare, 'read: rare and core carried from the letter and the sign');
ok(D.letters.every(l => { const r = D.read(l.ch); return r && r.ipa === l.ipa && r.iso === l.iso; }) && D.clusters.every(c => { const r = D.read(c.glyph, { syllable: true }); return r && r.ipa === c.sound && r.iso === c.iso; }), 'read agrees with the data for every letter and (as a syllable) every cluster');
ok(D.consonants.every(c => D.signs.every(g => { const r = D.read(c.ch + g.sign, { syllable: true }); return r && r.ipa === NP.syllable(c, g) && r.iso === NI.syllable(c, g); })), 'read agrees with syllable() for every consonant + sign (' + D.consonants.length * D.signs.length + ' syllables)');

/* ── no keyboard here: the games draw theirs with telugu-keyboard.js (e2e_board) ── */
(() => { const fs = require('fs'), path = require('path'); const src = fs.readFileSync(path.join(SITE_DIR, 'telugu-data.js'), 'utf8');
  ok(!('buildKeyboard' in D) && !/buildKeyboard/.test(src), 'telugu-data.js no longer builds a keyboard: the games lay theirs out as the Telugu keyboard (TeluguKeyboard.board)');
})();
/* ── sounds settled in the Nov 2026 review ── */
ok(L1('అ').ipa === 'ɐ' && L1('ఆ').ipa === 'aː' && L1('ర').ipa === 'ɾ' && ['ఋ', 'ౠ', 'ఌ', 'ౡ'].map(ch => L1(ch).ipa).join(' ') === 'ru ruː lu luː' && L1('అః').ipa === 'ɐʰ',
  'అ ɐ (ఆ aː), ర ɾ, ఋ ౠ ఌ ౡ ru ruː lu luː, అః ɐʰ');
ok(D.longOf('ɐ') === 'aː' && D.longOf('i') === 'iː' && D.longOf('ru') === 'ruː' && D.longOf('aː') === null && D.longOf('ai') === null,
  'longOf(): each short vowel\'s long partner, written out (ɐ → aː)');
ok(D.ANUSVARA === 'ం' && D.nasalBefore(L1('గ')) === 'ŋ' && D.nasalBefore(L1('చ')) === 'ɲ' && D.nasalBefore(L1('డ')) === 'ɳ' && D.nasalBefore(L1('ద')) === 'n' && D.nasalBefore(L1('బ')) === 'm' && D.nasalBefore(L1('స')) === 'm' && D.nasalBefore(undefined) === 'm',
  'nasalBefore(): ం is the nasal of the next stop (ŋ ɲ ɳ n m), m before anything else or nothing');
ok(Object.isFrozen(D), 'export is frozen');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
