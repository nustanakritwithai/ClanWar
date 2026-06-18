/**
 * Phase 5A-1 / 5A-2 Basic Enemy Bot regression.
 * Usage: node scripts/phase-5a-bot-regression.mjs [baseUrl]
 *
 * Boots once and restarts scenes in-page (same harness pattern as the Phase 4E
 * script — avoids the flaky networkidle0 re-navigation stall). Verifies the
 * single Red Warrior Bot: spawn, idle patrol, detection, chase, wind-up
 * telegraph, melee damage to player, player damage to bot, death, dead-bot
 * silence, respawn (delay/HP/visuals/no-duplicate), difficulty config, mobile
 * readability, and that frozen systems are untouched.
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
const playerHp = (page) =>
  page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.currentHp);
const botBodies = (page) =>
  page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').children.list.filter((o) => o.getData && o.getData('enemyBot')).length);

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
    return { bodies: s.children.list.filter((o) => o.getData && o.getData('enemyBot')).length, hasSystem: !!s.botSystem };
  });
  log('R1 bot spawns exactly once', spawn.bodies === 1 && spawn.hasSystem, JSON.stringify(spawn));

  // ---------- R2: bot patrols while idle ----------
  await startMatch(page);
  // Park player far away so the bot stays idle and patrols.
  await teleportPlayer(page, 300, 300);
  const start = await botSnap(page);
  let maxDisp = 0;
  let maxSpawnDist = 0;
  for (let i = 0; i < 16; i++) {
    await sleep(150);
    const sn = await botSnap(page);
    maxDisp = Math.max(maxDisp, Math.hypot(sn.x - start.x, sn.y - start.y));
    maxSpawnDist = Math.max(maxSpawnDist, Math.hypot(sn.x - sn.spawnX, sn.y - sn.spawnY));
  }
  log('R2 bot patrols while idle (moves but stays near spawn)',
    maxDisp > 10 && maxSpawnDist < 200, JSON.stringify({ maxDisp: maxDisp.toFixed(0), maxSpawnDist: maxSpawnDist.toFixed(0) }));

  // ---------- R3: idle/patrol -> chase on detection ----------
  let b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + b.detectionRange - 40);
  await sleep(250);
  const chaseState = (await botSnap(page)).state;
  log('R3 bot enters chase when player detected',
    ['chase', 'windup', 'attack', 'recovery'].includes(chaseState), `state=${chaseState}`);

  // ---------- R4: bot stops within attack range ----------
  await startMatch(page);
  b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + b.attackRange - 12);
  await sleep(300);
  const stopState = await botSnap(page);
  log('R4 bot stops in attack range', stopState.speed < 30 && ['chase', 'windup', 'attack', 'recovery'].includes(stopState.state),
    JSON.stringify({ state: stopState.state, speed: stopState.speed.toFixed(1) }));

  // ---------- R5: wind-up telegraph before any hit ----------
  await startMatch(page);
  b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + b.attackRange - 12);
  let sawWindup = false, warningVisible = false;
  for (let i = 0; i < 16; i++) {
    await sleep(60);
    if ((await botSnap(page)).state === 'windup') {
      sawWindup = true;
      warningVisible = await page.evaluate(() => {
        const w = window.__CLANWAR_GAME__.scene.getScene('MatchScene').children.list.find((o) => o.getData && o.getData('botAttackWarning'));
        return !!w && w.visible === true;
      });
      break;
    }
  }
  log('R5 bot shows wind-up telegraph before hit', sawWindup && warningVisible, JSON.stringify({ sawWindup, warningVisible }));

  // ---------- R6: player avoids hit by leaving range during wind-up ----------
  await startMatch(page);
  b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + b.attackRange - 12);
  const hpBeforeDodge = await playerHp(page);
  let dodged = false;
  for (let i = 0; i < 16; i++) {
    await sleep(45);
    if ((await botSnap(page)).state === 'windup') {
      await teleportPlayer(page, b.x + 900, b.y + 900);
      dodged = true;
      break;
    }
  }
  await sleep(800);
  const hpAfterDodge = await playerHp(page);
  log('R6 player avoids hit by leaving range during wind-up', dodged && hpAfterDodge === hpBeforeDodge,
    JSON.stringify({ dodged, hpBeforeDodge, hpAfterDodge }));

  // ---------- R7: bot damages player after wind-up ----------
  await startMatch(page);
  b = await botSnap(page);
  const hpStart = await playerHp(page);
  await teleportPlayer(page, b.x, b.y + b.attackRange - 12);
  let hpDuringWindup = hpStart;
  for (let i = 0; i < 16; i++) {
    await sleep(50);
    if ((await botSnap(page)).state === 'windup') { hpDuringWindup = await playerHp(page); break; }
  }
  await sleep(900);
  const hpAfter = await playerHp(page);
  log('R7 bot damages player after wind-up (HP drops)', hpAfter < hpStart && hpDuringWindup === hpStart,
    JSON.stringify({ hpStart, hpDuringWindup, hpAfter }));

  // ---------- R8: player damages bot ----------
  await startMatch(page);
  b = await botSnap(page);
  const botHpBefore = b.hp;
  await teleportPlayer(page, b.x - 40, b.y);
  await page.keyboard.down('j'); await sleep(40); await page.keyboard.up('j');
  await sleep(120);
  const botHpAfter = (await botSnap(page)).hp;
  log('R8 player damages bot (bot HP drops)', botHpAfter < botHpBefore, JSON.stringify({ botHpBefore, botHpAfter }));

  // ---------- R9 + R10: bot dies at 0 HP, dead bot does not attack ----------
  await startMatch(page);
  b = await botSnap(page);
  await page.evaluate((hp) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugDamageBot(hp + 1000), b.maxHp);
  const dead = await botSnap(page);
  log('R9 bot dies at 0 HP', dead.dead === true && dead.hp === 0 && dead.state === 'dead', JSON.stringify({ hp: dead.hp, state: dead.state }));

  const hpBeforeCorpse = await playerHp(page);
  await teleportPlayer(page, dead.x, dead.y + dead.attackRange - 12);
  await sleep(1500);
  const hpAfterCorpse = await playerHp(page);
  log('R10 dead bot does not attack', hpAfterCorpse === hpBeforeCorpse && (await botSnap(page)).dead === true,
    JSON.stringify({ hpBeforeCorpse, hpAfterCorpse }));

  // ---------- R11 + R12 + R13 + R14: respawn after delay / HP / visuals / no duplicate ----------
  await startMatch(page);
  b = await botSnap(page);
  const respawnDelay = b.respawnDelayMs;
  // Keep player far so the respawned bot does not immediately take damage.
  await teleportPlayer(page, 300, 300);
  await page.evaluate((hp) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugDamageBot(hp + 1000), b.maxHp);
  const deadNow = (await botSnap(page)).dead;
  // Just before the delay elapses it should still be dead.
  await sleep(Math.max(0, respawnDelay - 800));
  const stillDead = (await botSnap(page)).dead;
  // After the delay (+buffer) it should be alive again.
  await sleep(1400);
  const after = await botSnap(page);
  const vis = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const body = s.children.list.find((o) => o.getData && o.getData('enemyBot'));
    const marker = s.children.list.find((o) => o.getData && o.getData('botEnemyMarker'));
    const hpBar = s.children.list.find((o) => o.getData && o.getData('botHpBar'));
    return { bodyVisible: !!body && body.visible, markerVisible: !!marker && marker.visible, hpBarVisible: !!hpBar && hpBar.visible };
  });
  log('R11 bot respawns after configured delay', deadNow === true && stillDead === true && after.dead === false,
    JSON.stringify({ deadNow, stillDead, aliveAfter: !after.dead, respawnDelay }));
  log('R12 respawn restores HP', after.hp === after.maxHp, JSON.stringify({ hp: after.hp, maxHp: after.maxHp }));
  log('R13 respawn restores visuals / marker / HP bar',
    vis.bodyVisible && vis.markerVisible && vis.hpBarVisible, JSON.stringify(vis));
  log('R14 respawn does not duplicate bot', (await botBodies(page)) === 1, `bodies=${await botBodies(page)}`);

  // ---------- R15: Menu <-> Match reset x3 — no duplicate bot ----------
  let maxBots = 0;
  for (let i = 0; i < 3; i++) {
    await startMatch(page);
    maxBots = Math.max(maxBots, await botBodies(page));
  }
  log('R15 Menu<->Match x3 no duplicate bot', maxBots === 1, `maxBots=${maxBots}`);

  // ---------- R16: easy/normal/hard config exists and does not mutate player stats ----------
  await startMatch(page, { width: 1280, height: 720 }, 'guardian');
  const diff = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const p = s.player;
    const playerBefore = { attack: p.attack, maxHp: p.maxHp, moveSpeed: p.moveSpeed, attackRange: p.attackRange };
    const info = s.botSystem.getDifficultyInfo();
    const eff = {};
    const playerAfter = [];
    for (const d of ['easy', 'normal', 'hard']) {
      s.botSystem.debugSetDifficulty(d);
      eff[d] = s.botSystem.getDifficultyInfo().effectiveAttack;
      playerAfter.push({ attack: p.attack, maxHp: p.maxHp, moveSpeed: p.moveSpeed, attackRange: p.attackRange });
    }
    s.botSystem.debugSetDifficulty('normal');
    const playerUnchanged = playerAfter.every((pa) =>
      pa.attack === playerBefore.attack && pa.maxHp === playerBefore.maxHp &&
      pa.moveSpeed === playerBefore.moveSpeed && pa.attackRange === playerBefore.attackRange);
    return { available: info.available, defaultDifficulty: info.difficulty, eff, playerBefore, playerUnchanged };
  });
  const hasAll = ['easy', 'normal', 'hard'].every((d) => diff.available.includes(d));
  const scales = diff.eff.easy < diff.eff.normal && diff.eff.normal < diff.eff.hard;
  log('R16 easy/normal/hard config exists + no player mutation',
    hasAll && scales && diff.defaultDifficulty === 'normal' && diff.playerUnchanged, JSON.stringify(diff));

  // ---------- R17 + R18: mobile readability ----------
  for (const [w, h, id] of [[915, 412, 'R17'], [800, 360, 'R18']]) {
    await startMatch(page, { width: w, height: h }, 'guardian');
    const mob = await page.evaluate(() => {
      const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
      const body = s.children.list.find((o) => o.getData && o.getData('enemyBot'));
      const marker = s.children.list.find((o) => o.getData && o.getData('botEnemyMarker'));
      const hpBar = s.children.list.find((o) => o.getData && o.getData('botHpBar'));
      const overhead = [body, marker, hpBar].filter(Boolean);
      const maxDepth = Math.max(0, ...overhead.map((o) => o.depth ?? 0));
      return { hasBody: !!body, hasMarker: !!marker, hasHpBar: !!hpBar, joystick: !!s.movement, maxDepth };
    });
    log(`${id} mobile ${w}x${h} bot readable + below HUD`,
      mob.hasBody && mob.hasMarker && mob.hasHpBar && mob.joystick && mob.maxDepth < 1000, JSON.stringify(mob));
  }

  // ---------- R19: frozen systems wiring intact (Gate/Core/Capture/SiegeBuff/Timer/Score) ----------
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
      timer: s.matchTimerSystem.getRemainingSeconds(),
      coreHpBlue: s.objectiveSystem.getCoreHp('blue'),
      coreHpRed: s.objectiveSystem.getCoreHp('red'),
      phase: s.objectiveSystem.getMatchPhase(),
    };
  });
  log('R19 frozen systems wiring intact (capture/siege/timer/core/phase)',
    frozen.capturesAwardScore && frozen.siegeInactiveBonus === 0 && frozen.timer === 300 &&
    frozen.coreHpBlue === 2000 && frozen.coreHpRed === 2000 && frozen.phase === 'in_progress',
    JSON.stringify(frozen));

  // ---------- R20: no console errors ----------
  log('R20 no fatal console errors', errs.length === 0, errs.join('; ') || 'none');

  const passed = results.filter((r) => r.p).length;
  console.log(`\nSUMMARY ${passed}/${results.length}`);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
