// Local-only startup gate for the exact staged Pages artifact.
// npm-installed Playwright is resolved through NODE_PATH in the workflow.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(process.argv[2] || '');
const reportDir = path.resolve(process.argv[3] || '');
assert(process.argv[2] && process.argv[3], 'Usage: node browser-startup.cjs SITE_DIR REPORT_DIR');
fs.mkdirSync(reportDir, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.pck': 'application/octet-stream', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (error) { res.writeHead(500).end(String(error)); }
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const rootResponse = await fetch(base + '/');
  assert.equal(rootResponse.status, 200);
  assert.equal(await rootResponse.text(), fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  const options = { headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) options.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const browser = await chromium.launch(options);
  const reports = [];
  try {
    for (const [name, width, height] of [['desktop', 1280, 800], ['mobile-viewport', 390, 844]]) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      const errors = [];
      const log = [];
      page.on('console', message => {
        log.push(`${message.type()}: ${message.text()}`);
        if (message.type() === 'error' || /SCRIPT ERROR:|Parse Error:/.test(message.text())) errors.push(message.text());
      });
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {
        if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
      });
      page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
      try {
        await page.goto(base + '/godot-duel/', { waitUntil: 'load', timeout: 60_000 });
        await page.waitForFunction(() => !document.getElementById('status'), undefined, { timeout: 60_000 });
        await page.waitForFunction(() => {
          const c = document.querySelector('canvas');
          return c && c.width > 0 && c.height > 0;
        });
        await page.waitForTimeout(2000);
        const canvas = await page.locator('canvas').boundingBox();
        assert(canvas && canvas.width > 0 && canvas.height > 0, 'Game canvas did not initialize');
        assert(canvas.x >= -1 && canvas.y >= -1 && canvas.x + canvas.width <= width + 1 && canvas.y + canvas.height <= height + 1, 'Game canvas overflowed the viewport');
        assert.equal(await page.evaluate(() => window.crossOriginIsolated), false, 'Test must run without isolation headers');
        assert.deepEqual(errors, [], errors.join('\n'));
        reports.push({ name, status: 'passed', viewport: { width, height }, canvas, cross_origin_isolated: false });
      } finally {
        await page.screenshot({ path: path.join(reportDir, `ci-browser-${name}.png`) });
        fs.writeFileSync(path.join(reportDir, `ci-browser-${name}.log`), log.concat(errors).join('\n') + '\n');
        await context.close();
      }
    }
    fs.writeFileSync(path.join(reportDir, 'ci-browser-report.json'), JSON.stringify({ status: 'passed', checks: reports, scope: 'Local staged browser startup only; no external backend connection or gameplay claim' }, null, 2) + '\n');
    console.log('PASS: Godot desktop/mobile-viewport startup without COOP/COEP; legacy root served unchanged');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => server.close());
