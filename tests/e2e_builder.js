// Lookalike Builder (training/02_lookalike-builder.html): one keyboard with a Character / Looks Like switch.
// Choose a character, tap what looks like it, export the groups as a CSV for the Lookalikes game.
const { SITE_DIR } = require('./config');
const { JSDOM } = require('jsdom'); const fs = require('fs'), path = require('path');
(async () => {
const dir = (SITE_DIR + '/'), PAGE = 'training/02_lookalike-builder.html', KEY = 'telugu-lookalikes-v1';
const raw = fs.readFileSync(dir + PAGE, 'utf8');
const html = raw.replace(/<link[^>]*>/g, '').replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>' + fs.readFileSync(path.resolve(dir, path.dirname(PAGE), src), 'utf8') + '</script>');
// a fresh visit; `storage` is what the browser already holds
const visit = (storage = {}) => new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/lookalike-builder.html', beforeParse(win) { Object.entries(storage).forEach(([k, v]) => win.localStorage.setItem(k, v)); } }).window;
let w = visit(), d = w.document, fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const $ = id => d.getElementById(id);
const all = sel => [...d.querySelectorAll(sel)];
const key = ch => all('#kb .key').find(b => b.dataset.ch === ch);
const tap = ch => key(ch).click();
const base = ch => all('#kCons .key').find(b => b.dataset.base === ch);
const sign = s => all('#signs .key').find(b => b.dataset.sign === s);
const mode = () => d.querySelector('.mode-opt[aria-checked="true"]').dataset.mode;
const setMode = m => d.querySelector(`.mode-opt[data-mode="${m}"]`).click();
const glyph = () => $('glyph').textContent, name = () => $('promptName').textContent;
const chips = () => all('#chips .chip').map(c => c.dataset.remove).join(' ');
const csv = () => $('csv').value;
const enabled = sel => all(sel).filter(k => !k.disabled).map(k => k.dataset.ch || k.dataset.base).join(' ');
const set = (id, on) => { $(id).checked = on; $(id).dispatchEvent(new w.Event('change', { bubbles: true })); };
const type = t => { $('other').value = t; $('otherForm').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); };
const clearAll = () => { $('clear').click(); $('clear').click(); };
const importFile = (text, fname) => new Promise(res => { const f = new w.File([text], fname, { type: 'text/csv' }); Object.defineProperty($('importFile'), 'files', { value: [f], configurable: true }); $('importFile').dispatchEvent(new w.Event('change')); setTimeout(res, 40); });
const D = w.TeluguData, L = w.LookalikeData, script = raw.split('<script>')[1];
const VARNAMALA = 'కఖగఘఙచఛజఝఞటఠడఢణతథదధనపఫబభమయరలవశషసహళఱౘౙ';

/* ── the page ── */
ok(d.title === 'Lookalike Builder' && /game\.css/.test(raw) && !!d.querySelector('header.g-header .g-title'), 'titled, uses the app stylesheet and header');
ok(!$('prev') && !$('next') && !$('tiles') && !d.querySelector('[data-set]') && !d.querySelector('.g-prog-track') && !/reviewed|Show me|this run/i.test(d.querySelector('.wrap').textContent), 'no guided run: no Previous / Next, run grid, "Show me" sets, progress bar, or "reviewed" state');
const hints = (raw.split('<script src')[0].match(/<p class="hint">[^<]*/g) || []).map(h => h.replace(/<[^>]*>/, ''));
ok(hints.length === 2 && hints.join('').length < 200, 'two short lines of explanation (' + hints.join('').length + ' characters)');
ok(all('.mode-opt').map(b => b.textContent).join(' | ') === 'Character | Looks Like' && $('mode').getAttribute('role') === 'radiogroup' && $('pick').contains($('mode')) && $('pick').contains($('glyph')) && $('pick').contains($('chips')),
  'one bar holds the Character / Looks Like switch, the character, and its lookalikes');
ok(/\.pick \{[^}]*position: sticky/.test(raw) && /\nhtml \{ height: auto; overflow: auto; \}\nbody \{ height: auto; overflow: visible; \}/.test(raw), 'the bar is sticky, and the window (not <body>) scrolls so it can stay in view');
ok(all('#kb .keys').length === 4 && all('#kVowels, #kCons, #kDigits, #signs').length === 4, 'one keyboard: vowel signs, vowels, consonants, digits');

/* ── start: nothing chosen ── */
ok(mode() === 'character' && d.querySelector('[data-mode="looks"]').disabled && $('glyph').classList.contains('empty') && $('kbTitle').textContent === 'Character' && chips() === '', 'starts in Character mode; "Looks Like" waits for a character');
ok($('stat').textContent === '0 groups' && csv() === '' && w.localStorage.getItem(KEY) === null, 'no groups, an empty CSV, nothing stored');

/* ── choose a character, then its lookalikes ── */
tap('అ');
ok(mode() === 'looks' && glyph() === 'అ' && name() === '/ɐ/vowel' && $('kbTitle').textContent === 'Looks Like అ' && $('kb').classList.contains('looks'), 'choosing అ turns the keyboard over to its lookalikes: ' + $('kbTitle').textContent);
ok(key('అ').disabled && key('అ').classList.contains('self') && key('అ').title === '/ɐ/ (the character shown)', 'the character itself is shown on its key but cannot be picked');
tap('ఇ'); tap('ఈ');
ok(chips() === 'ఇ ఈ' && key('ఇ').getAttribute('aria-pressed') === 'true' && key('ఉ').getAttribute('aria-pressed') === 'false', 'picks become chips, and their keys are pressed: ' + chips());
ok(csv() === 'అ,ఇ,ఈ\nఇ,అ\nఈ,అ', 'one group per character, each = the character + its direct picks: ' + JSON.stringify(csv()));
tap('ఈ'); ok(chips() === 'ఇ' && csv() === 'అ,ఇ', 'tapping a picked key again takes it out');
all('#chips .chip')[0].click(); ok(chips() === '' && csv() === '' && /Nothing picked/.test($('chips').textContent), 'a chip removes its lookalike');
tap('ఇ'); tap('ఈ');

/* ── back to Character mode ── */
setMode('character');
ok(mode() === 'character' && $('kbTitle').textContent === 'Character' && !$('kb').classList.contains('looks') && glyph() === 'అ' && chips() === 'ఇ ఈ', 'the switch returns to Character mode; the bar still shows అ and its lookalikes');
ok(['అ', 'ఇ', 'ఈ'].every(c => key(c).classList.contains('has')) && !key('ఉ').classList.contains('has') && key('అ').getAttribute('aria-pressed') === 'true' && !key('అ').disabled, 'keys that already have lookalikes are marked, and the current character is the pressed one');
tap('ఇ');
ok(glyph() === 'ఇ' && mode() === 'looks' && chips() === 'అ', 'choosing ఇ: అ is already there (links work both ways)');
tap('ఉ');
ok(csv() === 'అ,ఇ,ఈ\nఇ,అ,ఉ\nఈ,అ\nఉ,ఇ', 'ఇ\'s group = ఇ + అ + ఉ; అ\'s group is not merged with it: ' + JSON.stringify(csv()));
ok(!csv().split('\n').some(r => r.split(',').includes('ఈ') && r.split(',').includes('ఉ')), 'no group ever contains both ఈ and ఉ (no chaining)');
ok(all('#groups .group').length === 4 && d.querySelector('#groups .group .chip.anchor').textContent === 'అ' && $('groupCount').textContent === '(4)' && $('stat').textContent === '4 groups', 'the Groups panel and the header both show 4 groups, first character outlined');

/* ── conjuncts: only the ones telugu-data.js lists ── */
setMode('character'); $('stack').click();
const core = D.clusters.filter(c => c.core).map(c => c.glyph);
const firsts = [...new Set(core.map(g => [...g][0]))].sort((a, b) => VARNAMALA.indexOf(a) - VARNAMALA.indexOf(b));
ok($('stack').textContent === 'Tap a consonant…' && enabled('#kCons .key') === firsts.join(' ') && firsts.length === 22 && base('ఖ').disabled, 'top consonant: only the 22 consonants that begin a listed conjunct can be chosen (not ఖ)');
base('క').click();
ok(enabled('#kCons .key') === 'క్క క్త క్య క్ర క్ల క్వ క్ష' && key('క్ఖ').disabled && $('readout').textContent === 'క్ + ▢', 'under క: క్క క్త క్య క్ర క్ల క్వ క్ష, and nothing unlisted');
$('stack').click();
ok(enabled('#kCons .key') === 'ష', 'a third consonant: after క only ష can follow');
base('ష').click();
ok(enabled('#kCons .key') === 'క్ష్మ క్ష్య' && $('stack').disabled, 'under క్ష: క్ష్మ and క్ష్య; no fourth consonant');
$('kbReset').click();
ok($('readout').textContent === '' && enabled('#kCons .key').split(' ').length === 34 && $('kbReset').disabled, '"Plain letters" clears the top consonant and sign');
// every top consonant × every vowel sign: each enabled key is a listed conjunct (+ sign) that the Lookalikes game reads
{ let n = 0; const bad = [];
  for (const t of firsts) { $('kbReset').click(); $('stack').click(); base(t).click();
    for (const s of [''].concat(all('#signs .key').map(k => k.dataset.sign))) { if (s) sign(s).click();
      all('#kCons .key').filter(k => !k.disabled).forEach(k => { n++; const ch = k.dataset.ch, stack = s ? ch.slice(0, -s.length) : ch; if (!L.item(ch) || !core.includes(stack)) bad.push(ch); });
      if (s) sign(s).click(); } }
  $('kbReset').click();
  ok(bad.length === 0 && n === 1326, 'all ' + n + ' conjunct keys offered (every top consonant × every vowel sign) are listed conjuncts the Lookalikes game can read' + (bad.length ? ' → ' + bad.slice(0, 8).join(' ') : '')); }

/* ── a conjunct with a vowel, and its lookalike ── */
$('stack').click(); base('క').click(); sign('ా').click();
ok($('readout').textContent === 'క్ + ▢ + ◌ా' && all('#kVowels .key, #kDigits .key').every(k => k.disabled), 'top consonant + sign: the consonant keys show the stacked forms; vowel and digit keys are off');
tap('క్యా');
ok(glyph() === 'క్యా' && name() === '/kjaː/conjunct with vowel sign' && mode() === 'looks' && $('readout').textContent === 'క్ + ▢ + ◌ా', 'choosing క్యా keeps the top consonant and the sign for its lookalikes');
tap('క్రా');
ok(chips() === 'క్రా' && csv().includes('క్యా,క్రా'), 'so క్రా is one tap away');
sign('ా').click(); sign('ి').click(); tap('క్రి');
ok(chips() === 'క్రా క్రి', 'a lookalike can carry a different vowel sign: ' + chips());

/* ── Groups: back to a character, keyboard in its shape ── */
all('#groups .chip').find(c => c.dataset.goto === 'అ').click();
ok(glyph() === 'అ' && mode() === 'looks' && chips() === 'ఇ ఈ' && $('readout').textContent === '', 'tapping a character in Groups returns to it (a plain letter: plain keys)');
all('#groups .chip').find(c => c.dataset.goto === 'క్యా').click();
ok(glyph() === 'క్యా' && $('readout').textContent === 'క్ + ▢ + ◌ా' && chips() === 'క్రా క్రి', 'and a conjunct with a sign sets the keyboard to its top consonant and sign');

/* ── typed text ── */
type('ఖ్యా');
ok($('otherNote').textContent === 'Lookalikes cannot read ఖ్యా.' && chips() === 'క్రా క్రి' && $('other').value === 'ఖ్యా', 'typing an unlisted conjunct is refused, with a note');
type(' "క్షా", ');
ok(chips() === 'క్రా క్రి క్షా' && $('otherNote').textContent === '' && $('other').value === '', 'typing a listed one adds it as a lookalike (quotes, comma, spaces dropped)');
setMode('character');
const typedName = t => { setMode('character'); type(t); return name(); };
ok(typedName('అం') === '/ɐm/other' && glyph() === 'అం' && mode() === 'looks', 'in Character mode typed text becomes the character');
ok(typedName('ఘ') === '/ɡʱ/consonant' && typedName('ఋ') === '/ru/vowel' && typedName('ఱ') === '/ɽ/consonant' && typedName('వు') === '/ʋu/consonant with vowel sign' && typedName('క్') === '/k/consonant, no vowel', 'characters are named from the shared data: ' + name());
ok(typedName('స్త్రా').startsWith('/st̪ɾaː/') && typedName('౫') === '5digit', 'a three-consonant conjunct with a sign, and a digit as its number');

/* ── what is stored, and the next visit ── */
const stored = JSON.parse(w.localStorage.getItem(KEY));
ok(Object.keys(stored).sort().join() === 'cur,font,format,links,uncommon' && stored.cur === '౫' && stored.links.length === 6, 'stored: the links, the current character, and the options (' + Object.keys(stored).join(', ') + ')');
{ const v = visit({ [KEY]: JSON.stringify({ links: [['క్యా', 'క్రా']], cur: 'క్యా', uncommon: false, font: 'sans', format: 'groups' }) }), q = id => v.document.getElementById(id);
  ok(q('glyph').textContent === 'క్యా' && v.document.querySelector('.mode-opt[aria-checked="true"]').dataset.mode === 'looks' && q('readout').textContent === 'క్ + ▢ + ◌ా' && [...v.document.querySelectorAll('#chips .chip')].map(c => c.dataset.remove).join() === 'క్రా',
    'the next visit opens on the same character, with its lookalikes and the keyboard in its shape'); }
{ const v = visit({ [KEY]: JSON.stringify({ links: [['అ', 'ఆ'], ['క', 'ఖ్య']], reviewed: ['అ', 'ఆ', 'ఇ'], sets: { vowels: true, consonants: false, marks: true, digits: false }, uncommon: true, font: 'serif', format: 'pairs', pos: 7 }) }), q = id => v.document.getElementById(id);
  ok(q('csv').value === 'అ,ఆ\nక,ఖ్య' && q('uncommon').checked && q('font').value === 'serif' && q('format').value === 'pairs' && v.document.querySelector('.mode-opt[aria-checked="true"]').dataset.mode === 'character',
    'picks and options saved by the earlier builder carry over; its run position and reviewed list are ignored'); }
ok(['not json', 'null', '{"links":"x"}', '{"links":[1,null,["అ"]],"cur":5}'].every(x => { const v = visit({ [KEY]: x }); return v.document.getElementById('csv').value === '' && v.document.getElementById('stat').textContent === '0 groups'; }), 'garbage in storage starts a clean page (a half-written link is not turned into one)');

/* ── CSV: formats, round trip, clear ── */
clearAll();
ok(csv() === '' && $('stat').textContent === '0 groups' && $('status').textContent === 'All picks cleared.' && glyph() === '౫', 'Clear all picks (two clicks) empties the groups; the character stays');
setMode('character'); tap('అ'); tap('ఇ');
ok(csv() === 'అ,ఇ', 'ఇ picked for అ: one group "అ,ఇ", not also "ఇ,అ": ' + JSON.stringify(csv()));
$('format').value = 'pairs'; $('format').dispatchEvent(new w.Event('change'));
tap('ఈ'); ok(csv() === 'అ,ఇ\nఅ,ఈ', 'pairs format: one picked pair per row');
$('format').value = 'groups'; $('format').dispatchEvent(new w.Event('change'));
setMode('character'); tap('ఇ'); tap('ఉ');
const exported = csv();
clearAll(); await importFile(exported, 'g.csv');
ok(csv() === exported && /Imported 3 links from g\.csv\./.test($('status').textContent), 'importing the exported groups restores the same groups');

/* ── import reads a file as the Lookalikes game does, and leaves out what it cannot read ── */
clearAll();
const messy = '﻿అ, ఆ ,"ఇ"\r\n\r\nక,,క్\n , \n';
await importFile(messy, 'm.csv');
ok(csv() === 'అ,ఆ,ఇ\nఆ,అ\nఇ,అ\nక,క్' && JSON.stringify(L.rows(messy)) === '[["అ","ఆ","ఇ"],["క","క్"]]', 'import: BOM, spaces, quotes, CRLF, empty cells, and blank rows handled as LookalikeData.rows does: ' + JSON.stringify(csv()));
clearAll();
await importFile('క్య,ఖ్య,క్ర\nఖ్య,క్య\nప,x,ఫ\n', 'mixed.csv');
ok(csv() === 'క్య,క్ర\nప,ఫ' && $('status').textContent === 'Imported 2 links from mixed.csv. Skipped 2 that Lookalikes cannot read: ఖ్య x.', 'import leaves out characters Lookalikes cannot read, and a row that starts with one: ' + $('status').textContent);
ok(csv().split('\n').every(r => r.split(',').every(c => L.item(c))), 'so everything imported can be practiced in Lookalikes');

/* ── characters, sounds, and flags come from telugu-data.js ── */
ok(!/\['[ఀ-౿]+','',?1?\]/.test(script) && !/var VOWELS=\[\[/.test(script) && /TD\.vowels/.test(script) && /TD\.consonants/.test(script) && /TD\.signs/.test(script) && /TD\.digits/.test(script) && /TD\.clusters/.test(script), 'no letter, sign, digit, or conjunct list of its own: all are read from TeluguData');
ok(!/function clean\(/.test(script) && /LD\.clean/.test(script) && /LD\.rows\(/.test(script) && /LD\.item\(/.test(script) && !/split\(\/\\r\?\\n\/\)/.test(script), 'CSV cells are cleaned and split, and characters read, by LookalikeData (clean, rows, item), not by a private copy');
ok(!/'[a-z]*[āīūṭḍṇṣśṅñḷṟ][a-z]*'/.test(script), 'the page holds no spellings of its own');
clearAll(); $('kbReset').click(); setMode('character');
ok($('uncommon').parentElement.textContent.trim() === 'Include extra letters' && !$('uncommon').checked && all('.menu-opt input[type=checkbox]').length === 1, 'one option, "Include extra letters", in the app checkbox style; off by default');
const vow = all('#kVowels .key'), con = all('#kCons .key');
ok(vow.map(k => k.dataset.ch).join('') === D.vowels.filter(l => [...l.ch].length === 1).map(l => l.ch).join('') && vow.length === 16, 'vowel keys: the 16 single vowel letters of telugu-data.js, in its order');
ok(con.map(k => k.dataset.ch).join('') === VARNAMALA && con.length === D.consonants.length && new Set(con.map(k => k.dataset.ch)).size === 37, 'consonant keys: every consonant of telugu-data.js once, in varnamala order');
ok(vow.concat(con).every(k => k.title.replace(' (the character shown)', '') === '/' + D.letters.find(l => l.ch === k.dataset.ch).ipa + '/'), 'every letter key carries the sound from telugu-data.js');
ok(vow.concat(con).every(k => k.classList.contains('rare') === D.letters.find(l => l.ch === k.dataset.ch).rare) && key('ఱ').classList.contains('rare') && !key('ళ').classList.contains('rare'), 'the dashed "rare" edge follows the shared rare flag (ౠ ఌ ౡ ఙ ఱ ౘ ౙ)');
const extraLetters = D.letters.filter(l => !l.core).map(l => l.ch);
ok(extraLetters.join('') === 'ఌౡౘౙఱ' && extraLetters.every(ch => key(ch).disabled) && ['ఋ', 'ౠ', 'ఙ', 'ఞ'].every(ch => !key(ch).disabled) && enabled('#kVowels .key, #kCons .key').split(' ').length === 48, 'by default the book\'s 48 letters can be chosen; ఋ ౠ ఙ ఞ are in, extras (ఌ ౡ ౘ ౙ ఱ) are not');
const signKeys = () => all('#signs .key').map(k => k.dataset.sign);
ok(signKeys().join('') === 'ాిీుూృౄెేైొోౌంః్' && !signKeys().includes('ౢ'), 'sign keys in the order of the vowels they stand for, pollu last; extra signs ౢ ౣ held back');
ok(all('#signs .key').filter(k => k.classList.contains('rare')).map(k => k.dataset.sign).join('') === 'ౄః', 'rare signs (ౄ ః) are dashed');
const signLabels = all('#signs .key').map(k => k.querySelector('small').textContent);
ok(signLabels.includes('aː') && signLabels.includes('iː') && signLabels.includes('none') && !signLabels.includes('ā'), 'sign keys are labeled in IPA: ' + signLabels.join(' '));
ok(all('#kDigits .key').map(k => k.dataset.ch + k.title).join(' ') === D.digits.map(g => g.ch + g.value).join(' '), 'digits come from TeluguData.digits (౦–౯ → 0–9)');
$('stack').click(); base('న').click(); const without = enabled('#kCons .key');
set('uncommon', true);
ok(signKeys().join('') === 'ాిీుూృౄౢౣెేైొోౌంః్', '"Include extra letters" adds ౢ ౣ to the signs');
ok(without === 'న్న న్య న్వ' && enabled('#kCons .key') === 'న్త న్ద న్న న్య న్వ', 'and the uncommon conjuncts: under న, న్త and న్ద join న్న న్య న్వ');
$('kbReset').click();
ok(extraLetters.every(ch => !key(ch).disabled) && enabled('#kVowels .key, #kCons .key').split(' ').length === 53, 'and the five extra letters (53 letters in all)');
setMode('character'); tap('ఱ'); ok(name() === '/ɽ/consonant', 'ఱ can then be chosen');
set('uncommon', false);
ok(key('ఱ').disabled && signKeys().length === 16 && JSON.parse(w.localStorage.getItem(KEY)).uncommon === false, 'turning the option off withdraws them again, and the choice is stored');
ok(/localStorage/.test(script) && $('font').options.length === 4 && $('font').getAttribute('aria-label') === 'Telugu font', 'state is kept in this browser; the font picker is still there');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
