const { SITE_DIR } = require('./config');
// units.js: the one list of sections and tiles that the home page, Review, and the placeholder pages all read.
const fs = require('fs'), path = require('path');
const U = require(path.join(SITE_DIR, 'units.js'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

ok(U.sections.map(s => s.title).join(' · ') === 'Reference · Alphabet · Grammar · Vocabulary · Advanced Grammar', 'five sections, Reference first');
ok(U.sections.map(s => s.tiles.length).join() === '7,8,8,12,8' && U.tiles.length === 43, 'tile counts 7/8/8/12/8 = 43');
ok(U.featured.map(t => t.id).join() === 'review' && U.all.length === 44 && U.all[0].id === 'review', 'Review is featured; all = Review + the 43 tiles');
ok(new Set(U.all.map(t => t.id)).size === 44 && new Set(U.all.map(t => t.src)).size === 44, 'ids and page paths are unique');
ok(U.all.every(t => t.id && t.icon && t.title && t.desc && t.src && /^[a-z0-9-]+$/.test(t.id)), 'every tile has id, icon, title, desc, and src');
ok(U.all.every(t => fs.existsSync(path.join(SITE_DIR, t.src))), 'every src is a file');
const soon = U.tiles.filter(t => t.soon);
ok(soon.length === 34 && soon.every(t => ['learn', 'practice', 'fits'].every(k => typeof t.soon[k] === 'string' && t.soon[k].length > 10)), '34 placeholders, each with its three lines (learn, practice, fits)');
ok(U.tiles.filter(t => !t.soon).map(t => t.id).join() === 'links,rosetta,signs-conjuncts,sound-charts,phonemes,diacritics,conjuncts,lookalike-builder,lookalikes', 'the 9 built pages carry no `soon` block');
ok(!soon.some(t => /once progress tracking exists/.test(JSON.stringify(t.soon))), 'no placeholder still talks about progress tracking as future work');

// lookups
ok(U.get('phonemes').src === 'alphabet/01_phonemes.html' && U.get('review').src === 'review.html' && U.get('nope') === null, 'get(id) finds tiles and Review; null when unknown');
ok(U.sectionOf('vocab-greetings').title === 'Vocabulary' && U.sectionOf('rosetta').title === 'Reference' && U.sectionOf('review') === null, 'sectionOf(id) gives the section (none for Review)');

// Review names
ok(U.label('phonemes') === 'Phonemes' && U.label('conjuncts') === 'Conjuncts' && U.label('diacritics') === 'Diacritics', 'label: a game is named by its tile title');
ok(/\{sound\} → Telugu/.test(U.get('phonemes').review['phonemes-reverse']) && U.label('phonemes-reverse') === 'Phonemes (IPA → Telugu)' && U.label('diacritics-reverse') === 'Diacritics (IPA → Diacritics)' && U.label('conjuncts-reverse') === 'Conjuncts (IPA → Conjuncts)' && U.label('lookalikes') === 'Lookalikes (IPA → Telugu)', 'label: `review` names win (second directions, longer names)');
// …and follow the reader's notation when settings.js is loaded
(() => { const { JSDOM } = require('jsdom'); const read = f => fs.readFileSync(path.join(SITE_DIR, f), 'utf8');
  const w = new JSDOM(`<script>${read('settings.js')}</script><script>${read('units.js')}</script>`, { runScripts: 'dangerously', url: 'http://localhost/' }).window;
  const a = w.TeluguUnits.label('phonemes-reverse'); w.TeluguSettings.set('notation', 'iso');
  ok(a === 'Phonemes (IPA → Telugu)' && w.TeluguUnits.label('phonemes-reverse') === 'Phonemes (ISO → Telugu)' && w.TeluguUnits.label('conjuncts-reverse') === 'Conjuncts (ISO → Conjuncts)' && w.TeluguUnits.label('lookalikes') === 'Lookalikes (ISO → Telugu)' && w.TeluguUnits.label('phonemes') === 'Phonemes', 'label: {sound} becomes IPA or ISO, whichever is chosen (re-read each time)');
  ok(U.tiles.every(t => !/\bIPA\b/.test(t.desc) || t.id === 'rosetta') && U.all.every(t => Object.values(t.review || {}).every(n => !/IPA|ISO/.test(n))), 'no tile text is tied to one notation (Rosetta Stone, which shows both, aside)');
})();
ok(U.label('grammar-nouns') === 'Nouns: gender & number' && U.label('made_up-game') === 'Made up game', 'label: lessons use their tile title; an unlisted id is cleaned up');
const reviewIds = U.all.flatMap(t => Object.keys(t.review || {}));
ok(U.all.every(t => Object.keys(t.review || {}).every(g => g === t.id || g.startsWith(t.id + '-'))), 'every `review` id belongs to the tile it sits on: ' + reviewIds.join(' '));

// the ids the built games actually record misses under all have a name here
const games = { 'alphabet/01_phonemes.html': ['phonemes', 'phonemes-reverse'], 'alphabet/02_diacritics.html': ['diacritics', 'diacritics-reverse'], 'alphabet/03_conjuncts.html': ['conjuncts', 'conjuncts-reverse'], 'alphabet/05_lookalikes.html': ['lookalikes'] };
ok(Object.entries(games).every(([f, ids]) => { const s = fs.readFileSync(path.join(SITE_DIR, f), 'utf8'); const g = (s.match(/const GAME\s*=\s*'([^']+)'/) || [])[1];
  return ids[0] === g && ids.every(id => U.get(id) || reviewIds.includes(id)) && (ids.length === 1 || /GAME \+ '-reverse'/.test(s)); }), 'each game\'s miss ids (GAME, GAME-reverse) are tiles or `review` names');

// icons: Telugu characters where the page is about the script, otherwise plain object / symbol emojis
const icon = id => U.get(id).icon, isTe = s => /^[\u0C00-\u0C7Fa-z]+$/.test(s);
ok(icon('phonemes') === 'క' && icon('diacritics') === 'కా' && icon('conjuncts') === 'క్ష', 'Phonemes, Diacritics, and Conjuncts tiles: క, కా, క్ష');
ok(['rosetta', 'signs-conjuncts', 'phonemes', 'diacritics', 'conjuncts', 'lookalikes', 'alphabet-chart', 'vocab-numbers'].every(id => isTe(icon(id))), 'the script pages (and Numbers) use Telugu characters: ' + ['rosetta', 'signs-conjuncts', 'lookalikes', 'alphabet-chart', 'vocab-numbers'].map(icon).join(' '));
ok(U.all.filter(t => isTe(t.icon)).every(t => [...t.icon.replace(/[\u0C3E-\u0C4D\u0C55\u0C56\u0C62\u0C63]/g, '')].length <= 2), 'a Telugu icon is at most two letters wide (it has to fit the icon box)');
const PLAYFUL = /[\u{1F440}\u{1F44B}\u{1F64B}\u{1F9E9}\u{1F3AF}\u{1F600}-\u{1F64E}\u{1F910}-\u{1F92F}\u{1F970}-\u{1F97A}]/u;
ok(U.all.every(t => !PLAYFUL.test(t.icon)), 'no faces or playful emojis (👀 👋 🙋 🧩 🎯 …) on any tile' + U.all.filter(t => PLAYFUL.test(t.icon)).map(t => ' ' + t.id).join());
ok(U.all.every(t => [...t.icon.replace(/\uFE0F/g, '')].length <= 4 && t.icon.trim() === t.icon), 'every icon is short');
ok(Object.isFrozen(U), 'export is frozen');
const srcText = fs.readFileSync(path.join(SITE_DIR, 'units.js'), 'utf8');
ok(/throw new Error\('units: duplicate tile id/.test(srcText), 'a duplicate id fails loudly when the file loads');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
