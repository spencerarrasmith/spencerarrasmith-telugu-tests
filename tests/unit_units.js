const { SITE_DIR } = require('./config');
// units.js: the one list of sections and tiles that the home page, Review, and the placeholder pages all read.
const fs = require('fs'), path = require('path');
const U = require(path.join(SITE_DIR, 'units.js'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

ok(U.sections.map(s => s.title).join(' · ') === 'Reference · Training · Alphabet · Grammar · Vocabulary · Advanced Grammar', 'six sections: Reference first, then Training, above Alphabet');
ok(U.sections.map(s => s.tiles.length).join() === '7,3,4,8,12,8' && U.tiles.length === 42, 'tile counts 7/3/4/8/12/8 = 42');
ok(!('featured' in U) && U.all === U.tiles && U.all.length === 42 && U.sections[1].tiles[0].id === 'review', 'Review is a tile like any other, the first in Training: nothing is pinned above the sections any more');
// pages that are not tiles (reached from the top right of the home page), and the games whose sessions the Profile page charts
ok(JSON.stringify(U.pages) === '[{"id":"profile","title":"Profile","src":"profile.html"}]' && fs.existsSync(path.join(SITE_DIR, 'profile.html')) && !U.all.some(t => U.pages.some(p => p.id === t.id || p.src === t.src)), 'pages: Profile, with its own id and file, and not among the tiles');
const charted = U.all.filter(t => t.stats).map(t => t.id), onCore = U.all.filter(t => !t.soon && /<script src="[^"]*game-core\.js">/.test(fs.readFileSync(path.join(SITE_DIR, t.src), 'utf8'))).map(t => t.id);
ok(charted.join() === 'phonemes,diacritics,conjuncts,words' && U.all.every(t => t.stats === undefined || t.stats === true), 'stats: true marks the four games the Profile page charts: Phonemes, Diacritics, Conjuncts, Words');
// A game is recorded exactly when it is charted: every page built on game-core.js either has `stats` on its tile or tells the core to keep no record
const keepsNone = id => /GameCore\.create\(\{[^]*?\n\s*record:\s*false,/.test(fs.readFileSync(path.join(SITE_DIR, U.get(id).src), 'utf8'));
ok(onCore.join() === 'lookalikes,phonemes,diacritics,conjuncts,words' && onCore.every(id => charted.includes(id) !== keepsNone(id)) && keepsNone('lookalikes'),
  'the five games are built on game-core.js; the four charted ones are recorded, and Lookalikes (a training tool) asks for no record: record: false');
ok(new Set(U.all.map(t => t.id)).size === 42 && new Set(U.all.map(t => t.src)).size === 42, 'ids and page paths are unique');
ok(U.all.every(t => t.id && t.icon && t.title && t.desc && t.src && /^[a-z0-9-]+$/.test(t.id)), 'every tile has id, icon, title, desc, and src');
ok(U.all.every(t => fs.existsSync(path.join(SITE_DIR, t.src))), 'every src is a file');
const soon = U.tiles.filter(t => t.soon);
// the Training section (the two lookalike pages, moved out of Alphabet into a folder of their own), and what is left in Alphabet
ok(U.sections[1].title === 'Training' && U.sections[1].tiles.map(t => t.id + ' ' + t.src).join() === 'review training/01_review.html,lookalike-builder training/02_lookalike-builder.html,lookalikes training/03_lookalikes.html'
  && U.sectionOf('lookalikes').title === 'Training' && U.sectionOf('review').title === 'Training' && !U.get('lookalikes').stats && !U.get('lookalike-builder').stats && !U.get('review').stats
  && !fs.existsSync(path.join(SITE_DIR, 'review.html')) && !/[.!?]$/.test(U.get('review').desc),
  'Training: Review, Lookalike Builder, Lookalikes, in training/, numbered from 01; none is charted on the Profile page');
ok(U.sections[2].title === 'Alphabet' && U.sections[2].tiles.map(t => t.id).join() === 'phonemes,diacritics,conjuncts,words' && ['spelling', 'writing', 'alphabet-chart'].every(id => !U.get(id))
  && fs.readdirSync(path.join(SITE_DIR, 'alphabet')).sort().join() === '01_phonemes.html,02_diacritics.html,03_conjuncts.html,04_words.html,words-data.js',
  'Alphabet: Phonemes, Diacritics, Conjuncts, Words, and nothing else in its folder but the word list');
{ // nothing in the app still points at where those pages used to be
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
  const stale = walk(SITE_DIR).filter(f => /\.(html|js|css|md)$/.test(f) && /alphabet\/0\d_lookalike|0[1456]_lookalike|0[12]_lookalikes|06_spelling|07_writing|08_alphabet-chart|["'`(\s]review\.html/.test(fs.readFileSync(f, 'utf8'))).map(f => path.relative(SITE_DIR, f));
  ok(stale.length === 0 && fs.readdirSync(path.join(SITE_DIR, 'training')).sort().join() === '01_review.html,02_lookalike-builder.html,03_lookalikes.html', 'no file mentions the old paths of Review or the lookalike pages, or the removed pages; training/ holds exactly the three ' + stale.join(' ')); }
ok(!U.get('words').soon && U.get('words').stats === true && U.get('words').src === 'alphabet/04_words.html' && !/[.!?]$/.test(U.get('words').desc) && U.label('words') === 'Words', 'Words is a built game, fourth in Alphabet, charted on the Profile page: ' + U.get('words').desc);
// pages are named NN_name.html, numbered in the order their tiles appear (README, "Conventions")
const fileNo = t => +path.basename(t.src).slice(0, 2);
ok(U.sections.every(sec => sec.tiles.every((t, i) => /^\d\d_/.test(path.basename(t.src)) && (i === 0 || fileNo(t) === fileNo(sec.tiles[i - 1]) + 1))),
  'in every section the file numbers follow the tile order, with none skipped (a removed page renumbers the ones after it)');
ok(soon.length === 31 && soon.every(t => ['learn', 'practice', 'fits'].every(k => typeof t.soon[k] === 'string' && t.soon[k].length > 10)), '31 placeholders, each with its three lines (learn, practice, fits)');
ok(U.tiles.filter(t => !t.soon).map(t => t.id).join() === 'links,rosetta,signs-conjuncts,sound-charts,review,lookalike-builder,lookalikes,phonemes,diacritics,conjuncts,words', 'the 11 built pages carry no `soon` block');
ok(!soon.some(t => /once progress tracking exists/.test(JSON.stringify(t.soon))), 'no placeholder still talks about progress tracking as future work');

// lookups
ok(U.get('phonemes').src === 'alphabet/01_phonemes.html' && U.get('review').src === 'training/01_review.html' && U.get('nope') === null, 'get(id) finds a tile, Review included; null when unknown');
ok(U.sectionOf('vocab-greetings').title === 'Vocabulary' && U.sectionOf('rosetta').title === 'Reference' && U.sectionOf('review').title === 'Training' && U.sectionOf('nope') === null, 'sectionOf(id) gives the section (Training for Review; none for an unknown id)');

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
/* ── titles and headings are written in title case ── */
{
  // Title case: every word starts with a capital, except a short joining word (and, or, of, to, in …) that is not the first.
  // A word after a hyphen follows the word it is joined to (Non-sibilant), and anything that is not a Latin word is left alone.
  const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'nor', 'but', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'as', 'vs']);
  const titled = t => t.split(/[\s·:&/()]+/).filter(w => /^[A-Za-z]/.test(w)).every((w, i) => /^[A-Z]/.test(w) || (i > 0 && SMALL.has(w)));
  ok(titled('Signs & Conjuncts') && titled('Tap or Flap') && titled('Non-sibilant Fricative') && !titled('Signs & conjuncts') && !titled('Sound charts') && !titled('of Mice'), 'the title-case check itself: "Signs & Conjuncts" passes, "Sound charts" does not');
  const names = [...U.sections.map(s => s.title), ...U.all.map(t => t.title), ...U.pages.map(p => p.title)];
  const low = names.filter(t => !titled(t));
  ok(names.length === 6 + 42 + 1 && low.length === 0, 'every section, tile, and page name in units.js is in title case ' + low.join(' | '));
  ok(['Signs & Conjuncts', 'Sound Charts', 'Idioms & Proverbs', 'Nouns: Gender & Number', 'Post Office · Phone · Bank', 'Voice & Causatives', 'At Home'].every(t => U.all.some(x => x.title === t)), 'among them: Signs & Conjuncts, Sound Charts, Post Office · Phone · Bank …');
  // each tile's page is titled as its tile is (a lesson or placeholder adds "· Telugu Suite")
  const unesc = t => t.replace(/&amp;/g, '&');
  const page = t => fs.readFileSync(path.join(SITE_DIR, t.src), 'utf8');
  const mis = U.all.filter(t => { const m = page(t).match(/<title>([^<]*)<\/title>/); return !m || ![t.title, t.title + ' · Telugu Suite'].includes(unesc(m[1])); }).map(t => t.id);
  ok(mis.length === 0, 'the <title> of every tile\'s page is the tile\'s title, capitals and all ' + mis.join(' '));
  // the headings written into the pages themselves (h1 to h3), the template included
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
  const heads = walk(SITE_DIR).filter(f => f.endsWith('.html')).flatMap(f => [...fs.readFileSync(f, 'utf8').matchAll(/<(h[1-3]|title)\b[^>]*>([^<$]+)<\/\1>|\{ h: '([^']+)' \}|^\s*title:\s{2,}'([^']+)',$|<a href="#sec-[a-z]+">([^<]+)<\/a>/gm)].map(m => [path.relative(SITE_DIR, f), unesc(m[2] || m[3] || m[4] || m[5]).trim()]));
  const lowHeads = heads.filter(([, t]) => !titled(t)).map(([f, t]) => f + ': ' + t);
  ok(heads.length > 60 && heads.some(([f, t]) => f === 'training/01_review.html' && t === 'Nothing to Review') && heads.some(([, t]) => t === 'Conjunct Forms') && heads.some(([, t]) => t === 'Looks Like') && heads.some(([, t]) => t === 'What This Part Is For') && lowHeads.length === 0,
    'every heading written into a page (' + heads.length + ' of them: titles, h1 to h3, and the links that jump to them) is in title case ' + lowHeads.join(' | '));
  const src = f => fs.readFileSync(path.join(SITE_DIR, f), 'utf8');
  ok(/\['signs', 'Vowel Signs'\]/.test(src('reference/01_rosetta.html')) && /title: 'Correct Answers'/.test(src('profile.html')) && /title: 'Error Rate'/.test(src('profile.html')) && /<th>Error Rate<\/th>/.test(src('profile.html')) && /\{ title: 'Other Sites',/.test(src('reference/00_external.html'))
    && /'Sibilant Fricative', 'Non-sibilant Fricative',/.test(src('reference/sound-charts-data.js')) && /'Tap or Flap'/.test(src('reference/sound-charts-data.js')),
    'and so are the headings a page builds as it loads: Rosetta\'s "Vowel Signs", Profile\'s panels and table, the External Links sections, the rows of the consonant chart');
}
ok(U.label('grammar-nouns') === 'Nouns: Gender & Number' && U.label('made_up-game') === 'Made up game', 'label: lessons use their tile title; an unlisted id is cleaned up');
const reviewIds = U.all.flatMap(t => Object.keys(t.review || {}));
ok(U.all.every(t => Object.keys(t.review || {}).every(g => g === t.id || g.startsWith(t.id + '-'))), 'every `review` id belongs to the tile it sits on: ' + reviewIds.join(' '));

// the ids the built games actually record misses under all have a name here
const games = { 'alphabet/01_phonemes.html': ['phonemes', 'phonemes-reverse'], 'alphabet/02_diacritics.html': ['diacritics', 'diacritics-reverse'], 'alphabet/03_conjuncts.html': ['conjuncts', 'conjuncts-reverse'], 'training/03_lookalikes.html': ['lookalikes'] };
ok(Object.entries(games).every(([f, ids]) => { const s = fs.readFileSync(path.join(SITE_DIR, f), 'utf8'); const g = (s.match(/const GAME\s*=\s*'([^']+)'/) || [])[1];
  return ids[0] === g && ids.every(id => U.get(id) || reviewIds.includes(id)) && (ids.length === 1 || /GAME \+ '-reverse'/.test(s)); }), 'each game\'s miss ids (GAME, GAME-reverse) are tiles or `review` names');

// icons: Telugu characters where the page is about the script, otherwise plain object / symbol emojis
const icon = id => U.get(id).icon, isTe = s => /^[\u0C00-\u0C7Fa-z]+$/.test(s);
ok(icon('phonemes') === 'క' && icon('diacritics') === 'కా' && icon('conjuncts') === 'క్ష', 'Phonemes, Diacritics, and Conjuncts tiles: క, కా, క్ష');
ok(['rosetta', 'signs-conjuncts', 'phonemes', 'diacritics', 'conjuncts', 'words', 'lookalikes', 'vocab-numbers'].every(id => isTe(icon(id))), 'the script pages (and Numbers) use Telugu characters: ' + ['rosetta', 'signs-conjuncts', 'words', 'lookalikes', 'vocab-numbers'].map(icon).join(' '));
ok(U.all.filter(t => isTe(t.icon)).every(t => [...t.icon.replace(/[\u0C3E-\u0C4D\u0C55\u0C56\u0C62\u0C63]/g, '')].length <= 2), 'a Telugu icon is at most two letters wide (it has to fit the icon box)');
const PLAYFUL = /[\u{1F440}\u{1F44B}\u{1F64B}\u{1F9E9}\u{1F3AF}\u{1F600}-\u{1F64E}\u{1F910}-\u{1F92F}\u{1F970}-\u{1F97A}]/u;
ok(U.all.every(t => !PLAYFUL.test(t.icon)), 'no faces or playful emojis (👀 👋 🙋 🧩 🎯 …) on any tile' + U.all.filter(t => PLAYFUL.test(t.icon)).map(t => ' ' + t.id).join());
ok(U.all.every(t => [...t.icon.replace(/\uFE0F/g, '')].length <= 4 && t.icon.trim() === t.icon), 'every icon is short');
ok(Object.isFrozen(U), 'export is frozen');
const srcText = fs.readFileSync(path.join(SITE_DIR, 'units.js'), 'utf8');
ok(/throw new Error\('units: duplicate tile id/.test(srcText), 'a duplicate id fails loudly when the file loads');
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
