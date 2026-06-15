/**
 * Phase 4B-B clarity and feedback regression.
 * Usage: node scripts/phase-4b-b-clarity-regression.mjs [baseUrl]
 */
import puppeteer from 'puppeteer';

const BASE_URL = process.argv[2] ?? 'http://127.0.0.1:4173';
const results = [];
const log = (t, p, d = '') => {
  results.push({ t, p });
  console.log(`${p ? 'PASS' : 'FAIL'}: ${t}${d ? ` — ${d}` : ''}`);
};

async function startMatch(page, heroClass = 'warrior', viewport = { width: 1280, height: 720 }) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.setViewport(viewport);
  await page.evaluate((hc) => window.__CLANWAR_GAME__.scene.start('MatchScene', { heroClass: hc }), heroClass);
  await page.waitForFunction(() => window.__CLANWAR_GAME__?.scene?.getScene('MatchScene')?.objectiveSystem);
  await new Promise((r) => setTimeout(r, 500));
}

async function snap(page) {
  return page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const sys = s.objectiveSystem;
    return {
      count: sys.getObjectiveCount(),
      snapshots: sys.getSnapshots(),
      priority: sys.getPriority(),
      hudLabel: sys.getHudLabel(),
      feedback: sys.getLastWorldFeedback(),
      feedbackCount: sys.getWorldFeedbackCount(),
      redCoreHp: sys.getSnapshots().find((o) => o.id === 'redCore')?.currentHp,
      redCoreState: sys.getSnapshots().find((o) => o.id === 'redCore')?.combatState,
    };
  });
}

async function getResultReasonText(page) {
  await page.waitForFunction(() => {
    const sc = window.__CLANWAR_GAME__.scene.getScene('ResultScene');
    if (!sc) return false;
    return sc.children.list.some(
      (o) => typeof o.text === 'string' && /core.*destroyed/i.test(o.text) && !/^(VICTORY|DEFEAT)$/i.test(o.text),
    );
  }, { timeout: 3000 }).catch(() => null);
  return page.evaluate(() => {
    const sc = window.__CLANWAR_GAME__.scene.getScene('ResultScene');
    if (!sc) return '';
    return (
      sc.children.list
        .map((o) => (typeof o.text === 'string' ? o.text : ''))
        .find((t) => /core.*destroyed/i.test(t) && !/^(VICTORY|DEFEAT)$/i.test(t)) ?? ''
    );
  });
}

async function getPlayerFacingTexts(page) {
  return page.evaluate(() => {
    const match = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const result = window.__CLANWAR_GAME__.scene.getScene('ResultScene');
    const texts = [];
    if (match?.objectiveSystem) texts.push(match.objectiveSystem.getHudLabel());
    if (result) {
      texts.push(...result.children.list.map((o) => (typeof o.text === 'string' ? o.text : '')));
    }
    return texts.filter(Boolean);
  });
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
  log('HUD starts Attack the Gate', s.hudLabel === 'Attack the Gate', s.hudLabel);

  const redCoreHpStart = s.redCoreHp;
  await page.evaluate(() => {
    window.__CLANWAR_GAME__.scene.getScene('MatchScene').objectiveSystem.applyMeleeArcDamage({
      ownerTeam: 'blue',
      casterX: 1500,
      casterY: 350,
      facingAngle: Math.PI / 2,
      range: 220,
      rawDamage: 500,
      playerGateDamageBonus: 0,
    });
  });
  s = await snap(page);
  log('Protected Red Core HP unchanged', s.redCoreHp === redCoreHpStart && s.redCoreState === 'protected', `hp=${s.redCoreHp} state=${s.redCoreState}`);
  log('Protected hit shows Destroy Gate first', s.feedback === 'Destroy Gate first', s.feedback);

  const countAfterFirst = s.feedbackCount;
  await page.evaluate(() => {
    const sys = window.__CLANWAR_GAME__.scene.getScene('MatchScene').objectiveSystem;
    for (let i = 0; i < 4; i++) {
      sys.applyMeleeArcDamage({
        ownerTeam: 'blue',
        casterX: 1500,
        casterY: 350,
        facingAngle: Math.PI / 2,
        range: 220,
        rawDamage: 500,
        playerGateDamageBonus: 0,
      });
    }
  });
  s = await snap(page);
  log('Protected feedback not spammed', s.feedbackCount <= countAfterFirst + 1, `count=${s.feedbackCount} after first=${countAfterFirst}`);

  await page.evaluate(() => {
    window.__CLANWAR_GAME__.scene.getScene('MatchScene').objectiveSystem.debugDealDamage('redGate', 5000, 'blue');
  });
  await new Promise((r) => setTimeout(r, 200));
  s = await snap(page);
  log('HUD becomes Destroy the Core', s.hudLabel === 'Destroy the Core' && s.priority === 'attack_core', s.hudLabel);
  log(
    'Gate breach transition feedback shown',
    s.feedback === 'Gate Breached' || s.feedback === 'Core is open',
    s.feedback,
  );

  await page.evaluate(() => {
    window.__CLANWAR_GAME__.scene.getScene('MatchScene').objectiveSystem.debugDealDamage('redCore', 5000, 'blue');
  });
  await page.waitForFunction(() => window.__CLANWAR_GAME__.scene.getScenes(true).some((sc) => sc.scene.key === 'ResultScene'), { timeout: 4000 });
  const victoryReason = await getResultReasonText(page);
  log('Victory reason copy', victoryReason === 'Enemy core destroyed', victoryReason);

  await startMatch(page);
  await page.evaluate(() => {
    window.__CLANWAR_GAME__.scene.getScene('MatchScene').objectiveSystem.debugDealDamage('blueCore', 5000, 'red');
  });
  await page.waitForFunction(() => window.__CLANWAR_GAME__.scene.getScenes(true).some((sc) => sc.scene.key === 'ResultScene'), { timeout: 4000 });
  const defeatReason = await getResultReasonText(page);
  log('Defeat reason copy', defeatReason === 'Your core was destroyed', defeatReason);

  const facingTexts = await getPlayerFacingTexts(page);
  const snake = facingTexts.filter((t) => /[a-z]+_[a-z]+/.test(t));
  log('No snake_case in player-facing UI', snake.length === 0, snake.join('; ') || 'none');

  const menuLabels = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__CLANWAR_GAME__.scene.start('MenuScene'));
    await new Promise((r) => setTimeout(r, 150));
    await page.evaluate(() => window.__CLANWAR_GAME__.scene.start('MatchScene', { heroClass: 'guardian' }));
    await page.waitForFunction(() => window.__CLANWAR_GAME__?.scene?.getScene('MatchScene')?.objectiveSystem);
    await new Promise((r) => setTimeout(r, 350));
    const row = await page.evaluate(() => {
      const sys = window.__CLANWAR_GAME__.scene.getScene('MatchScene').objectiveSystem;
      return { label: sys.getHudLabel(), count: sys.getObjectiveCount() };
    });
    menuLabels.push(row);
  }
  log(
    'Menu ↔ Match x3 resets prompt and objective count',
    menuLabels.every((r) => r.label === 'Attack the Gate' && r.count === 4),
    menuLabels.map((r) => `${r.label}/${r.count}`).join(','),
  );

  await startMatch(page, 'guardian', { width: 915, height: 412 });
  const mobile915 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    return {
      joy: !!s.movement,
      hud: s.objectiveSystem.getHudLabel(),
      objectives: s.objectiveSystem.getObjectiveCount(),
    };
  });
  log('Mobile 915×412 controls + HUD', mobile915.joy && mobile915.hud === 'Attack the Gate' && mobile915.objectives === 4, JSON.stringify(mobile915));

  await startMatch(page, 'guardian', { width: 800, height: 360 });
  const mobile800 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    return {
      joy: !!s.movement,
      hud: s.objectiveSystem.getHudLabel(),
      objectives: s.objectiveSystem.getObjectiveCount(),
    };
  });
  log('Mobile 800×360 controls + HUD', mobile800.joy && mobile800.hud === 'Attack the Gate' && mobile800.objectives === 4, JSON.stringify(mobile800));

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
