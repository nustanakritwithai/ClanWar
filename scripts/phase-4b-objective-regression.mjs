/**
 * Phase 4B objective runtime regression.
 * Usage: node scripts/phase-4b-objective-regression.mjs [baseUrl]
 */
import puppeteer from 'puppeteer';

const BASE_URL = process.argv[2] ?? 'http://127.0.0.1:4173';
const results = [];
const log = (t, p, d = '') => {
  results.push({ t, p });
  console.log(`${p ? 'PASS' : 'FAIL'}: ${t}${d ? ` — ${d}` : ''}`);
};

async function startMatch(page, heroClass = 'warrior') {
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.setViewport({ width: 1280, height: 720 });
  await page.evaluate((hc) => window.__CLANWAR_GAME__.scene.start('MatchScene', { heroClass: hc }), heroClass);
  await page.waitForFunction(() => window.__CLANWAR_GAME__?.scene?.getScene('MatchScene')?.objectiveSystem);
  await new Promise((r) => setTimeout(r, 500));
}

async function snap(page) {
  return page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    return {
      count: s.objectiveSystem.getObjectiveCount(),
      snapshots: s.objectiveSystem.getSnapshots(),
      phase: s.objectiveSystem.getMatchPhase(),
      priority: s.objectiveSystem.getPriority(),
      blocked: s.objectiveSystem.getLastBlockedLog(),
      scene: window.__CLANWAR_GAME__.scene.getScenes(true).map((sc) => sc.scene.key),
    };
  });
}

async function waitForScene(page, key, timeout = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const active = await page.evaluate((k) => window.__CLANWAR_GAME__.scene.getScenes(true).some((sc) => sc.scene.key === k), key);
    if (active) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !/404|favicon/i.test(m.text())) errs.push(m.text());
  });

  await startMatch(page);
  let s = await snap(page);
  log('Four objectives spawn', s.count === 4, `count=${s.count}`);

  const ids = s.snapshots.map((o) => o.id).sort();
  log('Objective IDs present', ids.join(',') === 'blueCore,blueGate,redCore,redGate', ids.join(','));

  const redGateStart = s.snapshots.find((o) => o.id === 'redGate');
  await page.evaluate(() => {
    const sys = window.__CLANWAR_GAME__.scene.getScene('MatchScene').objectiveSystem;
    sys.debugDealDamage('redGate', 120, 'blue');
  });
  s = await snap(page);
  const redGateAfter = s.snapshots.find((o) => o.id === 'redGate');
  log('Red Gate takes damage', redGateAfter.currentHp < redGateStart.currentHp, `${redGateStart.currentHp} -> ${redGateAfter.currentHp}`);

  const redCoreStartHp = s.snapshots.find((o) => o.id === 'redCore').currentHp;
  await page.evaluate(() => {
    window.__CLANWAR_GAME__.scene.getScene('MatchScene').objectiveSystem.applyMeleeArcDamage({
      ownerTeam: 'blue',
      casterX: 1500,
      casterY: 900,
      facingAngle: Math.PI / 2,
      range: 200,
      rawDamage: 500,
      playerGateDamageBonus: 0,
    });
  });
  s = await snap(page);
  const redCoreBlocked = s.snapshots.find((o) => o.id === 'redCore');
  log(
    'Red Core rejects damage before gate destroyed',
    redCoreBlocked.currentHp === redCoreStartHp && redCoreBlocked.combatState === 'protected',
    `hp=${redCoreBlocked.currentHp} state=${redCoreBlocked.combatState} blocked=${s.blocked}`,
  );

  await page.evaluate(() => {
    const sys = window.__CLANWAR_GAME__.scene.getScene('MatchScene').objectiveSystem;
    sys.debugDealDamage('redGate', 5000, 'blue');
  });
  s = await snap(page);
  const redGateDown = s.snapshots.find((o) => o.id === 'redGate');
  const redCoreVuln = s.snapshots.find((o) => o.id === 'redCore');
  log(
    'Red Gate destroyed unlocks Red Core',
    redGateDown.combatState === 'destroyed' && redCoreVuln.combatState === 'vulnerable',
    `gate=${redGateDown.combatState} core=${redCoreVuln.combatState} priority=${s.priority}`,
  );

  await page.evaluate(() => {
    window.__CLANWAR_GAME__.scene.getScene('MatchScene').objectiveSystem.debugDealDamage('redCore', 250, 'blue');
  });
  s = await snap(page);
  const redCoreHit = s.snapshots.find((o) => o.id === 'redCore');
  log(
    'Red Core takes damage after unlock',
    redCoreHit.currentHp < redCoreVuln.currentHp,
    `${redCoreVuln.currentHp} -> ${redCoreHit.currentHp}`,
  );

  await page.evaluate(() => {
    window.__CLANWAR_GAME__.scene.getScene('MatchScene').objectiveSystem.debugDealDamage('redCore', 5000, 'blue');
  });
  const victoryScene = await waitForScene(page, 'ResultScene', 3000);
  const victoryData = await page.evaluate(() => {
    const scenes = window.__CLANWAR_GAME__.scene.getScenes(true);
    const result = scenes.find((sc) => sc.scene.key === 'ResultScene');
    return result?.sys?.settings?.data ?? {};
  });
  log(
    'Red Core destroyed triggers Victory',
    victoryScene && victoryData.outcome === 'victory',
    `scene=${victoryScene} outcome=${victoryData.outcome}`,
  );

  await startMatch(page);
  await page.evaluate(() => {
    window.__CLANWAR_GAME__.scene.getScene('MatchScene').objectiveSystem.debugDealDamage('blueCore', 5000, 'red');
  });
  const defeatScene = await waitForScene(page, 'ResultScene', 3000);
  const defeatData = await page.evaluate(() => {
    const scenes = window.__CLANWAR_GAME__.scene.getScenes(true);
    const result = scenes.find((sc) => sc.scene.key === 'ResultScene');
    return result?.sys?.settings?.data ?? {};
  });
  log(
    'Blue Core destroyed triggers Defeat (debug hook)',
    defeatScene && defeatData.outcome === 'defeat',
    `scene=${defeatScene} outcome=${defeatData.outcome}`,
  );

  const counts = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__CLANWAR_GAME__.scene.start('MenuScene'));
    await new Promise((r) => setTimeout(r, 150));
    await page.evaluate(() => window.__CLANWAR_GAME__.scene.start('MatchScene', { heroClass: 'guardian' }));
    await page.waitForFunction(() => window.__CLANWAR_GAME__?.scene?.getScene('MatchScene')?.objectiveSystem);
    await new Promise((r) => setTimeout(r, 400));
    const c = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').objectiveSystem.getObjectiveCount());
    counts.push(c);
  }
  log('Menu ↔ Match x3 stable objective count', counts.every((c) => c === 4) && new Set(counts).size === 1, counts.join(','));

  await page.setViewport({ width: 915, height: 412 });
  await startMatch(page);
  const mobile = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    return {
      joy: !!s.movement,
      attack: typeof s.movement.state.attackPressed === 'boolean',
      objectives: s.objectiveSystem.getObjectiveCount(),
    };
  });
  log('Mobile controls still work', mobile.joy && mobile.attack && mobile.objectives === 4, JSON.stringify(mobile));

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
