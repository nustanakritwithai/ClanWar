/**
 * Phase 3B-B3 visual regression — SVG texture load + combat behavior.
 * Usage: node scripts/phase-3b-b3-visual-regression.mjs [baseUrl]
 */
import puppeteer from 'puppeteer';

const BASE_URL = process.argv[2] ?? 'http://127.0.0.1:4173';
const TEXTURE_KEYS = [
  'vfx_hit_spark',
  'vfx_impact_burst',
  'vfx_slash_arc',
  'vfx_heal_spark',
  'vfx_heal_cross_burst',
  'combat_aoe_marker',
  'combat_projectile_arrow',
  'combat_projectile_fireball',
];

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
  await new Promise((r) => setTimeout(r, 500));
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

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  const failed404 = [];

  page.on('console', (m) => {
    const text = m.text();
    if (m.type() === 'error' && !/favicon|404/i.test(text)) errs.push(text);
  });
  page.on('response', (res) => {
    const u = res.url();
    if (res.status() === 404 && /assets\/(vfx|combat)\/.+\.svg/i.test(u)) failed404.push(u);
  });

  // Textures load in MatchScene.preload — check after first match start
  await startMatch(page, 'ranger');

  const textures = await page.evaluate((keys) => {
    const game = window.__CLANWAR_GAME__;
    return keys.map((k) => ({ key: k, exists: game.textures.exists(k) }));
  }, TEXTURE_KEYS);

  const missing = textures.filter((t) => !t.exists).map((t) => t.key);
  log('Combat SVG textures preloaded', missing.length === 0, missing.join(', ') || 'all 8');

  await walk(page, 10);
  await pressKey(page, 'q');
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 50));
    const proj = await page.evaluate(() => {
      const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
      return s.projectileSystem.getActiveCount();
    });
    if (proj > 0) break;
  }
  await new Promise((r) => setTimeout(r, 600));

  const projCheck = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const count = s.projectileSystem.getActiveCount();
    const combat = s.lastCombatResult;
    return { count, combat };
  });
  log('Projectile spawned with SVG', /Power Shot (fired|hit)/.test(projCheck.combat), projCheck.combat);

  // Fireball + impact
  await startMatch(page, 'mage');
  await walk(page, 10);
  await pressKey(page, 'q');
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 50));
    const combat = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').lastCombatResult);
    if (combat.includes('Fireball hit')) break;
  }
  const fb = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').lastCombatResult);
  log('Fireball hit after SVG swap', fb.includes('Fireball hit'), fb);

  // AoE marker (Arrow Rain)
  await startMatch(page, 'ranger');
  await walk(page, 8);
  await pressKey(page, 'e');
  await new Promise((r) => setTimeout(r, 500));
  const aoe = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').lastCombatResult);
  log('AoE skill still resolves', /Arrow Rain|missed/.test(aoe), aoe);

  // Heal VFX
  await startMatch(page, 'priest');
  await pressKey(page, 'q');
  await new Promise((r) => setTimeout(r, 400));
  const heal = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').lastCombatResult);
  log('Priest Heal still works', /Heal|HP full/.test(heal), heal);

  // Menu leak
  let leaks = 0;
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__CLANWAR_GAME__.scene.start('MenuScene'));
    await new Promise((r) => setTimeout(r, 100));
    await page.evaluate(() => window.__CLANWAR_GAME__.scene.start('MatchScene', { heroClass: 'ranger' }));
    await walk(page, 5);
    await pressKey(page, 'q');
    await new Promise((r) => setTimeout(r, 800));
    const proj = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').projectileSystem.getActiveCount());
    if (proj > 0) leaks++;
  }
  log('Menu ↔ Match x3 no projectile leak', leaks === 0, `leaks=${leaks}`);

  log('No SVG 404 responses', failed404.length === 0, failed404.join('; ') || 'none');
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
