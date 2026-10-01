// Offline/loopback harness regressions; does not substitute for real browser CI.
const assert = require('node:assert/strict');
const net = require('node:net');
const vm = require('node:vm');
const { test } = require('node:test');
const {
  appendBounded, avatarScreen, commonSnapshot, createLineReader, groundScreen, observePublicSnapshots, safeLine,
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
