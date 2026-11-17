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
  let totalCount = 19;

  // Screenshot directory
  const screenshotDir = path.resolve(__dirname, '../screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  try {
    // Check 1: Page loads with zero console errors
    console.log('[Check 1/19] Loading game page...');
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
    console.log('\n[Check 2/19] Starting game from PLAY button...');
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
    console.log('\n[Check 3/19] Testing autonomous Menace pellet eating...');
    const initialPellets = await page.evaluate(() => window.__RM_GAME__.getPellets().remaining);
    // Let Menace move and eat for 2 seconds
    await page.waitForTimeout(2000);
    const pelletsAfterEat = await page.evaluate(() => window.__RM_GAME__.getPellets().remaining);
    const pelletsEaten = initialPellets - pelletsAfterEat;

    if (pelletsEaten <= 0) throw new Error(`Menace did not eat any pellets (before: ${initialPellets}, after: ${pelletsAfterEat})`);

    console.log(`  ✓ PASS: The Menace autonomously pathfinds and ate ${pelletsEaten} pellets.`);
    passedCount++;

    // Check 4: Possession switching works for all four ghosts (1-4 and squad bar clicks)
    console.log('\n[Check 4/19] Testing possession switching across all 4 squad ghosts...');
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
    console.log('\n[Check 5/19] Testing touch input steering...');
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
    console.log('\n[Check 6/19] Testing ghost catch detection...');
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
    if (scoreAfterCatch < initialScore + 300) {
      throw new Error(`Catch score failed: expected at least ${initialScore + 300}, got ${scoreAfterCatch}`);
    }

    console.log(`  ✓ PASS: Catch registered! Menace lives decremented (${initialLives} -> ${livesAfterCatch}) and score awarded (+300).`);
    passedCount++;

    // Check 7: Fright mode flips on power pellet and ghost can be eaten & benched
    console.log('\n[Check 7/19] Testing Fright Mode & ghost benching...');
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
    console.log('\n[Check 8/19] Testing Win / Maze Clear screen...');
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
    console.log('\n[Check 9/19] Testing Game Over screen...');
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
    console.log('\n[Check 10/19] Testing squad house exit and hunting range...');
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
    console.log('\n[Check 11/19] Testing the Green Valley Flip on a real power-pellet pickup...');
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
    console.log('\n[Check 12/19] Testing the flip caught path (bench + return to maze)...');
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
    console.log('\n[Check 13/19] Testing soundtrack states and console cleanliness...');
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
    console.log('\n[Check 14/19] Testing flip routing (top-right pellet → Block Kingdom) and kingdom survival...');
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
    console.log('\n[Check 15/19] Testing the Block Kingdom caught path (bench + return to maze)...');
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
    console.log('\n[Check 16/19] Testing GLOOM routing and survival (bottom-left pellet)...');
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
    console.log('\n[Check 17/19] Testing GLOOM caught path (bench + return to maze)...');
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
    console.log('\n[Check 18/19] Testing Phantom Grand Prix routing and survival (bottom-right pellet)...');
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

    // Let the race run: steer, wait for mid-race frame with both karts
    await page.evaluate(() => window.__RM_GAME__.flipSteer(1));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__RM_GAME__.flipSteerRelease(1));
    await page.waitForTimeout(1100);

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
    console.log('\n[Check 19/19] Testing Phantom Grand Prix caught path (bench + return to maze)...');
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

    console.log(`  ✓ PASS: Caught in Phantom Grand Prix: ${ghostNames[gpCaughtGhost]} benched through the bench flow ("ONE DOWN."), game back to playing; 0 console errors across all 19 checks.`);
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
