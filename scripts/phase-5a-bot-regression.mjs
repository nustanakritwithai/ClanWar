/**
 * Phase 5A-1 Basic Enemy Bot MVP regression.
 * Usage: node scripts/phase-5a-bot-regression.mjs [baseUrl]
 *
 * Boots once and restarts scenes in-page (same harness pattern as the Phase 4E
 * script — avoids the flaky networkidle0 re-navigation stall). Verifies the
 * single Red Warrior Bot: spawn, detection, chase, wind-up telegraph, melee
 * damage to player, player damage to bot, death, dead-bot silence, no-duplicate
 * reset, mobile readability, and that frozen systems are untouched.
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
    return s?.objectiveSystem && s?.matchTimerSystem && s?.player && s?.botSystem;
  });
  await sleep(300);
}

/** Move the player body (and visual) to a world point — physics-safe teleport. */
async function teleportPlayer(page, x, y) {
  await page.evaluate(({ px, py }) => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.player.sprite.setPosition(px, py);
    s.player.body.reset(px, py);
    s.player.update();
  }, { px: x, py: y });
}

const botSnap = (page) =>
  page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getBotSnapshot());

/** Advance the match update loop ~ms of real time while keeping the player parked. */
async function advance(page, ms) {
  await sleep(ms);
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/404|favicon/i.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));

  // ---------- R1: bot spawns once ----------
  await startMatch(page);
  const spawn = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const bodies = s.children.list.filter((o) => o.getData && o.getData('enemyBot'));
    return { bodies: bodies.length, hasSystem: !!s.botSystem };
  });
  log('R1 bot spawns exactly once', spawn.bodies === 1 && spawn.hasSystem, JSON.stringify(spawn));

  // ---------- R2: bot has HP + config stats ----------
  const s2 = await botSnap(page);
  log('R2 bot has HP and config armor/attack', s2.hp > 0 && s2.hp === s2.maxHp && s2.armor > 0 && s2.attack > 0,
    JSON.stringify({ hp: s2.hp, maxHp: s2.maxHp, armor: s2.armor, attack: s2.attack }));

  // ---------- R3: enemy marker / red readability ----------
  const read = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const body = s.children.list.find((o) => o.getData && o.getData('enemyBot'));
    const marker = s.children.list.some((o) => o.getData && o.getData('botEnemyMarker'));
    const hpBar = s.children.list.some((o) => o.getData && o.getData('botHpBar'));
    // 0xdc2626 red family — high red channel, low green/blue.
    const c = body?.fillColor ?? 0;
    const r = (c >> 16) & 0xff, g = (c >> 8) & 0xff, b = c & 0xff;
    return { marker, hpBar, r, g, b, redDominant: r > 150 && r > g + 60 && r > b + 60 };
  });
  log('R3 bot has enemy marker + red readability', read.marker && read.hpBar && read.redDominant, JSON.stringify(read));

  // ---------- R4: idle -> chase on detection ----------
  await startMatch(page);
  const idleState = (await botSnap(page)).state;
  const near = await botSnap(page);
  // Park player just inside detection range, directly below the bot.
  await teleportPlayer(page, near.x, near.y + near.detectionRange - 40);
  await advance(page, 250);
  const chaseState = (await botSnap(page)).state;
  log('R4 bot detects player (idle -> chase)', chaseState === 'chase' || chaseState === 'windup' || chaseState === 'recovery',
    `idle=${idleState} after=${chaseState}`);

  // ---------- R5: bot chases (moves toward player) ----------
  await startMatch(page);
  let b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + b.detectionRange - 40);
  const beforeChase = await botSnap(page);
  await advance(page, 500);
  const afterChase = await botSnap(page);
  const movedToward = afterChase.y > beforeChase.y - 2 && Math.hypot(afterChase.x - beforeChase.x, afterChase.y - beforeChase.y) > 8;
  log('R5 bot chases player (position moves toward)', movedToward,
    JSON.stringify({ from: [beforeChase.x.toFixed(0), beforeChase.y.toFixed(0)], to: [afterChase.x.toFixed(0), afterChase.y.toFixed(0)] }));

  // ---------- R6: bot stops within attack range ----------
  await startMatch(page);
  b = await botSnap(page);
  // Park player just inside attack range so the bot should hold position.
  await teleportPlayer(page, b.x, b.y + b.attackRange - 12);
  await advance(page, 300);
  const stopState = await botSnap(page);
  log('R6 bot stops in attack range', stopState.speed < 30 && ['chase', 'windup', 'attack', 'recovery'].includes(stopState.state),
    JSON.stringify({ state: stopState.state, speed: stopState.speed.toFixed(1) }));

  // ---------- R7: wind-up telegraph before any hit ----------
  await startMatch(page);
  b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + b.attackRange - 12);
  // Sample states until a wind-up telegraph is observed before damage.
  let sawWindup = false;
  let warningVisible = false;
  for (let i = 0; i < 16; i++) {
    await sleep(60);
    const snap = await botSnap(page);
    if (snap.state === 'windup') {
      sawWindup = true;
      warningVisible = await page.evaluate(() => {
        const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
        const w = s.children.list.find((o) => o.getData && o.getData('botAttackWarning'));
        return !!w && w.visible === true;
      });
      break;
    }
  }
  log('R7 bot shows wind-up telegraph before hit', sawWindup && warningVisible, JSON.stringify({ sawWindup, warningVisible }));

  // ---------- R8: bot damages player only after wind-up ----------
  await startMatch(page);
  b = await botSnap(page);
  const hpStart = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.currentHp);
  await teleportPlayer(page, b.x, b.y + b.attackRange - 12);
  // During the first wind-up window the player should not yet have lost HP.
  let hpDuringWindup = hpStart;
  for (let i = 0; i < 16; i++) {
    await sleep(50);
    const snap = await botSnap(page);
    if (snap.state === 'windup') {
      hpDuringWindup = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.currentHp);
      break;
    }
  }
  await advance(page, 900); // let the swing resolve
  const hpAfter = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.currentHp);
  log('R8 bot damages player after wind-up (HP drops)', hpAfter < hpStart && hpDuringWindup === hpStart,
    JSON.stringify({ hpStart, hpDuringWindup, hpAfter }));

  // ---------- R9: player avoids hit by leaving range during wind-up ----------
  await startMatch(page);
  b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + b.attackRange - 12);
  const hpBeforeDodge = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.currentHp);
  // Wait for wind-up, then teleport the player far away before it resolves.
  let dodged = false;
  for (let i = 0; i < 16; i++) {
    await sleep(45);
    const snap = await botSnap(page);
    if (snap.state === 'windup') {
      await teleportPlayer(page, b.x + 900, b.y + 900); // sprint out of range
      dodged = true;
      break;
    }
  }
  await advance(page, 800);
  const hpAfterDodge = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.currentHp);
  log('R9 player avoids hit by leaving range during wind-up', dodged && hpAfterDodge === hpBeforeDodge,
    JSON.stringify({ dodged, hpBeforeDodge, hpAfterDodge }));

  // ---------- R10: bot respects cooldown + recovery between swings ----------
  await startMatch(page);
  b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + b.attackRange - 12);
  const hits = [];
  let lastHp = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.currentHp);
  const tStart = Date.now();
  while (Date.now() - tStart < 2600) {
    await sleep(60);
    const hp = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.currentHp);
    if (hp < lastHp) { hits.push(Date.now() - tStart); lastHp = hp; }
  }
  const gapOk = hits.length >= 2 ? (hits[1] - hits[0]) >= 1200 : hits.length === 1;
  log('R10 bot respects cooldown/recovery between swings', hits.length >= 1 && gapOk,
    JSON.stringify({ hits, count: hits.length }));

  // ---------- R11: player damages bot ----------
  await startMatch(page);
  b = await botSnap(page);
  const botHpBefore = b.hp;
  // Default player facing is +x (right); park just left of the bot so the swing
  // arc covers it without needing to change facing.
  await teleportPlayer(page, b.x - 40, b.y);
  await page.keyboard.down('j'); await sleep(40); await page.keyboard.up('j');
  await sleep(120);
  const botHpAfter = (await botSnap(page)).hp;
  log('R11 player damages bot (bot HP drops)', botHpAfter < botHpBefore, JSON.stringify({ botHpBefore, botHpAfter }));

  // ---------- R12 + R13: bot dies at 0 HP, dead bot stops attacking ----------
  await startMatch(page);
  b = await botSnap(page);
  // Kill via debug damage hook (headless, not player-facing).
  await page.evaluate((hp) => {
    window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugDamageBot(hp + 1000);
  }, b.maxHp);
  const dead = await botSnap(page);
  log('R12 bot dies at 0 HP', dead.dead === true && dead.hp === 0 && dead.state === 'dead', JSON.stringify({ hp: dead.hp, state: dead.state }));

  // Park player in melee range of the corpse and confirm no further damage.
  const hpBeforeCorpse = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.currentHp);
  await teleportPlayer(page, dead.x, dead.y + dead.attackRange - 12);
  await advance(page, 1500);
  const hpAfterCorpse = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.currentHp);
  const stillDead = await botSnap(page);
  log('R13 dead bot stops attacking', hpAfterCorpse === hpBeforeCorpse && stillDead.dead === true,
    JSON.stringify({ hpBeforeCorpse, hpAfterCorpse, state: stillDead.state }));

  // ---------- R14: reset MatchScene x3 — no duplicate bot ----------
  let maxBots = 0;
  for (let i = 0; i < 3; i++) {
    await startMatch(page);
    const count = await page.evaluate(() =>
      window.__CLANWAR_GAME__.scene.getScene('MatchScene').children.list.filter((o) => o.getData && o.getData('enemyBot')).length);
    maxBots = Math.max(maxBots, count);
  }
  log('R14 Menu<->Match x3 no duplicate bot', maxBots === 1, `maxBots=${maxBots}`);

  // ---------- R15 + R16: mobile readability ----------
  for (const [w, h, id] of [[915, 412, 'R15'], [800, 360, 'R16']]) {
    await startMatch(page, { width: w, height: h }, 'guardian');
    const mob = await page.evaluate(() => {
      const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
      const body = s.children.list.find((o) => o.getData && o.getData('enemyBot'));
      const marker = s.children.list.find((o) => o.getData && o.getData('botEnemyMarker'));
      const hpBar = s.children.list.find((o) => o.getData && o.getData('botHpBar'));
      const joystick = !!s.movement;
      const overhead = [body, marker, hpBar].filter(Boolean);
      const maxDepth = Math.max(0, ...overhead.map((o) => o.depth ?? 0));
      return { hasBody: !!body, hasMarker: !!marker, hasHpBar: !!hpBar, joystick, maxDepth };
    });
    log(`${id} mobile ${w}x${h} bot readable + below HUD`,
      mob.hasBody && mob.hasMarker && mob.hasHpBar && mob.joystick && mob.maxDepth < 1000, JSON.stringify(mob));
  }

  // ---------- R17: frozen systems wiring intact (Gate/Core/Capture/SiegeBuff/Timer/Score) ----------
  // Lightweight wiring smoke check only — the authoritative numeric freeze is
  // proven by the dedicated 4C-A/4C-B/4C-C/4D/4E suites re-run alongside this.
  await startMatch(page);
  const frozen = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const cap = s.captureSystem;
    const scoreBefore = cap.getTeamScore('blue');
    cap.simulatePlayerAtObjective('resourceCampL');
    for (let i = 0; i < 80; i++) cap.update(100, 1500, 1600, 'blue');
    return {
      capturesAwardScore: cap.getTeamScore('blue') > scoreBefore,
      siegeInactiveBonus: s.siegeBuffSystem.getGateBonusMultiplier('red'),
      siegeActiveBonus: Math.round(s.siegeBuffSystem.getGateBonusMultiplier('blue') * 100),
      timer: s.matchTimerSystem.getRemainingSeconds(),
      coreHpBlue: s.objectiveSystem.getCoreHp('blue'),
      coreHpRed: s.objectiveSystem.getCoreHp('red'),
      phase: s.objectiveSystem.getMatchPhase(),
    };
  });
  log('R17 frozen systems wiring intact (capture/siege/timer/core/phase)',
    frozen.capturesAwardScore && frozen.siegeInactiveBonus === 0 && frozen.timer === 300 &&
    frozen.coreHpBlue === 2000 && frozen.coreHpRed === 2000 && frozen.phase === 'in_progress',
    JSON.stringify(frozen));

  // ---------- console errors ----------
  log('No fatal console errors', errs.length === 0, errs.join('; ') || 'none');

  const passed = results.filter((r) => r.p).length;
  console.log(`\nSUMMARY ${passed}/${results.length}`);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
