const { SITE_DIR } = require('./config');
// settings.js: the app-wide choice of how sounds are written (IPA or ISO), remembered in this browser.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(SITE_DIR, 'settings.js'), 'utf8');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
function fakeWin(broken, initial) {
  const store = Object.assign({}, initial), L = {};
  return { Event: class { constructor(t) { this.type = t; } },
    addEventListener: (t, f) => (L[t] = L[t] || []).push(f),
    dispatchEvent: e => (L[e.type] || []).forEach(f => f(e)), fire: (t, e) => (L[t] || []).forEach(f => f(e || {})),
    localStorage: broken ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }
      : { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, store };
}
const boot = (broken, initial) => { const w = fakeWin(broken, initial); new Function('window', 'module', src)(w, undefined); return w; };
const KEY = 'telugu.settings.v1';

let w = boot(), S = w.TeluguSettings;
ok(S && S.get('notation') === 'ipa' && S.label('notation') === 'IPA' && !(KEY in w.store), 'first visit: IPA, and nothing is written until a choice is made');
ok(JSON.stringify(S.options('notation').map(o => [o.value, o.label, o.example])) === '[["ipa","IPA","/k/"],["iso","ISO","ka"]]' && S.options('notation').every(o => o.hint.length > 10), 'two notations offered, each with a label, a hint, and an example (/k/ · ka)');
let changes = 0; S.onChange(() => changes++);
ok(S.set('notation', 'iso') === true && S.get('notation') === 'iso' && S.label('notation') === 'ISO' && changes === 1, 'set → get, label, and a change event');
ok(JSON.parse(w.store[KEY]).notation === 'iso', 'stored under ' + KEY);
ok(S.set('notation', 'klingon') === false && S.set('nope', 'x') === false && S.get('notation') === 'iso' && changes === 1, 'unknown names and values are refused, and change nothing');
ok(S.get('nope') === undefined && S.label('nope') === '' && S.options('nope').length === 0, 'an unknown setting reads as undefined / empty');
w.fire('storage', { key: KEY }); w.fire('storage', { key: 'other' }); w.fire('storage', { key: null });
ok(changes === 3, 'a change made in another tab or frame is announced too (not unrelated keys)');
ok(S.persistent === true, 'persistent with working storage');

// a second page load sees the choice; garbage in storage falls back to the default
ok(boot(false, { [KEY]: '{"notation":"iso"}' }).TeluguSettings.get('notation') === 'iso', 'the next page load reads the stored choice');
ok(['{"notation":"xx"}', 'not json', 'null', '[]', '"iso"'].every(v => boot(false, { [KEY]: v }).TeluguSettings.get('notation') === 'ipa'), 'an unknown value or damaged storage falls back to IPA');
const keep = boot(false, { [KEY]: '{"notation":"ipa","future":"kept"}' }); keep.TeluguSettings.set('notation', 'iso');
ok(JSON.parse(keep.store[KEY]).future === 'kept', 'setting one value keeps the others');

// storage blocked: works for this page view
w = boot(true); S = w.TeluguSettings;
ok(S.get('notation') === 'ipa' && S.set('notation', 'iso') && S.get('notation') === 'iso' && S.persistent === false, 'blocked storage: the choice holds for this page view, and persistent is false');

// load order and coverage
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const pages = walk(SITE_DIR).filter(f => f.endsWith('.html')).map(f => [path.relative(SITE_DIR, f), fs.readFileSync(f, 'utf8')]);
const needs = pages.filter(([, s]) => /<script src="(\.\.\/)?telugu-data\.js">/.test(s));
const bad = needs.filter(([, s]) => !/<script src="(\.\.\/)?settings\.js"><\/script>\s*(<script src="(\.\.\/)?units\.js"><\/script>\s*)?<script src="(\.\.\/)?telugu-data\.js">/.test(s)).map(([f]) => f);
ok(needs.length === 11 && bad.length === 0, 'every page that loads telugu-data.js loads settings.js first (' + needs.length + ' pages) ' + bad.join(', '));
const idx = pages.find(([f]) => f === 'index.html')[1];
ok(/<script src="settings\.js"><\/script>\s*<script src="units\.js">/.test(idx), 'the home page loads settings.js before units.js');
const setters = pages.filter(([, s]) => /Settings\.set\(|TeluguSettings\.set\(/.test(s)).map(([f]) => f);
ok(setters.join() === 'index.html', 'only the home page changes a setting: ' + setters.join());
const direct = walk(SITE_DIR).filter(f => /\.(html|js)$/.test(f) && !f.endsWith('settings.js')).filter(f => fs.readFileSync(f, 'utf8').includes(KEY)).map(f => path.relative(SITE_DIR, f));
ok(direct.length === 0, 'nothing but settings.js touches its storage key ' + direct.join(', '));
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
