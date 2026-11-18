const { SITE_DIR } = require('./config');
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
// load(file)                       the page as a first-time visitor gets it (sounds in IPA)
// load(file, { notation: 'iso' })  the page for a reader who chose ISO on the home page
// load(file, { storage: {...} })   any localStorage entries to have in place before the page's scripts run
module.exports = function load(file, opts = {}) {
  const dir = (SITE_DIR + '/');
  const storage = Object.assign({}, opts.storage, opts.notation ? { 'telugu.settings.v1': JSON.stringify({ notation: opts.notation }) } : {});
  const html = fs.readFileSync(dir + file, 'utf8').replace(/<link[^>]*>/g, '')
    .replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>' + fs.readFileSync(path.resolve(dir, path.dirname(file), src), 'utf8') + '</script>');
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' + file,
    beforeParse(win) { Object.entries(storage).forEach(([k, v]) => win.localStorage.setItem(k, v)); } });
  const w = dom.window, d = w.document;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  const realST = w.setTimeout.bind(w);
  w.setTimeout = fn => realST(fn, 0);
  const tick = () => new Promise(r => realST(r, 5));
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
  return { w, d, tick, ok, front, game, shown, $: id => d.getElementById(id), done: () => { console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0); } };
};
