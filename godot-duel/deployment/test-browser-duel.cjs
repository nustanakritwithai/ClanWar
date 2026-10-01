// Offline/loopback harness regressions; does not substitute for real browser CI.
const assert = require('node:assert/strict');
const net = require('node:net');
const vm = require('node:vm');
const { test } = require('node:test');
const {
  appendBounded, avatarScreen, commonSnapshot, criticalCueEvidence, readCriticalDiagnostics, createLineReader, groundScreen, observePublicSnapshots, safeLine,
  startTcpProxy, validateRematchSnapshot, validateStallRecovery, STABILITY_ROUNDS, CONSUMER_STALL_MS,
} = require('./browser-duel.cjs');

function snapshot(tick = 1) {
  return {
    type: 'snapshot', tick,
    round: { phase: 'playing', number: 1, winner: '', reason: '' },
    players: [
      { id: 'p1', name: 'ClientA', hp: 100, max_hp: 100, x: -6, z: 0, wins: 0, ready: false, connected: true, attack_seq: 0, dashing: false, skill_cd: 0, dash_cd: 0 },
      { id: 'p2', name: 'ClientB', hp: 100, max_hp: 100, x: 6, z: 0, wins: 0, ready: false, connected: true, attack_seq: 0, dashing: false, skill_cd: 0, dash_cd: 0 },
    ],
    projectiles: [], telegraphs: [],
  };
}

function makeObserver() {
  const listeners = new Map();
  let outgoing = 0;
  class NativeWebSocket {
    addEventListener(name, listener) { listeners.set(name, listener); }
    send() { outgoing++; }
  }
  const context = { window: { WebSocket: NativeWebSocket }, performance: { now: () => 1, timeOrigin: 1000 }, requestAnimationFrame() {}, Date, JSON, Math };
  vm.createContext(context);
  vm.runInContext(`(${observePublicSnapshots.toString()})()`, context);
  new context.window.WebSocket('ws://127.0.0.1:12345');
  return {
    qa: context.window.__duelQA,
    emit(name, value = {}) { listeners.get(name)(value); },
    packet(value) { listeners.get('message')({ data: JSON.stringify(value) }); },
    get outgoing() { return outgoing; },
  };
}

test('release gate always requires 10 fights/rematches and bounds retained lists', () => {
  assert.equal(STABILITY_ROUNDS, 10);
  const list = [];
  for (let i = 0; i < 10; i++) appendBounded(list, i, 3);
  assert.deepEqual(list, [7, 8, 9]);
  assert.equal(safeLine('welcome secret'), '[sensitive text omitted]');
  assert.equal(safeLine('resume_token=secret'), '[sensitive text omitted]');
  assert.equal(safeLine('x'.repeat(3000)).length, 2000);
});

test('split process output preserves readiness and errors without combining separate streams', () => {
  const lines = [];
  const stdout = createLineReader(line => lines.push(line));
  const stderr = createLineReader(line => lines.push(line));
  stdout.push('LANTERN_ARE');
  stderr.push('SCR');
  stdout.push('NA_READY ws://127.0.0.1:1234\nother line\n');
  stderr.push('IPT ER');
  stderr.push('ROR: failure\nERROR: eof');
  stderr.flush();
  assert.deepEqual(lines, ['LANTERN_ARENA_READY ws://127.0.0.1:1234', 'other line', 'SCRIPT ERROR: failure', 'ERROR: eof']);
  const bounded = createLineReader(line => assert.equal(line.length, 8192));
  bounded.push('x'.repeat(20_000));
  bounded.push('y'.repeat(20_000) + '\n');
});

test('passive observer ignores welcome, strips unapproved fields, and never sends', () => {
  const observer = makeObserver();
  observer.packet({ type: 'welcome', id: 'p1', token: 'do-not-retain', resumed: true, snapshot_ack: true });
  assert.equal(observer.qa.snapshotAckNegotiated, true);
  const sample = snapshot();
  sample.token = 'do-not-retain';
  sample.players[0].token = 'do-not-retain';
  sample.round.internal = 'do-not-retain';
  sample.projectiles = [{ id: 'b1', owner: 'p1', x: 1, z: 2, dx: 3, dz: 4, token: 'do-not-retain' }];
  observer.packet(sample);
  assert.equal(observer.qa.snapshot.tick, 1);
  assert.equal(observer.qa.snapshot.players[0].attack_seq, 0);
  assert.equal(observer.qa.snapshot.projectiles[0].owner, 'p1');
  assert(!JSON.stringify(observer.qa).includes('do-not-retain'));
  assert.equal(observer.outgoing, 0);
});

test('observer retains bounded snapshot/event/transport history and sanitized expiry signal', () => {
  const observer = makeObserver();
  for (let i = 0; i < 400; i++) {
    observer.packet(snapshot(i));
    observer.emit('close', { code: 1006, reason: 'private-token-must-not-be-retained' });
    observer.packet({ type: 'error', reason: 'invalid_resume_token', token: 'private-token-must-not-be-retained' });
  }
  assert.equal(observer.qa.history.length, 300);
  assert.equal(observer.qa.history[0].tick, 100);
  assert.equal(observer.qa.transport.length, 100);
  assert.equal(observer.qa.events.length, 100);
  assert.equal(observer.qa.events[0].event, 'session_expired');
  assert.equal(observer.qa.snapshotsReceived, 400);
  assert(!JSON.stringify(observer.qa).includes('private-token'));
  assert.equal(observer.outgoing, 0);
});

test('critical packet observer retains only bounded authoritative cue metadata and negotiation', () => {
  const observer = makeObserver();
  observer.packet({ type: 'welcome', token: 'do-not-retain', critical_timeline: true });
  assert.equal(observer.qa.criticalTimelineNegotiated, true);
  for (let seq = 1; seq <= 100; seq++) observer.packet({
    type: 'critical_timeline', seq, tick: seq * 2, server_time: 10, round_number: 11, phase: 'playing', token: 'do-not-retain',
    telegraphs: [{ id: 't1', owner: 'p1', x: 0, z: 0, dx: 1, dz: 0, expires_at: 10.4, token: 'do-not-retain' }],
    dashes: [{ owner: 'p2', x: 1, z: 0, dx: -1, dz: 0, expires_at: 10.18, token: 'do-not-retain' }],
  });
  assert.equal(observer.qa.criticalTimelines.length, 64);
  assert.equal(observer.qa.criticalTimelines[0].seq, 37);
  assert.equal(observer.qa.criticalTimelines.at(-1).telegraphs[0].expires_at, 10.4);
  assert.equal(observer.qa.criticalTimelines.at(-1).dashes[0].owner, 'p2');
  assert(!JSON.stringify(observer.qa).includes('do-not-retain'));
  assert.equal(observer.qa.snapshot, null, 'Critical packets must not replace position snapshots');
  assert.equal(observer.outgoing, 0);
});

test('post-draw diagnostics are read-only, allow-listed and bounded independently of packet history', () => {
  const cue = { id: 't1', owner: 'p1', seq: 1, round_number: 11, server_time_upper: 10.1, expires_at: 10.4, frame: 42, token: 'do-not-retain' };
  const expired = { kind: 'telegraphs', id: 't1', owner: 'p1', seq: 1, stage: 'draw_completed', server_time_upper: 10.5,
    expires_at: 10.4, submitted_at_server_time_upper: 10.2, frame: 43, token: 'do-not-retain' };
  const source = { telegraphs: Array.from({ length: 100 }, () => ({ ...cue })), dashes: [{ ...cue }],
    expired: Array.from({ length: 100 }, () => ({ ...expired })), expired_cues_skipped: 2, server_time_upper: 10.2, token: 'do-not-retain' };
  const context = { window: { __duelQA: { criticalTimelineNegotiated: true, criticalTimelines: [], frameHistory: [], longTasks: [] }, __duelVisualDiagnostics: source } };
  vm.createContext(context);
  const result = vm.runInContext(`(${readCriticalDiagnostics.toString()})()`, context);
  assert.equal(result.visual.telegraphs.length, 64);
  assert.equal(result.visual.expired.length, 64);
  assert.equal(result.visual.expired[0].stage, 'draw_completed');
  assert.equal(result.visual.expired[0].submitted_at_server_time_upper, 10.2);
  assert.equal(result.visual.expired_cues_skipped, 2);
  assert.equal(result.visual.server_time_upper, 10.2);
  assert.equal(result.visual.dashes[0].id, undefined);
  assert(!JSON.stringify(result).includes('do-not-retain'));
  assert.equal(source.telegraphs.length, 100, 'Reading must not mutate renderer evidence');
  assert.equal(source.expired.length, 100, 'Reading must not mutate expiry records');
});

function cueFixture(kind = 'telegraphs') {
  const expires = kind === 'dashes' ? 10.18 : 10.4;
  const cue = { ...(kind === 'telegraphs' ? { id: 't1' } : {}), owner: 'p1', x: 0, z: 0, dx: 1, dz: 0, expires_at: expires };
  const packet = { at: 1000, seq: 8, tick: 201, server_time: 10, round_number: 11, phase: 'playing', telegraphs: [], dashes: [] };
  packet[kind] = [cue];
  const visual = { telegraphs: [], dashes: [], expired_cues_skipped: 0, server_time_upper: 10.1 };
  visual[kind] = [{ ...(kind === 'telegraphs' ? { id: 't1' } : {}), owner: 'p1', seq: 8, round_number: 11, server_time_upper: 10.1, expires_at: expires, frame: 51 }];
  return { state: { timelines: [packet], visual, frameHistory: [], longTasks: [] },
    fence: { started_at: 999, seq: 7, tick: 200, round: 11, frame: 50, expired_cues_skipped: 0 } };
}

test('telegraph and dash proof each require authoritative delivery plus matching valid post-draw evidence', () => {
  for (const kind of ['telegraphs', 'dashes']) {
    const { state, fence } = cueFixture(kind);
    const result = criticalCueEvidence(kind, 'p1', state, fence);
    assert.equal(result.status, 'passed');
    assert.equal(result.rendered.seq, result.delivered.seq);
    assert(result.rendered.server_time_upper < result.delivered.expires_at);
    const noPacket = structuredClone(state);
    noPacket.timelines = [];
    assert.equal(criticalCueEvidence(kind, 'p1', noPacket, fence).status, 'missing_network_timeline');
    const noDraw = structuredClone(state);
    noDraw.visual[kind] = [];
    assert.equal(criticalCueEvidence(kind, 'p1', noDraw, fence).status, 'delivered_without_valid_postdraw_proof');
  }
});

test('critical proof rejects stale, wrong-owner/seq/id, fabricated expiry, and expired post-draw records', () => {
  const mutations = [
    s => { s.visual.telegraphs[0].owner = 'p2'; },
    s => { s.visual.telegraphs[0].seq = 7; },
    s => { s.visual.telegraphs[0].round_number = 10; },
    s => { s.visual.telegraphs[0].id = 't2'; },
    s => { s.visual.telegraphs[0].frame = 50; },
    s => { s.visual.telegraphs[0].frame = 51.5; },
    s => { s.visual.telegraphs[0].server_time_upper = 9.9; },
    s => { s.visual.telegraphs[0].server_time_upper = 10.4; },
    s => { s.visual.telegraphs[0].server_time_upper = 10.5; },
    s => { s.visual.telegraphs[0].server_time_upper = NaN; },
    s => { s.visual.telegraphs[0].expires_at = 11; },
    s => { s.timelines[0].at = 998; },
    s => { s.timelines[0].seq = 7; },
    s => { s.timelines[0].tick = 199; },
    s => { s.timelines[0].round_number = 10; },
    s => { s.timelines[0].phase = 'paused'; },
    s => { s.timelines[0].telegraphs[0].expires_at = 10; },
  ];
  for (const mutate of mutations) {
    const { state, fence } = cueFixture();
    mutate(state);
    assert.notEqual(criticalCueEvidence('telegraphs', 'p1', state, fence).status, 'passed');
  }
});

test('failed cue diagnostics separate missing network, expired render, and a frame gap covering its whole lifetime', () => {
  const { state, fence } = cueFixture('dashes');
  state.visual.dashes = [];
  state.visual.server_time_upper = 10.3;
  state.visual.expired_cues_skipped = 1;
  const expired = criticalCueEvidence('dashes', 'p1', state, fence);
  assert.equal(expired.status, 'expired_without_postdraw_proof');
  assert.equal(expired.expired_cues_skipped_delta, 1);
  assert.equal(expired.hardware_render_block, false);
  state.frameHistory = [{ at: 1200, durationMs: 220 }];
  const blocked = criticalCueEvidence('dashes', 'p1', state, fence);
  assert.equal(blocked.status, 'frame_gap_covers_cue_lifetime');
  assert.equal(blocked.hardware_render_block, true);
  state.frameHistory = [{ at: 1100, durationMs: 20 }];
  assert.equal(criticalCueEvidence('dashes', 'p1', state, fence).hardware_render_block, false);
});

test('expiry diagnostics preserve the first matching stage and conservative clock margins without claiming hardware failure', () => {
  const { state, fence } = cueFixture();
  state.visual.telegraphs = [];
  state.visual.server_time_upper = 10.7;
  const received = { kind: 'telegraphs', id: 't1', owner: 'p1', seq: 8, stage: 'received',
    server_time_upper: 10.5, expires_at: 10.4, submitted_at_server_time_upper: -1, frame: 51 };
  state.visual.expired = [
    { ...received, owner: 'p2', frame: 50 },
    { ...received, seq: 7, frame: 51 },
    { ...received, id: 't2', frame: 51 },
    { ...received, expires_at: 11, frame: 51 },
    { ...received, stage: 'render_update', frame: 52, server_time_upper: 10.6 },
    received,
  ];
  const result = criticalCueEvidence('telegraphs', 'p1', state, fence);
  assert.equal(result.status, 'expired_without_postdraw_proof');
  assert.equal(result.first_expired.stage, 'received');
  assert.equal(result.expired_records.length, 2);
  assert(Math.abs(result.first_expired.upper_clock_margin_ms + 100) < 1e-8);
  assert.equal(result.first_expired.submitted_upper_clock_margin_ms, null);
  assert.equal(result.first_expired.submission_current_by_upper_clock, null);
  assert.equal(result.first_expired.interpretation, 'upper_bound_expired_on_receive');
  assert.equal(result.first_expired.clock_is_conservative_upper_bound, true);
  assert.equal(result.hardware_render_block, false);
});

test('current-on-submit but late upper-bound draw completion remains unproven and cannot change the pass criteria', () => {
  const { state, fence } = cueFixture('dashes');
  state.visual.dashes = [];
  state.visual.server_time_upper = 10.3;
  state.visual.expired = [{ kind: 'dashes', id: '', owner: 'p1', seq: 8, stage: 'draw_completed',
    server_time_upper: 10.2, expires_at: 10.18, submitted_at_server_time_upper: 10.1, frame: 52 }];
  const result = criticalCueEvidence('dashes', 'p1', state, fence);
  assert.notEqual(result.status, 'passed');
  assert.equal(result.first_expired.stage, 'draw_completed');
  assert.equal(result.first_expired.submission_current_by_upper_clock, true);
  assert(Math.abs(result.first_expired.submitted_upper_clock_margin_ms - 80) < 1e-8);
  assert(Math.abs(result.first_expired.upper_clock_margin_ms + 20) < 1e-8);
  assert.equal(result.first_expired.interpretation, 'current_on_submit_but_no_valid_completed_draw');
  assert.equal(result.hardware_render_block, false);
  state.visual.dashes = cueFixture('dashes').state.visual.dashes;
  assert.equal(criticalCueEvidence('dashes', 'p1', state, fence).status, 'passed', 'Diagnostic expiry records must not replace valid post-draw proof');
});

test('shared snapshot proof rejects mismatches and old observations after reconnect', () => {
  const a = snapshot(10);
  const b = structuredClone(a);
  assert.equal(commonSnapshot([a], [b], 'playing', 1, 9).tick, 10);
  b.players[0].hp = 99;
  assert.throws(() => commonSnapshot([a], [b], 'playing', 1), /disagree/);
  assert.throws(() => commonSnapshot([a], [a], 'playing', 1, 10), /No common/);
  assert.throws(() => commonSnapshot([a], [a], 'finished', 1), /No common/);
  const damaged = structuredClone(a);
  damaged.tick = 12;
  damaged.players[0].hp = 86;
  assert.equal(commonSnapshot([a, damaged], [a, damaged], 'playing', 1, 9, s => s.players[0].hp < 100).tick, 12);
  assert.throws(() => commonSnapshot([a], [a], 'playing', 1, 9, s => s.players[0].hp < 100), /No common/);
});

test('disjoint fresh ticks prove exact full-state convergence and disclose both actual observations', () => {
  const result = commonSnapshot([snapshot(100)], [snapshot(101)], 'playing', 1, 99);
  assert.equal(result.tick, 100);
  assert.deepEqual(result.comparison, {
    mode: 'fresh_exact_state', observed_ticks: { client_a: 100, client_b: 101 },
    latest_observed_tick: 101, min_tick_exclusive: 99, max_tick_skew: 20,
  });
  assert.equal(commonSnapshot([snapshot(100)], [snapshot(120)], 'playing', 1, 99).comparison.mode, 'fresh_exact_state');
});

test('fresh same-tick evidence remains preferred over a newer disjoint equal state', () => {
  const result = commonSnapshot([snapshot(100), snapshot(102)], [snapshot(100), snapshot(103)], 'playing', 1, 99);
  assert.equal(result.comparison.mode, 'same_tick');
  assert.deepEqual(result.comparison.observed_ticks, { client_a: 100, client_b: 100 });
});

test('same-tick disagreement cannot fall back, disappear behind a predicate, or hide in duplicate entries', () => {
  const divergent = snapshot(100);
  divergent.players[0].hp = 99;
  const equalA = snapshot(102);
  const equalB = snapshot(103);
  for (const predicate of [() => true, s => s.tick > 100]) {
    assert.throws(() => commonSnapshot([snapshot(100), equalA], [divergent, equalB], 'playing', 1, 99, predicate), /disagree on the same server tick/);
  }
  assert.throws(() => commonSnapshot([snapshot(100), divergent, equalA], [snapshot(100), equalB], 'playing', 1, 99), /disagree on the same server tick/);
  const wrongRound = snapshot(100);
  wrongRound.round.number = 2;
  assert.throws(() => commonSnapshot([snapshot(100), equalA], [wrongRound, equalB], 'playing', 1, 99), /disagree on the same server tick/);
});

test('independent samples must both cross the fence and remain within 20 ticks of the latest observation', () => {
  assert.throws(() => commonSnapshot([snapshot(100)], [snapshot(101)], 'playing', 1, 100), /No common/);
  assert.throws(() => commonSnapshot([snapshot(101)], [snapshot(100)], 'playing', 1, 100), /No common/);
  assert.throws(() => commonSnapshot([snapshot(100)], [snapshot(121)], 'playing', 1, 99), /No common/);
  const newer = snapshot(122);
  newer.players[0].hp = 86;
  assert.throws(() => commonSnapshot([snapshot(100), newer], [snapshot(101)], 'playing', 1, 99), /No common/);
  const latestOtherRound = snapshot(122);
  latestOtherRound.round.number = 2;
  assert.throws(() => commonSnapshot([snapshot(100), latestOtherRound], [snapshot(101)], 'playing', 1, 99), /No common/);
  assert.throws(() => commonSnapshot([snapshot(100)], [snapshot(101)], 'playing', 1, 99, s => s.tick > 100), /No common/);
});

test('disjoint ticks reject every public payload difference without HP, position, or cooldown tolerance', () => {
  const mutations = [
    s => { s.players[0].hp = 99; },
    s => { s.players[0].x = -6 + 1e-12; },
    s => { s.players[0].z = 1e-12; },
    s => { s.players[0].skill_cd = 1e-12; },
    s => { s.players[0].wins = 1; },
    s => { s.players[0].ready = true; },
    s => { s.players[0].connected = false; },
    s => { s.players[0].hp = '100'; },
    s => { s.round.phase = 'finished'; },
    s => { s.round.number = 2; },
    s => { s.round.winner = 'p1'; },
    s => { s.round.reason = 'knockout'; },
    s => { s.projectiles.push({ id: 'b1', owner: 'p1', x: 0, z: 0 }); },
    s => { s.telegraphs.push({ id: 't1', owner: 'p1', remaining: .1 }); },
    s => { s.players.reverse(); },
    s => { s.unexpected_public_field = 1; },
  ];
  for (const mutate of mutations) {
    const other = snapshot(101);
    mutate(other);
    assert.throws(() => commonSnapshot([snapshot(100)], [other], 'playing', 1, 99), /No common/);
  }
});

test('rematch validates HP, ready, identities, wins, exact round, and swapped start positions', () => {
  const before = snapshot(1);
  before.players[0].wins = 4;
  const after = structuredClone(before);
  after.round.number = 2;
  after.round.phase = 'countdown';
  after.players.forEach(p => { p.x *= -1; });
  validateRematchSnapshot(after, before, ['p1', 'p2']);
  for (const [key, value] of [['hp', 86], ['ready', true], ['x', -6], ['z', 1], ['id', 'p3'], ['wins', 0], ['connected', false]]) {
    const invalid = structuredClone(after);
    invalid.players[0][key] = value;
    assert.throws(() => validateRematchSnapshot(invalid, before, ['p1', 'p2']), `must reject ${key}`);
  }
  const doubleAdvance = structuredClone(after);
  doubleAdvance.round.number = 3;
  assert.throws(() => validateRematchSnapshot(doubleAdvance, before, ['p1', 'p2']));
});

test('ground projection uses observed CSS-pixel camera basis and rejects missing geometry', () => {
  const projection = { ground_origin_x: 640, ground_origin_y: 400, ground_unit_x_x: 20, ground_unit_x_y: 10,
    ground_unit_z_x: -16, ground_unit_z_y: 12, canvas_left: 8, canvas_top: 24 };
  assert.deepEqual(groundScreen(-6, 0, projection), { x: 528, y: 364 });
  assert.deepEqual(groundScreen(6, 2, projection), { x: 736, y: 508 });
  assert.throws(() => groundScreen(1, 2), /Missing finite/);
  assert.throws(() => groundScreen(1, 2, { ...projection, ground_origin_x: NaN }), /Missing finite/);
});

test('avatar touch projection uses the actual fitted vertical basis', () => {
  const projection = { ground_origin_x: 195, ground_origin_y: 390, ground_unit_x_x: 5, ground_unit_x_y: 3,
    ground_unit_z_x: -4, ground_unit_z_y: 4, canvas_left: 0, canvas_top: 0, avatar_up_x: 0, avatar_up_y: -8 };
  assert.deepEqual(avatarScreen(2, 1, projection), { x: 201, y: 390.4 });
  assert.throws(() => avatarScreen(2, 1, { ...projection, avatar_up_y: undefined }), /Missing finite avatar/);
});

test('consumer-starvation recovery requires a fresh identical state, one socket, and a small queue', () => {
  assert(CONSUMER_STALL_MS > 128 * 100, 'Stall must exceed the historical 128-packet window at 10Hz');
  const before = snapshot(1);
  const after = snapshot(300);
  const diagnostics = { snapshotAckNegotiated: true, transport: [{ event: 'open' }], client: { max_receive_queue: 4 } };
  validateStallRecovery(before, after, diagnostics);
  for (const queue of [17, 128, NaN, undefined]) {
    assert.throws(() => validateStallRecovery(before, after, { ...diagnostics, client: { max_receive_queue: queue } }));
  }
  for (const event of ['open', 'close', 'error']) {
    assert.throws(() => validateStallRecovery(before, after, { ...diagnostics, transport: [...diagnostics.transport, { event }] }));
  }
  assert.throws(() => validateStallRecovery(before, before, diagnostics));
  const damaged = snapshot(300);
  damaged.players[0].hp = 86;
  assert.throws(() => validateStallRecovery(before, damaged, diagnostics));
});

const listen = server => new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const connect = port => new Promise((resolve, reject) => { const socket = net.createConnection({ host: '127.0.0.1', port }); socket.once('error', reject); socket.once('connect', () => resolve(socket)); });
const closed = socket => new Promise(resolve => { if (socket.destroyed) resolve(); else socket.once('close', resolve); });
const echo = (socket, payload) => new Promise((resolve, reject) => {
  let result = Buffer.alloc(0);
  const onData = chunk => { result = Buffer.concat([result, chunk]); if (result.length >= payload.length) { socket.off('data', onData); resolve(result); } };
  socket.on('data', onData);
  socket.once('error', reject);
  socket.write(payload);
});

test('transparent TCP proxy preserves bytes, cuts active legs, rejects during outage, and restores', { timeout: 5000 }, async () => {
  const connections = new Set();
  const server = net.createServer(socket => { connections.add(socket); socket.on('close', () => connections.delete(socket)); socket.pipe(socket); });
  await listen(server);
  const proxy = await startTcpProxy(server.address().port);
  const port = Number(new URL(proxy.endpoint).port);
  try {
    const first = await connect(port);
    const payload = Buffer.from([0, 255, 13, 10, 1, 4, 8, 16, 128]);
    assert.deepEqual(await echo(first, payload), payload);
    const didClose = closed(first);
    proxy.cut();
    await didClose;
    const denied = await connect(port);
    await closed(denied);
    assert.equal(proxy.metrics.rejected, 1);
    proxy.restore();
    const second = await connect(port);
    assert.deepEqual(await echo(second, payload), payload);
    second.destroy();
    assert.equal(proxy.metrics.accepted, 2);
    assert.equal(proxy.metrics.interruptions, 1);
  } finally {
    await proxy.close();
    for (const socket of connections) socket.destroy();
    await new Promise(resolve => server.close(resolve));
  }
});
