# The Round Menace

> **"Pac-Man, except you're the ghosts — and he's eating your maze."**

## What Was Remixed & The Twist

- **What was remixed:** Pac-Man (1980) — the maze, the pellets, the four ghosts, the power pellet, the fruit.
- **The one big change:** You play the ghosts. A round yellow menace is eating your maze, and you and your night-shift ghost squad are the ones who stop him.

For 45 years, players have watched the glutton devour mazes while ghosts chased him down. In **The Round Menace**, the roles and objectives flip: you coordinate the keepers of the labyrinth. Your score is **Pellets Saved** — every pellet remaining on the board when you land the third catch belongs to your sanctuary.

---

## The Squad

Movement is grid-aligned and tile-based. While you steer one ghost directly, your three squadmates autonomously execute their signature hunting rules:

- **Ember** (Red, Pointed Hood) — *The Chaser*: Targets the Menace's current tile directly.
- **Rosé** (Pink, Bowed Sheet) — *The Ambusher*: Targets 4 tiles ahead of the Menace's facing direction.
- **Tide** (Teal, Wave-Pattern Hem) — *The Flanker*: Takes the tile 2 ahead of the Menace and doubles the vector from Ember (the classic pincer).
- **Goldie** (Amber, Stitched Patches) — *The Shy One*: Pursues the Menace until within 8 tiles, then holds a corner blockade.

Tap **1–4**, tap a ghost directly on screen, or click any portrait in the bottom squad bar to possess that ghost instantly. The possessed ghost is marked with a rotating white dashed selection ring.

---

## Gameplay Mechanics

1. **Catch Him 3 Times:** Steer your squad to corner the Menace. Each catch costs him 1 life. Strip all 3 lives before he eats your pellets to win the maze.
2. **Hunt Flip (Fright Mode):** When the Menace grabs an in-corridor power pellet, the hunt flips. All ghosts turn midnight-blue with pale frightened faces and slow to 75% speed while the Menace speeds to 110%. If he catches a ghost, that ghost is **benched** (eyes float back to the house, out until the next catch). If all 4 ghosts are eaten in one fright run, the maze is lost immediately!
3. **Fruit Defense:** A glowing lantern-orb fruit spawns at 70 and 140 pellets eaten. If you guard it and let it expire uneaten, you gain a +500 PTS bonus. If the Menace eats it, it reduces your final score.
4. **Three Escalating Mazes:**
   - **Maze 1:** Indigo neon palette, base speed, 6.0s fright time.
   - **Maze 2:** Violet / magenta shift, faster Menace (107%), 5.0s fright time.
   - **Maze 3:** Deep red-violet warning mood, fastest Menace (114%), 4.0s fright time.

---

## Controls

- **Steering:** Arrow Keys / WASD / Swipe Gestures / On-Screen Touch D-Pad.
- **Possess Squadmates:** Keys `1`, `2`, `3`, `4` or tap ghost / squad bar portrait.
- **Pause:** `Space` or `P` key, or the on-screen ⏸️ button.
- **Mute / Unmute Audio:** `M` key or on-screen 🔊 button.

---

## Running Automated Acceptance Checks

The project includes headless Playwright test coverage verifying all 9 criteria from Section 10 of the build specification:

```bash
npm test
```

The test suite automatically validates:
1. Zero console errors on load.
2. Clean transition from title screen to gameplay.
3. Autonomous Menace pellet-seeking pathfinding.
4. Instant possession switching for all four ghosts via keys and UI.
5. Touch input steering and response.
6. Catch detection and Menace life decrementing.
7. Power-pellet fright mode activation and ghost benching.
8. Reachability and scoring tally of the Maze Clear screen.
9. Reachability of the Game Over screen.

Screenshots of title, gameplay, fright mode, maze clear, and game over screens are saved into `screenshots/`.

---

## Technical Specifications & IP Guardrails

- **Single Self-Contained Web Build:** Implemented in `index.html` with inline CSS, HTML5 Canvas 2D vector rendering, and procedural WebAudio synth. No external frameworks, build steps, or runtime dependencies.
- **Original IP:** 100% original code, original 19×21 maze layout with wrap tunnels, original character designs (vector sheet-ghosts), and original procedural WebAudio synthesizers.
