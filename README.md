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
2. **The Flips:** When the Menace grabs a corner power pellet, the maze tears open and the hunt flips into that pellet's mini-game — Green Valley (top-left) or Block Kingdom (top-right); see *The Second Twist* and *Round 3* below. Get caught and that ghost is **benched** (eyes float back to the house, out until the next catch). If all 4 ghosts are benched, the maze is lost immediately!
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

The flip is exposed to the automated battery as state `flip`, with `triggerFlip`, `forceFlipSurvive`, `forceFlipCatch`, `flipJump`, `flipJumpRelease`, `flipFastFall`, `getFlip` (whose `kind` names the active module) and `getFlipRoute` hooks alongside the Round 1 hooks.

## Round 3 — Flip Routing and Block Kingdom

The flip set is **four** mini-games, one per power pellet, each an instantly recognisable genre homage in original dress — never borrowed sprites, layouts, names or music. The router picks by pellet position:

| Pellet | Flip | Genre | Status |
| --- | --- | --- | --- |
| top-left (1,1) | **Green Valley** | rolling-hills chase | built (Round 2) |
| top-right (17,1) | **Block Kingdom** | bright platformer | built (Round 3) |
| bottom-left (1,19) | **GLOOM** | first-person corridor | next round — falls back to Green Valley |
| bottom-right (17,19) | **Phantom Grand Prix** | kart racer | next round — falls back to Green Valley |

Every flip is a named module behind one contract (enter with the possessed ghost; exit `survived` → back unbenched with +200, or `caught` → the normal bench flow). Maze time freezes during any flip.

**Block Kingdom** is a side-scrolling platform level: blue sky, white clouds, green hills, rows of floating cube blocks with a star emblem, striped chimneys and a tall banner pole at the finish.

- **Controls.** Auto-run to the right; **hold** jump (Space / ↑ / W / tap-and-hold / d-pad up) to rise higher, release to cut the jump short. A touch of coyote time and a jump buffer keep edges forgiving. ↓ / S / swipe down fast-falls.
- **Level.** A fixed authored layout, 101 tiles (≈2.4 k px) to the pole — about 22 s of clean running: ground stretches, three 2-tile gaps and one 3-tile gap, block rows at two heights (the high row is reached from a low row or a chimney top), and five solid chimneys you hop or get pinned against.
- **Falls.** Dropping into a gap is not instant death: the ghost respawns on the last ground, dazed for a second while the Menace gains. The **second** fall in one run is the catch.
- **Pellets and sprouts.** Pellets along the ideal line (+25; every 10 pushes him back with a surge). Four round sprout minions patrol the ground — **land on one to bounce** for +50; run into one and you stumble.
- **The Menace on foot.** He runs the same level behind you on two stubby legs, hesitating a beat at every gap edge and chimney before hopping. That hesitation (`kingdomHopCost`, per maze) is the catch-up tuning knob; his speed gain is `kingdomMenaceGain`. If he touches you, the catch path applies.
- **Banner.** "BLOCK KINGDOM — RUN!" in the kingdom palette the moment the maze tears open.

## The Soundtrack (Rounds 2–3)

All music is composed in code — the same WebAudio synth that makes the effects, driven by a small lookahead scheduler (sixteenth-note steps, 160 ms of lookahead). No audio files, no borrowed melodies. Four states:

- **Title:** sparse and moody — a low pulse on A1 and occasional bell-like notes from A minor pentatonic.
- **Maze:** a looping night-shift groove at **104 BPM** in A minor (Am · F · Dm · Em): an octave bass pulse, a soft triangle arpeggio and a quiet filtered pad, mixed under the effects.
- **Valley:** the same engine at **140 BPM** with a brighter voicing (C · G · Am · F), a driving sixteenth-note arpeggio and hi-hat ticks, for the Green Valley segment only.
- **Kingdom:** **152 BPM** in C major (C · F · G · C): a bouncy square-wave lead over a skipping bass (root on the beat, fifth on the dotted off-beat) with light hat ticks, for the Block Kingdom segment only.

Music starts only after the first user gesture, ducks under the catch and flip stingers, stops on game over, maze clear and victory (their jingles already exist), and obeys the `M` key / mute button together with the effects. The state (`off` / `title` / `maze` / `valley` / `kingdom`) is exposed through `getMusicState()`.

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

The project includes headless Playwright test coverage: the 10 Round 1 checks, the 3 Round 2 checks and the 2 Round 3 checks.

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
13. The soundtrack reads `maze` after PLAY and `valley` during the flip, obeys mute, stops on game over.
14. Flip routing and kingdom survival: the Menace steered onto the top-right pellet enters a flip whose kind reads `kingdom` within a second; the music reads `kingdom` during the segment; forced survival returns to playing, unbenched, +200.
15. Kingdom caught path: a fresh kingdom flip, forced catch, benches that ghost and returns to playing; zero console errors across the whole battery.

Screenshots of title, gameplay, the flip transition, the Green Valley segment, the Block Kingdom banner moment and a mid-level kingdom frame, maze clear, and game over screens are saved into `screenshots/`.

---

## Technical Specifications & IP Guardrails

- **Single Self-Contained Web Build:** Implemented in `index.html` with inline CSS, HTML5 Canvas 2D vector rendering, and procedural WebAudio synth. No external frameworks, build steps, or runtime dependencies.
- **Original IP:** 100% original code, original 19×21 maze layout with wrap tunnels, original character designs (vector sheet-ghosts), and original procedural WebAudio synthesizers.
