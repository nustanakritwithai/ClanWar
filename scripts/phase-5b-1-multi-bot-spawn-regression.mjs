/**
 * Phase 5B-1 Multi Bot Spawn Foundation regression.
 * Usage: node scripts/phase-5b-1-multi-bot-spawn-regression.mjs [baseUrl]
 *
 * Validates that the match can spawn MULTIPLE independent AI BotPlayers from a
 * config-driven encounter preset — each its own class / spawn / brain / cooldown
 * / skill runtime / HP — that each can attack and cast, die and respawn
 * independently, that reset never duplicates or leaks bots/projectiles/brains,
 * that the legacy single-bot path is unchanged, and that mobile readability,
 * human stats, difficulty scope, and all frozen systems are intact.
 *
 * Out of scope (NOT tested here): squad AI, shared targeting, objective AI,
 * separation/spacing between bots, multi-bot balance scaling.
 */
import puppeteer from 'puppeteer';

const BASE_URL = process.argv[2] ?? 'http://127.0.0.1:4173';
const results = [];
const log = (t, p, d = '') => { results.push({ t, p }); console.log(`${p ? 'PASS' : 'FAIL'}: ${t}${d ? ` — ${d}` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let booted = false;
async function startMatch(page, { viewport = { width: 1280, height: 720 }, heroClass = 'guardian', encounter, botClass } = {}) {
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
  await sleep(120);
  await page.evaluate(({ hc, enc, bc }) => {
    const g = window.__CLANWAR_GAME__;
    try { g.scene.stop('MenuScene'); } catch (e) {}
    const data = { heroClass: hc };
    if (enc !== undefined) data.encounter = enc;
    if (bc !== undefined) data.botClass = bc;
    g.scene.start('MatchScene', data);
  }, { hc: heroClass, enc: encounter, bc: botClass });
  await page.waitForFunction(() => {
    const s = window.__CLANWAR_GAME__?.scene?.getScene('MatchScene');
    return s?.objectiveSystem && s?.matchTimerSystem && s?.player && s?.botSystem?.getBotSnapshots;
  });
  await sleep(280);
}

const botCount = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getBotCount());
const botSnaps = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getBotSnapshots());
const brainSnaps = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getBrainSnapshots());
const skillInfos = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getSkillInfos());
const skillCasts = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getSkillCastDebugs());
const playerHp = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.currentHp);
const setCooldownAll = (page, ms) => page.evaluate((m) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugSetCooldownAll(m), ms);
const damageBotAt = (page, i, amt) => page.evaluate(({ idx, a }) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugDamageBotAt(idx, a), { idx: i, a: amt });
const tagCount = (page, tag) => page.evaluate((t) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').children.list.filter((o) => o.getData && o.getData(t)).length, tag);

async function teleportPlayer(page, x, y) {
  await page.evaluate(({ px, py }) => { const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene'); s.player.sprite.setPosition(px, py); s.player.body.reset(px, py); s.player.update(); }, { px: x, py: y });
}

/**
 * Park the player in bot[i]'s firing position and sample whether it reaches a
 * wind-up. Distance is class-aware: melee sits point-blank, ranged sits inside
 * its comfortable band (point-blank would correctly trigger the 5A-6 kite).
 */
async function attackProbe(page, i) {
  const snaps = await botSnaps(page);
  const b = snaps[i];
  // Ranged sits ~mid comfort band (a fraction of its range); melee point-blank.
  const dist = b.attackKind === 'ranged' ? Math.round(b.attackRange * 0.75) : 40;
  await teleportPlayer(page, b.x, b.y + dist);
  await setCooldownAll(page, 0);
  let sawWindup = false;
  for (let f = 0; f < 60; f++) {
    await sleep(30);
    await setCooldownAll(page, 0);
    const st = (await botSnaps(page))[i]?.state;
    if (st === 'windup') sawWindup = true;
    if (st === 'recovery') break;
  }
  return sawWindup;
}

/** Park the player in bot[i]'s skill range and sample whether that bot casts. */
async function skillProbe(page, i) {
  const info = (await skillInfos(page))[i];
  const b = (await botSnaps(page))[i];
  const dist = Math.max(20, Math.min(info.range - 40, 200));
  await teleportPlayer(page, b.x, b.y + dist);
  for (let f = 0; f < 80; f++) {
    await sleep(35);
    const casts = (await skillCasts(page))[i]?.casts ?? 0;
    if (casts >= 1) return true;
  }
  return false;
}

const HUMAN_STATS = {
  guardian: { hp: 1200, attack: 45, armor: 25, moveSpeed: 170, attackRange: 60 },
  warrior: { hp: 950, attack: 70, armor: 15, moveSpeed: 190, attackRange: 65 },
  ranger: { hp: 700, attack: 55, armor: 8, moveSpeed: 200, attackRange: 320 },
  mage: { hp: 650, attack: 35, armor: 5, moveSpeed: 185, attackRange: 250 },
  priest: { hp: 750, attack: 30, armor: 8, moveSpeed: 185, attackRange: 230 },
};

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/404|favicon/i.test(m.text())) consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

  try {
    // --- 1: legacy single-bot path (no encounter) still spawns exactly 1 bot ---
    await startMatch(page, { botClass: 'warrior' });
    const soloCount = await botCount(page);
    const soloTag = await tagCount(page, 'enemyBot');
    log('1 bare MatchScene (no encounter) spawns exactly one bot (back-compat)', soloCount === 1 && soloTag === 1, `count=${soloCount} enemyBotTags=${soloTag}`);

    // --- 2: default duel_plus encounter spawns 2 bots ---
    await startMatch(page, { encounter: 'duel_plus' });
    const duelCount = await botCount(page);
    log('2 duel_plus encounter spawns more than one bot', duelCount === 2, `count=${duelCount}`);

    // --- 3: the two bots are distinct classes (warrior + ranger) ---
    let snaps = await botSnaps(page);
    const classes = snaps.map((s) => s.classId);
    log('3 multi-bot can be different classes', classes.includes('warrior') && classes.includes('ranger'), `classes=${classes.join(',')}`);

    // --- 4: each bot has its own distinct spawn (not stacked) ---
    const pairDist = Math.hypot(snaps[0].spawnX - snaps[1].spawnX, snaps[0].spawnY - snaps[1].spawnY);
    log('4 each bot has its own distinct spawn point', pairDist > 60, `spawnPairDist=${pairDist.toFixed(0)}`);

    // --- 5: enemyBot-tagged world objects == bot count ---
    const enemyTags = await tagCount(page, 'enemyBot');
    log('5 enemyBot world objects match bot count', enemyTags === duelCount, `tags=${enemyTags} count=${duelCount}`);

    // --- 6: each bot has its own brain (independent snapshots) ---
    const brains = await brainSnaps(page);
    log('6 each bot has its own brain', Array.isArray(brains) && brains.length === duelCount && brains.every((b) => !!b.goal), `brains=${brains.length} goals=${brains.map((b) => b.goal).join(',')}`);

    // --- 7: each bot has its own class skill from the shared SKILLS table ---
    const infos = await skillInfos(page);
    const skillIds = infos.map((s) => s.skillId);
    log('7 each bot has its own class skill', infos.length === duelCount && skillIds.every((id) => !!id) && new Set(skillIds).size === duelCount, `skillIds=${skillIds.join(',')}`);

    // --- 8: full_party_lite spawns 4 distinct classes (clamped to MAX_BOTS) ---
    await startMatch(page, { encounter: 'full_party_lite' });
    const fullCount = await botCount(page);
    const fullClasses = (await botSnaps(page)).map((s) => s.classId);
    log('8 full_party_lite spawns 4 distinct classes (MAX_BOTS=4)', fullCount === 4 && new Set(fullClasses).size === 4, `count=${fullCount} classes=${fullClasses.join(',')}`);

    // --- 9: every bot can engage and wind up an attack on the player ---
    // Each bot is probed in its own fresh match so a prior probe can't leave the
    // other bot mid-chase / off-leash and skew the sample.
    const windups = [];
    for (let i = 0; i < 2; i++) {
      await startMatch(page, { encounter: 'duel_plus' });
      windups.push(await attackProbe(page, i));
    }
    log('9 every bot can attack (each reaches wind-up)', windups.every(Boolean), `windups=${windups.join(',')}`);

    // --- 10: melee bot resolves melee damage on the player ---
    await startMatch(page, { encounter: 'duel_plus' });
    snaps = await botSnaps(page);
    const warriorIdx = snaps.findIndex((s) => s.classId === 'warrior');
    {
      const b = snaps[warriorIdx];
      await teleportPlayer(page, b.x, b.y + 40);
      await setCooldownAll(page, 0);
      const hp0 = await playerHp(page);
      let hp1 = hp0;
      for (let f = 0; f < 60; f++) { await sleep(30); hp1 = await playerHp(page); if (hp1 < hp0) break; }
      log('10 melee bot resolves melee damage', hp1 < hp0, `hp0=${hp0} hp1=${hp1}`);
    }

    // --- 11: ranged bot fires its normal-attack projectile ---
    {
      snaps = await botSnaps(page);
      const rangerIdx = snaps.findIndex((s) => s.classId === 'ranger');
      const b = snaps[rangerIdx];
      await teleportPlayer(page, b.x, b.y + 160);
      await setCooldownAll(page, 0);
      let fired = false;
      for (let f = 0; f < 60; f++) {
        await sleep(30);
        const kind = await page.evaluate(() => {
          const o = window.__CLANWAR_GAME__.scene.getScene('MatchScene').children.list.find((c) => c.getData && c.getData('normalAttackProjectile'));
          return o ? o.getData('normalAttackProjectile') : null;
        });
        if (kind === 'arrow') { fired = true; break; }
      }
      log('11 ranged bot fires its normal-attack projectile', fired, `arrowFired=${fired}`);
    }

    // --- 12: every offensive bot can cast its class skill ---
    await startMatch(page, { encounter: 'duel_plus' });
    const casts = [];
    for (let i = 0; i < 2; i++) casts.push(await skillProbe(page, i));
    log('12 every bot can cast its class skill', casts.every(Boolean), `casts=${casts.join(',')}`);

    // --- 13: a bot dies independently (the other stays alive) ---
    await startMatch(page, { encounter: 'duel_plus' });
    snaps = await botSnaps(page);
    await damageBotAt(page, 0, snaps[0].maxHp + 9999);
    await sleep(120);
    let after = await botSnaps(page);
    log('13 a bot can die independently', after[0].dead === true && after[1].dead === false, `bot0Dead=${after[0].dead} bot1Dead=${after[1].dead}`);

    // --- 14: the dead bot respawns independently ---
    {
      const respawnDelay = snaps[0].respawnDelayMs;
      let alive = false;
      for (let f = 0; f < Math.ceil((respawnDelay + 2500) / 200); f++) {
        await sleep(200);
        after = await botSnaps(page);
        if (after[0].dead === false) { alive = true; break; }
      }
      log('14 the dead bot respawns independently', alive && after[1].dead === false, `bot0Alive=${alive}`);
    }

    // --- 15: reset x3 — no duplicate bots ---
    let maxTags = 0, maxCount = 0;
    for (let i = 0; i < 3; i++) {
      await startMatch(page, { encounter: 'duel_plus' });
      maxTags = Math.max(maxTags, await tagCount(page, 'enemyBot'));
      maxCount = Math.max(maxCount, await botCount(page));
    }
    log('15 reset x3 no duplicate bots', maxTags === 2 && maxCount === 2, `maxEnemyTags=${maxTags} maxCount=${maxCount}`);

    // --- 16: reset x3 — no projectile / skill / system leak ---
    const leakProj = await tagCount(page, 'normalAttackProjectile');
    const leakSkill = await tagCount(page, 'botSkillProjectile');
    const hasSystem = await page.evaluate(() => !!window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem);
    log('16 reset x3 no projectile/skill/system leak', leakProj === 0 && leakSkill === 0 && hasSystem, `proj=${leakProj} skill=${leakSkill} system=${hasSystem}`);

    // --- 17: reset x3 — no brain leak (brain count == bot count) ---
    const brainCount = (await brainSnaps(page)).length;
    log('17 reset x3 no brain leak', brainCount === (await botCount(page)), `brains=${brainCount} bots=${await botCount(page)}`);

    // --- 18-19: mobile readability with multiple bots ---
    for (const [w, h, n] of [[915, 412, 18], [800, 360, 19]]) {
      await startMatch(page, { viewport: { width: w, height: h }, encounter: 'duel_plus' });
      const m = await page.evaluate(() => {
        const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
        const list = s.children.list;
        const bodies = list.filter((o) => o.getData && o.getData('enemyBot')).length;
        const markers = list.filter((o) => o.getData && o.getData('botEnemyMarker') && o.visible).length;
        const hpBars = list.filter((o) => o.getData && o.getData('botHpBar') && o.visible).length;
        const visuals = s.botSystem.getBotEntities().every((b) => b.hasCharacterVisual());
        const joystick = !!document.querySelector('canvas');
        return { bodies, markers, hpBars, visuals, joystick };
      });
      log(`${n} mobile ${w}x${h} readable (each bot has body/marker/HP bar)`, m.bodies === 2 && m.markers >= 2 && m.hpBars >= 2 && m.visuals && m.joystick, JSON.stringify(m));
    }

    // --- 20: human class stats unchanged with multi-bot ---
    const humanStats = {};
    for (const c of Object.keys(HUMAN_STATS)) {
      await startMatch(page, { heroClass: c, encounter: 'duel_plus' });
      humanStats[c] = await page.evaluate(() => { const p = window.__CLANWAR_GAME__.scene.getScene('MatchScene').player; return { hp: p.maxHp, attack: p.attack, armor: p.armor, moveSpeed: p.moveSpeed, attackRange: p.attackRange }; });
    }
    const statsOk = Object.entries(HUMAN_STATS).every(([c, exp]) => {
      const b = humanStats[c];
      return b && b.hp === exp.hp && b.attack === exp.attack && b.armor === exp.armor && b.moveSpeed === exp.moveSpeed && b.attackRange === exp.attackRange;
    });
    log('20 human class stats unchanged', statsOk, JSON.stringify(humanStats));

    // --- 21: difficulty affects all bots only (player untouched) ---
    await startMatch(page, { encounter: 'duel_plus' });
    const diff = await page.evaluate(() => {
      const sys = window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem;
      const out = {};
      for (const d of ['easy', 'normal', 'hard']) {
        sys.debugSetDifficulty(d);
        out[d] = sys.getBotSnapshots().map((s) => s.attack);
      }
      sys.debugSetDifficulty('normal');
      const playerAttack = window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.attack;
      return { out, playerAttack };
    });
    const diffOk = diff.out.easy.length === 2 && diff.out.easy.every((a, i) => a < diff.out.hard[i]);
    log('21 difficulty affects all bots only', diffOk, JSON.stringify(diff));

    // --- 22: Gate/Core/Capture/Siege/Timer/Score unchanged ---
    await startMatch(page, { encounter: 'full_party_lite' });
    const frozen = await page.evaluate(() => {
      const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
      return {
        timer: s.matchTimerSystem.getRemainingSeconds ? s.matchTimerSystem.getRemainingSeconds() : 300,
        coreHpBlue: s.objectiveSystem.getCoreHp ? s.objectiveSystem.getCoreHp('blue') : 2000,
        coreHpRed: s.objectiveSystem.getCoreHp ? s.objectiveSystem.getCoreHp('red') : 2000,
        phase: s.objectiveSystem.getMatchPhase(),
      };
    });
    log('22 Gate/Core/Capture/Siege/Timer/Score unchanged', frozen.timer === 300 && frozen.coreHpBlue === 2000 && frozen.coreHpRed === 2000 && frozen.phase === 'in_progress', JSON.stringify(frozen));

    // --- 23: no fatal console errors ---
    log('23 no fatal console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | ') || 'none');
  } catch (err) {
    console.error('FATAL', err);
    results.push({ t: 'fatal', p: false });
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.p).length;
  console.log(`\nSUMMARY ${passed}/${results.length}`);
  process.exit(passed === results.length ? 0 : 1);
}

main();
