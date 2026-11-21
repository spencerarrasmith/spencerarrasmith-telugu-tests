const { SITE_DIR } = require('./config');
// settings.js: the app-wide choices, remembered in this browser: how sounds are written (IPA or ISO), and whether
// the keyboard shows syllables (కా, క్శ on the keys).
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

// "Keyboard shows syllables": on unless turned off
{ const w = boot(), S = w.TeluguSettings;
  ok(S.get('syllables') === 'on' && !(KEY in w.store), 'syllables: on by default, with nothing stored');
  ok(JSON.stringify(S.options('syllables').map(o => [o.value, o.label])) === '[["on","On"],["off","Off"]]' && S.options('syllables').every(o => o.hint.length > 10), 'two values, on and off, each with a hint');
  ok(S.set('syllables', 'off') && S.get('syllables') === 'off' && S.get('notation') === 'ipa' && JSON.parse(w.store[KEY]).syllables === 'off', 'off is stored beside the notation, which it leaves alone');
  ok(S.set('syllables', 'maybe') === false && S.get('syllables') === 'off', 'anything but on or off is refused');
  ok(S.absorb({ syllables: 'on', _t: Date.now() + 5 }) === true && S.get('syllables') === 'on', 'it syncs as the notation does: a newer copy from another device wins');
  ok(boot(false, { [KEY]: '{"notation":"iso"}' }).TeluguSettings.get('syllables') === 'on', 'a store from before the setting existed reads as on'); }

// syncing: each change is stamped (_t); of two copies, the choices made later win
{ const w = boot(), S = w.TeluguSettings; let ev = 0; S.onChange(() => ev++);
  const t0 = Date.now(); S.set('notation', 'iso');
  const st = JSON.parse(w.store[KEY]);
  ok(st._t >= t0 && st.notation === 'iso' && S.get('notation') === 'iso' && S.options('notation').length === 2, 'a choice is stored with when it was made (_t), which changes nothing else');
  const snap = S.snapshot(); snap.notation = 'ipa';
  ok(S.get('notation') === 'iso' && S.snapshot().notation === 'iso' && S.snapshot()._t === st._t, 'snapshot() hands out a copy of every stored choice');
  ev = 0;
  ok(S.absorb({ notation: 'ipa', _t: st._t - 1 }) === false && S.get('notation') === 'iso' && ev === 0, 'an older copy from another device is ignored');
  ok(S.absorb({ notation: 'ipa', _t: st._t + 1 }) === true && S.get('notation') === 'ipa' && ev === 1, 'a newer one is taken, and announced');
  ok(S.absorb({ notation: 'iso', _t: st._t + 1 }) === false && S.get('notation') === 'ipa', 'one made at the same moment is not');
  ok([null, 'iso', [1], 5, {}].every(x => S.absorb(x) === false) && S.get('notation') === 'ipa' && ev === 1, 'anything that is not a store, or holds no choice, changes nothing');
  ok(S.absorb({ notation: 'klingon', _t: Date.now() + 99 }) === true && S.get('notation') === 'ipa', 'an unknown value taken from a copy still reads as the default');
  S.forget();
  ok(JSON.parse(w.store[KEY]) && Object.keys(JSON.parse(w.store[KEY])).length === 0 && S.get('notation') === 'ipa' && ev === 3, 'forget() goes back to the defaults in this browser, and announces it'); }
{ const old = boot(false, { [KEY]: '{"notation":"iso"}' }).TeluguSettings;      // stored before _t was kept
  ok(old.absorb({}) === false && old.absorb({ notation: 'ipa' }) === false && old.get('notation') === 'iso', 'a choice stored before _t was kept still beats a copy with no time on it');
  ok(old.absorb({ notation: 'ipa', _t: 2 }) === true && old.get('notation') === 'ipa', 'and loses to any copy that has one');
  const fresh = boot().TeluguSettings;
  ok(fresh.absorb({ notation: 'iso' }) === true && fresh.get('notation') === 'iso', 'a browser that never chose takes even an unstamped choice'); }

// load order and coverage
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const pages = walk(SITE_DIR).filter(f => f.endsWith('.html')).map(f => [path.relative(SITE_DIR, f), fs.readFileSync(f, 'utf8')]);
const needs = pages.filter(([, s]) => /<script src="(\.\.\/)?telugu-data\.js">/.test(s));
const bad = needs.filter(([, s]) => !/<script src="(\.\.\/)?settings\.js"><\/script>\s*(<script src="(\.\.\/)?units\.js"><\/script>\s*)?<script src="(\.\.\/)?telugu-data\.js">/.test(s)).map(([f]) => f);
ok(needs.length === 13 && bad.length === 0, 'every page that loads telugu-data.js loads settings.js first (' + needs.length + ' pages) ' + bad.join(', '));
const idx = pages.find(([f]) => f === 'index.html')[1];
ok(/<script src="settings\.js"><\/script>\s*<script src="units\.js">/.test(idx), 'the home page loads settings.js before units.js');
const setters = pages.filter(([, s]) => /Settings\.set\(|TeluguSettings\.set\(/.test(s)).map(([f]) => f);
ok(setters.join() === 'index.html,training/04_keyboard.html' && !/Settings\.set\('notation'/.test(pages.find(([f]) => f === 'training/04_keyboard.html')[1]),
  'only the home page changes a setting, and the Telugu Keyboard page its own one ("Keyboard shows syllables"): ' + setters.join());
const direct = walk(SITE_DIR).filter(f => /\.(html|js)$/.test(f) && !f.endsWith('settings.js')).filter(f => fs.readFileSync(f, 'utf8').includes(KEY)).map(f => path.relative(SITE_DIR, f));
ok(direct.length === 0, 'nothing but settings.js touches its storage key ' + direct.join(', '));
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
