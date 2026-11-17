const { SITE_DIR } = require('./config');
const { JSDOM } = require('jsdom'); const fs = require('fs'), path = require('path');
const dir = (SITE_DIR + '/'), page = 'reference/02_signs-conjuncts.html';
const raw = fs.readFileSync(dir + page, 'utf8');
const html = raw.replace(/<link[^>]*>/g, '').replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>' + fs.readFileSync(path.resolve(dir, path.dirname(page), src), 'utf8') + '</script>');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' + page });
const w = dom.window, d = w.document; let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const $ = id => d.getElementById(id);
const TD = w.TeluguData, SD = w.SignsConjunctsData;
const rows = () => [...d.querySelectorAll('#chart tbody tr')];
const cell = t => [...d.querySelectorAll('#chart td.c')].find(c => c.firstChild.textContent === t);
const card = ch => d.querySelector(`.cj[data-ch="${ch}"]`);
const vis = els => els.filter(e => !e.hidden);

ok(d.title === 'Signs & Conjuncts' && /\.\.\/game\.css/.test(raw) && !!d.querySelector('header.g-header .g-title'), 'titled, uses the shared stylesheet and header');
/* ── the chart ── */
const cons = TD.letters.filter(l => l.cat !== 'Vowel');
ok(rows().length === cons.length && rows().length === 36, 'one row per consonant plus క్ష: ' + rows().length);
ok(rows().every(r => r.querySelectorAll('td.c').length === 1 + SD.SIGN_ORDER.length), 'every row: the letter alone + ' + SD.SIGN_ORDER.length + ' signs');
ok([...d.querySelectorAll('#chart thead th .mark')].slice(1).map(m => m.textContent).join('') === SD.SIGN_ORDER.join(''), 'column headers are the bare signs, in textbook order');
ok(rows().every((r, i) => { const l = cons[i]; return [...r.querySelectorAll('td.c')].every((c, j) => c.firstChild.textContent === l.ch + (j === 0 ? '' : SD.SIGN_ORDER[j - 1])); }), 'every cell is exactly letter + sign');
ok(cell('మో') && cell('మో').classList.contains('n') && cell('మో').querySelector('sup').textContent === '1', 'మో is marked with note 1');
ok(['ఘో', 'ఝొ', 'యౌ', 'మొ'].every(t => cell(t).querySelector('sup').textContent === '1'), 'ఘో ఝొ యౌ మొ share note 1');
ok(['కో', 'నో', 'లో'].every(t => !cell(t).classList.contains('n')), 'కో నో లో (the usual looped form) are not marked');
ok(cell('జు').querySelector('sup').textContent === '2' && cell('జె').querySelector('sup').textContent === '5' && cell('జొ').querySelector('sup').textContent === '5' && !cell('జో').classList.contains('n'), 'జు → note 2, జె/జొ → note 5, జో unmarked');
ok(cell('యి').querySelector('sup').textContent === '3' && cell('హా').querySelector('sup').textContent === '4' && cell('ఖే').querySelector('sup').textContent === '5', 'యి → 3, హా → 4, ఖే → 5');
ok(!cell('కు').classList.contains('n') && !cell('క').classList.contains('n'), 'కు and క have no note');
/* ── the notes ── */
const sn = [...d.querySelectorAll('#sign-notes .note')], cn = [...d.querySelectorAll('#conj-notes .note')];
ok(sn.length === SD.signNotes.length && cn.length === SD.conjNotes.length && sn[0].querySelector('.num').textContent === '1', 'notes render: ' + sn.length + ' + ' + cn.length);
ok(sn[0].querySelectorAll('.chip:not(.usual)').length === 12 && sn[0].querySelectorAll('.chip.usual').length === 3, 'note 1: 12 combinations + 3 usual ones to compare');
ok([...sn[0].querySelectorAll('.chip:not(.usual)')].map(c => c.textContent).includes('మో'), 'note 1 lists మో');
ok(sn[0].querySelector('h4 .te.bare') && /bare/.test(sn[0].querySelector('h4').innerHTML), 'bare signs in a title are wrapped so they cannot attach to the letter before');
ok(sn.every(n => n.querySelector('p').textContent.length > 30), 'every note has text');
/* ── the conjunct cards ── */
const all = [...d.querySelectorAll('.cj')];
const consOnly = TD.letters.filter(l => l.cat !== 'Vowel' && l.cat !== 'Conjunct');
ok(all.length === consOnly.length && all.length === 35, 'one card per consonant: ' + all.length);
ok(all.every(c => c.querySelector('.ex').firstChild.textContent === SD.HOST + '్' + c.dataset.ch), 'every example is ' + SD.HOST + ' + virama + the letter');
ok(all.every(c => c.querySelector('.meta .tag:nth-child(2)').textContent === (SD.BELOW.includes(c.dataset.ch) ? 'below' : 'beside')), 'below/beside tags follow the data');
ok(SD.BELOW.length + SD.BESIDE.length === 35 && [...SD.BELOW].every(c => !SD.BESIDE.includes(c)), 'the two families partition the 35 consonants');
ok(card('ష').querySelector('.ex').textContent.includes('త్ష') && card('ష').querySelector('sup').textContent === '2', 'ష card also shows its usual below-form, note 2');
ok(card('ర').querySelector('sup').textContent === '3' && card('త').querySelector('sup').textContent === '4' && card('జ').querySelector('sup').textContent === '5', 'ర → 3, త → 4, జ → 5');
ok(!card('క').querySelector('sup'), 'క has no note');
/* ── rare and extra ── */
$('show-rare').checked = false; $('show-rare').dispatchEvent(new w.Event('change'));
ok(vis(rows()).length === 33 && /^33 letters$/.test($('count').textContent), 'unticked: ఙ ఞ ఱ rows hidden, count ' + $('count').textContent);
ok(vis(all).length === 32 && card('ఱ').hidden && !card('క').hidden, 'unticked: 3 cards hidden');
ok(['ౢ', 'ౣ'].every(s => [...d.querySelectorAll('#chart th.s')].find(h => h.textContent.startsWith(s)).hidden), 'unticked: ౢ ౣ columns hidden');
$('show-rare').checked = true; $('show-rare').dispatchEvent(new w.Event('change'));
ok(vis(rows()).length === 36 && vis(all).length === 35 && $('count').textContent === '36 letters', 'ticking restores everything');
ok(['sec-signs', 'sec-conjuncts'].every(id => !!$(id)) && [...d.querySelectorAll('.jump a')].every(a => $(a.getAttribute('href').slice(1))), 'jump links point to real sections');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
