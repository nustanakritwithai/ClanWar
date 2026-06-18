/**
 * Phase 5A-4 BotPlayer Class Parity regression.
 * Usage: node scripts/phase-5a-bot-player-parity-regression.mjs [baseUrl]
 *
 * Verifies the enemy is now an AI-controlled *player* (BotPlayer) that uses real
 * Warrior class data — class identity, class-derived stat baseline, bot-only
 * difficulty multipliers, human stats untouched, Warrior sprite + enemy red
 * treatment, shared melee attack, preserved brain/patrol/respawn, no duplicate,
 * mobile readability, and frozen systems intact.
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
const goalOf = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getBrainSnapshot().goal);
const botBodies = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').children.list.filter((o) => o.getData && o.getData('enemyBot')).length);

// Warrior class baseline from heroes.ts (source of truth for the assertions).
const WARRIOR = { hp: 950, attack: 70, armor: 15, moveSpeed: 190, attackRange: 65 };
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
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/404|favicon/i.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));

  // ---------- T1: BotPlayer exists in runtime ----------
  await startMatch(page);
  const exists = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    return { hasSystem: !!s.botSystem, bodies: s.children.list.filter((o) => o.getData && o.getData('enemyBot')).length };
  });
  log('T1 BotPlayer exists / used in runtime', exists.hasSystem && exists.bodies === 1, JSON.stringify(exists));

  // ---------- T2: classId = warrior ----------
  const snap = await botSnap(page);
  log('T2 BotPlayer classId = warrior', snap.classId === 'warrior', `classId=${snap.classId}`);

  // ---------- T3: baseline derives from Warrior class data ----------
  const baseline = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getClassBaseline());
  log('T3 BotPlayer baseline derives from Warrior class data',
    baseline.hp === WARRIOR.hp && baseline.attack === WARRIOR.attack && baseline.armor === WARRIOR.armor &&
    baseline.moveSpeed === WARRIOR.moveSpeed && baseline.attackRange === WARRIOR.attackRange &&
    snap.armor === WARRIOR.armor && snap.attackRange === WARRIOR.attackRange,
    JSON.stringify({ baseline, botArmor: snap.armor, botRange: snap.attackRange }));

  // ---------- T4: difficulty multiplier affects bot only ----------
  const diff = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const eff = {};
    for (const d of ['easy', 'normal', 'hard']) { s.botSystem.debugSetDifficulty(d); eff[d] = s.botSystem.getDifficultyInfo().effectiveAttack; }
    s.botSystem.debugSetDifficulty('normal');
    return { eff, base: s.botSystem.getDifficultyInfo().baseAttack };
  });
  log('T4 difficulty multiplier affects bot only',
    diff.eff.easy < diff.eff.normal && diff.eff.normal < diff.eff.hard && diff.base === WARRIOR.attack,
    JSON.stringify(diff));

  // ---------- T5: human class stats unchanged (all 5) ----------
  const human = await page.evaluate((classes) => {
    const out = {};
    for (const c of classes) {
      const g = window.__CLANWAR_GAME__;
      g.scene.stop('MatchScene'); g.scene.start('MatchScene', { heroClass: c });
      out[c] = null; // placeholder; filled below after scene ready
    }
    return out;
  }, Object.keys(HUMAN_STATS)).catch(() => ({}));
  // Read each class freshly by starting a match as that class.
  const humanStats = {};
  for (const c of Object.keys(HUMAN_STATS)) {
    await startMatch(page, { width: 1280, height: 720 }, c);
    humanStats[c] = await page.evaluate(() => {
      const p = window.__CLANWAR_GAME__.scene.getScene('MatchScene').player;
      return { hp: p.maxHp, attack: p.attack, armor: p.armor, moveSpeed: p.moveSpeed, attackRange: p.attackRange };
    });
  }
  const humanUnchanged = Object.keys(HUMAN_STATS).every((c) => {
    const a = humanStats[c], b = HUMAN_STATS[c];
    return a && a.hp === b.hp && a.attack === b.attack && a.armor === b.armor && a.moveSpeed === b.moveSpeed && a.attackRange === b.attackRange;
  });
  log('T5 human Guardian/Warrior/Ranger/Mage/Priest stats unchanged', humanUnchanged, JSON.stringify(humanStats));

  // ---------- T6: BotPlayer uses Warrior visual identity ----------
  await startMatch(page);
  const visual = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const bot = s.botSystem.bot;
    const key = bot.getCharacterVisualTextureKey ? bot.getCharacterVisualTextureKey() : undefined;
    const visSprite = s.children.list.find((o) => o.getData && o.getData('botClassVisual'));
    return { key, hasVisual: bot.hasCharacterVisual ? bot.hasCharacterVisual() : false, visTint: visSprite ? visSprite.tintTopLeft : null };
  });
  log('T6 BotPlayer uses Warrior visual identity',
    visual.key === 'phase4e_theme1_char_warrior_idle' && visual.hasVisual === true,
    JSON.stringify({ key: visual.key, hasVisual: visual.hasVisual }));

  // ---------- T7: enemy red treatment / marker / ring ----------
  const treat = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const body = s.children.list.find((o) => o.getData && o.getData('enemyBot'));
    const marker = s.children.list.some((o) => o.getData && o.getData('botEnemyMarker'));
    const hpBar = s.children.list.some((o) => o.getData && o.getData('botHpBar'));
    const visSprite = s.children.list.find((o) => o.getData && o.getData('botClassVisual'));
    const c = visSprite ? visSprite.tintTopLeft : (body ? body.fillColor : 0);
    const r = (c >> 16) & 0xff, g = (c >> 8) & 0xff, b = c & 0xff;
    return { marker, hpBar, redDominant: r > 150 && r > g + 60 && r > b + 60, r, g, b };
  });
  log('T7 BotPlayer enemy red treatment + marker + ring', treat.marker && treat.hpBar && treat.redDominant, JSON.stringify(treat));

  // ---------- T8: normal attack remains melee warrior-style (damages player after wind-up) ----------
  let b = await botSnap(page);
  const hpStart = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.currentHp);
  await teleportPlayer(page, b.x, b.y + b.attackRange - 14);
  let hpDuringWindup = hpStart;
  for (let i = 0; i < 16; i++) { await sleep(50); if ((await botSnap(page)).state === 'windup') { hpDuringWindup = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.currentHp); break; } }
  await sleep(900);
  const hpAfter = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.currentHp);
  log('T8 normal attack is melee warrior-style (damage after wind-up)', hpAfter < hpStart && hpDuringWindup === hpStart, JSON.stringify({ hpStart, hpDuringWindup, hpAfter }));

  // ---------- T9: BotBrain still selects chase / attack / investigate ----------
  await startMatch(page);
  b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + b.detectionRange - 60);
  await sleep(180);
  const chaseG = await goalOf(page);
  await teleportPlayer(page, b.x, b.y + b.attackRange - 14);
  let attackG = '';
  for (let i = 0; i < 12; i++) { await sleep(50); if ((await goalOf(page)) === 'attack_player') { attackG = 'attack_player'; break; } }
  // Seed memory then yank player out → investigate.
  await startMatch(page); b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + b.detectionRange - 60); await sleep(200);
  await teleportPlayer(page, b.x + 2000, b.y + 2000); await sleep(200);
  const investigateG = await goalOf(page);
  log('T9 BotBrain selects chase/attack/investigate',
    chaseG === 'chase_player' && attackG === 'attack_player' && investigateG === 'investigate_last_seen',
    JSON.stringify({ chaseG, attackG, investigateG }));

  // ---------- T10: patrol still works ----------
  await startMatch(page);
  await teleportPlayer(page, 300, 300);
  const startP = await botSnap(page);
  let maxDisp = 0, maxSpawnDist = 0;
  for (let i = 0; i < 14; i++) { await sleep(150); const sn = await botSnap(page); maxDisp = Math.max(maxDisp, Math.hypot(sn.x - startP.x, sn.y - startP.y)); maxSpawnDist = Math.max(maxSpawnDist, Math.hypot(sn.x - sn.spawnX, sn.y - sn.spawnY)); }
  log('T10 BotPlayer patrol still works', maxDisp > 10 && maxSpawnDist < 220, JSON.stringify({ maxDisp: maxDisp.toFixed(0), maxSpawnDist: maxSpawnDist.toFixed(0) }));

  // ---------- T11 + T12: respawn works + clears state safely ----------
  await startMatch(page);
  b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + b.detectionRange - 60); await sleep(200); // seed memory
  await teleportPlayer(page, 300, 300);
  await page.evaluate((hp) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugDamageBot(hp + 1000), b.maxHp);
  const deadNow = (await botSnap(page)).dead;
  await sleep(b.respawnDelayMs + 1400);
  const after = await botSnap(page);
  const mem = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getBrainSnapshot().memory.lastSeenPlayerX);
  log('T11 BotPlayer respawn works', deadNow === true && after.dead === false && after.hp === after.maxHp, JSON.stringify({ deadNow, alive: !after.dead, hp: after.hp }));
  log('T12 respawn clears state safely', mem === null && (await goalOf(page)) === 'patrol_area', JSON.stringify({ mem, goal: await goalOf(page) }));

  // ---------- T13: reset MatchScene x3 no duplicate BotPlayer ----------
  let maxBots = 0;
  for (let i = 0; i < 3; i++) { await startMatch(page); maxBots = Math.max(maxBots, await botBodies(page)); }
  log('T13 reset x3 no duplicate BotPlayer', maxBots === 1, `maxBots=${maxBots}`);

  // ---------- T14 + T15: mobile readable, controls not blocked ----------
  for (const [w, h, id] of [[915, 412, 'T14'], [800, 360, 'T15']]) {
    await startMatch(page, { width: w, height: h }, 'guardian');
    const mob = await page.evaluate(() => {
      const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
      const body = s.children.list.find((o) => o.getData && o.getData('enemyBot'));
      const marker = s.children.list.find((o) => o.getData && o.getData('botEnemyMarker'));
      const hpBar = s.children.list.find((o) => o.getData && o.getData('botHpBar'));
      const vis = s.children.list.find((o) => o.getData && o.getData('botClassVisual'));
      const overhead = [body, marker, hpBar, vis].filter(Boolean);
      const maxDepth = Math.max(0, ...overhead.map((o) => o.depth ?? 0));
      return { hasBody: !!body, hasMarker: !!marker, hasHpBar: !!hpBar, hasVisual: !!vis, joystick: !!s.movement, maxDepth };
    });
    log(`${id} mobile ${w}x${h} readable + controls free`,
      mob.hasBody && mob.hasMarker && mob.hasHpBar && mob.joystick && mob.maxDepth < 1000, JSON.stringify(mob));
  }

  // ---------- T16: frozen systems wiring intact ----------
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
  log('T16 frozen systems wiring intact (capture/timer/core/phase)',
    frozen.capturesAwardScore && frozen.timer === 300 && frozen.coreHpBlue === 2000 && frozen.coreHpRed === 2000 && frozen.phase === 'in_progress',
    JSON.stringify(frozen));

  // ---------- T17: no console errors ----------
  log('T17 no fatal console errors', errs.length === 0, errs.join('; ') || 'none');

  const passed = results.filter((r) => r.p).length;
  console.log(`\nSUMMARY ${passed}/${results.length}`);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
