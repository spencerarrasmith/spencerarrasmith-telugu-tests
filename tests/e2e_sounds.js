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
ok(SD.MANNERS.join() === 'Nasal,Plosive,Affricate,Sibilant fricative,Non-sibilant fricative,Approximant,Tap or flap,Trill,Lateral fricative,Lateral approximant,Lateral tap or flap', 'manners follow the IPA chart, with a row for affricates');
ok(Object.values(SD.WHERE).every(([p, m, v]) => SD.PLACES.some(x => x[0] === p) && SD.MANNERS.includes(m) && typeof v === 'boolean'), 'every box names a real column and row');
ok([...SD.ENGLISH_CONSONANTS, ...SD.ENGLISH_VOWELS, ...SD.DIPHTHONGS.en].every(([, wd]) => wd.split('|').length === 3 && wd.split('|')[1].length > 0), 'every English sound has a key word with the letters that spell it marked');

/* ── vowel chart ── */
const svg = d.querySelector('#vowel-chart svg.vc');
const pts = svg.querySelector('polygon.frame').getAttribute('points').split(' ').map(p => p.split(',').map(Number));   // front-close, back-close, back-open, front-open
ok(pts.length === 4 && pts[0][1] === pts[1][1] && pts[2][1] === pts[3][1] && pts[1][0] === pts[2][0] && pts[3][0] > pts[0][0] && pts[3][0] < pts[2][0],
  'the chart is the IPA trapezoid: level top and bottom, upright back edge, front edge sloping in towards the bottom');
const spot = ipa => svg.querySelector(`.spot[data-ipa="${ipa}"]`);
const dot = ipa => { const c = spot(ipa).querySelector('circle:last-of-type') || spot(ipa).querySelector('circle'); return [Number(c.getAttribute('cx')), Number(c.getAttribute('cy'))]; };
const near = (a, b) => Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01;
ok(near(dot('i'), pts[0]) && near(dot('u'), pts[1]) && near(dot('ɑ'), pts[2]), 'i sits on the top-left corner, u on the top-right, ɑ on the bottom-right');
ok(near(dot('a'), [(pts[2][0] + pts[3][0]) / 2, pts[2][1]]), 'Telugu a (అ ఆ) sits in the middle of the bottom edge: open central');
ok(dot('e')[0] > dot('i')[0] && dot('e')[0] < dot('ɛ')[0] && dot('e')[1] < dot('ɛ')[1] && near([dot('o')[0], 0], [pts[1][0], 0]), 'e follows the sloping front edge down; o stays on the upright back edge');
const kind = e => ['both', 'te', 'en'].find(k => e.classList.contains(k));
ok(all('.spot', svg).map(s => s.dataset.ipa + ':' + kind(s)).join(' ') === 'i:both u:both ɪ:en ʊ:en e:te o:te ə:en ɛ:en ʌ:en ɔ:en æ:en a:te ɑ:en', 'i and u are shared; e, o and a are Telugu only; the rest English only');
ok(text(spot('i').querySelector('text')) === 'ఇ/i/ ఈ/iː/' && text(spot('a').querySelector('text')) === 'అ/a/ ఆ/aː/', 'a short and long vowel share one spot, each with its sound beside it: ' + text(spot('i').querySelector('text')));
ok(text(spot('i').querySelectorAll('text')[1]) === '/i/feet' && spot('i').querySelector('.t-b').textContent === 'ee' && text(spot('ɪ').querySelector('text')) === '/ɪ/sit', 'an English vowel shows its IPA and a key word (feet, with ee marked)');
ok(spot('i').querySelectorAll('circle').length === 2 && spot('e').querySelectorAll('circle.dot-te').length === 1 && spot('ɪ').querySelectorAll('circle.dot-en').length === 1, 'filled dot for Telugu, ring for English, both where the languages share a vowel');
ok(all('.axis', svg).map(t => t.textContent).join() === 'Front,Central,Back,Close,Close-mid,Open-mid,Open', 'the axes are labelled');
const telIn = sel => all(sel + ' .tel').map(e => e.dataset.ch).join(' '), engIn = sel => all(sel + ' .eng').map(e => e.dataset.ipa).join(' ');
ok(telIn('#diphthongs') === 'ఐ ఔ' && engIn('#diphthongs') === 'eɪ aɪ ɔɪ aʊ oʊ', 'diphthongs are listed under the chart: ఐ ఔ and the five English ones');
ok(all('#vowel-rows .offchart').length === 3 && telIn('#vowel-rows .offchart') === 'ఋ ౠ ఌ ౡ అం అః' && engIn('#vowel-rows .offchart') === 'ɚ' && all('#vowel-rows .offchart .why').every(e => e.textContent.length > 15),
  'letters taught as vowels that are not vowel positions (ఋ ౠ ఌ ౡ, అం అః) and English ɚ are listed with the reason');

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
ok(boxOf(tel('చ')) === 'Postalveolar / Affricate' && boxOf(tel('వ')) === 'Labiodental / Approximant' && boxOf(eng('v')) === 'Labiodental / Non-sibilant fricative' && boxOf(tel('హ')) === 'Glottal / Non-sibilant fricative' && boxOf(tel('ళ')) === 'Retroflex / Lateral approximant', 'చ, వ, v, హ and ళ are where the IPA chart puts them');
ok(all('#cons .ph.both').map(p => p.dataset.ipa).sort().join(' ') === ['k', 'ɡ', 'ŋ', 'tʃ', 'dʒ', 'n', 'p', 'b', 'm', 'j', 'l', 'ʃ', 's'].sort().join(' '), '13 consonants are shared: k ɡ ŋ tʃ dʒ n p b m j l ʃ s');
ok(all('#cons .ph.en').map(p => p.dataset.ipa).sort().join(' ') === ['t', 'd', 'z', 'ʒ', 'f', 'v', 'θ', 'ð', 'h', 'ɹ'].sort().join(' ') && all('#cons .ph.te').length === 22, '10 are English only (t d z ʒ f v θ ð h ɹ) and 22 Telugu only');
ok(all('#cons .ph.both').every(p => p.querySelector('.tel') && p.querySelector('.eng')) && all('#cons .ph.te').every(p => !p.querySelector('.eng')) && all('#cons .ph.en').every(p => !p.querySelector('.tel')), 'a shared sound shows the Telugu letter and the English word in one card');
const cellOf = e => e.closest('td').querySelector('.cell');
ok(all('#cons td .cell').every(c => { const k = all(':scope > .vg', c).map(v => v.className.replace('vg ', '')); return k.join() === 'voiceless' || k.join() === 'voiced' || k.join() === 'voiceless,voiced'; }), 'in every box the voiceless sounds are on the left and the voiced on the right');
ok(all('.voiceless .tel', cellOf(tel('ప'))).map(e => e.dataset.ch).join('') === 'పఫ' && all('.voiced .tel', cellOf(tel('ప'))).map(e => e.dataset.ch).join('') === 'బభ', 'the aspirated letters sit under their plain partners: ప ఫ | బ భ');
ok(text(tel('క')) === 'క /k/' && tel('క').querySelector('.te').textContent === 'క' && text(eng('k')) === '/k/ kin' && eng('k').querySelector('b').textContent === 'k', 'a Telugu letter has its sound beside it (క /k/); an English sound has its key word (/k/ kin)');
ok(all('#cons td.empty').length > 0 && all('#cons td.empty').every(c => c.children.length === 0), 'a box neither language uses is left empty');
ok(all('#cons-rows .offgrid').length === 2 && engIn('#cons-rows') === 'w' && telIn('#cons-rows') === 'క్ష' && all('#cons-rows .why').every(e => e.textContent.length > 15), 'English w and Telugu క్ష are listed under the grid, with the reason they have no box');

/* ── count ── */
const tally = () => { const k = all('#cons .ph, #vowel-chart .spot').map(kind); return ['both', 'te', 'en'].map(x => k.filter(y => y === x).length); };
ok($('count').textContent === '15 shared · 25 Telugu only · 18 English only' && tally().join() === '15,25,18', 'the header counts what the two charts show: ' + $('count').textContent);

/* ── rare and extra letters ── */
const rare = TD.letters.filter(l => l.rare || !l.inBook).map(l => l.ch);
ok($('show-rare').checked && all('#cons .tel.rare').map(e => e.dataset.ch).sort().join(' ') === 'ఙ ఞ ఱ' && all('#vowel-rows .tel.rare').map(e => e.dataset.ch).join(' ') === 'ఋ ౠ ఌ ౡ', 'rare and extra letters are shown to begin with, and marked: ఙ ఞ ఱ, ఋ ౠ ఌ ౡ');
click('show-rare');
ok(all('.tel').filter(e => !e.closest('#legend')).every(e => !rare.includes(e.dataset.ch)) && all('#vowel-rows .offchart').length === 2, 'unticking "Include rare and extra letters" removes them from both charts and the lists');
ok(ph('ŋ').length === 1 && kind(ph('ŋ')[0]) === 'en' && !ph('ɲ').length && $('count').textContent === '14 shared · 23 Telugu only · 19 English only', 'ŋ is then an English-only sound, and the count follows: ' + $('count').textContent);
ok(places().length === 12 && manners().length === 11, 'the grid keeps its full shape');
click('show-rare');
ok(tel('ఙ') && kind(ph('ŋ')[0]) === 'both' && $('count').textContent === '15 shared · 25 Telugu only · 18 English only', 'ticking it again brings them back');

/* ── only rows and columns in use ── */
const before = all('#cons .ph').map(p => p.dataset.ipa + boxOf(p)).join('|');
ok(!$('compact').checked, 'the full grid is the default');
click('compact');
ok(places().join() === 'Bilabial,Labiodental,Dental,Alveolar,Postalveolar,Retroflex,Palatal,Velar,Glottal' && manners().join() === 'Nasal,Plosive,Affricate,Sibilant fricative,Non-sibilant fricative,Approximant,Tap or flap,Trill,Lateral approximant',
  '"Only rows and columns in use" drops Linguolabial, Uvular, Pharyngeal and the two unused lateral rows');
ok(all('#cons tbody tr').every(r => r.querySelector('.ph')) && places().every(p => all('#cons td').some(c => c.dataset.place === p && c.querySelector('.ph'))), 'no row or column is empty then');
ok(all('#cons .ph').map(p => p.dataset.ipa + boxOf(p)).join('|') === before, 'and every sound is still there, in the same box');
ok(all('#cons thead tr.groups th[colspan]').map(t => t.textContent + t.colSpan).join() === 'Labial2,Coronal4,Dorsal2,Laryngeal1', 'the group headings shrink to match');
click('show-rare');
ok(!manners().includes('Tap or flap') && !tel('ఱ'), 'with rare letters off as well, the Tap or flap row (only ఱ) goes too');
click('show-rare'); click('compact');
ok(places().length === 12 && manners().length === 11 && all('#cons .ph').map(p => p.dataset.ipa + boxOf(p)).join('|') === before, 'unticking both restores the full grid');

/* ── legend and notes ── */
ok(all('#legend .tel').map(e => e.dataset.ch).join(' ') === 'క ఱ' && all('#legend .eng').length === 1 && /always IPA/.test($('legend').textContent) && /rare or extra/.test($('legend').textContent) && !/ISO/.test($('legend').textContent), 'the legend shows a Telugu entry, an English entry and the rare-letter mark');
const notes = all('#notes .note');
ok(notes.length === SD.NOTES.length && notes.length === 7 && notes.map(n => n.querySelector('.num').textContent).join('') === '1234567' && notes.map(n => n.dataset.id).join() === 'aspiration,coronals,th,v,h,length,eo', '7 notes, numbered: ' + notes.map(n => n.dataset.id).join(' '));
ok(notes.every(n => n.querySelector('h4').textContent.length > 5 && n.querySelector('p').textContent.length > 40), 'each note has a title and a sentence or two');
ok(notes.every(n => all('p, h4', n).every(e => !/[ఀ-౿]/.test([...e.childNodes].filter(c => c.nodeType === 3).map(c => c.textContent).join('')))), 'Telugu inside a note is set in the Telugu face');
ok(all('.jump a').map(a => a.getAttribute('href')).every(hf => d.querySelector(hf)) && all('.jump a').length === 3, 'the jump links point at the three sections');

/* ── the same page for a reader who chose ISO ── */
{
  const i = load(PAGE, { notation: 'iso' }), D = i.d, q = (sel, root = D) => [...root.querySelectorAll(sel)];
  const t = ch => q('#cons .tel').find(e => e.dataset.ch === ch);
  ok(['క:ka', 'ఖ:kha', 'ట:ṭa', 'ణ:ṇa', 'శ:śa', 'ష:ṣa', 'ళ:ḷa', 'ఞ:ña'].every(x => { const [ch, s] = x.split(':'); return t(ch).querySelector('.snd').textContent === s; }), 'ISO: Telugu consonants are labelled ka, kha, ṭa, ṇa, śa, ṣa, ḷa, ña');
  ok(q('.tel .snd').length > 40 && q('.tel .snd').every(e => !e.textContent.includes('/')), 'ISO: no Telugu label carries slashes');
  const sp = ipa => D.querySelector(`#vowel-chart .spot[data-ipa="${ipa}"]`);
  ok(text(sp('i').querySelector('text')) === 'ఇi ఈī' && text(sp('a').querySelector('text')) === 'అa ఆā' && text(sp('o').querySelector('text')) === 'ఒo ఓō', 'ISO: the vowel chart labels Telugu vowels i ī, a ā, o ō');
  ok(text(sp('i').querySelectorAll('text')[1]) === '/i/feet' && q('.eng .snd').every(e => /^\/.+\/$/.test(e.textContent)) && q('#cons .eng').length === SD.ENGLISH_CONSONANTS.length, 'ISO: English stays in IPA, between slashes');
  ok(q('#diphthongs .tel .snd').map(e => e.textContent).join(' ') === 'ai au' && q('#cons-rows .tel .snd')[0].textContent === 'kṣa', 'ISO: the lists follow too (ai au, kṣa)');
  ok(q('#cons .ph').map(p => p.dataset.ipa + kind(p)).join() === all('#cons .ph').map(p => p.dataset.ipa + kind(p)).join() && D.getElementById('count').textContent === '15 shared · 25 Telugu only · 18 English only', 'ISO: the charts themselves are the same; only the Telugu labels change');
  ok(/ISO, as chosen on the home page/.test(D.getElementById('legend').textContent), 'ISO: the legend says the Telugu sounds are in ISO');
}

/* ── the page asks the shared data, and keeps nothing of its own ── */
const script = raw.split('<script>').pop();
ok(/N\.wrap\(N\.letter\(l\)\)/.test(script) && !/\$\{[a-z.]*\.(ipa|iso)\}/i.test(script.replace(/data-ipa="\$\{[^}]*\}"/g, '')), 'Telugu sounds are written through TeluguData.notation, never .ipa / .iso directly');
ok(!/[అ-హ]\s*['"]\s*,\s*['"][a-zɡŋʃʂ]/.test(script) && !/WHERE\s*=|SPOTS\s*=/.test(script), 'no letter-to-sound or position table in the page: those live in the two data files');
h.done();
