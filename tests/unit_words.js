const { SITE_DIR } = require('./config');
// Reading a whole word (TeluguData.syllables, notation.piece and notation.word), and the word list of the
// Words game (alphabet/words-data.js): 250 short words, each split into its characters and the sounds they spell.
const fs = require('fs'), path = require('path');
const D = require(path.join(SITE_DIR, 'telugu-data.js')), W = require(path.join(SITE_DIR, 'alphabet/words-data.js'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const IPA = D.notationFor('ipa'), ISO = D.notationFor('iso');
const split = t => { const s = D.syllables(t); return s && s.map(x => x.text).join(' · '); };
const spell = (t, N = IPA) => D.syllables(t).map(s => s.parts.map(p => N.piece(p)).join(' ')).join(' | ');
const said  = (t, N = IPA) => N.word(D.syllables(t));
const T = '̪', HOLDER = '◌';      // dental mark, the dotted circle a mark sits on

/* ── a word, split into the characters it is written with ── */
ok(split('అమ్మ') === 'అ · మ్మ' && split('పుస్తకం') === 'పు · స్త · కం' && split('స్త్రీ') === 'స్త్రీ' && split('ఉపాధ్యాయుడు') === 'ఉ · పా · ధ్యా · యు · డు' && split('దుఃఖం') === 'దుః · ఖం',
  'a word splits into its written characters; a conjunct stays with its vowel, ం and ః with the character they follow: ' + split('పుస్తకం'));
ok(D.syllables('పుస్తకం').every(s => typeof s.text === 'string' && Array.isArray(s.parts) && typeof s.ipa === 'string' && typeof s.iso === 'string') && D.syllables('పుస్తకం').map(s => s.text).join('') === 'పుస్తకం',
  'each character carries its text, its parts, and its sound in both notations; the texts add up to the word');

/* ── the sounds a character spells, in order ── */
ok(spell('అమ్మ') === 'ɐ | m m ɐ' && spell('పక్షి') === 'p ɐ | k ʂ i' && spell('కృషి') === 'k ru | ʂ i' && spell('ఐదు') === `ai | d${T} u` && spell('స్త్రీ') === `s t${T} ɾ iː`,
  'consonants first (a conjunct gives each of them; క్ష is k then ʂ), then the vowel; a consonant\'s own a counts: ' + spell('అమ్మ') + ' · ' + spell('పక్షి'));
ok(spell('పుస్తకం') === `p u | s t${T} ɐ | k ɐ m` && spell('దుఃఖం') === `d${T} u ${HOLDER}ʰ | kʰ ɐ m` && spell('కొంత') === `k o n | t${T} ɐ` && spell('అంగడి') === 'ɐ ŋ | ɡ ɐ | ɖ i',
  'ం and ః are sounds of their own, after the vowel; in IPA ః sits on a dotted circle and ం is the nasal it is said as: ' + spell('పుస్తకం') + ' · ' + spell('కొంత'));
ok(IPA.piece({ kind: 'm', item: D.signs.find(g => g.sign === 'ం') }) === 'ṁ' && ISO.piece({ kind: 'm', item: D.signs.find(g => g.sign === 'ం') }) === 'ṁ' && IPA.piece({ kind: 'm', item: D.signs.find(g => g.sign === 'ః') }) === `${HOLDER}ʰ`,
  'the ం key is ṁ in both notations, before a word places it; ః is ◌ʰ in IPA');
ok(spell('పుస్తకం', ISO) === 'p u | s t a | k a ṁ' && spell('దుఃఖం', ISO) === 'd u ḥ | kh a ṁ' && spell('జ్ఞానం', ISO) === 'j ñ ā | n a ṁ' && spell('కృషి', ISO) === 'k r̥ | ṣ i',
  'the same in ISO: ' + spell('పుస్తకం', ISO) + ' · ' + spell('జ్ఞానం', ISO));
{
  const kinds = t => D.syllables(t).map(s => s.parts.map(p => p.kind).join('')).join(' ');
  const [a, mma] = D.syllables('అమ్మ'), aa = D.syllables('ఆకా');
  ok(kinds('పుస్తకం') === 'cv ccv cvm' && kinds('అం') === 'vm' && kinds('స్త్రీ') === 'cccv', 'each part says what it is: c (consonant), v (vowel), m (ం or ః): ' + kinds('పుస్తకం'));
  ok(mma.parts[0].item === D.consonants.find(c => c.ch === 'మ') && mma.parts[0].key === 'm' && mma.parts[2].item === D.signs.find(g => g.sign === '') && mma.parts[2].key === 'ɐ',
    'a consonant part is its letter, a vowel part its sign (the consonant\'s own a is the sign with nothing to draw); the key is the item\'s ipa');
  ok(a.parts[0].item === mma.parts[2].item && aa[0].parts[0].item === aa[1].parts[1].item && aa[0].parts[0].key === 'aː', 'a vowel letter gives the sign of the same sound: అ is the a of మ, ఆ is the ā of కా');
  ok(D.syllables('అం')[0].parts[1].item === D.signs.find(g => g.sign === 'ం') && D.syllables('దుః')[0].parts[2].item === D.signs.find(g => g.sign === 'ః'), 'a mark part is its sign (ం, ః)');
}

/* ── the whole word's sound ── */
ok(said('అమ్మ') === 'ɐmmɐ' && said('పక్షి') === 'pɐkʂi' && said('పుస్తకం') === `pust${T}ɐkɐm` && said('కొంత') === `kont${T}ɐ` && said('దుఃఖం') === `d${T}uʰkʰɐm`,
  'notation.word() in IPA; ం is said as m at the end of a word and as the nasal of the next consonant inside one: ' + said('పుస్తకం') + ' · ' + said('కొంత'));
ok(said('కాంతి') === `kaːnt${T}i` && said('పండు') === 'pɐɳɖu' && said('అంగడి') === 'ɐŋɡɐɖi' && said('కొంచెం') === 'koɲtʃem' && said('సంబంధం') === `sɐmbɐnd${T}ʱɐm` && said('సింహం') === 'simɦɐm',
  'ం takes the place of the next stop (ŋ ɲ ɳ n m) and is m before any other sound (హ): ' + said('అంగడి') + ' · ' + said('కొంచెం') + ' · ' + said('సింహం'));
ok(said('అమ్మ', ISO) === 'amma' && said('పుస్తకం', ISO) === 'pustakaṁ' && said('కొంత', ISO) === 'koṁta' && said('కాంతి', ISO) === 'kāṁti' && said('దుఃఖం', ISO) === 'duḥkhaṁ' && said('ఉపాధ్యాయుడు', ISO) === 'upādhyāyuḍu',
  'and in ISO, where ం is ṁ and ః is ḥ after the vowel: ' + said('పుస్తకం', ISO) + ' · ' + said('ఉపాధ్యాయుడు', ISO));
ok(D.syllables('పుస్తకం').map(s => s.ipa).join('') === said('పుస్తకం') && D.syllables('పుస్తకం').map(s => s.iso).join(' ') === 'pu sta kaṁ', 'the word is its characters\' sounds, one after another: ' + D.syllables('పుస్తకం').map(s => s.iso).join(' '));

/* ── a final bare consonant, and text that is not a word ── */
{
  const bas = D.syllables('బస్');
  ok(bas.length === 2 && bas[1].parts.map(p => p.kind + ':' + p.key).join(' ') === 'c:s v:∅' && IPA.piece(bas[1].parts[1]) === '∅' && ISO.piece(bas[1].parts[1]) === '∅' && said('బస్') === 'bɐs' && said('బస్', ISO) === 'bas',
    'a final ్ gives the "no vowel" part (∅), which adds nothing to the sound: బస్ is ' + said('బస్'));
  ok(['', 'క1', '౧', 'abc', 'ాక', 'అా', '్క', 'క కా', 'క్', 'కాా'].map(t => D.syllables(t) === null).join() === 'true,true,true,true,true,true,true,true,false,true',
    'text that can\'t be read gives null: empty, a digit, Latin letters, a sign with no letter, a vowel letter with a sign, a space, two signs');
}

/* ── it agrees with read(), the reader of single characters ── */
{
  const one = t => { const s = D.syllables(t); return s && s.length === 1 ? s[0] : null; };
  const pairs = D.consonants.flatMap(c => D.signs.map(g => c.ch + g.sign));
  const bad = pairs.filter(t => { const s = one(t), r = D.read(t, { syllable: true, any: true }); return !s || !r || s.ipa !== r.ipa || s.iso !== r.iso; });
  ok(pairs.length === 37 * 19 && bad.length === 0, 'every consonant with every sign (' + pairs.length + ' syllables) reads the same through syllables() and read() ' + bad.slice(0, 5).join(' '));
  const cl = D.clusters.filter(c => { const s = one(c.glyph); return !s || s.ipa !== c.sound || s.iso !== c.iso || s.parts.slice(0, -1).some((p, i) => p.item !== c.parts[i]) || s.parts.length !== c.parts.length + 1; });
  ok(D.clusters.length === 92 && cl.length === 0, 'all 92 clusters: one character, the cluster\'s consonants in order, then ɐ; the same sound as the Conjuncts game shows ' + cl.map(c => c.glyph).join(' '));
  const vw = D.vowels.filter(l => { const s = one(l.ch); return !s || s.ipa !== l.ipa || s.iso !== l.iso; });
  ok(vw.length === 0, 'every vowel letter, అం and అః included, reads as the letter does ' + vw.map(l => l.ch).join(' '));
}

/* ── the order of a vowel keyboard (shared by Diacritics and Words) ── */
ok(D.LONG_MARK === 'ː' && D.shortThenLong(D.signs.filter(g => g.core)).map(g => g.ipa).join(' ') === 'ɐ aː i iː u uː e eː o oː ai au ru ruː ɐm ɐʰ ∅',
  'shortThenLong() puts each long vowel right after its short one and leaves the rest in order');
{ const few = D.signs.filter(g => ['aː', 'i', 'o'].includes(g.ipa)); ok(D.shortThenLong(few).map(g => g.ipa).join(' ') === 'i o aː', 'a long vowel whose short one is not in play goes at the end'); }

/* ── the word list ── */
const words = W.words, len = w => w.syllables.length;
ok(Array.isArray(words) && words.length === 250 && new Set(words.map(w => w.te)).size === 250 && Object.isFrozen(W) && words.every(Object.isFrozen), '250 words, no word twice');
{
  const by = {}; words.forEach(w => { by[len(w)] = (by[len(w)] || 0) + 1; });
  const mean = words.reduce((n, w) => n + len(w), 0) / words.length;
  ok(W.MAX_CHARACTERS === 5 && words.every(w => len(w) >= 1 && len(w) <= 5) && JSON.stringify(by) === '{"1":11,"2":124,"3":88,"4":21,"5":6}', 'no word is longer than 5 characters: ' + JSON.stringify(by));
  ok(mean > 2.4 && mean < 2.7, 'they average about two and a half characters: ' + mean.toFixed(2));
}
ok(words.every(w => JSON.stringify(w.syllables.map(s => [s.text, s.ipa, s.iso])) === JSON.stringify(D.syllables(w.te).map(s => [s.text, s.ipa, s.iso])) && w.sounds === w.syllables.reduce((n, s) => n + s.parts.length, 0)),
  'each word carries its characters as syllables() gives them, and how many sounds that is');
ok(W.get('అమ్మ').en === 'mother' && W.get('అమ్మ').sounds === 4 && W.get('పుస్తకం').en === 'book' && W.get('పుస్తకం').sounds === 8 && W.get('nope') === null, 'get(word) finds a word (అమ్మ: mother, 4 sounds); null when it is not listed');
{
  const bad = words.filter(w => typeof w.en !== 'string' || !w.en || w.en !== w.en.trim() || /[.!?]$/.test(w.en) || !/^[A-Za-z][A-Za-z ,()'-]*$/.test(w.en) || w.en.length > 28);
  ok(bad.length === 0, 'every word has a short English meaning, with no period ' + bad.map(w => w.te + '=' + w.en).join(' '));
  const BRITISH = /\b(colour|grey|favour|neighbour|honour|centre|theatre|aubergine|maize|yoghurt|aeroplane)\b/i;
  ok(words.every(w => !BRITISH.test(w.en)) && W.get('పెరుగు').en === 'yogurt', 'meanings are in American English (పెరుగు: yogurt)');
}
{
  // The game's keyboards hold the 34 usual consonants and the 14 vowel sounds plus ం ః: no extra letters, no "no vowel" key
  const coreC = new Set(D.pool(D.consonants, false)), coreV = new Set(D.signs.filter(g => g.core && g.sign !== D.VIRAMA));
  const bad = words.filter(w => w.syllables.some(s => s.parts.some(p => !(p.kind === 'c' ? coreC.has(p.item) : coreV.has(p.item)))));
  ok(coreC.size === 34 && coreV.size === 16 && bad.length === 0, 'every sound of every word is on the game\'s keyboards (no ఱ, no extra signs, no word ending in a bare consonant) ' + bad.map(w => w.te).join(' '));
  const used = new Set(words.flatMap(w => w.syllables.flatMap(s => s.parts.map(p => p.item))));
  const unusedC = [...coreC].filter(c => !used.has(c)).map(c => c.ch).join(' '), unusedV = [...coreV].filter(g => !used.has(g)).map(g => g.ipa).join(' ');
  ok(unusedC === 'ఙ ఛ ఝ ఢ' && unusedV === 'ruː', 'the list practices every vowel sound but the long vocalic r, both ం and ః, and every consonant but ఙ ఛ ఝ ఢ: unused ' + unusedC + ' · ' + unusedV);
  const sounds = words.map(w => w.sounds);
  ok(Math.max(...sounds) === 11 && Math.min(...sounds) === 1 && sounds.reduce((a, b) => a + b) === 1408, 'from 1 sound (ఈ) to 11 (ధన్యవాదాలు); 1408 in all');
}
ok(['తెలుగు', 'భాష', 'అక్షరం', 'పదం', 'అర్థం', 'ఉచ్చారణ', 'వర్ణమాల'].every(t => W.get(t)) && W.get('తెలుగు').en === 'Telugu' && W.get('పదం').en === 'word',
  'the words about the language itself are in it (తెలుగు, భాష, అక్షరం, పదం …)');

/* ── the file ── */
{
  const src = fs.readFileSync(path.join(SITE_DIR, 'alphabet/words-data.js'), 'utf8'), page = fs.readFileSync(path.join(SITE_DIR, 'alphabet/04_words.html'), 'utf8');
  ok(!fs.existsSync(path.join(SITE_DIR, 'words-data.js')) && /<script src="\.\.\/telugu-data\.js"><\/script>\s*<script src="words-data\.js"><\/script>/.test(page), 'the list sits beside the page that uses it (alphabet/words-data.js), loaded after telugu-data.js');
  ok(!/\bipa\s*:|\biso\s*:|\/[a-zʰː]+\//.test(src.replace(/\/\*[\s\S]*?\*\//, '')), 'the file holds words and meanings only: no sound is typed in by hand');
  const modern = ['నాన్న', 'ఎలా', 'ఉంది', 'తెలుసు', 'కావాలి', 'ధన్యవాదాలు', 'ఉదాహరణ', 'భారతదేశం', 'సంస్కృతి'];
  ok(/WHERE THE WORDS COME FROM/.test(src) && /Brown/.test(src) && /241 of the 250/.test(src) && modern.every(t => src.split('*/')[0].includes(t) && W.get(t)) && /not from a dictionary/.test(src),
    'its header says how the words were checked, and names the nine whose meanings are not from a dictionary');
  // a bad row stops the page: unreadable, too long, listed twice
  const load = list => { const m = { exports: {} }; new Function('module', 'require', 'window', src.replace(/const LIST = \{[\s\S]*?\n  \};/, 'const LIST = ' + list + ';'))(m, () => D, undefined); return m.exports; };
  const throws = list => { try { load(list); return ''; } catch (e) { return e.message; } };
  ok(load("{ 'అమ్మ': 'mother' }").words.length === 1 && /cannot read the word క1/.test(throws("{ 'క1': 'x' }")) && /longer than 5 characters/.test(throws("{ 'కకకకకక': 'x' }")) && /has no meaning/.test(throws("{ 'అమ్మ': '' }")),
    'a word that can\'t be read, is too long, or has no meaning stops the page with an error naming it');
}
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
