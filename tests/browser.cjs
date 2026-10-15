const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
let release = 1;
const server = http.createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
  if (!['index.html','app.js','sw.js','style.css','manifest.webmanifest','icon.svg'].includes(name)) { res.writeHead(404).end(); return; }
  let body = fs.readFileSync(path.join(root, name), 'utf8');
  if (name === 'sw.js') body = body.replace(/congelador-pwa-v\d+/g, `congelador-pwa-test-${release}`);
  if (name === 'index.html') body = body.replace('<body>', `<body data-release="${release}">`);
  res.setHeader('Content-Type', name.endsWith('.js') ? 'application/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})});
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    if (process.argv[2] !== 'updates') {
      for (const selector of ['.name', '.catname', '#heading']) {
        const field = page.locator(selector).first();
        const original = await field.textContent();
        await field.click();
        assert.equal(await page.evaluate(() => getSelection().toString()), original, `${selector}: select all on click`);
        await page.keyboard.type('Novo nome');
        await page.keyboard.press('Tab');
        assert.equal(await field.textContent(), 'Novo nome');
      }
      await page.locator('#heading').focus();
      assert.equal(await page.evaluate(() => getSelection().toString()), 'Novo nome', 'keyboard focus selects all');
      await page.reload();
      assert.equal(await page.locator('.name').first().textContent(), 'Novo nome');
      console.log('PASS: click selects all, typing replaces text, edits persist');
    }
    assert.equal(await page.locator('#checkUpdate').count(), 1, 'manual update check exists');
    await page.locator('#checkUpdate').click();
    await page.waitForFunction(() => !document.querySelector('#checkUpdate').disabled);
    assert.equal(await page.locator('#updateApp').isVisible(), false);
    release = 2;
    await page.locator('#checkUpdate').click();
    await page.locator('#updateApp').waitFor({state:'visible'});
    assert.equal(await page.locator('body').getAttribute('data-release'), '1', 'update waits for user');
    await page.locator('.name').first().click();
    await page.keyboard.type('Guardado antes de atualizar');
    await Promise.all([page.waitForEvent('load'), page.locator('#updateApp').click()]);
    assert.equal(await page.locator('body').getAttribute('data-release'), '2');
    assert.equal(await page.locator('.name').first().textContent(), 'Guardado antes de atualizar');
    assert.equal(await page.locator('#updateApp').isVisible(), false);
    await context.setOffline(true);
    await page.reload();
    assert.equal(await page.locator('body').getAttribute('data-release'), '2');
    assert.equal(await page.locator('.name').first().textContent(), 'Guardado antes de atualizar');
    await page.locator('#checkUpdate').click();
    await page.waitForFunction(() => !document.querySelector('#checkUpdate').disabled);
    console.log('PASS: update waits for click, reloads new assets, preserves edits, works offline');
    const touchContext = await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
    const touchPage = await touchContext.newPage();
    await touchPage.goto(`http://127.0.0.1:${server.address().port}`);
    const touchField = touchPage.locator('.name').first();
    await touchField.tap();
    assert.equal(await touchPage.evaluate(() => getSelection().toString()), 'Espadarte posta', 'touch selects all');
    await touchPage.keyboard.type('Peixe');
    assert.equal(await touchField.textContent(), 'Peixe');
    await touchContext.close();
    console.log('PASS: touch selects all and replaces text');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
