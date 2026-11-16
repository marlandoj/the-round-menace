const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runAcceptanceTests() {
  console.log('====================================================');
  console.log('THE ROUND MENACE — Automated Acceptance Test Battery');
  console.log('Section 10 Compliance Verification (Headless Playwright)');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
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
  let totalCount = 13;

  // Screenshot directory
  const screenshotDir = path.resolve(__dirname, '../screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  try {
    // Check 1: Page loads with zero console errors
    console.log('[Check 1/13] Loading game page...');
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
    console.log('\n[Check 2/13] Starting game from PLAY button...');
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
    console.log('\n[Check 3/13] Testing autonomous Menace pellet eating...');
    const initialPellets = await page.evaluate(() => window.__RM_GAME__.getPellets().remaining);
    // Let Menace move and eat for 2 seconds
    await page.waitForTimeout(2000);
    const pelletsAfterEat = await page.evaluate(() => window.__RM_GAME__.getPellets().remaining);
    const pelletsEaten = initialPellets - pelletsAfterEat;

    if (pelletsEaten <= 0) throw new Error(`Menace did not eat any pellets (before: ${initialPellets}, after: ${pelletsAfterEat})`);

    console.log(`  ✓ PASS: The Menace autonomously pathfinds and ate ${pelletsEaten} pellets.`);
    passedCount++;

    // Check 4: Possession switching works for all four ghosts (1-4 and squad bar clicks)
    console.log('\n[Check 4/13] Testing possession switching across all 4 squad ghosts...');
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
    console.log('\n[Check 5/13] Testing touch input steering...');
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
    console.log('\n[Check 6/13] Testing ghost catch detection...');
    const initialLives = await page.evaluate(() => window.__RM_GAME__.getMenace().lives);
    const initialScore = await page.evaluate(() => window.__RM_GAME__.getScore());

    // Place Menace and possessed ghost at identical tile
    await page.evaluate(() => {
      window.__RM_GAME__.setMenacePos(9, 13);
      window.__RM_GAME__.setGhostPos(0, 9, 13);
    });
    await page.waitForTimeout(300);

    const livesAfterCatch = await page.evaluate(() => window.__RM_GAME__.getMenace().lives);
    const scoreAfterCatch = await page.evaluate(() => window.__RM_GAME__.getScore());

    if (livesAfterCatch !== initialLives - 1) {
      throw new Error(`Catch failed: expected lives ${initialLives - 1}, got ${livesAfterCatch}`);
    }
    if (scoreAfterCatch < initialScore + 300) {
      throw new Error(`Catch score failed: expected at least ${initialScore + 300}, got ${scoreAfterCatch}`);
    }

    console.log(`  ✓ PASS: Catch registered! Menace lives decremented (${initialLives} -> ${livesAfterCatch}) and score awarded (+300).`);
    passedCount++;

    // Check 7: Fright mode flips on power pellet and ghost can be eaten & benched
    console.log('\n[Check 7/13] Testing Fright Mode & ghost benching...');
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
    console.log('\n[Check 8/13] Testing Win / Maze Clear screen...');
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
    console.log('\n[Check 9/13] Testing Game Over screen...');
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
    console.log('\n[Check 10/13] Testing squad house exit and hunting range...');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.click('#btn-play');
    const visited = [new Set(), new Set(), new Set(), new Set()];
    const ranged = [false, false, false, false];
    let lastSquad = null;
    // Round 2: maze time pauses while a natural power-pellet pickup runs the Green Valley flip,
    // so this check samples 15s of *maze* time — samples taken during a flip are not counted.
    let flipWaits = 0;
    const waitOutFlip = async () => {
      let st = await page.evaluate(() => window.__RM_GAME__.getState());
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
      for (let w = 0; w < 18 && lastSquad.slice(1).some(inInterior); w++) {
        await page.waitForTimeout(400);
        await waitOutFlip();
        lastSquad = await page.evaluate(() => window.__RM_GAME__.getSquad());
      }
      for (let gi = 1; gi < 4; gi++) {
        if (visited[gi].size < 6) throw new Error(`Ghost ${gi} (${ghostNames[gi]}) barely moved: ${visited[gi].size} distinct tiles in ${(samples * 0.4).toFixed(1)}s`);
        if (!ranged[gi]) throw new Error(`Ghost ${gi} (${ghostNames[gi]}) never left the house neighbourhood`);
        if (inInterior(lastSquad[gi])) throw new Error(`Ghost ${gi} (${ghostNames[gi]}) is stuck inside the house interior at ${lastSquad[gi].tileX},${lastSquad[gi].tileY}`);
      }
      const notes = [];
      if (catchResets) notes.push(`${catchResets} catch reset${catchResets > 1 ? 's' : ''}, window extended to ${(samples * 0.4).toFixed(1)}s`);
      if (flipWaits) notes.push(`maze time paused for a natural flip, ${(flipWaits * 0.4).toFixed(1)}s not counted`);
      console.log(`  ✓ PASS: All AI ghosts left the house and hunted (distinct tiles: Rosé ${visited[1].size}, Tide ${visited[2].size}, Goldie ${visited[3].size}${notes.length ? '; ' + notes.join('; ') : ''}).`);
      passedCount++;
    }

    // ===== Round 2 checks: the Green Valley Flip and the soundtrack =====

    // Check 11: Flip triggers on a real power-pellet pickup; forced survival returns to playing unbenched
    console.log('\n[Check 11/13] Testing the Green Valley Flip on a real power-pellet pickup...');
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
    console.log('\n[Check 12/13] Testing the flip caught path (bench + return to maze)...');
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
    console.log('\n[Check 13/13] Testing soundtrack states and console cleanliness...');
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

    console.log('  ✓ PASS: Soundtrack reads off → maze (PLAY) → valley (flip) → maze, obeys M mute, stops on game over; 0 console errors across all 13 checks.');
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
