/**
 * Phase 4C-C match timer + Objective Score win regression.
 * Usage: node scripts/phase-4c-c-timer-score-regression.mjs [baseUrl]
 */
import puppeteer from 'puppeteer';

const BASE_URL = process.argv[2] ?? 'http://127.0.0.1:4173';
const results = [];
const log = (t, p, d = '') => {
  results.push({ t, p });
  console.log(`${p ? 'PASS' : 'FAIL'}: ${t}${d ? ` — ${d}` : ''}`);
};

let booted = false;

/**
 * Boot once, then restart matches in-page via the real Menu ↔ Match flow.
 * (Full page re-navigation against a live WebGL context is flaky under load.)
 */
async function startMatch(page, viewport = { width: 1280, height: 720 }, heroClass = 'warrior') {
  if (!booted) {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => !!window.__CLANWAR_GAME__);
    booted = true;
  }
  await page.setViewport(viewport);
  await page.evaluate(() => {
    const g = window.__CLANWAR_GAME__;
    ['MatchScene', 'ResultScene'].forEach((k) => {
      try {
        g.scene.stop(k);
      } catch (e) {
        /* ignore */
      }
    });
    g.scene.start('MenuScene');
  });
  await new Promise((r) => setTimeout(r, 150));
  await page.evaluate((hc) => {
    const g = window.__CLANWAR_GAME__;
    try {
      g.scene.stop('MenuScene');
    } catch (e) {
      /* ignore */
    }
    g.scene.start('MatchScene', { heroClass: hc });
  }, heroClass);
  await page.waitForFunction(() => {
    const s = window.__CLANWAR_GAME__?.scene?.getScene('MatchScene');
    return s?.objectiveSystem && s?.captureSystem && s?.siegeBuffSystem && s?.matchTimerSystem;
  });
  await new Promise((r) => setTimeout(r, 350));
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !/404|favicon/i.test(m.text())) errs.push(m.text());
  });

  // R1 — Timer starts at match start.
  await startMatch(page);
  const r1 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    return { remaining: s.matchTimerSystem.getRemainingSeconds(), expired: s.matchTimerSystem.isExpired() };
  });
  log('R1 timer starts at 300s', r1.remaining === 300 && !r1.expired, JSON.stringify(r1));

  // R2 — Timer counts down.
  await startMatch(page);
  const r2 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.matchTimerSystem.update(5000);
    return { remaining: s.matchTimerSystem.getRemainingSeconds() };
  });
  log('R2 timer counts down (295 after 5s)', r2.remaining === 295, JSON.stringify(r2));

  // R3 — Core destroyed before time-up = Core Victory (priority over score/time).
  await startMatch(page);
  const r3a = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugCompleteCapture('resourceCampR', 'red'); // give enemy a higher score
    s.objectiveSystem.debugDealDamage('redCore', 100000, 'blue'); // destroy enemy core
    return { phase: s.objectiveSystem.getMatchPhase() };
  });
  await new Promise((r) => setTimeout(r, 2200));
  const r3b = await page.evaluate(() => window.__CLANWAR_GAME__.registry.get('lastMatchResult'));
  log(
    'R3 core destroyed = Core Victory (overrides score)',
    r3a.phase === 'victory' && r3b?.outcome === 'victory' && r3b?.reason === 'enemy_core_destroyed',
    JSON.stringify({ ...r3a, result: r3b }),
  );

  // R4 — Time-up, Blue Objective Score higher = Blue Score Victory.
  await startMatch(page);
  const r4 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugCompleteCapture('resourceCampL', 'blue');
    s.matchTimerSystem.update(300000);
    return { expired: s.matchTimerSystem.isExpired(), res: s.computeTimeUpResolution() };
  });
  log(
    'R4 time-up blue score higher = score victory',
    r4.expired && r4.res.outcome === 'victory' && r4.res.reason === 'score_victory' && r4.res.blueScore === 5,
    JSON.stringify(r4),
  );

  // R5 — Time-up, Red Objective Score higher = Red Score Victory (player defeat).
  await startMatch(page);
  const r5 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugCompleteCapture('resourceCampR', 'red');
    s.matchTimerSystem.update(300000);
    return s.computeTimeUpResolution();
  });
  log(
    'R5 time-up red score higher = score defeat',
    r5.outcome === 'defeat' && r5.reason === 'score_defeat' && r5.redScore === 5,
    JSON.stringify(r5),
  );

  // R6 — Tied score + Blue Core HP higher = Blue HP Tiebreak Victory.
  await startMatch(page);
  const r6 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.objectiveSystem.debugDealDamage('redCore', 600, 'blue'); // lower enemy core HP only
    s.matchTimerSystem.update(300000);
    const res = s.computeTimeUpResolution();
    return { res, blueHp: s.objectiveSystem.getCoreHp('blue'), redHp: s.objectiveSystem.getCoreHp('red') };
  });
  log(
    'R6 tied score + blue core HP higher = HP tiebreak victory',
    r6.res.outcome === 'victory' && r6.res.reason === 'hp_tiebreak_victory' && r6.blueHp > r6.redHp,
    JSON.stringify(r6),
  );

  // R7 — Tied score + Red Core HP higher = Red HP Tiebreak Victory (player defeat).
  await startMatch(page);
  const r7 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.objectiveSystem.debugDealDamage('blueCore', 600, 'red'); // lower player core HP only
    s.matchTimerSystem.update(300000);
    const res = s.computeTimeUpResolution();
    return { res, blueHp: s.objectiveSystem.getCoreHp('blue'), redHp: s.objectiveSystem.getCoreHp('red') };
  });
  log(
    'R7 tied score + red core HP higher = HP tiebreak defeat',
    r7.res.outcome === 'defeat' && r7.res.reason === 'hp_tiebreak_defeat' && r7.redHp > r7.blueHp,
    JSON.stringify(r7),
  );

  // R8 — Tied score + tied Core HP = Draw (end-to-end: live loop resolves and transitions).
  await startMatch(page);
  await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.matchTimerSystem.update(300000); // expire with 0–0 score and full/equal cores
  });
  await new Promise((r) => setTimeout(r, 1800));
  const r8 = await page.evaluate(() => ({
    result: window.__CLANWAR_GAME__.registry.get('lastMatchResult'),
    resultActive: window.__CLANWAR_GAME__.scene.isActive('ResultScene'),
  }));
  log(
    'R8 tied score + tied core HP = Draw (and transitions to Result)',
    r8.result?.outcome === 'draw' && r8.result?.reason === 'draw' && r8.resultActive,
    JSON.stringify(r8),
  );

  // R9 — Objective Score does not trigger victory before timer reaches 0.
  await startMatch(page);
  const r9 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugCompleteCapture('resourceCampL', 'blue'); // blue ahead, but timer not expired
    s.matchTimerSystem.update(5000);
    return { phase: s.objectiveSystem.getMatchPhase(), expired: s.matchTimerSystem.isExpired() };
  });
  log(
    'R9 score lead does not win before time-up',
    r9.phase === 'in_progress' && !r9.expired,
    JSON.stringify(r9),
  );

  // R10 — Capture scoring still works.
  await startMatch(page);
  const r10 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugCompleteCapture('resourceCampL', 'blue');
    return { blue: s.captureSystem.getTeamScore('blue'), red: s.captureSystem.getTeamScore('red') };
  });
  log('R10 capture scoring still works', r10.blue === 5 && r10.red === 0, JSON.stringify(r10));

  // R11 — Siege Buff still works.
  await startMatch(page);
  const r11 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugSetSiegeRuinsState('blue', 'idle');
    s.siegeBuffSystem.update(100);
    return {
      raw: s.objectiveSystem.debugComputeGateRawDamage('redGate', 100, 'blue'),
      buff: s.captureSystem.siegeBuffActive('blue'),
    };
  });
  log('R11 siege buff gate bonus intact (+30%)', r11.buff && r11.raw === 130, JSON.stringify(r11));

  // R12 — Gate/Core HUD still works.
  await startMatch(page);
  const r12 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    return { hud: s.objectiveSystem.getHudLabel(), phase: s.objectiveSystem.getMatchPhase() };
  });
  log('R12 gate/core HUD intact', r12.hud === 'Attack the Gate' && r12.phase === 'in_progress', JSON.stringify(r12));

  // R13 — Menu ↔ Match reset clears timer/result state.
  await startMatch(page);
  await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugCompleteCapture('resourceCampL', 'blue');
    s.matchTimerSystem.update(300000);
  });
  await new Promise((r) => setTimeout(r, 1700));
  await page.evaluate(() => window.__CLANWAR_GAME__.scene.start('MenuScene'));
  await new Promise((r) => setTimeout(r, 200));
  await startMatch(page);
  const r13 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    return {
      remaining: s.matchTimerSystem.getRemainingSeconds(),
      expired: s.matchTimerSystem.isExpired(),
      phase: s.objectiveSystem.getMatchPhase(),
      blue: s.captureSystem.getTeamScore('blue'),
    };
  });
  log(
    'R13 menu↔match reset clears timer/result/score',
    r13.remaining === 300 && !r13.expired && r13.phase === 'in_progress' && r13.blue === 0,
    JSON.stringify(r13),
  );

  // R14 — Mobile 915×412 playable.
  await startMatch(page, { width: 915, height: 412 });
  const r14 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    return {
      joy: !!s.movement,
      timer: s.matchTimerSystem.getTimerLabel(),
      score: s.matchTimerSystem.getScoreLabel(),
      hud: s.objectiveSystem.getHudLabel(),
    };
  });
  log(
    'R14 mobile 915×412 playable with timer + score HUD',
    r14.joy && r14.timer.includes('Time Left') && r14.score.includes('Obj Score') && r14.hud === 'Attack the Gate',
    JSON.stringify(r14),
  );

  // R15 — Mobile 800×360 playable (compact timer/score).
  await startMatch(page, { width: 800, height: 360 });
  const r15 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    return {
      joy: !!s.movement,
      timer: s.matchTimerSystem.getTimerLabel(),
      score: s.matchTimerSystem.getScoreLabel(),
      hud: s.objectiveSystem.getHudLabel(),
    };
  });
  log(
    'R15 mobile 800×360 playable with compact HUD',
    r15.joy && r15.timer === '05:00' && /^\d+ – \d+$/.test(r15.score) && r15.hud === 'Attack the Gate',
    JSON.stringify(r15),
  );

  // R16 — No economy/EXP/Gold/shop/ranking strings in player-facing UI.
  await startMatch(page);
  const r16 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const texts = s.children.list
      .map((o) => (typeof o.text === 'string' ? o.text : ''))
      .filter(Boolean)
      .join(' | ');
    const all = `${texts} | ${s.matchTimerSystem.getTimerLabel()} | ${s.matchTimerSystem.getScoreLabel()}`;
    return { bad: /gold|\bexp\b|shop|ranking|currency|reward|payment/i.test(all), all };
  });
  log('R16 no economy/EXP/Gold/shop/ranking UI strings', !r16.bad, r16.bad ? r16.all : 'clean');

  // R17 — No 4D/4E/5A features introduced.
  await startMatch(page);
  const r17 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const texts = s.children.list
      .map((o) => (typeof o.text === 'string' ? o.text : ''))
      .filter(Boolean)
      .join(' | ');
    return {
      bad: /minimap|route arrow|lane tracker|edge indicator|fog|respawn|sudden death/i.test(texts),
      phase: s.objectiveSystem.getMatchPhase(),
    };
  });
  log('R17 no 4D/4E/5A features', !r17.bad && r17.phase === 'in_progress', JSON.stringify(r17));

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
