const { SITE_DIR } = require('./config');
// Logging in and syncing (sync.js) on the home page, against a stand-in for the account server.
// The stand-in behaves like PocketBase where it matters here: one progress record per user, the
// user's own record only, JSON handed back with its keys sorted, errors as { status }.
// Timers run 100 times faster (a change is sent 30 ms after it is made, not 3 s).
const { JSDOM } = require('jsdom'); const fs = require('fs'), path = require('path');
const dir = SITE_DIR + '/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sorted = v => JSON.parse(JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(n => [n, x[n]])) : x)));

function makeServer() {
  return { users: {}, records: {}, calls: [], fail: 0, refreshFail: 0, code: '123456', oauth: null, nextId: 1 };
}
function FakePocketBase(win, server) {
  const KEY = 'pocketbase_auth', ls = () => win.localStorage;
  const err = status => Object.assign(new Error('fake ' + status), { status, isAbort: false, originalError: status === 0 ? new TypeError('Failed to fetch') : null });
  return class {
    constructor(origin) {
      server.origin = origin;
      const listeners = [];
      this.authStore = {
        get token()   { const v = JSON.parse(ls().getItem(KEY) || 'null'); return (v && v.token) || ''; },
        get record()  { const v = JSON.parse(ls().getItem(KEY) || 'null'); return (v && v.record) || null; },
        get isValid() { return !!this.token; },
        save(token, record) { ls().setItem(KEY, JSON.stringify({ token, record })); listeners.forEach(f => f()); },
        clear() { ls().removeItem(KEY); listeners.forEach(f => f()); },
        onChange(f) { listeners.push(f); },
      };
    }
    autoCancellation() {}
    collection(name) {
      const store = this.authStore, me = () => store.record;
      const gate = what => { server.calls.push(what); if (server.fail) throw err(server.fail); };
      if (name === 'progress') return {
        async getList() { gate('GET'); const r = Object.values(server.records).find(x => me() && x.user === me().id); return { items: r ? [JSON.parse(JSON.stringify(r))] : [] }; },
        async create(body) { gate('POST'); if (body.user !== me().id) throw err(400); if (Object.values(server.records).some(x => x.user === body.user)) throw err(400);
          const id = 'r' + server.nextId++; server.records[id] = { id, user: body.user, data: sorted(body.data) }; return server.records[id]; },
        async update(id, body) { gate('PATCH'); const r = server.records[id]; if (!r || r.user !== me().id) throw err(404); r.data = sorted(body.data); return r; },
      };
      return {                                                   // users
        async create({ email, password, passwordConfirm }) { gate('signup');
          if (!password || password !== passwordConfirm || password.length > 71) throw err(400);
          if (server.users[email]) throw err(400); server.users[email] = { id: 'u' + server.nextId++, email, name: '' }; return server.users[email]; },
        async requestOTP(email) { gate('otp'); server.otpFor = email; return { otpId: 'otp-' + email }; },
        async authWithOTP(otpId, code) { gate('login'); if (code !== server.code || otpId !== 'otp-' + server.otpFor) throw err(400);
          const u = server.users[server.otpFor]; if (!u) throw err(400); store.save('tok-' + u.id, Object.assign({}, u)); return { record: u }; },
        authWithOAuth2({ provider, urlCallback }) { server.calls.push('oauth:' + provider);
          return new Promise((resolve, reject) => {
            server.oauth = { finish(email, name = '') { const u = server.users[email] || (server.users[email] = { id: 'u' + server.nextId++, email, name });
              store.save('tok-' + u.id, Object.assign({}, u)); resolve({ record: u }); }, fail() { reject(err(400)); } };
            urlCallback('https://accounts.example/o/oauth2/auth?provider=' + provider);
          }); },
        async authRefresh() { server.calls.push('refresh'); if (server.refreshFail) throw err(server.refreshFail); return { record: me() }; },
      };
    }
  };
}

// The home page as a browser gets it from the website, with the stand-in in place of the client.
function page({ server = makeServer(), storage = {}, url = 'http://localhost/index.html', client = true } = {}) {
  let html = fs.readFileSync(dir + 'index.html', 'utf8').replace(/<link[^>]*>/g, '');
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => /^vendor\//.test(src) ? '' : '<script>' + fs.readFileSync(path.resolve(dir, src), 'utf8') + '</script>');
  const popups = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url, beforeParse(win) {
    Object.entries(storage).forEach(([k, v]) => win.localStorage.setItem(k, v));
    if (client) win.PocketBase = FakePocketBase(win, server);
    const realST = win.setTimeout.bind(win), realSI = win.setInterval.bind(win);
    win.setTimeout = (fn, ms = 0) => realST(fn, ms / 100);
    win.setInterval = (fn, ms = 0) => realSI(fn, Math.max(1, ms / 100));
    win.open = () => { if (win.blockPopups) return null; const p = { closed: false, location: { href: '' }, close() { this.closed = true; } }; popups.push(p); return p; };
    win.crypto.randomUUID = win.crypto.randomUUID || (() => require('crypto').randomUUID());
  } });
  const w = dom.window, d = w.document, $ = id => d.getElementById(id);
  const click = id => $(id).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const submit = id => $(id).dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  const shown = id => !$(id).hidden && !$(id).closest('[hidden]');
  return { w, d, $, click, submit, shown, server, popups, S: () => w.TeluguSync, P: w.TeluguProgress, Set: w.TeluguSettings };
}
const settle = async (x, ms = 120) => { await sleep(ms); };
async function logIn(x, email = 'a@test.local') {
  x.click('account-btn'); x.$('login-email').value = email; x.submit('login-email-form'); await settle(x, 30);
  x.$('login-code').value = x.server.code; x.submit('login-code-form'); await settle(x);
}

(async () => {
  /* ── when there is nothing to log in to ── */
  { const f = page({ url: 'file:///home/me/telugu/index.html' });
    ok(!f.S() && f.$('account').hidden && f.w.TeluguProgress, 'opened as a file: no logging in, nothing shown at the top right for it (the rest of the page as before)'); }
  { const n = page({ client: false });
    ok(!n.S() && n.$('account').hidden, 'without the PocketBase client: the same'); }
  { const src = fs.readFileSync(dir + 'index.html', 'utf8');
    ok(/<script src="progress\.js"><\/script>\s*<script src="vendor\/pocketbase-[0-9.]+\.umd\.js"><\/script>\s*<script src="sync\.js"><\/script>/.test(src), 'index.html loads the client and sync.js after progress.js');
    const others = fs.readdirSync(dir, { recursive: true }).filter(f => /\.html$/.test(f) && f !== 'index.html' && /sync\.js|pocketbase/.test(fs.readFileSync(dir + f, 'utf8')));
    ok(others.length === 0, 'no other page loads them (the pages in the frame never sync by themselves) ' + others.join(' '));
    ok(/if \(root\.top !== root/.test(fs.readFileSync(dir + 'sync.js', 'utf8')), 'and sync.js stands down inside a frame');
    const lic = fs.readdirSync(dir + 'vendor').sort();
    ok(lic.length === 2 && lic.some(f => /^pocketbase-\d+\.\d+\.\d+\.umd\.js$/.test(f)) && lic.includes('LICENSE-pocketbase.md') && !/sourceMappingURL/.test(fs.readFileSync(dir + 'vendor/' + lic.find(f => f.endsWith('.js')), 'utf8')),
      'vendor/ holds the client (its version in its name, no source map it cannot find) and its license'); }

  /* ── logged out ── */
  let x = page();
  await settle(x);
  ok(x.S() && !x.$('account').hidden && x.$('account-name').hidden && x.$('account-btn').textContent === 'Log In' && x.S().status === 'out' && x.server.calls.length === 0,
    'logged out: "Log In" at the top right, no name, and nothing asked of the server');
  ok(x.$('account').closest('.hero-tools') && x.$('account').nextElementSibling === x.$('profile-btn'), 'it sits at the top right, just before the Profile button');
  x.P.run('phonemes', { total: 10, correct: 9, attempts: 11 }); x.P.miss({ game: 'phonemes', key: 'క', ask: 'telugu' });
  await settle(x);
  ok(x.server.calls.length === 0, 'progress made while logged out stays in the browser');

  /* ── the popup ── */
  x.click('account-btn');
  ok(x.shown('login') && x.shown('login-start') && !x.shown('login-code-form') && !x.shown('login-out') && x.$('login-title').textContent === 'Log In' && x.d.activeElement === x.$('login-email'),
    'Log In opens the popup at its first step, ready to type an email address');
  ok(x.$('login-google').textContent === 'Continue with Google' && x.$('login-send').textContent === 'Send Code' && x.$('login-cancel').textContent === 'Cancel', 'two ways in: Google, or a code sent by email');
  x.$('login-email').value = 'not an address'; x.submit('login-email-form');
  ok(x.shown('login-error') && x.$('login-error').textContent === 'Enter your email address.' && x.server.calls.length === 0, 'an address that is not one: it says so, and asks nothing of the server');
  x.click('login-cancel'); ok(!x.shown('login'), 'Cancel closes it');
  x.click('account-btn'); x.d.dispatchEvent(new x.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); ok(!x.shown('login'), 'so does Escape');
  x.click('account-btn'); x.$('login').dispatchEvent(new x.w.Event('pointerdown', { bubbles: true })); ok(!x.shown('login'), 'and a tap outside the box');
  x.click('account-btn'); ok(!x.shown('login-error'), 'opened again, the old message is gone');

  /* ── a code by email ── */
  x.$('login-email').value = ' a@test.local '; x.submit('login-email-form'); await settle(x, 30);
  ok(x.server.users['a@test.local'] && x.server.calls.join() === 'signup,otp' && x.shown('login-code-form') && x.$('login-sent-to').textContent === 'a@test.local' && x.d.activeElement === x.$('login-code'),
    'Send Code: a new address gets an account, a code is sent, and the next step names the address');
  x.$('login-code').value = '12'; x.submit('login-code-form'); ok(x.$('login-error').textContent === 'The code is 6 digits.', 'a short code: it says so');
  x.$('login-code').value = '654321'; x.submit('login-code-form'); await settle(x, 30);
  ok(x.shown('login-error') && /not right/.test(x.$('login-error').textContent) && x.shown('login-code-form') && !x.$('login-enter').disabled && !x.S().loggedIn, 'a wrong code: it says so, and lets you try again');
  x.$('login-code').value = '123 456'; x.server.calls.length = 0; x.submit('login-code-form'); await settle(x);
  const rec = () => Object.values(x.server.records)[0];
  ok(!x.shown('login') && x.S().loggedIn && x.S().status === 'synced', 'the right code (spaces and all): logged in, the popup closes, and it syncs');
  ok(!x.$('account-name').hidden && x.$('account-name').textContent === 'a@test.local' && x.$('account-btn').textContent === 'Log Out' && /^Synced at /.test(x.$('account-name').title),
    'the top right shows the name (the email, with no name on the account) and Log Out; hovering says when it last synced');
  ok(x.server.calls.join() === 'login,GET,POST' && rec().data.progress.runs.phonemes.length === 1 && Object.keys(rec().data.progress.misses).length === 1, 'what was played before logging in becomes the account\'s first record');

  /* ── syncing ── */
  x.server.calls.length = 0; x.P.run('phonemes', { total: 5, correct: 5, attempts: 5 }); await settle(x);
  ok(x.server.calls.join() === 'GET,PATCH' && rec().data.progress.runs.phonemes.length === 2, 'a finished session is sent a moment later (3 s on the real page)');
  x.server.calls.length = 0; x.d.dispatchEvent(new x.w.Event('visibilitychange')); await settle(x);
  ok(x.server.calls.join() === 'GET' && rec().data.progress.runs.phonemes.length === 2, 'coming back to the page reads the account; with nothing new on either side, nothing is written (the server sends its JSON keys sorted, and that is not a difference)');
  rec().data.progress.runs.dia = [{ end: 'done', n: 3, ok: 3, t: Date.now() + 1, tries: 3 }]; rec().data.settings = { _t: Date.now() + 1, notation: 'iso' };
  x.server.calls.length = 0; x.d.dispatchEvent(new x.w.Event('visibilitychange')); await settle(x);
  ok(x.P.runs('dia').length === 1 && x.Set.get('notation') === 'iso' && x.server.calls.join() === 'GET', 'what another device did arrives (a session, and the choice of ISO) without being sent back');
  x.server.calls.length = 0; x.Set.set('notation', 'ipa'); await settle(x);
  ok(rec().data.settings.notation === 'ipa' && x.server.calls.join() === 'GET,PATCH', 'a setting changed here is sent too');

  /* ── when the server cannot be reached ── */
  x.server.fail = 503; x.P.run('words', { total: 2, correct: 2, attempts: 2 }); await settle(x, 60);
  ok(x.S().status === 'error' && x.$('account').dataset.status === 'error' && /Could not reach your account/.test(x.$('account-name').title) && x.S().loggedIn, 'the server does not answer: still logged in; the status (a dot after the name) and its hover text say so');
  x.server.fail = 0; await settle(x, 260);
  ok(x.S().status === 'synced' && rec().data.progress.runs.words.length === 1, 'it tries again by itself, and the waiting session gets through');

  /* ── Log Out ── */
  x.server.fail = 503; x.P.run('words', { total: 4, correct: 4, attempts: 4 }); await settle(x, 10);
  x.click('account-btn'); await settle(x, 60);
  ok(x.shown('login') && x.shown('login-out') && !x.shown('login-start') && x.$('login-title').textContent === 'Log Out' && x.S().loggedIn && x.$('account-btn').textContent === 'Log Out',
    'Log Out while a session has not reached the account: it asks first, and stays logged in');
  x.click('login-stay'); ok(!x.shown('login') && x.S().loggedIn, 'Stay Logged In: nothing changes');
  x.click('account-btn'); await settle(x, 60); x.click('login-out-anyway'); await settle(x, 30);
  ok(!x.S().loggedIn && x.$('account-btn').textContent === 'Log In' && x.$('account-name').hidden && !x.shown('login') && x.P.runCount() === 0 && x.P.missCount() === 0 && x.Set.get('notation') === 'ipa',
    'Log Out Anyway: logged out, and this browser is emptied (progress and settings)');
  ok(rec().data.progress.runs.phonemes.length === 2 && rec().data.progress.runs.words.length === 1, 'the account keeps everything it had');
  x.server.fail = 0;
  await logIn(x);
  ok(x.S().loggedIn && x.P.runs('phonemes').length === 2 && x.P.runs('words').length === 1, 'logging in again brings it all back');
  x.server.calls.length = 0; x.click('account-btn'); await settle(x, 30);
  ok(!x.S().loggedIn && !x.shown('login') && x.server.calls.length === 0, 'with nothing waiting, Log Out goes straight through, asking nothing of the server');

  /* ── a name on the account; a browser holding another account's progress; a login that has run out ── */
  x.server.users['n@test.local'] = { id: 'u-n', email: 'n@test.local', name: 'Spencer' };
  await logIn(x, 'n@test.local');
  ok(x.$('account-name').textContent === 'Spencer' && /^n@test\.local · Synced/.test(x.$('account-name').title), 'an account with a name shows the name; hovering adds the email');
  x.P.run('pho', { total: 1, correct: 1, attempts: 1 }); await settle(x);
  x.w.localStorage.removeItem('pocketbase_auth');             // the login runs out; Spencer's progress is still here
  let y = page({ server: x.server, storage: { ...Object.fromEntries(Object.entries(x.w.localStorage)) } }); await settle(y);
  ok(!y.S().loggedIn && y.P.runs('pho').length === 1, 'a login that has gone: logged out, the progress left as it was');
  await logIn(y, 'other@test.local');
  const other = Object.values(y.server.records).find(r => r.user === y.server.users['other@test.local'].id);
  ok(y.S().loggedIn && y.P.runs('pho').length === 0 && other && !other.data.progress.runs.pho, 'a different account logging in there does not get the first one\'s progress');
  y.server.refreshFail = 401;
  let z = page({ server: y.server, storage: { ...Object.fromEntries(Object.entries(y.w.localStorage)) } }); await settle(z);
  ok(!z.S().loggedIn && z.$('account-btn').textContent === 'Log In', 'a login the server no longer accepts, when the page opens: logged out');
  y.server.refreshFail = 0;

  /* ── Google ── */
  let g = page(); await settle(g);
  g.click('account-btn'); g.click('login-google'); await settle(g, 20);
  ok(g.popups.length === 1 && /accounts\.example/.test(g.popups[0].location.href) && g.$('login-google').disabled && g.$('login-google').textContent === 'Waiting for Google…', 'Continue with Google: a window opens on Google\'s page; the popup waits');
  g.server.oauth.finish('g@test.local', 'Gopal'); await settle(g);
  ok(g.S().loggedIn && g.$('account-name').textContent === 'Gopal' && !g.shown('login') && g.popups[0].closed && g.$('login-google').textContent === 'Continue with Google', 'once Google says yes: logged in under the Google name, the window closed');
  g.click('account-btn'); await settle(g, 30);
  g.click('account-btn'); g.click('login-google'); await settle(g, 20); g.popups[1].closed = true; await settle(g, 200);
  ok(!g.S().loggedIn && !g.shown('login-error') && !g.$('login-google').disabled && g.shown('login'), 'the Google window closed without finishing: back to the popup, nothing to complain about');
  g.w.blockPopups = true; g.click('login-google'); await settle(g, 20);
  ok(/blocked the login window/.test(g.$('login-error').textContent) && !g.$('login-google').disabled, 'a blocked window: it says how to allow it');
  g.w.blockPopups = false; g.click('login-google'); await settle(g, 20); g.server.oauth.fail(); await settle(g, 20);
  ok(/did not finish/.test(g.$('login-error').textContent) && g.popups.at(-1).closed, 'Google refuses: the window closes, and the popup says so');

  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
