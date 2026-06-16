/**
 * Phase 4C-A capture foundation regression.
 * Usage: node scripts/phase-4c-a-capture-regression.mjs [baseUrl]
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
      window.__CLANWAR_GAME__?.scene?.getScene('MatchScene')?.captureSystem &&
      window.__CLANWAR_GAME__?.scene?.getScene('MatchScene')?.objectiveSystem,
  );
  await new Promise((r) => setTimeout(r, 500));
}

async function tickCapture(page, objectiveId, ms, enemy = false) {
  return page.evaluate(
    ({ id, totalMs, withEnemy }) => {
      const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
      const cap = s.captureSystem;
      cap.simulatePlayerAtObjective(withEnemy ? null : id);
      cap.simulateEnemyAtObjective(withEnemy ? id : null);
      if (!withEnemy) cap.simulateEnemyAtObjective(null);
      if (withEnemy) cap.simulatePlayerAtObjective(id);
      const steps = Math.ceil(totalMs / 100);
      for (let i = 0; i < steps; i++) {
        cap.update(100, 1500, 2100, 'blue');
      }
      const snap = cap.getSnapshots().find((o) => o.id === id);
      return {
        progress: snap?.captureProgress ?? 0,
        state: snap?.captureState,
        owner: snap?.owner,
        blueScore: cap.getTeamScore('blue'),
        feedback: cap.getLastFeedback(),
        feedbackCount: cap.getFeedbackCount(),
      };
    },
    { id: objectiveId, totalMs: ms, withEnemy: enemy },
  );
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
    const cap = window.__CLANWAR_GAME__.scene.getScene('MatchScene').captureSystem;
    const snaps = cap.getSnapshots();
    return {
      count: cap.getCaptureCount(),
      allNeutral: snaps.every((s) => s.owner === 'neutral' && s.captureProgress === 0),
      ids: snaps.map((s) => s.id).sort().join(','),
    };
  });
  log('R-1 objectives present and neutral', r1.count === 6 && r1.allNeutral, `${r1.count} ids=${r1.ids}`);

  let r2 = await tickCapture(page, 'siegeRuins', 2000, false);
  log('R-2 presence fills progress', r2.progress > 20 && r2.state === 'capturing', `progress=${r2.progress.toFixed(1)} state=${r2.state}`);

  const progressBeforeExit = r2.progress;
  const r3a = await page.evaluate(() => {
    const cap = window.__CLANWAR_GAME__.scene.getScene('MatchScene').captureSystem;
    cap.simulatePlayerAtObjective(null);
    cap.update(500, 1500, 3900, 'blue');
    const snap = cap.getSnapshots().find((o) => o.id === 'siegeRuins');
    return { progress: snap?.captureProgress ?? 0, state: snap?.captureState };
  });
  log(
    'R-3 exit pauses progress',
    r3a.progress >= progressBeforeExit - 1 && r3a.state === 'idle',
    `before=${progressBeforeExit.toFixed(1)} after=${r3a.progress.toFixed(1)} state=${r3a.state}`,
  );

  await startMatch(page);
  const progressBeforeContest = await page.evaluate(() => {
    const cap = window.__CLANWAR_GAME__.scene.getScene('MatchScene').captureSystem;
    cap.simulatePlayerAtObjective('siegeRuins');
    for (let i = 0; i < 15; i++) cap.update(200, 1500, 2100, 'blue');
    return cap.getSnapshots().find((o) => o.id === 'siegeRuins')?.captureProgress ?? 0;
  });
  const r4 = await page.evaluate(() => {
    const cap = window.__CLANWAR_GAME__.scene.getScene('MatchScene').captureSystem;
    cap.simulatePlayerAtObjective('siegeRuins');
    cap.simulateEnemyAtObjective('siegeRuins');
    for (let i = 0; i < 20; i++) cap.update(200, 1500, 2100, 'blue');
    const snap = cap.getSnapshots().find((o) => o.id === 'siegeRuins');
    return {
      progress: snap?.captureProgress ?? 0,
      state: snap?.captureState,
      hud: cap.getCaptureHudLabel(),
    };
  });
  log(
    'R-4 contest freezes progress',
    r4.state === 'contested' && r4.progress <= progressBeforeContest + 1,
    `progress=${r4.progress.toFixed(1)} was=${progressBeforeContest.toFixed(1)} hud=${r4.hud}`,
  );

  await startMatch(page);
  const r5 = await tickCapture(page, 'resourceCampL', 7200, false);
  log('R-5 capture flips owner', r5.owner === 'blue', `owner=${r5.owner} state=${r5.state}`);

  await startMatch(page);
  const r6 = await page.evaluate(() => {
    const cap = window.__CLANWAR_GAME__.scene.getScene('MatchScene').captureSystem;
    cap.simulatePlayerAtObjective('watchtower');
    for (let i = 0; i < 80; i++) cap.update(100, 1500, 1600, 'blue');
    const score1 = cap.getTeamScore('blue');
    for (let i = 0; i < 20; i++) cap.update(100, 1500, 1600, 'blue');
    const score2 = cap.getTeamScore('blue');
    return { score1, score2, owner: cap.getSnapshots().find((o) => o.id === 'watchtower')?.owner };
  });
  log('R-6 score awarded once', r6.score1 === 5 && r6.score2 === 5 && r6.owner === 'blue', JSON.stringify(r6));

  const resetRows = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const cap = window.__CLANWAR_GAME__.scene.getScene('MatchScene').captureSystem;
      cap.debugCompleteCapture('forwardCampL', 'blue');
    });
    await page.evaluate(() => window.__CLANWAR_GAME__.scene.start('MenuScene'));
    await new Promise((r) => setTimeout(r, 150));
    await page.evaluate(() => window.__CLANWAR_GAME__.scene.start('MatchScene', { heroClass: 'guardian' }));
    await page.waitForFunction(() => window.__CLANWAR_GAME__?.scene?.getScene('MatchScene')?.captureSystem);
    await new Promise((r) => setTimeout(r, 350));
    const row = await page.evaluate(() => {
      const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
      const cap = s.captureSystem;
      const snaps = cap.getSnapshots();
      return {
        count: cap.getCaptureCount(),
        neutral: snaps.every((o) => o.owner === 'neutral' && o.captureProgress === 0),
        score: cap.getTeamScore('blue'),
        hud: s.objectiveSystem.getHudLabel(),
      };
    });
    resetRows.push(row);
  }
  log(
    'R-7 reset clears owner progress score',
    resetRows.every((r) => r.count === 6 && r.neutral && r.score === 0 && r.hud === 'Attack the Gate'),
    resetRows.map((r) => `${r.score}/${r.hud}`).join(','),
  );

  await startMatch(page, { width: 915, height: 412 });
  const m915 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.simulatePlayerAtObjective('siegeRuins');
    for (let i = 0; i < 5; i++) s.captureSystem.update(200, 1500, 2100, 'blue');
    return {
      joy: !!s.movement,
      hud: s.captureSystem.getCaptureHudLabel(),
      gateHud: s.objectiveSystem.getHudLabel(),
    };
  });
  log(
    'R-8 mobile 915×412 readable',
    m915.joy && m915.hud.includes('Capturing') && m915.gateHud === 'Attack the Gate',
    JSON.stringify(m915),
  );

  await startMatch(page, { width: 800, height: 360 });
  const m800 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.simulatePlayerAtObjective('siegeRuins');
    for (let i = 0; i < 5; i++) s.captureSystem.update(200, 1500, 2100, 'blue');
    return { joy: !!s.movement, hud: s.captureSystem.getCaptureHudLabel() };
  });
  log('R-8 mobile 800×360 readable', m800.joy && m800.hud.includes('Capturing'), JSON.stringify(m800));

  await startMatch(page);
  const r9 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const gateHud = s.objectiveSystem.getHudLabel();
    s.objectiveSystem.applyMeleeArcDamage({
      ownerTeam: 'blue',
      casterX: 1500,
      casterY: 350,
      facingAngle: Math.PI / 2,
      range: 220,
      rawDamage: 500,
      playerGateDamageBonus: 0,
    });
    const feedback = s.objectiveSystem.getLastWorldFeedback();
    const redCore = s.objectiveSystem.getSnapshots().find((o) => o.id === 'redCore');
    return { gateHud, feedback, redCoreHp: redCore?.currentHp, redCoreState: redCore?.combatState };
  });
  log(
    'R-9 gate/core protected feedback intact',
    r9.gateHud === 'Attack the Gate' && r9.feedback === 'Destroy Gate first' && r9.redCoreState === 'protected',
    JSON.stringify(r9),
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
