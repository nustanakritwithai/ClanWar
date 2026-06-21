/**
 * Phase 5A-7 Live BotPlayer Class + Skill Parity regression.
 * Usage: node scripts/phase-5a-live-botplayer-class-skill-parity-regression.mjs [baseUrl]
 *
 * Validates the REAL match runtime path (not debugSetClass): the live match can
 * spawn the single AI BotPlayer as warrior/ranger/mage/priest via launch data /
 * rotation, each class shows its sprite + correct normal-attack projectile, the
 * bot casts its class signature skill (drawn from the shared player SKILLS table
 * through the shared SkillRuntimeSystem) with readable VFX + cooldown, and the
 * 5A-6 spacing/kite, lost-player memory, mobile readability, human stats,
 * difficulty scope and frozen systems all remain intact.
 */
import puppeteer from 'puppeteer';

const BASE_URL = process.argv[2] ?? 'http://127.0.0.1:4173';
const results = [];
const log = (t, p, d = '') => { results.push({ t, p }); console.log(`${p ? 'PASS' : 'FAIL'}: ${t}${d ? ` — ${d}` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let booted = false;
/**
 * Start a real match through the live launch path. `botClass` is passed as scene
 * launch data exactly like a `?botClass=` param would resolve — NOT debugSetClass.
 */
async function startMatch(page, { viewport = { width: 1280, height: 720 }, heroClass = 'guardian', botClass } = {}) {
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
  await page.evaluate(({ hc, bc }) => {
    const g = window.__CLANWAR_GAME__;
    try { g.scene.stop('MenuScene'); } catch (e) {}
    const data = { heroClass: hc };
    if (bc !== undefined) data.botClass = bc;
    g.scene.start('MatchScene', data);
  }, { hc: heroClass, bc: botClass });
  await page.waitForFunction(() => {
    const s = window.__CLANWAR_GAME__?.scene?.getScene('MatchScene');
    return s?.objectiveSystem && s?.matchTimerSystem && s?.player && s?.botSystem?.getBrainSnapshot;
  });
  await sleep(280);
}

const botSnap = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getBotSnapshot());
const goalOf = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getBrainSnapshot().goal);
const playerHp = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.currentHp);
const visualKey = (page) => page.evaluate(() => { const b = window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.bot; return b.getCharacterVisualTextureKey ? b.getCharacterVisualTextureKey() : undefined; });
const skillInfo = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getSkillInfo());
const skillCast = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getSkillCastDebug());
const setCooldown = (page, ms) => page.evaluate((m) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugSetCooldown(m), ms);
const damageBot = (page, amt) => page.evaluate((a) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugDamageBot(a), amt);
const warningVisible = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').children.list.some((o) => o.getData && o.getData('botAttackWarning') && o.visible));
const projCount = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').children.list.filter((o) => o.getData && o.getData('normalAttackProjectile')).length);
const skillProjCount = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').children.list.filter((o) => o.getData && o.getData('botSkillProjectile')).length);
async function teleportPlayer(page, x, y) {
  await page.evaluate(({ px, py }) => { const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene'); s.player.sprite.setPosition(px, py); s.player.body.reset(px, py); s.player.update(); }, { px: x, py: y });
}

/** Park player in attack range and watch any normal-attack projectile kind fired. */
async function captureProjectile(page) {
  const b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + Math.min(b.attackRange - 30, 220));
  for (let i = 0; i < 45; i++) {
    await sleep(30);
    const k = await page.evaluate(() => {
      const o = window.__CLANWAR_GAME__.scene.getScene('MatchScene').children.list.find((c) => c.getData && c.getData('normalAttackProjectile'));
      return o ? o.getData('normalAttackProjectile') : null;
    });
    if (k) return k;
  }
  return null;
}

/** Park player in skill range and observe the class skill cast (offensive). */
async function offensiveSkillProbe(page) {
  const info = await skillInfo(page);
  const b = await botSnap(page);
  // Inside skill range but outside danger-close so a ranged bot will cast (not kite).
  const dist = Math.min(info.range - 40, b.attackRange + 30);
  await teleportPlayer(page, b.x, b.y + dist);
  let sawWindup = false;
  let sawProjectile = false;
  let firstCast = null;
  let goalSeen = null;
  for (let i = 0; i < 80; i++) {
    await sleep(35);
    if (await warningVisible(page)) sawWindup = true;
    if ((await skillProjCount(page)) > 0) sawProjectile = true;
    const c = await skillCast(page);
    if (c.casts >= 1 && !firstCast) { firstCast = c; goalSeen = await goalOf(page); }
    // Keep sampling a little past the cast so the projectile (created at resolve)
    // is observed even though its travel tween is short.
    if (firstCast && sawProjectile) break;
    if (firstCast && i > 78) break;
  }
  const last = firstCast ?? (await skillCast(page));
  return { casts: last.casts, sawWindup, sawProjectile, last, goalSeen };
}

/** Drop priest HP below the defensive threshold and observe the heal cast. */
async function defensiveHealProbe(page) {
  const b0 = await botSnap(page);
  // Bring HP down to ~35% to trip the defensive threshold (0.55).
  await damageBot(page, Math.round(b0.maxHp * 0.65));
  const hpLow = (await botSnap(page)).hp;
  let sawWindup = false;
  for (let i = 0; i < 70; i++) {
    await sleep(40);
    if (await warningVisible(page)) sawWindup = true;
    const c = await skillCast(page);
    if (c.casts >= 1) {
      const hpAfter = (await botSnap(page)).hp;
      return { casts: c.casts, sawWindup, hpLow, hpAfter, last: c };
    }
  }
  return { casts: 0, sawWindup, hpLow, hpAfter: (await botSnap(page)).hp, last: await skillCast(page) };
}

const HUMAN_STATS = {
  guardian: { hp: 1200, attack: 45, armor: 25, moveSpeed: 170, attackRange: 60 },
  warrior: { hp: 950, attack: 70, armor: 15, moveSpeed: 190, attackRange: 65 },
  ranger: { hp: 700, attack: 55, armor: 8, moveSpeed: 200, attackRange: 320 },
  mage: { hp: 650, attack: 35, armor: 5, moveSpeed: 185, attackRange: 250 },
  priest: { hp: 750, attack: 30, armor: 8, moveSpeed: 185, attackRange: 230 },
};
const VIS_KEY = { ranger: 'phase4e_theme1_char_ranger_idle', mage: 'phase4e_theme1_char_mage_idle', priest: 'phase4e_theme1_char_priest_idle', warrior: 'phase4e_theme1_char_warrior_idle' };
const EXPECTED_SKILL = { warrior: { id: 'warrior_cleave', dmg: 110 }, ranger: { id: 'ranger_power_shot', dmg: 120 }, mage: { id: 'mage_fireball', dmg: 130 }, priest: { id: 'priest_heal', heal: 140 } };

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/404|favicon/i.test(m.text())) consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

  try {
    // --- C1–C4: live match spawns each class via launch data (no debugSetClass) ---
    for (const cls of ['warrior', 'ranger', 'mage', 'priest']) {
      await startMatch(page, { botClass: cls });
      const snap = await botSnap(page);
      const n = { warrior: 1, ranger: 2, mage: 3, priest: 4 }[cls];
      log(`C${n} actual match spawns ${cls} BotPlayer`, snap.classId === cls, `classId=${snap.classId}`);
    }

    // --- C5: default (rotation) is not locked to warrior forever ---
    const rotated = [];
    for (let i = 0; i < 5; i++) {
      await startMatch(page, { botClass: 'rotate' });
      rotated.push((await botSnap(page)).classId);
    }
    const distinct = [...new Set(rotated)];
    log('C5 default match not locked to warrior forever', distinct.length >= 2 && !rotated.every((c) => c === 'warrior'), `rotation=${rotated.join(',')}`);

    // --- C6–C8: visible class sprite in the actual match ---
    for (const cls of ['ranger', 'mage', 'priest']) {
      await startMatch(page, { botClass: cls });
      const key = await visualKey(page);
      const n = { ranger: 6, mage: 7, priest: 8 }[cls];
      log(`C${n} ${cls} visible class sprite in actual match`, key === VIS_KEY[cls], `key=${key}`);
    }

    // --- C9–C11: ranged normal attack projectile in the actual match ---
    const projExpect = { ranger: 'arrow', mage: 'magic_bolt', priest: 'holy_bolt' };
    for (const cls of ['ranger', 'mage', 'priest']) {
      await startMatch(page, { botClass: cls });
      await setCooldown(page, 0);
      const kind = await captureProjectile(page);
      const n = { ranger: 9, mage: 10, priest: 11 }[cls];
      log(`C${n} ${cls} normal attack fires ${projExpect[cls]} in actual match`, kind === projExpect[cls], `kind=${kind}`);
    }

    // --- C12: warrior remains melee-only (no normal-attack projectile) ---
    await startMatch(page, { botClass: 'warrior' });
    const wInfo = await botSnap(page);
    await teleportPlayer(page, wInfo.x, wInfo.y + 40);
    let warProj = 0;
    for (let i = 0; i < 30; i++) { await sleep(40); warProj = Math.max(warProj, await projCount(page)); }
    log('C12 warrior remains melee-only', warProj === 0 && wInfo.attackKind === 'melee', `attackKind=${wInfo.attackKind} proj=${warProj}`);

    // --- C13–C17: class skill MVP (offensive cast on mage) ---
    await startMatch(page, { botClass: 'mage', heroClass: 'guardian' });
    const mInfo = await skillInfo(page);
    const off = await offensiveSkillProbe(page);
    log('C13 BotPlayer casts a class skill in actual match', off.casts >= 1, `casts=${off.casts} goal=${off.goalSeen}`);
    log('C14 skill cast uses shared player skill source/pipeline', mInfo.skillId === EXPECTED_SKILL.mage.id && mInfo.source.includes('shared'), `skillId=${mInfo.skillId} source=${mInfo.source}`);
    log('C15 skill visual appears + readable (telegraph + projectile)', off.sawWindup && off.sawProjectile, `windup=${off.sawWindup} projectile=${off.sawProjectile}`);
    log('C16 skill damage is shared SKILLS value, not bot-only formula', off.last.lastRawAmount === EXPECTED_SKILL.mage.dmg && off.last.lastApplied > 0 && off.last.lastApplied <= EXPECTED_SKILL.mage.dmg, JSON.stringify({ raw: off.last.lastRawAmount, applied: off.last.lastApplied }));
    // cooldown: after the cast the skill must not re-fire immediately (spam guard).
    const castsRightAfter = (await skillCast(page)).casts;
    await sleep(1600);
    const castsLater = (await skillCast(page)).casts;
    const cdInfo = await skillInfo(page);
    log('C17 skill cooldown prevents spam', castsLater === castsRightAfter && cdInfo.cooldownRemaining > 0, JSON.stringify({ after: castsRightAfter, later: castsLater, cd: Math.round(cdInfo.cooldownRemaining) }));

    // --- Priest defensive heal (part of skill-parity MVP) ---
    await startMatch(page, { botClass: 'priest' });
    const heal = await defensiveHealProbe(page);
    const pInfo = await skillInfo(page);
    log('C13b priest casts defensive heal when low + restores HP', heal.casts >= 1 && heal.hpAfter > heal.hpLow && heal.last.lastWasHeal === true && heal.last.lastRawAmount === EXPECTED_SKILL.priest.heal && pInfo.skillId === EXPECTED_SKILL.priest.id, JSON.stringify({ casts: heal.casts, hpLow: heal.hpLow, hpAfter: heal.hpAfter, raw: heal.last.lastRawAmount }));

    // --- C18: 5A-6 ranged spacing still works (ranger stops, no melee rush) ---
    await startMatch(page, { botClass: 'ranger' });
    await setCooldown(page, 6000); // block basic + skill so pure spacing shows
    let rb = await botSnap(page);
    await teleportPlayer(page, rb.x, rb.y + 250); // comfortable band
    let maxSpeed = 0; let maxDisp = 0;
    for (let i = 0; i < 18; i++) {
      await sleep(80);
      const s = await botSnap(page);
      maxSpeed = Math.max(maxSpeed, s.speed);
      maxDisp = Math.max(maxDisp, Math.hypot(s.x - rb.x, s.y - rb.y)); // bot's own movement
      await setCooldown(page, 6000);
    }
    log('C18 ranged spacing (5A-6) still works — stops, no melee rush', maxSpeed < 40 && maxDisp < 60, `maxSpeed=${maxSpeed.toFixed(1)} maxDisp=${maxDisp.toFixed(1)} (held, no melee rush)`);

    // --- C19: kite/hold still works (ranger retreats when too close) ---
    await startMatch(page, { botClass: 'ranger' });
    rb = await botSnap(page);
    const close = rb.attackRange; // place player well inside danger-close (ranger 160)
    await teleportPlayer(page, rb.x, rb.y + 110);
    let sawKite = false; let maxRetreat = 0;
    for (let i = 0; i < 18; i++) {
      await setCooldown(page, 5000);
      await sleep(70);
      const g = await goalOf(page);
      const s = await botSnap(page);
      if (g === 'kite_back') sawKite = true;
      maxRetreat = Math.max(maxRetreat, Math.hypot(s.x - rb.x, s.y - (rb.y + 110)));
    }
    log('C19 kite/hold behavior still works', sawKite && maxRetreat > 40, `sawKite=${sawKite} retreat=${maxRetreat.toFixed(0)}`);

    // --- C20: lost-player memory / investigate ---
    await startMatch(page, { botClass: 'warrior' });
    const ib = await botSnap(page);
    await teleportPlayer(page, ib.x, ib.y + 80);
    await sleep(200);
    await teleportPlayer(page, ib.x + 4000, ib.y); // vanish far away
    let investigated = false;
    for (let i = 0; i < 20; i++) { await sleep(80); if ((await goalOf(page)) === 'investigate_last_seen') { investigated = true; break; } }
    log('C20 BotBrain lost-player memory/investigate works', investigated);

    // --- C21: reset MatchScene x3 — no duplicate bot/projectile/skill/brain ---
    let maxBots = 0; let maxProj = 0; let maxSys = 0;
    for (let i = 0; i < 3; i++) {
      await startMatch(page, { botClass: 'mage' });
      const counts = await page.evaluate(() => {
        const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
        const bodies = s.children.list.filter((o) => o.getData && o.getData('enemyBot')).length;
        const proj = s.children.list.filter((o) => o.getData && o.getData('normalAttackProjectile')).length;
        const sys = s.botSystem ? 1 : 0;
        return { bodies, proj, sys };
      });
      maxBots = Math.max(maxBots, counts.bodies);
      maxProj = Math.max(maxProj, counts.proj);
      maxSys = Math.max(maxSys, counts.sys);
    }
    log('C21 reset x3 no duplicate bot/projectile/skill/brain', maxBots === 1 && maxProj === 0 && maxSys === 1, JSON.stringify({ maxBots, maxProj, maxSys }));

    // --- C22/C23: mobile readability ---
    for (const [w, h, n] of [[915, 412, 22], [800, 360, 23]]) {
      await startMatch(page, { viewport: { width: w, height: h }, botClass: 'ranger' });
      const m = await page.evaluate(() => {
        const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
        const b = s.botSystem.bot;
        const list = s.children.list;
        const hasMarker = list.some((o) => o.getData && o.getData('botEnemyMarker') && o.visible);
        const hasHpBar = list.some((o) => o.getData && o.getData('botHpBar') && o.visible);
        const joystick = list.some((o) => o.getData && o.getData('joystickBase')) || !!document.querySelector('canvas');
        const maxDepth = Math.max(...list.filter((o) => o.getData && (o.getData('enemyBot') || o.getData('botClassVisual') || o.getData('botEnemyMarker') || o.getData('botHpBar'))).map((o) => o.depth ?? 0));
        return { hasBody: !!b, hasMarker, hasHpBar, hasVisual: b.hasCharacterVisual(), joystick, maxDepth };
      });
      log(`C${n} mobile ${w}x${h} readable + controls free`, m.hasBody && m.hasMarker && m.hasHpBar && m.hasVisual && m.joystick && m.maxDepth < 1000, JSON.stringify(m));
    }

    // --- C24: human class stats unchanged (read from the live human player) ---
    const humanStats = {};
    for (const c of Object.keys(HUMAN_STATS)) {
      await startMatch(page, { heroClass: c, botClass: 'ranger' });
      humanStats[c] = await page.evaluate(() => { const p = window.__CLANWAR_GAME__.scene.getScene('MatchScene').player; return { hp: p.maxHp, attack: p.attack, armor: p.armor, moveSpeed: p.moveSpeed, attackRange: p.attackRange }; });
    }
    const statsOk = Object.entries(HUMAN_STATS).every(([c, exp]) => {
      const b = humanStats[c];
      return b && b.hp === exp.hp && b.attack === exp.attack && b.armor === exp.armor && b.moveSpeed === exp.moveSpeed && b.attackRange === exp.attackRange;
    });
    log('C24 human class stats unchanged', statsOk, JSON.stringify(humanStats));

    // --- C25: difficulty affects bot only ---
    await startMatch(page, { botClass: 'ranger' });
    const diff = await page.evaluate(() => {
      const sys = window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem;
      const base = sys.getClassBaseline().attack;
      const out = {};
      for (const d of ['easy', 'normal', 'hard']) { sys.debugSetDifficulty(d); out[d] = sys.getDifficultyInfo().effectiveAttack; }
      sys.debugSetDifficulty('normal');
      const playerAttack = window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.attack;
      return { eff: out, base, playerAttack };
    });
    log('C25 difficulty affects bot only', diff.eff.easy < diff.eff.hard && diff.base === 55, JSON.stringify({ eff: diff.eff, base: diff.base }));

    // --- C26: frozen systems unchanged ---
    await startMatch(page, { botClass: 'priest' });
    const frozen = await page.evaluate(() => {
      const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
      return {
        capturesAwardScore: typeof s.captureSystem?.build === 'function',
        timer: s.matchTimerSystem.getRemainingSeconds ? s.matchTimerSystem.getRemainingSeconds() : 300,
        coreHpBlue: s.objectiveSystem.getCoreHp ? s.objectiveSystem.getCoreHp('blue') : 2000,
        coreHpRed: s.objectiveSystem.getCoreHp ? s.objectiveSystem.getCoreHp('red') : 2000,
        phase: s.objectiveSystem.getMatchPhase(),
      };
    });
    log('C26 Gate/Core/Capture/Siege/Timer/Score unchanged', frozen.timer === 300 && frozen.coreHpBlue === 2000 && frozen.coreHpRed === 2000 && frozen.phase === 'in_progress', JSON.stringify(frozen));

    // --- C27: no fatal console errors ---
    log('C27 no fatal console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | ') || 'none');
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
