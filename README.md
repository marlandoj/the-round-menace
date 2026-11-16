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
2. **The Green Valley Flip:** When the Menace grabs an in-corridor power pellet, the maze tears open and the hunt flips into a side-scrolling chase (see *The Second Twist* below). Get caught and that ghost is **benched** (eyes float back to the house, out until the next catch). If all 4 ghosts are benched, the maze is lost immediately!
3. **Fruit Defense:** A glowing lantern-orb fruit spawns at 70 and 140 pellets eaten. If you guard it and let it expire uneaten, you gain a +500 PTS bonus. If the Menace eats it, it reduces your final score.
4. **Three Escalating Mazes:**
   - **Maze 1:** Indigo neon palette, base speed, the rolling Menace gains +2.4 px/s² in the valley.
   - **Maze 2:** Violet / magenta shift, faster Menace (107%), +2.7 px/s² in the valley.
   - **Maze 3:** Deep red-violet warning mood, fastest Menace (114%), +3.0 px/s² in the valley.

---

## The Second Twist — The Green Valley Flip (Round 2)

The first twist put you in the ghosts' sheets. The second twist is a twist *within* the twist: the power pellet no longer flips the hunt inside the maze — it flips the **genre**.

- **The tear.** When the Menace eats a power pellet, the maze rips apart down the middle ("THE HUNT FLIPS — RUN!") and the ghost you are possessing is thrown into **Green Valley**, an original side-scrolling chase drawn entirely in canvas: layered parallax hills, grass, flowers, simple trees, a sun and drifting clouds.
- **You run.** The ghost auto-runs to the right. Your only inputs are **jump** (`Space`, `↑`, `W`, or tap) and **fast-fall** (`↓`, `S`, or swipe down). One jump height is tuned so every obstacle is clearable.
- **The route.** Gently rolling ground with **rocks** and **logs**. Clip one and you stumble: 30% slower for one second. No pits in this version.
- **Pellets.** Strung in arcs along the route, +25 each. Every **10** pellets collected grants a **surge** that shoves the Menace back.
- **He rolls.** The Menace pursues from the left curled into a grinning rolling ball with a red glow. His speed starts just below yours and climbs steadily; your surges and his own obstacle smashes (he barrels through at a small speed cost) keep the gap playable.
- **The Maze Gate.** A progress meter at the top shows both icons racing to the gate — about 22 seconds of running. Reach it and the ghost bursts back into the maze ("BACK THROUGH THE GATE"), the power pellet is spent, normal play resumes and you bank a **+200 survival bonus**. Get touched and that ghost is benched through the normal bench flow.
- **Maze time pauses.** Possession is locked to the ghost who was possessed at the trigger; the rest of the squad waits frozen in the maze until you return.

The flip is exposed to the automated battery as state `flip`, with `triggerFlip`, `forceFlipSurvive`, `forceFlipCatch`, `flipJump`, `flipFastFall` and `getFlip` hooks alongside the Round 1 hooks.

## The Soundtrack (Round 2)

All music is composed in code — the same WebAudio synth that makes the effects, driven by a small lookahead scheduler (sixteenth-note steps, 160 ms of lookahead). No audio files, no borrowed melodies. Three states:

- **Title:** sparse and moody — a low pulse on A1 and occasional bell-like notes from A minor pentatonic.
- **Maze:** a looping night-shift groove at **104 BPM** in A minor (Am · F · Dm · Em): an octave bass pulse, a soft triangle arpeggio and a quiet filtered pad, mixed under the effects.
- **Valley:** the same engine at **140 BPM** with a brighter voicing (C · G · Am · F), a driving sixteenth-note arpeggio and hi-hat ticks, for the flip segment only.

Music starts only after the first user gesture, ducks under the catch and flip stingers, stops on game over, maze clear and victory (their jingles already exist), and obeys the `M` key / mute button together with the effects. The state (`off` / `title` / `maze` / `valley`) is exposed through `getMusicState()`.

## The Villain Pass (Round 2)

- His **grin widens** (and his brow slants harder) with every pellet he eats in the current maze; in the valley he is the hunter and carries a **red glow**.
- **Taunts**, short banners in his voice: *"MY TURN."* when the hunt flips, *"ONE DOWN."* when he benches a ghost, *"ALL MINE."* when he devours a maze, *"LUCKY."* when you catch him. Family-friendly menace.

---

## Controls

- **Steering:** Arrow Keys / WASD / Swipe Gestures / On-Screen Touch D-Pad.
- **Possess Squadmates:** Keys `1`, `2`, `3`, `4` or tap ghost / squad bar portrait.
- **Pause:** `Space` or `P` key, or the on-screen ⏸️ button.
- **Mute / Unmute Audio:** `M` key or on-screen 🔊 button.

---

## Running Automated Acceptance Checks

The project includes headless Playwright test coverage: the 10 Round 1 checks plus the 3 Round 2 checks.

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
7. Power-pellet hunt flip activation (HUD bar) and ghost benching.
8. Reachability and scoring tally of the Maze Clear screen.
9. Reachability of the Game Over screen.
10. The squad exits the house and hunts (house-fix regression).
11. The flip triggers on a real power-pellet pickup within a second; forced survival returns to playing with the flipped ghost unbenched and +200.
12. The flip caught path benches that ghost through the bench flow and returns to playing.
13. The soundtrack reads `maze` after PLAY and `valley` during the flip, obeys mute, stops on game over; zero console errors across the whole battery.

Screenshots of title, gameplay, the flip transition, the Green Valley segment, maze clear, and game over screens are saved into `screenshots/`.

---

## Technical Specifications & IP Guardrails

- **Single Self-Contained Web Build:** Implemented in `index.html` with inline CSS, HTML5 Canvas 2D vector rendering, and procedural WebAudio synth. No external frameworks, build steps, or runtime dependencies.
- **Original IP:** 100% original code, original 19×21 maze layout with wrap tunnels, original character designs (vector sheet-ghosts), and original procedural WebAudio synthesizers.
