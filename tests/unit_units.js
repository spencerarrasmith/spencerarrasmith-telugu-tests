const { SITE_DIR } = require('./config');
// units.js: the one list of sections and tiles that the home page, Review and the placeholder pages all read.
const fs = require('fs'), path = require('path');
const U = require(path.join(SITE_DIR, 'units.js'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

ok(U.sections.map(s => s.title).join(' · ') === 'Resources · Alphabet · Grammar · Vocabulary · Advanced Grammar', 'five sections, Resources first');
ok(U.sections.map(s => s.tiles.length).join() === '5,8,8,12,8' && U.tiles.length === 41, 'tile counts 5/8/8/12/8 = 41');
ok(U.featured.map(t => t.id).join() === 'review' && U.all.length === 42 && U.all[0].id === 'review', 'Review is featured; all = Review + the 41 tiles');
ok(new Set(U.all.map(t => t.id)).size === 42 && new Set(U.all.map(t => t.src)).size === 42, 'ids and page paths are unique');
ok(U.all.every(t => t.id && t.icon && t.title && t.desc && t.src && /^[a-z0-9-]+$/.test(t.id)), 'every tile has id, icon, title, desc and src');
ok(U.all.every(t => fs.existsSync(path.join(SITE_DIR, t.src))), 'every src is a file');
const soon = U.tiles.filter(t => t.soon);
ok(soon.length === 34 && soon.every(t => ['learn', 'practise', 'fits'].every(k => typeof t.soon[k] === 'string' && t.soon[k].length > 10)), '34 placeholders, each with its three lines (learn, practise, fits)');
ok(U.tiles.filter(t => !t.soon).map(t => t.id).join() === 'rosetta,signs-conjuncts,phonemes,diacritics,conjuncts,lookalike-builder,lookalikes', 'the 7 built pages carry no `soon` block');
ok(!soon.some(t => /once progress tracking exists/.test(JSON.stringify(t.soon))), 'no placeholder still talks about progress tracking as future work');

// lookups
ok(U.get('phonemes').src === 'alphabet/01_phonemes.html' && U.get('review').src === 'review.html' && U.get('nope') === null, 'get(id) finds tiles and Review; null when unknown');
ok(U.sectionOf('vocab-greetings').title === 'Vocabulary' && U.sectionOf('rosetta').title === 'Resources' && U.sectionOf('review') === null, 'sectionOf(id) gives the section (none for Review)');

// Review names
ok(U.label('phonemes') === 'Phonemes' && U.label('conjuncts') === 'Conjuncts' && U.label('diacritics') === 'Diacritics', 'label: a game is named by its tile title');
ok(U.label('phonemes-reverse') === 'Phonemes (IPA → Telugu)' && U.label('diacritics-reverse') === 'Diacritics (IPA → Diacritics)' && U.label('lookalikes') === 'Lookalikes (IPA → Telugu)', 'label: `review` names win (second directions, longer names)');
ok(U.label('grammar-nouns') === 'Nouns: gender & number' && U.label('made_up-game') === 'Made up game', 'label: lessons use their tile title; an unlisted id is tidied up');
const reviewIds = U.all.flatMap(t => Object.keys(t.review || {}));
ok(U.all.every(t => Object.keys(t.review || {}).every(g => g === t.id || g.startsWith(t.id + '-'))), 'every `review` id belongs to the tile it sits on: ' + reviewIds.join(' '));

// the ids the built games actually record misses under all have a name here
const games = { 'alphabet/01_phonemes.html': ['phonemes', 'phonemes-reverse'], 'alphabet/02_diacritics.html': ['diacritics', 'diacritics-reverse'], 'alphabet/03_conjuncts.html': ['conjuncts'], 'alphabet/05_lookalikes.html': ['lookalikes'] };
ok(Object.entries(games).every(([f, ids]) => { const s = fs.readFileSync(path.join(SITE_DIR, f), 'utf8'); const g = (s.match(/const GAME\s*=\s*'([^']+)'/) || [])[1];
  return ids[0] === g && ids.every(id => U.get(id) || reviewIds.includes(id)) && (ids.length === 1 || /GAME \+ '-reverse'/.test(s)); }), 'each game\'s miss ids (GAME, GAME-reverse) are tiles or `review` names');

ok(Object.isFrozen(U), 'export is frozen');
const srcText = fs.readFileSync(path.join(SITE_DIR, 'units.js'), 'utf8');
ok(/throw new Error\('units: duplicate tile id/.test(srcText), 'a duplicate id fails loudly when the file loads');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
