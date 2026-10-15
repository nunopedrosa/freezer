const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
let release = 1;
const server = http.createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
  if (!['index.html','app.js','print-pdf.js','sw.js','style.css','manifest.webmanifest','icon.svg'].includes(name)) { res.writeHead(404).end(); return; }
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
    await page.locator('#makePDF').click();
    await page.locator('#savePDF').waitFor({state:'visible'});
    const generated=await page.evaluate(async()=>Array.from(new Uint8Array(await (await fetch(document.querySelector('#savePDF').href)).arrayBuffer())));
    const generatedBytes=Buffer.from(generated);
    assert.ok(generatedBytes.toString('latin1').startsWith('%PDF-1.4'));
    assert.equal((generatedBytes.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,1);
    if(process.env.PDF_QA_OUTPUT)fs.writeFileSync(process.env.PDF_QA_OUTPUT,generatedBytes);
    console.log('PASS: offline PDF export produces one A4 page');
    const longPDF=await page.evaluate(async()=>{
      const data={title:'Lista extensa',categories:[{name:'Produtos',items:Array.from({length:80},(_,i)=>({name:`Produto ${i+1}`,quantity:2.5,half:true}))}]};
      const blob=await createInventoryPDF(data);
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    });
    assert.ok((Buffer.from(longPDF).toString('latin1').match(/\/Type \/Page\b/g)||[]).length>1,'long inventory continues across pages');
    console.log('PASS: long inventory PDF paginates');
    const iosContext=await browser.newContext({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 Version/27.0 Mobile/15E148 Safari/604.1',hasTouch:true,isMobile:true,viewport:{width:393,height:852}});
    const iosPage=await iosContext.newPage();
    await iosPage.addInitScript(()=>{
      window.print=()=>{throw Error('iPhone must not use blocked window.print')};
      Object.defineProperty(navigator,'standalone',{value:true});
    });
    const iosErrors=[];iosPage.on('pageerror',e=>iosErrors.push(e.message));
    await iosPage.goto(`http://127.0.0.1:${server.address().port}`);
    await iosPage.locator('.name').first().click();await iosPage.keyboard.type('Peixe fresco');
    await iosPage.locator('#print').click();
    await iosPage.locator('#savePDF').waitFor({state:'visible'});
    assert.equal(await iosPage.evaluate(()=>JSON.parse(localStorage.getItem('congelador-v1')).categories[0].items[0].name),'Peixe fresco');
    assert.deepEqual(iosErrors,[]);
    await iosContext.close();
    console.log('PASS: iPhone standalone path offers PDF without invoking window.print and saves edits');
    const touchContext = await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
    const touchPage = await touchContext.newPage();
    await touchPage.goto(`http://127.0.0.1:${server.address().port}`);
    for (const width of [320,390,430,700]) {
      await touchPage.setViewportSize({width,height:844});
      const layout = await touchPage.evaluate(() => ({
        viewport:innerWidth,
        pageWidth:document.documentElement.scrollWidth,
        names:[...document.querySelectorAll('.name')].map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})),
        categories:[...document.querySelectorAll('.category')].slice(0,2).map(el=>({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y}))
      }));
      assert.ok(layout.names.every(name=>name.width>=250 && name.height<65), `readable product names at ${width}px: ${JSON.stringify(layout.names[0])}`);
      assert.ok(layout.pageWidth<=layout.viewport, `no horizontal overflow at ${width}px`);
      assert.equal(layout.categories[0].x,layout.categories[1].x);
      assert.ok(layout.categories[1].y>layout.categories[0].y);
    }
    await touchPage.setViewportSize({width:390,height:844});
    const touchField = touchPage.locator('.name').first();
    await touchField.tap();
    assert.equal(await touchPage.evaluate(() => getSelection().toString()), 'Espadarte posta', 'touch selects all');
    await touchPage.keyboard.type('Peixe');
    assert.equal(await touchField.textContent(), 'Peixe');
    for (const width of [390,794]) {
      await touchPage.setViewportSize({width,height:844});
      const pdf = await touchPage.pdf({preferCSSPageSize:true,scale:1});
      const pageCount = (pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length;
      assert.equal(pageCount,1, `sample prints on one A4 page at 100% from ${width}px viewport`);
    }
    console.log('PASS: A4 print at 100% from phone and desktop widths');
    await touchContext.close();
    console.log('PASS: touch selects all and replaces text');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
