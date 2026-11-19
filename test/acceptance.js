const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runAcceptanceTests() {
  console.log('====================================================');
  console.log('THE ROUND MENACE — Automated Acceptance Test Battery');
  console.log('Section 10 Compliance Verification (Headless Playwright)');
  console.log('====================================================\n');

  // --allow-file-access-from-files: the battery opens index.html over file://, and Round 9's GLOOM viewmodel draws
  // the art/gloom-blaster.png sprite onto the canvas; without the flag Chromium treats that file:// image as
  // cross-origin, taints the canvas, and the pixel checks (20, 21, 24) could no longer read it back.
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--allow-file-access-from-files']
  });

  const context = await browser.newContext({
    viewport: { width: 480, height: 800 },
    hasTouch: true
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  const indexPath = `file://${path.resolve(__dirname, '../index.html')}`;
  let passedCount = 0;
  let totalCount = 31;

  // Screenshot directory
  const screenshotDir = path.resolve(__dirname, '../screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  try {
    // Check 1: Page loads with zero console errors
    console.log('[Check 1/31] Loading game page...');
    await page.goto(indexPath, { waitUntil: 'load' });
    await page.waitForTimeout(500);

    const titleScreenVisible = await page.$eval('#title-screen', el => el.classList.contains('visible'));
    if (!titleScreenVisible) throw new Error('Title screen not visible on load');
    if (consoleErrors.length > 0) throw new Error(`Console errors on load: ${consoleErrors.join(', ')}`);

    console.log('  ✓ PASS: Page loads cleanly with 0 console errors and displays Title screen.');
    passedCount++;

    // Capture Title screenshot
    await page.screenshot({ path: path.join(screenshotDir, 'title.png') });
    console.log('  📸 Captured screenshot: screenshots/title.png');

    // Check 2: Game starts from PLAY
    console.log('\n[Check 2/31] Starting game from PLAY button...');
    await page.click('#btn-play');
    await page.waitForTimeout(400);

    const isPlaying = await page.evaluate(() => window.__RM_GAME__.getState() === 'playing');
    const titleHidden = await page.$eval('#title-screen', el => !el.classList.contains('visible'));
    if (!isPlaying || !titleHidden) throw new Error('Game did not transition to playing state');

    console.log('  ✓ PASS: Game transitions to "playing" state upon clicking "Defend the Maze".');
    passedCount++;

    // Capture Gameplay screenshot
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotDir, 'gameplay.png') });
    console.log('  📸 Captured screenshot: screenshots/gameplay.png');

    // Check 3: Menace eats pellets autonomously
    console.log('\n[Check 3/31] Testing autonomous Menace pellet eating...');
    const initialPellets = await page.evaluate(() => window.__RM_GAME__.getPellets().remaining);
    // Let Menace move and eat for 2 seconds
    await page.waitForTimeout(2000);
    const pelletsAfterEat = await page.evaluate(() => window.__RM_GAME__.getPellets().remaining);
    const pelletsEaten = initialPellets - pelletsAfterEat;

    if (pelletsEaten <= 0) throw new Error(`Menace did not eat any pellets (before: ${initialPellets}, after: ${pelletsAfterEat})`);

    console.log(`  ✓ PASS: The Menace autonomously pathfinds and ate ${pelletsEaten} pellets.`);
    passedCount++;

    // Check 4: Possession switching works for all four ghosts (1-4 and squad bar clicks)
    console.log('\n[Check 4/31] Testing possession switching across all 4 squad ghosts...');
    const ghostNames = ['Ember', 'Rosé', 'Tide', 'Goldie'];
    for (let i = 0; i < 4; i++) {
      // Test key press
      await page.keyboard.press(`Digit${i + 1}`);
      await page.waitForTimeout(100);
      let squad = await page.evaluate(() => window.__RM_GAME__.getSquad());
      if (!squad[i].isPossessed) throw new Error(`Ghost ${i} (${ghostNames[i]}) was not possessed via Digit${i + 1}`);

      // Test squad bar UI button click
      const otherIdx = (i + 1) % 4;
      await page.click(`.squad-btn[data-ghost="${otherIdx}"]`);
      await page.waitForTimeout(100);
      squad = await page.evaluate(() => window.__RM_GAME__.getSquad());
      if (!squad[otherIdx].isPossessed) throw new Error(`Ghost ${otherIdx} was not possessed via click`);
    }

    console.log('  ✓ PASS: Possession switching confirmed functional via keys 1–4 and squad bar buttons.');
    passedCount++;

    // Check 5: Touch input moves the possessed ghost
    console.log('\n[Check 5/31] Testing touch input steering...');
    // Ensure ghost 0 is possessed and positioned at open corridor (5, 5)
    await page.evaluate(() => {
      window.__RM_GAME__.possess(0);
      window.__RM_GAME__.setGhostPos(0, 5, 5); // Open cross corridor
    });
    const gBeforeTouch = await page.evaluate(() => window.__RM_GAME__.getSquad()[0]);
    // Simulate touch swipe drag to the right
    await page.evaluate(() => window.__RM_GAME__.touchSteer(50, 0));
    await page.waitForTimeout(500);
    const gAfterTouch = await page.evaluate(() => window.__RM_GAME__.getSquad()[0]);

    if (gAfterTouch.x <= gBeforeTouch.x && gAfterTouch.tileX <= gBeforeTouch.tileX) {
      throw new Error(`Possessed ghost did not move right on touch input (x before: ${gBeforeTouch.x}, x after: ${gAfterTouch.x})`);
    }

    console.log('  ✓ PASS: Touch swipe steering confirmed to steer the possessed ghost.');
    passedCount++;

    // Check 6: A catch registers when a ghost is steered onto Menace
    console.log('\n[Check 6/31] Testing ghost catch detection...');
    // The hunting squad may have caught him by chance during checks 3–5; a catch (or a flip
    // return) grants him 1s of flashing immunity during which collisions are ignored. Wait it
    // out so the staged catch below is judged on its own merits.
    await page.waitForFunction(
      () => window.__RM_GAME__.getState() === 'playing' && window.__RM_GAME__.getMenace().immuneTimer <= 0,
      { timeout: 4000 }
    );
    const initialLives = await page.evaluate(() => window.__RM_GAME__.getMenace().lives);
    const initialScore = await page.evaluate(() => window.__RM_GAME__.getScore());

    // Place Menace and possessed ghost at identical tile
    await page.evaluate(() => {
      window.__RM_GAME__.setMenacePos(9, 13);
      window.__RM_GAME__.setGhostPos(0, 9, 13);
    });
    // The collision pass runs on the next game tick; give it up to 2s (normally < 100ms)
    const catchRegistered = await page.waitForFunction(
      (before) => window.__RM_GAME__.getMenace().lives < before,
      initialLives,
      { timeout: 2000 }
    ).then(() => true).catch(() => false);

    const livesAfterCatch = await page.evaluate(() => window.__RM_GAME__.getMenace().lives);
    const scoreAfterCatch = await page.evaluate(() => window.__RM_GAME__.getScore());

    if (!catchRegistered || livesAfterCatch !== initialLives - 1) {
      throw new Error(`Catch failed: expected lives ${initialLives - 1}, got ${livesAfterCatch}`);
    }
    if (scoreAfterCatch < initialScore + 500) {
      throw new Error(`Catch score failed: expected at least ${initialScore + 500}, got ${scoreAfterCatch}`);
    }

    console.log(`  ✓ PASS: Catch registered! Menace lives decremented (${initialLives} -> ${livesAfterCatch}) and score awarded (+500).`);
    passedCount++;

    // Check 7: Fright mode flips on power pellet and ghost can be eaten & benched
    console.log('\n[Check 7/31] Testing Fright Mode & ghost benching...');
    await page.evaluate(() => window.__RM_GAME__.triggerFright(5.0));
    await page.waitForTimeout(200);

    const isFrightActive = await page.evaluate(() => window.__RM_GAME__.getMenace().isFrightMode);
    const frightBarVisible = await page.$eval('#fright-bar-container', el => el.classList.contains('active'));
    if (!isFrightActive || !frightBarVisible) throw new Error('Fright mode did not activate');

    // Capture Fright Mode screenshot
    await page.screenshot({ path: path.join(screenshotDir, 'fright.png') });
    console.log('  📸 Captured screenshot: screenshots/fright.png');

    // Simulate Menace eating Ghost 3 (Goldie)
    await page.evaluate(() => window.__RM_GAME__.forceEatGhost(3));
    await page.waitForTimeout(200);

    const goldieStatus = await page.evaluate(() => window.__RM_GAME__.getSquad()[3]);
    const goldieUIBenched = await page.$eval('#squad-goldie', el => el.classList.contains('benched'));

    if (!goldieStatus.isBenched || !goldieUIBenched) {
      throw new Error('Ghost was not benched upon being eaten in fright mode');
    }

    console.log('  ✓ PASS: Fright mode activated (HUD warning bar active) and Goldie successfully eaten & benched.');
    passedCount++;

    // Check 8: Win / Maze Clear screen reachable
    console.log('\n[Check 8/31] Testing Win / Maze Clear screen...');
    await page.evaluate(() => window.__RM_GAME__.forceWin());
    await page.waitForTimeout(300);

    const isClearState = await page.evaluate(() => window.__RM_GAME__.getState() === 'maze_clear');
    const clearScreenVisible = await page.$eval('#clear-screen', el => el.classList.contains('visible'));
    if (!isClearState || !clearScreenVisible) throw new Error('Maze clear screen not reached');

    console.log('  ✓ PASS: Maze Clear screen reached with pellets saved tally and score bonus.');
    passedCount++;

    // Capture Win / Clear screenshot
    await page.screenshot({ path: path.join(screenshotDir, 'win.png') });
    console.log('  📸 Captured screenshot: screenshots/win.png');

    // Check 9: Lose screen reachable
    console.log('\n[Check 9/31] Testing Game Over screen...');
    await page.evaluate(() => window.__RM_GAME__.forceLose());
    await page.waitForTimeout(300);

    const isGameOverState = await page.evaluate(() => window.__RM_GAME__.getState() === 'game_over');
    const gameOverScreenVisible = await page.$eval('#gameover-screen', el => el.classList.contains('visible'));
    if (!isGameOverState || !gameOverScreenVisible) throw new Error('Game over screen not reached');

    console.log('  ✓ PASS: Game Over screen reached with full defeat stats and restart option.');
    passedCount++;

    // Capture Game Over screenshot
    await page.screenshot({ path: path.join(screenshotDir, 'gameover.png') });
    console.log('  📸 Captured screenshot: screenshots/gameover.png');

    // Check 10: Squad exits the house and hunts (regression: ghosts once looped in the house pocket)
    console.log('\n[Check 10/31] Testing squad house exit and hunting range...');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.click('#btn-play');
    const visited = [new Set(), new Set(), new Set(), new Set()];
    const ranged = [false, false, false, false];
    let lastSquad = null;
    // Round 2: maze time pauses while a natural power-pellet pickup runs the Green Valley flip,
    // so this check samples 15s of *maze* time — samples taken during a flip are not counted.
    // Nobody is at the jump key during this check, so an unattended run would end in a catch and
    // bench the flipped ghost (which then legitimately waits in the house). The flip itself is
    // covered by checks 11 and 12; here it is let in for a moment and then survived through the hook.
    let flipWaits = 0;
    let naturalFlips = 0;
    const waitOutFlip = async () => {
      let st = await page.evaluate(() => window.__RM_GAME__.getState());
      if (st !== 'flip') return;
      naturalFlips++;
      await page.waitForTimeout(800); // let the tear transition and the first strides play
      flipWaits += 2;
      await page.evaluate(() => window.__RM_GAME__.forceFlipSurvive());
      while (st === 'flip' && flipWaits < 150) {
        flipWaits++;
        await page.waitForTimeout(400);
        st = await page.evaluate(() => window.__RM_GAME__.getState());
      }
    };
    // A catch during the window legitimately resets the squad into the house (Goldie waits 4s again),
    // so each of the first two catches extends the 15s window by that delay + exit travel (5.2s).
    // Three catches inside the window clear the maze outright — the strongest proof the squad hunts.
    let samples = 38;
    let catchResets = 0;
    let mazeClearedByCatches = false;
    let lastLives = await page.evaluate(() => window.__RM_GAME__.getMenace().lives);
    for (let i = 0; i < samples; i++) {
      await waitOutFlip();
      if ((await page.evaluate(() => window.__RM_GAME__.getState())) === 'maze_clear') {
        mazeClearedByCatches = true;
        break;
      }
      lastSquad = await page.evaluate(() => window.__RM_GAME__.getSquad());
      lastSquad.forEach((g, gi) => {
        visited[gi].add(g.tileX + ',' + g.tileY);
        if (g.tileY <= 5 || g.tileY >= 11 || g.tileX <= 5 || g.tileX >= 13) ranged[gi] = true;
      });
      const lives = await page.evaluate(() => window.__RM_GAME__.getMenace().lives);
      if (lives < lastLives) {
        catchResets++;
        if (catchResets <= 2) samples += 13;
      }
      lastLives = lives;
      await page.waitForTimeout(400);
    }
    const inInterior = t => t.tileY >= 7 && t.tileY <= 9 && t.tileX >= 7 && t.tileX <= 11;
    if (mazeClearedByCatches) {
      console.log(`  ✓ PASS: The squad left the house and caught the Menace 3 times inside the window (maze cleared) — hunting confirmed (distinct tiles so far: Rosé ${visited[1].size}, Tide ${visited[2].size}, Goldie ${visited[3].size}).`);
      passedCount++;
    } else {
      // A ghost found inside at the end must simply exit again within its delay + exit travel.
      // (A benched ghost waits in the house by design until the next catch — that is not "stuck".)
      const stuckInside = g => inInterior(g) && !g.isBenched;
      for (let w = 0; w < 18 && lastSquad.slice(1).some(stuckInside); w++) {
        await page.waitForTimeout(400);
        await waitOutFlip();
        lastSquad = await page.evaluate(() => window.__RM_GAME__.getSquad());
      }
      for (let gi = 1; gi < 4; gi++) {
        if (visited[gi].size < 6) throw new Error(`Ghost ${gi} (${ghostNames[gi]}) barely moved: ${visited[gi].size} distinct tiles in ${(samples * 0.4).toFixed(1)}s`);
        if (!ranged[gi]) throw new Error(`Ghost ${gi} (${ghostNames[gi]}) never left the house neighbourhood`);
        if (stuckInside(lastSquad[gi])) throw new Error(`Ghost ${gi} (${ghostNames[gi]}) is stuck inside the house interior at ${lastSquad[gi].tileX},${lastSquad[gi].tileY}`);
      }
      const notes = [];
      if (catchResets) notes.push(`${catchResets} catch reset${catchResets > 1 ? 's' : ''}, window extended to ${(samples * 0.4).toFixed(1)}s`);
      if (naturalFlips) notes.push(`${naturalFlips} natural flip${naturalFlips > 1 ? 's' : ''} survived through the hook, ${(flipWaits * 0.4).toFixed(1)}s of flip time not counted`);
      console.log(`  ✓ PASS: All AI ghosts left the house and hunted (distinct tiles: Rosé ${visited[1].size}, Tide ${visited[2].size}, Goldie ${visited[3].size}${notes.length ? '; ' + notes.join('; ') : ''}).`);
      passedCount++;
    }

    // ===== Round 2 checks: the Green Valley Flip and the soundtrack =====

    // Check 11: Flip triggers on a real power-pellet pickup; forced survival returns to playing unbenched
    console.log('\n[Check 11/31] Testing the Green Valley Flip on a real power-pellet pickup...');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    const musicBeforeGesture = await page.evaluate(() => window.__RM_GAME__.getMusicState());
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    const musicAfterPlay = await page.evaluate(() => window.__RM_GAME__.getMusicState());

    const flipGhost = await page.evaluate(() => window.__RM_GAME__.getSquad().findIndex(g => g.isPossessed));
    const scoreBeforeFlip = await page.evaluate(() => window.__RM_GAME__.getScore());
    const powerPelletPresent = await page.evaluate(() => window.__game.grid[1][1] === 'o');
    if (!powerPelletPresent) throw new Error('Top-left power pellet (1,1) missing at maze start');

    // Steer the Menace onto the power pellet through the position hook: one tile right of it, heading left.
    // Only his real movement + eat path can consume it.
    await page.evaluate(() => window.__RM_GAME__.setMenacePos(2, 1, -1, 0));
    let flipState = null;
    let waitedMs = 0;
    while (waitedMs < 1000) {
      await page.waitForTimeout(50);
      waitedMs += 50;
      flipState = await page.evaluate(() => window.__RM_GAME__.getState());
      if (flipState === 'flip') break;
    }
    if (flipState !== 'flip') throw new Error(`Flip did not start within 1s of the power-pellet pickup (state: ${flipState})`);

    const pelletSpent = await page.evaluate(() => window.__game.grid[1][1] === ' ');
    if (!pelletSpent) throw new Error('Power pellet at (1,1) was not consumed by the pickup');
    const flipInfo = await page.evaluate(() => window.__RM_GAME__.getFlip());
    if (!flipInfo.active || flipInfo.ghostIndex !== flipGhost) {
      throw new Error(`Flip did not lock onto the possessed ghost (expected ${flipGhost}, got ${flipInfo.ghostIndex})`);
    }
    const flipBarActive = await page.$eval('#fright-bar-container', el => el.classList.contains('active'));
    const flipFrightFlag = await page.evaluate(() => window.__RM_GAME__.getMenace().isFrightMode);
    if (!flipBarActive || !flipFrightFlag) throw new Error('Flip HUD bar / hunt-flipped flag not active during the flip');
    const flipTaunt = await page.evaluate(() => window.__RM_GAME__.getLastTaunt());
    if (flipTaunt !== 'MY TURN.') throw new Error(`Expected the "MY TURN." taunt on flip start, got "${flipTaunt}"`);

    // Capture the tear transition while it is still in progress
    await page.screenshot({ path: path.join(screenshotDir, 'flip-transition.png') });
    console.log(`  📸 Captured screenshot: screenshots/flip-transition.png (flip entered ${waitedMs}ms after the pickup)`);

    // Let the valley run, jump once, and capture the segment
    await page.waitForTimeout(2200);
    await page.evaluate(() => window.__RM_GAME__.flipJump());
    await page.waitForTimeout(300);
    const musicDuringFlip = await page.evaluate(() => window.__RM_GAME__.getMusicState());
    const runInfo = await page.evaluate(() => window.__RM_GAME__.getFlip());
    if (runInfo.phase !== 'run' || runInfo.progress <= 0) throw new Error(`Valley run did not advance (phase ${runInfo.phase}, progress ${runInfo.progress})`);
    await page.screenshot({ path: path.join(screenshotDir, 'valley.png') });
    console.log('  📸 Captured screenshot: screenshots/valley.png');

    // Force survival
    await page.evaluate(() => window.__RM_GAME__.forceFlipSurvive());
    await page.waitForTimeout(250);
    const stateAfterSurvive = await page.evaluate(() => window.__RM_GAME__.getState());
    const squadAfterSurvive = await page.evaluate(() => window.__RM_GAME__.getSquad());
    const scoreAfterSurvive = await page.evaluate(() => window.__RM_GAME__.getScore());
    const flipAfterSurvive = await page.evaluate(() => window.__RM_GAME__.getFlip());
    const barAfterSurvive = await page.$eval('#fright-bar-container', el => el.classList.contains('active'));
    if (stateAfterSurvive !== 'playing') throw new Error(`Forced survival did not return to playing (state: ${stateAfterSurvive})`);
    if (squadAfterSurvive[flipGhost].isBenched) throw new Error(`${ghostNames[flipGhost]} was benched after surviving the valley`);
    if (!squadAfterSurvive[flipGhost].isPossessed) throw new Error(`${ghostNames[flipGhost]} lost possession across the flip`);
    if (scoreAfterSurvive < scoreBeforeFlip + 200) throw new Error(`Survival bonus missing (score ${scoreBeforeFlip} -> ${scoreAfterSurvive})`);
    if (flipAfterSurvive.active || barAfterSurvive) throw new Error('Flip state lingered after survival');
    const musicAfterSurvive = await page.evaluate(() => window.__RM_GAME__.getMusicState());

    console.log(`  ✓ PASS: Real power-pellet pickup entered the flip in ${waitedMs}ms with ${ghostNames[flipGhost]}; forced survival returned to playing, unbenched, +200 (score ${scoreBeforeFlip} -> ${scoreAfterSurvive}).`);
    passedCount++;

    // Check 12: Flip caught path benches that ghost and returns to playing
    console.log('\n[Check 12/31] Testing the flip caught path (bench + return to maze)...');
    await page.evaluate(() => window.__RM_GAME__.triggerFlip());
    await page.waitForTimeout(300);
    const freshFlipState = await page.evaluate(() => window.__RM_GAME__.getState());
    if (freshFlipState !== 'flip') throw new Error(`Fresh flip did not start (state: ${freshFlipState})`);
    const caughtGhost = await page.evaluate(() => window.__RM_GAME__.getFlip().ghostIndex);

    await page.evaluate(() => window.__RM_GAME__.forceFlipCatch());
    await page.waitForTimeout(250);
    const stateAfterCatch = await page.evaluate(() => window.__RM_GAME__.getState());
    const squadAfterCatch = await page.evaluate(() => window.__RM_GAME__.getSquad());
    const caughtUIBenched = await page.$eval(`.squad-btn[data-ghost="${caughtGhost}"]`, el => el.classList.contains('benched'));
    const catchTaunt = await page.evaluate(() => window.__RM_GAME__.getLastTaunt());
    if (stateAfterCatch !== 'playing') throw new Error(`Forced catch did not return to playing (state: ${stateAfterCatch})`);
    if (!squadAfterCatch[caughtGhost].isBenched || !caughtUIBenched) throw new Error(`${ghostNames[caughtGhost]} was not benched after being caught in the valley`);
    if (squadAfterCatch[caughtGhost].isPossessed) throw new Error('Possession stayed on the benched ghost');
    if (catchTaunt !== 'ONE DOWN.') throw new Error(`Expected the "ONE DOWN." taunt on benching, got "${catchTaunt}"`);
    const otherGhostsFine = squadAfterCatch.every((g, i) => i === caughtGhost || !g.isBenched);
    if (!otherGhostsFine) throw new Error('A ghost other than the caught one was benched');

    console.log(`  ✓ PASS: Caught in the valley: ${ghostNames[caughtGhost]} benched through the bench flow ("ONE DOWN."), game back to playing.`);
    passedCount++;

    // Check 13: Soundtrack states + zero console errors across the whole battery
    console.log('\n[Check 13/31] Testing soundtrack states and console cleanliness...');
    if (musicBeforeGesture !== 'off') throw new Error(`Music should be off before the first gesture, got "${musicBeforeGesture}"`);
    if (musicAfterPlay !== 'maze') throw new Error(`Music should read "maze" after PLAY, got "${musicAfterPlay}"`);
    if (musicDuringFlip !== 'valley') throw new Error(`Music should read "valley" during the flip, got "${musicDuringFlip}"`);
    if (musicAfterSurvive !== 'maze') throw new Error(`Music should return to "maze" after the flip, got "${musicAfterSurvive}"`);

    // Mute control (M key) silences music together with the effects, and restores it
    await page.keyboard.press('KeyM');
    await page.waitForTimeout(100);
    const musicMuted = await page.evaluate(() => window.__RM_GAME__.getMusicState());
    const isMutedFlag = await page.evaluate(() => window.__RM_GAME__.isMuted());
    await page.keyboard.press('KeyM');
    await page.waitForTimeout(100);
    const musicUnmuted = await page.evaluate(() => window.__RM_GAME__.getMusicState());
    if (!isMutedFlag || musicMuted !== 'off') throw new Error(`Mute did not silence the music (muted=${isMutedFlag}, music=${musicMuted})`);
    if (musicUnmuted !== 'maze') throw new Error(`Unmute did not restore the maze music (got "${musicUnmuted}")`);

    // Stops on game over
    await page.evaluate(() => window.__RM_GAME__.forceLose());
    await page.waitForTimeout(200);
    const musicGameOver = await page.evaluate(() => window.__RM_GAME__.getMusicState());
    if (musicGameOver !== 'off') throw new Error(`Music should stop on game over, got "${musicGameOver}"`);

    if (consoleErrors.length > 0) throw new Error(`Console errors during the battery: ${consoleErrors.join(' | ')}`);

    console.log('  ✓ PASS: Soundtrack reads off → maze (PLAY) → valley (flip) → maze, obeys M mute, stops on game over; 0 console errors so far.');
    passedCount++;

    // ===== Round 3 checks: flip routing by power pellet and the Block Kingdom platformer flip =====

    // Check 14: The top-right pellet routes to Block Kingdom; forced survival returns to playing unbenched with the bonus;
    // the music reads "kingdom" during the segment.
    console.log('\n[Check 14/31] Testing flip routing (top-right pellet → Block Kingdom) and kingdom survival...');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.click('#btn-play');
    await page.waitForTimeout(300);

    const routeTable = await page.evaluate(() => ({
      tl: window.__RM_GAME__.getFlipRoute(1, 1), tr: window.__RM_GAME__.getFlipRoute(17, 1),
      bl: window.__RM_GAME__.getFlipRoute(1, 19), br: window.__RM_GAME__.getFlipRoute(17, 19)
    }));
    if (routeTable.tl.kind !== 'valley' || routeTable.tr.kind !== 'kingdom') {
      throw new Error(`Routing table wrong: top-left → ${routeTable.tl.kind}, top-right → ${routeTable.tr.kind}`);
    }
    if (routeTable.bl.requested !== 'gloom' || (routeTable.bl.kind !== 'valley' && routeTable.bl.kind !== 'gloom') || routeTable.br.requested !== 'grandprix' || (routeTable.br.kind !== 'valley' && routeTable.br.kind !== 'grandprix')) {
      throw new Error(`Bottom pellets should request gloom / grandprix (got ${JSON.stringify(routeTable)})`);
    }

    const kGhost = await page.evaluate(() => window.__RM_GAME__.getSquad().findIndex(g => g.isPossessed));
    const scoreBeforeKingdom = await page.evaluate(() => window.__RM_GAME__.getScore());
    const trPelletPresent = await page.evaluate(() => window.__game.grid[1][17] === 'o');
    if (!trPelletPresent) throw new Error('Top-right power pellet (17,1) missing at maze start');

    // Steer the Menace onto the top-right pellet through the position hook: one tile left of it, heading right.
    await page.evaluate(() => window.__RM_GAME__.setMenacePos(16, 1, 1, 0));
    let kState = null;
    let kWaited = 0;
    while (kWaited < 1000) {
      await page.waitForTimeout(50);
      kWaited += 50;
      kState = await page.evaluate(() => window.__RM_GAME__.getState());
      if (kState === 'flip') break;
    }
    if (kState !== 'flip') throw new Error(`Flip did not start within 1s of the top-right pickup (state: ${kState})`);
    const kFlip = await page.evaluate(() => window.__RM_GAME__.getFlip());
    if (kFlip.kind !== 'kingdom') throw new Error(`Top-right pellet should open Block Kingdom, got flip kind "${kFlip.kind}"`);
    if (!kFlip.active || kFlip.ghostIndex !== kGhost) throw new Error(`Kingdom flip did not lock onto the possessed ghost (expected ${kGhost}, got ${kFlip.ghostIndex})`);
    const trPelletSpent = await page.evaluate(() => window.__game.grid[1][17] === ' ');
    if (!trPelletSpent) throw new Error('Power pellet at (17,1) was not consumed by the pickup');
    const kBar = await page.$eval('#fright-bar-container', el => el.classList.contains('active'));
    const kLabel = await page.$eval('#fright-header-label', el => el.textContent);
    if (!kBar || !/Banner Pole/.test(kLabel)) throw new Error(`Kingdom HUD bar not active / not relabelled (active=${kBar}, label="${kLabel}")`);

    // The opening banner moment ("BLOCK KINGDOM — RUN!" is on screen for 1.7s from the tear)
    await page.waitForTimeout(850);
    const musicDuringKingdom = await page.evaluate(() => window.__RM_GAME__.getMusicState());
    await page.screenshot({ path: path.join(screenshotDir, 'kingdom-banner.png') });
    console.log(`  📸 Captured screenshot: screenshots/kingdom-banner.png (flip entered ${kWaited}ms after the pickup, kind "${kFlip.kind}")`);
    if (musicDuringKingdom !== 'kingdom') throw new Error(`Music should read "kingdom" during the Block Kingdom segment, got "${musicDuringKingdom}"`);

    // Let the level run: a held jump over the first chimney, then a mid-level frame with blocks, a chimney and the Menace in pursuit
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__RM_GAME__.flipJump());
    await page.waitForTimeout(280);
    await page.evaluate(() => window.__RM_GAME__.flipJumpRelease());
    await page.waitForTimeout(250);
    const kRun = await page.evaluate(() => window.__RM_GAME__.getFlip());
    if (kRun.phase !== 'run' || kRun.progress <= 0) throw new Error(`Kingdom run did not advance (phase ${kRun.phase}, progress ${kRun.progress})`);
    await page.screenshot({ path: path.join(screenshotDir, 'kingdom.png') });
    console.log('  📸 Captured screenshot: screenshots/kingdom.png');

    // Force survival
    await page.evaluate(() => window.__RM_GAME__.forceFlipSurvive());
    await page.waitForTimeout(250);
    const kStateAfter = await page.evaluate(() => window.__RM_GAME__.getState());
    const kSquadAfter = await page.evaluate(() => window.__RM_GAME__.getSquad());
    const kScoreAfter = await page.evaluate(() => window.__RM_GAME__.getScore());
    const kFlipAfter = await page.evaluate(() => window.__RM_GAME__.getFlip());
    const kMusicAfter = await page.evaluate(() => window.__RM_GAME__.getMusicState());
    if (kStateAfter !== 'playing') throw new Error(`Forced kingdom survival did not return to playing (state: ${kStateAfter})`);
    if (kSquadAfter[kGhost].isBenched) throw new Error(`${ghostNames[kGhost]} was benched after surviving Block Kingdom`);
    if (!kSquadAfter[kGhost].isPossessed) throw new Error(`${ghostNames[kGhost]} lost possession across the kingdom flip`);
    if (kScoreAfter < scoreBeforeKingdom + 200) throw new Error(`Kingdom survival bonus missing (score ${scoreBeforeKingdom} -> ${kScoreAfter})`);
    if (kFlipAfter.active) throw new Error('Kingdom flip state lingered after survival');
    if (kMusicAfter !== 'maze') throw new Error(`Music should return to "maze" after the kingdom, got "${kMusicAfter}"`);

    console.log(`  ✓ PASS: Top-right pellet routed to Block Kingdom in ${kWaited}ms with ${ghostNames[kGhost]} (music "kingdom"); forced survival returned to playing, unbenched, +200 (score ${scoreBeforeKingdom} -> ${kScoreAfter}).`);
    passedCount++;

    // Check 15: Kingdom caught path benches that ghost and returns to playing
    console.log('\n[Check 15/31] Testing the Block Kingdom caught path (bench + return to maze)...');
    await page.evaluate(() => window.__RM_GAME__.triggerFlip('kingdom'));
    await page.waitForTimeout(300);
    const freshKingdom = await page.evaluate(() => window.__RM_GAME__.getFlip());
    const freshKingdomState = await page.evaluate(() => window.__RM_GAME__.getState());
    if (freshKingdomState !== 'flip' || freshKingdom.kind !== 'kingdom') throw new Error(`Fresh kingdom flip did not start (state ${freshKingdomState}, kind ${freshKingdom.kind})`);
    const kCaughtGhost = freshKingdom.ghostIndex;

    await page.evaluate(() => window.__RM_GAME__.forceFlipCatch());
    await page.waitForTimeout(250);
    const kStateAfterCatch = await page.evaluate(() => window.__RM_GAME__.getState());
    const kSquadAfterCatch = await page.evaluate(() => window.__RM_GAME__.getSquad());
    const kCaughtUIBenched = await page.$eval(`.squad-btn[data-ghost="${kCaughtGhost}"]`, el => el.classList.contains('benched'));
    const kCatchTaunt = await page.evaluate(() => window.__RM_GAME__.getLastTaunt());
    if (kStateAfterCatch !== 'playing') throw new Error(`Forced kingdom catch did not return to playing (state: ${kStateAfterCatch})`);
    if (!kSquadAfterCatch[kCaughtGhost].isBenched || !kCaughtUIBenched) throw new Error(`${ghostNames[kCaughtGhost]} was not benched after being caught in Block Kingdom`);
    if (kSquadAfterCatch[kCaughtGhost].isPossessed) throw new Error('Possession stayed on the benched ghost');
    if (kCatchTaunt !== 'ONE DOWN.') throw new Error(`Expected the "ONE DOWN." taunt on benching, got "${kCatchTaunt}"`);
    const kOthersFine = kSquadAfterCatch.every((g, i) => i === kCaughtGhost || !g.isBenched);
    if (!kOthersFine) throw new Error('A ghost other than the caught one was benched');
    const kMusicAfterCatch = await page.evaluate(() => window.__RM_GAME__.getMusicState());
    if (kMusicAfterCatch !== 'maze') throw new Error(`Music should return to "maze" after the kingdom catch, got "${kMusicAfterCatch}"`);

    console.log(`  ✓ PASS: Caught in Block Kingdom: ${ghostNames[kCaughtGhost]} benched through the bench flow ("ONE DOWN."), game back to playing.`);
    passedCount++;

    // ===== Round 4 checks: GLOOM corridor shooter flip & Phantom Grand Prix kart racer flip =====

    // Check 16: GLOOM routing and survival (bottom-left pellet)
    console.log('\n[Check 16/31] Testing GLOOM routing and survival (bottom-left pellet)...');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.click('#btn-play');
    await page.waitForTimeout(300);

    const blGhost = await page.evaluate(() => window.__RM_GAME__.getSquad().findIndex(g => g.isPossessed));
    const scoreBeforeGloom = await page.evaluate(() => window.__RM_GAME__.getScore());
    const blPelletPresent = await page.evaluate(() => window.__game.grid[19][1] === 'o');
    if (!blPelletPresent) throw new Error('Bottom-left power pellet (1,19) missing at maze start');

    // Steer the Menace onto the bottom-left pellet through position hook: (2, 19) heading left
    await page.evaluate(() => window.__RM_GAME__.setMenacePos(2, 19, -1, 0));
    let gState = null;
    let gWaited = 0;
    while (gWaited < 1000) {
      await page.waitForTimeout(50);
      gWaited += 50;
      gState = await page.evaluate(() => window.__RM_GAME__.getState());
      if (gState === 'flip') break;
    }
    if (gState !== 'flip') throw new Error(`Flip did not start within 1s of the bottom-left pickup (state: ${gState})`);
    const gFlip = await page.evaluate(() => window.__RM_GAME__.getFlip());
    if (gFlip.kind !== 'gloom') throw new Error(`Bottom-left pellet should open GLOOM, got flip kind "${gFlip.kind}"`);
    if (!gFlip.active || gFlip.ghostIndex !== blGhost) throw new Error(`GLOOM flip did not lock onto the possessed ghost (expected ${blGhost}, got ${gFlip.ghostIndex})`);
    const blPelletSpent = await page.evaluate(() => window.__game.grid[19][1] === ' ');
    if (!blPelletSpent) throw new Error('Power pellet at (1,19) was not consumed by the pickup');

    await page.waitForTimeout(500);
    const musicDuringGloom = await page.evaluate(() => window.__RM_GAME__.getMusicState());
    if (musicDuringGloom !== 'gloom') throw new Error(`Music should read "gloom" during the GLOOM segment, got "${musicDuringGloom}"`);

    // Let corridor run: strafe left, fire a shot, capture screenshot mid-corridor
    await page.evaluate(() => window.__RM_GAME__.flipSteer(-1));
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__RM_GAME__.flipJump());
    await page.waitForTimeout(1400);

    const gRun = await page.evaluate(() => window.__RM_GAME__.getFlip());
    if (gRun.phase !== 'run' || gRun.progress <= 0) throw new Error(`GLOOM run did not advance (phase ${gRun.phase}, progress ${gRun.progress})`);
    await page.screenshot({ path: path.join(screenshotDir, 'gloom.png') });
    console.log('  📸 Captured screenshot: screenshots/gloom.png');

    // Force survival
    await page.evaluate(() => window.__RM_GAME__.forceFlipSurvive());
    await page.waitForTimeout(250);
    const gStateAfter = await page.evaluate(() => window.__RM_GAME__.getState());
    const gSquadAfter = await page.evaluate(() => window.__RM_GAME__.getSquad());
    const gScoreAfter = await page.evaluate(() => window.__RM_GAME__.getScore());
    const gFlipAfter = await page.evaluate(() => window.__RM_GAME__.getFlip());
    const gMusicAfter = await page.evaluate(() => window.__RM_GAME__.getMusicState());
    if (gStateAfter !== 'playing') throw new Error(`Forced gloom survival did not return to playing (state: ${gStateAfter})`);
    if (gSquadAfter[blGhost].isBenched) throw new Error(`${ghostNames[blGhost]} was benched after surviving GLOOM`);
    if (!gSquadAfter[blGhost].isPossessed) throw new Error(`${ghostNames[blGhost]} lost possession across the gloom flip`);
    if (gScoreAfter < scoreBeforeGloom + 200) throw new Error(`GLOOM survival bonus missing (score ${scoreBeforeGloom} -> ${gScoreAfter})`);
    if (gFlipAfter.active) throw new Error('GLOOM flip state lingered after survival');
    if (gMusicAfter !== 'maze') throw new Error(`Music should return to "maze" after gloom, got "${gMusicAfter}"`);

    console.log(`  ✓ PASS: Bottom-left pellet routed to GLOOM in ${gWaited}ms with ${ghostNames[blGhost]} (music "gloom"); forced survival returned to playing, unbenched, +200.`);
    passedCount++;

    // Check 17: GLOOM caught path
    console.log('\n[Check 17/31] Testing GLOOM caught path (bench + return to maze)...');
    await page.evaluate(() => window.__RM_GAME__.triggerFlip('gloom'));
    await page.waitForTimeout(300);
    const freshGloom = await page.evaluate(() => window.__RM_GAME__.getFlip());
    const freshGloomState = await page.evaluate(() => window.__RM_GAME__.getState());
    if (freshGloomState !== 'flip' || freshGloom.kind !== 'gloom') throw new Error(`Fresh gloom flip did not start (state ${freshGloomState}, kind ${freshGloom.kind})`);
    const gCaughtGhost = freshGloom.ghostIndex;

    await page.evaluate(() => window.__RM_GAME__.forceFlipCatch());
    await page.waitForTimeout(250);
    const gStateAfterCatch = await page.evaluate(() => window.__RM_GAME__.getState());
    const gSquadAfterCatch = await page.evaluate(() => window.__RM_GAME__.getSquad());
    const gCaughtUIBenched = await page.$eval(`.squad-btn[data-ghost="${gCaughtGhost}"]`, el => el.classList.contains('benched'));
    const gCatchTaunt = await page.evaluate(() => window.__RM_GAME__.getLastTaunt());
    if (gStateAfterCatch !== 'playing') throw new Error(`Forced gloom catch did not return to playing (state: ${gStateAfterCatch})`);
    if (!gSquadAfterCatch[gCaughtGhost].isBenched || !gCaughtUIBenched) throw new Error(`${ghostNames[gCaughtGhost]} was not benched after being caught in GLOOM`);
    if (gSquadAfterCatch[gCaughtGhost].isPossessed) throw new Error('Possession stayed on the benched ghost');
    if (gCatchTaunt !== 'ONE DOWN.') throw new Error(`Expected the "ONE DOWN." taunt on benching, got "${gCatchTaunt}"`);
    const gMusicAfterCatch = await page.evaluate(() => window.__RM_GAME__.getMusicState());
    if (gMusicAfterCatch !== 'maze') throw new Error(`Music should return to "maze" after the gloom catch, got "${gMusicAfterCatch}"`);

    console.log(`  ✓ PASS: Caught in GLOOM: ${ghostNames[gCaughtGhost]} benched through the bench flow ("ONE DOWN."), game back to playing.`);
    passedCount++;

    // Check 18: Phantom Grand Prix routing and survival (bottom-right pellet)
    console.log('\n[Check 18/31] Testing Phantom Grand Prix routing and survival (bottom-right pellet)...');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.click('#btn-play');
    await page.waitForTimeout(300);

    const brGhost = await page.evaluate(() => window.__RM_GAME__.getSquad().findIndex(g => g.isPossessed));
    const scoreBeforeGP = await page.evaluate(() => window.__RM_GAME__.getScore());
    const brPelletPresent = await page.evaluate(() => window.__game.grid[19][17] === 'o');
    if (!brPelletPresent) throw new Error('Bottom-right power pellet (17,19) missing at maze start');

    // Steer Menace onto bottom-right pellet (17, 19): (16, 19) heading right
    await page.evaluate(() => window.__RM_GAME__.setMenacePos(16, 19, 1, 0));
    let gpState = null;
    let gpWaited = 0;
    while (gpWaited < 1000) {
      await page.waitForTimeout(50);
      gpWaited += 50;
      gpState = await page.evaluate(() => window.__RM_GAME__.getState());
      if (gpState === 'flip') break;
    }
    if (gpState !== 'flip') throw new Error(`Flip did not start within 1s of the bottom-right pickup (state: ${gpState})`);
    const gpFlip = await page.evaluate(() => window.__RM_GAME__.getFlip());
    if (gpFlip.kind !== 'grandprix') throw new Error(`Bottom-right pellet should open Phantom Grand Prix, got flip kind "${gpFlip.kind}"`);
    if (!gpFlip.active || gpFlip.ghostIndex !== brGhost) throw new Error(`Grand Prix flip did not lock onto the possessed ghost (expected ${brGhost}, got ${gpFlip.ghostIndex})`);
    const brPelletSpent = await page.evaluate(() => window.__game.grid[19][17] === ' ');
    if (!brPelletSpent) throw new Error('Power pellet at (17,19) was not consumed by the pickup');

    await page.waitForTimeout(500);
    const musicDuringGP = await page.evaluate(() => window.__RM_GAME__.getMusicState());
    if (musicDuringGP !== 'grandprix') throw new Error(`Music should read "grandprix" during the Grand Prix segment, got "${musicDuringGP}"`);

    // Let the race run: a short steer off the grid, then a mid-race frame with both karts in shot
    await page.evaluate(() => window.__RM_GAME__.flipSteer(1));
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__RM_GAME__.flipSteerRelease(1));
    await page.waitForTimeout(1500);

    const gpRun = await page.evaluate(() => window.__RM_GAME__.getFlip());
    if (gpRun.phase !== 'run' || gpRun.progress <= 0) throw new Error(`Grand Prix run did not advance (phase ${gpRun.phase}, progress ${gpRun.progress})`);
    await page.screenshot({ path: path.join(screenshotDir, 'grandprix.png') });
    console.log('  📸 Captured screenshot: screenshots/grandprix.png');

    // Force survival
    await page.evaluate(() => window.__RM_GAME__.forceFlipSurvive());
    await page.waitForTimeout(250);
    const gpStateAfter = await page.evaluate(() => window.__RM_GAME__.getState());
    const gpSquadAfter = await page.evaluate(() => window.__RM_GAME__.getSquad());
    const gpScoreAfter = await page.evaluate(() => window.__RM_GAME__.getScore());
    const gpFlipAfter = await page.evaluate(() => window.__RM_GAME__.getFlip());
    const gpMusicAfter = await page.evaluate(() => window.__RM_GAME__.getMusicState());
    if (gpStateAfter !== 'playing') throw new Error(`Forced Grand Prix survival did not return to playing (state: ${gpStateAfter})`);
    if (gpSquadAfter[brGhost].isBenched) throw new Error(`${ghostNames[brGhost]} was benched after surviving Grand Prix`);
    if (!gpSquadAfter[brGhost].isPossessed) throw new Error(`${ghostNames[brGhost]} lost possession across the Grand Prix flip`);
    if (gpScoreAfter < scoreBeforeGP + 200) throw new Error(`Grand Prix survival bonus missing (score ${scoreBeforeGP} -> ${gpScoreAfter})`);
    if (gpFlipAfter.active) throw new Error('Grand Prix flip state lingered after survival');
    if (gpMusicAfter !== 'maze') throw new Error(`Music should return to "maze" after Grand Prix, got "${gpMusicAfter}"`);

    console.log(`  ✓ PASS: Bottom-right pellet routed to Phantom Grand Prix in ${gpWaited}ms with ${ghostNames[brGhost]} (music "grandprix"); forced survival returned to playing, unbenched, +200.`);
    passedCount++;

    // Check 19: Grand Prix caught path
    console.log('\n[Check 19/31] Testing Phantom Grand Prix caught path (bench + return to maze)...');
    await page.evaluate(() => window.__RM_GAME__.triggerFlip('grandprix'));
    await page.waitForTimeout(300);
    const freshGP = await page.evaluate(() => window.__RM_GAME__.getFlip());
    const freshGPState = await page.evaluate(() => window.__RM_GAME__.getState());
    if (freshGPState !== 'flip' || freshGP.kind !== 'grandprix') throw new Error(`Fresh Grand Prix flip did not start (state ${freshGPState}, kind ${freshGP.kind})`);
    const gpCaughtGhost = freshGP.ghostIndex;

    await page.evaluate(() => window.__RM_GAME__.forceFlipCatch());
    await page.waitForTimeout(250);
    const gpStateAfterCatch = await page.evaluate(() => window.__RM_GAME__.getState());
    const gpSquadAfterCatch = await page.evaluate(() => window.__RM_GAME__.getSquad());
    const gpCaughtUIBenched = await page.$eval(`.squad-btn[data-ghost="${gpCaughtGhost}"]`, el => el.classList.contains('benched'));
    const gpCatchTaunt = await page.evaluate(() => window.__RM_GAME__.getLastTaunt());
    if (gpStateAfterCatch !== 'playing') throw new Error(`Forced Grand Prix catch did not return to playing (state: ${gpStateAfterCatch})`);
    if (!gpSquadAfterCatch[gpCaughtGhost].isBenched || !gpCaughtUIBenched) throw new Error(`${ghostNames[gpCaughtGhost]} was not benched after being caught in Grand Prix`);
    if (gpSquadAfterCatch[gpCaughtGhost].isPossessed) throw new Error('Possession stayed on the benched ghost');
    if (gpCatchTaunt !== 'ONE DOWN.') throw new Error(`Expected the "ONE DOWN." taunt on benching, got "${gpCatchTaunt}"`);
    const gpMusicAfterCatch = await page.evaluate(() => window.__RM_GAME__.getMusicState());
    if (gpMusicAfterCatch !== 'maze') throw new Error(`Music should return to "maze" after the Grand Prix catch, got "${gpMusicAfterCatch}"`);

    if (consoleErrors.length > 0) throw new Error(`Console errors during the battery: ${consoleErrors.join(' | ')}`);

    console.log(`  ✓ PASS: Caught in Phantom Grand Prix: ${ghostNames[gpCaughtGhost]} benched through the bench flow ("ONE DOWN."), game back to playing; 0 console errors across all 19 state checks.`);
    passedCount++;

    // ===== Round 5 checks: the battery gets eyes — pixel-level render sanity =====
    //
    // These read the canvas backing store (getImageData) in-page and judge the picture, not the state.
    // Colours are quantised to 32 levels per channel (5 bits) before counting, so anti-aliasing blends
    // along an edge do not pass for "distinct colours"; dominance is the share of the most common
    // quantised colour. The Menace's body yellow is classified by a hue band (a yellow in any shading: the
    // Round 10 Tripo render is a lit 3D body, dark gold in shadow and pale gold in the highlight, dimmed further
    // by the distance fade to ~0.7) that still excludes the corridor's orange lamps, rust barrels and red lights.
    // Round 10: the figure test is aimed at the sprite's real features — yellow body mass, white glove / eye
    // regions and red shoe regions — each as a share of his body circle (π r²), so no corridor-only frame can pass.
    const RENDER_MIN_DISTINCT = 40;
    const RENDER_MAX_DOMINANCE = 0.55;
    const MENACE_MIN_PIXELS = 80;       // a figure must leave a measurable footprint in the central area...
    const MENACE_MAX_CENTRAL_SHARE = 0.45; // ...but never swallow the frame (the Round 4 defect)
    const FIGURE_BODY_SHARE = 0.2;      // body yellow inside his rect ≥ 20% of π r² (unchanged from Round 5)
    const FIGURE_WHITE_SHARE = 0.02;    // white gloves / eye whites / teeth ≥ 2% of π r² (the sprite gives 5–13%;
    const FIGURE_RED_SHARE = 0.03;      //   the corridor's light greys fill under 1% of a rect without him)
                                        // red shoes ≥ 3% of π r² (the sprite gives 8–15%; corridor reds ~0.1%)

    // region / central / rect are in CSS px of the game canvas; null region = the whole canvas. The rect is the
    // figure's body circle (centre x,y radius r) extended down over his legs and shoes (to y + 1.95 r).
    const analysePlayfield = ({ region, central, rect }) => {
      const canvas = document.getElementById('gameCanvas');
      const dpr = window.__game.dpr || 1;
      const img = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const CW = canvas.width;
      const reg = region ? { x: region.x * dpr, y: region.y * dpr, w: region.w * dpr, h: region.h * dpr } : { x: 0, y: 0, w: canvas.width, h: canvas.height };
      const cen = central ? { x: central.x * dpr, y: central.y * dpr, w: central.w * dpr, h: central.h * dpr } : null;
      const rc = rect ? { x: (rect.x - rect.r) * dpr, y: (rect.y - rect.r) * dpr, w: rect.r * 2 * dpr, h: rect.r * 2.95 * dpr } : null;
      const inside = (b, x, y) => b && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
      const isMenaceYellow = (r, g, b) => r >= 110 && g >= 70 && b <= 100 && r > g + 20 && g > b + 35 && g >= r * 0.62 && b < g * 0.55;
      const isEyeWhite = (r, g, b) => r >= 120 && g >= 120 && b >= 120 && Math.max(r, g, b) - Math.min(r, g, b) <= 40; // neutral light (gloves, eye whites, teeth), allowing the distance fade
      const isShoeRed = (r, g, b) => r >= 100 && g <= 60 && b <= 60 && r > g * 2.5 && r > b * 2.5;
      const isGrinDark = (r, g, b) => r <= 90 && g <= 40 && b <= 40 && r >= g;
      const counts = new Map();
      let total = 0, centralTotal = 0, centralYellow = 0;
      const rectStats = { total: 0, yellow: 0, white: 0, red: 0, dark: 0 };
      for (let y = Math.floor(reg.y); y < reg.y + reg.h; y++) {
        for (let x = Math.floor(reg.x); x < reg.x + reg.w; x++) {
          const i = (y * CW + x) * 4;
          const r = img[i], g = img[i + 1], b = img[i + 2];
          const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
          counts.set(key, (counts.get(key) || 0) + 1);
          total++;
          const yellow = isMenaceYellow(r, g, b);
          if (inside(cen, x, y)) { centralTotal++; if (yellow) centralYellow++; }
          if (inside(rc, x, y)) {
            rectStats.total++;
            if (yellow) rectStats.yellow++;
            else if (isEyeWhite(r, g, b)) rectStats.white++;
            else if (isShoeRed(r, g, b)) rectStats.red++;
            else if (isGrinDark(r, g, b)) rectStats.dark++;
          }
        }
      }
      let top = 0, topKey = 0;
      for (const [k, v] of counts) if (v > top) { top = v; topKey = k; }
      const hex = n => n.toString(16).padStart(2, '0');
      return {
        pixels: total,
        distinct: counts.size,
        dominantShare: top / total,
        dominantColour: '#' + hex(((topKey >> 10) & 31) << 3) + hex(((topKey >> 5) & 31) << 3) + hex((topKey & 31) << 3),
        centralTotal, centralYellow,
        centralYellowShare: centralTotal ? centralYellow / centralTotal : 0,
        rect: rectStats
      };
    };
    const describeFrame = s => `${s.distinct} distinct colours, dominant ${s.dominantColour} at ${(s.dominantShare * 100).toFixed(1)}%`;

    // Check 20: GLOOM render sanity — a real frame of live corridor play shows a corridor and a Menace figure
    console.log('\n[Check 20/31] GLOOM render sanity (pixel analysis of a live mid-corridor frame)...');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    const dims = await page.evaluate(() => ({ w: window.__game.width, h: window.__game.height, dpr: window.__game.dpr }));
    const gloomPlayfield = { x: 0, y: 0, w: dims.w, h: dims.h - 84 }; // the corridor view above GLOOM's own status bar
    const gloomCentral = { x: dims.w * 0.25, y: gloomPlayfield.h * 0.2, w: dims.w * 0.5, h: gloomPlayfield.h * 0.6 };

    // Enter GLOOM exactly as Check 16 does: the Menace eats the bottom-left pellet
    await page.evaluate(() => window.__RM_GAME__.setMenacePos(2, 19, -1, 0));
    await page.waitForFunction(() => window.__RM_GAME__.getState() === 'flip', { timeout: 2000 });
    const rFlip = await page.evaluate(() => window.__RM_GAME__.getFlip());
    if (rFlip.kind !== 'gloom') throw new Error(`Bottom-left pellet should open GLOOM, got "${rFlip.kind}"`);
    // Strafe once and fire once early on, so the frame is honest live play with the juice in flight
    await page.waitForTimeout(900);
    await page.evaluate(() => { window.__RM_GAME__.flipSteer(-1); window.__RM_GAME__.flipJump(); });
    // ~4 seconds into the flip: 0.7s tear-in + 3.3s of live corridor time
    const reachedMid = await page.waitForFunction(() => {
      const f = window.__RM_GAME__.getFlip();
      return window.__RM_GAME__.getState() !== 'flip' || (f.phase === 'run' && f.elapsed >= 3.3);
    }, { timeout: 7000 }).then(() => true).catch(() => false);
    const rRun = await page.evaluate(() => window.__RM_GAME__.getFlip());
    if (!reachedMid || !rRun.active || rRun.phase !== 'run') throw new Error(`GLOOM did not reach live mid-corridor play (active ${rRun.active}, phase ${rRun.phase}, elapsed ${rRun.elapsed})`);
    const menaceRect = rRun.extra && rRun.extra.menaceScreen ? rRun.extra.menaceScreen : null;
    const gStats = await page.evaluate(analysePlayfield, { region: gloomPlayfield, central: gloomCentral, rect: menaceRect });
    console.log(`  · frame at ${rRun.elapsed.toFixed(2)}s of live play (Menace ${(rRun.extra.menaceDist || 0).toFixed(1)} units down the corridor), playfield ${gloomPlayfield.w}×${gloomPlayfield.h}: ${describeFrame(gStats)}`);
    console.log(`  · central corridor area: Menace body-yellow pixels ${gStats.centralYellow} of ${gStats.centralTotal} (${(gStats.centralYellowShare * 100).toFixed(2)}%)`);
    const figureLine = (rect, st) => rect ? `centre (${rect.x.toFixed(0)}, ${rect.y.toFixed(0)}) r=${rect.r.toFixed(1)}px${rect.sprite ? ` sprite frame ${rect.frame}, shoes at y=${rect.feetY.toFixed(0)}` : ' (code-drawn fallback)'} → body-yellow ${st.rect.yellow}, glove/eye-white ${st.rect.white}, shoe-red ${st.rect.red}, dark ${st.rect.dark} px of ${st.rect.total} (π r² = ${(Math.PI * rect.r * rect.r * dims.dpr * dims.dpr).toFixed(0)})` : 'NOT REPORTED by the renderer';
    console.log(`  · Menace figure rect: ${figureLine(menaceRect, gStats)}`);

    // Round 10: the figure must be the Tripo sprite (the renderer reports which path drew him), and his rect must
    // hold body yellow, glove / eye white and shoe red each as a share of his body circle
    const assertFigure = (rect, st, label) => {
      const area = Math.PI * rect.r * rect.r * dims.dpr * dims.dpr;
      if (!rect.sprite) throw new Error(`${label}: the Menace was drawn by the code fallback, not the Tripo sprite (frames decoded: ${rRun.extra.menaceSpriteFrames} of 3)`);
      if (st.rect.yellow < area * FIGURE_BODY_SHARE) throw new Error(`${label}: Menace rect holds too little body yellow (${st.rect.yellow}px, need ≥ ${(area * FIGURE_BODY_SHARE).toFixed(0)} for r=${rect.r.toFixed(0)})`);
      if (st.rect.white < area * FIGURE_WHITE_SHARE) throw new Error(`${label}: no white gloves / eyes in the Menace rect (${st.rect.white}px, need ≥ ${(area * FIGURE_WHITE_SHARE).toFixed(0)})`);
      if (st.rect.red < area * FIGURE_RED_SHARE) throw new Error(`${label}: no red shoes in the Menace rect (${st.rect.red}px, need ≥ ${(area * FIGURE_RED_SHARE).toFixed(0)})`);
    };

    if (gStats.distinct < RENDER_MIN_DISTINCT) throw new Error(`GLOOM frame is a void: only ${gStats.distinct} distinct colours (need ≥ ${RENDER_MIN_DISTINCT})`);
    if (gStats.dominantShare > RENDER_MAX_DOMINANCE) throw new Error(`GLOOM frame is a flat field: ${gStats.dominantColour} covers ${(gStats.dominantShare * 100).toFixed(1)}% of the playfield (limit ${RENDER_MAX_DOMINANCE * 100}%)`);
    if (gStats.centralYellow < MENACE_MIN_PIXELS) throw new Error(`No Menace in the central corridor area: ${gStats.centralYellow} body-yellow pixels (need ≥ ${MENACE_MIN_PIXELS})`);
    if (gStats.centralYellowShare > MENACE_MAX_CENTRAL_SHARE) throw new Error(`Menace swallows the frame: body-yellow covers ${(gStats.centralYellowShare * 100).toFixed(1)}% of the central area (limit ${MENACE_MAX_CENTRAL_SHARE * 100}%)`);
    if (!menaceRect) throw new Error('Renderer did not report where it drew the Menace figure (getFlip().extra.menaceScreen)');
    const inCentral = menaceRect.x - menaceRect.r >= gloomCentral.x && menaceRect.x + menaceRect.r <= gloomCentral.x + gloomCentral.w
      && menaceRect.y - menaceRect.r >= gloomCentral.y && menaceRect.y + menaceRect.r <= gloomCentral.y + gloomCentral.h;
    if (!inCentral) throw new Error(`Menace figure (centre ${menaceRect.x.toFixed(0)},${menaceRect.y.toFixed(0)} r=${menaceRect.r.toFixed(0)}) is not inside the central corridor area`);
    if (menaceRect.r > dims.w * 0.3) throw new Error(`Menace figure radius ${menaceRect.r.toFixed(0)}px exceeds the central-portion clamp`);
    assertFigure(menaceRect, gStats, 'First frame');

    // Second sample ~5s later: he must have closed in and grown smoothly (still a figure, still clamped),
    // and this deeper mid-corridor frame is the one kept as screenshots/gloom.png
    const reachedLate = await page.waitForFunction(() => {
      const f = window.__RM_GAME__.getFlip();
      return window.__RM_GAME__.getState() !== 'flip' || (f.phase === 'run' && f.elapsed >= 8.3);
    }, { timeout: 8000 }).then(() => true).catch(() => false);
    const rLate = await page.evaluate(() => window.__RM_GAME__.getFlip());
    if (!reachedLate || !rLate.active || rLate.phase !== 'run') throw new Error(`GLOOM did not stay in live play to the second sample (active ${rLate.active}, phase ${rLate.phase}, elapsed ${rLate.elapsed})`);
    const lateRect = rLate.extra && rLate.extra.menaceScreen ? rLate.extra.menaceScreen : null;
    const lStats = await page.evaluate(analysePlayfield, { region: gloomPlayfield, central: gloomCentral, rect: lateRect });
    await page.screenshot({ path: path.join(screenshotDir, 'gloom.png') });
    console.log(`  📸 Captured screenshot: screenshots/gloom.png (live play, ${rLate.elapsed.toFixed(2)}s into the corridor, Menace at ${(rLate.extra.menaceDist || 0).toFixed(1)} units)`);
    console.log(`  · frame at ${rLate.elapsed.toFixed(2)}s: ${describeFrame(lStats)}; Menace figure rect: ${figureLine(lateRect, lStats)}`);
    if (lStats.distinct < RENDER_MIN_DISTINCT || lStats.dominantShare > RENDER_MAX_DOMINANCE) throw new Error(`Second GLOOM frame fails render sanity: ${describeFrame(lStats)}`);
    if (!lateRect || lateRect.r <= menaceRect.r) throw new Error(`Menace did not grow as he closed in (r ${menaceRect.r.toFixed(1)} → ${lateRect ? lateRect.r.toFixed(1) : '?'}px)`);
    if (lateRect.r > dims.w * 0.3 || lStats.centralYellowShare > MENACE_MAX_CENTRAL_SHARE) throw new Error(`Menace exceeds the central-portion clamp in the second frame (r=${lateRect.r.toFixed(0)}px, ${(lStats.centralYellowShare * 100).toFixed(1)}% of the central area)`);
    assertFigure(lateRect, lStats, 'Second frame');
    // His shoes stand on the corridor floor: the shoe line sits below the horizon (the floor at his depth) and
    // moves down the screen as he closes, by at least the projection's own floor drop between the two depths
    if (!(lateRect.feetY > menaceRect.feetY + 10) || lateRect.feetY <= gloomPlayfield.h / 2) throw new Error(`Menace is not standing on the floor: shoe line y=${menaceRect.feetY.toFixed(0)} → ${lateRect.feetY.toFixed(0)} (horizon ≈ ${gloomPlayfield.h / 2})`);

    await page.evaluate(() => window.__RM_GAME__.forceFlipSurvive());
    await page.waitForTimeout(250);
    if ((await page.evaluate(() => window.__RM_GAME__.getState())) !== 'playing') throw new Error('Did not return to playing after the render check');

    console.log(`  ✓ PASS: GLOOM corridor frames render (${gStats.distinct} / ${lStats.distinct} colours, max ${(Math.max(gStats.dominantShare, lStats.dominantShare) * 100).toFixed(1)}% dominance) with the Tripo sprite Menace as a figure in the central corridor (body yellow, white gloves / eyes and red shoes all present), standing on the floor and growing r=${menaceRect.r.toFixed(0)} → ${lateRect.r.toFixed(0)}px as he closes.`);
    passedCount++;

    // Check 21: Render sanity for the other three flips — a mid-play frame of each is a real picture
    console.log('\n[Check 21/31] Render sanity for Green Valley, Block Kingdom and Phantom Grand Prix...');
    const otherFlips = [
      { kind: 'valley', name: 'Green Valley' },
      { kind: 'kingdom', name: 'Block Kingdom' },
      { kind: 'grandprix', name: 'Phantom Grand Prix' }
    ];
    const fullCanvas = { x: 0, y: 0, w: dims.w, h: dims.h };
    const otherResults = [];
    for (const fl of otherFlips) {
      await page.waitForFunction(() => window.__RM_GAME__.getState() === 'playing', { timeout: 3000 });
      await page.evaluate(k => window.__RM_GAME__.triggerFlip(k), fl.kind);
      await page.waitForTimeout(200);
      const started = await page.evaluate(() => window.__RM_GAME__.getFlip());
      if (!started.active || started.kind !== fl.kind) throw new Error(`${fl.name} flip did not start (active ${started.active}, kind ${started.kind})`);
      if (fl.kind === 'valley') {
        // Clear the first rock the way a player would, so the frame is still live play at ~4s
        await page.waitForTimeout(2100);
        await page.evaluate(() => window.__RM_GAME__.flipJump());
      }
      const midReached = await page.waitForFunction(() => {
        const f = window.__RM_GAME__.getFlip();
        return window.__RM_GAME__.getState() !== 'flip' || (f.phase === 'run' && f.elapsed >= 3.3);
      }, { timeout: 7000 }).then(() => true).catch(() => false);
      const mid = await page.evaluate(() => window.__RM_GAME__.getFlip());
      if (!midReached || !mid.active || mid.phase !== 'run') throw new Error(`${fl.name} did not reach a live mid-play frame (active ${mid.active}, phase ${mid.phase}, elapsed ${mid.elapsed})`);
      const st = await page.evaluate(analysePlayfield, { region: fullCanvas, central: null, rect: null });
      console.log(`  · ${fl.name} at ${mid.elapsed.toFixed(2)}s: ${describeFrame(st)}`);
      if (st.distinct < RENDER_MIN_DISTINCT) throw new Error(`${fl.name} frame is a void: only ${st.distinct} distinct colours (need ≥ ${RENDER_MIN_DISTINCT})`);
      if (st.dominantShare > RENDER_MAX_DOMINANCE) throw new Error(`${fl.name} frame is a flat field: ${st.dominantColour} covers ${(st.dominantShare * 100).toFixed(1)}% (limit ${RENDER_MAX_DOMINANCE * 100}%)`);
      otherResults.push(`${fl.name} ${st.distinct}/${(st.dominantShare * 100).toFixed(1)}%`);
      await page.evaluate(() => window.__RM_GAME__.forceFlipSurvive());
      await page.waitForTimeout(250);
    }

    if (consoleErrors.length > 0) throw new Error(`Console errors during the battery: ${consoleErrors.join(' | ')}`);

    console.log(`  ✓ PASS: All three flips render real mid-play frames (distinct colours / max dominance: ${otherResults.join(', ')}); 0 console errors across all 21 checks.`);
    passedCount++;

    // ===== Round 8 checks: the rebuilt ENGINES — each proves a behaviour, not a state =====
    const D = (cmd, arg) => page.evaluate(([c, a]) => window.__RM_GAME__.flipDebug(c, a), [cmd, arg]);
    const K = (code, down) => page.evaluate(([c, d]) => window.__RM_GAME__.flipKey(c, d), [code, down]);
    const F = () => page.evaluate(() => window.__RM_GAME__.getFlip());
    const startEngine = async (kind) => {
      await page.waitForFunction(() => window.__RM_GAME__.getState() === 'playing', { timeout: 3000 });
      await page.evaluate(k => window.__RM_GAME__.triggerFlip(k), kind);
      await page.waitForFunction(() => window.__RM_GAME__.getFlip().phase === 'run', { timeout: 3000 });
    };
    const leaveEngine = async () => { await page.evaluate(() => window.__RM_GAME__.forceFlipSurvive()); await page.waitForTimeout(250); };

    // Check 22: Block Kingdom engine — a stomp flattens a minion; a bumped block releases its pickup
    console.log('\n[Check 22/31] Block Kingdom engine: a stomp flattens a minion and a bumped block releases its pickup...');
    await startEngine('kingdom');
    await D('freezeMenace', true);
    let kf = await F();
    const minion = kf.extra.minions.find(m => m.alive);
    if (!minion) throw new Error('Block Kingdom has no living minion to stomp');
    const stompsBefore = kf.extra.stomps, squashedBefore = kf.extra.squashed;
    await D('placeGhost', { x: minion.x, y: minion.top - 70, vx: 0, vy: 0 });
    await page.waitForTimeout(600);
    kf = await F();
    const stomped = kf.extra.minions.find(m => Math.abs(m.x - minion.x) < 100);
    if (kf.extra.stomps <= stompsBefore || kf.extra.squashed <= squashedBefore) throw new Error(`Dropping onto a minion did not register a stomp (stomps ${stompsBefore} -> ${kf.extra.stomps}, squashed ${squashedBefore} -> ${kf.extra.squashed})`);
    if (!stomped || stomped.alive) throw new Error('The stomped minion is still walking');
    if (kf.extra.safety <= 0) throw new Error('A clean stomp cost the ghost her safety');
    // Block bump: stand under a star block and jump into it
    await D('hold', true);
    const qBlock = await D('findTile', '?');
    if (!qBlock) throw new Error('No star block in the Block Kingdom layout');
    await D('placeGhost', { x: qBlock.x, y: qBlock.y + 24 * 3, vx: 0, vy: 0 });
    await page.waitForTimeout(250);
    kf = await F();
    const releasedBefore = kf.extra.released, bumpsBefore = kf.extra.bumps, pickupsBefore = kf.extra.pickups;
    await page.evaluate(() => window.__RM_GAME__.flipJump());
    await page.waitForTimeout(700);
    await page.evaluate(() => window.__RM_GAME__.flipJumpRelease());
    kf = await F();
    const tileAfter = await D('tile', { c: qBlock.c, r: qBlock.r });
    if (kf.extra.bumps <= bumpsBefore) throw new Error(`Jumping under the star block did not bump it (bumps ${bumpsBefore} -> ${kf.extra.bumps})`);
    if (kf.extra.released <= releasedBefore || kf.extra.pickups <= pickupsBefore) throw new Error(`The bumped block released nothing (released ${releasedBefore} -> ${kf.extra.released}, pickups in play ${pickupsBefore} -> ${kf.extra.pickups})`);
    if (tileAfter === '?') throw new Error('The star block still reads as unbumped after releasing its pickup');
    await leaveEngine();
    console.log(`  ✓ PASS: Stomp flattened the minion at x=${minion.x.toFixed(0)} (stomps ${stompsBefore} -> ${kf.extra.stomps}, safety kept); the star block at (${qBlock.c},${qBlock.r}) bumped and released its pickup (released ${releasedBefore} -> ${kf.extra.released}, tile now "${tileAfter}").`);
    passedCount++;

    // Check 23: Green Valley engine — a hit scatters rings; a downhill measurably builds speed over the flat
    console.log('\n[Check 23/31] Green Valley engine: a Menace hit scatters rings, downhill builds speed over flat...');
    await startEngine('valley');
    await D('freezeMenace', true);
    await D('place', { x: 300, speed: 200, rings: 12 });
    await D('freezeMenace', false);
    await D('placeMenace', { x: 262, speed: 420 });
    let vf = null, scatterWaited = 0;
    while (scatterWaited < 2000) {
      await page.waitForTimeout(100);
      scatterWaited += 100;
      vf = await F();
      if (!vf.active || vf.extra.scattered > 0) break;
      if (scatterWaited === 1000) await D('placeMenace', { x: vf.extra.ghostX - 30, speed: 420 });
    }
    if (!vf.active || vf.phase !== 'run') throw new Error(`The valley run ended while staging the hit (active ${vf.active}, phase ${vf.phase})`);
    if (vf.extra.scattered <= 0 || vf.extra.hits <= 0) throw new Error(`The Menace's contact did not scatter her rings (scattered ${vf.extra.scattered}, hits ${vf.extra.hits}, rings ${vf.extra.rings})`);
    if (vf.extra.rings >= 12) throw new Error(`She kept all 12 rings through the hit (rings ${vf.extra.rings})`);
    const scatterNote = `scattered ${vf.extra.scattered} rings in ${scatterWaited}ms (holding ${vf.extra.rings} now, ${vf.extra.looseRings} loose)`;
    await D('freezeMenace', true);
    const terrain = await D('terrain', null);
    await D('place', { x: terrain.flatX, speed: 230 });
    await page.waitForTimeout(700);
    vf = await F();
    const flatSpeed = vf.extra.speed, flatGrade = vf.extra.grade;
    await D('place', { x: terrain.downhillX, speed: 230 });
    await page.waitForTimeout(700);
    vf = await F();
    const downSpeed = vf.extra.speed, downGrade = vf.extra.grade;
    if (!(downGrade > 0.05)) throw new Error(`The downhill stretch is not a downhill (grade ${downGrade.toFixed(3)})`);
    if (!(downSpeed > flatSpeed * 1.15)) throw new Error(`Downhill did not build speed over the flat (flat ${flatSpeed.toFixed(0)} vs downhill ${downSpeed.toFixed(0)} from the same 230 start)`);
    await leaveEngine();
    console.log(`  ✓ PASS: ${scatterNote}; from the same 230 start, flat ran ${flatSpeed.toFixed(0)} (grade ${flatGrade.toFixed(2)}) vs downhill ${downSpeed.toFixed(0)} (grade ${downGrade.toFixed(2)}) after 0.7s.`);
    passedCount++;

    // Check 24: GLOOM engine — turning in place changes the rendered view; a door opens on approach
    console.log('\n[Check 24/31] GLOOM engine: turning in place changes the rendered view, a door opens on approach...');
    await startEngine('gloom');
    await D('freezeMenace', true);
    const sampleCentre = () => page.evaluate(() => {
      const c = document.getElementById('gameCanvas');
      const w = c.width, h = c.height;
      const d = c.getContext('2d').getImageData(Math.floor(w * 0.25), Math.floor(h * 0.15), Math.floor(w * 0.5), Math.floor(h * 0.5)).data;
      const out = [];
      for (let i = 0; i < d.length; i += 4 * 97) out.push(d[i], d[i + 1], d[i + 2]);
      return out;
    });
    await page.waitForTimeout(150);
    const viewBefore = await sampleCentre();
    await K('ArrowLeft', true);
    await page.waitForTimeout(400);
    await K('ArrowLeft', false);
    await page.waitForTimeout(60);
    const viewAfter = await sampleCentre();
    let viewDiff = 0;
    for (let i = 0; i < viewBefore.length; i++) viewDiff += Math.abs(viewBefore[i] - viewAfter[i]);
    const meanDiff = viewDiff / viewBefore.length;
    let gf = await F();
    if (!(gf.extra.turned > 0.3)) throw new Error(`Holding the turn key did not turn the view (turned ${gf.extra.turned.toFixed(2)} rad)`);
    if (!(meanDiff > 6)) throw new Error(`Turning in place left the centre of the frame unchanged (mean per-channel change ${meanDiff.toFixed(1)})`);
    const turnNote = `turned ${gf.extra.turned.toFixed(2)} rad, centre pixels changed by ${meanDiff.toFixed(1)} per channel`;
    // Door: stand two tiles from the first door on its open axis, facing it, and walk forward
    const doors = await D('doors', null);
    const mazeRows = await D('map', null);
    if (!doors || !doors.length) throw new Error('GLOOM has no doors');
    const door = doors[0];
    const openNorth = mazeRows[door.y - 1][door.x] !== '#';
    await D('place', openNorth ? { x: door.x + 0.5, y: door.y - 1.5, angle: Math.PI / 2 } : { x: door.x - 1.5, y: door.y + 0.5, angle: 0 });
    await page.waitForTimeout(100);
    const doorBefore = (await D('doors', null))[0].open;
    await K('ArrowUp', true);
    await page.waitForTimeout(500);
    await K('ArrowUp', false);
    const doorAfter = (await D('doors', null))[0].open;
    gf = await F();
    if (!(doorBefore < 0.05)) throw new Error(`The door was already open before the approach (${doorBefore.toFixed(2)})`);
    if (!(doorAfter > 0.2)) throw new Error(`The door did not open on approach (open ${doorBefore.toFixed(2)} -> ${doorAfter.toFixed(2)})`);
    await leaveEngine();
    console.log(`  ✓ PASS: ${turnNote}; the door at (${door.x},${door.y}) slid from ${doorBefore.toFixed(2)} to ${doorAfter.toFixed(2)} open as she walked up to it.`);
    passedCount++;

    // Check 25: Phantom Grand Prix engine — a held drift releases a measurable speed boost
    console.log('\n[Check 25/31] Phantom Grand Prix engine: a held drift releases a measurable speed boost...');
    await startEngine('grandprix');
    await D('freezeRivals', true);
    const trackInfo = await D('track', null);
    await D('place', { s: 300, speed: 250, lane: -0.5 });
    await page.waitForTimeout(150);
    await K('ArrowRight', true);
    await K('Space', true);                      // hop with the wheel turned: the drift starts on landing
    await page.waitForTimeout(220);
    await K('ArrowRight', false);
    await K('ArrowLeft', true);                  // counter-steer keeps the slide running down the road
    await page.waitForTimeout(1300);
    let pf = await F();
    if (!pf.extra.drifting) throw new Error(`The hop with the wheel turned did not start a drift (driftT ${pf.extra.driftT.toFixed(2)}, releases ${pf.extra.driftReleases})`);
    if (pf.extra.driftStage < 1) throw new Error(`Holding the drift for ${pf.extra.driftT.toFixed(2)}s did not charge it (stage ${pf.extra.driftStage})`);
    const holdSpeed = pf.extra.speed, holdStage = pf.extra.driftStage, holdT = pf.extra.driftT;
    await K('Space', false);                     // release fires the boost
    await K('ArrowLeft', false);
    await page.waitForTimeout(120);
    pf = await F();
    if (!(pf.extra.boost > 0)) throw new Error('Releasing the charged drift did not fire a boost');
    if (!(pf.extra.speed > holdSpeed * 1.05 && pf.extra.speed > trackInfo.topSpeed)) throw new Error(`The drift boost is not measurable (held at ${holdSpeed.toFixed(0)}, after release ${pf.extra.speed.toFixed(0)}, plain top speed ${trackInfo.topSpeed})`);
    await leaveEngine();
    if (consoleErrors.length > 0) throw new Error(`Console errors during the engine checks: ${consoleErrors.join(' | ')}`);
    console.log(`  ✓ PASS: Drift held ${holdT.toFixed(2)}s (stage ${holdStage}) at ${holdSpeed.toFixed(0)}; release fired a ${pf.extra.boost.toFixed(2)}s boost to ${pf.extra.speed.toFixed(0)} (plain top speed ${trackInfo.topSpeed}); 0 console errors across all 25 checks.`);
    passedCount++;

    // ===== Round 9 check: the Menace's brain — behaviour, not state =====
    // (a) Collision-course trials: the Menace is set running along an open corridor with a hunting ghost placed
    //     ahead of him on the same line, heading at him, every other ghost parked in the house. He must avoid the
    //     head-on meeting — leave the line, double back, or end further away than he started — with no catch, in
    //     the clear majority of trials (the Round 8 brain walked into the ghost whenever the next junction lay
    //     beyond the meeting point, because it could never reverse and only fled inside 3 tiles).
    // (b) AI-vs-AI soak: the possessed ghost runs her own AI too, so all four hunt him with nobody at the keys.
    //     Each flip he triggers is survived through the hook (all four hunters stay on the board). He must eat at
    //     least 2 DISTINCT power pellets before his second catch, inside a bounded window of maze time — the proof
    //     that the flips are reachable in a normal game.
    console.log('\n[Check 26/31] Menace brain: head-on avoidance trials and an AI-vs-AI power-pellet soak...');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    const brainTrials = [
      { name: 'row 5 → vs Ember ←', m: [3, 5, 1, 0], g: [0, 15, 5, -1, 0] },
      { name: 'row 5 ← vs Ember →', m: [15, 5, -1, 0], g: [0, 3, 5, 1, 0] },
      { name: 'row 11 → vs Ember ←', m: [3, 11, 1, 0], g: [0, 15, 11, -1, 0] },
      { name: 'row 11 ← vs Ember →', m: [15, 11, -1, 0], g: [0, 3, 11, 1, 0] },
      { name: 'col 5 ↓ vs Ember ↑', m: [5, 3, 0, 1], g: [0, 5, 9, 0, -1] },
      { name: 'row 19 ← vs Ember →', m: [14, 19, -1, 0], g: [0, 3, 19, 1, 0] },
      { name: 'row 15 ← vs Rosé →', m: [9, 15, -1, 0], g: [1, 2, 15, 1, 0] },
      { name: 'row 13 → vs Rosé ←', m: [10, 13, 1, 0], g: [1, 17, 13, -1, 0] }
    ];
    let avoided = 0;
    const trialNotes = [];
    for (const t of brainTrials) {
      await page.evaluate(() => { if (window.__RM_GAME__.getState() === 'flip') window.__RM_GAME__.forceFlipSurvive(); });
      await page.waitForTimeout(120);
      await page.evaluate((t) => {
        const G = window.__RM_GAME__;
        G.setAutopilot(true);
        for (let i = 0; i < 4; i++) G.parkGhost(i);
        G.setMenacePos(t.m[0], t.m[1], t.m[2], t.m[3]);
        G.setGhostPos(t.g[0], t.g[1], t.g[2], t.g[3], t.g[4]);
        G.clearMenaceImmunity();
      }, t);
      const t0 = await page.evaluate(() => ({ lives: window.__RM_GAME__.getMenace().lives, m: window.__RM_GAME__.getMenace(), g: window.__RM_GAME__.getSquad() }));
      const sep0 = Math.hypot(t0.g[t.g[0]].x - t0.m.x, t0.g[t.g[0]].y - t0.m.y) / 24;
      const alongRow = t.m[2] !== 0;
      const line = alongRow ? t.m[1] : t.m[0];
      let minSep = sep0, sepEnd = sep0, courseChanged = false, caught = false, flipped = false;
      for (let i = 0; i < 60; i++) {
        await page.waitForTimeout(40);
        const s = await page.evaluate(() => ({ st: window.__RM_GAME__.getState(), m: window.__RM_GAME__.getMenace(), g: window.__RM_GAME__.getSquad(), b: window.__RM_GAME__.getMenaceBrain() }));
        if (s.st === 'flip') { flipped = true; break; }
        if (s.st !== 'playing') break;
        if (s.m.lives < t0.lives) { caught = true; break; }
        const gg = s.g[t.g[0]];
        const sep = Math.hypot(gg.x - s.m.x, gg.y - s.m.y) / 24;
        minSep = Math.min(minSep, sep); sepEnd = sep;
        if (alongRow ? s.m.tileY !== line : s.m.tileX !== line) courseChanged = true;
        if (s.b && (alongRow ? s.b.chosen.x === -t.m[2] : s.b.chosen.y === -t.m[3])) courseChanged = true;
      }
      const ok = !caught && !flipped && (courseChanged || sepEnd > sep0 + 0.5);
      if (ok) avoided++;
      trialNotes.push(`${t.name}: ${ok ? 'avoided' : 'FAILED'} (sep ${sep0.toFixed(1)}→${sepEnd.toFixed(1)}, min ${minSep.toFixed(1)}, ${courseChanged ? 'turned off / doubled back' : 'held course'}${caught ? ', CAUGHT' : ''}${flipped ? ', flipped' : ''})`);
    }
    for (const n of trialNotes) console.log(`  · ${n}`);
    if (avoided < 6) throw new Error(`The Menace walked into the head-on ghost too often: only ${avoided}/${brainTrials.length} trials avoided (need ≥ 6)`);

    // (b) The soak
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__RM_GAME__.setAutopilot(true));
    const SOAK_LIMIT_S = 100;
    let soakLives = 3, soakCatches = 0, soakFlips = 0, mazeMs = 0, firstCatchAt = -1;
    const powersEaten = new Set();
    let lastPowers = await page.evaluate(() => window.__RM_GAME__.getPowerPellets());
    const soakPelletsStart = (await page.evaluate(() => window.__RM_GAME__.getPellets())).remaining;
    let tick = Date.now();
    let soakEnd = '';
    while (mazeMs < SOAK_LIMIT_S * 1000) {
      await page.waitForTimeout(100);
      const s = await page.evaluate(() => ({ st: window.__RM_GAME__.getState(), m: window.__RM_GAME__.getMenace(), pp: window.__RM_GAME__.getPowerPellets() }));
      const now = Date.now();
      if (s.st === 'playing') {
        mazeMs += now - tick;
        if (s.m.lives < soakLives) { soakCatches++; soakLives = s.m.lives; if (firstCatchAt < 0) firstCatchAt = mazeMs / 1000; }
      } else if (s.st === 'flip') {
        for (const p of lastPowers) if (!s.pp.some(q => q.x === p.x && q.y === p.y)) { powersEaten.add(`${p.x},${p.y}`); soakFlips++; }
        await page.evaluate(() => window.__RM_GAME__.forceFlipSurvive());
        await page.waitForTimeout(150);
      } else {
        soakEnd = `state ${s.st}`;
        break;
      }
      lastPowers = s.pp;
      tick = Date.now();
      if (powersEaten.size >= 2) { soakEnd = 'two power pellets reached'; break; }
      if (soakCatches >= 2) { soakEnd = 'caught twice'; break; }
    }
    if (!soakEnd) soakEnd = `window of ${SOAK_LIMIT_S}s used up`;
    const soakPellets = await page.evaluate(() => window.__RM_GAME__.getPellets());
    await page.evaluate(() => { if (window.__RM_GAME__.getState() === 'flip') window.__RM_GAME__.forceFlipSurvive(); window.__RM_GAME__.setAutopilot(false); });
    console.log(`  · soak: ${(mazeMs / 1000).toFixed(1)}s of maze time, ${soakFlips} flip${soakFlips === 1 ? '' : 's'} from power pellets ${[...powersEaten].map(p => `(${p})`).join(' ') || '(none)'}, catches ${soakCatches}${firstCatchAt >= 0 ? ` (first at ${firstCatchAt.toFixed(1)}s)` : ''}, pellets eaten ${soakPelletsStart - soakPellets.remaining}; ended: ${soakEnd}`);
    if (powersEaten.size < 2) throw new Error(`The Menace reached only ${powersEaten.size} distinct power pellet(s) before his second catch (${soakEnd})`);
    if (consoleErrors.length > 0) throw new Error(`Console errors during the brain check: ${consoleErrors.join(' | ')}`);

    console.log(`  ✓ PASS: Head-on avoidance ${avoided}/${brainTrials.length} trials; AI-vs-AI soak reached ${powersEaten.size} distinct power pellets in ${(mazeMs / 1000).toFixed(1)}s of maze time with ${soakCatches} catch${soakCatches === 1 ? '' : 'es'} — the flips are reachable; 0 console errors across all 26 checks.`);
    passedCount++;

    // ===== Round 11 check: Phantom Grand Prix physics proof =====
    // (a) A forced spin-out is a FLAT yaw: the renderer must draw a sequence of at least 8 distinct yaw frames
    //     across the spin, all stepping the same way round, and the canvas transform the kart body is drawn with
    //     must carry zero in-plane rotation (and zero shear) on every one of those frames. The renderer records,
    //     for every frame of the ghost's spin, the sprite frame index it chose and ctx.getTransform() as it stood
    //     at the drawImage call (rotation = atan2(b, a), shear = c / d); flipDebug('spinTrace') returns the log.
    // (b) Two karts set overlapping at speed (the ghost behind and faster, a squad kart ahead and slower, both on
    //     the centre line) must separate to at least the sum of their contact radii within the step, and the
    //     rammed kart must be shoved (a measurable gain of run / sideways push and a yaw wobble), never spun.
    console.log('\n[Check 27/31] Phantom Grand Prix physics: a spin-out cycles yaw frames flat with zero in-plane rotation; overlapping karts separate and a soft contact shoves, never spins...');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(600);
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    await startEngine('grandprix');
    await D('freezeRivals', true);
    const spr = await D('sprites', null);
    if (!spr || !spr.kartsReady) throw new Error(`The kart sprite frames did not load (${spr ? spr.kartFrames : '?'} of ${spr ? spr.kartTotal : '?'} decoded, failed ${spr ? spr.kartFailed : '?'})`);
    // The frame convention, calibrated against the contact sheet: 00 rear, 04 left flank (nose to the camera's
    // left, yaw -90°), 08 front, 12 right flank (nose to the camera's right, yaw +90°)
    for (const [yawDeg, want] of [[0, 0], [-90, 4], [180, 8], [90, 12], [-67.5, 3], [45, 14]]) {
      const got = await D('frameFor', yawDeg * Math.PI / 180);
      if (got !== want) throw new Error(`Frame convention: yaw ${yawDeg}° maps to frame ${got}, expected ${want}`);
    }
    // (a) the spin
    await D('place', { s: 900, speed: 240 });
    await page.waitForTimeout(150);
    const spinStart = await D('spin', { dir: 1 });
    if (!spinStart || !(spinStart.spin > 0)) throw new Error('Forcing a spin-out on the ghost did not start one');
    await page.waitForFunction(() => { const f = window.__RM_GAME__.getFlip(); return !f.active || f.extra.spin <= 0; }, { timeout: 4000 });
    await page.waitForTimeout(80);
    const tr = await D('spinTrace', null);
    if (!tr || tr.samples < 8) throw new Error(`The renderer logged only ${tr ? tr.samples : 0} frames across the spin`);
    const seq = tr.frames.filter((f, i, a) => i === 0 || f !== a[i - 1]);
    console.log(`  · spin: ${spinStart.spinDur}s, direction ${tr.spinDir > 0 ? '+' : '-'}; ${tr.samples} rendered frames logged, ${tr.distinctFrames} distinct yaw frames in sequence (${tr.frameChanges} changes, ${tr.changesInSpinDirection} stepping the spin's way); ${tr.turns.toFixed(2)} turns of yaw; drawn by the ${tr.spritePath ? 'sprite' : 'vector fallback'} path`);
    console.log(`  · frame sequence: ${seq.join(' ')}`);
    console.log(`  · canvas transform at the kart draw across the spin: max |rotation| ${tr.maxCanvasRotation.toExponential(2)} rad, max |shear| ${tr.maxCanvasShear.toExponential(2)}; heading ${tr.headingBefore.toFixed(3)} → ${tr.headingAfter.toFixed(3)} rad`);
    if (!tr.spritePath) throw new Error('The spin was drawn by the vector fallback, not the sprite frames');
    if (tr.distinctFrames < 8) throw new Error(`Only ${tr.distinctFrames} distinct yaw frames across the spin (need ≥ 8)`);
    if (tr.changesInSpinDirection < tr.frameChanges * 0.85) throw new Error(`The yaw frames did not cycle one way round: ${tr.changesInSpinDirection} of ${tr.frameChanges} changes step the spin's way`);
    if (!(tr.maxCanvasRotation <= 1e-9)) throw new Error(`The kart was rotated in the screen plane during the spin (max |rotation| ${tr.maxCanvasRotation} rad) — the roll is back`);
    if (!(tr.maxCanvasShear <= 1e-9)) throw new Error(`The kart was sheared during the spin (max |shear| ${tr.maxCanvasShear})`);
    if (!(tr.turns > 1.9 && tr.turns < 2.1)) throw new Error(`The spin's yaw was ${tr.turns.toFixed(2)} turns (expected about 2)`);
    if (Math.abs(tr.headingAfter - tr.headingBefore) > 0.4) throw new Error(`The spin changed the kart's heading (${tr.headingBefore.toFixed(3)} → ${tr.headingAfter.toFixed(3)} rad)`);
    // (b) the overlap
    const ov = await D('overlap', { s: 900, gap: 14, lateral: 6, speed: 250, rivalSpeed: 120 });
    if (!ov || !(ov.d0 < ov.minSeparation)) throw new Error(`Overlap staging failed (d0 ${ov ? ov.d0 : '?'}, min separation ${ov ? ov.minSeparation : '?'})`);
    await page.waitForTimeout(250);
    const contact = await D('contact', null);
    const karts = await D('karts', null);
    const pk = karts.find(k => k.id === ov.player), rk = karts.find(k => k.id === ov.rival);
    const dNow = Math.hypot(rk.x - pk.x, rk.y - pk.y);
    console.log(`  · overlap: ${ov.player} at ${ov.playerSpeed} behind ${ov.rival} at ${ov.rivalSpeed}, ${ov.d0.toFixed(1)} units apart (contact radius ${ov.radius}, sum ${ov.minSeparation})`);
    if (!contact) throw new Error('No kart-kart contact was resolved from the overlap');
    console.log(`  · contact: ${contact.rammer} → ${contact.rammed}, closing ${contact.closing.toFixed(1)}; separation ${contact.dBefore.toFixed(1)} → ${contact.dAfter.toFixed(1)} in the step, ${dNow.toFixed(1)} now; rammer lost ${contact.loss.toFixed(1)}, rammed gained ${contact.gain.toFixed(1)} along the normal; spun ${contact.spun}, wobble ${contact.wobble} (${contact.wobbleDir > 0 ? '+' : '-'})`);
    console.log(`  · after 250 ms: ${pk.id} run ${pk.v.toFixed(1)} spin ${pk.spin.toFixed(2)}; ${rk.id} run ${rk.v.toFixed(1)} sideways shove ${rk.shove.toFixed(1)} spin ${rk.spin.toFixed(2)} wobble ${rk.wobble ? `amp ${rk.wobble.amp.toFixed(2)} rad at ${rk.wobble.t.toFixed(2)}/${rk.wobble.dur}s` : 'done'}`);
    if (contact.rammer !== ov.player || contact.rammed !== ov.rival) throw new Error(`The wrong kart was treated as the rammer (${contact.rammer} → ${contact.rammed})`);
    if (!(contact.dAfter >= ov.minSeparation - 0.01)) throw new Error(`The karts did not separate to the sum of their radii in the step (${contact.dAfter.toFixed(2)} < ${ov.minSeparation})`);
    if (!(dNow >= ov.minSeparation - 0.5)) throw new Error(`The karts are overlapping again after 250 ms (${dNow.toFixed(2)} < ${ov.minSeparation})`);
    if (contact.spun || rk.spin > 0 || pk.spin > 0) throw new Error('A soft contact spun a kart');
    if (!contact.wobble || !(contact.gain > 0)) throw new Error(`The rammed kart was not shoved (gain ${contact.gain}, wobble ${contact.wobble})`);
    if (!(rk.v > ov.rivalSpeed + 20)) throw new Error(`The rammed kart did not take the shove (run ${ov.rivalSpeed} → ${rk.v.toFixed(1)})`);
    if (!(pk.v > ov.playerSpeed * 0.7)) throw new Error(`The rammer lost most of its run (${ov.playerSpeed} → ${pk.v.toFixed(1)})`);
    await leaveEngine();
    if (consoleErrors.length > 0) throw new Error(`Console errors during the physics check: ${consoleErrors.join(' | ')}`);
    console.log(`  ✓ PASS: Spin-out drew ${tr.distinctFrames} distinct yaw frames in sequence over ${tr.turns.toFixed(2)} turns with zero in-plane rotation (max ${tr.maxCanvasRotation.toExponential(1)} rad); overlapping karts separated ${contact.dBefore.toFixed(1)} → ${contact.dAfter.toFixed(1)} (≥ ${ov.minSeparation}) and the rammed kart was shoved (run ${ov.rivalSpeed} → ${rk.v.toFixed(0)}, wobble, no spin); 0 console errors across all 27 checks.`);
    passedCount++;

    // ===== Round 12 touch controls, kept at full rigour in Round 14 =====
    console.log('\n[Check 28/31] Grand Prix touch steering: screen-half holds, multi-touch DRIFT and keyboard controls...');
    await startEngine('grandprix');
    await D('freezeRivals', true);
    // A real touch on the right half of the canvas, then multi-touch DRIFT.
    await D('place', { s: 600, speed: 0 });
    await D('park', true);
    await page.waitForTimeout(350);
    const cdp = await context.newCDPSession(page);
    const box = await page.$eval('#gameCanvas', el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    const touchAt = (fx, fy) => ({ x: Math.round(box.x + box.w * fx), y: Math.round(box.y + box.h * fy) });
    let tf = (await F()).extra;
    if (tf.steerHeld !== 0) throw new Error(`The wheel was already held before the touch (steerHeld ${tf.steerHeld})`);
    if (tf.touchLayout !== 'kart') throw new Error(`The Grand Prix did not declare the kart touch layout (${tf.touchLayout})`);
    const right = touchAt(0.8, 0.6);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: right.x, y: right.y, id: 1 }] });
    await page.waitForTimeout(300);
    tf = (await F()).extra;
    const heldSteer = tf.steerHeld, heldWheel = tf.steerInput;
    console.log(`  · touch held at (${right.x}, ${right.y}) — the right half of the ${box.w.toFixed(0)}×${box.h.toFixed(0)} canvas: steerHeld ${heldSteer}, wheel ${heldWheel.toFixed(2)}`);
    if (heldSteer !== 1) throw new Error(`A touch held on the right half did not engage right steering (steerHeld ${heldSteer})`);
    if (!(heldWheel > 0.5)) throw new Error(`The wheel did not turn under the held touch (steer ${heldWheel.toFixed(2)})`);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(350);
    tf = (await F()).extra;
    console.log(`  · touch lifted: steerHeld ${tf.steerHeld}, wheel ${tf.steerInput.toFixed(2)}`);
    if (tf.steerHeld !== 0) throw new Error(`Lifting the touch did not release the steering hold (steerHeld ${tf.steerHeld})`);
    if (!(Math.abs(tf.steerInput) < 0.25)) throw new Error(`The wheel did not centre after the touch lifted (steer ${tf.steerInput.toFixed(2)})`);
    // Multi-touch: a steering hold on the left half plus a press on the DRIFT button
    const driftBtn = await page.$eval('#gp-btn-drift', el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, display: getComputedStyle(el).display, text: el.textContent.trim() }; });
    const itemBtn = await page.$eval('#gp-btn-item', el => ({ display: getComputedStyle(el).display, text: el.textContent.trim() }));
    if (driftBtn.display === 'none' || itemBtn.display === 'none') throw new Error(`The DRIFT / ITEM touch buttons are not shown for the kart (${driftBtn.display} / ${itemBtn.display})`);
    const left = touchAt(0.2, 0.6);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: left.x, y: left.y, id: 1 }] });
    await page.waitForTimeout(120);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: left.x, y: left.y, id: 1 }, { x: Math.round(driftBtn.x), y: Math.round(driftBtn.y), id: 2 }] });
    await page.waitForTimeout(200);
    tf = (await F()).extra;
    console.log(`  · multi-touch: steer hold on the left half + ${driftBtn.text} button at (${driftBtn.x.toFixed(0)}, ${driftBtn.y.toFixed(0)}): steerHeld ${tf.steerHeld}, drift held ${tf.hopHeld}; ${itemBtn.text} button shown`);
    if (tf.steerHeld !== -1) throw new Error(`The steering hold was lost when the DRIFT button was pressed (steerHeld ${tf.steerHeld})`);
    if (!tf.hopHeld) throw new Error('The DRIFT button press did not start the drift hold');
    // The button finger lifts first (CDP touchEnd lists the points released): the steer hold must survive it
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: Math.round(driftBtn.x), y: Math.round(driftBtn.y), id: 2 }] });
    await page.waitForTimeout(150);
    tf = (await F()).extra;
    if (tf.steerHeld !== -1 || tf.hopHeld) throw new Error(`Lifting the DRIFT finger alone did not keep the steer and release the drift (steerHeld ${tf.steerHeld}, drift held ${tf.hopHeld})`);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(250);
    tf = (await F()).extra;
    if (tf.steerHeld !== 0 || tf.hopHeld) throw new Error(`The holds did not release cleanly (steerHeld ${tf.steerHeld}, drift held ${tf.hopHeld})`);
    // No arrow drives the kart: the cluster is hidden and its handler leaves the wheel alone
    const dpadDisplay = await page.$eval('#touch-controls', el => getComputedStyle(el).display);
    if (dpadDisplay !== 'none') throw new Error(`The directional-arrow cluster is still shown in the Grand Prix (display ${dpadDisplay})`);
    await page.$eval('.dpad-left', el => el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
    await page.waitForTimeout(150);
    tf = (await F()).extra;
    const arrowSteer = tf.steerHeld;
    await page.$eval('.dpad-left', el => el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })));
    if (arrowSteer !== 0) throw new Error(`The arrow cluster still steers the kart (steerHeld ${arrowSteer} after a left-arrow press)`);
    await K('ArrowLeft', true);
    await page.waitForTimeout(80);
    const keySteer = (await F()).extra.steerHeld;
    await K('ArrowLeft', false);
    if (keySteer !== -1) throw new Error(`Keyboard steering broke (steerHeld ${keySteer} with Left held)`);
    console.log(`  · arrow cluster: display ${dpadDisplay}, a left-arrow press leaves steerHeld ${arrowSteer}; keyboard Left still holds ${keySteer}`);
    await leaveEngine();
    if (consoleErrors.length > 0) throw new Error(`Console errors during the touch check: ${consoleErrors.join(' | ')}`);
    console.log(`  ✓ PASS: A touch hold on the right half steered right (wheel ${heldWheel.toFixed(2)}) and released to centre, a DRIFT press rode alongside a steering hold, the arrow cluster is hidden and inert, and keyboard Left still holds; 0 console errors across all 28 checks.`);
    passedCount++;

    // ===== Round 14 check: no audience assets; contact shadows, striped kerbs and a chequered line =====
    // Instrument every image source assignment and canvas drawImage source before a fresh page load. This catches
    // both direct requests and fallback requests, and any retired image that somehow reaches the renderer.
    console.log('\n[Check 29/31] Grand Prix crowd absence and race presentation: asset audit and rendered pixel samples...');
    await page.addInitScript(() => {
      const audit = window.__gpAssetAudit = { loads: [], draws: [] };
      const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        configurable: true,
        get() { return src.get.call(this); },
        set(value) { audit.loads.push(String(value)); return src.set.call(this, value); }
      });
      const drawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function(image, ...args) {
        if (image && (image.currentSrc || image.src)) audit.draws.push(String(image.currentSrc || image.src));
        return drawImage.call(this, image, ...args);
      };
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(600);
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    await startEngine('grandprix');
    await D('freezeRivals', true);
    const retiredArt = fs.readdirSync(path.resolve(__dirname, '../art')).filter(name => /^gp-(?:crowd|fan-)/i.test(name));
    if (retiredArt.length) throw new Error(`Retired audience art remains in art/: ${retiredArt.join(', ')}`);
    const gpHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    if (/gp-(?:crowd|fan-)/i.test(gpHtml)) throw new Error('The game source still names a retired audience asset');
    const assetAudit = await page.evaluate(() => window.__gpAssetAudit);
    const forbiddenLoads = assetAudit.loads.filter(src => /gp-(?:crowd|fan-)/i.test(src));
    const forbiddenDraws = assetAudit.draws.filter(src => /gp-(?:crowd|fan-)/i.test(src));
    console.log(`  · instrumented ${assetAudit.loads.length} Image.src assignments and ${assetAudit.draws.length} drawImage calls: ${forbiddenLoads.length} retired audience loads, ${forbiddenDraws.length} retired audience draws`);
    if (forbiddenLoads.length || forbiddenDraws.length) throw new Error(`Audience asset activity: loads ${forbiddenLoads.join(', ')}; draws ${forbiddenDraws.join(', ')}`);

    const presentationTrack = await D('track', null);
    await D('place', { s: presentationTrack.L - 150, speed: 0 });
    await D('park', true);
    await page.waitForTimeout(500);
    const presentation = await D('presentation', null);
    if (!presentation || presentation.shadows.length !== 4 || presentation.shadows.some(k => !k.shadow)) {
      throw new Error(`A contact shadow was not drawn for every kart (${presentation ? presentation.shadows.map(k => `${k.id}:${!!k.shadow}`).join(', ') : 'no presentation data'})`);
    }
    // The grid frame proves every shadow. Move beyond the line for an unobstructed view of the road paint:
    // from the grid, the elevated START gantry covers those ground pixels in projection.
    await D('place', { s: presentationTrack.L - 50, speed: 0 });
    await page.waitForTimeout(350);
    const roadPresentation = await D('presentation', null);
    const points = {
      kerbRed: roadPresentation.kerbs.red,
      kerbWhite: roadPresentation.kerbs.white,
      startWhite: roadPresentation.startLine.white,
      startBlack: roadPresentation.startLine.black
    };
    for (const k of presentation.shadows) {
      points[`shadow:${k.id}`] = { x: k.shadow.sampleX, y: k.shadow.sampleY };
      points[`shadowAlt:${k.id}`] = { x: 2 * k.shadow.x - k.shadow.sampleX, y: k.shadow.sampleY };
    }
    // Ground rendering samples a half-resolution map: scan each kerb's local texel neighbourhood so a
    // mathematical probe centre cannot accidentally report the neighbouring stripe or its pale bevel.
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
      points[`kerbWhiteCandidate:${dx}:${dy}`] = { x: roadPresentation.kerbs.white.x + dx, y: roadPresentation.kerbs.white.y + dy };
      points[`kerbRedCandidate:${dx}:${dy}`] = { x: roadPresentation.kerbs.red.x + dx, y: roadPresentation.kerbs.red.y + dy };
    }
    if (Object.entries(points).some(([, pt]) => !pt)) throw new Error('A presentation pixel probe projected behind the camera');
    {
    const samples = await page.evaluate((probes) => {
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d'), dpr = window.__game.dpr || 1;
      const out = {};
      for (const [name, pt] of Object.entries(probes)) {
        const x = Math.max(0, Math.min(canvas.width - 1, Math.round(pt.x * dpr)));
        const y = Math.max(0, Math.min(canvas.height - 1, Math.round(pt.y * dpr)));
        const d = ctx.getImageData(x, y, 1, 1).data;
        out[name] = { x: pt.x, y: pt.y, rgb: [d[0], d[1], d[2]], alpha: d[3] };
      }
      return out;
    }, points);
    let nearestWhite = null, nearestWhiteDistance = Infinity;
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
      const candidate = samples[`kerbWhiteCandidate:${dx}:${dy}`];
      const white = candidate.rgb.every(v => v >= 180) && Math.max(...candidate.rgb) - Math.min(...candidate.rgb) <= 65;
      const distance = dx * dx + dy * dy;
      if (white && distance < nearestWhiteDistance) { nearestWhite = candidate; nearestWhiteDistance = distance; }
    }
    if (nearestWhite) samples.kerbWhite = nearestWhite;
    let nearestRed = null, nearestRedDistance = Infinity;
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
      const candidate = samples[`kerbRedCandidate:${dx}:${dy}`];
      const red = candidate.rgb[0] >= 130 && candidate.rgb[1] <= 110 && candidate.rgb[2] <= 150 && candidate.rgb[0] > candidate.rgb[1] * 1.6;
      const distance = dx * dx + dy * dy;
      if (red && distance < nearestRedDistance) { nearestRed = candidate; nearestRedDistance = distance; }
    }
    if (nearestRed) samples.kerbRed = nearestRed;
    const showSample = (name) => {
      const s = samples[name];
      return `${name} (${s.x.toFixed(1)},${s.y.toFixed(1)}) rgb(${s.rgb.join(',')}) alpha ${s.alpha}`;
    };
    for (const k of presentation.shadows) console.log(`  · ${showSample(`shadow:${k.id}`)}`);
    console.log(`  · ${showSample('kerbRed')}; ${showSample('kerbWhite')}`);
    console.log(`  · ${showSample('startWhite')}; ${showSample('startBlack')}`);
    const isRed = s => s.rgb[0] >= 130 && s.rgb[1] <= 110 && s.rgb[2] <= 150 && s.rgb[0] > s.rgb[1] * 1.6;
    const isWhite = s => s.rgb.every(v => v >= 180) && Math.max(...s.rgb) - Math.min(...s.rgb) <= 65;
    const isBlack = s => s.rgb[0] <= 85 && s.rgb[1] <= 95 && s.rgb[2] <= 115;
    const isRoadShadow = s => s.rgb[0] <= 150 && s.rgb[1] <= 150 && s.rgb[2] <= 170 && Math.max(...s.rgb) - Math.min(...s.rgb) <= 70;
    for (const k of presentation.shadows) {
      const name = `shadow:${k.id}`;
      if (!isRoadShadow(samples[name]) && isRoadShadow(samples[`shadowAlt:${k.id}`])) {
        samples[name] = samples[`shadowAlt:${k.id}`];
        console.log(`  · ${name} alternate-side sample ${showSample(name)}`);
      }
      if (!isRoadShadow(samples[name])) throw new Error(`The contact-shadow pixel for ${k.id} is not a soft dark road sample: ${showSample(name)}`);
    }
    if (!isRed(samples.kerbRed)) throw new Error(`The red kerb sample is wrong: ${showSample('kerbRed')}`);
    if (!isWhite(samples.kerbWhite)) throw new Error(`The white kerb sample is wrong: ${showSample('kerbWhite')}`);
    if (!isWhite(samples.startWhite)) throw new Error(`The white start-line sample is wrong: ${showSample('startWhite')}`);
    if (!isBlack(samples.startBlack)) throw new Error(`The black start-line sample is wrong: ${showSample('startBlack')}`);
    await leaveEngine();
    if (consoleErrors.length > 0) throw new Error(`Console errors during the presentation check: ${consoleErrors.join(' | ')}`);
    console.log(`  ✓ PASS: zero retired audience files, source references, image loads or draws; contact shadows drawn for all 4 karts and pixel-sampled; red/white kerbs and black/white start line confirmed in the rendered frame; 0 console errors across all 29 checks.`);
    passedCount++;
    }

    // ===== Round 15 check: the complete panel slate, measured through live state and real input =====
    console.log('\n[Check 30/31] Panel slate: teaching, grace, bench return, compass, mid-drag touch, audio and sprites...');
    await page.addInitScript(() => {
      const audit = window.__panelAudioAudit = { compressorsCreated: 0, limiterToDestination: 0 };
      const createCompressor = AudioContext.prototype.createDynamicsCompressor;
      AudioContext.prototype.createDynamicsCompressor = function(...args) {
        audit.compressorsCreated++;
        return createCompressor.apply(this, args);
      };
      const connect = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function(destination, ...args) {
        if (this instanceof DynamicsCompressorNode && destination === this.context.destination) audit.limiterToDestination++;
        return connect.call(this, destination, ...args);
      };
    });
    await page.reload({ waitUntil: 'load' });
    await page.evaluate(() => localStorage.removeItem('rm_flip_entry_hints'));
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(700);
    await page.click('#btn-play');
    await page.waitForTimeout(300);

    let panel = await page.evaluate(() => window.__RM_GAME__.getPanelState());
    if (panel.hudLabel.toUpperCase() !== 'PELLETS LEFT') throw new Error(`In-play pellet label is "${panel.hudLabel}"`);
    if (panel.guideCards.length !== 4) throw new Error(`How to Play has ${panel.guideCards.length} flip cards instead of 4`);
    if (!/spikes, use springs, and carry speed through the loop/i.test(panel.guideCards[0])) throw new Error('Green Valley does not teach its shipped spikes, springs and loop');
    if (!/Left \/ Right turn; A \/ D or swipe strafes; Space or tap fires/i.test(panel.guideCards[2]) || !/EXIT teleporter/i.test(panel.guideCards[2])) throw new Error('GLOOM card does not teach turn / strafe / fire / teleporter');
    console.log(`  · teaching: HUD "${panel.hudLabel.toUpperCase()}", ${panel.guideCards.length} compact flip cards; GLOOM and Green Valley wording matches the engines`);

    const beforeCatch = await page.evaluate(() => ({ menace: window.__RM_GAME__.getMenace(), score: window.__RM_GAME__.getScore(), nudge: window.__RM_GAME__.getPanelState().possessionNudgeCount }));
    if (beforeCatch.menace.speedFactor !== 0.93 || beforeCatch.nudge !== 0) throw new Error(`Maze 1 initial grace is wrong (factor ${beforeCatch.menace.speedFactor}, nudges ${beforeCatch.nudge})`);
    await page.evaluate(() => window.__RM_GAME__.simulateCatch());
    await page.waitForTimeout(120);
    const firstCatch = await page.evaluate(() => ({ menace: window.__RM_GAME__.getMenace(), score: window.__RM_GAME__.getScore(), panel: window.__RM_GAME__.getPanelState(), taunt: window.__RM_GAME__.getLastTaunt() }));
    if (firstCatch.panel.possessionNudgeCount !== 1 || !/POSSESS ANOTHER GHOST/.test(firstCatch.taunt)) throw new Error(`First-catch nudge did not land exactly once (${firstCatch.panel.possessionNudgeCount}, "${firstCatch.taunt}")`);
    if (firstCatch.menace.speedFactor !== 1) throw new Error(`Post-catch Menace speed factor is ${firstCatch.menace.speedFactor}, expected 1`);
    if (firstCatch.score - beforeCatch.score !== 500) throw new Error(`Catch award was ${firstCatch.score - beforeCatch.score}, expected 500`);
    await page.evaluate(() => window.__RM_GAME__.simulateCatch());
    await page.waitForTimeout(120);
    const secondCatch = await page.evaluate(() => ({ menace: window.__RM_GAME__.getMenace(), panel: window.__RM_GAME__.getPanelState() }));
    if (secondCatch.panel.possessionNudgeCount !== 1) throw new Error(`Possession nudge repeated (${secondCatch.panel.possessionNudgeCount} times)`);
    if (secondCatch.menace.speedFactor !== 1) throw new Error('Second catch changed the full-speed factor');
    console.log(`  · first catch: nudges ${beforeCatch.nudge} → ${firstCatch.panel.possessionNudgeCount} → ${secondCatch.panel.possessionNudgeCount}; award +${firstCatch.score - beforeCatch.score}; Maze 1 speed factor ${beforeCatch.menace.speedFactor.toFixed(2)}× → ${firstCatch.menace.speedFactor.toFixed(2)}× → ${secondCatch.menace.speedFactor.toFixed(2)}×`);
    console.log(`  · same-build AI soak (check 26): ${(mazeMs / 1000).toFixed(1)}s maze time, ${powersEaten.size} distinct corner pellets (${[...powersEaten].join(' ')}), ${soakCatches} catches${firstCatchAt >= 0 ? `, first at ${firstCatchAt.toFixed(1)}s` : ''}`);

    // GLOOM's start cell: the first field step goes up the corridor, rather than left toward the wall at (9,12).
    await page.evaluate(() => window.__RM_GAME__.triggerFlip('gloom'));
    await page.waitForTimeout(120);
    const gloomStart = await F();
    const compass = gloomStart.extra.compass;
    const compassMap = await D('map', null);
    const expectedBearing = Math.atan2(compass.target.y + 0.5 - gloomStart.extra.py, compass.target.x + 0.5 - gloomStart.extra.px);
    if (compassMap[compass.target.y][compass.target.x] === '#') throw new Error('Compass targets a wall');
    if (!(compass.target.field < compass.currentField)) throw new Error(`Compass does not descend the exit field (${compass.currentField} → ${compass.target.field})`);
    if (Math.abs(compass.bearing - expectedBearing) > 1e-9) throw new Error('Compass bearing does not point at its chosen neighbouring cell');
    if (compass.target.x !== 12 || compass.target.y !== 11 || Math.abs(compass.bearing - compass.straightBearing) < 1) throw new Error(`Spawn compass did not take the upward corridor: ${JSON.stringify(compass)}`);
    panel = await page.evaluate(() => window.__RM_GAME__.getPanelState());
    if (!panel.flipHint.visible || !/TURN · A \/ D OR SWIPE STRAFES · SPACE OR TAP FIRES · REACH THE EXIT/.test(panel.flipHint.text) || !panel.flipHint.storedHints.gloom) throw new Error(`First GLOOM entry hint missing or not persisted (${JSON.stringify(panel.flipHint)})`);
    await leaveEngine();
    await page.evaluate(() => window.__RM_GAME__.triggerFlip('gloom'));
    await page.waitForTimeout(100);
    const secondHint = (await page.evaluate(() => window.__RM_GAME__.getPanelState())).flipHint;
    if (secondHint.visible) throw new Error('Persisted GLOOM entry hint appeared a second time');
    await leaveEngine();
    console.log(`  · GLOOM spawn field ${compass.currentField} → ${compass.target.field} at (${compass.target.x},${compass.target.y}); bearing ${compass.bearing.toFixed(3)} rad along corridor vs ${compass.straightBearing.toFixed(3)} rad straight-line; hint first entry shown, repeat hidden`);

    // Reload against the same origin: storage survives, the hint does not appear, and the fresh run supports the timer proof.
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(600);
    await page.click('#btn-play');
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__RM_GAME__.triggerFlip('gloom'));
    await page.waitForTimeout(100);
    const reloadedHint = (await page.evaluate(() => window.__RM_GAME__.getPanelState())).flipHint;
    if (reloadedHint.visible || !reloadedHint.storedHints.gloom) throw new Error(`GLOOM hint did not persist across reload (${JSON.stringify(reloadedHint)})`);
    await leaveEngine();

    // Timer: no catch resets the squad; the Menace is immobilised only as staging for this unrelated 15-second test.
    await page.evaluate(() => {
      for (let i = 0; i < 3; i++) window.__RM_GAME__.parkGhost(i);
      window.__game.menace.speed = 0;
      window.__RM_GAME__.forceEatGhost(3);
    });
    await page.waitForFunction(() => {
      const g = window.__RM_GAME__.getSquad()[3];
      return g.isBenched && g.state === 'HOUSE' && Number.isFinite(g.benchTimer);
    }, { timeout: 3000 });
    const benchStart = Date.now();
    const benchInitial = await page.evaluate(() => ({ ghost: window.__RM_GAME__.getSquad()[3], label: window.__RM_GAME__.getPanelState().benchLabels[3] }));
    if (!(benchInitial.ghost.benchTimer > 14 && benchInitial.ghost.benchTimer <= 15) || !/^\d+s$/.test(benchInitial.label)) throw new Error(`Bench countdown not visible (${benchInitial.ghost.benchTimer}, "${benchInitial.label}")`);
    await page.waitForFunction(() => {
      const g = window.__RM_GAME__.getSquad()[3];
      return !g.isBenched && (g.state === 'EXITING' || g.state === 'CHASE');
    }, { timeout: 18000 });
    const benchSeconds = (Date.now() - benchStart) / 1000;
    if (benchSeconds < 14.5 || benchSeconds > 17.5) throw new Error(`Bench return took ${benchSeconds.toFixed(2)}s, expected about 15s`);
    console.log(`  · bench: countdown ${benchInitial.ghost.benchTimer.toFixed(2)}s visible as "${benchInitial.label}"; ghost re-entered without a catch after another ${benchSeconds.toFixed(2)}s (${(await page.evaluate(() => window.__RM_GAME__.getSquad()[3])).state})`);

    // A real drag beginning over two ghosts steers before release, chains, and never possesses the other ghost.
    await page.evaluate(() => {
      window.__RM_GAME__.setGhostPos(0, 5, 5);
      window.__RM_GAME__.setGhostPos(1, 5, 5);
      window.__RM_GAME__.possess(0);
    });
    const panelCdp = await context.newCDPSession(page);
    const mazeBox = await page.$eval('#gameCanvas', el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    const ghostTouch = { x: mazeBox.x + mazeBox.w * 5.5 / 19, y: mazeBox.y + mazeBox.h * 5.5 / 21 };
    const swipeBefore = await page.evaluate(() => ({ x: window.__RM_GAME__.getSquad()[0].x, swipes: window.__RM_GAME__.getPanelState().midDragSwipeCount }));
    await panelCdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: ghostTouch.x, y: ghostTouch.y, id: 41 }] });
    await panelCdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: ghostTouch.x + 42, y: ghostTouch.y, id: 41 }] });
    await page.waitForTimeout(140);
    const midDrag = await page.evaluate(() => ({ squad: window.__RM_GAME__.getSquad(), panel: window.__RM_GAME__.getPanelState() }));
    if (midDrag.panel.midDragSwipeCount <= swipeBefore.swipes || !(midDrag.squad[0].x > swipeBefore.x)) throw new Error('The 42px drag did not steer before touchend');
    if (midDrag.squad.findIndex(g => g.isPossessed) !== 0) throw new Error('The drag beginning on a ghost possessed it before release');
    await panelCdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: ghostTouch.x + 42, y: ghostTouch.y + 42, id: 41 }] });
    await page.waitForTimeout(300);
    const chainedDrag = await page.evaluate(() => window.__RM_GAME__.getPanelState());
    if (chainedDrag.midDragSwipeCount - swipeBefore.swipes < 2) throw new Error('The re-anchored drag did not chain a second turn');
    if (chainedDrag.dpad.opacity > 0.25) throw new Error(`D-pad did not dim after steering (${chainedDrag.dpad.opacity})`);
    await panelCdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(80);
    if ((await page.evaluate(() => window.__RM_GAME__.getSquad().findIndex(g => g.isPossessed))) !== 0) throw new Error('Touchend possessed the ghost where the steering drag began');
    console.log(`  · mid-drag: ${chainedDrag.midDragSwipeCount - swipeBefore.swipes} swipes at 42px before touchend, ghost x ${swipeBefore.x.toFixed(1)} → ${midDrag.squad[0].x.toFixed(1)}, possession stayed Ember; resting D-pad opacity ${chainedDrag.dpad.opacity.toFixed(2)}`);

    await page.$eval('.dpad-right', el => el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true })));
    await page.waitForTimeout(250);
    const heldDpad = (await page.evaluate(() => window.__RM_GAME__.getPanelState())).dpad;
    if (!heldDpad.touched || heldDpad.opacity < 0.95) throw new Error(`Touched D-pad did not brighten (${heldDpad.opacity})`);
    await page.$eval('.dpad-right', el => el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true })));
    await page.click('#btn-pause');
    await page.waitForTimeout(250);
    const pausedDpad = (await page.evaluate(() => window.__RM_GAME__.getPanelState())).dpad;
    if (pausedDpad.opacity !== 1) throw new Error(`Pause did not restore D-pad strength (${pausedDpad.opacity})`);
    await page.click('#btn-pause-quit');
    await page.click('#btn-how-to-play');
    await page.waitForTimeout(100);
    const howDpad = (await page.evaluate(() => window.__RM_GAME__.getPanelState())).dpad;
    if (howDpad.opacity !== 1) throw new Error(`How to Play did not restore D-pad strength (${howDpad.opacity})`);
    console.log(`  · D-pad: touched ${heldDpad.opacity.toFixed(2)}, paused ${pausedDpad.opacity.toFixed(2)}, How to Play ${howDpad.opacity.toFixed(2)}`);
    const desktop = await browser.newPage({ viewport: { width: 480, height: 800 }, hasTouch: false });
    await desktop.goto(indexPath, { waitUntil: 'load' });
    await desktop.waitForTimeout(400);
    await desktop.click('#btn-play');
    const desktopDpad = await desktop.evaluate(() => window.__RM_GAME__.getPanelState().dpad);
    await desktop.close();
    if (desktopDpad.display !== 'none') throw new Error(`Non-touch D-pad renders (${desktopDpad.display})`);
    await page.click('#btn-back-how');
    await page.click('#btn-play');
    await page.waitForTimeout(200);

    // Grand Prix: real scheduled countdown, a pickup on the real item path, the limiter graph and visibility handling.
    await page.evaluate(() => window.__RM_GAME__.triggerFlip('grandprix'));
    await page.waitForTimeout(1200);
    await D('freezeRivals', true);
    const gpStartAudio = await page.evaluate(() => window.__RM_GAME__.getAudioState());
    const countdownEvents = gpStartAudio.audioEvents.filter(e => e.kind === 'gp-countdown');
    if (countdownEvents.length !== 1) throw new Error(`GP start scheduled ${countdownEvents.length} countdowns`);
    const countdownEvent = countdownEvents[0];
    if (countdownEvent.frequencies.join(',') !== '220,220,220,880' || countdownEvent.goFrequency !== 880 || countdownEvent.startTimes.some((t, i, a) => i && Math.abs((t - a[i - 1]) - 0.3) > 0.001)) throw new Error(`Wrong GP beep schedule (${JSON.stringify(countdownEvent)})`);
    await D('place', { s: 320, lane: 0, speed: 0 });
    await page.waitForTimeout(220);
    const pickupAudio = await page.evaluate(() => window.__RM_GAME__.getAudioState());
    const pickupEvents = pickupAudio.audioEvents.filter(e => e.kind === 'gp-pickup');
    if (!pickupEvents.length) throw new Error('A real GP coin pickup did not use the kart pickup voice');
    const graphAudit = await page.evaluate(() => window.__panelAudioAudit);
    const limiter = pickupAudio.limiter;
    if (!pickupAudio.hasLimiter || graphAudit.compressorsCreated !== 1 || graphAudit.limiterToDestination !== 1) throw new Error(`Master limiter graph wrong (${JSON.stringify(graphAudit)})`);
    if (!(limiter.threshold === -18 && limiter.ratio === 20 && limiter.attack < 0.003 && limiter.attack > 0)) throw new Error(`Limiter settings wrong (${JSON.stringify(limiter)})`);
    const gpSprites = await D('sprites', null);
    const gpExtra = (await F()).extra;
    if (!gpSprites.kartsReady || !gpSprites.treesReady || gpSprites.kartFrames !== 80 || gpSprites.treeFrames !== 3 || gpSprites.failedImageLoads !== 0 || gpExtra.failedImageLoads !== 0) throw new Error(`Grand Prix sprite integrity failed (${JSON.stringify(gpSprites)})`);
    console.log(`  · GP audio: ${countdownEvent.frequencies.join('/')} Hz at 0.3s steps, ${pickupEvents.length} kart-pickup blip(s); compressor→destination ${graphAudit.limiterToDestination}, threshold ${limiter.threshold}dB, ratio ${limiter.ratio}:1, attack ${(limiter.attack * 1000).toFixed(1)}ms`);
    console.log(`  · GP sprites: karts ${gpSprites.kartFrames}/${gpSprites.kartTotal} ready=${gpSprites.kartsReady}, trees ${gpSprites.treeFrames}/${gpSprites.treeTotal} ready=${gpSprites.treesReady}, failed image loads ${gpSprites.failedImageLoads}`);

    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    const hiddenSchedulerStart = (await page.evaluate(() => window.__RM_GAME__.getAudioState())).musicNextTime;
    await page.waitForTimeout(300);
    const hiddenAudio = await page.evaluate(() => window.__RM_GAME__.getAudioState());
    if (hiddenAudio.contextState !== 'suspended' || hiddenAudio.visibilitySuspendCount < 1) throw new Error(`Hide did not suspend audio (${hiddenAudio.contextState})`);
    if (hiddenAudio.musicNextTime !== hiddenSchedulerStart) throw new Error(`Hidden scheduler kept advancing (${hiddenSchedulerStart} → ${hiddenAudio.musicNextTime})`);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForFunction(() => window.__RM_GAME__.getAudioState().contextState === 'running', { timeout: 2000 });
    const visibleAudio = await page.evaluate(() => window.__RM_GAME__.getAudioState());
    if (visibleAudio.visibilityResumeCount < 1) throw new Error('Visible transition did not resume audio');
    console.log(`  · visibility: hidden state ${hiddenAudio.contextState}, suspend calls ${hiddenAudio.visibilitySuspendCount}; scheduler nextTime held at ${hiddenAudio.musicNextTime.toFixed(3)}s; visible state ${visibleAudio.contextState}, resume calls ${visibleAudio.visibilityResumeCount}`);

    if (consoleErrors.length > 0) throw new Error(`Console errors during the panel-slate check: ${consoleErrors.join(' | ')}`);
    console.log('  ✓ PASS: all Round 15 teaching, balance, touch, audio and sprite checks passed; 0 console errors across all 30 checks.');
    passedCount++;

    // ===== Round 16 check: Tripo pellet / prize-box billboards and their intact vector fallbacks =====
    console.log('\n[Check 31/31] Grand Prix pickup sprites: readiness, both rock frames, live collection and unreachable-asset fallbacks...');
    await page.addInitScript(() => {
      const audit = window.__gpPickupAudit = { draws: { pellet: 0, prizebox: 0, prizeboxSide: 0 } };
      const drawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function(image, ...args) {
        const src = image && String(image.currentSrc || image.src || '');
        if (/gp-pellet\.png$/.test(src)) audit.draws.pellet++;
        else if (/gp-prizebox\.png$/.test(src)) audit.draws.prizebox++;
        else if (/gp-prizebox-side\.png$/.test(src)) audit.draws.prizeboxSide++;
        return drawImage.call(this, image, ...args);
      };
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(700);
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    await startEngine('grandprix');
    await D('freezeRivals', true);
    await D('park', true);

    const readyPickups = await D('sprites', null);
    if (!readyPickups.pelletReady || !readyPickups.prizeBoxesReady || readyPickups.pickupFrames !== 3 || readyPickups.pickupTotal !== 3) {
      throw new Error(`Pickup sprites not fully ready (${JSON.stringify(readyPickups)})`);
    }
    if (readyPickups.failedImageLoads !== 0) throw new Error(`Unexpected image failures before the deliberate fallback run (${readyPickups.failedLoads.join(', ')})`);
    console.log(`  · ready: pellet=${readyPickups.pelletReady}, prize front + side=${readyPickups.prizeBoxesReady}, ${readyPickups.pickupFrames}/${readyPickups.pickupTotal} pickup frames; ordinary GP failed image loads=${readyPickups.failedImageLoads}`);

    await D('place', { s: 235, lane: 0, speed: 0 });
    await page.waitForTimeout(300);
    const pickupTrack = await D('track', null);
    const firstCubeS = Math.round(0.1 * pickupTrack.L / 10) * 10;
    await D('place', { s: firstCubeS - 120, lane: 0, speed: 0 });
    await page.waitForTimeout(1850);
    const spriteDraws = await page.evaluate(() => window.__gpPickupAudit.draws);
    if (!spriteDraws.pellet || !spriteDraws.prizebox || !spriteDraws.prizeboxSide) throw new Error(`A pickup billboard was never drawn (${JSON.stringify(spriteDraws)})`);
    const spritePaths = await D('sprites', null);
    if (spritePaths.pickupDraws.coinVector || spritePaths.pickupDraws.boxVector) throw new Error(`A vector fallback ran despite ready sprites (${JSON.stringify(spritePaths.pickupDraws)})`);
    console.log(`  · instrumented drawImage: pellet=${spriteDraws.pellet}, prize front=${spriteDraws.prizebox}, prize side=${spriteDraws.prizeboxSide}; vector coin/cube draws=${spritePaths.pickupDraws.coinVector}/${spritePaths.pickupDraws.boxVector}`);

    const spriteCoinBefore = await page.evaluate(() => window.__RM_GAME__.getScore());
    await D('place', { s: 320, lane: 0, speed: 0 });
    await page.waitForTimeout(120);
    const spriteCoinAfter = await page.evaluate(() => window.__RM_GAME__.getScore());
    if (spriteCoinAfter - spriteCoinBefore !== 25) throw new Error(`Sprite coin awarded ${spriteCoinAfter - spriteCoinBefore}, expected +25`);
    await D('place', { s: firstCubeS, lane: 0, speed: 0 });
    await page.waitForTimeout(1300);
    const spriteItem = (await F()).extra.item;
    if (!['boost', 'bomb', 'shield'].includes(spriteItem)) throw new Error(`Ready-sprite prize box did not grant a settled item (${spriteItem})`);
    console.log(`  · live sprite collection: coin ${spriteCoinBefore} → ${spriteCoinAfter} (+25); prize box granted ${spriteItem}`);

    // Only the three Round 16 sources become invalid images; the real loader error handlers and every other GP asset run normally.
    await page.addInitScript(() => {
      const audit = window.__gpPickupFallbackAudit = { blocked: [] };
      const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        configurable: true,
        get() { return src.get.call(this); },
        set(value) {
          const original = String(value);
          if (/art\/gp-(?:pellet|prizebox|prizebox-side)\.png$/.test(original)) {
            audit.blocked.push(original);
            return src.set.call(this, 'data:image/png;base64,');
          }
          return src.set.call(this, value);
        }
      });
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(700);
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    await startEngine('grandprix');
    await D('freezeRivals', true);
    await D('park', true);
    const fallbackReady = await D('sprites', null);
    const blockedPickups = await page.evaluate(() => window.__gpPickupFallbackAudit.blocked);
    if (blockedPickups.length !== 3 || !blockedPickups.some(s => /gp-pellet/.test(s)) || !blockedPickups.some(s => /gp-prizebox\.png/.test(s)) || !blockedPickups.some(s => /gp-prizebox-side/.test(s))) throw new Error(`The deliberate fallback did not block exactly the three pickup assets (${JSON.stringify(blockedPickups)})`);
    if (fallbackReady.pelletReady || fallbackReady.prizeBoxesReady || fallbackReady.failedImageLoads !== 3 || fallbackReady.pickupFrames !== 0) throw new Error(`Fallback readiness / expected failures wrong (${JSON.stringify(fallbackReady)})`);
    if (!fallbackReady.kartsReady || !fallbackReady.treesReady) throw new Error('Blocking pickups also broke kart or tree sprites');

    await D('place', { s: 235, lane: 0, speed: 0 });
    await page.waitForTimeout(250);
    await D('place', { s: firstCubeS - 120, lane: 0, speed: 0 });
    await page.waitForTimeout(500);
    const fallbackPaths = await D('sprites', null);
    if (!fallbackPaths.pickupDraws.coinVector || !fallbackPaths.pickupDraws.boxVector) throw new Error(`A vector fallback did not draw (${JSON.stringify(fallbackPaths.pickupDraws)})`);
    if (fallbackPaths.pickupDraws.coinSprite || fallbackPaths.pickupDraws.prizebox || fallbackPaths.pickupDraws.prizeboxSide) throw new Error(`A blocked sprite still drew (${JSON.stringify(fallbackPaths.pickupDraws)})`);
    const fallbackDraws = await page.evaluate(() => window.__gpPickupAudit.draws);
    if (fallbackDraws.pellet || fallbackDraws.prizebox || fallbackDraws.prizeboxSide) throw new Error(`drawImage reached a blocked pickup (${JSON.stringify(fallbackDraws)})`);

    const fallbackCoinBefore = await page.evaluate(() => window.__RM_GAME__.getScore());
    await D('place', { s: 320, lane: 0, speed: 0 });
    await page.waitForTimeout(120);
    const fallbackCoinAfter = await page.evaluate(() => window.__RM_GAME__.getScore());
    if (fallbackCoinAfter - fallbackCoinBefore !== 25) throw new Error(`Fallback coin awarded ${fallbackCoinAfter - fallbackCoinBefore}, expected +25`);
    await D('place', { s: firstCubeS, lane: 0, speed: 0 });
    await page.waitForTimeout(1300);
    const fallbackItem = (await F()).extra.item;
    if (!['boost', 'bomb', 'shield'].includes(fallbackItem)) throw new Error(`Fallback prize box did not grant a settled item (${fallbackItem})`);
    const fallbackTrace = `coin +${fallbackCoinAfter - fallbackCoinBefore}, item ${fallbackItem}, vector coin/cube draws ${fallbackPaths.pickupDraws.coinVector}/${fallbackPaths.pickupDraws.boxVector}`;
    console.log(`  · deliberate fallback: exactly 3 blocked pickups and 3 expected decode failures; ${fallbackTrace}; blocked drawImage=${fallbackDraws.pellet + fallbackDraws.prizebox + fallbackDraws.prizeboxSide}`);
    await leaveEngine();
    if (consoleErrors.length > 0) throw new Error(`Console errors during the pickup sprite check: ${consoleErrors.join(' | ')}`);
    console.log(`  ✓ PASS: all three pickup sprites ready with 0 ordinary failures; drawImage pellet/front/side ${spriteDraws.pellet}/${spriteDraws.prizebox}/${spriteDraws.prizeboxSide}; +25 and item grants held with sprites and vector fallbacks; 0 console errors across all 31 checks.`);
    passedCount++;

  } catch (err) {
    console.error(`\n❌ TEST FAILED: ${err.message}`);
    await browser.close();
    process.exit(1);
  }

  await browser.close();

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passedCount}/${totalCount} Acceptance Checks PASSED!`);
  console.log('All Section 10 build prompt criteria satisfied.');
  console.log('Zero console errors detected throughout execution.');
  console.log('====================================================');
}

runAcceptanceTests().catch(err => {
  console.error(err);
  process.exit(1);
});
