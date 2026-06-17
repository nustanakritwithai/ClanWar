/**
 * Phase 4C-B Siege Ruins gate damage bonus regression.
 * Usage: node scripts/phase-4c-b-siege-buff-regression.mjs [baseUrl]
 */
import puppeteer from 'puppeteer';

const BASE_URL = process.argv[2] ?? 'http://127.0.0.1:4173';
const results = [];
const log = (t, p, d = '') => {
  results.push({ t, p });
  console.log(`${p ? 'PASS' : 'FAIL'}: ${t}${d ? ` — ${d}` : ''}`);
};

async function startMatch(page, viewport = { width: 1280, height: 720 }, heroClass = 'warrior') {
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.setViewport(viewport);
  await page.evaluate((hc) => window.__CLANWAR_GAME__.scene.start('MatchScene', { heroClass: hc }), heroClass);
  await page.waitForFunction(
    () =>
      window.__CLANWAR_GAME__?.scene?.getScene('MatchScene')?.objectiveSystem &&
      window.__CLANWAR_GAME__?.scene?.getScene('MatchScene')?.captureSystem &&
      window.__CLANWAR_GAME__?.scene?.getScene('MatchScene')?.siegeBuffSystem,
  );
  await new Promise((r) => setTimeout(r, 500));
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !/404|favicon/i.test(m.text())) errs.push(m.text());
  });

  await startMatch(page);

  const r1 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const raw = s.objectiveSystem.debugComputeGateRawDamage('redGate', 100, 'blue');
    const bonus = s.objectiveSystem.getSiegeGateBonusConstant();
    return { raw, bonus, neutral: s.captureSystem.getSiegeRuinsState()?.owner === 'neutral' };
  });
  log(
    'R1 neutral Siege Ruins baseline gate damage',
    r1.neutral && r1.raw === 100 && r1.bonus === 0.3,
    `raw=${r1.raw} bonus=${r1.bonus}`,
  );

  const r2 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugSetSiegeRuinsState('blue', 'idle');
    s.siegeBuffSystem.update(100);
    const raw = s.objectiveSystem.debugComputeGateRawDamage('redGate', 100, 'blue');
    const hpBefore = s.objectiveSystem.getSnapshots().find((o) => o.id === 'redGate').currentHp;
    s.objectiveSystem.debugDealDamage('redGate', 100, 'blue');
    const hpAfter = s.objectiveSystem.getSnapshots().find((o) => o.id === 'redGate').currentHp;
    return { raw, hpLoss: hpBefore - hpAfter, buff: s.captureSystem.siegeBuffActive('blue') };
  });
  log(
    'R2 blue owns uncontested +30% vs red gate',
    r2.buff && r2.raw === 130 && r2.hpLoss === 118,
    `raw=${r2.raw} hpLoss=${r2.hpLoss}`,
  );

  await startMatch(page);
  const r3 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugSetSiegeRuinsState('red', 'idle');
    s.siegeBuffSystem.update(100);
    const raw = s.objectiveSystem.debugComputeGateRawDamage('blueGate', 100, 'red');
    const hpBefore = s.objectiveSystem.getSnapshots().find((o) => o.id === 'blueGate').currentHp;
    s.objectiveSystem.debugDealDamage('blueGate', 100, 'red');
    const hpAfter = s.objectiveSystem.getSnapshots().find((o) => o.id === 'blueGate').currentHp;
    return { raw, hpLoss: hpBefore - hpAfter, buff: s.captureSystem.siegeBuffActive('red') };
  });
  log(
    'R3 red owns uncontested +30% vs blue gate',
    r3.buff && r3.raw === 130 && r3.hpLoss === 118,
    `raw=${r3.raw} hpLoss=${r3.hpLoss}`,
  );

  await startMatch(page);
  const r4 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugSetSiegeRuinsState('blue', 'contested');
    s.siegeBuffSystem.update(100);
    const blueRaw = s.objectiveSystem.debugComputeGateRawDamage('redGate', 100, 'blue');
    const redRaw = s.objectiveSystem.debugComputeGateRawDamage('blueGate', 100, 'red');
    return {
      blueRaw,
      redRaw,
      blueBuff: s.captureSystem.siegeBuffActive('blue'),
      redBuff: s.captureSystem.siegeBuffActive('red'),
    };
  });
  log(
    'R4 contested disables bonus for both teams',
    !r4.blueBuff && !r4.redBuff && r4.blueRaw === 100 && r4.redRaw === 100,
    JSON.stringify(r4),
  );

  await startMatch(page);
  const r5 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugSetSiegeRuinsState('blue', 'idle');
    s.siegeBuffSystem.update(100);
    const enemyRaw = s.objectiveSystem.debugComputeGateRawDamage('redGate', 100, 'blue');
    const friendlyRaw = s.objectiveSystem.debugComputeGateRawDamage('blueGate', 100, 'blue');
    return { enemyRaw, friendlyRaw };
  });
  log(
    'R5 bonus applies to enemy gate only',
    r5.enemyRaw === 130 && r5.friendlyRaw === 100,
    `enemy=${r5.enemyRaw} friendly=${r5.friendlyRaw}`,
  );

  await startMatch(page);
  const r6 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugSetSiegeRuinsState('blue', 'idle');
    s.siegeBuffSystem.update(100);
    const hpBefore = s.objectiveSystem.getSnapshots().find((o) => o.id === 'redCore').currentHp;
    s.objectiveSystem.applyMeleeArcDamage({
      ownerTeam: 'blue',
      casterX: 1500,
      casterY: 350,
      facingAngle: Math.PI / 2,
      range: 220,
      rawDamage: 500,
    });
    const hpAfter = s.objectiveSystem.getSnapshots().find((o) => o.id === 'redCore').currentHp;
    return { hpBefore, hpAfter, blocked: s.objectiveSystem.getLastBlockedLog() };
  });
  log(
    'R6 bonus does not apply to core',
    r6.hpBefore === r6.hpAfter && r6.blocked.includes('protected'),
    JSON.stringify(r6),
  );

  await startMatch(page);
  const r7 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugSetSiegeRuinsState('blue', 'idle');
    s.siegeBuffSystem.update(100);
    const dummyHpBefore = s.dummy.currentHp ?? s.dummy.hp;
    s.dummy.takeDamage(100);
    const dummyHpAfter = s.dummy.currentHp ?? s.dummy.hp;
    return { dummyLoss: dummyHpBefore - dummyHpAfter };
  });
  log('R7 bonus does not apply to hero/dummy', r7.dummyLoss > 0 && r7.dummyLoss < 110, `loss=${r7.dummyLoss}`);

  await startMatch(page);
  const r8 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugSetSiegeRuinsState('blue', 'idle');
    const before = s.captureSystem.getSnapshots().find((o) => o.id === 'siegeRuins');
    s.objectiveSystem.debugDealDamage('redGate', 100, 'blue');
    const after = s.captureSystem.getSnapshots().find((o) => o.id === 'siegeRuins');
    return {
      ownerSame: before.owner === after.owner,
      progressSame: before.captureProgress === after.captureProgress,
    };
  });
  log(
    'R8 bonus does not apply to capture objectives',
    r8.ownerSame && r8.progressSame,
    JSON.stringify(r8),
  );

  await startMatch(page);
  const r9 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugSetSiegeRuinsState('blue', 'idle');
    s.siegeBuffSystem.update(100);
    const hpBefore = s.objectiveSystem.getSnapshots().find((o) => o.id === 'redGate').currentHp;
    const seg = s.objectiveSystem.handleProjectileSegmentHit('blue', 1500, 850, 1500, 1150, 14, 100);
    const hpAfter = s.objectiveSystem.getSnapshots().find((o) => o.id === 'redGate').currentHp;
    return { hit: seg.hit, hpLoss: hpBefore - hpAfter, objectiveId: seg.objectiveId };
  });
  log(
    'R9 projectile gate damage uses bonus path',
    r9.hit && r9.objectiveId === 'redGate' && r9.hpLoss === 118,
    JSON.stringify(r9),
  );

  await startMatch(page);
  const r10 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugSetSiegeRuinsState('blue', 'idle');
    s.siegeBuffSystem.update(100);
    const meleeHpBefore = s.objectiveSystem.getSnapshots().find((o) => o.id === 'redGate').currentHp;
    s.objectiveSystem.applyMeleeArcDamage({
      ownerTeam: 'blue',
      casterX: 1500,
      casterY: 850,
      facingAngle: Math.PI / 2,
      range: 220,
      rawDamage: 100,
    });
    const meleeHpAfter = s.objectiveSystem.getSnapshots().find((o) => o.id === 'redGate').currentHp;
    const aoeHpBefore = meleeHpAfter;
    s.objectiveSystem.applyAoeDamage({
      ownerTeam: 'blue',
      centerX: 1500,
      centerY: 1000,
      radius: 120,
      rawDamage: 100,
    });
    const aoeHpAfter = s.objectiveSystem.getSnapshots().find((o) => o.id === 'redGate').currentHp;
    return {
      meleeLoss: meleeHpBefore - meleeHpAfter,
      aoeLoss: aoeHpBefore - aoeHpAfter,
    };
  });
  log(
    'R10 melee and AoE gate damage use bonus path',
    r10.meleeLoss === 118 && r10.aoeLoss === 118,
    JSON.stringify(r10),
  );

  await startMatch(page);
  const r11 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.siegeBuffSystem.update(100);
    s.captureSystem.debugSetSiegeRuinsState('blue', 'idle');
    s.siegeBuffSystem.update(100);
    const activeToast = s.siegeBuffSystem.getLastToast();
    s.captureSystem.debugSetSiegeRuinsState('neutral', 'idle');
    s.siegeBuffSystem.update(100);
    const lostToast = s.siegeBuffSystem.getLastToast();
    s.captureSystem.debugSetSiegeRuinsState('red', 'idle');
    s.siegeBuffSystem.update(100);
    const enemyToast = s.siegeBuffSystem.getLastToast();
    const copies = [activeToast, lostToast, enemyToast];
    return {
      activeToast,
      lostToast,
      enemyToast,
      snake: copies.some((t) => /[a-z]+_[a-z]+/.test(t)),
    };
  });
  log(
    'R11 siege buff copy with no snake_case',
    r11.activeToast === 'Siege Buff Active' &&
      r11.lostToast === 'Siege Buff Lost' &&
      r11.enemyToast === 'Enemy Siege Buff Active' &&
      !r11.snake,
    JSON.stringify(r11),
  );

  await startMatch(page);
  const r12 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugSetSiegeRuinsState('blue', 'idle');
    s.siegeBuffSystem.update(100);
    const before = s.siegeBuffSystem.getToastCount();
    s.objectiveSystem.debugDealDamage('redGate', 50, 'blue');
    const afterFirst = s.siegeBuffSystem.getToastCount();
    s.objectiveSystem.debugDealDamage('redGate', 50, 'blue');
    const afterSecond = s.siegeBuffSystem.getToastCount();
    return {
      last: s.siegeBuffSystem.getLastToast(),
      deltaFirst: afterFirst - before,
      deltaSecond: afterSecond - afterFirst,
    };
  });
  log(
    'R12 Siege Bonus gate hit feedback throttled',
    r12.last === 'Siege Bonus' && r12.deltaFirst === 1 && r12.deltaSecond === 0,
    JSON.stringify(r12),
  );

  await startMatch(page);
  await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugSetSiegeRuinsState('blue', 'idle');
    s.siegeBuffSystem.update(100);
    s.objectiveSystem.debugDealDamage('redGate', 100, 'blue');
  });
  await page.evaluate(() => window.__CLANWAR_GAME__.scene.start('MenuScene'));
  await new Promise((r) => setTimeout(r, 150));
  await startMatch(page);
  const r13 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const raw = s.objectiveSystem.debugComputeGateRawDamage('redGate', 100, 'blue');
    return {
      raw,
      neutral: s.captureSystem.getSiegeRuinsState()?.owner === 'neutral',
      badge: s.siegeBuffSystem.isPlayerBadgeVisible(),
      gateHud: s.objectiveSystem.getHudLabel(),
    };
  });
  log(
    'R13 menu match reset clears buff and baseline damage',
    r13.neutral && r13.raw === 100 && !r13.badge && r13.gateHud === 'Attack the Gate',
    JSON.stringify(r13),
  );

  await startMatch(page, { width: 915, height: 412 });
  const r14 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugSetSiegeRuinsState('blue', 'idle');
    s.siegeBuffSystem.update(100);
    return {
      joy: !!s.movement,
      badge: s.siegeBuffSystem.isPlayerBadgeVisible(),
      gateHud: s.objectiveSystem.getHudLabel(),
      labelVisible: s.siegeBuffSystem.getLastToast(),
    };
  });
  log(
    'R14 mobile 915×412 playable with siege badge',
    r14.joy && r14.badge && r14.gateHud === 'Attack the Gate',
    JSON.stringify(r14),
  );

  await startMatch(page, { width: 800, height: 360 });
  const r15 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugSetSiegeRuinsState('blue', 'idle');
    s.siegeBuffSystem.update(100);
    return {
      joy: !!s.movement,
      badge: s.siegeBuffSystem.isPlayerBadgeVisible(),
      gateHud: s.objectiveSystem.getHudLabel(),
    };
  });
  log(
    'R15 mobile 800×360 playable with icon badge',
    r15.joy && r15.badge && r15.gateHud === 'Attack the Gate',
    JSON.stringify(r15),
  );

  await startMatch(page);
  const r16 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const gateHud = s.objectiveSystem.getHudLabel();
    s.objectiveSystem.applyMeleeArcDamage({
      ownerTeam: 'blue',
      casterX: 1500,
      casterY: 350,
      facingAngle: Math.PI / 2,
      range: 220,
      rawDamage: 500,
    });
    const coreFeedback = s.objectiveSystem.getLastWorldFeedback();
    s.objectiveSystem.debugDealDamage('redGate', 5000, 'blue');
    const breached = s.objectiveSystem.getLastWorldFeedback();
    s.objectiveSystem.debugDealDamage('redCore', 5000, 'blue');
    const phase = s.objectiveSystem.getMatchPhase();
    return { gateHud, coreFeedback, breached, phase, priority: s.objectiveSystem.getPriority() };
  });
  log(
    'R16 gate/core regression intact',
    r16.gateHud === 'Attack the Gate' &&
      r16.coreFeedback === 'Destroy Gate first' &&
      r16.breached === 'Gate Breached' &&
      r16.phase === 'victory',
    JSON.stringify(r16),
  );

  await startMatch(page);
  const r17 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const hud = s.objectiveSystem.getHudLabel();
    const phase = s.objectiveSystem.getMatchPhase();
    const texts = s.children.list
      .map((o) => (typeof o.text === 'string' ? o.text : ''))
      .filter(Boolean)
      .join('|');
    return {
      hud,
      phase,
      hasTimerWin: /sudden death|timer win|score win/i.test(texts),
    };
  });
  log(
    'R17 no 4C-C timer/score win behavior',
    r17.phase === 'in_progress' && r17.hud === 'Attack the Gate' && !r17.hasTimerWin,
    JSON.stringify(r17),
  );

  log('No console errors', errs.length === 0, errs.join('; ') || 'none');

  await browser.close();

  const failed = results.filter((r) => !r.p);
  console.log(`\nSUMMARY ${results.length - failed.length}/${results.length}`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
