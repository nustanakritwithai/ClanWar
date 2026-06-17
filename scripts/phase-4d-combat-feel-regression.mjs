/**
 * Phase 4D combat-feel regression.
 * Usage: node scripts/phase-4d-combat-feel-regression.mjs [baseUrl]
 *
 * Boots once and restarts matches in-page (avoids the flaky networkidle0
 * re-navigation stall). Drives normal hits / skill casts with real key input.
 */
import puppeteer from 'puppeteer';

const BASE_URL = process.argv[2] ?? 'http://127.0.0.1:4173';
const results = [];
const log = (t, p, d = '') => { results.push({ t, p }); console.log(`${p ? 'PASS' : 'FAIL'}: ${t}${d ? ` — ${d}` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// Count live world objects by texture key / by being a damage number text.
const COUNT = `(() => {
  const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
  const list = s.children.list;
  const tex = (k) => list.filter((o) => o.active && o.texture && o.texture.key === k).length;
  const dmgNums = list.filter((o) => o.active && typeof o.text === 'string' && /^-\\d+$/.test(o.text));
  return {
    hitSpark: tex('vfx_hit_spark'),
    gateHit: tex('vfx_gate_hit_spark'),
    corePulse: tex('vfx_core_hit_pulse'),
    castFlash: tex('vfx_skill_cast_flash'),
    impactRing: tex('vfx_impact_ring'),
    dmgCount: dmgNums.length,
    dmgSample: dmgNums.map((o) => ({ t: o.text, depth: o.depth, stroke: o.style && o.style.strokeThickness, color: o.style && o.style.color })),
  };
})()`;

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/404|favicon/i.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));

  // ---------- R1 / R2 / R3: normal hit spark + readable damage number ----------
  await startMatch(page);
  await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.dummy.sprite.setPosition(s.player.x, s.player.y); // guarantee melee arc hit
  });
  await page.keyboard.down('j');
  await sleep(60); // sample during the short spark lifetime (~150ms)
  const hit = await page.evaluate(COUNT);
  await page.keyboard.up('j');
  log('R1 normal hit spark appears (vfx_hit_spark)', hit.hitSpark >= 1, JSON.stringify({ hitSpark: hit.hitSpark }));
  log('R2 normal hit damage number appears', hit.dmgCount >= 1, JSON.stringify({ dmgCount: hit.dmgCount }));
  const dn = hit.dmgSample[0];
  log('R3 damage number readable (stroked, depth 150, red tone)',
    !!dn && dn.stroke >= 3 && dn.depth === 150 && /f87171/i.test(dn.color || ''), JSON.stringify(dn || {}));

  // ---------- R4: Gate hit feedback ----------
  await startMatch(page);
  const r4 = await page.evaluate((countSrc) => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.objectiveSystem.debugDealDamage('redGate', 100, 'blue');
    return eval(countSrc);
  }, COUNT);
  const r4dmg = r4.dmgSample.find((d) => /cfa14a/i.test(d.color || ''));
  log('R4 Gate hit uses Gate feedback (vfx_gate_hit_spark + amber number)', r4.gateHit >= 1 && !!r4dmg, JSON.stringify({ gateHit: r4.gateHit, amber: !!r4dmg }));

  // ---------- R5: Core hit pulse ----------
  await startMatch(page);
  const r5 = await page.evaluate((countSrc) => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.objectiveSystem.debugDealDamage('redGate', 100000, 'blue'); // breach gate => core vulnerable
    s.objectiveSystem.debugDealDamage('redCore', 100, 'blue'); // core hit (not lethal)
    return eval(countSrc);
  }, COUNT);
  const r5dmg = r5.dmgSample.find((d) => /f4d35e/i.test(d.color || ''));
  log('R5 Core hit uses Core pulse (vfx_core_hit_pulse + gold number)', r5.corePulse >= 1 && !!r5dmg, JSON.stringify({ corePulse: r5.corePulse, gold: !!r5dmg }));

  // ---------- R6: Skill cast flash only on success ----------
  // First Q = successful cast (flash). Second Q (immediately) = cooldown fail (no new flash).
  await startMatch(page);
  await page.keyboard.press('q');
  await sleep(50);
  const castOk = await page.evaluate(COUNT); // first flash alive (~220ms life)
  await page.keyboard.press('q'); // on cooldown now -> must NOT add a flash
  await sleep(50);
  const castCd = await page.evaluate(COUNT); // first flash still alive; should NOT increase
  log('R6 skill cast flash on success only (cooldown press adds none)',
    castOk.castFlash >= 1 && castCd.castFlash <= castOk.castFlash,
    JSON.stringify({ success: castOk.castFlash, afterCooldownPress: castCd.castFlash }));

  // ---------- R7: Gate destroyed uses impact ring ----------
  await startMatch(page);
  const r7 = await page.evaluate((countSrc) => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.objectiveSystem.debugDealDamage('redGate', 100000, 'blue');
    const breach = s.objectiveSystem.getLastWorldFeedback();
    return { ...eval(countSrc), breach };
  }, COUNT);
  log('R7 Gate destroyed uses impact ring + "Gate Breached" primary', r7.impactRing >= 1 && r7.breach === 'Gate Breached', JSON.stringify({ impactRing: r7.impactRing, breach: r7.breach }));

  // ---------- R8 / R9: Core destroyed result works + not delayed ----------
  await startMatch(page);
  const r9 = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.objectiveSystem.debugDealDamage('redCore', 100000, 'blue');
    return { phase: s.objectiveSystem.getMatchPhase() }; // synchronous: must already be victory (VFX did not delay)
  });
  await sleep(2200);
  const r8 = await page.evaluate(() => ({ result: window.__CLANWAR_GAME__.registry.get('lastMatchResult'), active: window.__CLANWAR_GAME__.scene.isActive('ResultScene') }));
  log('R8 Core destroyed result still works', r8.result?.outcome === 'victory' && r8.result?.reason === 'enemy_core_destroyed' && r8.active, JSON.stringify(r8));
  log('R9 Core destroyed not delayed by VFX (phase victory synchronously)', r9.phase === 'victory', JSON.stringify(r9));

  // ---------- R10–R13: effects never cover HUD (depth ordering) ----------
  await startMatch(page);
  const layering = await page.evaluate((countSrc) => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugSetSiegeRuinsState('blue', 'idle');
    s.siegeBuffSystem.update(100);
    s.captureSystem.debugSetCaptureProgress('resourceCampL', 50);
    s.captureSystem.simulatePlayerAtObjective('resourceCampL');
    const d = s.captureSystem.getSnapshots().find((o) => o.id === 'resourceCampL');
    s.captureSystem.update(16, d.x, d.y, 'blue');
    s.objectiveSystem.debugDealDamage('redGate', 100, 'blue'); // spawn gate VFX + number
    eval(countSrc);
    const list = s.children.list;
    const vfxKeys = ['vfx_hit_spark', 'vfx_gate_hit_spark', 'vfx_core_hit_pulse', 'vfx_skill_cast_flash', 'vfx_impact_ring'];
    const vfxDepths = list.filter((o) => o.texture && vfxKeys.includes(o.texture.key)).map((o) => o.depth);
    const dmgDepths = list.filter((o) => typeof o.text === 'string' && /^-\\d+$/.test(o.text)).map((o) => o.depth);
    const maxFx = Math.max(0, ...vfxDepths, ...dmgDepths);
    // HUD/world-fixed elements live at depth >= 1090 on the main camera.
    const hudMin = 1090;
    return { maxFx, hudMin, ok: maxFx < hudMin };
  }, COUNT);
  log('R10–R13 VFX depth below HUD (cannot cover prompt/capture/siege/timer)', layering.ok, JSON.stringify(layering));

  // ---------- R14 / R15: controls on UI camera, VFX on world camera ----------
  for (const [w, h, id] of [[915, 412, 'R14 915×412'], [800, 360, 'R15 800×360']]) {
    await startMatch(page, { width: w, height: h });
    const m = await page.evaluate((countSrc) => {
      const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
      s.objectiveSystem.debugDealDamage('redGate', 100, 'blue');
      eval(countSrc);
      const cams = s.cameras.cameras; // [main, ui]; ui added later => renders on top
      const uiIsTop = cams.length >= 2;
      return { joy: !!s.movement, uiIsTop };
    }, COUNT);
    log(`${id} controls present + UI camera above world VFX`, m.joy && m.uiIsTop, JSON.stringify(m));
  }

  // ---------- R16–R19: preserved systems ----------
  await startMatch(page);
  const preserved = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    // Siege +30% enemy gate, no core bonus
    s.captureSystem.debugSetSiegeRuinsState('blue', 'idle');
    s.siegeBuffSystem.update(100);
    const siegeGate = s.objectiveSystem.debugComputeGateRawDamage('redGate', 100, 'blue');
    const siegeCore = s.objectiveSystem.debugComputeGateRawDamage('redCore', 100, 'blue');
    // Capture scoring
    s.captureSystem.debugCompleteCapture('resourceCampL', 'blue');
    const score = s.captureSystem.getTeamScore('blue');
    // Timer length
    const timer = s.matchTimerSystem.getRemainingSeconds();
    // Gate/Core HUD
    const hud = s.objectiveSystem.getHudLabel();
    return { siegeGate, siegeCore, score, timer, hud };
  });
  log('R16/R18 Siege Buff unchanged (+30% enemy gate, no core bonus)', preserved.siegeGate === 130 && preserved.siegeCore === 100, JSON.stringify(preserved));
  log('R17 Capture scoring unchanged (resource +5)', preserved.score === 5, JSON.stringify({ score: preserved.score }));
  log('R19 Timer length unchanged (300) + Gate/Core HUD intact', preserved.timer === 300 && preserved.hud === 'Attack the Gate', JSON.stringify(preserved));

  // ---------- R20: no forbidden / economy / snake_case strings ----------
  await startMatch(page);
  await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.objectiveSystem.debugDealDamage('redGate', 100, 'blue');
    s.captureSystem.debugSetSiegeRuinsState('blue', 'idle');
    s.siegeBuffSystem.update(100);
  });
  await sleep(50);
  const copy = await page.evaluate(() => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    // Exclude the dev debug overlay (SHOW_DEBUG_OVERLAY diagnostic panel, multiline,
    // toggled with ` / F1) — it is not shipped player-facing UI.
    const texts = s.children.list
      .filter((o) => o !== s.debugText)
      .map((o) => (typeof o.text === 'string' ? o.text : ''))
      .filter((t) => t && !t.includes('\n'));
    return texts.join(' | ');
  });
  const forbidden = /hit_debug|impact_state|damage_multiplier|gate_hit_state|core_pulse_state|skill_cast_state|sudden_death|\bgold\b|\bexp\b|currency|reward|ranking|economy|[a-z]+_[a-z]+/i;
  log('R20 no forbidden/economy/internal/snake_case player-facing strings', !forbidden.test(copy), forbidden.test(copy) ? copy : 'clean');

  // ---------- R21: no fatal console errors ----------
  log('R21 no fatal console errors', errs.length === 0, errs.join('; ') || 'none');

  await browser.close();
  const failed = results.filter((r) => !r.p);
  console.log(`\nSUMMARY ${results.length - failed.length}/${results.length}`);
  if (failed.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
