const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
  try {
    for (const mobile of [false,true]) {
      const page = await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile});
      const errors=[]; page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{
        const Original = window.AudioContext;
        window.audioTest={contexts:[],sources:[],gains:[]};
        window.AudioContext=class extends Original {
          constructor(){super();window.audioTest.contexts.push(this);}
          createGain(){const n=super.createGain();window.audioTest.gains.push(n);return n;}
          createBufferSource(){const n=super.createBufferSource();const record={node:n,started:false,stopped:false};window.audioTest.sources.push(record);const start=n.start.bind(n),stop=n.stop.bind(n);n.start=(...args)=>{record.started=true;return start(...args);};n.stop=(...args)=>{record.stopped=true;return stop(...args);};return n;}
        };
      });
      await page.clock.install();
      await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8000');
      assert.equal(await page.evaluate(()=>audioTest.contexts.length),0,'no sound before gesture');
      if(mobile) await page.locator('#startButton').tap();else await page.locator('#startButton').click();
      await page.waitForFunction(()=>audioTest.sources.filter(s=>s.started).length>=2);
      assert.equal(await page.evaluate(()=>audioTest.contexts[0].state),'running');
      assert.ok(await page.evaluate(()=>audioTest.sources.some(s=>s.node.loop&&s.started&&s.node.buffer.duration>15)));
      assert.ok(await page.evaluate(()=>audioTest.sources.some(s=>!s.node.loop&&s.started&&s.node.buffer.duration>3&&s.node.buffer.duration<4)));
      await page.waitForFunction(()=>Math.abs(audioTest.gains[1].gain.value-.04)<.005);
      await page.locator('#soundButton').click();
      assert.equal(await page.evaluate(()=>audioTest.gains[0].gain.value),0);
      assert.equal(await page.evaluate(()=>audioTest.sources.filter(s=>s.started).every(s=>s.stopped)),true);
      await page.locator('#soundButton').click();
      await page.waitForFunction(()=>audioTest.sources.filter(s=>s.started&&!s.stopped).length>=2);
      // Simulate the end of the intro and confirm the music returns to exactly 15%.
      await page.evaluate(()=>audioTest.sources.filter(s=>!s.node.loop&&s.started&&!s.stopped).at(-1).node.onended());
      await page.waitForFunction(()=>Math.abs(audioTest.gains[1].gain.value-.15)<.005);
      await page.clock.runFor(27000);
      await page.waitForFunction(()=>audioTest.sources.some(s=>s.started&&!s.node.loop&&s.node.buffer.duration>5));
      assert.equal(await page.evaluate(()=>audioTest.sources.filter(s=>s.node.loop).every(s=>s.stopped)),true,'music stops at finish');
      assert.equal(await page.locator('#endOverlay').isVisible(),true);
      assert.equal(await page.getByText('Jogar novamente',{exact:true}).count(),0);
      await page.locator('#soundButton').click();
      assert.equal(await page.evaluate(()=>audioTest.gains[0].gain.value),0);
      assert.deepEqual(errors,[]);
      console.log(`PASS audio ${mobile?'mobile':'desktop'}: real MP3 decoding/playback, 15% music, ducking, mute, final narration`);
      await page.close();
    }
    const page=await browser.newPage();
    await page.route('**/assets/audio/**',route=>route.abort());
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8000');
    await page.locator('#startButton').click();await page.waitForSelector('.piece');
    assert.deepEqual(errors,[]);
    console.log('PASS audio unavailable: game remains playable');
    await page.close();
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
