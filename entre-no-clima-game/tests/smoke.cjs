// Run with Playwright available: node tests/smoke.cjs
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const base = process.env.GAME_URL || 'http://127.0.0.1:8000';
const form = 'https://docs.google.com/forms/d/e/1FAIpQLSemX0nyQykKrwrfwwai6owPVf_x1mg0HSlP7nuk1B47JxGbfg/viewform?usp=sharing&ouid=108156601853218969947';
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox']});
  try {
    for (const [name,width,height,mobile] of [['desktop',1440,900,false],['mobile',390,844,true],['small-mobile',320,568,true],['landscape',844,390,true]]) {
      const context = await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.clock.install();
      // Fixed spawn position and word, so collisions exercise real game logic reliably.
      await page.addInitScript(() => {Math.random = () => 0.5;});
      await page.goto(base);
      assert.equal(await page.locator('img').evaluateAll(images => images.every(i => i.complete && i.naturalWidth > 0)),true);
      assert.equal(await page.locator('a').evaluateAll(links => links.every(a => a.href === 'https://docs.google.com/forms/d/e/1FAIpQLSemX0nyQykKrwrfwwai6owPVf_x1mg0HSlP7nuk1B47JxGbfg/viewform?usp=sharing&ouid=108156601853218969947' && a.target === '_blank')),true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight),true,`${name}: fits viewport`);
      if(mobile) await page.locator('#startButton').tap(); else await page.locator('#startButton').click();
      assert.equal(await page.locator('#playfield').evaluate(el => el === document.activeElement),true);
      await page.clock.runFor(400);
      assert.equal(await page.locator('.piece.good').count(),1);
      const initial = await page.locator('#basket').evaluate(el=>el.offsetLeft);
      await page.keyboard.press('ArrowRight');
      assert.ok(await page.locator('#basket').evaluate(el=>el.offsetLeft) > initial);
      await page.keyboard.press('a');
      if(mobile){
        const field=await page.locator('#playfield').boundingBox();
        await page.touchscreen.tap(field.x+20,field.y+field.height/2);
        assert.ok(await page.locator('#basket').evaluate(el=>el.offsetLeft) < initial);
        await page.touchscreen.tap(field.x+field.width/2,field.y+field.height/2);
      }
      await page.clock.runFor(7000);
      assert.ok(Number(await page.locator('#score').textContent()) > 0,`${name}: positive capture`);
      // Simulate the lifecycle events emitted when restoring from the back/forward cache.
      await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
      const paused=await page.locator('#timer').textContent();
      await page.clock.runFor(1000);
      assert.equal(await page.locator('#timer').textContent(),paused);
      await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
      await page.clock.runFor(2000);
      assert.ok(Number(await page.locator('#timer').textContent()) < Number(paused),`${name}: restored game resumes`);
      await page.clock.runFor(26000);
      assert.equal(await page.locator('#timer').textContent(),'0');
      assert.equal(await page.locator('#endOverlay').isVisible(),true);
      assert.equal(await page.locator('.piece').count(),0);
      assert.equal(await page.locator('#endOverlay a').getAttribute('href'),form);
      await page.screenshot({path:`/tmp/clima-${name}-final.png`});
      assert.equal(await page.getByText('Jogar novamente',{exact:true}).count(),0);
      assert.equal(await page.locator('#endOverlay a').evaluate(el=>el===document.activeElement),true);
      await page.reload();
      await page.locator('#startButton').click();
      assert.equal(await page.locator('#score').textContent(),'0');
      assert.equal(await page.locator('#timer').textContent(),'25');
      await page.locator('#soundButton').click();
      assert.equal(await page.locator('#soundButton').getAttribute('aria-pressed'),'true');
      await page.locator('#soundButton').click();
      assert.equal(await page.locator('#soundButton').getAttribute('aria-pressed'),'false');
      // Force negative pieces; score must decrease by 5 without going below zero.
      await page.evaluate(()=>{Math.random=()=>0.9;});
      const field=await page.locator('#playfield').boundingBox();
      await page.mouse.move(field.x+field.width*0.9-30,field.y+field.height/2);
      await page.clock.runFor(16000);
      assert.equal(await page.locator('#floatingScore').textContent(),'−5',`${name}: negative capture`);
      assert.equal(await page.locator('#score').textContent(),'0',`${name}: score floor`);
      assert.ok(await page.locator('.piece.bad').count() > 0);
      await page.screenshot({path:`/tmp/clima-${name}-playing.png`});
      assert.deepEqual(errors,[]);
      console.log(`PASS ${name}: assets, links, layout, start, keyboard/touch, captures, lifecycle, finish without replay, sound`);
      await context.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
