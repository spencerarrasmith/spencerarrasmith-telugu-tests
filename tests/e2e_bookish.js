const { SITE_DIR } = require('./config');
// Bookish Telugu (reference/04_bookish.html): the letters modern Telugu no longer uses (none of them is practiced in the
// games or on the keyboard), and how words taken from Sanskrit are spelled. Sounds in the reader's notation.
const { JSDOM } = require('jsdom'); const fs = require('fs'), path = require('path');
const dir = (SITE_DIR + '/'), page = 'reference/04_bookish.html';
const raw = fs.readFileSync(dir + page, 'utf8');
const html = raw.replace(/<link[^>]*>/g, '').replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>' + fs.readFileSync(path.resolve(dir, path.dirname(page), src), 'utf8') + '</script>');
const open = notation => new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' + page,
  beforeParse(win) { if (notation) win.localStorage.setItem('telugu.settings.v1', JSON.stringify({ notation })); } }).window;
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

const w = open(), d = w.document, TD = w.TeluguData;
const cards = () => [...d.querySelectorAll('#letters .bk')].map(c => ({ glyph: c.querySelector('.glyph').textContent, name: c.querySelector('h3').firstChild.textContent, sound: c.querySelector('.snd').textContent, note: c.querySelector('p').textContent }));
ok(d.title === 'Bookish Telugu' && d.querySelector('.g-title').textContent === 'Bookish Telugu' && /<link rel="stylesheet" href="\.\.\/game\.css">\s*<link rel="stylesheet" href="\.\.\/reference\.css">/.test(raw), 'the page is "Bookish Telugu", styled by game.css and reference.css as the other reference pages are');
ok([...d.querySelectorAll('.jump a')].map(a => a.textContent + ' ' + a.getAttribute('href')).join(' | ') === 'Letters Out of Use #sec-letters | Sanskrit Loanwords #sec-loans' && $$('h2') === 'Letters Out of Use|Sanskrit Loanwords', 'two parts, with jump links: Letters Out of Use, Sanskrit Loanwords');
function $$(s) { return [...d.querySelectorAll(s)].map(e => e.textContent).join('|'); }

/* ── the letters out of use ── */
const c = cards();
ok(c.map(x => x.glyph).join(' ') === 'ఌ ౡ ◌ౢ ◌ౣ ఱ ౘ ౙ ◌ఁ', 'eight cards, kin together: ఌ ౡ and their signs, ఱ, ౘ ౙ, then ఁ: ' + c.map(x => x.glyph).join(' '));
const extra = [...TD.letters.filter(l => !l.inBook).map(l => l.ch), ...TD.signs.filter(g => !g.inBook).map(g => '◌' + g.sign)];
ok(extra.every(g => c.some(x => x.glyph === g)) && extra.length === 7, 'every letter and sign telugu-data.js keeps out of the book\'s set has its card (7), and ఁ besides');
ok(c.every(x => x.note.length > 25) && c.find(x => x.glyph === 'ఱ').note.includes('ర') && c.find(x => x.glyph === '◌ఁ').note.includes('silent'), 'each card says what the letter was for and why it is out of use (ఱ merged with ర; ఁ is silent today)');
ok(c.filter(x => x.name === 'Letter').length === 5 && c.filter(x => x.name === 'Vowel sign').length === 2 && c.find(x => x.glyph === '◌ఁ').name === 'Sign', 'letters, vowel signs (on a dotted circle), and ఁ, a sign');
ok(c.find(x => x.glyph === 'ఱ').sound === '/' + TD.letters.find(l => l.ch === 'ఱ').ipa + '/' && c.find(x => x.glyph === '◌ఁ').sound === 'silent', 'sounds in IPA by default (ఱ /ɽ/; ఁ silent)');

/* ── Sanskrit loanwords ── */
const words = [...d.querySelectorAll('#words .wd')].map(x => ({ w: x.querySelector('.w').textContent, s: x.querySelector('.s').textContent, m: x.querySelector('.m').textContent, why: x.querySelector('.why').textContent }));
ok(words.length === 8 && words.map(x => x.w).join(' ') === 'ఋషి ధర్మం భాష శాంతి క్షమ జ్ఞానం దుఃఖం విద్య', 'eight loanwords: ' + words.map(x => x.w).join(' '));
ok(words.every(x => /^\/.+\/$/.test(x.s) && x.m.length > 2 && /^Bookish: /.test(x.why)) && words.find(x => x.w === 'క్షమ').s === '/' + TD.notation.word(TD.syllables('క్షమ')) + '/', 'each with its sound (split by telugu-data.js), its meaning, and what makes it bookish');

/* ── in ISO ── */
{ const i = open('iso'), id = i.document;
  const snd = g => [...id.querySelectorAll('#letters .bk')].find(c => c.querySelector('.glyph').textContent === g).querySelector('.snd').textContent;
  ok(snd('ఱ') === TD.letters.find(l => l.ch === 'ఱ').iso && snd('◌ఁ') === 'm̐' && [...id.querySelectorAll('#words .s')][0].textContent === 'r̥ṣi', 'for a reader who chose ISO: ఱ ' + snd('ఱ') + ', ఁ m̐, ఋషి r̥ṣi, with no slashes'); }

/* ── kept out of the games ── */
const games = ['alphabet/01_phonemes.html', 'alphabet/02_diacritics.html', 'alphabet/03_conjuncts.html', 'alphabet/04_words.html', 'training/03_lookalikes.html', 'training/04_keyboard.html'].map(f => fs.readFileSync(dir + f, 'utf8'));
ok(games.every(s => !/id="include-extra"/.test(s)), 'no game or the keyboard page offers "Include extra letters" any more: these letters live here');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
