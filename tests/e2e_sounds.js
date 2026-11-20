// Sound Charts (reference/03_sound-charts.html): Telugu and English sounds on the IPA vowel chart and consonant grid.
// The page draws from telugu-data.js (letters, sounds, notation) and sound-charts-data.js (where each sound sits).
const load = require('./harness');
const fs = require('fs'), path = require('path'), { SITE_DIR } = require('./config');
const PAGE = 'reference/03_sound-charts.html';
const h = load(PAGE), { w, d, ok, $ } = h;
const TD = w.TeluguData, SD = w.SoundChartsData;
const raw = fs.readFileSync(path.join(SITE_DIR, PAGE), 'utf8');
const all = (sel, root = d) => [...root.querySelectorAll(sel)];
const text = e => e.textContent.replace(/\s+/g, ' ').trim();
const click = id => { $(id).click(); };

ok(d.title === 'Sound Charts' && /\.\.\/game\.css/.test(raw) && /\.\.\/reference\.css/.test(raw) && text(d.querySelector('header.g-header .g-title')) === 'Sound Charts', 'titled, uses the shared stylesheets and header');
ok(/<script src="\.\.\/settings\.js"><\/script>\s*<script src="\.\.\/telugu-data\.js"><\/script>\s*<script src="sound-charts-data\.js"><\/script>/.test(raw), 'loads settings.js, telugu-data.js, then its own data file');
ok($('accent').textContent === SD.ENGLISH && SD.ENGLISH === 'General American', 'says which English it compares with: ' + SD.ENGLISH);

/* ── the data: every sound has exactly one place ── */
const consLetters = TD.letters.filter(l => l.cat !== 'Vowel'), vowelLetters = TD.letters.filter(l => l.cat === 'Vowel');
const offGridTe = SD.OFF_GRID.filter(o => o.ch).map(o => o.ch);
ok(SD.teluguConsonants.length + offGridTe.length === consLetters.length && consLetters.every(l => offGridTe.includes(l.ch) || SD.WHERE[l.ipa]), 'every Telugu consonant has a box on the grid (' + SD.teluguConsonants.length + '), క్ష aside, which is two sounds');
const offChart = SD.teluguOffChart.flatMap(o => o.letters);
ok(SD.teluguVowels.length + SD.teluguDiphthongs.length + offChart.length === vowelLetters.length && new Set([...SD.teluguVowels, ...SD.teluguDiphthongs, ...offChart].map(l => l.ch)).size === vowelLetters.length,
  'every Telugu vowel letter is in exactly one place: on the chart (' + SD.teluguVowels.length + '), a diphthong (' + SD.teluguDiphthongs.length + ') or listed as off the chart (' + offChart.length + ')');
ok(SD.teluguVowels.every(l => SD.SPOTS[SD.quality(l.ipa)]) && SD.ENGLISH_VOWELS.every(([ipa]) => SD.SPOTS[ipa]) && SD.ENGLISH_CONSONANTS.every(([ipa]) => SD.WHERE[ipa]), 'every charted vowel has a spot and every English consonant a box');
ok(SD.PLACES.map(p => p[0]).join() === 'Bilabial,Labiodental,Linguolabial,Dental,Alveolar,Postalveolar,Retroflex,Palatal,Velar,Uvular,Pharyngeal,Glottal', 'places run lips → throat, as on the IPA chart');
ok(SD.MANNERS.join() === 'Nasal,Plosive,Affricate,Sibilant Fricative,Non-sibilant Fricative,Approximant,Tap or Flap,Trill,Lateral Fricative,Lateral Approximant,Lateral Tap or Flap', 'manners follow the IPA chart, with a row for affricates');
ok(Object.values(SD.WHERE).every(([p, m, v]) => SD.PLACES.some(x => x[0] === p) && SD.MANNERS.includes(m) && typeof v === 'boolean'), 'every box names a real column and row');
ok([...SD.ENGLISH_CONSONANTS, ...SD.ENGLISH_VOWELS, ...SD.DIPHTHONGS.en].every(([, wd]) => wd.split('|').length === 3 && wd.split('|')[1].length > 0), 'every English sound has a key word with the letters that spell it marked');
const phonemes = SD.ENGLISH_CONSONANTS.filter(e => !e[2]).map(e => e[0]), variants = SD.ENGLISH_CONSONANTS.filter(e => e[2]);
ok(phonemes.length === 24 && phonemes.slice().sort().join(' ') === ['m', 'n', 'ŋ', 'p', 'b', 't', 'd', 'k', 'ɡ', 'tʃ', 'dʒ', 's', 'z', 'ʃ', 'ʒ', 'f', 'v', 'θ', 'ð', 'h', 'ɹ', 'j', 'w', 'l'].sort().join(' '), 'all 24 consonants English tells apart are on the grid, w included');
ok(variants.map(e => e[0] + '<' + e[2]).join(' ') === 'pʰ<p tʰ<t kʰ<k ʔ<t ɾ<t ɫ<l' && variants.every(e => phonemes.includes(e[2])), 'plus six common variants, each tied to its phoneme: pʰ tʰ kʰ (pin tin kin), ʔ (button), ɾ (butter), ɫ (full)');

/* ── vowel chart ── */
const svg = d.querySelector('#vowel-chart svg.vc');
const pts = svg.querySelector('polygon.frame').getAttribute('points').split(' ').map(p => p.split(',').map(Number));   // front-close, back-close, back-open, front-open
ok(pts.length === 4 && pts[0][1] === pts[1][1] && pts[2][1] === pts[3][1] && pts[1][0] === pts[2][0] && pts[3][0] > pts[0][0] && pts[3][0] < pts[2][0],
  'the chart is the IPA trapezoid: level top and bottom, upright back edge, front edge sloping in toward the bottom');
const spot = ipa => svg.querySelector(`.spot[data-ipa="${ipa}"]`);
const dot = ipa => { const c = spot(ipa).querySelector('circle:last-of-type') || spot(ipa).querySelector('circle'); return [Number(c.getAttribute('cx')), Number(c.getAttribute('cy'))]; };
const near = (a, b) => Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01;
ok(near(dot('i'), pts[0]) && near(dot('u'), pts[1]) && near(dot('ɑ'), pts[2]), 'i sits on the top-left corner, u on the top-right, ɑ on the bottom-right');
ok(near(dot('a'), [(pts[2][0] + pts[3][0]) / 2, pts[2][1]]) && dot('ɐ')[0] > dot('æ')[0] && dot('ɐ')[0] < dot('ʌ')[0] && dot('ɐ')[1] < dot('a')[1] && dot('ɐ')[1] > dot('ə')[1], 'Telugu ఆ (a) sits in the middle of the bottom edge, open central; అ (ɐ) just above it, below ə');
ok(dot('e')[0] > dot('i')[0] && dot('e')[0] < dot('ɛ')[0] && dot('e')[1] < dot('ɛ')[1] && near([dot('o')[0], 0], [pts[1][0], 0]), 'e follows the sloping front edge down; o stays on the upright back edge');
const kind = e => ['both', 'te', 'en'].find(k => e.classList.contains(k));
ok(all('.spot', svg).map(s => s.dataset.ipa + ':' + kind(s)).join(' ') === 'i:both u:both ɪ:en ʊ:en e:te o:te ə:en ɛ:en ʌ:en ɔ:en æ:en ɐ:te a:te ɑ:en', 'i and u are shared; e, o, ɐ, and a are Telugu only; the rest English only');
ok(text(spot('i').querySelector('text')) === 'ఇ/i/ ఈ/iː/' && text(spot('ɐ').querySelector('text')) === 'అ/ɐ/' && text(spot('a').querySelector('text')) === 'ఆ/aː/', 'a short and long vowel share one spot, each with its sound beside it (అ ఆ, which differ in quality, have one each): ' + text(spot('i').querySelector('text')));
ok(text(spot('i').querySelectorAll('text')[1]) === '/i/feet' && spot('i').querySelector('.t-b').textContent === 'ee' && text(spot('ɪ').querySelector('text')) === '/ɪ/sit', 'an English vowel shows its IPA and a key word (feet, with ee marked)');
ok(spot('i').querySelectorAll('circle').length === 2 && spot('e').querySelectorAll('circle.dot-te').length === 1 && spot('ɪ').querySelectorAll('circle.dot-en').length === 1, 'filled dot for Telugu, ring for English, both where the languages share a vowel');
ok(all('.axis', svg).map(t => t.textContent).join() === 'Front,Central,Back,Close,Close-mid,Open-mid,Open', 'the axes are labeled');
const telIn = sel => all(sel + ' .tel').map(e => e.dataset.ch).join(' '), engIn = sel => all(sel + ' .eng').map(e => e.dataset.ipa).join(' ');
ok(telIn('#diphthongs') === 'ఐ ఔ' && engIn('#diphthongs') === 'eɪ aɪ ɔɪ aʊ oʊ', 'diphthongs are listed under the chart: ఐ ఔ and the five English ones');
ok(all('#vowel-rows .offchart').length === 3 && telIn('#vowel-rows .offchart') === 'ఋ ౠ ఌ ౡ అం అః' && engIn('#vowel-rows .offchart') === 'ɚ' && all('#vowel-rows .offchart .why').every(e => e.textContent.length > 15),
  'letters taught as vowels that are not vowel positions (ఋ ౠ ఌ ౡ, said ru ruː lu luː; అం అః) and English ɚ are listed with the reason');
ok(/r or l followed by u/.test(all('#vowel-rows .offchart .why')[0].textContent), 'ఋ ౠ ఌ ౡ are explained as r or l followed by u');

/* ── consonant grid ── */
const places = () => all('#cons thead tr:last-child th').map(t => t.textContent), manners = () => all('#cons tbody th.row').map(t => t.textContent);
ok(places().join() === SD.PLACES.map(p => p[0]).join() && manners().join() === SD.MANNERS.join(), 'the full grid: 12 places across, 11 manners down');
ok(all('#cons thead tr.groups th[colspan]').map(t => t.textContent + t.colSpan).join() === 'Labial3,Coronal4,Dorsal3,Laryngeal2', 'places are grouped Labial / Coronal / Dorsal / Laryngeal');
const boxOf = e => { const td = e.closest('td'); return td.dataset.place + ' / ' + td.parentElement.dataset.manner; };
const ph = ipa => all('#cons .ph').filter(p => p.dataset.ipa === ipa);
ok(SD.teluguConsonants.every(l => { const c = all('#cons .tel').filter(e => e.dataset.ch === l.ch); return c.length === 1 && boxOf(c[0]) === SD.WHERE[l.ipa][0] + ' / ' + SD.WHERE[l.ipa][1]; }), 'each of the ' + SD.teluguConsonants.length + ' Telugu consonants is drawn once, in its own box');
ok(SD.ENGLISH_CONSONANTS.every(([ipa]) => { const c = all('#cons .eng').filter(e => e.dataset.ipa === ipa); return c.length === 1 && boxOf(c[0]) === SD.WHERE[ipa][0] + ' / ' + SD.WHERE[ipa][1]; }), 'each of the ' + SD.ENGLISH_CONSONANTS.length + ' English consonants is drawn once, in its own box');
const tel = ch => all('#cons .tel').find(e => e.dataset.ch === ch), eng = ipa => all('#cons .eng').find(e => e.dataset.ipa === ipa);
ok(boxOf(tel('త')) === 'Dental / Plosive' && boxOf(tel('ట')) === 'Retroflex / Plosive' && boxOf(eng('t')) === 'Alveolar / Plosive', 'English t sits between Telugu త (dental) and ట (retroflex)');
ok(boxOf(eng('w')) === 'Velar / Approximant' && boxOf(eng('ɾ')) === 'Alveolar / Tap or Flap' && boxOf(eng('ʔ')) === 'Glottal / Plosive' && boxOf(eng('ɫ')) === boxOf(tel('ల')) && boxOf(eng('tʰ')) === boxOf(eng('t')), 'w is in the Velar column; the tap, the glottal stop, dark l, and aspirated t each have their box');
ok(boxOf(tel('చ')) === 'Postalveolar / Affricate' && boxOf(tel('వ')) === 'Labiodental / Approximant' && boxOf(eng('v')) === 'Labiodental / Non-sibilant Fricative' && boxOf(tel('హ')) === 'Glottal / Non-sibilant Fricative' && boxOf(tel('ళ')) === 'Retroflex / Lateral Approximant', 'చ, వ, v, హ, and ళ are where the IPA chart puts them');
ok(all('#cons .ph.both').map(p => p.dataset.ipa).sort().join(' ') === ['k', 'kʰ', 'ɡ', 'ŋ', 'tʃ', 'dʒ', 'n', 'p', 'pʰ', 'b', 'm', 'j', 'l', 'ʃ', 's', 'ɾ'].sort().join(' '), '16 consonants are shared: k kʰ ɡ ŋ tʃ dʒ n p pʰ b m j l ʃ s, and the tap ɾ (ర, butter)');
ok(all('#cons .ph.en').map(p => p.dataset.ipa).sort().join(' ') === ['t', 'tʰ', 'd', 'z', 'ʒ', 'f', 'v', 'θ', 'ð', 'h', 'ɹ', 'w', 'ʔ', 'ɫ'].sort().join(' ') && all('#cons .ph.te').length === 21, '14 are English only (t tʰ d z ʒ f v θ ð h ɹ w ʔ ɫ) and 21 Telugu only');
ok(boxOf(tel('ర')) === 'Alveolar / Tap or Flap' && ph('ɾ')[0].contains(tel('ర')) && ph('ɾ')[0].contains(eng('ɾ')) && boxOf(tel('ౘ')) === 'Alveolar / Affricate' && boxOf(tel('ౙ')) === 'Alveolar / Affricate', 'ర shares its card with the tap of butter; ౘ ౙ sit in Alveolar / Affricate');
ok(all('#cons .ph.both').every(p => p.querySelector('.tel') && p.querySelector('.eng')) && all('#cons .ph.te').every(p => !p.querySelector('.eng')) && all('#cons .ph.en').every(p => !p.querySelector('.tel')), 'a shared sound shows the Telugu letter and the English word in one card');
const cellOf = e => e.closest('td').querySelector('.cell');
ok(all('#cons td .cell').every(c => { const k = all(':scope > .vg', c).map(v => v.className.replace('vg ', '')); return k.join() === 'voiceless' || k.join() === 'voiced' || k.join() === 'voiceless,voiced'; }), 'in every box the voiceless sounds are on the left and the voiced on the right');
ok(all('.voiceless .tel', cellOf(tel('ప'))).map(e => e.dataset.ch).join('') === 'పఫ' && all('.voiced .tel', cellOf(tel('ప'))).map(e => e.dataset.ch).join('') === 'బభ', 'the aspirated letters sit under their plain partners: ప ఫ | బ భ');
ok(text(tel('క')) === 'క /k/' && tel('క').querySelector('.te').textContent === 'క' && text(eng('k')) === '/k/ skin' && eng('k').querySelector('b').textContent === 'k', 'a Telugu letter has its sound beside it (క /k/); an English sound has its key word (/k/ skin)');
ok(all('#cons .eng.var').map(e => text(e)).join(' | ') === '[pʰ] pin | [tʰ] tin | [kʰ] kin | [ʔ] button | [ɾ] butter | [ɫ] full' && all('#cons .eng.var').every(e => e.title === 'a variant of /' + e.dataset.of + '/'), 'a variant is written in square brackets and names its phoneme: ' + all('#cons .eng.var').map(e => text(e)).join(' | '));
ok(all('#cons .eng:not(.var) .snd').length === 24 && all('#cons .eng:not(.var) .snd').every(e => /^\/.+\/$/.test(e.textContent)), 'the 24 phonemes are written between slashes');
ok(ph('pʰ')[0].contains(tel('ఫ')) && ph('kʰ')[0].contains(tel('ఖ')) && ph('p')[0].contains(tel('ప')) && text(eng('p')) === '/p/ spin', 'pin shares a card with ఫ and kin with ఖ; ప and క get spin and skin');
ok(all('.voiceless .eng', cellOf(eng('t'))).map(e => e.dataset.ipa).join(' ') === 't tʰ' && all('.voiced .eng', cellOf(eng('t'))).map(e => e.dataset.ipa).join(' ') === 'd', 'aspirated t sits under plain t, as ఫ sits under ప');
ok(all('#cons td.empty').length > 0 && all('#cons td.empty').every(c => c.children.length === 0), 'a box neither language uses is left empty');
ok(all('#cons-rows .offgrid').length === 1 && engIn('#cons-rows') === '' && telIn('#cons-rows') === 'క్ష' && all('#cons-rows .why').every(e => e.textContent.length > 15), 'only క్ష is listed under the grid, with the reason it has no box');

/* ── count ── */
const tally = () => { const k = all('#cons .ph, #vowel-chart .spot').map(kind); return ['both', 'te', 'en'].map(x => k.filter(y => y === x).length); };
ok($('count').textContent === '18 shared · 25 Telugu only · 22 English only' && tally().join() === '18,25,22', 'the header counts what the two charts show: ' + $('count').textContent);

/* ── rare and extra letters ── */
const rare = TD.letters.filter(l => l.rare || !l.inBook).map(l => l.ch);
ok($('show-rare').checked && all('#cons .tel.rare').map(e => e.dataset.ch).sort().join(' ') === 'ఙ ఱ ౘ ౙ' && all('#vowel-rows .tel.rare').map(e => e.dataset.ch).join(' ') === 'ౠ ఌ ౡ అః', 'rare and extra letters are shown to begin with, and marked: ఙ ఱ ౘ ౙ, ౠ ఌ ౡ అః');
click('show-rare');
ok(all('.tel').filter(e => !e.closest('#legend')).every(e => !rare.includes(e.dataset.ch)) && all('#vowel-rows .offchart').length === 3 && telIn('#vowel-rows .offchart') === 'ఋ అం', 'unchecking "Include rare and extra letters" removes them from both charts and the lists');
ok(ph('ŋ').length === 1 && kind(ph('ŋ')[0]) === 'en' && !!ph('ɲ').length && $('count').textContent === '17 shared · 22 Telugu only · 23 English only', 'ŋ is then an English-only sound, and the count follows: ' + $('count').textContent);
ok(places().length === 12 && manners().length === 11, 'the grid keeps its full shape');
click('show-rare');
ok(tel('ఙ') && kind(ph('ŋ')[0]) === 'both' && $('count').textContent === '18 shared · 25 Telugu only · 22 English only', 'checking it again brings them back');

/* ── only rows and columns in use ── */
const before = all('#cons .ph').map(p => p.dataset.ipa + boxOf(p)).join('|');
ok(!$('compact').checked, 'the full grid is the default');
click('compact');
ok(places().join() === 'Bilabial,Labiodental,Dental,Alveolar,Postalveolar,Retroflex,Palatal,Velar,Glottal' && manners().join() === 'Nasal,Plosive,Affricate,Sibilant Fricative,Non-sibilant Fricative,Approximant,Tap or Flap,Lateral Approximant',
  '"Only rows and columns in use" drops Linguolabial, Uvular, Pharyngeal, Trill (ర is a tap), and the two unused lateral rows');
ok(all('#cons tbody tr').every(r => r.querySelector('.ph')) && places().every(p => all('#cons td').some(c => c.dataset.place === p && c.querySelector('.ph'))), 'no row or column is empty then');
ok(all('#cons .ph').map(p => p.dataset.ipa + boxOf(p)).join('|') === before, 'and every sound is still there, in the same box');
ok(all('#cons thead tr.groups th[colspan]').map(t => t.textContent + t.colSpan).join() === 'Labial2,Coronal4,Dorsal2,Laryngeal1', 'the group headings shrink to match');
click('show-rare');
ok(manners().includes('Tap or Flap') && !tel('ఱ') && places().includes('Palatal'), 'with rare letters off as well, the Tap or Flap row stays for ర and English ɾ though ఱ is gone');
click('show-rare'); click('compact');
ok(places().length === 12 && manners().length === 11 && all('#cons .ph').map(p => p.dataset.ipa + boxOf(p)).join('|') === before, 'unchecking both restores the full grid');

/* ── legend and notes ── */
ok(all('#legend .tel').map(e => e.dataset.ch).join(' ') === 'క ఱ' && all('#legend .eng').map(e => text(e)).join(' | ') === '/k/ skin | [kʰ] kin' && /square brackets/.test($('legend').textContent) && /always IPA/.test($('legend').textContent) && /rare or extra/.test($('legend').textContent) && !/ISO/.test($('legend').textContent), 'the legend shows a Telugu entry, an English entry, and the rare-letter mark');
const notes = all('#notes .note');
ok(notes.length === SD.NOTES.length && notes.length === 9 && notes.map(n => n.querySelector('.num').textContent).join('') === '123456789' && notes.map(n => n.dataset.id).join() === 'aspiration,variants,coronals,th,v,w,h,length,eo', '9 notes, numbered: ' + notes.map(n => n.dataset.id).join(' '));
ok(notes.every(n => n.querySelector('h4').textContent.length > 5 && n.querySelector('p').textContent.length > 40), 'each note has a title and a sentence or two');
ok(notes.every(n => all('p, h4', n).every(e => !/[ఀ-౿]/.test([...e.childNodes].filter(c => c.nodeType === 3).map(c => c.textContent).join('')))), 'Telugu inside a note is set in the Telugu face');
ok(all('.jump a').map(a => a.getAttribute('href')).every(hf => d.querySelector(hf)) && all('.jump a').length === 3, 'the jump links point at the three sections');

/* ── the same page for a reader who chose ISO ── */
{
  const i = load(PAGE, { notation: 'iso' }), D = i.d, q = (sel, root = D) => [...root.querySelectorAll(sel)];
  const t = ch => q('#cons .tel').find(e => e.dataset.ch === ch);
  ok(['క:ka', 'ఖ:kha', 'ట:ṭa', 'ణ:ṇa', 'శ:śa', 'ష:ṣa', 'ళ:ḷa', 'ఞ:ña'].every(x => { const [ch, s] = x.split(':'); return t(ch).querySelector('.snd').textContent === s; }), 'ISO: Telugu consonants are labeled ka, kha, ṭa, ṇa, śa, ṣa, ḷa, ña');
  ok(q('.tel .snd').length > 40 && q('.tel .snd').every(e => !e.textContent.includes('/')), 'ISO: no Telugu label carries slashes');
  const sp = ipa => D.querySelector(`#vowel-chart .spot[data-ipa="${ipa}"]`);
  ok(text(sp('i').querySelector('text')) === 'ఇi ఈī' && text(sp('ɐ').querySelector('text')) === 'అa' && text(sp('a').querySelector('text')) === 'ఆā' && text(sp('o').querySelector('text')) === 'ఒo ఓō', 'ISO: the vowel chart labels Telugu vowels i ī, a, ā, o ō');
  ok(text(sp('i').querySelectorAll('text')[1]) === '/i/feet' && q('.eng .snd').every(e => /^(\/.+\/|\[.+\])$/.test(e.textContent)) && q('#cons .eng').length === SD.ENGLISH_CONSONANTS.length, 'ISO: English stays in IPA, between slashes or square brackets');
  ok(q('#diphthongs .tel .snd').map(e => e.textContent).join(' ') === 'ai au' && q('#cons-rows .tel .snd')[0].textContent === 'kṣa', 'ISO: the lists follow too (ai au, kṣa)');
  ok(q('#cons .ph').map(p => p.dataset.ipa + kind(p)).join() === all('#cons .ph').map(p => p.dataset.ipa + kind(p)).join() && D.getElementById('count').textContent === '18 shared · 25 Telugu only · 22 English only', 'ISO: the charts themselves are the same; only the Telugu labels change');
  ok(/ISO, as chosen on the home page/.test(D.getElementById('legend').textContent), 'ISO: the legend says the Telugu sounds are in ISO');
}

/* ── the page asks the shared data, and keeps nothing of its own ── */
const script = raw.split('<script>').pop();
ok(/N\.wrap\(N\.letter\(l\)\)/.test(script) && !/\$\{[a-z.]*\.(ipa|iso)\}/i.test(script.replace(/data-ipa="\$\{[^}]*\}"/g, '')), 'Telugu sounds are written through TeluguData.notation, never .ipa / .iso directly');
ok(!/[అ-హ]\s*['"]\s*,\s*['"][a-zɡŋʃʂ]/.test(script) && !/WHERE\s*=|SPOTS\s*=/.test(script), 'no letter-to-sound or position table in the page: those live in the two data files');
h.done();
