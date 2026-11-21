// External Links (reference/00_external.html): the links laid out as the home page's sections and tiles,
// each tile with a thumbnail loaded from the site it leads to. Nothing here touches the network:
// Wikipedia's answer and the images arriving or failing are stood in for.
const load = require('./harness');
const fs = require('fs'), path = require('path'), { SITE_DIR } = require('./config');
const PAGE = 'reference/00_external.html';
const raw = fs.readFileSync(path.join(SITE_DIR, PAGE), 'utf8'), home = fs.readFileSync(path.join(SITE_DIR, 'home.css'), 'utf8');
const U = require(path.join(SITE_DIR, 'units.js'));

// Wikipedia's API as the page will see it. `answer` is the JSON it sends back, or an Error to fail with.
const asked = [];
const wikipedia = answer => win => { win.fetch = url => { asked.push(String(url)); return answer instanceof Error ? Promise.reject(answer) : Promise.resolve({ json: () => Promise.resolve(answer) }); }; };
const LEAD = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Lead.svg/480px-Lead.svg.png';
const ANSWER = { query: {
  normalized: [{ from: 'International_Phonetic_Alphabet', to: 'International Phonetic Alphabet' }],
  redirects:  [{ from: 'Telugu script', to: 'Telugu alphabet' }],
  pages: [{ title: 'International Phonetic Alphabet', thumbnail: { source: LEAD } }, { title: 'Help:IPA/Telugu' },
          { title: 'Telugu alphabet', thumbnail: { source: LEAD.replace('Lead', 'Script') } }] } };

(async () => {
  const h = load(PAGE, { before: wikipedia(ANSWER) }), { w, d, ok, tick } = h;
  await tick(); await tick();
  const all = (sel, root = d) => [...root.querySelectorAll(sel)];
  const tiles = all('a.tile.link'), img = t => t.querySelector('.tile-thumb img'), letter = t => t.querySelector('.tile-thumb span').textContent;
  const site = url => new URL(url).hostname.split('.').slice(-2).join('.');
  const fire = (el, type) => el.dispatchEvent(new w.Event(type));

  /* ── the tile on the home page ── */
  const tile = U.get('links');
  ok(tile && tile.src === PAGE && !tile.soon && U.sectionOf('links').title === 'Reference' && U.sections[0].tiles[0].id === 'links', 'External Links is the first Reference tile, and live');

  /* ── laid out like the home page ── */
  ok(d.title === 'External Links' && /<link rel="stylesheet" href="\.\.\/home\.css">/.test(raw) && !/<style/.test(raw), 'uses the home page stylesheet, with no styles of its own');
  ok(!/<script src=/.test(raw), 'loads no shared script: it needs no letters, progress, or settings');
  ok(d.querySelector('main.tile-page > .home-inner > #sections') && /#home, \.tile-page \{/.test(home), 'the page scrolls and is centered as the home page is');
  ok(all('.section').length === 3 && all('.section-title').map(e => e.textContent).join() === 'Wikipedia,Other Sites,Dictionaries' && all('.section-count').map(e => e.textContent).join() === '3 links,4 links,2 links', 'sections with a heading and a count: ' + all('.section-title').map(e => e.textContent).join(', '));
  ok(all('.section > .tiles').length === 3 && all('.tiles > a.tile.link').length === 9 && tiles.length === 9, 'nine tiles in the home page grid');
  ok(tiles.every(t => t.querySelector('.tile-thumb') && t.querySelector('.tile-body .tile-title').textContent.length > 3 && t.querySelector('.tile-body .tile-host')), 'each tile has a thumbnail, a title, and the site it leads to');
  ok(['.tile.link', '.tile-thumb', '.tile-thumb img', '.tile-thumb img.ok', '.tile-host', '.page-note'].every(sel => home.includes(sel + ' {') || home.includes(sel + '  {')), 'home.css styles the link tile, its thumbnail, and the note');

  /* ── the links ── */
  const WANT = ['https://en.wikipedia.org/wiki/International_Phonetic_Alphabet', 'https://en.wikipedia.org/wiki/Help:IPA/Telugu', 'https://en.wikipedia.org/wiki/Telugu_script',
                'https://www.omniglot.com/writing/telugu.htm', 'https://telugu.earth/', 'https://learn101.org/telugu.php',
                'https://docs.google.com/document/d/1OHqWFBpQA4yOoNP1sIEi2QsfUQj1cmOZcD673BLdD1k/edit',
                'https://andhrabharati.com/dictionary/', 'https://dsal.uchicago.edu/dictionaries/brown/'];
  ok(tiles.map(t => t.getAttribute('href')).join(' ') === WANT.join(' '), 'the nine links, in order');
  ok(tiles.every(t => t.target === '_blank' && /noopener/.test(t.rel) && /noreferrer/.test(t.rel)), 'every link opens in a new tab (the page sits in a frame) without handing over this page');
  ok(tiles.every(t => /^https:\/\//.test(t.href)), 'every link is https');
  ok(all('.tile-host').map(e => e.textContent).join() === 'en.wikipedia.org,en.wikipedia.org,en.wikipedia.org,omniglot.com,telugu.earth,learn101.org,docs.google.com,andhrabharati.com,dsal.uchicago.edu', 'each tile names its site: ' + all('.tile-host').map(e => e.textContent).join(', '));
  ok(tiles.every(t => t.querySelector('.tile-badge').textContent === '↗' && t.querySelector('.tile-badge').title === 'Opens in a new tab'), 'each tile is marked as leaving the app');
  ok(!/Wikiepdia/.test(raw) && all('.tile-title').every(e => !/Wiki[^p]/.test(e.textContent)), 'no misspelled site name');
  ok(all('.tile-desc').every(e => e.textContent.length > 20 && !/\.$/.test(e.textContent)), 'descriptions, where given, are one line with no closing period (as on the home page)');

  /* ── thumbnails come from the linked site ── */
  ok(asked.length === 1 && /^https:\/\/en\.wikipedia\.org\/w\/api\.php\?/.test(asked[0]) && /prop=pageimages/.test(asked[0]) && /origin=\*/.test(asked[0]), 'Wikipedia is asked once for the lead images of its three articles');
  ok(decodeURIComponent(asked[0].split('titles=')[1]) === 'International Phonetic Alphabet|Help:IPA/Telugu|Telugu script', 'by the titles in the links: ' + decodeURIComponent(asked[0].split('titles=')[1]));
  ok(img(tiles[0]).src === LEAD && img(tiles[2]).src === LEAD.replace('Lead', 'Script'), 'an article shows its own lead image (a redirected title is followed)');
  ok(img(tiles[1]).src === 'https://en.wikipedia.org/static/apple-touch/wikipedia.png', 'a Wikipedia page with no lead image shows Wikipedia\'s icon');
  ok(img(tiles[3]).src === 'https://www.omniglot.com/favicon.ico' && img(tiles[4]).src === 'https://telugu.earth/favicon.ico' && img(tiles[5]).src === 'https://learn101.org/favicon.ico' && img(tiles[6]).src === 'https://docs.google.com/favicon.ico', 'any other site shows its own icon');
  ok(tiles.every(t => { const s = site(img(t).src), l = site(t.href); return s === l || (l === 'wikipedia.org' && s === 'wikimedia.org'); }), 'every thumbnail is served by the site the tile leads to (Wikipedia\'s by its image host)');
  ok(!/<img/.test(raw) && fs.readdirSync(path.join(SITE_DIR, 'reference')).every(f => !/\.(png|jpe?g|gif|svg|ico|webp)$/i.test(f)), 'no image is copied into the app');
  ok(tiles.every(t => img(t).getAttribute('referrerpolicy') === 'no-referrer' && img(t).alt === ''), 'images are requested without a referrer and are decorative (empty alt)');

  /* ── an image that arrives, and one that does not ── */
  ok(tiles.map(letter).join('') === 'WWWOTLGAU' && tiles.every(t => !img(t).classList.contains('ok')), 'until its image arrives a tile shows the site\'s initial: ' + tiles.map(letter).join(' '));
  fire(img(tiles[0]), 'load');
  ok(img(tiles[0]).classList.contains('ok'), 'an image that loads is shown');
  fire(img(tiles[4]), 'error');
  ok(!img(tiles[4]) && letter(tiles[4]) === 'T', 'an image that fails is taken away, leaving the initial');
  fire(img(tiles[2]), 'error');
  ok(img(tiles[2]) && img(tiles[2]).src === 'https://en.wikipedia.org/static/apple-touch/wikipedia.png', 'if an article\'s image fails, Wikipedia\'s icon is tried next');
  fire(img(tiles[2]), 'error');
  ok(!img(tiles[2]) && letter(tiles[2]) === 'W', 'and if that fails too, the initial stays');

  /* ── Wikipedia cannot be reached, or there is no fetch at all ── */
  for (const [what, before] of [['Wikipedia cannot be reached', wikipedia(new Error('offline'))], ['the API answers with nothing usable', wikipedia({ error: { code: 'x' } })], ['the browser has no fetch', win => { delete win.fetch; }]]) {
    const o = load(PAGE, { before }); await o.tick(); await o.tick();
    const t = [...o.d.querySelectorAll('a.tile.link')];
    ok(o.d.querySelectorAll('a.tile.link').length === 9 && t.slice(0, 3).every(x => img(x) && img(x).src === 'https://en.wikipedia.org/static/apple-touch/wikipedia.png') && img(t[3]).src === 'https://www.omniglot.com/favicon.ico',
      'when ' + what + ', the Wikipedia tiles show Wikipedia\'s icon and the page is otherwise the same');
  }

  /* ── an image address from anywhere but Wikipedia's image host is not used ── */
  { const o = load(PAGE, { before: wikipedia({ query: { pages: [{ title: 'International Phonetic Alphabet', thumbnail: { source: 'https://example.com/x.png' } }] } }) }); await o.tick(); await o.tick();
    ok(img(o.d.querySelector('a.tile.link')).src === 'https://en.wikipedia.org/static/apple-touch/wikipedia.png', 'an image address that is not on Wikipedia\'s image host is ignored'); }

  /* ── the list is easy to edit ── */
  const script = raw.split('<script>').pop();
  ok(/const SECTIONS = \[/.test(script) && /CONFIG/.test(script) && (script.match(/href: 'https:/g) || []).length === 9, 'the links are one list at the top of the page\'s script');
  ok(!/thumb: '/.test(script.split('const WIKIPEDIA_ICON')[0]), 'no link needs a hand-written thumbnail address: the rule finds one');
  h.done();
})();
