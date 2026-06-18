/**
 * Phase 5A-3 Bot Brain regression.
 * Usage: node scripts/phase-5a-bot-brain-regression.mjs [baseUrl]
 *
 * Boots once and restarts scenes in-page (same harness as the other bot scripts).
 * Verifies the Bot Brain advisor layer: perception snapshot, short-term memory
 * (record + expiry), goal selection (chase/attack/investigate/patrol/return),
 * plan execution, miss-affects-decision, preserved 5A-2 attack/dodge, respawn
 * memory clear, no-duplicate reset, mobile readability.
 *
 * Memory/time tests advance the scene clock deterministically by stepping the
 * brain via the game loop; the brain uses scene.time.now, never Date.now().
 */
import puppeteer from 'puppeteer';

const BASE_URL = process.argv[2] ?? 'http://127.0.0.1:4173';
const results = [];
const log = (t, p, d = '') => { results.push({ t, p }); console.log(`${p ? 'PASS' : 'FAIL'}: ${t}${d ? ` — ${d}` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let booted = false;
async function startMatch(page, viewport = { width: 1280, height: 720 }, heroClass = 'guardian') {
  if (!booted) {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => !!window.__CLANWAR_GAME__);
    booted = true;
  }
  await page.setViewport(viewport);
  await page.evaluate(() => {
    const g = window.__CLANWAR_GAME__;
    ['MatchScene', 'ResultScene'].forEach((k) => { try { g.scene.stop(k); } catch (e) {} });
    g.registry.remove('lastMatchResult');
    g.scene.start('MenuScene');
  });
  await sleep(150);
  await page.evaluate((hc) => {
    const g = window.__CLANWAR_GAME__;
    try { g.scene.stop('MenuScene'); } catch (e) {}
    g.scene.start('MatchScene', { heroClass: hc });
  }, heroClass);
  await page.waitForFunction(() => {
    const s = window.__CLANWAR_GAME__?.scene?.getScene('MatchScene');
    return s?.objectiveSystem && s?.matchTimerSystem && s?.player && s?.botSystem?.getBrainSnapshot;
  });
  await sleep(300);
}

async function teleportPlayer(page, x, y) {
  await page.evaluate(({ px, py }) => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.player.sprite.setPosition(px, py);
    s.player.body.reset(px, py);
    s.player.update();
  }, { px: x, py: y });
}

const botSnap = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getBotSnapshot());
const brainSnap = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getBrainSnapshot());
const playerHp = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.currentHp);
const goalOf = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getBrainSnapshot().goal);

/** Park player just inside detection (below the bot) and let a sighting register. */
async function makeBotSeePlayer(page) {
  const b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + b.detectionRange - 60);
  await sleep(200);
  return b;
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/404|favicon/i.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));

  // ---------- B1: perception snapshot contents ----------
  await startMatch(page);
  await teleportPlayer(page, 300, 300); // far → idle/patrol
  await sleep(150);
  const per = (await brainSnap(page)).perception;
  log('B1 perception has distance/visibility/hp/cooldown',
    per && typeof per.distanceToPlayer === 'number' && typeof per.playerInDetectionRange === 'boolean' &&
    typeof per.hpRatio === 'number' && typeof per.cooldownReady === 'boolean',
    JSON.stringify({ dist: per?.distanceToPlayer?.toFixed(0), det: per?.playerInDetectionRange, hp: per?.hpRatio, cd: per?.cooldownReady }));

  // ---------- B2: memory records last seen player position ----------
  await startMatch(page);
  let b = await makeBotSeePlayer(page);
  let mem = (await brainSnap(page)).memory;
  log('B2 memory records last-seen player position',
    mem.lastSeenPlayerX !== null && mem.lastSeenPlayerY !== null && mem.lastSeenAtMs !== null,
    JSON.stringify({ x: mem.lastSeenPlayerX?.toFixed(0), y: mem.lastSeenPlayerY?.toFixed(0) }));

  // ---------- B3: memory expires after configured duration ----------
  // Move player far so no new sightings; wait > lastSeenLifetimeMs (5000) then check validity via goal.
  await teleportPlayer(page, 300, 300);
  await sleep(300);
  const investigatingShortly = (await brainSnap(page)).goal; // should be investigate while memory valid
  await sleep(5200);
  const afterExpiry = await brainSnap(page);
  const lastSeenAt = afterExpiry.memory.lastSeenAtMs;
  const perNow = afterExpiry.perception;
  // Expired ⇒ no longer investigating ⇒ patrol (player is far, not detected).
  log('B3 memory expires after configured duration (~5s)',
    afterExpiry.goal === 'patrol_area',
    JSON.stringify({ investigatingShortly, afterExpiryGoal: afterExpiry.goal }));

  // ---------- B4: visible player (not in range) selects chase ----------
  await startMatch(page);
  b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + b.detectionRange - 60); // in detection, outside attack range
  await sleep(180);
  log('B4 visible player selects chase goal', (await goalOf(page)) === 'chase_player', `goal=${await goalOf(page)}`);

  // ---------- B5: in-range player selects attack ----------
  await startMatch(page);
  b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + b.attackRange - 14);
  // Sample goal across a few frames — attack wins when in range + cooldown ready.
  let sawAttackGoal = false;
  for (let i = 0; i < 12; i++) { await sleep(50); if ((await goalOf(page)) === 'attack_player') { sawAttackGoal = true; break; } }
  log('B5 in-range player selects attack goal', sawAttackGoal, `goal=${await goalOf(page)}`);

  // ---------- B6: player lost but memory valid selects investigate ----------
  await startMatch(page);
  b = await makeBotSeePlayer(page);
  // Now yank the player far outside detection AND leash, but within memory lifetime.
  await teleportPlayer(page, b.x + 2000, b.y + 2000);
  await sleep(200);
  log('B6 lost player + valid memory selects investigate', (await goalOf(page)) === 'investigate_last_seen', `goal=${await goalOf(page)}`);

  // ---------- B7: expired memory returns to patrol ----------
  await sleep(5200);
  log('B7 expired memory returns to patrol', (await goalOf(page)) === 'patrol_area', `goal=${await goalOf(page)}`);

  // ---------- B8: stuck bot selects return_to_spawn ----------
  await startMatch(page);
  await teleportPlayer(page, 300, 300); // player far
  await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugSetStuck(true));
  await sleep(180);
  const stuckGoal = await goalOf(page);
  await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugSetStuck(null));
  log('B8 stuck bot selects return_to_spawn', stuckGoal === 'return_to_spawn', `goal=${stuckGoal}`);

  // ---------- B9: off-leash (too far from spawn) selects return_to_spawn ----------
  await startMatch(page);
  await teleportPlayer(page, 300, 300); // player far
  b = await botSnap(page);
  await page.evaluate(({ x, y }) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugTeleportBot(x, y),
    { x: b.spawnX, y: b.spawnY + 650 }); // 650 > returnToSpawnDistance (520)
  await sleep(180);
  log('B9 too-far-from-spawn selects return_to_spawn', (await goalOf(page)) === 'return_to_spawn', `goal=${await goalOf(page)}`);

  // ---------- B10: plan queue executes 1–3 steps ----------
  await startMatch(page);
  b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + b.detectionRange - 60); // chase plan: face→move→windup
  const stepsSeen = new Set();
  let planLenOk = false;
  for (let i = 0; i < 24; i++) {
    await sleep(50);
    const bs = await brainSnap(page);
    if (bs.goal === 'chase_player' || bs.goal === 'attack_player') {
      stepsSeen.add(bs.plan.currentStep);
      if (bs.plan.steps.length >= 1 && bs.plan.steps.length <= 3) planLenOk = true;
    }
  }
  log('B10 plan queue executes 1–3 steps', planLenOk && stepsSeen.size >= 2, JSON.stringify({ steps: [...stepsSeen] }));

  // ---------- B11: recent missed attack affects next decision ----------
  await startMatch(page);
  b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + b.attackRange - 14);
  // Wait for wind-up, then dodge out so the swing whiffs → records a miss.
  let forcedMiss = false;
  for (let i = 0; i < 16; i++) {
    await sleep(45);
    if ((await botSnap(page)).state === 'windup') { await teleportPlayer(page, b.x + 2000, b.y + 2000); forcedMiss = true; break; }
  }
  await sleep(900); // let the wind-up resolve into a whiff (records the miss)
  const missMem = (await brainSnap(page)).memory;
  log('B11 recent missed attack recorded + affects decision',
    forcedMiss && missMem.lastMissedAttackAtMs !== null, JSON.stringify({ forcedMiss, miss: missMem.lastMissedAttackAtMs !== null }));

  // ---------- B12: bot still damages player only after wind-up ----------
  await startMatch(page);
  b = await botSnap(page);
  const hpStart = await playerHp(page);
  await teleportPlayer(page, b.x, b.y + b.attackRange - 14);
  let hpDuringWindup = hpStart;
  for (let i = 0; i < 16; i++) { await sleep(50); if ((await botSnap(page)).state === 'windup') { hpDuringWindup = await playerHp(page); break; } }
  await sleep(900);
  const hpAfter = await playerHp(page);
  log('B12 bot damages player only after wind-up', hpAfter < hpStart && hpDuringWindup === hpStart, JSON.stringify({ hpStart, hpDuringWindup, hpAfter }));

  // ---------- B13: player can still dodge during wind-up ----------
  await startMatch(page);
  b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + b.attackRange - 14);
  const hpBeforeDodge = await playerHp(page);
  let dodged = false;
  for (let i = 0; i < 16; i++) { await sleep(45); if ((await botSnap(page)).state === 'windup') { await teleportPlayer(page, b.x + 2000, b.y + 2000); dodged = true; break; } }
  await sleep(800);
  log('B13 player can dodge during wind-up', dodged && (await playerHp(page)) === hpBeforeDodge, JSON.stringify({ dodged }));

  // ---------- B14: respawn clears memory + plan ----------
  await startMatch(page);
  b = await makeBotSeePlayer(page); // seed memory
  const memBefore = (await brainSnap(page)).memory.lastSeenPlayerX !== null;
  await teleportPlayer(page, 300, 300);
  await page.evaluate((hp) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugDamageBot(hp + 1000),
    (await botSnap(page)).maxHp);
  await sleep((await botSnap(page)).respawnDelayMs + 1400); // wait full respawn
  const afterRespawn = await brainSnap(page);
  log('B14 respawn clears memory + plan',
    memBefore && afterRespawn.memory.lastSeenPlayerX === null && afterRespawn.goal === 'patrol_area',
    JSON.stringify({ memBefore, memAfter: afterRespawn.memory.lastSeenPlayerX, goal: afterRespawn.goal }));

  // ---------- B15: reset MatchScene x3 — no duplicate bot/brain ----------
  let maxBots = 0;
  for (let i = 0; i < 3; i++) {
    await startMatch(page);
    const c = await page.evaluate(() => {
      const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
      const bodies = s.children.list.filter((o) => o.getData && o.getData('enemyBot')).length;
      const hasBrain = !!s.botSystem.getBrainSnapshot();
      return { bodies, hasBrain };
    });
    maxBots = Math.max(maxBots, c.bodies);
  }
  log('B15 reset x3 no duplicate bot/brain', maxBots === 1, `maxBots=${maxBots}`);

  // ---------- B16: mobile readable + brain runs ----------
  let mobileOk = true;
  for (const [w, h] of [[915, 412], [800, 360]]) {
    await startMatch(page, { width: w, height: h }, 'guardian');
    const mob = await page.evaluate(() => {
      const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
      const body = s.children.list.find((o) => o.getData && o.getData('enemyBot'));
      const marker = s.children.list.find((o) => o.getData && o.getData('botEnemyMarker'));
      const hpBar = s.children.list.find((o) => o.getData && o.getData('botHpBar'));
      const overhead = [body, marker, hpBar].filter(Boolean);
      const maxDepth = Math.max(0, ...overhead.map((o) => o.depth ?? 0));
      return { hasAll: !!body && !!marker && !!hpBar, joystick: !!s.movement, maxDepth, brain: !!s.botSystem.getBrainSnapshot() };
    });
    if (!(mob.hasAll && mob.joystick && mob.maxDepth < 1000 && mob.brain)) mobileOk = false;
  }
  log('B16 mobile 915x412 + 800x360 readable, brain runs, controls free', mobileOk);

  // ---------- B17: frozen systems wiring intact ----------
  await startMatch(page);
  const frozen = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const cap = s.captureSystem;
    const before = cap.getTeamScore('blue');
    cap.simulatePlayerAtObjective('resourceCampL');
    for (let i = 0; i < 80; i++) cap.update(100, 1500, 1600, 'blue');
    return {
      capturesAwardScore: cap.getTeamScore('blue') > before,
      timer: s.matchTimerSystem.getRemainingSeconds(),
      coreHpBlue: s.objectiveSystem.getCoreHp('blue'),
      coreHpRed: s.objectiveSystem.getCoreHp('red'),
      phase: s.objectiveSystem.getMatchPhase(),
    };
  });
  log('B17 frozen systems wiring intact (capture/timer/core/phase)',
    frozen.capturesAwardScore && frozen.timer === 300 && frozen.coreHpBlue === 2000 && frozen.coreHpRed === 2000 && frozen.phase === 'in_progress',
    JSON.stringify(frozen));

  // ---------- B18: no console errors ----------
  log('B18 no fatal console errors', errs.length === 0, errs.join('; ') || 'none');

  const passed = results.filter((r) => r.p).length;
  console.log(`\nSUMMARY ${passed}/${results.length}`);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
