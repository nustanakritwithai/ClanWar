/**
 * Phase 5A-6 Ranged Combat Feel Tuning regression.
 * Usage: node scripts/phase-5a-ranged-combat-feel-regression.mjs [baseUrl]
 *
 * Verifies the ranged BotPlayer (ranger/mage/priest) spaces like a real player:
 * stops + fires inside its attack range, holds a comfortable band instead of
 * rushing into melee, kites backward when the player gets too close, still fires
 * the right projectile, and does not thrash between chase/hold/kite. Melee
 * (warrior) behaviour, the wind-up dodge window, stuck/off-leash return, lost-
 * player investigate, human stats, difficulty scope, frozen systems and console
 * cleanliness are all checked to be intact.
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
const setCooldown = (page, ms) => page.evaluate((m) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugSetCooldown(m), ms);
const setStuck = (page, v) => page.evaluate((vv) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugSetStuck(vv), v);
const teleportBot = (page, x, y) => page.evaluate(({ bx, by }) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugTeleportBot(bx, by), { bx: x, by: y });
const botSnap = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getBotSnapshot());
const spacingInfo = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getRangedSpacingInfo());
const goalOf = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getBrainSnapshot().goal);
const playerHp = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.currentHp);
const distOf = (page) => page.evaluate(() => { const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene'); const b = s.botSystem.getBotSnapshot(); return Math.hypot(s.player.x - b.x, s.player.y - b.y); });
const projCount = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').children.list.filter((o) => o.getData && o.getData('normalAttackProjectile')).length);
async function teleportPlayer(page, x, y) {
  await page.evaluate(({ px, py }) => { const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene'); s.player.sprite.setPosition(px, py); s.player.body.reset(px, py); s.player.update(); }, { px: x, py: y });
}

/** Set ranged class, park player just inside attack range, sample projectile kind fired. */
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
  return kindSeen;
}

/**
 * Block the cooldown, drop the player inside dangerCloseRange, and confirm the
 * bot picks kite_back and actually opens the gap (retreats) toward its band.
 */
async function kiteProbe(page, cls) {
  await setClass(page, cls);
  await sleep(80);
  const info = await spacingInfo(page);
  const sp = info.spacing;
  const b = await botSnap(page);
  // Park the player well inside dangerCloseRange so kiting is the right call.
  const close = Math.max(60, sp.dangerCloseRange - 50);
  await teleportPlayer(page, b.x, b.y + close);
  await setCooldown(page, 5000); // cannot fire → spacing decides movement
  await sleep(120);
  const startDist = await distOf(page);
  let sawKite = false;
  let maxDist = startDist;
  for (let i = 0; i < 18; i++) {
    await sleep(70);
    if ((await goalOf(page)) === 'kite_back') sawKite = true;
    maxDist = Math.max(maxDist, await distOf(page));
  }
  return { sawKite, startDist, maxDist, retreated: maxDist > startDist + 25, bandMin: sp.preferredMinRange };
}

/** Hold-in-band: player parked in the comfortable band → bot stays put (low speed). */
async function holdProbe(page, cls) {
  await setClass(page, cls);
  await sleep(80);
  const info = await spacingInfo(page);
  const sp = info.spacing;
  const b = await botSnap(page);
  const mid = Math.round((sp.preferredMinRange + sp.preferredMaxRange) / 2);
  await teleportPlayer(page, b.x, b.y + mid);
  let maxSpeed = 0;
  let minDist = 9999;
  for (let i = 0; i < 16; i++) {
    await sleep(80);
    const sn = await botSnap(page);
    maxSpeed = Math.max(maxSpeed, sn.speed);
    minDist = Math.min(minDist, await distOf(page));
  }
  return { maxSpeed, minDist, mid };
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
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/404|favicon/i.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));

  // ---------- C1 + C2: Ranger stops in range, no needless melee ----------
  await startMatch(page);
  let hold = await holdProbe(page, 'ranger');
  log('C1 ranger bot stops in attack range', hold.maxSpeed < 40, `maxSpeed=${hold.maxSpeed.toFixed(1)}`);
  log('C2 ranger bot does not enter melee range unnecessarily', hold.minDist > 180, `minDist=${hold.minDist.toFixed(0)} (held near ${hold.mid})`);

  // ---------- C3: Ranger kites when player too close ----------
  let kite = await kiteProbe(page, 'ranger');
  log('C3 ranger bot kites when player gets too close', kite.sawKite && kite.retreated, JSON.stringify({ sawKite: kite.sawKite, startDist: kite.startDist.toFixed(0), maxDist: kite.maxDist.toFixed(0) }));

  // ---------- C4: Ranger still fires arrow ----------
  log('C4 ranger still fires arrow', (await fireAndCaptureProjectile(page, 'ranger')) === 'arrow');

  // ---------- C5 + C6: Mage stops/holds + kites ----------
  await startMatch(page);
  hold = await holdProbe(page, 'mage');
  log('C5 mage bot stops in attack range', hold.maxSpeed < 40, `maxSpeed=${hold.maxSpeed.toFixed(1)}`);
  kite = await kiteProbe(page, 'mage');
  log('C6 mage bot kites/holds range correctly', hold.minDist > 130 && kite.sawKite && kite.retreated, JSON.stringify({ holdMin: hold.minDist.toFixed(0), sawKite: kite.sawKite, maxDist: kite.maxDist.toFixed(0) }));

  // ---------- C7: Mage fires magic bolt ----------
  log('C7 mage still fires magic bolt', (await fireAndCaptureProjectile(page, 'mage')) === 'magic_bolt');

  // ---------- C8 + C9: Priest stops/holds + kites ----------
  await startMatch(page);
  hold = await holdProbe(page, 'priest');
  log('C8 priest bot stops in attack range', hold.maxSpeed < 40, `maxSpeed=${hold.maxSpeed.toFixed(1)}`);
  kite = await kiteProbe(page, 'priest');
  log('C9 priest bot kites/holds range correctly', hold.minDist > 130 && kite.sawKite && kite.retreated, JSON.stringify({ holdMin: hold.minDist.toFixed(0), sawKite: kite.sawKite, maxDist: kite.maxDist.toFixed(0) }));

  // ---------- C10: Priest fires holy bolt ----------
  log('C10 priest still fires holy bolt', (await fireAndCaptureProjectile(page, 'priest')) === 'holy_bolt');

  // ---------- C11: Warrior behaviour unchanged (no spacing goals) ----------
  await startMatch(page);
  await setClass(page, 'warrior');
  const wInfo = await spacingInfo(page);
  let wb = await botSnap(page);
  await teleportPlayer(page, wb.x, wb.y + 200); // in detection, out of melee → chase
  const wGoals = new Set();
  let sawChase = false;
  for (let i = 0; i < 14; i++) { await sleep(60); const g = await goalOf(page); wGoals.add(g); if (g === 'chase_player') sawChase = true; }
  const noSpacingGoals = !wGoals.has('kite_back') && !wGoals.has('hold_range');
  log('C11 warrior bot behaviour unchanged', wInfo.isRanged === false && wInfo.spacing === null && sawChase && noSpacingGoals, JSON.stringify({ isRanged: wInfo.isRanged, goals: [...wGoals] }));

  // ---------- C12: Warrior remains melee-only (no projectile) ----------
  wb = await botSnap(page);
  await teleportPlayer(page, wb.x, wb.y + wb.attackRange - 14);
  let warriorProj = 0;
  for (let i = 0; i < 26; i++) { await sleep(40); warriorProj = Math.max(warriorProj, await projCount(page)); }
  log('C12 warrior bot remains melee-only', warriorProj === 0, `projSeen=${warriorProj}`);

  // ---------- C13: no goal thrashing between chase/attack/kite ----------
  await startMatch(page);
  await setClass(page, 'ranger');
  let rb = await botSnap(page);
  const si = await spacingInfo(page);
  await teleportPlayer(page, rb.x, rb.y + Math.round((si.spacing.preferredMinRange + si.spacing.preferredMaxRange) / 2));
  let prev = null, transitions = 0, chaseKiteFlip = 0;
  const seq = [];
  for (let i = 0; i < 30; i++) {
    await sleep(60);
    const g = await goalOf(page);
    seq.push(g);
    if (prev !== null && g !== prev) {
      transitions += 1;
      if ((prev === 'chase_player' && g === 'kite_back') || (prev === 'kite_back' && g === 'chase_player')) chaseKiteFlip += 1;
    }
    prev = g;
  }
  // A static in-band player yields only the attack→recover→hold rhythm; nothing
  // should be flipping every frame and never chase⇄kite.
  log('C13 no goal thrashing between chase/attack/kite', transitions <= 12 && chaseKiteFlip === 0, JSON.stringify({ transitions, chaseKiteFlip }));

  // ---------- C14: stuck / off-leash still returns to spawn ----------
  // Park the player inside detection but OUTSIDE attack range so the live
  // engagement goal is chase (attack/recover always outrank a return by design);
  // stuck and off-leash must then override that chase.
  await startMatch(page);
  await setClass(page, 'ranger');
  rb = await botSnap(page);
  const outOfRange = rb.attackRange + 50; // 370: in detection (~400), no attack
  await teleportPlayer(page, rb.x, rb.y + outOfRange);
  await setStuck(page, true);
  await sleep(220);
  const stuckGoal = await goalOf(page);
  await setStuck(page, null);
  // Off-leash: shove the bot far from spawn, keep the player in chase range.
  await setClass(page, 'ranger'); // clear any recent-attack/recovery memory
  const far = { x: rb.spawnX + 700, y: rb.spawnY };
  teleportBot(page, far.x, far.y);
  await teleportPlayer(page, far.x, far.y + outOfRange);
  await sleep(260);
  const offLeashGoal = await goalOf(page);
  log('C14 stuck/off-leash still returns to spawn', stuckGoal === 'return_to_spawn' && offLeashGoal === 'return_to_spawn', JSON.stringify({ stuckGoal, offLeashGoal }));

  // ---------- C15: lost-player memory / investigate still works ----------
  await startMatch(page);
  await setClass(page, 'ranger');
  rb = await botSnap(page);
  await teleportPlayer(page, rb.x, rb.y + 200); // seen
  await sleep(220);
  await teleportPlayer(page, rb.x + 4000, rb.y + 4000); // gone, but recently seen
  let investigated = false;
  for (let i = 0; i < 16; i++) { await sleep(60); if ((await goalOf(page)) === 'investigate_last_seen') { investigated = true; break; } }
  log('C15 lost-player memory/investigate still works', investigated);

  // ---------- C16: wind-up damage + dodge window still work ----------
  await startMatch(page);
  await setClass(page, 'ranger');
  rb = await botSnap(page);
  // Dodge: trigger a wind-up, then leave the arc before it resolves → no damage.
  await setCooldown(page, 0);
  await teleportPlayer(page, rb.x, rb.y + 200);
  let dodged = false, dodgeHp0 = await playerHp(page);
  for (let i = 0; i < 30; i++) {
    await sleep(30);
    if ((await botSnap(page)).state === 'windup') {
      dodgeHp0 = await playerHp(page);
      await teleportPlayer(page, rb.x + 5000, rb.y + 5000); // step out of the arc
      break;
    }
  }
  await sleep(700);
  dodged = (await playerHp(page)) === dodgeHp0;
  // Hit: stay in the arc through the wind-up → damage resolves.
  await startMatch(page);
  await setClass(page, 'ranger');
  rb = await botSnap(page);
  await setCooldown(page, 0);
  const hitHp0 = await playerHp(page);
  await teleportPlayer(page, rb.x, rb.y + 200);
  await sleep(1100);
  const hitHp1 = await playerHp(page);
  log('C16 wind-up damage + dodge window still work', dodged && hitHp1 < hitHp0, JSON.stringify({ dodged, hitHp0, hitHp1 }));

  // ---------- C17: projectile auto-destroys ----------
  await startMatch(page);
  const pk = await fireAndCaptureProjectile(page, 'mage');
  await sleep(1200);
  const leftover = await projCount(page);
  log('C17 projectile auto-destroys', pk === 'magic_bolt' && leftover === 0, JSON.stringify({ pk, leftover }));

  // ---------- C18: reset MatchScene ×3 no duplicate bot/projectile/brain ----------
  let maxBots = 0, maxProj = 0, brainOk = true;
  for (let i = 0; i < 3; i++) {
    await startMatch(page);
    await fireAndCaptureProjectile(page, 'ranger');
    await sleep(1200);
    const c = await page.evaluate(() => { const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene'); return { bots: s.children.list.filter((o) => o.getData && o.getData('enemyBot')).length, proj: s.children.list.filter((o) => o.getData && o.getData('normalAttackProjectile')).length, brain: !!s.botSystem.getBrainSnapshot() }; });
    maxBots = Math.max(maxBots, c.bots); maxProj = Math.max(maxProj, c.proj); if (!c.brain) brainOk = false;
  }
  log('C18 reset ×3 no duplicate bot/projectile/brain', maxBots === 1 && maxProj === 0 && brainOk, JSON.stringify({ maxBots, maxProj }));

  // ---------- C19 + C20: mobile readable ----------
  for (const [w, h, id] of [[915, 412, 'C19'], [800, 360, 'C20']]) {
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

  // ---------- C21: human player class stats unchanged ----------
  const humanStats = {};
  for (const c of Object.keys(HUMAN_STATS)) {
    await startMatch(page, { width: 1280, height: 720 }, c);
    await setClass(page, 'ranger'); // a ranged bot exists alongside the human
    humanStats[c] = await page.evaluate(() => { const p = window.__CLANWAR_GAME__.scene.getScene('MatchScene').player; return { hp: p.maxHp, attack: p.attack, armor: p.armor, moveSpeed: p.moveSpeed, attackRange: p.attackRange }; });
  }
  const humanOk = Object.keys(HUMAN_STATS).every((c) => { const a = humanStats[c], e = HUMAN_STATS[c]; return a.hp === e.hp && a.attack === e.attack && a.armor === e.armor && a.moveSpeed === e.moveSpeed && a.attackRange === e.attackRange; });
  log('C21 human player class stats unchanged', humanOk, JSON.stringify(humanStats));

  // ---------- C22: difficulty affects bot only ----------
  const diff = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.botSystem.debugSetClass('ranger');
    const eff = {};
    for (const d of ['easy', 'normal', 'hard']) { s.botSystem.debugSetDifficulty(d); eff[d] = s.botSystem.getDifficultyInfo().effectiveAttack; }
    s.botSystem.debugSetDifficulty('normal');
    return { eff, base: s.botSystem.getDifficultyInfo().baseAttack };
  });
  log('C22 difficulty affects bot only', diff.eff.easy < diff.eff.normal && diff.eff.normal < diff.eff.hard && diff.base === 55, JSON.stringify(diff));

  // ---------- C23: frozen systems wiring intact ----------
  await startMatch(page);
  const frozen = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const cap = s.captureSystem;
    const before = cap.getTeamScore('blue');
    cap.simulatePlayerAtObjective('resourceCampL');
    for (let i = 0; i < 80; i++) cap.update(100, 1500, 1600, 'blue');
    return { capturesAwardScore: cap.getTeamScore('blue') > before, timer: s.matchTimerSystem.getRemainingSeconds(), coreHpBlue: s.objectiveSystem.getCoreHp('blue'), coreHpRed: s.objectiveSystem.getCoreHp('red'), phase: s.objectiveSystem.getMatchPhase() };
  });
  log('C23 Gate/Core/Capture/Siege/Timer/Score unchanged', frozen.capturesAwardScore && frozen.timer === 300 && frozen.coreHpBlue === 2000 && frozen.coreHpRed === 2000 && frozen.phase === 'in_progress', JSON.stringify(frozen));

  // ---------- C24: no console errors ----------
  log('C24 no fatal console errors', errs.length === 0, errs.join('; ') || 'none');

  const passed = results.filter((r) => r.p).length;
  console.log(`\nSUMMARY ${passed}/${results.length}`);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
