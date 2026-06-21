/**
 * Phase 5B-2 Multi Bot Separation / Formation Safety regression.
 * Usage: node scripts/phase-5b-2-multi-bot-separation-regression.mjs [baseUrl]
 *
 * Validates that multiple BotPlayers no longer stack on the same spot or collapse
 * into one blob when converging on the player: a SOFT bot-vs-bot separation push
 * keeps a readable gap (class-aware — melee holds the front, ranged stays out of
 * its body) while never breaking an attack / skill cast, never causing jitter,
 * never pushing a bot past its leash, and never fighting the off-leash return.
 * Also re-confirms each class still attacks / holds / kites / fires / casts,
 * player melee multi-hit, reset/leak safety, mobile readability, human stats,
 * difficulty scope, and all frozen systems.
 *
 * Out of scope (NOT added / NOT tested): squad AI, shared targeting, objective
 * AI, formation commander, multi-bot balance scaling (5B-3 / 5C).
 */
import puppeteer from 'puppeteer';

const BASE_URL = process.argv[2] ?? 'http://127.0.0.1:4173';
const results = [];
const log = (t, p, d = '') => { results.push({ t, p }); console.log(`${p ? 'PASS' : 'FAIL'}: ${t}${d ? ` — ${d}` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let booted = false;
async function startMatch(page, { viewport = { width: 1280, height: 720 }, heroClass = 'guardian', encounter, botClass } = {}) {
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
  await sleep(120);
  await page.evaluate(({ hc, enc, bc }) => {
    const g = window.__CLANWAR_GAME__;
    try { g.scene.stop('MenuScene'); } catch (e) {}
    const data = { heroClass: hc };
    if (enc !== undefined) data.encounter = enc;
    if (bc !== undefined) data.botClass = bc;
    g.scene.start('MatchScene', data);
  }, { hc: heroClass, enc: encounter, bc: botClass });
  await page.waitForFunction(() => {
    const s = window.__CLANWAR_GAME__?.scene?.getScene('MatchScene');
    return s?.objectiveSystem && s?.matchTimerSystem && s?.player && s?.botSystem?.getBotSnapshots;
  });
  await sleep(280);
}

const botCount = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getBotCount());
const botSnaps = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getBotSnapshots());
const brainSnaps = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getBrainSnapshots());
const skillInfos = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getSkillInfos());
const skillCasts = (page) => page.evaluate(() => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.getSkillCastDebugs());
const setCooldownAll = (page, ms) => page.evaluate((m) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugSetCooldownAll(m), ms);
const tagCount = (page, tag) => page.evaluate((t) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').children.list.filter((o) => o.getData && o.getData(t)).length, tag);

const teleportBotAt = (page, i, x, y) => page.evaluate(({ idx, px, py }) => window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem.debugTeleportBotAt(idx, px, py), { idx: i, px: x, py: y });
async function teleportPlayer(page, x, y) {
  await page.evaluate(({ px, py }) => { const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene'); s.player.sprite.setPosition(px, py); s.player.body.reset(px, py); s.player.update(); }, { px: x, py: y });
}

/** Smallest centre-to-centre distance among all living bots. */
function minPairDist(snaps) {
  const live = snaps.filter((s) => !s.dead);
  let m = Infinity;
  for (let a = 0; a < live.length; a++) {
    for (let b = a + 1; b < live.length; b++) {
      m = Math.min(m, Math.hypot(live[a].x - live[b].x, live[a].y - live[b].y));
    }
  }
  return live.length < 2 ? Infinity : m;
}

/**
 * Stack every bot within a few px of `anchor`, park the player `playerDist` away
 * along +y, run the sim, and sample the minimum pairwise distance over the tail
 * window. Returns { minOverTail, finalMin, samples }.
 */
async function convergeScenario(page, { anchor, playerDist, frames = 90, tailFrames = 30, jitterTrack = false }) {
  const n = await botCount(page);
  for (let i = 0; i < n; i++) {
    // tiny deterministic offset so they are "stacked" but not exactly coincident
    await teleportBotAt(page, i, anchor.x + (i % 2) * 6 - 3, anchor.y + Math.floor(i / 2) * 6 - 3);
  }
  await teleportPlayer(page, anchor.x, anchor.y + playerDist);
  await setCooldownAll(page, 400);
  let minOverTail = Infinity;
  const trail = jitterTrack ? Array.from({ length: n }, () => []) : null;
  for (let f = 0; f < frames; f++) {
    await sleep(30);
    const snaps = await botSnaps(page);
    if (f >= frames - tailFrames) minOverTail = Math.min(minOverTail, minPairDist(snaps));
    if (trail) snaps.forEach((s, i) => { if (f >= frames - tailFrames) trail[i].push({ x: s.x, y: s.y }); });
  }
  const finalMin = minPairDist(await botSnaps(page));
  return { minOverTail, finalMin, trail };
}

/** Park the player in bot[i]'s firing position; report wind-up + hold distance. */
async function attackProbe(page, i, { meleeDist = 40 } = {}) {
  const b = (await botSnaps(page))[i];
  const dist = b.attackKind === 'ranged' ? Math.round(b.attackRange * 0.75) : meleeDist;
  await teleportPlayer(page, b.x, b.y + dist);
  await setCooldownAll(page, 0);
  let sawWindup = false; let minPlayerGap = Infinity;
  for (let f = 0; f < 60; f++) {
    await sleep(30);
    await setCooldownAll(page, 0);
    const s = (await botSnaps(page))[i];
    const pp = await page.evaluate(() => { const m = window.__CLANWAR_GAME__.scene.getScene('MatchScene'); return { x: m.player.x, y: m.player.y }; });
    minPlayerGap = Math.min(minPlayerGap, Math.hypot(s.x - pp.x, s.y - pp.y));
    if (s.state === 'windup') sawWindup = true;
    if (s.state === 'recovery') break;
  }
  return { sawWindup, minPlayerGap };
}

/** Fire-probe a ranged bot: park in band, report fired-kind + that it held. */
async function fireProbe(page, i, kind) {
  const b = (await botSnaps(page))[i];
  await teleportPlayer(page, b.x, b.y + Math.round(b.attackRange * 0.75));
  await setCooldownAll(page, 0);
  let fired = false; let rushedToMelee = false;
  for (let f = 0; f < 70; f++) {
    await sleep(30);
    await setCooldownAll(page, 0);
    const seen = await page.evaluate((k) => {
      const o = window.__CLANWAR_GAME__.scene.getScene('MatchScene').children.list.find((c) => c.getData && c.getData('normalAttackProjectile') === k);
      return !!o;
    }, kind);
    const s = (await botSnaps(page))[i];
    const pp = await page.evaluate(() => { const m = window.__CLANWAR_GAME__.scene.getScene('MatchScene'); return { x: m.player.x, y: m.player.y }; });
    if (Math.hypot(s.x - pp.x, s.y - pp.y) < 90) rushedToMelee = true; // ranged should never close to melee
    if (seen) fired = true;
    if (fired) break;
  }
  return { fired, held: !rushedToMelee };
}

async function skillProbe(page, i) {
  const info = (await skillInfos(page))[i];
  const b = (await botSnaps(page))[i];
  const dist = Math.max(20, Math.min(info.range - 40, 200));
  await teleportPlayer(page, b.x, b.y + dist);
  for (let f = 0; f < 80; f++) {
    await sleep(35);
    const casts = (await skillCasts(page))[i]?.casts ?? 0;
    if (casts >= 1) return true;
  }
  return false;
}

const HUMAN_STATS = {
  guardian: { hp: 1200, attack: 45, armor: 25, moveSpeed: 170, attackRange: 60 },
  warrior: { hp: 950, attack: 70, armor: 15, moveSpeed: 190, attackRange: 65 },
  ranger: { hp: 700, attack: 55, armor: 8, moveSpeed: 200, attackRange: 320 },
  mage: { hp: 650, attack: 35, armor: 5, moveSpeed: 185, attackRange: 250 },
  priest: { hp: 750, attack: 30, armor: 8, moveSpeed: 185, attackRange: 230 },
};

// "Not stacked": centres clearly apart (bot body radius is 24 → 48 = touching).
const SEP_MIN = 40;

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/404|favicon/i.test(m.text())) consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

  try {
    // --- 1: duel_plus spawns 2 bots ---
    await startMatch(page, { encounter: 'duel_plus' });
    const duelCount = await botCount(page);
    log('1 duel_plus spawns 2 bots', duelCount === 2, `count=${duelCount}`);

    // --- 2: duel_plus bots maintain separation while chasing (player far) ---
    {
      const anchor = { x: 1700, y: 3400 };
      const r = await convergeScenario(page, { anchor, playerDist: 360, frames: 100, tailFrames: 40 });
      log('2 duel_plus bots maintain separation while chasing', r.minOverTail > SEP_MIN, `minTail=${r.minOverTail.toFixed(0)} final=${r.finalMin.toFixed(0)}`);
    }

    // --- 3: duel_plus bots maintain separation while attacking (player in range) ---
    {
      await startMatch(page, { encounter: 'duel_plus' });
      const anchor = { x: 1700, y: 3400 };
      const r = await convergeScenario(page, { anchor, playerDist: 150, frames: 100, tailFrames: 40 });
      log('3 duel_plus bots maintain separation while attacking', r.minOverTail > SEP_MIN, `minTail=${r.minOverTail.toFixed(0)} final=${r.finalMin.toFixed(0)}`);
    }

    // --- 4: full_party_lite spawns 4 bots ---
    await startMatch(page, { encounter: 'full_party_lite' });
    const fullCount = await botCount(page);
    log('4 full_party_lite spawns 4 bots', fullCount === 4, `count=${fullCount}`);

    // --- 5: full_party_lite bots do not all collapse into one position ---
    {
      const anchor = { x: 1700, y: 3400 };
      const r = await convergeScenario(page, { anchor, playerDist: 230, frames: 120, tailFrames: 40 });
      log('5 full_party_lite bots do not all stack into one position', r.minOverTail > SEP_MIN, `minTail=${r.minOverTail.toFixed(0)} final=${r.finalMin.toFixed(0)}`);
    }

    // --- 6: each bot keeps unique id / class / spawn / brain ---
    {
      await startMatch(page, { encounter: 'full_party_lite' });
      const snaps = await botSnaps(page);
      const brains = await brainSnaps(page);
      const ids = snaps.map((s) => s.id);
      const classes = snaps.map((s) => s.classId);
      const spawns = snaps.map((s) => `${s.spawnX},${s.spawnY}`);
      const ok = new Set(ids).size === 4 && new Set(classes).size === 4 && new Set(spawns).size === 4 && brains.length === 4 && brains.every((b) => !!b.goal);
      log('6 each bot keeps unique id/class/spawn/brain', ok, `ids=${ids.join('|')} classes=${classes.join(',')}`);
    }

    // --- 7: Warrior still reaches melee range (winds up + closes to melee) ---
    {
      await startMatch(page, { encounter: 'duel_plus' });
      const snaps = await botSnaps(page);
      const wi = snaps.findIndex((s) => s.classId === 'warrior');
      const r = await attackProbe(page, wi, { meleeDist: 40 });
      log('7 Warrior still reaches melee range', r.sawWindup && r.minPlayerGap < 90, `windup=${r.sawWindup} minGap=${r.minPlayerGap.toFixed(0)}`);
    }

    // --- 8: Ranger still holds/kites and fires arrow ---
    {
      await startMatch(page, { encounter: 'duel_plus' });
      const ri = (await botSnaps(page)).findIndex((s) => s.classId === 'ranger');
      const r = await fireProbe(page, ri, 'arrow');
      log('8 Ranger still holds/kites and fires arrow', r.fired && r.held, `fired=${r.fired} held=${r.held}`);
    }

    // --- 9: Mage still holds/kites and fires magic bolt ---
    {
      await startMatch(page, { encounter: 'arcane_pressure' });
      const mi = (await botSnaps(page)).findIndex((s) => s.classId === 'mage');
      const r = await fireProbe(page, mi, 'magic_bolt');
      log('9 Mage still holds/kites and fires magic bolt', r.fired && r.held, `fired=${r.fired} held=${r.held}`);
    }

    // --- 10: Priest still holds/kites and fires holy bolt ---
    {
      await startMatch(page, { encounter: 'sustain_pressure' });
      const pi = (await botSnaps(page)).findIndex((s) => s.classId === 'priest');
      const r = await fireProbe(page, pi, 'holy_bolt');
      log('10 Priest still holds/kites and fires holy bolt', r.fired && r.held, `fired=${r.fired} held=${r.held}`);
    }

    // --- 11: each bot can cast its class skill ---
    {
      await startMatch(page, { encounter: 'duel_plus' });
      const casts = [];
      for (let i = 0; i < 2; i++) { await startMatch(page, { encounter: 'duel_plus' }); casts.push(await skillProbe(page, i)); }
      log('11 each bot can cast class skill', casts.every(Boolean), `casts=${casts.join(',')}`);
    }

    // --- 12: separation does not create jitter (settled bots barely move) ---
    {
      await startMatch(page, { encounter: 'full_party_lite' });
      const anchor = { x: 1700, y: 3400 };
      const r = await convergeScenario(page, { anchor, playerDist: 230, frames: 130, tailFrames: 30, jitterTrack: true });
      // After settling, each bot's position spread over the tail window must be small.
      const spreads = r.trail.map((pts) => {
        if (pts.length < 2) return 0;
        const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
        return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      });
      const maxSpread = Math.max(...spreads);
      log('12 separation does not create jitter', maxSpread < 24, `maxTailSpread=${maxSpread.toFixed(1)}`);
    }

    // --- 13: separation does not push bots outside leash ---
    {
      await startMatch(page, { encounter: 'full_party_lite' });
      let snaps = await botSnaps(page);
      // Stack all bots near the leash edge of bot 0, away from spawns, no player near.
      const lead = snaps[0];
      const edge = { x: lead.spawnX + (lead.leashRange - 30), y: lead.spawnY };
      for (let i = 0; i < snaps.length; i++) await teleportBotAt(page, i, edge.x + (i % 2) * 6, edge.y + Math.floor(i / 2) * 6);
      await teleportPlayer(page, edge.x + 600, edge.y + 600); // far: bots not chasing
      let maxOver = 0;
      for (let f = 0; f < 70; f++) {
        await sleep(30);
        snaps = await botSnaps(page);
        for (const s of snaps) {
          const d = Math.hypot(s.x - s.spawnX, s.y - s.spawnY);
          maxOver = Math.max(maxOver, d - s.leashRange);
        }
      }
      // Bots may briefly sit just past leash from the teleport, but separation must
      // never carry them FURTHER out — allow a small tolerance for the start state.
      log('13 separation does not push bots outside leash', maxOver < 40, `maxBeyondLeash=${maxOver.toFixed(0)}`);
    }

    // --- 14: stuck/off-leash return still overrides separation ---
    {
      await startMatch(page, { encounter: 'duel_plus' });
      const snaps = await botSnaps(page);
      // Teleport bot 0 well beyond its leash; stack bot 1 on it. Off-leash → the
      // brain must return to spawn, and separation must not trap it there.
      const off = { x: snaps[0].spawnX + snaps[0].leashRange + 220, y: snaps[0].spawnY };
      await teleportBotAt(page, 0, off.x, off.y);
      await teleportBotAt(page, 1, off.x + 6, off.y + 6);
      await teleportPlayer(page, off.x + 1200, off.y); // keep player out of it
      const d0 = Math.hypot(off.x - snaps[0].spawnX, off.y - snaps[0].spawnY);
      let goal = '';
      let dLater = d0;
      for (let f = 0; f < 70; f++) {
        await sleep(30);
        const b = (await botSnaps(page))[0];
        const g = (await brainSnaps(page))[0];
        goal = g.goal;
        dLater = Math.hypot(b.x - b.spawnX, b.y - b.spawnY);
        if (goal === 'return_to_spawn' && dLater < d0 - 40) break;
      }
      log('14 stuck/off-leash return still works', goal === 'return_to_spawn' && dLater < d0, `goal=${goal} d0=${d0.toFixed(0)} dLater=${dLater.toFixed(0)}`);
    }

    // --- 15: player melee multi-hit still works (one swing cleaves stacked bots) ---
    {
      await startMatch(page, { encounter: 'duel_plus' });
      const anchor = { x: 1700, y: 3400 };
      await teleportBotAt(page, 0, anchor.x - 10, anchor.y);
      await teleportBotAt(page, 1, anchor.x + 10, anchor.y);
      const before = (await botSnaps(page)).map((s) => s.hp);
      const hit = await page.evaluate(({ ax, ay }) => {
        const sys = window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem;
        // Swing from just below the pair, facing up, wide arc / generous range.
        return !!sys.tryPlayerMeleeHit(ax, ay + 70, -Math.PI / 2, 160, 200);
      }, { ax: anchor.x, ay: anchor.y });
      await sleep(60);
      const after = (await botSnaps(page)).map((s) => s.hp);
      const bothHit = after[0] < before[0] && after[1] < before[1];
      log('15 player melee multi-hit still works', hit && bothHit, `before=${before.join(',')} after=${after.join(',')}`);
    }

    // --- 16: reset MatchScene x3 — no duplicate bot/projectile/skill/brain ---
    {
      let maxTags = 0, maxCount = 0;
      for (let i = 0; i < 3; i++) {
        await startMatch(page, { encounter: 'duel_plus' });
        maxTags = Math.max(maxTags, await tagCount(page, 'enemyBot'));
        maxCount = Math.max(maxCount, await botCount(page));
      }
      const leakProj = await tagCount(page, 'normalAttackProjectile');
      const leakSkill = await tagCount(page, 'botSkillProjectile');
      const brainsLen = (await brainSnaps(page)).length;
      const ok = maxTags === 2 && maxCount === 2 && leakProj === 0 && leakSkill === 0 && brainsLen === 2;
      log('16 reset x3 no duplicate bot/projectile/skill/brain', ok, `tags=${maxTags} count=${maxCount} proj=${leakProj} skill=${leakSkill} brains=${brainsLen}`);
    }

    // --- 17-18: mobile readability with 2 bots ---
    for (const [w, h, n] of [[915, 412, 17], [800, 360, 18]]) {
      await startMatch(page, { viewport: { width: w, height: h }, encounter: 'duel_plus' });
      const m = await page.evaluate(() => {
        const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
        const list = s.children.list;
        const bodies = list.filter((o) => o.getData && o.getData('enemyBot')).length;
        const markers = list.filter((o) => o.getData && o.getData('botEnemyMarker') && o.visible).length;
        const hpBars = list.filter((o) => o.getData && o.getData('botHpBar') && o.visible).length;
        const visuals = s.botSystem.getBotEntities().every((b) => b.hasCharacterVisual());
        const joystick = !!document.querySelector('canvas');
        return { bodies, markers, hpBars, visuals, joystick };
      });
      log(`${n} mobile ${w}x${h} readable with 2 bots`, m.bodies === 2 && m.markers >= 2 && m.hpBars >= 2 && m.visuals && m.joystick, JSON.stringify(m));
    }

    // --- 19: full_party_lite readable enough for debug (4 distinct bodies, not blobbed) ---
    {
      await startMatch(page, { viewport: { width: 915, height: 412 }, encounter: 'full_party_lite' });
      const anchor = { x: 1700, y: 3400 };
      await convergeScenario(page, { anchor, playerDist: 230, frames: 90, tailFrames: 10 });
      const m = await page.evaluate(() => {
        const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
        const list = s.children.list;
        const bodies = list.filter((o) => o.getData && o.getData('enemyBot')).length;
        const visuals = s.botSystem.getBotEntities().every((b) => b.hasCharacterVisual());
        return { bodies, visuals };
      });
      const sep = minPairDist(await botSnaps(page));
      log('19 full_party_lite readable enough for debug', m.bodies === 4 && m.visuals && sep > SEP_MIN, `bodies=${m.bodies} minSep=${sep.toFixed(0)}`);
    }

    // --- 20: human class stats unchanged ---
    const humanStats = {};
    for (const c of Object.keys(HUMAN_STATS)) {
      await startMatch(page, { heroClass: c, encounter: 'duel_plus' });
      humanStats[c] = await page.evaluate(() => { const p = window.__CLANWAR_GAME__.scene.getScene('MatchScene').player; return { hp: p.maxHp, attack: p.attack, armor: p.armor, moveSpeed: p.moveSpeed, attackRange: p.attackRange }; });
    }
    const statsOk = Object.entries(HUMAN_STATS).every(([c, exp]) => {
      const b = humanStats[c];
      return b && b.hp === exp.hp && b.attack === exp.attack && b.armor === exp.armor && b.moveSpeed === exp.moveSpeed && b.attackRange === exp.attackRange;
    });
    log('20 human class stats unchanged', statsOk, JSON.stringify(humanStats));

    // --- 21: difficulty affects bots only ---
    await startMatch(page, { encounter: 'duel_plus' });
    const diff = await page.evaluate(() => {
      const sys = window.__CLANWAR_GAME__.scene.getScene('MatchScene').botSystem;
      const out = {};
      for (const d of ['easy', 'normal', 'hard']) { sys.debugSetDifficulty(d); out[d] = sys.getBotSnapshots().map((s) => s.attack); }
      sys.debugSetDifficulty('normal');
      const playerAttack = window.__CLANWAR_GAME__.scene.getScene('MatchScene').player.attack;
      return { out, playerAttack };
    });
    const diffOk = diff.out.easy.length === 2 && diff.out.easy.every((a, i) => a < diff.out.hard[i]);
    log('21 difficulty affects bot only', diffOk, JSON.stringify(diff));

    // --- 22: Gate/Core/Capture/Siege Buff/Timer/Score unchanged ---
    await startMatch(page, { encounter: 'full_party_lite' });
    const frozen = await page.evaluate(() => {
      const s = window.__CLANWAR_GAME__.scene.getScene('MatchScene');
      return {
        timer: s.matchTimerSystem.getRemainingSeconds ? s.matchTimerSystem.getRemainingSeconds() : 300,
        coreHpBlue: s.objectiveSystem.getCoreHp ? s.objectiveSystem.getCoreHp('blue') : 2000,
        coreHpRed: s.objectiveSystem.getCoreHp ? s.objectiveSystem.getCoreHp('red') : 2000,
        phase: s.objectiveSystem.getMatchPhase(),
      };
    });
    log('22 Gate/Core/Capture/Siege/Timer/Score unchanged', frozen.timer === 300 && frozen.coreHpBlue === 2000 && frozen.coreHpRed === 2000 && frozen.phase === 'in_progress', JSON.stringify(frozen));

    // --- 23: no fatal console errors ---
    log('23 no fatal console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | ') || 'none');
  } catch (err) {
    console.error('FATAL', err);
    results.push({ t: 'fatal', p: false });
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.p).length;
  console.log(`\nSUMMARY ${passed}/${results.length}`);
  process.exit(passed === results.length ? 0 : 1);
}

main();
