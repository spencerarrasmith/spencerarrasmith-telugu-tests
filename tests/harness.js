const { SITE_DIR } = require('./config');
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
// load(file)                       the page as a first-time visitor gets it (sounds in IPA)
// load(file, { notation: 'iso' })  the page for a reader who chose ISO on the home page
// load(file, { storage: {...} })   any localStorage entries to have in place before the page's scripts run
// load(file, { before: win => … }) anything else to set up on the window first (a stand-in for fetch, say)
// load(file, { setup: 'open' })    a game that opens with the session popup: leave the popup open.
//                                  Otherwise Start is pressed, so the suite begins in a session with the defaults.
module.exports = function load(file, opts = {}) {
  const dir = (SITE_DIR + '/');
  const storage = Object.assign({}, opts.storage, opts.notation ? { 'telugu.settings.v1': JSON.stringify({ notation: opts.notation }) } : {});
  const html = fs.readFileSync(dir + file, 'utf8').replace(/<link[^>]*>/g, '')
    .replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>' + fs.readFileSync(path.resolve(dir, path.dirname(file), src), 'utf8') + '</script>');
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' + file,
    beforeParse(win) { Object.entries(storage).forEach(([k, v]) => win.localStorage.setItem(k, v)); if (opts.before) opts.before(win); } });
  const w = dom.window, d = w.document;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  const realST = w.setTimeout.bind(w);
  w.setTimeout = fn => realST(fn, 0);
  const tick = () => new Promise(r => realST(r, 5));
  if (opts.setup !== 'open' && d.getElementById('setup') && !d.getElementById('setup').hidden) d.getElementById('setup-start').click();
  let fails = 0;
  const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
  // The round's state. Every game is built on game-core.js and exposes it as GameCore.current:
  // { deck, current, total, completed, attempts, start(), front(pred), put(card) }.
  const game = () => w.GameCore.current;
  const front = pred => game().front(pred);          // bring a dealt card to the front and draw it
  // A stored miss as Review would show it now: { prompt, answer } (the store keeps the character, not the text)
  const shown = m => {
    if (!m || !m.ask) return m ? { prompt: m.prompt, answer: m.answer } : {};
    const N = w.TeluguData.notation, r = w.TeluguData.read(m.key, { syllable: !!m.syllable, any: true });
    const sound = N.wrap(N.of(r)) + (r.spoken ? `  ·  usually said /${r.spoken}/` : '');
    return m.ask === 'sound' ? { prompt: sound, answer: m.key } : { prompt: m.key, answer: sound };
  };
  // For a game with the session popup: open it, change what fn changes, and press Start (a new session).
  // flip() turns the direction around that way; again() presses "Practice Again" and then Start.
  const $$ = id => d.getElementById(id);
  const setup = fn => { w.GameSetup.current.open(); if (fn) fn(); $$('setup-start').click(); };
  const flip  = () => setup(() => $$('rev-btn').click());
  const again = () => { $$('retry-btn').click(); if ($$('setup') && !$$('setup').hidden) $$('setup-start').click(); };
  return { w, d, tick, ok, front, game, shown, setup, flip, again, $: id => d.getElementById(id), done: () => { console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0); } };
};
