const { SITE_DIR } = require('./config');
// Every link in the project resolves, nothing is left at the top level by accident, and no old file names survive.
const fs = require('fs'), path = require('path'); const dir = SITE_DIR;
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(dir), rel = f => path.relative(dir, f);
const top = fs.readdirSync(dir).sort();
ok(top.filter(n => fs.statSync(path.join(dir, n)).isFile()).join() === 'README.md,base.css,game-core.js,game-menu.js,game-setup.js,game.css,home.css,index.html,lesson-shell.js,lesson-template.html,lookalikes-data.js,profile.html,progress.js,reference.css,review.html,settings.js,shell.css,telugu-data.js,units.js', 'top level holds the home page, Review, Profile, the shared css/js, the template, and the README: ' + top.join(' '));
ok(!top.includes('shared') && ['advanced-grammar', 'alphabet', 'fonts', 'grammar', 'reference', 'training', 'vocabulary'].every(n => top.includes(n)) && top.filter(n => fs.statSync(path.join(dir, n)).isDirectory()).length === 7, 'folders: ' + top.filter(n => fs.statSync(path.join(dir, n)).isDirectory()).join(' '));
const pages = files.filter(f => /\.html$/.test(f) && path.dirname(f) !== dir);
ok(pages.every(f => /^\d\d_[a-z-]+\.html$/.test(path.basename(f))), pages.length + ' section pages are named NN_name.html');
ok(['reference', 'alphabet', 'grammar', 'vocabulary', 'advanced-grammar'].every(sec => { const n = pages.filter(f => rel(f).startsWith(sec + '/')).map(f => +path.basename(f).slice(0, 2)).sort((a, b) => a - b); return n.length && n[0] <= 1 && n.every((v, i) => v === i + n[0]); }), 'numbering in each folder runs on from 00 or 01 with no gaps');
let bad = [];
files.filter(f => /\.(html|css|js)$/.test(f)).forEach(f => {
  const s = fs.readFileSync(f, 'utf8');
  const refs = [...(/\.html$/.test(f) ? s.matchAll(/<(?:link|script)[^>]*?(?:href|src)="([^"#:]+\.(?:css|js))"/g) : []), ...(/\.css$/.test(f) ? s.matchAll(/url\('([^']+)'\)/g) : [])].map(m => m[1]);          // url('…') is an @import or a font file
  refs.filter(r => !/^https?:/.test(r)).forEach(r => { if (!fs.existsSync(path.resolve(path.dirname(f), r))) bad.push(rel(f) + ' → ' + r); });
});
ok(bad.length === 0, 'every stylesheet, script, @import, and font file resolves' + (bad.length ? ': ' + bad.join(' | ') : ''));
const srcs = require(path.join(dir, 'units.js')).all.map(t => t.src);
ok(srcs.length === 42 && srcs.every(s => fs.existsSync(path.join(dir, s))), 'all ' + srcs.length + ' tile sources in units.js (41 + Review) exist');
const stale = JSON.parse(fs.readFileSync(path.join(__dirname, 'old-names.json'), 'utf8'));
const hits = []; files.filter(f => /\.(html|css|js)$/.test(f)).forEach(f => { const s = fs.readFileSync(f, 'utf8'); stale.forEach(o => { if (new RegExp('(^|[^\\w/_-])' + o.replace('.', '\\.') + '\\b').test(s)) hits.push(rel(f) + ': ' + o); }); });
ok(hits.length === 0, 'no old flat file names remain anywhere' + (hits.length ? ': ' + hits.slice(0, 8).join(' | ') : ''));
ok(files.every(f => !/\.zip$/.test(f)), 'no stray zip in the project');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
