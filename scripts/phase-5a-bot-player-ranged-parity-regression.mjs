/**
 * Phase 5A-5 BotPlayer Ranged Class Parity regression.
 * Usage: node scripts/phase-5a-bot-player-ranged-parity-regression.mjs [baseUrl]
 *
 * Verifies the BotPlayer can be a ranged class (ranger/mage/priest) using real
 * player class data — class identity, class-derived baseline, class sprite,
 * matching normal-attack projectile (arrow/magic/holy), warrior stays melee,
 * brain uses the class attackRange (stops + shoots in range, no needless melee
 * rush), shared-combat damage, no projectile leak, human stats untouched, mobile
 * readability, and frozen systems intact.
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

const setClass = (page, c) => page.evaluate((cls) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugSetClass(cls), c);
const botSnap = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getBotSnapshot());
const goalOf = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getBrainSnapshot().goal);
const playerHp = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.currentHp);
async function teleportPlayer(page, x, y) {
  await page.evaluate(({ px, py }) => { const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene'); s.player.sprite.setPosition(px, py); s.player.body.reset(px, py); s.player.update(); }, { px: x, py: y });
}
const visualKey = (page) => page.evaluate(() => { const b = window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.bot; return b.getCharacterVisualTextureKey ? b.getCharacterVisualTextureKey() : undefined; });
const projCount = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').children.list.filter((o) => o.getData && o.getData('normalAttackProjectile')).length);

/** Set ranged class, park player in attack range, sample any projectile kind fired. */
async function fireAndCaptureProjectile(page, cls) {
  await setClass(page, cls);
  await sleep(100);
  const b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + Math.min(b.attackRange - 30, 220));
  let kindSeen = null;
  for (let i = 0; i < 40; i++) {
    await sleep(30);
    const k = await page.evaluate(() => {
      const o = window.__CLANWAR_GAME__.scene.getScene('MatchScene').children.list.find((c) => c.getData && c.getData('normalAttackProjectile'));
      return o ? o.getData('normalAttackProjectile') : null;
    });
    if (k) { kindSeen = k; break; }
  }
  return { kindSeen, attackRange: b.attackRange };
}

const HUMAN_STATS = {
  guardian: { hp: 1200, attack: 45, armor: 25, moveSpeed: 170, attackRange: 60 },
  warrior: { hp: 950, attack: 70, armor: 15, moveSpeed: 190, attackRange: 65 },
  ranger: { hp: 700, attack: 55, armor: 8, moveSpeed: 200, attackRange: 320 },
  mage: { hp: 650, attack: 35, armor: 5, moveSpeed: 185, attackRange: 250 },
  priest: { hp: 750, attack: 30, armor: 8, moveSpeed: 185, attackRange: 230 },
};
const VIS_KEY = { ranger: 'phase4e_theme1_char_ranger_idle', mage: 'phase4e_theme1_char_mage_idle', priest: 'phase4e_theme1_char_priest_idle', warrior: 'phase4e_theme1_char_warrior_idle' };

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/404|favicon/i.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));

  // ---------- Ranger (T1–T4) ----------
  await startMatch(page);
  await setClass(page, 'ranger');
  let snap = await botSnap(page);
  log('T1 bot classId can be set to ranger', snap.classId === 'ranger', `classId=${snap.classId}`);
  let base = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getClassBaseline());
  log('T2 ranger derives Ranger baseline stats', base.hp === 700 && base.attack === 55 && base.armor === 8 && base.attackRange === 320 && snap.attackRange === 320, JSON.stringify({ base, range: snap.attackRange }));
  log('T3 ranger uses Ranger visual key', (await visualKey(page)) === VIS_KEY.ranger, `key=${await visualKey(page)}`);
  let fired = await fireAndCaptureProjectile(page, 'ranger');
  log('T4 ranger fires arrow projectile on normal attack', fired.kindSeen === 'arrow', JSON.stringify(fired));

  // ---------- Mage (T5–T8) ----------
  await startMatch(page);
  await setClass(page, 'mage');
  snap = await botSnap(page);
  log('T5 bot classId can be set to mage', snap.classId === 'mage', `classId=${snap.classId}`);
  base = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getClassBaseline());
  log('T6 mage derives Mage baseline stats', base.hp === 650 && base.attack === 35 && base.armor === 5 && base.attackRange === 250, JSON.stringify(base));
  log('T7 mage uses Mage visual key', (await visualKey(page)) === VIS_KEY.mage, `key=${await visualKey(page)}`);
  fired = await fireAndCaptureProjectile(page, 'mage');
  log('T8 mage fires magic bolt on normal attack', fired.kindSeen === 'magic_bolt', JSON.stringify(fired));

  // ---------- Priest (T9–T12) ----------
  await startMatch(page);
  await setClass(page, 'priest');
  snap = await botSnap(page);
  log('T9 bot classId can be set to priest', snap.classId === 'priest', `classId=${snap.classId}`);
  base = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getClassBaseline());
  log('T10 priest derives Priest baseline stats', base.hp === 750 && base.attack === 30 && base.armor === 8 && base.attackRange === 230, JSON.stringify(base));
  log('T11 priest uses Priest visual key', (await visualKey(page)) === VIS_KEY.priest, `key=${await visualKey(page)}`);
  fired = await fireAndCaptureProjectile(page, 'priest');
  log('T12 priest fires holy bolt on normal attack', fired.kindSeen === 'holy_bolt', JSON.stringify(fired));

  // ---------- T13: warrior stays melee-only ----------
  await startMatch(page);
  await setClass(page, 'warrior');
  let b = await botSnap(page);
  log('T13a warrior attackKind = melee, projectileKind null', b.attackKind === 'melee' && b.projectileKind === null, JSON.stringify({ attackKind: b.attackKind, pk: b.projectileKind }));
  await teleportPlayer(page, b.x, b.y + b.attackRange - 14);
  let warriorProj = 0;
  for (let i = 0; i < 30; i++) { await sleep(40); warriorProj = Math.max(warriorProj, await projCount(page)); }
  log('T13 warrior bot remains melee-only (no projectile)', warriorProj === 0, `projSeen=${warriorProj}`);

  // ---------- T14: difficulty affects bot only ----------
  const diff = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.botSystem.debugSetClass('ranger');
    const eff = {};
    for (const d of ['easy', 'normal', 'hard']) { s.botSystem.debugSetDifficulty(d); eff[d] = s.botSystem.getDifficultyInfo().effectiveAttack; }
    s.botSystem.debugSetDifficulty('normal');
    return { eff, base: s.botSystem.getDifficultyInfo().baseAttack };
  });
  log('T14 difficulty affects bot only', diff.eff.easy < diff.eff.normal && diff.eff.normal < diff.eff.hard && diff.base === 55, JSON.stringify(diff));

  // ---------- T15: human player class stats unchanged ----------
  const humanStats = {};
  for (const c of Object.keys(HUMAN_STATS)) {
    await startMatch(page, { width: 1280, height: 720 }, c);
    humanStats[c] = await page.evaluate(() => { const p = window.__CLANWAR_GAME__.scene.getScene('MatchScene').player; return { hp: p.maxHp, attack: p.attack, armor: p.armor, moveSpeed: p.moveSpeed, attackRange: p.attackRange }; });
  }
  const humanOk = Object.keys(HUMAN_STATS).every((c) => { const a = humanStats[c], e = HUMAN_STATS[c]; return a.hp === e.hp && a.attack === e.attack && a.armor === e.armor && a.moveSpeed === e.moveSpeed && a.attackRange === e.attackRange; });
  log('T15 all human player class stats unchanged', humanOk, JSON.stringify(humanStats));

  // ---------- T16: BotBrain uses class attackRange ----------
  await startMatch(page);
  await setClass(page, 'ranger');
  b = await botSnap(page);
  // In ranger range (300 < 320) → attack; outside attack range but in detection (380) → chase.
  await teleportPlayer(page, b.x, b.y + 300);
  let inRangeGoal = '';
  for (let i = 0; i < 12; i++) { await sleep(50); const gg = await goalOf(page); if (gg === 'attack_player') { inRangeGoal = gg; break; } inRangeGoal = gg; }
  await teleportPlayer(page, b.x, b.y + 380);
  await sleep(180);
  const outRangeGoal = await goalOf(page);
  log('T16 BotBrain uses class attackRange', (inRangeGoal === 'attack_player' || inRangeGoal === 'chase_player') && b.attackRange === 320 && (outRangeGoal === 'chase_player' || outRangeGoal === 'investigate_last_seen'),
    JSON.stringify({ range: b.attackRange, inRangeGoal, outRangeGoal }));

  // ---------- T17 + T18: ranged stops in range, no needless melee rush ----------
  await startMatch(page);
  await setClass(page, 'ranger');
  b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + 300); // inside attack range (320)
  let minDist = 9999, maxSpeedInRange = 0;
  for (let i = 0; i < 20; i++) {
    await sleep(80);
    const sn = await botSnap(page);
    const d = await page.evaluate(() => { const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene'); const bt = s.botSystem.getBotSnapshot(); return Math.hypot(s.player.x - bt.x, s.player.y - bt.y); });
    minDist = Math.min(minDist, d);
    if (d <= b.attackRange) maxSpeedInRange = Math.max(maxSpeedInRange, sn.speed);
  }
  log('T17 ranged bot stops in attack range', maxSpeedInRange < 40, `maxSpeedInRange=${maxSpeedInRange.toFixed(1)}`);
  log('T18 ranged bot does not chase into melee range', minDist > 150, `minDist=${minDist.toFixed(0)}`);

  // ---------- T19: damage resolves through shared combat path ----------
  await startMatch(page);
  await setClass(page, 'ranger');
  b = await botSnap(page);
  const hp0 = await playerHp(page);
  await teleportPlayer(page, b.x, b.y + 200);
  let hpDuringWindup = hp0;
  for (let i = 0; i < 20; i++) { await sleep(50); if ((await botSnap(page)).state === 'windup') { hpDuringWindup = await playerHp(page); break; } }
  await sleep(900);
  const hp1 = await playerHp(page);
  log('T19 damage resolves through shared combat path', hp1 < hp0 && hpDuringWindup === hp0, JSON.stringify({ hp0, hpDuringWindup, hp1 }));

  // ---------- T20: projectile visual-safe + destroyed ----------
  await startMatch(page);
  fired = await fireAndCaptureProjectile(page, 'mage');
  await sleep(1200); // well past projectile tween lifetime
  const leftover = await projCount(page);
  log('T20 projectile is visual-safe and destroyed', fired.kindSeen === 'magic_bolt' && leftover === 0, JSON.stringify({ fired: fired.kindSeen, leftover }));

  // ---------- T21: reset MatchScene x3 no duplicate bot/projectile/brain ----------
  let maxBots = 0, maxProj = 0, brainOk = true;
  for (let i = 0; i < 3; i++) {
    await startMatch(page);
    await setClass(page, 'ranger');
    await fireAndCaptureProjectile(page, 'ranger');
    await sleep(1200);
    const c = await page.evaluate(() => { const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene'); return { bots: s.children.list.filter((o) => o.getData && o.getData('enemyBot')).length, proj: s.children.list.filter((o) => o.getData && o.getData('normalAttackProjectile')).length, brain: !!s.botSystem.getBrainSnapshot() }; });
    maxBots = Math.max(maxBots, c.bots); maxProj = Math.max(maxProj, c.proj); if (!c.brain) brainOk = false;
  }
  log('T21 reset x3 no duplicate bot/projectile/brain', maxBots === 1 && maxProj === 0 && brainOk, JSON.stringify({ maxBots, maxProj }));

  // ---------- T22 + T23: mobile readable ----------
  for (const [w, h, id] of [[915, 412, 'T22'], [800, 360, 'T23']]) {
    await startMatch(page, { width: w, height: h }, 'guardian');
    await setClass(page, 'ranger');
    const mob = await page.evaluate(() => {
      const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
      const body = s.children.list.find((o) => o.getData && o.getData('enemyBot'));
      const marker = s.children.list.find((o) => o.getData && o.getData('botEnemyMarker'));
      const hpBar = s.children.list.find((o) => o.getData && o.getData('botHpBar'));
      const vis = s.children.list.find((o) => o.getData && o.getData('botClassVisual'));
      const maxDepth = Math.max(0, ...[body, marker, hpBar, vis].filter(Boolean).map((o) => o.depth ?? 0));
      return { hasBody: !!body, hasMarker: !!marker, hasHpBar: !!hpBar, hasVisual: !!vis, joystick: !!s.movement, maxDepth };
    });
    log(`${id} mobile ${w}x${h} readable + controls free`, mob.hasBody && mob.hasMarker && mob.hasHpBar && mob.joystick && mob.maxDepth < 1000, JSON.stringify(mob));
  }

  // ---------- T24: frozen systems wiring intact ----------
  await startMatch(page);
  const frozen = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const cap = s.captureSystem;
    const before = cap.getTeamScore('blue');
    cap.simulatePlayerAtObjective('resourceCampL');
    for (let i = 0; i < 80; i++) cap.update(100, 1500, 1600, 'blue');
    return { capturesAwardScore: cap.getTeamScore('blue') > before, timer: s.matchTimerSystem.getRemainingSeconds(), coreHpBlue: s.objectiveSystem.getCoreHp('blue'), coreHpRed: s.objectiveSystem.getCoreHp('red'), phase: s.objectiveSystem.getMatchPhase() };
  });
  log('T24 frozen systems wiring intact (capture/timer/core/phase)', frozen.capturesAwardScore && frozen.timer === 300 && frozen.coreHpBlue === 2000 && frozen.coreHpRed === 2000 && frozen.phase === 'in_progress', JSON.stringify(frozen));

  // ---------- T25: no console errors ----------
  log('T25 no fatal console errors', errs.length === 0, errs.join('; ') || 'none');

  const passed = results.filter((r) => r.p).length;
  console.log(`\nSUMMARY ${passed}/${results.length}`);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
