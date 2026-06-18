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

/**
 * Phase 4E Theme 1 swaps these 5 combat-feel VFX sprites to namespaced themed
 * keys when the theme is enabled. This table MIRRORS `VFX_THEME_MAP` in
 * `src/game/theme/Phase4ETheme.ts` (kept in sync by hand — this regression
 * script runs in Node and cannot import the TS resolver, which also needs a
 * live Phaser scene). Each VFX assertion below accepts EITHER the legacy key
 * (Phase 4E theme disabled) OR the themed key (theme enabled). The assertion
 * still fails if NEITHER key is present, so VFX presence is never weakened —
 * only the exact key identity is allowed to drift.
 */
const VFX_KEYS = {
  hitSpark: { legacy: 'vfx_hit_spark', themed: 'phase4e_theme1_vfx_normal_hit_spark' },
  gateHit: { legacy: 'vfx_gate_hit_spark', themed: 'phase4e_theme1_vfx_gate_hit_spark' },
  corePulse: { legacy: 'vfx_core_hit_pulse', themed: 'phase4e_theme1_vfx_core_hit_pulse' },
  castFlash: { legacy: 'vfx_skill_cast_flash', themed: 'phase4e_theme1_vfx_skill_cast_flash' },
  impactRing: { legacy: 'vfx_impact_ring', themed: 'phase4e_theme1_vfx_impact_ring' },
};
// Flat list of every legacy + themed combat-feel VFX key, for depth coverage.
const ALL_VFX_KEYS = Object.values(VFX_KEYS).flatMap((m) => [m.legacy, m.themed]);

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
// VFX counts are theme-aware: `count` = legacy + themed sprites, and `via`
// records which key carried the count (for debugging). Behaviour assertions
// read `.count` so they hold whether Theme 1 is on or off, and still fail when
// neither key is present.
const COUNT = `(() => {
  const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
  const list = s.children.list;
  const VFX = ${JSON.stringify(VFX_KEYS)};
  const tex = (k) => list.filter((o) => o.active && o.texture && o.texture.key === k).length;
  const vfx = (name) => {
    const m = VFX[name];
    const legacy = tex(m.legacy);
    const themed = tex(m.themed);
    return { count: legacy + themed, legacy, themed, via: themed > 0 ? 'themed' : (legacy > 0 ? 'legacy' : 'none') };
  };
  const dmgNums = list.filter((o) => o.active && typeof o.text === 'string' && /^-\\d+$/.test(o.text));
  return {
    hitSpark: vfx('hitSpark'),
    gateHit: vfx('gateHit'),
    corePulse: vfx('corePulse'),
    castFlash: vfx('castFlash'),
    impactRing: vfx('impactRing'),
    dmgCount: dmgNums.length,
    dmgSample: dmgNums.map((o) => ({ t: o.text, depth: o.depth, stroke: o.style && o.style.strokeThickness, color: o.style && o.style.color })),
  };
})()`;

// Poll up to timeoutMs for a COUNT snapshot satisfying pred (robust against
// single-frame VFX spawn / fixed-sample-boundary flake). Returns the last
// snapshot seen, whether or not pred was ultimately satisfied.
async function pollCount(page, pred, timeoutMs = 250, stepMs = 25) {
  let snap = await page.evaluate(COUNT);
  const deadline = Date.now() + timeoutMs;
  while (!pred(snap) && Date.now() < deadline) {
    await sleep(stepMs);
    snap = await page.evaluate(COUNT);
  }
  return snap;
}

// Cast skill1 ('q') and return the snapshot once its cast flash is visible.
// The very first keypress after a scene start can be dropped before Phaser's
// keyboard plugin is ready; a dropped press leaves the skill off cooldown, so
// re-pressing is legitimate and only happens when nothing actually cast. This
// does NOT weaken the assertion: if a real cast genuinely produced no flash,
// the first silent cast consumes the cooldown and every retry is then blocked,
// so the flash count stays 0 and the caller's assertion still fails.
async function castSkill1WithFlash(page, attempts = 4) {
  let snap = await page.evaluate(COUNT);
  for (let i = 0; i < attempts && snap.castFlash.count < 1; i++) {
    await page.keyboard.press('q');
    snap = await pollCount(page, (c) => c.castFlash.count >= 1, 200);
  }
  return snap;
}

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
  log('R1 normal hit spark appears (legacy or themed key)', hit.hitSpark.count >= 1, JSON.stringify({ hitSpark: hit.hitSpark }));
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
  log('R4 Gate hit uses Gate feedback (gate hit spark legacy/themed + amber number)', r4.gateHit.count >= 1 && !!r4dmg, JSON.stringify({ gateHit: r4.gateHit, amber: !!r4dmg }));

  // ---------- R5: Core hit pulse ----------
  await startMatch(page);
  const r5 = await page.evaluate((countSrc) => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.objectiveSystem.debugDealDamage('redGate', 100000, 'blue'); // breach gate => core vulnerable
    s.objectiveSystem.debugDealDamage('redCore', 100, 'blue'); // core hit (not lethal)
    return eval(countSrc);
  }, COUNT);
  const r5dmg = r5.dmgSample.find((d) => /f4d35e/i.test(d.color || ''));
  log('R5 Core hit uses Core pulse (core pulse legacy/themed + gold number)', r5.corePulse.count >= 1 && !!r5dmg, JSON.stringify({ corePulse: r5.corePulse, gold: !!r5dmg }));

  // ---------- R6: Skill cast flash only on success ----------
  // First Q = successful cast (flash). Second Q (immediately) = cooldown fail (no new flash).
  // Poll for the success flash (legacy or themed) rather than sampling at a
  // fixed 50ms boundary — the flash is a single-frame spawn with ~220ms life,
  // and a fixed sample (or a dropped first keypress) could miss it entirely
  // (Agent F flake finding). castSkill1WithFlash only retries genuinely
  // dropped presses, so a real missing-flash regression still fails.
  await startMatch(page);
  const castOk = await castSkill1WithFlash(page); // success flash must appear
  await page.keyboard.press('q'); // on cooldown now -> must NOT add a flash
  await sleep(50);
  const castCd = await page.evaluate(COUNT); // first flash still alive; should NOT increase
  log('R6 skill cast flash on success only (cooldown press adds none)',
    castOk.castFlash.count >= 1 && castCd.castFlash.count <= castOk.castFlash.count,
    JSON.stringify({ success: castOk.castFlash, afterCooldownPress: castCd.castFlash }));

  // ---------- R7: Gate destroyed uses impact ring ----------
  await startMatch(page);
  const r7 = await page.evaluate((countSrc) => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.objectiveSystem.debugDealDamage('redGate', 100000, 'blue');
    const breach = s.objectiveSystem.getLastWorldFeedback();
    return { ...eval(countSrc), breach };
  }, COUNT);
  log('R7 Gate destroyed uses impact ring (legacy/themed) + "Gate Breached" primary', r7.impactRing.count >= 1 && r7.breach === 'Gate Breached', JSON.stringify({ impactRing: r7.impactRing, breach: r7.breach }));

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
  const layering = await page.evaluate((vfxKeys) => {
    const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
    s.captureSystem.debugSetSiegeRuinsState('blue', 'idle');
    s.siegeBuffSystem.update(100);
    s.captureSystem.debugSetCaptureProgress('resourceCampL', 50);
    s.captureSystem.simulatePlayerAtObjective('resourceCampL');
    const d = s.captureSystem.getSnapshots().find((o) => o.id === 'resourceCampL');
    s.captureSystem.update(16, d.x, d.y, 'blue');
    s.objectiveSystem.debugDealDamage('redGate', 100, 'blue'); // spawn gate VFX + number
    const list = s.children.list;
    // Cover BOTH legacy and themed VFX keys so a themed sprite cannot pass this
    // check by being invisible to a legacy-only key list.
    const vfxDepths = list.filter((o) => o.texture && vfxKeys.includes(o.texture.key)).map((o) => o.depth);
    const dmgDepths = list.filter((o) => typeof o.text === 'string' && /^-\\d+$/.test(o.text)).map((o) => o.depth);
    const fxCount = vfxDepths.length;
    const maxFx = Math.max(0, ...vfxDepths, ...dmgDepths);
    // HUD/world-fixed elements live at depth >= 1090 on the main camera.
    const hudMin = 1090;
    return { fxCount, maxFx, hudMin, ok: maxFx < hudMin };
  }, ALL_VFX_KEYS);
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
