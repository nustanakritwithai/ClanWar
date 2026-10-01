// Real exported Godot browser stability gate on isolated loopback transports.
// Input is always a real keyboard/mouse action. The observer never sends or
// changes protocol packets, and never retains welcome packets or session tokens.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const safeLine = value => /token|resume|welcome/i.test(String(value)) ? '[sensitive text omitted]' : String(value).slice(0, 2000);
const CONSUMER_STALL_MS = 15_000;
const STABILITY_ROUNDS = 10; // Release gate: never silently lower this through an environment variable.
const VIEWPORT = { width: 1280, height: 800 };

function appendBounded(list, entry, limit) {
  list.push(entry);
  if (list.length > limit) list.splice(0, list.length - limit);
}

// stdout/stderr chunk boundaries are unrelated to line boundaries. Keep a
// separate reader for each stream so split readiness/errors cannot disappear.
function createLineReader(onLine) {
  let pending = '';
  return {
    push(chunk) {
      const pieces = String(chunk).split('\n');
      for (const [index, piece] of pieces.entries()) {
        pending += piece.slice(0, Math.max(0, 8192 - pending.length));
        if (index < pieces.length - 1) { onLine(pending.replace(/\r$/, '')); pending = ''; }
      }
    },
    flush() { if (pending) onLine(pending.replace(/\r$/, '')); pending = ''; },
  };
}

// Transparent byte forwarding only. Cutting both TCP legs exercises the actual
// browser/Godot reconnect path without intercepting or manufacturing WS frames.
async function startTcpProxy(targetPort) {
  let blocked = false;
  const pairs = new Set();
  const metrics = { accepted: 0, rejected: 0, interruptions: 0, maxOpenConnections: 0 };
  const server = net.createServer(downstream => {
    if (blocked) { metrics.rejected++; downstream.destroy(); return; }
    metrics.accepted++;
    const upstream = net.createConnection({ host: '127.0.0.1', port: targetPort });
    const pair = { downstream, upstream };
    pairs.add(pair);
    metrics.maxOpenConnections = Math.max(metrics.maxOpenConnections, pairs.size);
    downstream.setNoDelay(true);
    upstream.setNoDelay(true);
    const close = () => { downstream.destroy(); upstream.destroy(); pairs.delete(pair); };
    downstream.on('error', close);
    upstream.on('error', close);
    downstream.on('close', close);
    upstream.on('close', close);
    downstream.pipe(upstream);
    upstream.pipe(downstream);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  function cut() {
    blocked = true;
    metrics.interruptions++;
    for (const { downstream, upstream } of pairs) { downstream.destroy(); upstream.destroy(); }
    pairs.clear();
  }
  return {
    endpoint: `ws://127.0.0.1:${server.address().port}`,
    metrics,
    cut,
    restore() { blocked = false; },
    async close() { cut(); await new Promise(resolve => server.close(resolve)); },
  };
}

// This function is serialized into each browser before Godot's loader runs.
// Keep all helpers inside it and all retained fields on an explicit allow-list.
function observePublicSnapshots() {
  const NativeWebSocket = window.WebSocket;
  const qa = window.__duelQA = {
    snapshot: null, history: [], phases: [], transport: [], events: [], frameGaps: [], frameSamples: [], longTasks: [],
    maxRafGapMs: 0, maxLongTaskMs: 0, snapshotsReceived: 0, maxSnapshotGapMs: 0, snapshotAckNegotiated: false,
  };
  const keep = (list, value, limit) => { list.push(value); if (list.length > limit) list.splice(0, list.length - limit); };
  let lastFrame = performance.now();
  let lastSnapshotAt = 0;
  function frame(now) {
    const gap = now - lastFrame;
    qa.maxRafGapMs = Math.max(qa.maxRafGapMs, gap);
    keep(qa.frameSamples, gap, 600);
    if (gap > 250) keep(qa.frameGaps, { at: performance.timeOrigin + now, durationMs: gap }, 200);
    lastFrame = now;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes.includes('longtask')) {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        qa.maxLongTaskMs = Math.max(qa.maxLongTaskMs, e.duration);
        keep(qa.longTasks, { at: performance.timeOrigin + e.startTime, durationMs: e.duration }, 200);
      }
    }).observe({ type: 'longtask', buffered: true });
  }
  let nextSocket = 0;
  window.WebSocket = class extends NativeWebSocket {
    constructor(...args) {
      super(...args);
      const socket = ++nextSocket;
      this.addEventListener('open', () => keep(qa.transport, { event: 'open', socket, at: Date.now() }, 100));
      // Deliberately omit close reason text: the code and timing are sufficient.
      this.addEventListener('close', e => keep(qa.transport, { event: 'close', socket, code: e.code, at: Date.now() }, 100));
      this.addEventListener('error', () => keep(qa.transport, { event: 'error', socket, at: Date.now() }, 100));
      this.addEventListener('message', event => {
        if (typeof event.data !== 'string') return;
        let packet;
        try { packet = JSON.parse(event.data); } catch { return; }
        if (packet.type === 'welcome') {
          // Negotiated capability only. No identity, credentials, or raw packet.
          qa.snapshotAckNegotiated = packet.snapshot_ack === true;
        }
        if (packet.type === 'error' && packet.reason === 'invalid_resume_token') {
          keep(qa.events, { event: 'session_expired', at: Date.now() }, 100);
        }
        if (packet.type !== 'snapshot') return;
        const snap = {
          tick: packet.tick,
          round: { phase: packet.round.phase, number: packet.round.number, winner: packet.round.winner, reason: packet.round.reason },
          players: packet.players.map(p => ({
            id: p.id, name: p.name, hp: p.hp, max_hp: p.max_hp, x: p.x, z: p.z, wins: p.wins,
            ready: p.ready, connected: p.connected, attack_seq: p.attack_seq,
            skill_cd: p.skill_cd, dash_cd: p.dash_cd, dashing: p.dashing,
          })),
          projectiles: (packet.projectiles || []).map(p => ({ id: p.id, owner: p.owner, x: p.x, z: p.z, dx: p.dx, dz: p.dz })),
          telegraphs: (packet.telegraphs || []).map(p => ({ id: p.id, owner: p.owner, x: p.x, z: p.z, dx: p.dx, dz: p.dz, remaining: p.remaining })),
        };
        const now = Date.now();
        if (lastSnapshotAt) qa.maxSnapshotGapMs = Math.max(qa.maxSnapshotGapMs, now - lastSnapshotAt);
        lastSnapshotAt = now;
        qa.snapshotsReceived++;
        qa.snapshot = snap;
        keep(qa.history, snap, 300);
        if (!qa.phases.includes(snap.round.phase)) keep(qa.phases, snap.round.phase, 12);
      });
    }
  };
}

function commonSnapshot(ah, bh, phase, roundNumber, minTick = -1, predicate = () => true) {
  const { isDeepStrictEqual } = require('node:util');
  const maxTickSkew = 20; // One second at the authoritative 20 Hz simulation rate.
  const latestObservedTick = Math.max(-1, ...ah.map(s => s.tick), ...bh.map(s => s.tick));
  const relevant = s => s.tick > minTick && s.round.phase === phase && s.round.number === roundNumber;
  const fresh = s => latestObservedTick - s.tick <= maxTickSkew;
  const aByTick = new Map();
  const bByTick = new Map();
  for (const [history, byTick] of [[ah, aByTick], [bh, bByTick]]) {
    for (const snapshot of history) {
      if (!byTick.has(snapshot.tick)) byTick.set(snapshot.tick, []);
      byTick.get(snapshot.tick).push(snapshot);
    }
  }
  // Never hide a contradictory same-tick observation behind a later converged
  // pair or a predicate filter. Check every overlapping relevant observation,
  // including duplicate-tick entries, before considering independent sampling.
  for (const [tick, aSnapshots] of aByTick) {
    for (const a of aSnapshots) for (const b of bByTick.get(tick) || []) {
      if (relevant(a) || relevant(b)) assert.deepEqual(a, b, 'Two actual browser clients disagree on the same server tick');
    }
  }
  const candidates = history => history.filter(s => relevant(s) && fresh(s) && predicate(s)).sort((a, b) => b.tick - a.tick);
  const aCandidates = candidates(ah);
  const bCandidates = candidates(bh);
  const proof = (a, b, mode) => ({
    ...a, // tick remains Client A's observed tick, never an invented shared tick.
    comparison: {
      mode, observed_ticks: { client_a: a.tick, client_b: b.tick },
      latest_observed_tick: latestObservedTick, min_tick_exclusive: minTick, max_tick_skew: maxTickSkew,
    },
  });
  // Prefer exact same-tick evidence whenever a fresh qualifying pair exists.
  for (const a of aCandidates) {
    const b = bCandidates.find(s => s.tick === a.tick);
    if (b) return proof(a, b, 'same_tick');
  }
  // ACK-driven consumers can sample permanently disjoint ticks. Their complete
  // public payload must still converge EXACTLY: omit tick only, retain every
  // position, health, cooldown, effect, round field, array order, and value type.
  for (const a of aCandidates) for (const b of bCandidates) {
    if (Math.abs(a.tick - b.tick) > maxTickSkew) continue;
    const { tick: aTick, ...aPayload } = a;
    const { tick: bTick, ...bPayload } = b;
    if (isDeepStrictEqual(aPayload, bPayload)) return proof(a, b, 'fresh_exact_state');
  }
  assert.fail(`No common or exactly converged fresh ${phase} snapshot for round ${roundNumber} after tick ${minTick}`);
}

function validateRematchSnapshot(snapshot, previous, ids) {
  assert.equal(snapshot.round.number, previous.round.number + 1, 'Rematch round did not advance exactly once');
  assert(['countdown', 'playing'].includes(snapshot.round.phase));
  assert.equal(snapshot.round.winner, '');
  assert.equal(snapshot.round.reason, '');
  assert.equal(snapshot.players.length, 2);
  for (const id of ids) {
    const player = snapshot.players.find(p => p.id === id);
    const old = previous.players.find(p => p.id === id);
    assert(player && old, 'Rematch changed player identity');
    assert.equal(player.connected, true);
    assert.equal(player.hp, 100, 'Rematch did not restore HP');
    assert.equal(player.ready, false, 'Rematch ready flag did not reset');
    assert.equal(Math.sign(player.x), -Math.sign(old.x), 'Rematch did not swap spawn sides');
    assert.equal(Math.abs(player.x), 6);
    assert.equal(player.z, 0);
    assert.equal(player.wins, old.wins, 'Rematch unexpectedly changed win totals');
  }
}

// Read-only camera basis is published by the real client after responsive fit.
// It supplies CSS-pixel cursor coordinates, including the canvas offset and DPR.
// A missing basis fails the gate rather than silently aiming with stale geometry.
function groundScreen(x, z, projection) {
  for (const key of ['ground_origin_x', 'ground_origin_y', 'ground_unit_x_x', 'ground_unit_x_y', 'ground_unit_z_x', 'ground_unit_z_y', 'canvas_left', 'canvas_top']) {
    assert(Number.isFinite(projection?.[key]), `Missing finite browser camera projection: ${key}`);
  }
  return { x: projection.canvas_left + projection.ground_origin_x + x * projection.ground_unit_x_x + z * projection.ground_unit_z_x,
    y: projection.canvas_top + projection.ground_origin_y + x * projection.ground_unit_x_y + z * projection.ground_unit_z_y };
}

function avatarScreen(x, z, projection) {
  const point = groundScreen(x, z, projection);
  assert(Number.isFinite(projection.avatar_up_x) && Number.isFinite(projection.avatar_up_y), 'Missing finite avatar projection');
  return { x: point.x + 1.2 * projection.avatar_up_x, y: point.y + 1.2 * projection.avatar_up_y };
}

function validateStallRecovery(before, after, diagnostics) {
  assert.equal(after.round.phase, 'playing');
  assert.equal(after.round.number, before.round.number);
  assert(after.tick > before.tick, 'Consumer did not recover a fresh authoritative tick');
  assert.deepEqual(after.players, before.players, 'Idle consumer stall changed public player state');
  assert.equal(diagnostics.snapshotAckNegotiated, true, 'Browser did not negotiate snapshot backpressure');
  assert.equal(diagnostics.transport.filter(e => e.event === 'open').length, 1, 'Starvation recovery created a replacement socket');
  assert.equal(diagnostics.transport.filter(e => e.event === 'close').length, 0, 'Consumer starvation disconnected the real browser');
  assert.equal(diagnostics.transport.filter(e => e.event === 'error').length, 0, 'Consumer starvation caused a transport error');
  assert(Number.isFinite(diagnostics.client.max_receive_queue), 'Missing actual client receive-queue counter');
  assert(diagnostics.client.max_receive_queue <= 16, 'Backpressured consumer queue grew beyond 16 packets');
}

async function main() {
  assert(process.argv.length >= 5, 'Usage: node browser-duel.cjs SITE_DIR GODOT_PROJECT REPORT_DIR');
  const site = path.resolve(process.argv[2]);
  const project = path.resolve(process.argv[3]);
  const out = path.resolve(process.argv[4]);
  fs.mkdirSync(out, { recursive: true });
  const report = {
    status: 'running', scope: 'Two real exported Web clients; local HTTP + isolated Godot server; 10 bidirectional combat/rematch cycles and real transport interruption/session expiry',
    required_rounds: STABILITY_ROUNDS, completed_rounds: 0, checks: [], timeline: [], expected_transport_errors: [],
    browser_topology: 'two independent concurrent Chromium processes', browser_versions: [],
  };
  const failures = [];
  const pages = [];
  const proxies = [];
  const expectedTransport = new Set();
  let serverProcess;
  const browsers = [];
  let webServer;
  let serverLog = '';
  const startedAt = Date.now();
  const mark = (event, details = {}) => appendBounded(report.timeline, { at: Date.now(), elapsedMs: Date.now() - startedAt, event, ...details }, 1200);
  const recordFailure = (client, kind, value) => { const text = safeLine(value); appendBounded(failures, { client, kind, at: Date.now(), text }, 100); mark('failure', { client, kind, text }); };
  const player = (snapshot, id) => { const p = snapshot.players.find(p => p.id === id); assert(p, `Missing public player ${id}`); return p; };
  async function groundPoint(page, x, z) { return groundScreen(x, z, await page.evaluate(() => window.__duelProjection)); }
  const assertClean = () => { assert.deepEqual(failures, [], failures.map(f => `${f.client} ${f.kind}: ${f.text}`).join('\n')); assert(!/^(ERROR:|SCRIPT ERROR:|Parse Error:)/m.test(serverLog), 'Godot server reported an error'); };

  async function startGameServer() {
    const probe = net.createServer();
    await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
    const port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    serverProcess = spawn(process.env.GODOT_EXE || 'godot', ['--headless', '--path', project, '--script', 'res://scripts/server.gd', '--', '--bind=127.0.0.1', `--port=${port}`], { stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Local Godot server startup timed out')), 20_000);
      const onLine = line => {
        if (/^(Godot Engine|LANTERN_ARENA_READY|ERROR:|SCRIPT ERROR:|Parse Error:)/.test(line)) serverLog = (serverLog + safeLine(line) + '\n').slice(-32_000);
        if (line.startsWith('LANTERN_ARENA_READY')) { clearTimeout(timeout); resolve(); }
      };
      for (const stream of [serverProcess.stdout, serverProcess.stderr]) {
        const reader = createLineReader(onLine);
        stream.on('data', chunk => reader.push(chunk.toString()));
        stream.on('end', () => reader.flush());
      }
      serverProcess.once('error', error => { clearTimeout(timeout); reject(error); });
      serverProcess.once('exit', code => { clearTimeout(timeout); reject(new Error(`Local Godot server exited ${code} before ready`)); });
    });
    return port;
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

  async function until(page, predicate, description, timeoutMs = 25_000, fromHistory = false) {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      const state = await page.evaluate(history => history ? window.__duelQA?.history : window.__duelQA?.snapshot, fromHistory);
      const match = fromHistory ? state?.findLast(predicate) : (state && predicate(state) ? state : null);
      if (match) return match;
      if (serverProcess.exitCode !== null) throw new Error(`Local server exited ${serverProcess.exitCode}`);
      assertClean();
      await wait(100);
    }
    throw new Error(`Timed out: ${description}`);
  }

  async function equalPublicSnapshot(phase, roundNumber, minTick = -1, predicate = () => true) {
    // Independent ACK schedules need not share a tick. Require strict fresh
    // full-state convergence, while preserving hard same-tick disagreement.
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const histories = await Promise.all(pages.map(p => p.evaluate(() => window.__duelQA.history)));
      try {
        const snapshot = commonSnapshot(...histories, phase, roundNumber, minTick, predicate);
        mark('public_state_compared', { phase, round: roundNumber, ...snapshot.comparison });
        return snapshot;
      } catch (error) { if (!error.message.startsWith('No common ')) throw error; }
      assertClean();
      await wait(100);
    }
    throw new Error(`No common or exactly converged fresh ${phase} snapshot for round ${roundNumber} after tick ${minTick} within 20 seconds`);
  }

  async function screenshot(page, label, clip) {
    const file = path.join(out, `ci-duel-${label}.png`);
    const start = Date.now();
    mark('screenshot_start', { label });
    try { await page.screenshot({ path: file, timeout: 45_000, ...(clip ? { clip } : {}) }); }
    finally { mark('screenshot_end', { label, durationMs: Date.now() - start }); }
    return file;
  }

  async function visualText(page, label, expected, clip = { x: 390, y: 113, width: 500, height: 36 }) {
    const file = await screenshot(page, label, clip);
    // Async OCR avoids blocking proxy forwarding/server supervision in Node.
    const text = await new Promise((resolve, reject) => {
      // The title is a text block. A single-line mode can discard valid text
      // when a crop contains even a few antialiased pixels of another line.
      const child = spawn(process.env.TESSERACT_EXE || 'tesseract', [file, 'stdout', '--psm', '6'], { stdio: ['ignore', 'pipe', 'pipe'] });
      let output = '';
      let diagnostic = '';
      const timeout = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Tesseract timed out')); }, 15_000);
      child.stdout.on('data', data => { output += data.toString(); });
      child.stderr.on('data', data => { diagnostic += data.toString(); });
      child.once('error', error => { clearTimeout(timeout); reject(error); });
      child.once('close', code => { clearTimeout(timeout); code === 0 ? resolve(output) : reject(new Error(`Tesseract failed (${code}): ${safeLine(diagnostic)}`)); });
    });
    const normalized = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    assert(normalized.includes(expected.toUpperCase().replace(/[^A-Z0-9]/g, '')), `Visible text mismatch for ${label}; expected ${expected}: ${safeLine(text)}`);
    mark('visible_text_verified', { label, expected });
    return expected;
  }

  async function bothTitles(winnerIndex, label) {
    // Serialize captures so two software renderers do not compete for readback.
    const titles = [];
    for (const [index, page] of pages.entries()) titles.push(await visualText(page, `${label}-${index ? 'b' : 'a'}-result-title`, index === winnerIndex ? 'VICTORY' : 'ROUND LOST'));
    return titles;
  }

  async function rematch(previousStart, finished, ids, label) {
    const [a, b] = pages;
    mark('rematch_first_click', { label, round: finished.round.number });
    await a.mouse.click(640, 608);
    await until(a, s => s.round.number === finished.round.number && player(s, ids[0]).ready === true, 'first visible rematch button');
    await wait(800);
    const oneReady = await a.evaluate(() => window.__duelQA.snapshot);
    assert.equal(oneReady.round.phase, 'finished', 'One ready unexpectedly started a rematch');
    assert.equal(player(oneReady, ids[1]).ready, false);
    mark('rematch_second_click', { label, round: finished.round.number });
    await b.mouse.click(640, 608);
    const nextRound = finished.round.number + 1;
    for (const page of pages) {
      const countdown = await until(page, s => s.round.number === nextRound && s.round.phase === 'countdown', 'both visible rematch buttons restart countdown', 25_000, true);
      // Spawn sides must compare with the previous round's START, not the melee
      // positions at knockout (players may chase across the center line).
      validateRematchSnapshot(countdown, { ...previousStart, players: previousStart.players.map(p => ({ ...p, wins: player(finished, p.id).wins })) }, ids);
    }
    await Promise.all(pages.map(p => until(p, s => s.round.number === nextRound && s.round.phase === 'playing', 'rematch enters playing')));
    const next = await equalPublicSnapshot('playing', nextRound);
    validateRematchSnapshot(next, { ...previousStart, players: previousStart.players.map(p => ({ ...p, wins: player(finished, p.id).wins })) }, ids);
    assertClean();
    mark('rematch_verified', { label, round: nextRound });
    return next;
  }

  async function diagnostics(page) {
    return page.evaluate(() => {
      const qa = window.__duelQA;
      const client = window.__duelClientDiagnostics;
      const safeClient = {};
      for (const key of ['max_receive_queue', 'last_snapshot_tick', 'time_since_snapshot', 'reconnect_count', 'snapshot_ack']) {
        if (Number.isFinite(client?.[key])) safeClient[key] = client[key];
      }
      return { snapshot: qa?.snapshot, phases: qa?.phases, transport: qa?.transport, events: qa?.events,
        snapshotsReceived: qa?.snapshotsReceived, maxSnapshotGapMs: qa?.maxSnapshotGapMs, snapshotAckNegotiated: qa?.snapshotAckNegotiated,
        maxRafGapMs: qa?.maxRafGapMs, maxLongTaskMs: qa?.maxLongTaskMs, frameGaps: qa?.frameGaps, frameSamples: qa?.frameSamples, longTasks: qa?.longTasks,
        client: safeClient };
    });
  }

  async function cutClient(index, label) {
    expectedTransport.add(index);
    mark('transport_cut', { client: index, label });
    proxies[index].cut();
  }
  function restoreClient(index, label) { mark('transport_restore', { client: index, label }); proxies[index].restore(); }
  function recoveredClient(index, label) { expectedTransport.delete(index); mark('transport_recovered', { client: index, label }); }

  try {
    const targetPort = await startGameServer();
    const base = await startWebServer();
    const { chromium } = require('playwright');
    const options = { headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) options.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
    for (const [index, name] of ['ClientA', 'ClientB'].entries()) {
      // Model separate player devices: each retains its own browser/GPU process.
      // Both stay alive and render throughout the entire simultaneous duel.
      // This isolates a shared software-renderer startup bottleneck without
      // changing game timing, startup deadlines, or any visual assertion.
      const browser = await chromium.launch(options);
      browsers.push(browser);
      report.browser_versions.push(browser.version());
      const proxy = await startTcpProxy(targetPort);
      proxies.push(proxy);
      const context = await browser.newContext({ viewport: VIEWPORT, hasTouch: true });
      await context.addInitScript(observePublicSnapshots);
      const page = await context.newPage();
      page.setDefaultTimeout(45_000);
      pages.push(page);
      page.on('pageerror', error => recordFailure(index, 'pageerror', error.message));
      page.on('console', message => {
        const value = message.text();
        // Only a browser transport failure to this exact intentionally interrupted
        // endpoint is expected. Queue overruns, script errors, and all other
        // console errors ALWAYS fail, including during a deliberate outage.
        if (expectedTransport.has(index) && /^WebSocket connection to /.test(value) && value.includes(proxy.endpoint) && /failed|closed/i.test(value)) {
          appendBounded(report.expected_transport_errors, { client: index, at: Date.now(), text: safeLine(value) }, 60);
        } else if (message.type() === 'error' || /SCRIPT ERROR:|Parse Error:/.test(value)) recordFailure(index, 'console', value);
      });
      page.on('response', response => { if (response.status() >= 400) recordFailure(index, 'http', `${response.status()} ${response.url()}`); });
      page.on('requestfailed', request => recordFailure(index, 'request', `${request.url()}: ${request.failure()?.errorText}`));
      await page.goto(base + '?server=' + encodeURIComponent(proxy.endpoint) + '&name=' + name, { waitUntil: 'load', timeout: 60_000 });
      await page.waitForFunction(() => !document.getElementById('status'), undefined, { timeout: 60_000 });
      await wait(500);
      await screenshot(page, `${name}-join`);
      mark('client_booted', { client: index });
    }
    const [a, b] = pages;
    for (const [index, page] of pages.entries()) {
      const name = index ? 'ClientB' : 'ClientA';
      mark('join_click', { client: index });
      await page.mouse.click(640, 471);
      await until(page, s => s.players.some(p => p.name === name), `${name} joins through visible JOIN button`);
      if (!index) await wait(2500); // Warm avatar shader before a live round.
    }
    for (const page of pages) await until(page, s => s.players.length === 2 && s.round.phase === 'countdown', 'initial countdown', 25_000, true);
    await Promise.all(pages.map(p => until(p, s => s.round.phase === 'playing', 'initial round starts')));
    let current = await equalPublicSnapshot('playing', 1);
    let ids = ['ClientA', 'ClientB'].map(name => current.players.find(p => p.name === name)?.id);
    assert(ids.every(Boolean));
    assert(current.players.every(p => p.hp === 100 && p.connected));
    report.checks.push({ name: 'two_real_web_clients_join_countdown_play', status: 'passed', ids });
    for (const [index, page] of pages.entries()) await screenshot(page, `${index ? 'b' : 'a'}-playing`);

    // Reproduce the previous failure mechanism: browser WebSocket callbacks
    // can outpace the engine consumer after a long single-thread render stall.
    // This is a bounded scheduling stressor, not an injected application packet.
    const beforeStall = await equalPublicSnapshot('playing', current.round.number);
    mark('consumer_stall_start', { client: 0, requestedMs: CONSUMER_STALL_MS });
    const stallResult = await a.evaluate(durationMs => {
      const start = performance.now();
      while (performance.now() - start < durationMs) { /* deliberate main-thread starvation */ }
      return { elapsedMs: performance.now() - start, lastObservedTick: window.__duelQA.snapshot.tick };
    }, CONSUMER_STALL_MS);
    const observedStallMs = stallResult.elapsedMs;
    // The other live browser provides a post-stall server-tick fence. Requiring
    // a later tick prevents old pre-stall history/diagnostics proving recovery.
    const postStallFence = Math.max(stallResult.lastObservedTick, await b.evaluate(() => window.__duelQA.snapshot.tick));
    mark('consumer_stall_end', { client: 0, observedMs: observedStallMs });
    assert(observedStallMs >= CONSUMER_STALL_MS);
    await a.waitForFunction(tick => window.__duelClientDiagnostics?.last_snapshot_tick > tick && window.__duelClientDiagnostics?.time_since_snapshot < 2, postStallFence, { timeout: 25_000 });
    current = await equalPublicSnapshot('playing', beforeStall.round.number, postStallFence);
    const afterStall = await diagnostics(a);
    validateStallRecovery(beforeStall, current, afterStall);
    assertClean();
    report.checks.push({ name: 'real_browser_15_second_consumer_stall_backpressure_recovery', status: 'passed', observedStallMs,
      max_receive_queue: afterStall.client.max_receive_queue, maxRafGapMs: afterStall.maxRafGapMs,
      maxLongTaskMs: afterStall.maxLongTaskMs, postStallFence, recovered_snapshot: current });

    // A short real interruption must pause the OTHER client and then restore
    // the same IDs, round, health, position, and wins before any combat resumes.
    const beforeReconnect = current;
    const reconnectStarted = Date.now();
    await cutClient(0, 'short_reconnect');
    const paused = await until(b, s => s.tick > beforeReconnect.tick && s.round.phase === 'paused' && !player(s, ids[0]).connected, 'survivor observes actual disconnect', 5000, true);
    restoreClient(0, 'short_reconnect');
    await Promise.all(pages.map(p => until(p, s => s.tick > paused.tick && s.round.phase === 'playing' && s.players.every(v => v.connected), 'same session reconnects before forfeit', 20_000)));
    current = await equalPublicSnapshot('playing', current.round.number, paused.tick);
    for (const id of ids) for (const field of ['hp', 'x', 'z', 'wins']) assert.equal(player(current, id)[field], player(beforeReconnect, id)[field], `Short reconnect changed ${field}`);
    recoveredClient(0, 'short_reconnect');
    await visualText(a, 'a-reconnected-round', 'ROUND 01');
    await visualText(b, 'b-reconnected-round', 'ROUND 01');
    report.checks.push({ name: 'real_transport_pause_and_same_identity_reconnect', status: 'passed', elapsedMs: Date.now() - reconnectStarted, paused_tick: paused.tick, recovered_tick: current.tick, ids });

    // Ten consecutive completed fights AND ten real two-click rematches. Both
    // players strike each round, then one visibly disengages so winners alternate.
    let roundStart = beforeReconnect;
    for (let index = 0; index < STABILITY_ROUNDS; index++) {
      const round = current.round.number;
      const winnerIndex = index % 2;
      const loserIndex = 1 - winnerIndex;
      const winnerId = ids[winnerIndex];
      const loserId = ids[loserIndex];
      const combatStart = current;
      mark('both_melee_commands', { round, expected_winner: winnerId });
      await Promise.all(pages.map(page => page.keyboard.press('KeyE')));
      await until(a, s => s.round.number === round && s.players.every(p => p.hp < player(combatStart, p.id).hp && p.attack_seq > player(combatStart, p.id).attack_seq), 'both real players pursue and attack back', 30_000);
      const exchanged = await until(b, s => s.round.number === round && s.players.every(p => p.hp < player(combatStart, p.id).hp && p.attack_seq > player(combatStart, p.id).attack_seq), 'both melee damage values replicate', 20_000);
      assert.equal(exchanged.round.phase, 'playing', 'Bidirectional exchange ended before disengagement');
      for (const id of ids) assert(Math.hypot(player(exchanged, id).x - player(combatStart, id).x, player(exchanged, id).z - player(combatStart, id).z) > .5, 'Real pursuit did not move both duelists into melee');
      const loser = player(exchanged, loserId);
      const stop = await groundPoint(pages[loserIndex], loser.x, loser.z);
      mark('loser_disengages', { round, client: loserIndex });
      await pages[loserIndex].mouse.click(stop.x, stop.y, { button: 'right' });
      await Promise.all(pages.map(p => until(p, s => s.round.number === round && s.round.phase === 'finished', 'actual keyboard melee reaches knockout', 35_000)));
      const finished = await equalPublicSnapshot('finished', round);
      assert.equal(finished.round.winner, winnerId);
      assert.equal(finished.round.reason, 'knockout');
      assert.equal(player(finished, loserId).hp, 0);
      assert(player(finished, winnerId).hp > 0 && player(finished, winnerId).hp < player(combatStart, winnerId).hp, 'Winner did not take real opposing damage');
      assert.equal(player(finished, winnerId).wins, player(combatStart, winnerId).wins + 1);
      assert.equal(player(finished, loserId).wins, player(combatStart, loserId).wins);
      await wait(350);
      const titles = await bothTitles(winnerIndex, `round-${String(round).padStart(2, '0')}`);
      if (index === 0 || index === STABILITY_ROUNDS - 1) for (const [i, page] of pages.entries()) await screenshot(page, `round-${round}-${i ? 'b' : 'a'}-finished`);
      const next = await rematch(roundStart, finished, ids, `round-${round}`);
      report.completed_rounds++;
      report.checks.push({ name: 'bidirectional_combat_visible_results_and_two_button_rematch', status: 'passed', cycle: index + 1, round, titles, exchange: exchanged, final: finished, rematch: next });
      current = next;
      roundStart = next;
      mark('stability_cycle_passed', { cycle: index + 1, round });
    }

    // Each actual player casts at the other through Q. Public effects must be
    // observed by BOTH clients, and each visible HUD must show the 24 HP hit.
    const spellStart = current;
    mark('both_projectile_commands', { round: current.round.number });
    await Promise.all(pages.map(async (page, i) => { const target = player(spellStart, ids[1 - i]); const point = await groundPoint(page, target.x, target.z); await page.mouse.move(point.x, point.y); await page.keyboard.press('KeyQ'); }));
    for (const page of pages) {
      for (const id of ids) {
        await until(page, s => s.tick > spellStart.tick && s.telegraphs.some(t => t.owner === id), 'real Q telegraph from each player', 20_000, true);
        await until(page, s => s.tick > spellStart.tick && s.projectiles.some(p => p.owner === id), 'real Q projectile from each player', 20_000, true);
      }
      await until(page, s => s.players.every(p => p.hp === 76), 'both projectiles damage the other real client');
    }
    current = await equalPublicSnapshot('playing', current.round.number, spellStart.tick, s => s.players.every(p => p.hp === 76));
    for (const [i, page] of pages.entries()) {
      await visualText(page, `${i ? 'b' : 'a'}-projectile-own-hp`, '76 / 100', { x: 390, y: 80, width: 235, height: 20 });
      await screenshot(page, `${i ? 'b' : 'a'}-projectile-damage`);
    }
    const dashStart = current;
    mark('both_dash_commands', { round: current.round.number });
    await Promise.all(pages.map(async (page, i) => { const target = player(dashStart, ids[1 - i]); const point = await groundPoint(page, target.x, target.z); await page.mouse.move(point.x, point.y); await page.keyboard.press('Space'); }));
    for (const page of pages) for (const id of ids) await until(page, s => s.tick > dashStart.tick && player(s, id).dashing, 'Space triggers real dash state on both clients', 20_000, true);
    await Promise.all(pages.map(p => until(p, s => s.tick > dashStart.tick && s.players.every(v => !v.dashing && Math.hypot(v.x - player(dashStart, v.id).x, v.z - player(dashStart, v.id).z) >= 2.5), 'both dash positions replicate')));
    current = await equalPublicSnapshot('playing', current.round.number, dashStart.tick, s => s.players.every(p => !p.dashing && Math.hypot(p.x - player(dashStart, p.id).x, p.z - player(dashStart, p.id).z) >= 2.5));
    report.checks.push({ name: 'both_players_keyboard_projectiles_visible_damage_and_dash', status: 'passed', hp_after_projectiles: [76, 76], snapshot_after_dash: current });

    // A longer outage must forfeit. Reconnect before TTL expiry and prove BOTH
    // actual rendered clients show the same result, with opposite local titles.
    const beforeForfeit = current;
    const forfeitStarted = Date.now();
    await cutClient(0, 'forfeit_then_rejoin');
    const forfeited = await until(b, s => s.tick > beforeForfeit.tick && s.round.phase === 'finished' && s.round.reason === 'disconnect', 'real six-second disconnect forfeit', 20_000);
    assert.equal(forfeited.round.winner, ids[1]);
    assert(Date.now() - forfeitStarted >= 6000, 'Disconnect forfeited before the real six-second grace period');
    restoreClient(0, 'forfeit_then_rejoin');
    await until(a, s => s.tick > forfeited.tick && s.round.phase === 'finished' && s.players.every(p => p.connected), 'same session returns to finished result', 25_000);
    const recoveredForfeit = await equalPublicSnapshot('finished', beforeForfeit.round.number, forfeited.tick);
    assert.equal(recoveredForfeit.round.winner, ids[1]);
    assert.equal(player(recoveredForfeit, ids[1]).wins, player(beforeForfeit, ids[1]).wins + 1);
    recoveredClient(0, 'forfeit_then_rejoin');
    const forfeitTitles = await bothTitles(1, 'disconnect-forfeit');
    report.checks.push({ name: 'disconnect_forfeit_reconnect_same_identity_opposite_visible_results', status: 'passed', outageElapsedMs: Date.now() - forfeitStarted, titles: forfeitTitles, public_final_snapshot: recoveredForfeit });
    current = await rematch(beforeForfeit, recoveredForfeit, ids, 'after-forfeit');

    // Wait for actual authoritative removal after the unchanged 60-second TTL;
    // do not accelerate clocks, edit the server, reload, or inspect the token.
    const oldId = ids[0];
    const survivorId = ids[1];
    const expiryRound = current.round.number;
    const survivorWins = player(current, survivorId).wins;
    const expiryStarted = Date.now();
    await cutClient(0, 'session_expiry');
    await until(b, s => s.round.number === expiryRound && s.round.phase === 'finished' && s.round.reason === 'disconnect', 'expiry outage first resolves its round', 20_000);
    const expired = await until(b, s => s.round.phase === 'waiting' && !s.players.some(p => p.id === oldId), 'server expires the disconnected slot after real 60-second TTL', 80_000);
    assert(Date.now() - expiryStarted >= 60_000, 'Session expired before the configured real TTL');
    assert.equal(player(expired, survivorId).wins, survivorWins + 1);
    await visualText(b, 'session-expired-survivor-waiting', 'WAITING FOR A RIVAL');
    restoreClient(0, 'session_expiry');
    const fresh = await until(a, s => s.players.some(p => p.name === 'ClientA' && p.id !== oldId && p.connected), 'expired client automatically rejoins with a fresh slot', 40_000);
    const newId = fresh.players.find(p => p.name === 'ClientA').id;
    assert.notEqual(newId, oldId);
    assert.equal(player(fresh, newId).wins, 0);
    const expiryEvents = await a.evaluate(() => window.__duelQA.events);
    assert(expiryEvents.some(e => e.event === 'session_expired'), 'Fresh identity did not exercise the expired-session recovery path');
    ids = [newId, survivorId];
    await Promise.all(pages.map(p => until(p, s => s.round.number === expiryRound + 1 && s.round.phase === 'playing' && s.players.every(v => v.connected && v.hp === 100), 'fresh identity enters a fair round')));
    current = await equalPublicSnapshot('playing', expiryRound + 1, expired.tick);
    recoveredClient(0, 'session_expiry');
    assert.deepEqual(new Set(current.players.map(p => p.id)), new Set(ids));
    for (const [i, page] of pages.entries()) await visualText(page, `session-recovered-${i ? 'b' : 'a'}-round`, `ROUND ${String(current.round.number).padStart(2, '0')}`);
    // A real command from the replacement identity rules out a merely painted
    // recovery screen with input still tied to the expired identity.
    await a.keyboard.press('KeyE');
    await Promise.all(pages.map(p => until(p, s => s.round.number === current.round.number && player(s, survivorId).hp < 100, 'fresh session can pursue and damage opponent', 30_000)));
    const afterFreshInput = await equalPublicSnapshot('playing', current.round.number, current.tick, s => player(s, survivorId).hp < 100);
    assert(player(afterFreshInput, survivorId).hp < 100, 'Fresh session damage did not agree at a common server tick');
    const freshPosition = player(afterFreshInput, newId);
    const stop = await groundPoint(a, freshPosition.x, freshPosition.z);
    await a.mouse.click(stop.x, stop.y, { button: 'right' });
    report.checks.push({ name: 'real_session_ttl_expiry_automatic_fresh_identity_and_playable_recovery', status: 'passed', outageElapsedMs: Date.now() - expiryStarted, old_id: oldId, new_id: newId, recovered_snapshot: current, input_snapshot: afterFreshInput });

    // Keep the same real browser/player, now with a portrait touch viewport.
    // Projection readiness is emitted after Godot applies its responsive camera,
    // so these are actual touchscreen events at the rendered rival's location.
    mark('mobile_touch_resize_start', { client: 1 });
    await b.setViewportSize({ width: 390, height: 844 });
    await b.waitForFunction(() => Math.abs((window.__duelProjection?.window_width || 0) - 390) < 1 && Math.abs((window.__duelProjection?.window_height || 0) - 844) < 1);
    const mobileStart = await equalPublicSnapshot('playing', current.round.number);
    const mobileTarget = player(mobileStart, newId);
    const mobileProjection = await b.evaluate(() => window.__duelProjection);
    const tap = avatarScreen(mobileTarget.x, mobileTarget.z, mobileProjection);
    assert(tap.x > 0 && tap.x < 390 && tap.y > 0 && tap.y < 844, 'Touch target lies outside the actual mobile viewport');
    mark('mobile_rival_tap', { client: 1, x: tap.x, y: tap.y });
    await b.touchscreen.tap(tap.x, tap.y);
    await Promise.all(pages.map(p => until(p, s => s.round.number === mobileStart.round.number && player(s, newId).hp < player(mobileStart, newId).hp && player(s, survivorId).attack_seq > player(mobileStart, survivorId).attack_seq, 'real portrait touchscreen tap pursues and damages rival', 30_000)));
    // Stop pursuit BEFORE a potentially slow screenshot or common-tick wait.
    // A screenshot must not let the still-attacking player finish this round.
    const floor = await groundPoint(b, -9, 6);
    await b.touchscreen.tap(floor.x, floor.y);
    await until(b, s => s.tick > mobileStart.tick && Math.hypot(player(s, survivorId).x - player(mobileStart, survivorId).x, player(s, survivorId).z - player(mobileStart, survivorId).z) > .25, 'mobile floor tap disengages and moves');
    const mobileDamage = await equalPublicSnapshot('playing', mobileStart.round.number, mobileStart.tick, s => player(s, newId).hp < player(mobileStart, newId).hp && player(s, survivorId).attack_seq > player(mobileStart, survivorId).attack_seq);
    assert(player(mobileDamage, newId).hp < player(mobileStart, newId).hp);
    await screenshot(b, 'mobile-touch-combat');
    await b.setViewportSize(VIEWPORT);
    await b.waitForFunction(() => Math.abs((window.__duelProjection?.window_width || 0) - 1280) < 1 && Math.abs((window.__duelProjection?.window_height || 0) - 800) < 1);
    report.checks.push({ name: 'real_portrait_touchscreen_rival_attack_and_floor_disengage', status: 'passed', viewport: { width: 390, height: 844 }, tap, public_damage_snapshot: mobileDamage });
    mark('mobile_touch_verified_desktop_restored', { client: 1 });

    assert.equal(report.completed_rounds, STABILITY_ROUNDS);
    assert.equal(browsers.length, 2);
    assertClean();
    for (const page of pages) {
      const data = await diagnostics(page);
      assert.equal(data.snapshotAckNegotiated, true, 'Real browser did not negotiate snapshot backpressure');
      assert(Number.isFinite(data.client.max_receive_queue), 'Client queue diagnostics missing');
      assert(data.client.max_receive_queue < 128, 'Client receive queue reached its packet limit');
    }
    report.status = 'passed';
    console.log('PASS: 10 real bidirectional keyboard fights and visible two-click rematches; opposite OCR results; shared HP/reset/sides; Q/Space; real reconnect, forfeit and 60-second session expiry');
  } catch (error) {
    report.status = 'failed';
    report.failure = safeLine(error.message);
    console.error(report.failure);
    for (let i = 0; i < pages.length; i++) { try { await screenshot(pages[i], `${i ? 'b' : 'a'}-failure`); } catch { /* Renderer may have failed. */ } }
    process.exitCode = 1;
  } finally {
    report.failures = failures;
    report.diagnostics = [];
    for (const page of pages) { try { report.diagnostics.push(await diagnostics(page)); } catch { report.diagnostics.push({ unavailable: true }); } }
    report.transports = proxies.map(proxy => ({ ...proxy.metrics }));
    report.durationMs = Date.now() - startedAt;
    await Promise.all(browsers.map(browser => browser.close().catch(() => {})));
    for (const proxy of proxies) await proxy.close();
    if (webServer) await new Promise(resolve => webServer.close(resolve));
    if (serverProcess && serverProcess.exitCode === null) {
      serverProcess.kill('SIGTERM');
      await Promise.race([new Promise(resolve => serverProcess.once('exit', resolve)), wait(3000)]);
      if (serverProcess.exitCode === null) serverProcess.kill('SIGKILL');
    }
    fs.writeFileSync(path.join(out, 'ci-duel-server.log'), serverLog);
    fs.writeFileSync(path.join(out, 'ci-duel-report.json'), JSON.stringify(report, null, 2) + '\n');
  }
}

module.exports = { appendBounded, avatarScreen, commonSnapshot, createLineReader, groundScreen, observePublicSnapshots, safeLine, startTcpProxy, validateRematchSnapshot, validateStallRecovery, STABILITY_ROUNDS, CONSUMER_STALL_MS };
if (require.main === module) main().catch(error => { console.error(safeLine(error.message)); process.exitCode = 1; });
