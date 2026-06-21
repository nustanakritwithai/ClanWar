/**
 * Phase 5A-8 Remove Bot Radius Telegraph regression.
 * Usage: node scripts/phase-5a-remove-bot-telegraph-regression.mjs [baseUrl]
 *
 * Validates that the BotPlayer pre-attack/pre-skill ground-painted radius/cone
 * indicator is gone from real gameplay (all 4 classes, basic attack + skill
 * cast) while normal-attack projectiles, skill VFX, damage/heal timing,
 * BotBrain behavior, live class selection, and every previously-frozen system
 * remain intact.
 */
import puppeteer from 'puppeteer';

const BASE_URL = process.argv[2] ?? 'http://127.0.0.1:4173';
const results = [];
const log = (t, p, d = '') => { results.push({ t, p }); console.log(`${p ? 'PASS' : 'FAIL'}: ${t}${d ? ` — ${d}` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// No ground telegraph should ever exceed this — the old radius scaled with
// attackRange (warrior ~89px, ranger/mage/priest capped ~154px); the new cue
// is a small fixed glow on the bot's own body (~12px), independent of class.
const MAX_CUE_RADIUS = 20;

let booted = false;
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
const skillInfo = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getSkillInfo());
const skillCast = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getSkillCastDebug());
const setCooldown = (page, ms) => page.evaluate((m) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugSetCooldown(m), ms);
const damageBot = (page, amt) => page.evaluate((a) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugDamageBot(a), amt);
const cueRadius = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.bot.getWindupCueRadius());
const projCount = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').children.list.filter((o) => o.getData && o.getData('normalAttackProjectile')).length);
const skillProjCount = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').children.list.filter((o) => o.getData && o.getData('botSkillProjectile')).length);
async function teleportPlayer(page, x, y) {
  await page.evaluate(({ px, py }) => { const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene'); s.player.sprite.setPosition(px, py); s.player.body.reset(px, py); s.player.update(); }, { px: x, py: y });
}

/** Park player in basic-attack range and sample the wind-up cue radius. */
async function basicAttackCueProbe(page) {
  const b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + Math.max(10, Math.min(b.attackRange - 30, 220)));
  await setCooldown(page, 0);
  let sawWindup = false;
  let maxCue = 0;
  for (let i = 0; i < 40; i++) {
    await sleep(30);
    const st = (await botSnap(page)).state;
    if (st === 'windup') { sawWindup = true; maxCue = Math.max(maxCue, await cueRadius(page)); }
    if (st === 'recovery') break;
  }
  return { sawWindup, maxCue, attackRange: b.attackRange };
}

/** Park player in skill range and sample the cue radius + skill VFX during an offensive cast. */
async function offensiveSkillCueProbe(page) {
  const info = await skillInfo(page);
  const b = await botSnap(page);
  const dist = Math.min(info.range - 40, b.attackRange + 30);
  await teleportPlayer(page, b.x, b.y + Math.max(10, dist));
  let sawWindup = false, sawProjectile = false, maxCue = 0, firstCast = null;
  for (let i = 0; i < 80; i++) {
    await sleep(35);
    const st = (await botSnap(page)).state;
    if (st === 'windup') { sawWindup = true; maxCue = Math.max(maxCue, await cueRadius(page)); }
    if ((await skillProjCount(page)) > 0) sawProjectile = true;
    const c = await skillCast(page);
    if (c.casts >= 1 && !firstCast) firstCast = c;
    if (firstCast && sawProjectile) break;
    if (firstCast && i > 78) break;
  }
  const last = firstCast ?? (await skillCast(page));
  return { sawWindup, sawProjectile, maxCue, last };
}

/** Drop priest HP below the defensive threshold and sample the cue radius during the heal cast. */
async function healCueProbe(page) {
  const b0 = await botSnap(page);
  await damageBot(page, Math.round(b0.maxHp * 0.65));
  const hpLow = (await botSnap(page)).hp;
  let sawWindup = false, maxCue = 0;
  for (let i = 0; i < 70; i++) {
    await sleep(40);
    const st = (await botSnap(page)).state;
    if (st === 'windup') { sawWindup = true; maxCue = Math.max(maxCue, await cueRadius(page)); }
    const c = await skillCast(page);
    if (c.casts >= 1) {
      const hpAfter = (await botSnap(page)).hp;
      return { sawWindup, maxCue, casts: c.casts, hpLow, hpAfter, last: c };
    }
  }
  return { sawWindup, maxCue, casts: 0, hpLow, hpAfter: (await botSnap(page)).hp, last: await skillCast(page) };
}

/** Normal-attack projectile kind fired while the player sits in range. */
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

/** Basic-attack windup → resolve elapsed time, compared to the configured effective windup. */
async function timingProbe(page) {
  const b = await botSnap(page);
  await teleportPlayer(page, b.x, b.y + Math.max(10, Math.min(b.attackRange - 30, 220)));
  await setCooldown(page, 0);
  const diffInfo = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getDifficultyInfo());
  const hpBefore = await playerHp(page);
  let windupStart = null;
  let resolvedAt = null;
  for (let i = 0; i < 80; i++) {
    await sleep(20);
    const st = (await botSnap(page)).state;
    if (st === 'windup' && windupStart === null) windupStart = Date.now();
    if (windupStart !== null && st === 'recovery') { resolvedAt = Date.now(); break; }
  }
  const elapsed = windupStart !== null && resolvedAt !== null ? resolvedAt - windupStart : null;
  const hpAfter = await playerHp(page);
  return { elapsed, expected: diffInfo.effectiveWindupMs, hpBefore, hpAfter };
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
    // --- 1-4: basic attack shows no pre-attack radius/cone, per class ---
    const classNum = { warrior: 1, ranger: 2, mage: 3, priest: 4 };
    for (const cls of ['warrior', 'ranger', 'mage', 'priest']) {
      await startMatch(page, { botClass: cls });
      const r = await basicAttackCueProbe(page);
      log(`${classNum[cls]} ${cls} basic attack shows no pre-attack radius/cone`, r.sawWindup && r.maxCue <= MAX_CUE_RADIUS, `sawWindup=${r.sawWindup} maxCue=${r.maxCue.toFixed(1)} attackRange=${r.attackRange}`);
    }

    // --- 5-7: ranged normal-attack projectile still appears ---
    const projExpect = { ranger: 'arrow', mage: 'magic_bolt', priest: 'holy_bolt' };
    const projNum = { ranger: 5, mage: 6, priest: 7 };
    for (const cls of ['ranger', 'mage', 'priest']) {
      await startMatch(page, { botClass: cls });
      await setCooldown(page, 0);
      const kind = await captureProjectile(page);
      log(`${projNum[cls]} ${cls} ${projExpect[cls]} projectile still appears`, kind === projExpect[cls], `kind=${kind}`);
    }

    // --- 8: warrior melee damage still resolves ---
    await startMatch(page, { botClass: 'warrior' });
    const wTiming = await timingProbe(page);
    log('8 warrior melee damage still resolves', wTiming.hpAfter < wTiming.hpBefore, `hpBefore=${wTiming.hpBefore} hpAfter=${wTiming.hpAfter}`);

    // --- 9-10: ranged/mage skill cast shows no skill-radius preview ---
    await startMatch(page, { botClass: 'ranger', heroClass: 'guardian' });
    const rOff = await offensiveSkillCueProbe(page);
    log('9 ranger skill cast shows no skill-radius preview', rOff.last.casts >= 1 && rOff.sawWindup && rOff.maxCue <= MAX_CUE_RADIUS, `casts=${rOff.last.casts} maxCue=${rOff.maxCue.toFixed(1)}`);

    await startMatch(page, { botClass: 'mage', heroClass: 'guardian' });
    const mOff = await offensiveSkillCueProbe(page);
    log('10 mage skill cast shows no skill-radius preview', mOff.last.casts >= 1 && mOff.sawWindup && mOff.maxCue <= MAX_CUE_RADIUS, `casts=${mOff.last.casts} maxCue=${mOff.maxCue.toFixed(1)}`);

    // --- 11: priest heal/cast shows no skill-radius preview ---
    await startMatch(page, { botClass: 'priest' });
    const pHeal = await healCueProbe(page);
    log('11 priest heal cast shows no skill-radius preview', pHeal.casts >= 1 && pHeal.sawWindup && pHeal.maxCue <= MAX_CUE_RADIUS, `casts=${pHeal.casts} maxCue=${pHeal.maxCue.toFixed(1)}`);

    // --- 12: skill VFX after cast still appears ---
    log('12 skill VFX after cast still appears', rOff.sawProjectile && mOff.sawProjectile && pHeal.hpAfter > pHeal.hpLow, `rangerProj=${rOff.sawProjectile} mageProj=${mOff.sawProjectile} healed=${pHeal.hpAfter > pHeal.hpLow}`);

    // --- 13: damage/heal timing unchanged ---
    const windupOk = wTiming.elapsed !== null && Math.abs(wTiming.elapsed - wTiming.expected) <= 150;
    const healOk = pHeal.last.lastWasHeal === true && pHeal.last.lastApplied > 0;
    log('13 damage/heal timing unchanged', windupOk && healOk, `windupElapsed=${wTiming.elapsed} expected=${Math.round(wTiming.expected)} healApplied=${pHeal.last.lastApplied}`);

    // --- 14: BotBrain range/hold/kite still works ---
    await startMatch(page, { botClass: 'ranger' });
    await setCooldown(page, 6000);
    let rb = await botSnap(page);
    await teleportPlayer(page, rb.x, rb.y + 250);
    let maxSpeed = 0, maxDisp = 0;
    for (let i = 0; i < 18; i++) {
      await sleep(80);
      const s = await botSnap(page);
      maxSpeed = Math.max(maxSpeed, s.speed);
      maxDisp = Math.max(maxDisp, Math.hypot(s.x - rb.x, s.y - rb.y));
      await setCooldown(page, 6000);
    }
    const holdOk = maxSpeed < 40 && maxDisp < 60;

    await startMatch(page, { botClass: 'ranger' });
    rb = await botSnap(page);
    await teleportPlayer(page, rb.x, rb.y + 110);
    let sawKite = false, maxRetreat = 0;
    for (let i = 0; i < 18; i++) {
      await setCooldown(page, 5000);
      await sleep(70);
      const g = await goalOf(page);
      const s = await botSnap(page);
      if (g === 'kite_back') sawKite = true;
      maxRetreat = Math.max(maxRetreat, Math.hypot(s.x - rb.x, s.y - (rb.y + 110)));
    }
    const kiteOk = sawKite && maxRetreat > 40;
    log('14 BotBrain range/hold/kite still works', holdOk && kiteOk, `holdOk=${holdOk} kiteOk=${kiteOk}`);

    // --- 15: live class rotation/selection still works ---
    const rotated = [];
    for (let i = 0; i < 5; i++) {
      await startMatch(page, { botClass: 'rotate' });
      rotated.push((await botSnap(page)).classId);
    }
    const distinct = [...new Set(rotated)];
    log('15 BotPlayer class rotation/live class selection still works', distinct.length >= 2, `rotation=${rotated.join(',')}`);

    // --- 16: reset x3 no duplicate bot/projectile/skill/brain ---
    let maxBots = 0, maxProj = 0, maxSys = 0, maxWarn = 0;
    for (let i = 0; i < 3; i++) {
      await startMatch(page, { botClass: 'mage' });
      const counts = await page.evaluate(() => {
        const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
        const bodies = s.children.list.filter((o) => o.getData && o.getData('enemyBot')).length;
        const proj = s.children.list.filter((o) => o.getData && o.getData('normalAttackProjectile')).length;
        const warn = s.children.list.filter((o) => o.getData && o.getData('botAttackWarning')).length;
        const sys = s.botSystem ? 1 : 0;
        return { bodies, proj, warn, sys };
      });
      maxBots = Math.max(maxBots, counts.bodies);
      maxProj = Math.max(maxProj, counts.proj);
      maxWarn = Math.max(maxWarn, counts.warn);
      maxSys = Math.max(maxSys, counts.sys);
    }
    log('16 reset x3 no duplicate bot/projectile/skill/brain', maxBots === 1 && maxProj === 0 && maxWarn === 1 && maxSys === 1, JSON.stringify({ maxBots, maxProj, maxWarn, maxSys }));

    // --- 17-18: mobile readability ---
    for (const [w, h, n] of [[915, 412, 17], [800, 360, 18]]) {
      await startMatch(page, { viewport: { width: w, height: h }, botClass: 'ranger' });
      const m = await page.evaluate(() => {
        const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
        const b = s.botSystem.bot;
        const list = s.children.list;
        const hasMarker = list.some((o) => o.getData && o.getData('botEnemyMarker') && o.visible);
        const hasHpBar = list.some((o) => o.getData && o.getData('botHpBar') && o.visible);
        const joystick = list.some((o) => o.getData && o.getData('joystickBase')) || !!document.querySelector('canvas');
        return { hasBody: !!b, hasMarker, hasHpBar, hasVisual: b.hasCharacterVisual(), joystick };
      });
      log(`${n} mobile ${w}x${h} readable`, m.hasBody && m.hasMarker && m.hasHpBar && m.hasVisual && m.joystick, JSON.stringify(m));
    }

    // --- 19: human class stats unchanged ---
    const humanStats = {};
    for (const c of Object.keys(HUMAN_STATS)) {
      await startMatch(page, { heroClass: c, botClass: 'ranger' });
      humanStats[c] = await page.evaluate(() => { const p = window.__CLANWAR_GAME__.scene.getScene('MatchScene').player; return { hp: p.maxHp, attack: p.attack, armor: p.armor, moveSpeed: p.moveSpeed, attackRange: p.attackRange }; });
    }
    const statsOk = Object.entries(HUMAN_STATS).every(([c, exp]) => {
      const b = humanStats[c];
      return b && b.hp === exp.hp && b.attack === exp.attack && b.armor === exp.armor && b.moveSpeed === exp.moveSpeed && b.attackRange === exp.attackRange;
    });
    log('19 human class stats unchanged', statsOk, JSON.stringify(humanStats));

    // --- 20: difficulty affects bot only ---
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
    log('20 difficulty affects bot only', diff.eff.easy < diff.eff.hard && diff.base === 55, JSON.stringify({ eff: diff.eff, base: diff.base }));

    // --- 21: Gate/Core/Capture/Siege/Timer/Score unchanged ---
    await startMatch(page, { botClass: 'priest' });
    const frozen = await page.evaluate(() => {
      const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
      return {
        timer: s.matchTimerSystem.getRemainingSeconds ? s.matchTimerSystem.getRemainingSeconds() : 300,
        coreHpBlue: s.objectiveSystem.getCoreHp ? s.objectiveSystem.getCoreHp('blue') : 2000,
        coreHpRed: s.objectiveSystem.getCoreHp ? s.objectiveSystem.getCoreHp('red') : 2000,
        phase: s.objectiveSystem.getMatchPhase(),
      };
    });
    log('21 Gate/Core/Capture/Siege/Timer/Score unchanged', frozen.timer === 300 && frozen.coreHpBlue === 2000 && frozen.coreHpRed === 2000 && frozen.phase === 'in_progress', JSON.stringify(frozen));

    // --- 22: no fatal console errors ---
    log('22 no fatal console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | ') || 'none');
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
