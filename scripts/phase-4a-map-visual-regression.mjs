/**
 * Phase 4A map visual regression.
 * Usage: node scripts/phase-4a-map-visual-regression.mjs [baseUrl]
 */
import puppeteer from 'puppeteer';

const BASE_URL = process.argv[2] ?? 'http://127.0.0.1:4173';
const MAP_TEXTURE_COUNT = 26;

const results = [];
const log = (t, p, d = '') => {
  results.push({ t, p });
  console.log(`${p ? 'PASS' : 'FAIL'}: ${t}${d ? ` — ${d}` : ''}`);
};

async function startMatch(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.setViewport({ width: 1280, height: 720 });
  await page.evaluate(() => window.__CLANWAR_GAME__.scene.start('MatchScene', { heroClass: 'guardian' }));
  await page.waitForFunction(() => window.__CLANWAR_GAME__?.scene?.getScene('MatchScene')?.mapRenderer);
  await new Promise((r) => setTimeout(r, 600));
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  const svg404 = [];

  page.on('console', (m) => {
    const text = m.text();
    if (m.type() === 'error' && !/favicon|404/i.test(text)) errs.push(text);
  });
  page.on('response', (res) => {
    const u = res.url();
    if (res.status() === 404 && /assets\/map\/.+\.svg/i.test(u)) svg404.push(u);
  });

  await startMatch(page);

  const loaded = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const keys = [
      'map_main_route_tile', 'map_high_ground_tile', 'map_shadow_route_tile',
      'map_road_crossing', 'map_lane_marker_blue', 'map_lane_marker_red',
      'map_lane_marker_neutral', 'map_high_ground_ramp_up', 'map_high_ground_ramp_down',
      'map_sewer_entrance', 'map_sewer_exit', 'map_battlefield_wall_stone',
      'map_battlefield_wall_broken', 'map_choke_point_marker', 'map_bridge_stone',
      'map_bridge_broken', 'map_spawn_platform_blue', 'map_spawn_platform_red',
      'map_base_floor_blue', 'map_base_floor_red', 'map_neutral_ground_patch',
      'map_danger_zone_marker', 'map_movement_blocker_marker',
      'map_path_arrow_blue', 'map_path_arrow_red', 'map_path_arrow_neutral',
    ];
    return keys.filter((k) => window.__CLANWAR_GAME__.textures.exists(k)).length;
  });
  log('Map SVG textures preloaded', loaded === MAP_TEXTURE_COUNT, `${loaded}/${MAP_TEXTURE_COUNT}`);

  const mapObjs = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').mapRenderer.getObjectCount());
  log('Map objects rendered', mapObjs > 40, `count=${mapObjs}`);

  const phase = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    return s.debugText?.text ?? '';
  });
  log('Phase 4A label', /Phase 4A/i.test(phase), phase.split('\n')[0]);

  // Menu ↔ Match leak check
  const counts = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__CLANWAR_GAME__.scene.start('MenuScene'));
    await new Promise((r) => setTimeout(r, 150));
    await page.evaluate(() => window.__CLANWAR_GAME__.scene.start('MatchScene', { heroClass: 'guardian' }));
    await page.waitForFunction(() => window.__CLANWAR_GAME__?.scene?.getScene('MatchScene')?.mapRenderer);
    await new Promise((r) => setTimeout(r, 400));
    const c = await page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').mapRenderer.getObjectCount());
    counts.push(c);
  }
  const leak = counts.length >= 2 && counts.every((c) => c === counts[0]) && counts[0] > 0;
  log('Menu ↔ Match x3 stable map count', leak, counts.join(','));

  log('No map SVG 404', svg404.length === 0, svg404.join('; ') || 'none');
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
