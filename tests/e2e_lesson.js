const { SITE_DIR } = require('./config');
const { JSDOM } = require('jsdom'); const fs = require('fs');
const dir = (SITE_DIR + '/');
const html = fs.readFileSync(dir + 'lesson-template.html', 'utf8').replace(/<link[^>]*>/g, '').replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>' + fs.readFileSync(require('path').resolve(dir, require('path').dirname('lesson-template.html'), src), 'utf8') + '</script>');
const errs = [];
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/lesson-template.html',
  virtualConsole: new (require('jsdom').VirtualConsole)().on('jsdomError', e => errs.push(e.message)) });
const w = dom.window, d = w.document; let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const $ = s => d.querySelector(s), vis = id => !$('#panel-' + id).hidden;
const P = w.TeluguProgress;
(async () => {
  ok(errs.length === 0, 'template loads with no script errors ' + errs.join('|'));
  ok(d.title === 'Lesson Template · Telugu Suite', 'document title set');
  ok([...d.querySelectorAll('.step')].map(b => b.textContent).join() === 'Learn,Remarks,Practice', 'three steps: Learn, Remarks, Practice');
  ok(vis('learn') && !vis('remarks') && !vis('practice') && $('#ls-back').disabled, 'starts on Learn; Back disabled');
  ok($('#tab-learn').getAttribute('aria-selected') === 'true' && $('#tab-practice').getAttribute('aria-selected') === 'false', 'aria-selected follows the active tab');
  ok(!!$('#panel-learn table') && $('#panel-learn tbody tr').querySelector('.te') && $('#panel-learn .example .te-big').textContent === 'క', 'blocks render: paragraph, list, table (from shared data), examples');
  ok($('#panel-learn tbody').children.length === 4, 'table rows come from telugu-data.js');
  $('#ls-next').click(); ok(vis('remarks') && !vis('learn'), 'Next → Remarks');
  ok($('#panel-remarks .note') && $('#panel-remarks h2'), 'remarks: plain strings become notes, blocks still work');
  $('#ls-next').click(); ok(vis('practice') && $('#ls-next').hidden, 'Next → Practice; no Next on the last step');
  $('#tab-learn').click(); ok(vis('learn'), 'tabs jump directly');
  $('#tab-practice').click();
  const before = $('#d-opts').children.length; $('#tab-learn').click(); $('#tab-practice').click();
  ok(before === 4 && $('#d-opts').children.length === 4, 'practice is built once and keeps its state when switching tabs');

  // play: first a wrong answer, then all right
  const prompt = () => $('#d-prompt').textContent;
  const ipaOf = ch => w.TeluguData.letters.find(l => l.ch === ch).ipa;
  const wrong = [...d.querySelectorAll('#d-opts button')].find(b => b.dataset.ipa !== ipaOf(prompt()));
  const missed = prompt(); wrong.click();
  const m = P.misses().find(x => x.game === 'lesson-template');
  ok(m && m.key === missed && m.ask === 'telugu' && !('answer' in m) && m.note === 'Velar', 'ctx.miss({key, ask}) reaches the Review store as the letter and what was asked: ' + (m && m.key + ' ' + m.ask));
  ok(!$('#ls-done') && !d.querySelector('.pill') && !d.querySelector('.title-row'), 'a lesson has no "Completed" pill');
  let g = 0; while ($('#d-opts').children.length && g++ < 20) [...d.querySelectorAll('#d-opts button')].find(b => b.dataset.ipa === ipaOf(prompt())).click();
  ok($('#d-prompt').textContent === '✓' && $('#d-fb').textContent === 'Done' && !$('#d-opts').children.length, 'the practice runs to its end and says "Done"');
  const saved = JSON.parse(w.localStorage.getItem('telugu.progress.v1'));
  ok(!$('#ls-done') && !$('.toast') && !('done' in saved) && Object.keys(saved.misses).length === 1, 'finishing it marks nothing as completed: no pill, no toast, no "done" record (the miss is still kept for Review)');
  const shellSrc = fs.readFileSync(dir + 'lesson-shell.js', 'utf8'), shellCss = fs.readFileSync(dir + 'shell.css', 'utf8');
  ok(!/complete\(|isComplete|ls-done|toast/.test(shellSrc.split('════════ */')[1] || shellSrc) && !/ctx\.complete/.test(html) && !/\.pill\.done|\.toast/.test(shellCss), 'lesson-shell.js, the template, and shell.css have no completion left (ctx gives a lesson id and miss() only)');

  // a lesson with only one step
  const again = w.LessonShell.mount({ id: 'lesson-template', section: 'S', title: 'T', learn: ['x'] }, d.getElementById('lesson'));
  ok(!$('#ls-done') && again.stages.join() === 'learn' && Object.keys(again.ctx).sort().join() === 'id,miss', 'unused steps are hidden; ctx is { id, miss }');
  ok($('#ls-back').hidden && $('#ls-next').hidden, 'single-step lesson shows no Back/Next');
  let threw = false; try { w.LessonShell.mount({ id: 'x', section: 's', title: 't' }); } catch (e) { threw = /nothing to show/.test(e.message); }
  ok(threw, 'mount() with no content fails loudly');
  threw = false; try { w.LessonShell.block({ nonsense: 1 }); } catch (e) { threw = /unknown block/.test(e.message); }
  ok(threw, 'unknown block types fail loudly');
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
