/**
 * Phase 3B-B2 regression — skill coverage + test reliability.
 * Usage: node scripts/phase-3b-b2-regression.mjs [baseUrl]
 */
import puppeteer from 'puppeteer';

const BASE_URL = process.argv[2] ?? 'http://127.0.0.1:4173';
const results = [];
const log = (t, p, d = '') => {
  results.push({ t, p });
  console.log(`${p ? 'PASS' : 'FAIL'}: ${t}${d ? ` — ${d}` : ''}`);
};

async function startMatch(page, heroClass) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.setViewport({ width: 1280, height: 720 });
  await page.evaluate((hc) => window.__CLANWAR_GAME__.scene.start('MatchScene', { heroClass: hc }), heroClass);
  await page.waitForFunction(() => window.__CLANWAR_GAME__?.scene?.getScene('MatchScene'));
  await new Promise((r) => setTimeout(r, 400));
}

async function walk(page, n = 14) {
  for (let i = 0; i < n; i++) {
    await page.keyboard.down('w');
    await new Promise((r) => setTimeout(r, 80));
    await page.keyboard.up('w');
  }
}

async function pressKey(page, key) {
  await page.focus('body');
  const canvas = await page.$('canvas');
  if (canvas) {
    const box = await canvas.boundingBox();
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
  await page.keyboard.down(key);
  await new Promise((r) => setTimeout(r, 50));
  await page.keyboard.up(key);
}

async function st(page) {
  return page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    return {
      combat: s.lastCombatResult,
      hit: s.lastHitShapeResult,
      type: s.lastSkillType,
      placeholder: s.lastPlaceholderReason,
      proj: s.projectileSystem.getActiveCount(),
      dummyHp: s.dummy.currentHp,
      playerHp: s.player.currentHp,
    };
  });
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !/404|favicon/i.test(m.text())) errs.push(m.text());
  });

  // Keyboard Q (flaky fix verification)
  await startMatch(page, 'guardian');
  await walk(page, 14);
  await pressKey(page, 'q');
  await new Promise((r) => setTimeout(r, 500));
  let s = await st(page);
  log('keyboard Q Shield Bash', s.combat.includes('Shield Bash'), s.combat);

  // E/R/F keys
  await startMatch(page, 'warrior');
  await walk(page, 16);
  await pressKey(page, 'q');
  await new Promise((r) => setTimeout(r, 400));
  s = await st(page);
  log('keyboard Q Cleave', s.combat.includes('Cleave'), s.combat);

  // Gate Breaker ultimate (F)
  await startMatch(page, 'warrior');
  await walk(page, 14);
  await pressKey(page, 'f');
  await new Promise((r) => setTimeout(r, 400));
  s = await st(page);
  log('Gate Breaker placeholder', s.placeholder.includes('gate damage deferred'), `${s.combat} | ${s.placeholder}`);

  // War Taunt
  await startMatch(page, 'guardian');
  await pressKey(page, 'r');
  await new Promise((r) => setTimeout(r, 400));
  s = await st(page);
  log('War Taunt no real taunt', s.combat.includes('placeholder'), `${s.combat} | ${s.hit}`);

  // Leap Strike
  await startMatch(page, 'warrior');
  await walk(page, 6);
  await pressKey(page, 'e');
  await new Promise((r) => setTimeout(r, 400));
  s = await st(page);
  log('Leap Strike instant AoE', s.placeholder.includes('leap dash deferred'), s.combat);

  // Meteor Siege
  await startMatch(page, 'mage');
  await walk(page, 6);
  await pressKey(page, 'f');
  await new Promise((r) => setTimeout(r, 400));
  s = await st(page);
  log('Meteor Siege placeholder', s.placeholder.includes('gate damage deferred'), s.combat);

  // Revival Prayer
  await startMatch(page, 'priest');
  await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.player.currentHp = Math.floor(s.player.maxHp * 0.4);
  });
  await pressKey(page, 'f');
  await new Promise((r) => setTimeout(r, 400));
  s = await st(page);
  log('Revival Prayer self-heal only', s.placeholder.includes('revive deferred'), s.combat);

  // Projectiles
  await startMatch(page, 'ranger');
  await walk(page, 8);
  await pressKey(page, 'q');
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 50));
    s = await st(page);
    if (s.combat.includes('Power Shot hit')) break;
  }
  log('Power Shot hit', s.combat.includes('Power Shot hit'), s.combat);

  await startMatch(page, 'mage');
  await walk(page, 8);
  await pressKey(page, 'q');
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 50));
    s = await st(page);
    if (s.combat.includes('Fireball hit')) break;
  }
  log('Fireball hit', s.combat.includes('Fireball hit'), s.combat);

  // Menu leak
  let leaks = 0;
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__CLANWAR_GAME__.scene.start('MenuScene'));
    await new Promise((r) => setTimeout(r, 100));
    await page.evaluate(() => window.__CLANWAR_GAME__.scene.start('MatchScene', { heroClass: 'ranger' }));
    await walk(page, 5);
    await pressKey(page, 'q');
    await new Promise((r) => setTimeout(r, 800));
    if ((await st(page)).proj > 0) leaks++;
  }
  log('Menu ↔ Match x3 no leak', leaks === 0, `leaks=${leaks}`);

  log('Console errors', errs.length === 0, errs.join('; ') || 'none');
  await browser.close();

  const failed = results.filter((r) => !r.p);
  console.log(`\nSUMMARY ${results.length - failed.length}/${results.length}`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
