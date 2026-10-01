// Real two-browser duel on loopback. Observe only public server snapshots;
// never inject protocol messages or retain welcome/resume tokens.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { chromium } = require('playwright');

assert(process.argv.length >= 5, 'Usage: node browser-duel.cjs SITE_DIR GODOT_PROJECT REPORT_DIR');
const site = path.resolve(process.argv[2]);
const project = path.resolve(process.argv[3]);
const out = path.resolve(process.argv[4]);
fs.mkdirSync(out, { recursive: true });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const safeLine = value => /token|resume|welcome/i.test(String(value)) ? '[sensitive text omitted]' : String(value);
const report = { status: 'running', scope: 'Two real exported Web clients; local HTTP + isolated Godot WebSocket server', checks: [] };
const failures = [];
let serverProcess;
let browser;
let webServer;
const pages = [];
let serverLog = '';

async function freePort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  return port;
}

async function startGameServer() {
  const port = await freePort();
  serverProcess = spawn(process.env.GODOT_EXE || 'godot', ['--headless', '--path', project, '--script', 'res://scripts/server.gd', '--', '--bind=127.0.0.1', `--port=${port}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Local Godot server startup timed out')), 20_000);
    const onData = data => {
      const text = data.toString();
      // Keep only known startup/error lines, never arbitrary server payloads.
      serverLog += text.split('\n').filter(line => /^(Godot Engine|LANTERN_ARENA_READY|ERROR:|SCRIPT ERROR:|Parse Error:)/.test(line)).map(safeLine).join('\n') + '\n';
      if (text.includes('LANTERN_ARENA_READY')) { clearTimeout(timeout); resolve(); }
    };
    serverProcess.stdout.on('data', onData);
    serverProcess.stderr.on('data', onData);
    serverProcess.once('error', error => { clearTimeout(timeout); reject(error); });
    serverProcess.once('exit', code => { clearTimeout(timeout); reject(new Error(`Local Godot server exited ${code} before ready`)); });
  });
  return `ws://127.0.0.1:${port}`;
}

async function startWebServer() {
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.pck': 'application/octet-stream', '.png': 'image/png', '.svg': 'image/svg+xml' };
  webServer = http.createServer((req, res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = path.resolve(site, '.' + pathname);
      if (!file.startsWith(site + path.sep)) { res.writeHead(403).end(); return; }
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    } catch (error) { res.writeHead(500).end(safeLine(error)); }
  });
  await new Promise(resolve => webServer.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${webServer.address().port}/godot-duel/`;
}

// Runs before Godot's loader. The subclass only observes incoming text frames.
// It neither calls send nor changes messages, transport behavior, or game state.
function observePublicSnapshots() {
  const NativeWebSocket = window.WebSocket;
  window.__duelQA = { snapshot: null, history: [], phases: [] };
  window.WebSocket = class extends NativeWebSocket {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        if (typeof event.data !== 'string') return;
        let packet;
        try { packet = JSON.parse(event.data); } catch { return; }
        if (packet.type !== 'snapshot') return;
        const snap = {
          tick: packet.tick,
          round: { phase: packet.round.phase, number: packet.round.number, winner: packet.round.winner, reason: packet.round.reason },
          players: packet.players.map(p => ({ id: p.id, name: p.name, hp: p.hp, max_hp: p.max_hp, x: p.x, z: p.z, wins: p.wins, ready: p.ready })),
        };
        const qa = window.__duelQA;
        qa.snapshot = snap;
        qa.history.push(snap);
        if (qa.history.length > 300) qa.history.shift();
        if (!qa.phases.includes(snap.round.phase)) qa.phases.push(snap.round.phase);
      });
    }
  };
}

async function until(page, predicate, description, timeoutMs = 20_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const snapshot = await page.evaluate(() => window.__duelQA?.snapshot);
    if (snapshot && predicate(snapshot)) return snapshot;
    if (serverProcess.exitCode !== null) throw new Error(`Local server exited ${serverProcess.exitCode}`);
    await wait(100);
  }
  throw new Error(`Timed out: ${description}`);
}

async function equalPublicSnapshot(a, b, phase, roundNumber) {
  await wait(250);
  const [ah, bh] = await Promise.all([a, b].map(p => p.evaluate(() => window.__duelQA.history)));
  const other = new Map(bh.map(s => [s.tick, s]));
  const common = ah.filter(s => s.round.phase === phase && s.round.number === roundNumber && other.has(s.tick));
  assert(common.length, `No common ${phase} snapshot for round ${roundNumber}`);
  const snapshot = common.at(-1);
  assert.deepEqual(snapshot, other.get(snapshot.tick), 'Two actual browser clients disagree on the same server tick');
  return snapshot;
}

async function screenshot(page, label, clip) {
  const file = path.join(out, `ci-duel-${label}.png`);
  await page.screenshot({ path: file, ...(clip ? { clip } : {}) });
  return file;
}

async function resultTitle(page, label, expected) {
  const file = await screenshot(page, `${label}-result-title`, { x: 390, y: 108, width: 500, height: 50 });
  const result = spawnSync(process.env.TESSERACT_EXE || 'tesseract', [file, 'stdout', '--psm', '7'], { encoding: 'utf8' });
  assert.equal(result.status, 0, 'Tesseract is required for visual winner/loser proof');
  const title = result.stdout.toUpperCase().replace(/[^A-Z]/g, '');
  assert(title.includes(expected.replace(/[^A-Z]/g, '')), `Visible result title mismatch for ${label}: ${safeLine(result.stdout)}`);
  return expected;
}

(async () => {
  const endpoint = await startGameServer();
  const base = await startWebServer();
  const options = { headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) options.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  browser = await chromium.launch(options);
  for (const name of ['ClientA', 'ClientB']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(observePublicSnapshots);
    const page = await context.newPage();
    pages.push(page);
    page.on('pageerror', error => failures.push(safeLine(error.message)));
    page.on('console', message => {
      if (message.type() === 'error' || /SCRIPT ERROR:|Parse Error:/.test(message.text())) failures.push(safeLine(message.text()));
    });
    page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${safeLine(response.url())}`); });
    await page.goto(base + '?server=' + encodeURIComponent(endpoint) + '&name=' + name, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForFunction(() => !document.getElementById('status'), undefined, { timeout: 60_000 });
    await wait(500);
    await screenshot(page, `${name}-join`);
    // Actual canvas JOIN center measured from the 1280x800 Godot scene.
    await page.mouse.click(640, 471);
    await until(page, s => s.players.some(p => p.name === name), `${name} joins through visible JOIN button`);
  }
  const [a, b] = pages;
  await Promise.all(pages.map(p => until(p, s => s.players.length === 2 && s.round.phase === 'countdown', 'two clients enter countdown')));
  const initial = await until(a, s => s.round.phase === 'playing', 'round one starts');
  await until(b, s => s.round.phase === 'playing', 'second client enters play');
  const playerA = initial.players.find(p => p.name === 'ClientA');
  const playerB = initial.players.find(p => p.name === 'ClientB');
  assert(playerA && playerB && playerA.hp === 100 && playerB.hp === 100);
  const initialSides = Object.fromEntries(initial.players.map(p => [p.id, Math.sign(p.x)]));
  await equalPublicSnapshot(a, b, 'playing', initial.round.number);
  report.checks.push({ name: 'two_real_web_clients_join_countdown_play', status: 'passed', ids: [playerA.id, playerB.id] });
  await Promise.all(pages.map((p, i) => screenshot(p, `${i ? 'b' : 'a'}-playing`)));

  // All combat input goes through the real browser keyboard and Godot client.
  await a.keyboard.press('KeyE');
  await until(a, s => s.players.find(p => p.id === playerB.id).hp < 100, 'E pursues and melee damages opponent', 30_000);
  await until(b, s => s.players.find(p => p.id === playerB.id).hp < 100, 'damage appears in opponent client');
  const finished = await until(a, s => s.round.phase === 'finished', 'actual browser melee reaches knockout', 35_000);
  await until(b, s => s.round.phase === 'finished', 'opponent observes finished round');
  const final = await equalPublicSnapshot(a, b, 'finished', initial.round.number);
  assert.equal(finished.round.winner, playerA.id);
  assert.equal(final.round.reason, 'knockout');
  assert.equal(final.players.find(p => p.id === playerB.id).hp, 0);
  assert.equal(final.players.find(p => p.id === playerA.id).wins, playerA.wins + 1);
  await wait(350);
  await Promise.all(pages.map((p, i) => screenshot(p, `${i ? 'b' : 'a'}-finished`)));
  const titles = await Promise.all([resultTitle(a, 'a', 'VICTORY'), resultTitle(b, 'b', 'ROUND LOST')]);
  report.checks.push({ name: 'keyboard_pursuit_damage_knockout_opposite_visible_results', status: 'passed', titles, public_final_snapshot: final });

  // Real clicks: a single ready does not start a rematch, both are necessary.
  await a.mouse.click(640, 608);
  await until(a, s => s.players.find(p => p.id === playerA.id).ready === true, 'first visible rematch button');
  await wait(800);
  const oneReady = await a.evaluate(() => window.__duelQA.snapshot);
  assert.equal(oneReady.round.phase, 'finished', 'One ready unexpectedly started a rematch');
  assert.equal(oneReady.players.find(p => p.id === playerB.id).ready, false);
  await screenshot(a, 'a-one-ready');
  await b.mouse.click(640, 608);
  const rematch = await until(a, s => s.round.number === initial.round.number + 1 && s.round.phase === 'countdown', 'both visible rematch buttons restart countdown');
  await until(b, s => s.round.number === rematch.round.number && s.round.phase === 'countdown', 'opponent sees rematch countdown');
  assert.equal(rematch.round.winner, '');
  for (const player of rematch.players) {
    assert.equal(player.hp, 100, 'Rematch did not restore HP');
    assert.equal(player.ready, false, 'Rematch ready flag did not reset');
    assert.equal(Math.sign(player.x), -initialSides[player.id], 'Rematch did not swap spawn sides');
    assert.equal(Math.abs(player.x), 6);
    assert.equal(player.z, 0);
  }
  await Promise.all(pages.map(p => until(p, s => s.round.number === rematch.round.number && s.round.phase === 'playing', 'rematch enters playing')));
  const rematchPlaying = await equalPublicSnapshot(a, b, 'playing', rematch.round.number);
  await Promise.all(pages.map((p, i) => screenshot(p, `${i ? 'b' : 'a'}-rematch`)));
  report.checks.push({ name: 'visible_buttons_both_required_rematch_reset_and_side_swap', status: 'passed', public_rematch_snapshot: rematchPlaying });
  assert.deepEqual(failures, [], failures.join('\n'));
  report.status = 'passed';
  console.log('PASS: two real browser clients, visible JOIN, E combat, opposite result titles, both visible rematch buttons, reset and side swap');
})().catch(async error => {
  report.status = 'failed';
  report.failure = safeLine(error.message);
  console.error(report.failure);
  for (let i = 0; i < pages.length; i++) {
    try { await screenshot(pages[i], `${i ? 'b' : 'a'}-failure`); } catch { /* browser may have failed */ }
  }
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close().catch(() => {});
  if (webServer) await new Promise(resolve => webServer.close(resolve));
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill('SIGTERM');
    await Promise.race([new Promise(resolve => serverProcess.once('exit', resolve)), wait(3000)]);
    if (serverProcess.exitCode === null) serverProcess.kill('SIGKILL');
  }
  fs.writeFileSync(path.join(out, 'ci-duel-server.log'), serverLog);
  fs.writeFileSync(path.join(out, 'ci-duel-report.json'), JSON.stringify(report, null, 2) + '\n');
});
