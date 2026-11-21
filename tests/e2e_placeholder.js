const { SITE_DIR } = require('./config');
// The 31 "Coming soon" pages: each is a few lines that hand its tile id to LessonShell.placeholder(),
// which draws the page from units.js. So a tile and its placeholder can't say different things.
const { JSDOM } = require('jsdom'); const fs = require('fs'), path = require('path');
const dir = SITE_DIR + '/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const U = require(path.join(SITE_DIR, 'units.js'));
const soon = U.tiles.filter(t => t.soon);
const load = file => {
  const errs = [];
  const html = fs.readFileSync(dir + file, 'utf8').replace(/<link[^>]*>/g, '')
    .replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>' + fs.readFileSync(path.resolve(dir, path.dirname(file), src), 'utf8') + '</script>');
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' + file,
    virtualConsole: new (require('jsdom').VirtualConsole)().on('jsdomError', e => errs.push(e.message)) });
  return { w: dom.window, d: dom.window.document, errs };
};
const escT = s => s.replace(/&/g, '&amp;');

// the files
const bad = { small: [], head: [], call: [], own: [] };
soon.forEach(t => { const s = fs.readFileSync(dir + t.src, 'utf8');
  if (s.split('\n').length > 20) bad.small.push(t.id);
  if (!s.includes('viewport-fit=cover') || !s.includes('<title>' + escT(t.title) + ' · Telugu Suite</title>') || !/<link rel="stylesheet" href="\.\.\/shell\.css">/.test(s)) bad.head.push(t.id);
  if (!new RegExp("LessonShell\\.placeholder\\('" + t.id + "'\\)").test(s) || !/<script src="\.\.\/units\.js"><\/script>\s*<script src="\.\.\/lesson-shell\.js"><\/script>/.test(s)) bad.call.push(t.id);
  if (/<style|:root|fonts\.googleapis|What you'll learn/.test(s)) bad.own.push(t.id);
});
ok(soon.length === 31 && bad.small.length === 0, '31 placeholder pages, each under 20 lines ' + bad.small);
ok(bad.head.length === 0, 'each has viewport-fit, its own <title> and links shell.css ' + bad.head);
ok(bad.call.length === 0, 'each loads units.js + lesson-shell.js and calls LessonShell.placeholder with its own tile id ' + bad.call);
ok(bad.own.length === 0, 'none carries styles, color tokens, fonts, or text of its own ' + bad.own);

// every one of them renders what its tile says
const wrong = [];
soon.forEach(t => { const { d, errs } = load(t.src); const txt = s => (d.querySelector(s) || {}).textContent;
  const facts = [...d.querySelectorAll('.fact')].map(f => f.querySelector('.fact-label').textContent + '=' + f.querySelector('p').textContent).join('|');
  const want = `What you'll learn=${t.soon.learn}|How you'll practice=${t.soon.practice}|Where it fits=${t.soon.fits}`;
  if (errs.length || txt('h1') !== t.title || txt('.eyebrow') !== U.sectionOf(t.id).title || txt('.unit-icon') !== t.icon || txt('.lead') !== t.desc || txt('.pill.soon') !== 'Coming soon' || facts !== want || d.title !== t.title + ' · Telugu Suite') wrong.push(t.id + (errs[0] ? ' (' + errs[0] + ')' : ''));
});
ok(wrong.length === 0, 'all 31 render section, icon, title, "Coming soon", description, and the three lines from units.js ' + wrong.join(', '));

// one in detail
const { w, d } = load('vocabulary/01_greetings.html');
ok(d.querySelector('.shell > .shell-head .eyebrow').textContent === 'Vocabulary' && d.querySelector('.shell > .shell-body .facts').children.length === 3, 'the page uses the lesson frame (shell head + scrolling body)');
ok(!d.querySelector('.stepper') && !d.querySelector('.shell-foot') && !d.querySelector('#ls-done'), 'no Learn/Practice steps, footer, or "Completed" pill on a placeholder');
ok(d.querySelector('.unit-icon').getAttribute('aria-hidden') === 'true', 'the icon is decorative');
ok(load('reference/05_idioms.html').d.querySelector('.eyebrow').textContent === 'Reference', 'Reference placeholders carry the section\'s own name, read from units.js');
ok(load('grammar/02_nouns.html').d.querySelector('h1').innerHTML === 'Nouns: Gender &amp; Number', 'text is escaped, not injected as HTML');

// the API
const L = w.LessonShell;
let threw = false; try { L.placeholder('no-such-unit'); } catch (e) { threw = /no tile "no-such-unit"/.test(e.message); }
ok(threw, 'an id that is not in units.js fails loudly');
const host = d.createElement('div'); d.body.appendChild(host);
L.placeholder('phonemes', host);
ok(host.querySelector('h1').textContent === 'Phonemes' && !host.querySelector('.facts') && host.querySelector('.pill.soon'), 'a tile with no `soon` lines still draws (title + description only)');
const shellOnly = new JSDOM('<div id="lesson"></div><script>' + fs.readFileSync(dir + 'lesson-shell.js', 'utf8') + '</script>', { runScripts: 'dangerously' }).window;
threw = false; try { shellOnly.LessonShell.placeholder('vocab-greetings'); } catch (e) { threw = /load units\.js/.test(e.message); }
ok(threw, 'without units.js, placeholder() says what is missing');

// a lesson takes its section and title from units.js when it gives none
const m = L.mount({ id: 'grammar-nouns', learn: ['x'] }, host);
ok(host.querySelector('.eyebrow').textContent === 'Grammar' && host.querySelector('h1').textContent === 'Nouns: Gender & Number' && d.title === 'Nouns: Gender & Number · Telugu Suite' && m.stages.join() === 'learn', 'mount({id}) fills section and title from the tile');
L.mount({ id: 'grammar-nouns', section: 'Mine', title: 'Own title', learn: ['x'] }, host);
ok(host.querySelector('.eyebrow').textContent === 'Mine' && host.querySelector('h1').textContent === 'Own title', 'a section or title the lesson gives itself still wins');
shellOnly.LessonShell.mount({ id: 'x', section: 'S', title: 'T', learn: ['x'] });
ok(shellOnly.document.querySelector('h1').textContent === 'T', 'lesson-shell.js still works without units.js when the lesson names itself');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
