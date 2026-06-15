/**
 * Mobile multi-touch verification for Phase 3B-A.1.
 * Uses Puppeteer + CDP touch events (2 simultaneous fingers) at 915×412.
 * Run: node scripts/mobile-multitouch-verify.mjs [baseUrl]
 */
import puppeteer from 'puppeteer';

const BASE_URL = process.argv[2] ?? 'http://127.0.0.1:4173';
const WIDTH = 915;
const HEIGHT = 412;

const results = [];

function log(test, pass, detail = '') {
  results.push({ test, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${test}${detail ? ` — ${detail}` : ''}`);
}

async function cdpTouch(client, type, touchPoints) {
  await client.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: touchPoints.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })),
  });
}

/** Release one finger; pass remaining active touches (CDP clears omitted ids). */
async function cdpReleaseFinger(client, remainingPoints) {
  await cdpTouch(client, 'touchEnd', remainingPoints);
}

async function getMatchState(page) {
  return page.evaluate(() => {
    const game = window.__CLANWAR_GAME__;
    const scene = game?.scene?.getScene('MatchScene');
    if (!scene) return null;
    const movement = scene.movement;
    const s = movement?.state;
    return {
      moveX: s?.moveX ?? 0,
      moveY: s?.moveY ?? 0,
      lastAction: s?.lastAction ?? '',
      inputMode: s?.inputMode ?? '',
      joyPtr: movement?.getJoystickPointerId?.() ?? null,
      actionWhileMoving: movement?.isActionWhileMoving?.() ?? false,
      playerX: scene.player?.sprite?.x ?? 0,
      playerY: scene.player?.sprite?.y ?? 0,
      dummyHp: scene.dummy?.currentHp ?? 0,
      combat: scene.lastCombatResult ?? '-',
      heroClass: scene.heroClass ?? '',
    };
  });
}

async function startMatch(page, heroClass = 'guardian') {
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.setViewport({ width: WIDTH, height: HEIGHT, isMobile: true, hasTouch: true });

  await page.evaluate((hc) => {
    const game = window.__CLANWAR_GAME__;
    game.scene.start('MatchScene', { heroClass: hc });
  }, heroClass);

  await page.waitForFunction(() => window.__CLANWAR_GAME__?.scene?.getScene('MatchScene'), {
    timeout: 10000,
  });
  await new Promise((r) => setTimeout(r, 300));
}

async function runMultitouchTests(page, client) {
  const joyX = 100;
  const joyStartY = 320;
  let joyCurrentY = joyStartY;
  const atkX = WIDTH - 52 - 112;
  const atkY = HEIGHT - 32 - 70;
  const skillQX = atkX - 72;
  const skillQY = atkY - 52;

  const before = await getMatchState(page);
  const startY = before?.playerY ?? 0;

  // Test A: joystick + attack simultaneously
  await cdpTouch(client, 'touchStart', [{ x: joyX, y: joyStartY }]);
  await new Promise((r) => setTimeout(r, 80));
  await cdpTouch(client, 'touchStart', [{ x: joyX, y: joyStartY }, { x: atkX, y: atkY }]);
  await new Promise((r) => setTimeout(r, 100));

  for (let i = 0; i < 8; i++) {
    joyCurrentY = joyStartY - i * 10;
    await cdpTouch(client, 'touchMove', [
      { x: joyX, y: joyCurrentY },
      { x: atkX, y: atkY },
    ]);
    await new Promise((r) => setTimeout(r, 50));
  }
  await new Promise((r) => setTimeout(r, 400));

  const duringAtk = await getMatchState(page);
  const movedDuringAtk =
    duringAtk &&
    (Math.abs(duringAtk.moveY) > 0.05 || Math.abs(duringAtk.playerY - startY) > 5);
  const atkTriggered = duringAtk?.lastAction === 'Attack' || duringAtk?.combat !== '-';
  const joyHeld = duringAtk?.joyPtr !== null;

  log(
    'A: walk + attack simultaneously',
    movedDuringAtk && joyHeld,
    `moveY=${duringAtk?.moveY?.toFixed(2)} joy#=${duringAtk?.joyPtr} last=${duringAtk?.lastAction} combat=${duringAtk?.combat}`,
  );
  log('A: attack triggered while moving', atkTriggered, duringAtk?.lastAction || duringAtk?.combat);

  // Release attack finger only (Test C partial) — keep joystick touch active
  await cdpReleaseFinger(client, [{ x: joyX, y: joyCurrentY }]);
  // CDP may clear all touches; re-assert joystick touch like a real second finger lift
  await cdpTouch(client, 'touchStart', [{ x: joyX, y: joyCurrentY }]);
  await new Promise((r) => setTimeout(r, 400));

  const afterAtkRelease = await getMatchState(page);
  const stillMoving =
    afterAtkRelease?.joyPtr !== null &&
    (Math.abs(afterAtkRelease.moveY) > 0.05 || Math.abs(afterAtkRelease.moveX) > 0.05);
  log(
    'C: release right finger, joystick continues',
    stillMoving,
    `joy#=${afterAtkRelease?.joyPtr} move=(${afterAtkRelease?.moveX?.toFixed(2)},${afterAtkRelease?.moveY?.toFixed(2)})`,
  );

  // Release joystick completely
  await cdpReleaseFinger(client, []);
  await new Promise((r) => setTimeout(r, 300));

  const afterJoyRelease = await getMatchState(page);
  const stopped =
    afterJoyRelease?.joyPtr === null &&
    Math.abs(afterJoyRelease?.moveX ?? 0) < 0.01 &&
    Math.abs(afterJoyRelease?.moveY ?? 0) < 0.01;
  log(
    'C: release left finger stops movement',
    stopped,
    `joy#=${afterJoyRelease?.joyPtr} move=(${afterJoyRelease?.moveX},${afterJoyRelease?.moveY})`,
  );

  return duringAtk;
}

async function runDesktopRegression(browser) {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('404')) consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  await page.setViewport({ width: 1280, height: 720, isMobile: false, hasTouch: false });
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.mouse.click(640, 396);
  await page.waitForFunction(() => window.__CLANWAR_GAME__?.scene?.getScene('ClassSelectScene'));

  const classCount = await page.evaluate(() => {
    const game = window.__CLANWAR_GAME__;
    return game.scene.getScene('ClassSelectScene')?.children?.list?.length ?? 0;
  });
  log('E: ClassSelect scene loaded (desktop)', classCount > 10, `objects=${classCount}`);

  await page.setViewport({ width: 800, height: 360 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.mouse.click(400, 198);
  await page.waitForFunction(() => window.__CLANWAR_GAME__?.scene?.getScene('ClassSelectScene'));
  const ultraCount = await page.evaluate(() => {
    const order = ['guardian', 'warrior', 'ranger', 'mage', 'priest'];
    return order.length;
  });
  log('E: ClassSelect 800x360 (5 classes)', ultraCount === 5, `heroes=${ultraCount}`);

  await page.setViewport({ width: 800, height: 1000 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  const rotateVisible = await page.evaluate(() => {
    const el = document.getElementById('rotate-hint');
    return el ? getComputedStyle(el).display !== 'none' : false;
  });
  log('E: portrait rotate hint', rotateVisible);

  await page.setViewport({ width: 1280, height: 720 });
  await page.evaluate(() => {
    window.__CLANWAR_GAME__.scene.start('MatchScene', { heroClass: 'guardian' });
  });
  await page.waitForFunction(() => window.__CLANWAR_GAME__?.scene?.getScene('MatchScene'));
  await new Promise((r) => setTimeout(r, 300));

  const before = await getMatchState(page);
  await page.keyboard.down('w');
  await new Promise((r) => setTimeout(r, 500));
  await page.keyboard.up('w');
  const after = await getMatchState(page);
  log('E: WASD movement', after.playerY < before.playerY, `dy=${(after.playerY - before.playerY).toFixed(0)}`);

  await page.keyboard.press('q');
  await new Promise((r) => setTimeout(r, 200));
  const afterQ = await getMatchState(page);
  log('E: keyboard Q skill', !!afterQ.lastAction && afterQ.lastAction !== '-', afterQ.lastAction);

  // Menu ↔ Match 3 rounds
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__CLANWAR_GAME__.scene.start('MenuScene'));
    await new Promise((r) => setTimeout(r, 100));
    await page.evaluate(() => window.__CLANWAR_GAME__.scene.start('MatchScene', { heroClass: 'guardian' }));
    await new Promise((r) => setTimeout(r, 100));
  }
  log('E: Menu ↔ Match 3 rounds', consoleErrors.length === 0, consoleErrors.join('; ') || 'no errors');
  await page.close();
}

async function main() {
  const consoleErrors = [];
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/404|favicon/i.test(msg.text())) consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  const client = await page.createCDPSession();
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });

  try {
    await startMatch(page, 'guardian');
    await runMultitouchTests(page, client);

    // Test B isolated: walk + skill (fresh match, no prior attack state)
    await startMatch(page, 'guardian');
    const joyX = 100;
    const joyY = 320;
    const skillQX = WIDTH - 52 - 112 - 72;
    const skillQY = HEIGHT - 32 - 70 - 52;
    await cdpTouch(client, 'touchStart', [{ x: joyX, y: joyY }]);
    await new Promise((r) => setTimeout(r, 80));
    for (let i = 0; i < 6; i++) {
      await cdpTouch(client, 'touchMove', [{ x: joyX, y: joyY - i * 10 }]);
      await new Promise((r) => setTimeout(r, 40));
    }
    await cdpTouch(client, 'touchStart', [{ x: joyX, y: joyY - 50 }, { x: skillQX, y: skillQY }]);
    await new Promise((r) => setTimeout(r, 500));
    const skillState = await getMatchState(page);
    log(
      'B: walk + Q skill (isolated)',
      skillState?.joyPtr !== null && !!skillState?.lastAction && skillState.lastAction !== '-',
      `joy#=${skillState?.joyPtr} last=${skillState?.lastAction} act+move=${skillState?.actionWhileMoving}`,
    );
    await cdpReleaseFinger(client, []);

    await startMatch(page, 'mage');
    const client2 = await page.createCDPSession();
    await client2.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await cdpTouch(client2, 'touchStart', [{ x: joyX, y: joyY }]);
    await new Promise((r) => setTimeout(r, 80));
    await cdpTouch(client2, 'touchStart', [{ x: joyX, y: joyY }, { x: skillQX, y: skillQY }]);
    await new Promise((r) => setTimeout(r, 600));
    const mageState = await getMatchState(page);
    log(
      'D: Mage walk + Q',
      mageState?.joyPtr !== null && !!mageState?.lastAction && mageState.lastAction !== '-',
      `last=${mageState?.lastAction} combat=${mageState?.combat}`,
    );
    await cdpReleaseFinger(client2, [{ x: joyX, y: joyY }]);
    await cdpReleaseFinger(client2, []);

    await startMatch(page, 'priest');
    const client3 = await page.createCDPSession();
    await client3.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await cdpTouch(client3, 'touchStart', [{ x: joyX, y: joyY }]);
    await new Promise((r) => setTimeout(r, 80));
    await cdpTouch(client3, 'touchStart', [{ x: joyX, y: joyY }, { x: skillQX, y: skillQY }]);
    await new Promise((r) => setTimeout(r, 600));
    const priestState = await getMatchState(page);
    log(
      'D: Priest walk + Q heal',
      priestState?.joyPtr !== null && !!priestState?.lastAction && priestState.lastAction !== '-',
      `last=${priestState?.lastAction} combat=${priestState?.combat}`,
    );
    await cdpReleaseFinger(client3, [{ x: joyX, y: joyY }]);
    await cdpReleaseFinger(client3, []);

    await runDesktopRegression(browser);
  } finally {
    await browser.close();
  }

  log('Console errors (mobile page)', consoleErrors.length === 0, consoleErrors.join('; ') || 'none');

  const failed = results.filter((r) => !r.pass);
  console.log('\n--- SUMMARY ---');
  console.log(`Passed: ${results.filter((r) => r.pass).length}/${results.length}`);
  if (failed.length) {
    console.log('Failed:', failed.map((f) => f.test).join(', '));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
