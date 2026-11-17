const { SITE_DIR } = require('./config');
const { JSDOM } = require('jsdom'); const fs = require('fs');
const dir = (SITE_DIR + '/');
const raw = fs.readFileSync(dir + 'reference/01_rosetta.html', 'utf8');
const html = raw.replace(/<link[^>]*>/g, '').replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>' + fs.readFileSync(require('path').resolve(dir, require('path').dirname('reference/01_rosetta.html'), src), 'utf8') + '</script>');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/rosetta.html' });
const w = dom.window, d = w.document; let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const $ = id => d.getElementById(id);
const TD = w.TeluguData, RD = w.RosettaData;
const entries = () => [...d.querySelectorAll('.entry')];
const vis = () => entries().filter(e => !e.hidden);
const find = k => entries().find(e => e.dataset.key === k);
const q = v => { $('q').value = v; $('q').dispatchEvent(new w.Event('input')); };

ok(d.title === 'Rosetta Stone' && /game\.css/.test(raw) && !!d.querySelector('header.g-header .g-title'), 'titled, uses app stylesheet and header');
ok(entries().length === TD.letters.length + TD.signs.length, 'one card per letter and sign: ' + entries().length);
ok(TD.letters.every(l => find(l.ch)) && TD.signs.every(s => find(s.sign || '(none)')), 'every TeluguData letter and sign has a card');
ok(entries().every(e => e.querySelectorAll('.snd').length === 2), 'every card shows IPA and ISO chips');
ok(find('క').textContent.includes('/k/') && /ISO\s*k(?!h)/.test(find('క').textContent), 'క: /k/ and k');
ok(find('ఖ').textContent.includes('/kʰ/') || find('ఖ').textContent.includes('/kʰ'), 'ఖ shows its aspirate IPA: ' + find('ఖ').querySelector('.snd').textContent);
ok(/ISO\s*ṭ/.test(find('ట').textContent) && /ISO\s*ś/.test(find('శ').textContent) && /ISO\s*ṣ/.test(find('ష').textContent), 'ISO: ట ṭ, శ ś, ష ṣ');
ok(/r̥/.test(find('ఋ').textContent) && /l̥̄/.test(find('ౡ').textContent), 'ring-below r̥ and l̥̄ present');
// words and meanings
const wordless = Object.entries(RD.letters).filter(([, r]) => !r.word).map(([k]) => k);
ok(['ౠ', 'ఌ', 'ౡ', 'ఱ'].every(k => wordless.includes(k)), 'unattested letters have no invented word: ' + wordless.join(' '));
ok(wordless.every(k => RD.letters[k].note.length > 20) && find('ఌ').textContent.includes('no everyday word'), 'those say so honestly, with a note');
ok(Object.values(RD.letters).concat(Object.values(RD.signs)).every(r => !r.word || (r.word.length === 3 && r.word.every(Boolean))), 'every given word has Telugu, ISO and meaning');
ok(find('క').textContent.includes('కాకి') && find('క').textContent.includes('crow'), 'క: కాకి kāki crow');
// each example word actually contains its letter (letters) / sign (signs), except ఙ/ఞ classical + conjunct ok
const bad = [];
TD.letters.forEach(l => { const r = RD.letters[l.ch]; if (!r.word) return; const t = r.word[0]; const base = l.cat === 'Vowel' ? null : l.ch; if (base && !t.includes(base)) bad.push(l.ch + ' in ' + t); });
TD.signs.forEach(s => { const r = RD.signs[s.sign]; if (!r.word || !s.sign) return; if (!r.word[0].includes(s.sign)) bad.push('sign ' + s.sign + ' in ' + r.word[0]); });
ok(bad.length === 0, 'consonant/sign example words contain the character: ' + bad.join(', '));
ok(find('్').textContent.includes('no English match') && find('(none)').textContent.includes('కల'), 'virama has no English match; inherent a uses కల');
// no-sign / virama glyphs
ok(find('్').querySelector('.g').textContent === 'క్' && find('ా').querySelector('.g').textContent === 'కా', 'signs shown on క');
// flags
ok(find('ఙ').classList.contains('rare') && find('ఱ').classList.contains('rare') && !find('క').classList.contains('rare'), 'rare/extra cards dashed');
const total = entries().length;
$('show-rare').checked = false; $('show-rare').dispatchEvent(new w.Event('change'));
ok(!find('ఱ') || find('ఱ').hidden, 'extra hidden when unticked');
ok(find('ఙ').hidden && vis().length < total && /of \d+ characters/.test($('count').textContent), 'rare hidden too; count: ' + $('count').textContent);
$('show-rare').checked = true; $('show-rare').dispatchEvent(new w.Event('change'));
ok(vis().length === total && /^\d+ characters$/.test($('count').textContent), 'ticking restores all');
// search
q('sh');
ok(vis().some(e => e.dataset.key === 'శ') && vis().some(e => e.dataset.key === 'ష') && vis().length < total / 2, 'search "sh" finds ś/ṣ without accents: ' + vis().length);
q('crow'); ok(vis().length >= 1 && vis().every(e => /crow/i.test(e.textContent)), 'search by meaning');
q('ṭ'); ok(vis().some(e => e.dataset.key === 'ట'), 'search by ISO ṭ');
q('క'); ok(vis().some(e => e.dataset.key === 'క'), 'search by glyph');
q('zzzz'); ok(vis().length === 0 && !$('empty').hidden && [...d.querySelectorAll('section.group')].every(s => s.hidden), 'no match → message, empty groups hidden');
q(''); ok(vis().length === total && $('empty').hidden, 'clearing search restores');
ok(['sec-vowels', 'sec-consonants', 'sec-signs'].every(id => !!$(id)) && [...d.querySelectorAll('.jump a')].every(a => $(a.getAttribute('href').slice(1))), 'jump links point to real sections');
ok(!/Cormorant|Source Sans/.test(html), 'no old fonts');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
