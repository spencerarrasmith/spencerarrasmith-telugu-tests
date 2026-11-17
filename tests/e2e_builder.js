const { SITE_DIR } = require('./config');
const { JSDOM } = require('jsdom'); const fs = require('fs');
(async () => {
const dir = (SITE_DIR + '/');
const raw = fs.readFileSync(dir + 'alphabet/04_lookalike-builder.html', 'utf8');
const html = raw.replace(/<link[^>]*>/g, '').replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>' + fs.readFileSync(require('path').resolve(dir, require('path').dirname('alphabet/04_lookalike-builder.html'), src), 'utf8') + '</script>');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/lookalike-builder.html' });
const w = dom.window, d = w.document; let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const $ = id => d.getElementById(id);
const key = ch => [...d.querySelectorAll('.key')].find(b => b.dataset.ch === ch);
ok(d.title === 'Lookalike Builder' && /game\.css/.test(raw) && !/Cormorant|Source Sans/.test(html), 'titled, uses the app stylesheet, old display fonts gone');
ok(!!d.querySelector('header.g-header .g-title') && $('progressBar').classList.contains('g-prog-fill'), 'header + progress bar use the shared classes');
ok(/0 of \d+ reviewed/.test($('progressText').textContent) && $('glyph').textContent === 'అ', 'starts on అ: ' + $('progressText').textContent);
const name = () => $('promptName').textContent;
ok(name() === '/a/ · vowel' && !/ā|ISO/.test(raw.split('<script>')[1] || ''), 'the character is named in IPA, not ISO: ' + name());
key('బ'); const bKey = key('బ'); $('next').click();
ok($('glyph').textContent === 'ఆ' && /^1 of/.test($('progressText').textContent), 'Done, next → ఆ; progress 1 reviewed');
$('prev').click(); key('ఇ').click(); key('ఈ').click();
const chips = () => [...d.querySelectorAll('#chips .chip')].map(c => c.textContent.replace(/\s*×/, '').trim()).join('');
const csv = () => $('csv').value;
ok(chips() === 'ఇఈ', 'picks become chips: ' + chips());
ok(csv() === 'అ,ఇ,ఈ\nఇ,అ\nఈ,అ', 'one group per character, each = the character + its direct picks: ' + JSON.stringify(csv()));
/* go on to ఇ: అ is already in its list; add ఉ */
$('next').click(); $('next').click();            // అ → ఆ → ఇ
ok($('glyph').textContent === 'ఇ' && chips() === 'అ', 'arriving at ఇ: అ is already filled in (it was picked there): ' + chips());
key('ఉ').click();
ok(csv() === 'అ,ఇ,ఈ\nఇ,అ,ఉ\nఈ,అ\nఉ,ఇ', 'ఇ\'s group = ఇ + అ + ఉ; అ\'s group is not merged with it: ' + JSON.stringify(csv()));
ok(!csv().split('\n').some(r => r.split(',').includes('ఈ') && r.split(',').includes('ఉ')), 'no group ever contains both ఈ and ఉ (no chaining)');
ok(d.querySelectorAll('#groups .group').length === 4 && d.querySelector('#groups .group .chip.anchor').textContent === 'అ' && /^Groups|4/.test($('groupCount').textContent), 'Groups panel shows the same 4 rows, first character outlined');
ok(/4 groups/.test($('progressText').textContent), 'header counts groups: ' + $('progressText').textContent);
/* round trip: the groups CSV re-imports to the same groups */
const exported = csv();
$('clear').click(); $('clear').click();
ok(csv() === '' && /0 groups/.test($('progressText').textContent), 'cleared');
await new Promise(res => { const f = new w.File([exported], 'g.csv', { type: 'text/csv' }); Object.defineProperty($('importFile'), 'files', { value: [f], configurable: true }); $('importFile').dispatchEvent(new w.Event('change')); setTimeout(res, 40); });
ok(csv() === exported, 'importing the exported groups restores the same groups');
/* a mirrored pair is listed once */
$('clear').click(); $('clear').click();
key('ఇ').click();
ok(csv() === 'అ,ఇ', 'ఇ picked for అ: one group "అ,ఇ", not also "ఇ,అ": ' + JSON.stringify(csv()));
$('format').value = 'pairs'; $('format').dispatchEvent(new w.Event('change'));
ok(csv() === 'అ,ఇ', 'pairs format unchanged');
ok(d.querySelectorAll('.menu-opt input[type=checkbox]').length === 5, 'the settings use the app checkbox style (menu-opt)');
ok(/localStorage/.test(html) && !/fonts\.googleapis\.com\/css2\?family=Cormorant/.test(html), 'state still kept in this browser');
/* IPA everywhere, as in the games */
const go = ch => { const f = [...d.querySelectorAll('.tile')].find(t => t.dataset.goto === ch); f.click(); };
go('ఘ'); ok(name() === '/ɡʱ/ · consonant', 'ఘ → /ɡʱ/: ' + name());
$('other').value = 'ఋ'; $('otherPrompt').click(); ok(name() === '/r\u0329/ · vowel', 'ఋ (typed in) → syllabic r');
go('ఖ'); ok(name() === '/kʰ/ · consonant', 'ఖ → /kʰ/');
go('ఱ'); ok(name() === '/ɽ/ · consonant', 'ఱ → /ɽ/');
$('other').value = 'వు'; $('otherPrompt').click();
ok($('glyph').textContent === 'వు' && name() === '/ʋu/ · consonant with vowel sign', 'a syllable from the shared data: ' + name());
$('other').value = 'క్షా'; $('otherPrompt').click();
ok(name().startsWith('/kʂaː/'), 'a conjunct with a sign: ' + name());
$('other').value = 'స్త్రా'; $('otherPrompt').click();
ok(name().startsWith('/st\u032Araː/'), 'a stack the data does not list is built from its consonants: ' + name());
$('other').value = 'క్'; $('otherPrompt').click();
ok(name().startsWith('/k/'), 'consonant with virama: ' + name());
$('other').value = '౫'; $('otherPrompt').click();
ok(name().startsWith('5 ') || name().startsWith('5·') || name().startsWith('5'), 'a digit shows its number: ' + name());
const signs = [...d.querySelectorAll('#signs .key')].map(k => k.querySelector('small').textContent);
ok(signs.includes('aː') && signs.includes('iː') && signs.includes('none') && !signs.includes('ā'), 'sign keys are labelled in IPA: ' + signs.join(' '));
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
