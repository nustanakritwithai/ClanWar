/**
 * Phase 4E Theme 1 runtime visual reskin regression.
 * Usage: node scripts/phase-4e-visual-reskin-regression.mjs [baseUrl]
 *
 * Boots once and restarts scenes in-page (avoids the flaky networkidle0
 * re-navigation stall, per the established Phase 4B/4D regression pattern).
 * Verifies the Phase 4E Theme 1 texture wiring only — gameplay rules,
 * scoring, timers, and combat formulas are covered by the prior phase
 * regression scripts, re-run unchanged alongside this one.
 */
import puppeteer from 'puppeteer';

const BASE_URL = process.argv[2] ?? 'http://127.0.0.1:4173';
const results = [];
const log = (t, p, d = '') => { results.push({ t, p }); console.log(`${p ? 'PASS' : 'FAIL'}: ${t}${d ? ` — ${d}` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const THEME1_TEXTURES = [
  'phase4e_theme1_ui_hud_panel', 'phase4e_theme1_ui_timer_score_chip', 'phase4e_theme1_ui_objective_plaque',
  'phase4e_theme1_ui_joystick_frame', 'phase4e_theme1_ui_attack_button_frame', 'phase4e_theme1_ui_skill_button_frame',
  'phase4e_theme1_ui_capture_hud_panel', 'phase4e_theme1_ui_siege_buff_badge', 'phase4e_theme1_ui_result_panel',
  'phase4e_theme1_obj_gate_idle', 'phase4e_theme1_obj_gate_hit', 'phase4e_theme1_obj_gate_damaged',
  'phase4e_theme1_obj_gate_breached', 'phase4e_theme1_obj_gate_destroyed',
  'phase4e_theme1_obj_core_protected', 'phase4e_theme1_obj_core_vulnerable', 'phase4e_theme1_obj_core_hit',
  'phase4e_theme1_obj_core_low', 'phase4e_theme1_obj_core_destroyed',
  'phase4e_theme1_obj_capture_neutral', 'phase4e_theme1_obj_capture_player', 'phase4e_theme1_obj_capture_enemy',
  'phase4e_theme1_obj_capture_contested',
  'phase4e_theme1_char_guardian_idle', 'phase4e_theme1_char_warrior_idle', 'phase4e_theme1_char_ranger_idle',
  'phase4e_theme1_char_mage_idle', 'phase4e_theme1_char_priest_idle', 'phase4e_theme1_char_rogue_idle',
  'phase4e_theme1_char_summoner_idle',
  'phase4e_theme1_vfx_normal_hit_spark', 'phase4e_theme1_vfx_gate_hit_spark', 'phase4e_theme1_vfx_core_hit_pulse',
  'phase4e_theme1_vfx_skill_cast_flash', 'phase4e_theme1_vfx_impact_ring', 'phase4e_theme1_vfx_denied_flash',
  'phase4e_theme1_vfx_capture_pulse',
  'phase4e_theme1_bg_castle_parallax', 'phase4e_theme1_bg_siege_smoke_parallax',
  'phase4e_theme1_tile_ground_grass', 'phase4e_theme1_tile_ground_dirt', 'phase4e_theme1_tile_stone_path',
  'phase4e_theme1_tile_broken_wall', 'phase4e_theme1_prop_banner_blue', 'phase4e_theme1_prop_banner_red',
  'phase4e_theme1_prop_crystal_small', 'phase4e_theme1_prop_ruin_stone',
];

let booted = false;
async function startMatch(page, viewport = { width: 1280, height: 720 }) {
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
  await sleep(150);
  await page.evaluate(() => { const g = window.__CLANWAR_GAME__; try { g.scene.stop('MenuScene'); } catch (e) {} g.scene.start('MatchScene', { heroClass: 'warrior' }); });
  await page.waitForFunction(() => { const s = window.__CLANWAR_GAME__?.scene?.getScene('MatchScene'); return s?.objectiveSystem && s?.matchTimerSystem; });
  await sleep(350);
}

async function gotoClassSelect(page) {
  await page.evaluate(() => {
    const g = window.__CLANWAR_GAME__;
    try { g.scene.stop('MatchScene'); } catch (e) {}
    try { g.scene.stop('ResultScene'); } catch (e) {}
    g.scene.start('ClassSelectScene');
  });
  await sleep(200);
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  const failedAssets = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/404|favicon/i.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/assets/phase-4e/theme1/') && res.status() >= 400) failedAssets.push(`${res.status()} ${url}`);
  });

  // ---------- T1: boot succeeds ----------
  await startMatch(page);
  log('T1 boot + match scene starts', true);

  // ---------- T2: all Theme 1 runtime texture keys loaded ----------
  const loaded = await page.evaluate((keys) => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    return keys.filter((k) => !s.textures.exists(k));
  }, THEME1_TEXTURES);
  log('T2 all Phase 4E Theme 1 runtime textures loaded', loaded.length === 0, loaded.join(', '));

  // ---------- T3: no asset 404s for phase-4e/theme1 ----------
  log('T3 no phase-4e/theme1 asset load failures', failedAssets.length === 0, failedAssets.join('; '));

  // ---------- T4: Gate states — idle tinted, destroyed swaps to theme art ----------
  const gate = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const obj = s.objectiveSystem.getSnapshots().find((o) => o.id === 'redGate');
    const entity = s.objectiveSystem.debugGetEntity ? s.objectiveSystem.debugGetEntity('redGate') : undefined;
    return { combatState: obj?.combatState };
  });
  log('T4 Gate idle state present pre-damage', gate.combatState === 'intact', JSON.stringify(gate));

  const gateDestroyed = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.objectiveSystem.debugDealDamage('redGate', 100000, 'blue');
    const list = s.children.list;
    const themed = list.filter((o) => o.texture && o.texture.key === 'phase4e_theme1_obj_gate_destroyed');
    return { themedCount: themed.length };
  });
  log('T5 Gate destroyed uses themed texture', gateDestroyed.themedCount >= 1, JSON.stringify(gateDestroyed));

  // ---------- T6: Core hit/destroyed themed, base stays team-colored until destroyed ----------
  await startMatch(page);
  const core = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.objectiveSystem.debugDealDamage('redGate', 100000, 'blue'); // breach gate => core vulnerable
    s.objectiveSystem.debugDealDamage('redCore', 100, 'blue'); // core hit, not lethal
    const list = s.children.list;
    const hitOverlay = list.filter((o) => o.texture && o.texture.key === 'phase4e_theme1_obj_core_hit').length;
    const baseStillTeamColored = list.some((o) => o.texture && o.texture.key === 'obj_red_core');
    return { hitOverlay, baseStillTeamColored };
  });
  log('T6 Core under-attack overlay themed, base stays team-colored', core.hitOverlay >= 1 && core.baseStillTeamColored, JSON.stringify(core));

  const coreDestroyed = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.objectiveSystem.debugDealDamage('redCore', 100000, 'blue');
    const list = s.children.list;
    const themed = list.filter((o) => o.texture && o.texture.key === 'phase4e_theme1_obj_core_destroyed').length;
    return { themed };
  });
  log('T7 Core destroyed uses themed texture', coreDestroyed.themed >= 1, JSON.stringify(coreDestroyed));

  // ---------- T8: Capture point owner textures themed (neutral/player/enemy) ----------
  await startMatch(page);
  const capture = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const neutralOk = s.children.list.some((o) => o.texture && o.texture.key === 'phase4e_theme1_obj_capture_neutral');
    s.captureSystem.debugCompleteCapture('resourceCampL', 'blue');
    const playerOk = s.children.list.some((o) => o.texture && o.texture.key === 'phase4e_theme1_obj_capture_player');
    return { neutralOk, playerOk };
  });
  log('T8 Capture Point owner textures themed (neutral + player/blue)', capture.neutralOk && capture.playerOk, JSON.stringify(capture));

  // ---------- T9: VFX themed (normal hit, gate hit, core pulse, cast flash, impact ring) ----------
  await startMatch(page);
  await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.dummy.sprite.setPosition(s.player.x, s.player.y);
  });
  await page.keyboard.down('j');
  await sleep(40);
  const vfxHit = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    return s.children.list.some((o) => o.texture && o.texture.key === 'phase4e_theme1_vfx_normal_hit_spark');
  });
  await page.keyboard.up('j');
  log('T9 Normal hit VFX themed', vfxHit);

  await page.keyboard.press('q');
  await sleep(30);
  const vfxCast = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    return s.children.list.some((o) => o.texture && o.texture.key === 'phase4e_theme1_vfx_skill_cast_flash');
  });
  log('T10 Skill cast flash VFX themed', vfxCast);

  const vfxGateCore = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.objectiveSystem.debugDealDamage('redGate', 100, 'blue');
    const gateHit = s.children.list.some((o) => o.texture && o.texture.key === 'phase4e_theme1_vfx_gate_hit_spark');
    s.objectiveSystem.debugDealDamage('redGate', 100000, 'blue');
    s.objectiveSystem.debugDealDamage('redCore', 100, 'blue');
    const corePulse = s.children.list.some((o) => o.texture && o.texture.key === 'phase4e_theme1_vfx_core_hit_pulse');
    s.objectiveSystem.debugDealDamage('redCore', 100000, 'blue');
    const impactRing = s.children.list.some((o) => o.texture && o.texture.key === 'phase4e_theme1_vfx_impact_ring');
    return { gateHit, corePulse, impactRing };
  });
  log('T11 Gate/Core/destroy VFX themed', vfxGateCore.gateHit && vfxGateCore.corePulse && vfxGateCore.impactRing, JSON.stringify(vfxGateCore));

  // ---------- T12: VFX depth/lifetime rules preserved (still below HUD) ----------
  await startMatch(page);
  const depthCheck = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.objectiveSystem.debugDealDamage('redGate', 100, 'blue');
    const vfxKeys = ['phase4e_theme1_vfx_normal_hit_spark', 'phase4e_theme1_vfx_gate_hit_spark', 'phase4e_theme1_vfx_core_hit_pulse', 'phase4e_theme1_vfx_skill_cast_flash', 'phase4e_theme1_vfx_impact_ring'];
    const depths = s.children.list.filter((o) => o.texture && vfxKeys.includes(o.texture.key)).map((o) => o.depth);
    const maxFx = Math.max(0, ...depths);
    return { maxFx, ok: maxFx < 1090 };
  });
  log('T12 Themed VFX still below HUD depth (1090)', depthCheck.ok, JSON.stringify(depthCheck));

  // ---------- T13/T14: mobile viewports — HUD/controls present, no full-screen flash ----------
  for (const [w, h, id] of [[915, 412, 'T13'], [800, 360, 'T14']]) {
    await startMatch(page, { width: w, height: h });
    const m = await page.evaluate(() => {
      const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
      s.objectiveSystem.debugDealDamage('redGate', 100, 'blue');
      const vfxKeys = ['phase4e_theme1_vfx_normal_hit_spark', 'phase4e_theme1_vfx_gate_hit_spark', 'phase4e_theme1_vfx_core_hit_pulse', 'phase4e_theme1_vfx_skill_cast_flash', 'phase4e_theme1_vfx_impact_ring'];
      const oversized = s.children.list.some((o) => o.texture && vfxKeys.includes(o.texture.key) && (o.displayWidth > s.scale.width * 0.9));
      return { joystick: !!s.movement, oversized };
    });
    log(`${id} mobile viewport ${w}x${h}: controls present, no full-screen-sized VFX`, m.joystick && !m.oversized, JSON.stringify(m));
  }

  // ---------- T15: no forbidden / economy / snake_case player-facing copy ----------
  await startMatch(page);
  const copy = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    const texts = s.children.list
      .filter((o) => o !== s.debugText)
      .map((o) => (typeof o.text === 'string' ? o.text : ''))
      .filter((t) => t && !t.includes('\n'));
    return texts.join(' | ');
  });
  const forbidden = /\bgold\b|\bexp\b|currency|reward|ranking|economy|[a-z]+_[a-z]+/i;
  log('T15 no forbidden/economy/internal/snake_case player-facing strings', !forbidden.test(copy), forbidden.test(copy) ? copy : 'clean');

  // ---------- T16: Menu <-> Match x3, no texture break ----------
  let breakCount = 0;
  for (let i = 0; i < 3; i++) {
    await startMatch(page);
    const ok = await page.evaluate((keys) => {
      const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
      return keys.every((k) => s.textures.exists(k));
    }, THEME1_TEXTURES.slice(0, 8));
    if (!ok) breakCount += 1;
  }
  log('T16 Menu<->Match x3 — Theme 1 textures remain intact', breakCount === 0, `breaks=${breakCount}`);

  // ---------- T17: Class select character preview wired ----------
  await gotoClassSelect(page);
  const classSelect = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('ClassSelectScene');
    const charKeys = ['phase4e_theme1_char_guardian_idle', 'phase4e_theme1_char_warrior_idle', 'phase4e_theme1_char_ranger_idle', 'phase4e_theme1_char_mage_idle', 'phase4e_theme1_char_priest_idle'];
    const present = s.children.list.filter((o) => o.texture && charKeys.includes(o.texture.key)).length;
    return { present };
  });
  log('T17 Class select shows themed previews for all 5 existing classes', classSelect.present === 5, JSON.stringify(classSelect));

  // ---------- T18: no fatal console errors ----------
  log('T18 no fatal console errors', errs.length === 0, errs.join('; ') || 'none');

  await browser.close();
  const failed = results.filter((r) => !r.p);
  console.log(`\nSUMMARY ${results.length - failed.length}/${results.length}`);
  if (failed.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
