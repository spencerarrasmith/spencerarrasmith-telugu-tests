// Runs every test script, prints one line each, and exits non-zero if any failed.
// In GitHub Actions it also writes a table to the job summary.
const { spawnSync } = require('child_process'); const fs = require('fs'), path = require('path');
const { SITE_DIR } = require('./tests/config');              // fails early, with a clear message, if SITE_DIR is wrong
process.env.SITE_DIR = SITE_DIR;                             // so every test (and the Python check) sees the same folder
const T = path.join(__dirname, 'tests');
const ORDER = ['e2e_links', 'static_css', 'unit_settings', 'unit_units', 'unit_data', 'unit_progress', 'unit_lookalikes', 'e2e_index', 'e2e_profile', 'e2e_review', 'e2e_lesson', 'e2e_placeholder',
  'e2e_gamecore', 'e2e_setup', 'e2e_pho', 'e2e_pho2', 'e2e_pho3', 'e2e_pho4', 'e2e_dia', 'e2e_dia2', 'e2e_dia3', 'e2e_conj', 'e2e_conj2', 'e2e_conj3',
  'e2e_builder', 'e2e_look', 'e2e_external', 'e2e_rosetta', 'e2e_signs', 'e2e_sounds', 'e2e_iso', 'e2e_browser'];
const only = process.argv.slice(2);                          // npm test -- e2e_index e2e_signs
const list = only.length ? only : ORDER;
const results = [];
const run = (name, cmd, args) => {
  const t0 = Date.now(); const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 240000, env: process.env, maxBuffer: 64 << 20 });
  const out = (r.stdout || '') + (r.stderr || ''); const ok = r.status === 0;
  const fails = out.split('\n').filter(l => /^FAIL /.test(l));
  const checks = out.split('\n').filter(l => /^(PASS|FAIL) /.test(l)).length;
  results.push({ name, ok, checks, fails, secs: ((Date.now() - t0) / 1000).toFixed(1), tail: ok ? '' : out.split('\n').slice(-12).join('\n') });
  console.log((ok ? '  ok   ' : '  FAIL ') + name.padEnd(18) + String(checks).padStart(4) + ' checks  ' + results.at(-1).secs + 's');
  fails.slice(0, 12).forEach(l => console.log('         ' + l));
  if (!ok && !fails.length) console.log(results.at(-1).tail.split('\n').map(l => '         ' + l).join('\n'));
};
console.log('Testing ' + SITE_DIR + '\n');
list.forEach(n => run(n, 'node', [path.join(T, n + '.js')]));
if (!only.length) {
  const py = spawnSync('python3', ['-c', 'import fontTools, uharfbuzz'], { encoding: 'utf8' });
  if (py.status === 0) run('verify_notes (font)', 'python3', ['-I', path.join(T, 'verify_notes.py')]);
  else console.log('  skip verify_notes (font)   pip install fonttools uharfbuzz to enable');
  const py2 = spawnSync('python3', ['-c', 'import fontTools, brotli'], { encoding: 'utf8' });
  if (py2.status === 0) run('verify_fonts (font)', 'python3', ['-I', path.join(T, 'verify_fonts.py')]);
  else console.log('  skip verify_fonts (font)   pip install fonttools brotli to enable');
}
const bad = results.filter(r => !r.ok), total = results.reduce((a, r) => a + r.checks, 0);
console.log('\n' + (bad.length ? bad.length + ' of ' + results.length + ' suites FAILED' : 'All ' + results.length + ' suites passed') + ' (' + total + ' checks)');
if (process.env.GITHUB_STEP_SUMMARY) {
  const md = ['## Telugu app tests', '', bad.length ? '**' + bad.length + ' of ' + results.length + ' suites failed**' : '**All ' + results.length + ' suites passed** (' + total + ' checks)', '',
    '| Suite | Result | Checks | Time |', '|---|---|---|---|', ...results.map(r => `| ${r.name} | ${r.ok ? 'pass' : 'FAIL'} | ${r.checks} | ${r.secs}s |`), '',
    ...bad.flatMap(r => ['### ' + r.name, '```', ...(r.fails.length ? r.fails : [r.tail]), '```'])].join('\n');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
}
process.exit(bad.length ? 1 : 0);
