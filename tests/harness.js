const { SITE_DIR } = require('./config');
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
module.exports = function load(file) {
  const dir = (SITE_DIR + '/');
  const html = fs.readFileSync(dir + file, 'utf8').replace(/<link[^>]*>/g, '')
    .replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>' + fs.readFileSync(path.resolve(dir, path.dirname(file), src), 'utf8') + '</script>');
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' + file });
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
  return { w, d, tick, ok, front, game, $: id => d.getElementById(id), done: () => { console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0); } };
};
