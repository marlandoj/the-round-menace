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
| top-left (1,1) | **Green Valley** | rolling-hills chase | built (Round 2, Gauntlet fixes Round 4, full fix round 6) |
| top-right (17,1) | **Block Kingdom** | bright platformer | built (Round 3, Gauntlet fixes Round 4, full fix round 6) |
| bottom-left (1,19) | **GLOOM** | first-person corridor | built (Round 4, renderer rebuilt Round 5) |
| bottom-right (17,19) | **Phantom Grand Prix** | kart racer | built (Round 4, rebuilt as a two-kart race Round 6) |

Every flip is a named module behind one contract (enter with the possessed ghost; exit `survived` → back unbenched with +200, or `caught` → the normal bench flow). Maze time freezes during any flip.

## Round 4 — GLOOM, Phantom Grand Prix, and Gauntlet Fixes

### WORK ITEM 1 — GLOOM (Bottom-Left Pellet)
A first-person corridor shooter parody down a dark tech-base corridor in original dress:
- **Pseudo-3D Corridor.** Scaled-corridor renderer with perspective textured metal panel walls, warning hazard baseboards, flickering wall light panels (reacting dynamically as the Menace approaches), ceiling conduits and rhythmic structural pillars.
- **Blaster & Status Bar.** Ghost pellet blaster visible at bottom-center with bobbing, recoil, and brilliant muzzle flash illuminating corridor walls. Chunky DOOM-inspired status bar along the bottom featuring `NERVE %` (health), `PELLETS` (ammo), digital counters, exit progress meter, and an animated Ghost face portrait (reacts to strafing, firing, damage, and critical nerve).
- **Controls & Mechanics.** Strafe between 3 corridor lanes (`Left`/`Right`, `A`/`D`, swipe); fire pellet bursts (`Space` or tap) to knock the Menace back (+50 PTS); run over floor pellet trails to reload (+5 ammo, +25 PTS).
- **Survival.** Survive ~20 seconds to reach the sliding blast EXIT door. 3 grabs or camera overrun benches the ghost.
- **Soundtrack.** `gloom` state: 126 BPM dark industrial Phrygian pulse in E minor with grinding bass, synth lead, kick, and snare.

### WORK ITEM 2 — Phantom Grand Prix (Bottom-Right Pellet)
A behind-the-kart pseudo-3D racer on a curving, banked track:
- **Curved Banked Track.** Segmented road with curves and hills, alternating asphalt stripes, red/white rumble rumbles, roadside grass, checkered start/finish arch with cheering confetti, overhead banners, and grandstands with bobbing pixel spectators.
- **Karts & Dual Racing.** Ghost's kart in the foreground with visible steering lean, electric drift sparks, and twin exhaust puffs. The Menace drives his yellow monster roadster, throwing pellet bombs onto the racing line and ramming when close.
- **Controls & Boost.** Auto-acceleration, steer with `Left`/`Right`, `A`/`D`, or tilt-free touch halves. Boost pads trigger high-speed surges with speed lines and FOV kick. Grass excursions or bomb hits cost speed. 3 rams = caught.
- **Survival.** 1 lap (~25 seconds). 1st/2nd position indicator badge. Cross finish ahead of him to survive (+200 PTS).
- **Soundtrack.** `grandprix` state: 168 BPM upbeat driving fanfare lead over bouncy skipping bass.

### Bounded Gauntlet Fixes (Green Valley & Block Kingdom)
- **Green Valley:** Two-tone geometric diamond-patterned earth faces under grass line, palm-style curved trees with segmented trunks and spiky fronds, loop-de-loop silhouette in distant background ocean layer, steep slope section in terrain, bold hollow golden ring pellets with spinning shine, 4 parallax layers with soft contact shadows, landing dust and pace dust, surge speed lines, jump/landing squash-and-stretch, sparkle pickup trails, and Menace kept visible in-frame gaining on a larger ghost with panicked backward glance and near-catch screen shake.
- **Block Kingdom:** Distant pale spotted hills echoing genre backdrop, mid-ground hill band, foreground bushes, grass tufts, flowers, shaded dirt stratum under ground line, soft drop shadows under blocks, chimneys, minions, Menace, and ghost, running dust puffs, landing squash-and-stretch, sparkle pellet trails, block passing/strike bounce animation, speed lines and subtle shake as Menace closes, taller chimneys, larger block clusters at varied heights, and an in-art gag: Menace waving a tiny captured squad flag as he runs.

## Round 5 — GLOOM Corridor Renderer Rebuild (defect repair)

Operator inspection of the Round 4 delivery found GLOOM's game state correct but its picture broken: a white void behind the banner, a blank field during live play, then a flat yellow field with one giant white disc. No corridor, no walls, no Menace figure.

**Diagnosis.** The corridor itself had always been drawn correctly (world-unit quads projected through `s = fov / z`), but every *sprite* multiplied a pixel-size constant by `s` — which is pixels-per-world-unit (about 10 at the far end, 190 at the near clip), not a 0–1 scale factor. A floor pellet was drawn at `6.5 × s` (a 3,000-pixel disc as it reached the camera; its white highlight alone covered the playfield — the "white void"), the Menace at `48 × s` (a 480-pixel disc on his very first frame at the far end of the corridor — the "yellow field"), crates at `18 × s`. The sprites were drawn last, so the perfectly good corridor underneath was buried every frame. The sprite scale was never clamped. It was not a placeholder; it was a unit mistake in the sprite layer.

**Repair (rendering only — gameplay, controls, timing, music and the flip contract untouched).**
- Every sprite and line width is now a world size × `s`, with a pixel floor: pellets 0.16 u, crates 0.55 u, bolts 0.11 u, sparks 0.07 u, seams 0.02–0.035 u.
- The corridor was rebuilt as panelled tech-base walls on both sides: base plate gradient, recessed panel faces, upper trim rail with rivets, lower hazard band, a dark panel seam at every segment edge, cyan/amber wall lights every third segment (flickering as the Menace passes), and columns standing proud of the wall every fourth segment for parallax. Floor: alternating deck plating with seams and three lane guides. Ceiling: darker plating with cold lamp strips. Everything converges on the vanishing point, which carries a translucent cold glow and a translucent haze pool for distance.
- The Menace is a **figure** (`drawMenaceFigure`): the round yellow glutton on two stubby pumping legs, running head-on at the camera — eyes with pupils that track your lane, angry brows, a wide chomping grin with fangs and tongue, the hunter's red rim glow. He is drawn in unit space and scaled by the projection (body radius 1.25 u), so he grows smoothly as he closes, and his radius is clamped to 28% of the view so at the grab he fills at most the central portion of the frame. A hit is a translucent white wash and a bright rim; the face stays.
- The only opaque full-playfield fill is the dark base tone `#06080d`. Every overlay (lights, haze, muzzle flash, low-NERVE red pulse) is translucent; the red pulse stays an edge vignette.
- The blaster and the status bar are byte-for-byte the Round 4 code.
- The renderer reports where it drew the Menace (`getFlip().extra.menaceScreen`) so the battery can check the figure, not just the state.

## Round 6 — Full Gauntlet fix rounds: Phantom Grand Prix, Green Valley, Block Kingdom

Marlando's ruling ("full fix rounds for all three flips, whatever it takes") replaced the one-bounded-fix economy for these three. The Gauntlet judges score from captured frames, so every change here is one a single mid-action still can show: both characters in shot, motion cues visible, a dense world. GLOOM, the maze, the soundtrack and the flip contract are untouched; all 21 checks keep passing.

### Phantom Grand Prix (Round 2 median 14 — wit 2, AAA feel 2, game feel 2)
Rebuilt as a real two-kart race seen from a chase camera that sits behind the ghost's kart, so a rival up to ~110 units behind her still projects inside the frame (bigger and lower — looming) while a rival ahead shrinks up the road.
- **The race in the frame.** The Menace lines up **beside** the ghost on the grid under the start arch and his monster kart stays in shot for the whole lap: a rubber band holds him between 110 units behind and 600 ahead, the band snaps him back the moment the renderer reports his kart outside the frame (round a bend, past an edge), the camera slides to the midpoint of the two karts when they run level, and a rear-view mirror shows his grin when he is on her tail. Both karts are drawn properly from behind: fat slick tyres with rims and tread, turning front wheels, a shaded body shell with a highlight, numbered tail plate, spoiler with end plates, twin exhausts, a visible driver (the ghost in a helmet band with hands on the wheel; the Menace in pushed-up goggles grinning back over his shoulder), steering lean, bank roll, exhaust puffs, drift smoke and sparks off the rear tyres.
- **The track world.** A curving circuit — sweeping bend, boost straight, banked hairpin, hill crest and dip, S-chicane, second boost straight, final curve — with real quadratic bends, banking that tilts the road slice and rolls the karts, a road shaded across its width and textured by alternating slices, tyre marks, edge lines and a dashed centre line, red/white curbs, grandstands with a three-row crowd bobbing in squad colours under striped roofs and pennant lines, waving flags, billboards (`PHANTOM GP`, `PELLET CO.`, `SQUAD TYRES`, `GHOST FUEL`), gantries (`BOOST`, `HALFWAY`), chevron boards on the outside of bends, round trees and flowering bushes, distance haze, and a sky of two cloud layers, hot-air balloons, snow-capped mountains, sun-lit layered hills with a lighthouse and a turning windmill.
- **Signature props and feedback.** Floating pellet cubes on the racing line (+25, `+25` pop, sparkle burst; five in a row is a **PELLET RUSH** surge that spins the Menace out — and the glutton eats any cube on his own line), boost pads that fire an FOV kick (the camera's focal length drops), white flash and radial speed lines, pellet bombs the Menace visibly cocks and throws (arm animation) that arc over the road and burst into a splat of pellet shards you must steer around, `OVERTAKE!` / `HE PASSES YOU!` flashes on every lead change, `CLOSE!` near-miss flashes, `RAMMED! n/3` with a swerve-away, a live position plaque with the gap in metres, a loop-shaped lap tracker carrying both karts, and confetti cannons on the finish arch that fire as the karts arrive.
- **The finish is a race to the line.** Whoever crosses the arch first takes it; a short finish phase coasts both karts through the confetti before the result stands (`1ST — CHECKERED FLAG!` or `HE TAKES THE FLAG!`). Hands-off he wins; steer the bends, take the boost pads and the cubes, avoid the bombs and you take the flag.

### Green Valley (Round 2 median 17 — game feel 2)
- **Motion made visible.** A run cycle (bob, forward lean, alternating stride squash-and-stretch), rising stretch / landing squash, tan dust puffs kicked up by every stride and every landing (both characters), four-point-star sparkle bursts and `+25` pops on pickup, speed lines streaking behind her at full pace and filling the screen on a surge, fading afterimages behind both runners, a motion-blur tail on the rolling Menace, and a near-catch vignette that throbs as he closes.
- **Density toward the reference.** A thick saturated grass cap with a lighter lip, a topsoil band over the checkered earth, a deeper textured sea with three rows of moving wave stripes and animated glints, sunflowers that sway, carved wooden marker posts with cut faces and star caps, bushes along the run and on the mid hills, more trees, birds, high wisps and big clouds, a more saturated palette, and soft shadows under both characters (the ghost's shrinks as she jumps) and every prop.
- **Signature terrain, playable.** Two real slope sections (a long climb-and-drop and a short ramp): the grade changes speed for real — climbs slow her, drops speed her up, and the rolling ball gains more downhill. The loop silhouettes stay as backdrop dressing. Both characters are scaled up (ghost 1.8×, Menace radius 22) and the camera keeps the Menace whole in frame at the left (never cropped) while he visibly gains; the maximum gap is 280 px.

### Block Kingdom (Round 2 median 17 — AAA feel 2)
- **True parallax depth.** Three cloud layers (high far clouds, low wisps above the hill line, near puffy clouds) filling the sky, taller distant pale spotted hills with more spots and a sun-lit rim, the mid-ground hill band with highlights, mid bushes, foreground bushes and stemmed flowers hugging the terrain line, grass tufts, a shaded dirt stratum with tile seams, speckles and strata lines that follow the slope, pit shading, and soft drop shadows under the ghost, the Menace, minions, blocks and chimneys.
- **Juice made visible.** Tan running dust and landing dust for both runners, a run cycle with stride squash-and-stretch and afterimages at pace, landing squash, four-point-star sparkle bursts with `+25` pops on pickup, the star-block bounce, speed lines and a subtle shake as the Menace closes, and a throbbing red vignette when he is right behind her.
- **Staging and scale.** The ghost at 1.7× and the Menace drawn at radius 20, the camera keeping him whole in frame at the left (maximum gap 240 px), taller chimneys (up to four tiles), larger block clusters at varied heights (up to seven tiles up), a **sloped terrain section** (tiles 61–75: a climb, a plateau carrying a chimney, a drop — the ground-height function runs through the physics, so landings, running, the Menace's hops and the sprout patrols all follow it), the banner pole standing in-world at the goal, and the in-art gag twice over: the Menace waves his tiny captured squad flag as he runs and stomps any sprout minion in his way flat, leaving the flattened disc behind him.

### Battery
`test/acceptance.js` changed in screenshot timing only: the Grand Prix capture (check 18) now steers for 0.3 s and waits 1.5 s so the frame is a mid-race moment with both karts whole in shot. The `npm test` command is byte-identical. The Grand Prix module reports both kart rects and `bothInFrame` through `getFlip().extra`; Block Kingdom reports the ghost/Menace positions and `bothInFrame` too.

## Round 11 — Phantom Grand Prix: Tripo karts, trees and crowd, and a proper spin

Commissioned 2026-11-18. Phantom Grand Prix only; the maze, Green Valley, Block Kingdom and GLOOM stand as Round 10 left them, and `npm test` is byte-identical.

### The assets (operator-provided)
`art/gp-kart-<colourway>-00..15.png` — one Tripo chibi kart rendered from 16 yaw angles, hue-anchored per driver (`ember`, `rose`, `tide`, `goldie` for the four ghosts, `menace` for him); `art/gp-kart-contact.png` is the labelled ground truth. `art/gp-tree-v0/v120/v240.png` — one cartoon tree at three azimuths. `art/gp-crowd-front.png` / `gp-crowd-angle.png` — a bleacher of little ghost spectators waving flags. These are the only new art.

### Sprite karts
- **Frame convention (calibrated against the contact sheet).** Frame 00 is the dead rear (spoiler, twin exhausts), 04 the kart's left flank (nose to the camera's left), 08 the dead front, 12 the right flank (nose to the camera's right). The engine's heading relative to the camera is `yaw = kart.a − camA`, positive when the nose swings toward the camera's right (the camera's right vector is the view heading + 90°), so `frame = (16 − round(yaw / 22.5°)) mod 16`: the index increases as the nose swings toward the camera's left — a decreasing heading in this world's map-canvas coordinates (y down), a clockwise yaw seen from above with the usual y-up compass. Check 27 asserts the mapping (0° → 00, −90° → 04, 180° → 08, +90° → 12).
- **Anchoring.** Every frame is calibrated on decode (alpha bounding box). The rear frame is scaled to the Round 7 kart's width (136 kart units) and that one scale serves every yaw frame, so a side view is longer than a rear view, as a kart is; the box's bottom edge (the tyre contact line) sits 30 units below the kart's ground point. The driver's head is overlaid at the seat through a per-frame anchor table (seat x / y as fractions of the frame box, plus how much of the dome the tub hides in side and front views): the possessed ghost's dome in her colour with eyes (Ember's pointed hood, Rosé's bow), or the Menace's yellow dome with angry brows, his grin and the goggle band round the back. From behind only the back of the dome shows; the eyes slide toward the nose side as the kart turns. The driver keeps a small lean; the kart body has none.
- **Kept around the kart.** The contact shadow (longer under a side view), tyre smoke, exhaust puffs and the hot-exhaust flames when the rear shows, the shield bubble, the hop arc with the shadow staying on the road, drift sparks, the Menace cocking a pellet bomb over his head mid-throw.
- **Fallback.** `ready` flips only when all 80 kart frames decode; if any fails the Round 7 vector kart (`drawKart`) draws instead — flat, its heading shown by its shear, a spin slewing that shear back and forth. The tree and crowd sprites fall back to the vector props on their own flags.

### The spin fix (Marlando's playtest note: "they spin clockwise instead of spinning around on a flat surface")
The old renderer rotated the kart in the screen plane during a spin-out (`ctx.rotate` on the spin value) — a roll, not a spin. That rotation is gone from both paths; the only transform under a kart body is translate + scale (the fallback keeps a shear for its heading). A spin-out now yaws the kart FLAT on the road: `spinYaw` runs two full turns over the 0.85 s spin, easing out as the speed scrubs (`4π · (1 − (1 − u)²)`), and the renderer picks the yaw frame from heading + spinYaw, so the frames cycle continuously one way round and the kart comes out facing the way it was going (the heading itself is never touched, so it keeps sliding along its momentum). Ordinary driving likewise shows the heading-relative angle by frame choice; the Round 7 shear / lean on the kart body is gone with the vector kart.

### Collision care
- **Separation.** Every frame two karts touch (contact radius 24 each) they are pushed apart along the contact normal to the sum of their radii, mass-weighted (the Menace is 1.8 karts), so karts never overlap or stack.
- **Momentum exchange.** One impulse per contact from the closing speed along the normal: the pair is oriented so the rammer is the kart closing on the other; the rammer loses a quarter of the closing speed (half that for the Menace) and keeps most of its run; the rammed kart takes two thirds of the closing speed along the normal (half for the Menace) — the part along its heading changes its run, the rest is a sideways shove that decays over the next half second (`px, py`).
- **Shove vs spin.** The shoved kart gets a brief yaw wobble through the neighbouring frames (a damped 1.5-cycle swing of 0.22–0.55 rad over 0.5 s, visual only). Only the existing hard cases spin: the Menace running into the ghost at a closing speed over 70 (now a real event — the Round 8 pair ordering could never see him as the rammer), and bombs. A spun kart is immune to another spin for 2.5 s. Soft touches and glancing bumps are a shove and a wobble, never a spin, never a roll. Wall / verge handling, drift, boost and items are unchanged.

### Trees and crowd
Trackside trees are the sprite, the three azimuths spread across instances by the prop's variant (`v % 3`), trunk base on the ground point with the same shadow treatment and the same placement system. The crowd billboards line the start / finish straight at the five stand positions, pushed out to 150 units beyond the road edge and 196 units wide so they read as grandstands at race distance; the front sprite faces the track, the angled sprite stands where the road bends at the stand (curvature over 0.0009 within 60 units). Signs, tyre stacks and flags are unchanged.

### Battery
All 26 existing checks pass and `npm test` is byte-identical. Check 27 is a physics proof: (a) with the field frozen, the ghost's kart is placed at speed and a spin-out forced through `flipDebug('spin')`; the renderer logs, for every frame it draws her during the spin, the yaw frame it chose and the canvas transform at the `drawImage` call (`ctx.getTransform()`: rotation = `atan2(b, a)`, shear = `c / d`); `flipDebug('spinTrace')` must show at least 8 distinct frames in sequence stepping one way round, about two turns of yaw, the sprite path, zero rotation and zero shear on every frame, and the heading unchanged; (b) `flipDebug('overlap')` sets the ghost's kart 14 units behind and overlapping a coasting squad kart on the centre line (250 vs 120), the Menace and the other squad kart parked half a lap away; after a step the recorded contact must show the ghost as the rammer, separation to at least 48 units (and still ≥ 48 after 250 ms), the rammed kart shoved (a gain along the normal, its run up by at least 20, a wobble) and nobody spun. `getFlip().extra` also reports the ghost's current frame, spin state, sprite readiness and the last contact. The Grand Prix screenshot (check 18) shows the sprite kart from behind on the start straight with trees and a crowd stand in frame.

## Round 10 — GLOOM's Menace becomes the Tripo sprite character

Commissioned 2026-11-18: "Use Tripo to create the round menace asset in the Gloom game." A single-purpose round; everything else stands as Round 9 left it and `npm test` is byte-identical.

### The asset (operator-provided)
`art/gloom-menace-1.png`, `-2.png`, `-3.png` — transparent renders of an original 3D Round Menace (a Tripo model generated from the operator's text description, rendered locally). Frame 2 is the full-front hero (furious brows, fang grin, white gloves, red shoes); frames 1 and 3 are slight yaws either side. These three files are the only new art.

### The integration (GLOOM only)
- **Stride cycle.** The frames cycle 1-2-3-2 on the existing billboard. The cycle is driven by his stride phase, which only advances with the ground he covers (7 radians per tile), a quarter turn per frame — so the frame rate is tied to his movement speed (about 4.7 frames/s at his starting 1.05 tiles/s, rising with his speed gain and the maze's speed multiplier) and he holds the full-front hero frame while stunned, knocked back, frozen or held by a door.
- **Anchoring.** Each frame is calibrated once on decode (body circle from the yellow body's extent, shoe line from the bottom of the alpha). He is scaled by his body radius — the Round 5 projection and clamp are unchanged, so he stays in the Round 9 size family (r ≈ 19 px at ~8 tiles, ≈ 75 px at ~2 tiles, clamped to 28% of the view) — and placed so his shoes stand on the corridor floor at his depth; past the clamp the floor line keeps dropping while he stops growing, so his shoes are held just under the bottom edge rather than leaving the frame. The walk bob is a small hop of the whole figure on each stride; the floor shadow stays on the floor under his shoes and shrinks as he lifts.
- **Hit flash.** A pre-tinted copy of each frame (white composited inside the sprite's own alpha, built once on load) is drawn while a hit lands, plus the Round 9 bright rim around his body — the sprite is never redrawn in code. The distance dim is a composite pass over a scratch copy (a dark wash inside his alpha), with 1/2 and 1/4 mip levels so the far-corridor downscale stays clean.
- **Fallback.** `ready` flips only when all three frames decode; if any is missing or fails, the Round 9 code-drawn character (`drawMenaceFigure`, horizon-centred) draws instead — that path is intact.
- The maze game's Menace, the other three flips, the blaster viewmodel, the soundtrack and the effects are untouched.

### Battery
All 26 checks pass; `npm test` is byte-identical. Check 20's figure detection was written for the Round 9 vector character and is re-aimed at the sprite's real features with the same spirit: the body-yellow band is now a hue band (the render is a lit 3D body — dark gold in shadow, pale gold in highlight — so the old `#fbc531` brightness band collapses under the distance dim), the figure rect extends over his legs and shoes (to y + 1.95 r), and inside it the check requires body yellow ≥ 20% of π r² (unchanged), white glove / eye regions ≥ 2% of π r² and red shoe regions ≥ 3% of π r² (replacing the old "≥ 2 px of eye white and grin dark" — the corridor's own greys and reds fill under 1% and ~0.1% of a rect without him, so no corridor-only frame can pass). The renderer must also report that the sprite path drew him (not the fallback), and his shoe line must sit below the horizon and move down the screen between the two samples. The growth, clamp, central-area and render-sanity thresholds are unchanged.

## Round 9 — Polish: the Menace gets a brain, GLOOM gets its gun, its Menace and its sound

Marlando's Round 8 playtest: the Menace "seems rather dumb… several times he runs right into the ghosts", and GLOOM "is missing the soundtracks and sound effect to make it more DOOM-like". Round 9 is four items; everything else stands as Round 8 left it and `npm test` is byte-identical.

### The Menace's brain (maze)
Every decision still happens at a tile centre, but it is now an **arrival-time race** instead of a distance rule:
- **Threat field.** The maze is flooded from every hunting ghost (a bucket Dijkstra in quarter tiles): a ghost seeds its own tile and the tile it is moving into (by how far it has travelled), the tile behind it costs extra (an AI ghost never reverses; the possessed ghost can on a key press, so hers costs much less), its speed scales the result, ghosts still in the house or on the door are seeded at the door with their remaining wait. The possessed ghost is counted half a tile closer — the player reads him.
- **Safe-region routing.** For each candidate first step — including doubling back — he floods the tiles he reaches ahead of every ghost by a one-tile margin (the catch radius is 0.75), having committed to that step. A ghost whose way to that step runs through his own tile is a *follower* and races with only a catch-radius margin: at matching speed a tail never closes unless something ahead stops him. Anything that can cut across or meet him head-on must lose the race by the full margin. Tiles he reaches while still flashing with re-entry immunity are safe whatever the ghosts do.
- **Scoring.** Safe area (saturating at 40 tiles, weighted up under pressure), the best breathing room inside it, escape junctions, the nearest pellet and the pellet density (weighted down under pressure), the fruit when safe, and the nearest **power pellet** — a magnet whose pull rises with pressure (pressure = how soon the earliest ghost can be on his tile, over 8 tiles). A reversal costs a little when he is safe so he does not dither, and almost nothing when he is pressed. A step a ghost reaches before he can clear it is only taken when every step is.
- **Balance.** No speed or timer changed. An AI-vs-AI soak (all four ghosts hunting on their own AI, every flip survived so all four hunters stay on the board) runs 100–120 s of maze time for three catches and reaches all four power pellets in every run; the first two corners fall inside ~17 s. His taunts are unchanged.

### GLOOM's gun (operator-provided sprite)
`art/gloom-blaster.png` (a Tripo render of a chunky sci-fi blaster, side view, muzzle lens at the left) replaces the vector viewmodel. It hangs bottom-centre-right as a right-handed FPS weapon: pinned by its muzzle lens, tilted so the barrel points up at the crosshair, the stock running off the bottom-right edge, ~74% of the view width before the tilt. Walk bob, recoil (a kick down and a tilt) and the muzzle flash (an eight-point star over the lens, plus the corridor light) are the Round 8 behaviours; the lens glows with the next pellet. The render is lifted with a touch of contrast / saturation and a soft drop shadow in code (the sprite itself has a clean alpha edge, so no fringe clean-up was needed). If the file is missing the Round 8 vector gun draws instead.

### GLOOM's Menace (original character)
He is now a limbed mascot drawn in code: the round yellow body (which is also his head), thin dark arms and legs, oversized **white** four-finger gloves, big red shoes, big eyes under angry brows and a wide toothy grin with upper and lower teeth. A walk cycle runs on the existing billboard sprite — legs pump toward the camera, the near foot swinging down and out while the far one lifts, arms swing opposite the legs, the body bobs on each stride — with the Round 5 clamped scaling as he closes, a floor shadow under his shoes, and the hit flash kept.

### GLOOM sound (all WebAudio-synthesised, original)
- **Soundtrack.** The `gloom` music state is a proper 8-bar loop at 128 BPM in E minor with the Phrygian F: a palm-muted **chug** riff (two detuned sawtooths and a sub-square through a lowpass that snaps shut over each note, a pick click on the attack; a gallop with a tritone stab and a bar-8 turnaround, two octaves down), a driving kick / snare-with-body / closed-and-open hat pattern with a bar-8 snare fill, a sparse long-note square lead and a dark fifth pad. It loops seamlessly on the lookahead sequencer and sits under the effects.
- **Effects.** Blaster fire (noise crack, sawtooth sweep through a closing filter, square zap tail, sine sub-thump); hit / stun confirmation on the Menace (a metallic clang over a thud); his pained growl when hit and a low triumphant growl when he grabs her (a rasping sawtooth with vibrato through a vowel-like bandpass sweep); door slide (a pneumatic band-passed whoosh, up for open and down for close, ending in a clunk); ammo pickup (click, chirp, two-note chime); teleporter arrival shimmer (a rising sine cluster over an upward noise sweep); the player-caught stinger; and a **low ambient hum** (a detuned sub-saw pair through a breathing lowpass with a whisper of air) that runs for the whole flip, rises as he closes, and stops when the flip ends. Everything obeys the global M mute — the hum stops on mute and returns on unmute while a flip still wants it — and the music-state names are unchanged.

### Battery
All 25 existing checks pass; `npm test` is byte-identical. The launcher adds `--allow-file-access-from-files` because the battery opens `index.html` over `file://` and the blaster sprite would otherwise taint the canvas for the pixel checks. `test/acceptance.js` gains check 26 (Menace brain, behaviour not state): (a) eight collision-course trials — the Menace running along an open corridor with a hunting ghost placed ahead on the same line heading at him, every other ghost parked — where he must change course or end further away, with no catch, in at least 6; (b) an AI-vs-AI soak of at most 100 s of maze time in which he must eat at least 2 distinct power pellets before his second catch.

## Round 8 — Engine-first rebuilds of all four flips (clean-room)

Marlando's own playtest of Round 7: "every flip game seems off… reverse engineer the original games and then re-brand them using the Round Menace characters." Round 8 rebuilds the inside of every flip as a working re-implementation of its original's **engine** — physics, camera, controls, level grammar, HUD grammar — written from scratch in original code, then skinned with the Round 7 art and the Round Menace cast. Behaviour was studied, assets never: no copied code, sprites, tiles, textures, music, names, logos or level layouts; every level is an original layout on the engine's grammar. The flip contract is unchanged (corner pellet entry, frozen maze time, +200 unbenched on survival, "ONE DOWN." on a catch, the same music states) and `npm test` is byte-identical.

### Block Kingdom — tile platformer engine
- **Level and physics.** An original ~2,400 px tile layout on a 24 px grid (solid, empty, star `?` blocks, breakable `B` bricks, pipes, pits, a sloped section). Run with acceleration and skid, a variable-height jump (release cuts it short), gravity with a short coyote window and jump buffering; the body moves axis-separated against the grid, so landings, head bumps and wall hits are real collisions.
- **Blocks and minions.** Bumping a block from below plays the bump animation; a star block releases its pickup, a strong hit shatters a brick. Sprout minions patrol ledges and can be **stomped** (a bounce and a flattened disc) — a side-on touch costs the run's one safety pip, a second costs the run.
- **The Menace and the goal.** He runs the same level on the same platformer physics (runs, jumps gaps, hops ledges) and his contact is the catch; the banner pole at the end is the goal with a flag-slide flourish. Smooth side-scroll camera with lookahead toward movement; Round 7 parallax kept.

### Green Valley — momentum runner engine
- **Momentum physics.** The ground is a cosine-interpolated heightfield with real grades: uphill bleeds speed, downhill builds it, inertia carries into the air; speed builds over distance toward a top speed. Two half-pipe dips and one full **loop** traversed on angular momentum — too slow and she falls out of it. Springs launch, spikes catch.
- **Rings as health.** Rings along the route; the Menace rolls in ball form on the same momentum rules, and his contact **scatters** her rings in an arc (re-collectable for a moment); a touch with none left is the catch. Camera leads in proportion to speed; the Maze Gate is the finish. HUD: rings, time, surge chain.

### GLOOM — raycast maze-shooter engine
- **A true raycaster.** Per-column DDA over an original 14×14 grid maze; procedural 64×64 wall textures (four tech-base panel variants in the Round 7 gritty family, a chevron door), per-pixel floor and ceiling casting, distance lighting and a muzzle light that lights the corridor on a shot. Rendered at half resolution into a buffer and scaled up for the chunky look.
- **Movement and doors.** Free movement — forward / back (Up/Down, W/S), turn (Left/Right), strafe (A/D, swipe), with circle-vs-grid sliding collision and head bob; sliding doors open as she approaches and close behind. A pellet-blaster viewmodel with bob and recoil; limited pellets as ammo (pickups in the maze).
- **The Menace.** A sprite enemy pathing toward her by breadth-first search, occluded per column by the depth buffer, scaled with the Round 5 clamp as he closes, driven back by hits. The exit teleporter across the maze is survival; his touch is the catch. Status-bar grammar kept: NERVE, ghost portrait, PELLETS.

### Phantom Grand Prix — pseudo-3D kart engine
- **Mode-7 ground.** A top-down track map (closed Catmull-Rom circuit with real corners — original shape — kerbs, boost pads, grid, start line, verge, infield pond) is rasterised once and re-sampled per screen pixel under perspective from a chase camera whose yaw eases toward the kart's travel direction; sprites (karts, item cubes, coins, bombs, trees, signs, stands, flags, the arch) project through the same camera and sort by depth.
- **Kart handling.** Throttle, braking, grip steering that scales with speed, and **hop-to-drift**: hop with the wheel turned, hold the slide (the wheel tightens or loosens it), charge through two spark stages, release to fire a boost. Off the asphalt the kart slows unless it is boosting; a fence holds it on the circuit.
- **Items and the field.** Item cubes grant a speed surge, a pellet bomb to drop behind, or a shield (Down/S or d-pad down uses the held item, otherwise brakes); pellet coins on the racing line add score and a little top speed, five in a row give a rush. Four karts — the ghost, the Menace and two squad ghosts in original kart dress — with spline-following AI, corner braking, drifting and rubber-banding; live 1st–4th positions; one lap. Finishing ahead of the Menace is survival, him taking the flag first is the catch; his rams and bombs spin her out. HUD grammar kept: position plate, speed, lap/time, PELLETS and RAMS counters, item slot, a track map and the rear-view mirror.

### Battery
All 21 existing checks pass; `npm test` is byte-identical. `test/acceptance.js` gains four engine checks that prove behaviour: (22) a stomp flattens a minion and a bumped block releases its pickup; (23) a Menace hit scatters rings and a downhill measurably builds speed over the flat; (24) turning in place changes the rendered view and a door opens on approach; (25) a held drift releases a measurable speed boost.

## Round 7 — Visual richness pass on all four flips

The Round 3 panel passed every flip at a median 19/25 with the same ceiling on each: AAA feel 3, with all twelve judges naming flat vector shading, sparse worlds and narrow palettes. Round 7 is a rendering/art pass only — gameplay, routing, music and the maze are untouched, `test/acceptance.js` is untouched, and the art stays original (genre grammar and palette family move toward each reference; no traced shapes, sprites, layouts, logos or names). Everything is still procedural canvas inside the one `index.html`.

### Phantom Grand Prix (the widest gap — the reference is a modern 3D kart racer)
- **Real karts.** Both racers are drawn karts seen from behind and a little above: a shaded cockpit tub narrowing to the nose, side pods and an engine cowl with vents and a chrome cap, a highlight line along every top edge, a rear bumper with the numbered plate and tail lights that come on when the driver lifts off, a low rear wing on struts, and twin chrome exhausts with dark openings (flames under boost). Four tyres: rubber bodies with a lit crown, tread stripes that scroll with distance travelled, and a spoked hub on the sidewall that turns with the road — the front pair steers with the input and the bend (steering right reveals the left sidewalls). A bucket seat with a headrest sits behind the driver; the ghost's sheet (helmet band across the hood) or the Menace's head (goggles pushed up) sits in it, leaning into the steer, with arms reaching forward to a steering wheel that turns in the driver's hands. A soft radial contact shadow sits under each kart; drift smoke, sparks and exhaust puffs stay from Round 6.
- **Track richness.** Asphalt carries hashed grain (speckles that ride with the road), resurfaced patches, a rubbered-in racing line through every bend, dark edge seams; the painted kerbs are shaded with a lit inner top face and a dark outer drop, over a dirt verge and a kerb shadow on the grass; mown stripes on the grass. Roadside: armco barriers down every straight, two-tier grandstands with a sponsor band, four bobbing crowd rows, roof shadow and support columns, lamp posts on the pit and finish straights, low banner boards (`PELLET CO.`, `SQUAD TYRES`, `GHOST FUEL`, `LANTERN OIL`, `MAZE RADIO`, `EMBER BRAKES`, `TIDE WAX`), painted tyre stacks on the outside of the bends, cones on the inside, `200` / `100` braking boards before each bend, flags with a shaded fold, three kinds of tree (round broadleaf, pine, palm) at varied distances, and an atmospheric haze band where the road meets the hills.
- **Pace that varies.** The speed is no longer a constant: a lift-off through every bend (deeper the tighter it is), a throttle breathing on the straights, a long acceleration curve off the line (quick at first, tailing off toward top speed), boost / rush / grass / spin on top — so consecutive frames never read the same. Subtle camera shake at top speed (firmer under boost), and striped streak posts on every second segment by the verge for pace.

### GLOOM (palette and texture — the reference is a gritty brown-grey tech-base)
- **Palette.** The corridor moves from slate-blue into the gritty family: warm-black base, olive-brown-grey walls lit by a three-stop gradient, grimy deck plates lit down the centre and dark in the gutters, a sodium-amber work light pooling at the vanishing point, warm tube lights in housings on the ceiling and amber wall lights. The blaster and the status bar keep their grammar (NERVE %, PELLETS, portrait) in gunmetal-brown.
- **Texture.** Every wall panel carries hashed detail that rides with the corridor: rivets along the trim and the hazard rail, a run of pipe along the upper trim (rust-coloured on some panels), rust bleeding down from the trim, grime streaks, scorch marks, a lit edge on the panel face, flecks of rust, soot, chipped paint and olive mould, and a panel feature by hash — a slatted vent, a hazard plate with diagonal stripes, or a wall console with a scope trace and blinking green / amber / red status lights. The floor has plate seams between the lanes, oil stains, scuffs, drain grates; the ceiling has twin conduits with brackets, vent grilles and the light housings.
- **Corridor life.** Furniture at fixed world positions scrolls past between the walls and the lanes: supply crates (three shaded faces, stencil band), rust-red and olive barrels, loops of cable sagging from the conduits with a tag, and floor-standing machinery with a scope and a warning lamp. Work lights flicker, drop out for a moment now and then, and some tubes are dead. Muzzle light falls off with distance (bright on the nearest segments, gone by mid-corridor). A landed shot is a brief warm flash over the view, a ring off the Menace's body, and a small shake. The Menace figure and the Round 5 clamp are unchanged.

### Green Valley (density and texture — the reference is a lush, saturated hillside)
- **Ground.** The two-tone checker is now four tones hashed per tile with a lit facet on each diamond, pebbles, cracks and roots in a taller topsoil band; the grass stratum is thicker (a 15 px saturated band under a 9 px cap) with a striped mown edge along its top and a lighter lip.
- **Backdrop.** Two mountain ranges on the horizon (a hazy far range and a nearer blue-green range, both snow-capped), two animated waterfalls off the near range with mist at the foot, and a lake with a sunlit sheen, four rows of moving wave stripes and the glints. Saturation and contrast pushed throughout (sky, hills, grass).
- **Density.** Trees in three kinds (tall palm, squat wide palm, round broadleaf) at three depths, a new near-mid hedgerow band at 0.7 parallax with bushes and the nearest palms, flower clusters (three blooms each), denser tufts, and soft radial shadows under both characters, every bush, post, sunflower and obstacle.

### Block Kingdom (palette family and density — the reference's backdrop hills are pale blue-lavender and spotted)
- **Backdrop.** The distant spotted hills are repainted into the pale blue-lavender spotted family (same original shapes, true parallax kept); the sky is fuller with more clouds at all three depths, each cloud now with a shaded underside.
- **Density and texture.** Mid-ground block structures (stone-blue stacks and arches at varied heights, 0.5 parallax), teal pipes with a lip (0.62), picket fences along the hill line (0.75), mid bushes with a highlight; the dirt stratum gains hashed pebbles, cracks, dark streaks and lit bands per tile.
- **Shadows, unmissable.** A radial drop shadow under the ghost, the Menace, every sprout, chimney and structure; floating blocks cast their shadow down onto the ground beneath them as well as a contact shade under the block. The banner pole stays in-world and the flag gag stays.

### Battery
All 21 checks pass unchanged; `test/acceptance.js` and the `npm test` command are byte-identical to Round 6. Distinct-colour counts from check 20/21 are quoted per flip in the round's RESULT.md.

## The Soundtrack (Rounds 2–4)

All music is composed in code — the same WebAudio synth that makes the effects, driven by a small lookahead scheduler (sixteenth-note steps, 160 ms of lookahead). Six states:

- **Title:** sparse and moody — a low pulse on A1 and occasional bell-like notes from A minor pentatonic.
- **Maze:** a looping night-shift groove at **104 BPM** in A minor (Am · F · Dm · Em).
- **Valley:** **140 BPM** brighter voicing (C · G · Am · F) with driving sixteenth-note arpeggio and hi-hat ticks.
- **Kingdom:** **152 BPM** in C major (C · F · G · C) bouncy square-wave lead over skipping bass.
- **GLOOM:** **126 BPM** in E minor (Em · Em · F · Em) grinding Phrygian sawtooth industrial groove.
- **Grand Prix:** **168 BPM** upbeat driving racing fanfare with rapid skipping bass and bright lead.

The state (`off` / `title` / `maze` / `valley` / `kingdom` / `gloom` / `grandprix`) is exposed through `getMusicState()`.

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

The project includes headless Playwright test coverage: the 10 Round 1 checks, the 3 Round 2 checks, the 2 Round 3 checks, the 4 Round 4 checks, the 2 Round 5 pixel-level render checks, the 4 Round 8 engine checks, the Round 9 Menace-brain check, and the Round 11 Grand Prix physics proof (27 total checks).

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
15. Kingdom caught path: a fresh kingdom flip, forced catch, benches that ghost and returns to playing.
16. GLOOM routing and survival: bottom-left pellet routes to GLOOM within a second; music reads `gloom`; forced survival returns to playing, unbenched, with +200 bonus.
17. GLOOM caught path: forced catch in fresh GLOOM flip benches that ghost and returns to playing.
18. Phantom Grand Prix routing and survival: bottom-right pellet routes to Phantom Grand Prix; music reads `grandprix`; forced survival returns unbenched with +200 bonus.
19. Phantom Grand Prix caught path: forced catch in fresh Grand Prix flip benches that ghost and returns to playing; zero console errors across all 19 state checks.
20. GLOOM render sanity (the battery gets eyes): enters GLOOM through the bottom-left pellet, strafes and fires, and at ~4s of live corridor play reads the canvas pixels of the playfield (the view above GLOOM's status bar) in-page: at least 40 distinct colours (quantised to 32 levels per channel), no single colour over 55% of the region, the Menace's body yellow measurably present in the central corridor area (≥ 80 px) but never over 45% of it, the renderer's reported Menace rect inside the central area and, since Round 10, drawn by the Tripo sprite path with body yellow (≥ 20% of π r²), white glove / eye regions (≥ 2%) and red shoe regions (≥ 3%) all present inside it (a figure, not a disc). A second sample ~5s later must pass the same thresholds with a strictly larger figure whose shoe line has moved down the floor, and that frame is kept as `screenshots/gloom.png`. On the Round 4 build this check fails: the Menace was a frame-filling disc (yellow far over 45% of the central area) and the renderer reported no figure.
21. Render sanity for the other three flips: the same distinct-colour and dominance thresholds applied to a ~4s mid-play frame of Green Valley, Block Kingdom and Phantom Grand Prix; zero console errors across all 21 checks.
22. Block Kingdom engine: the ghost dropped onto a patrolling minion registers a stomp that flattens it without costing her safety; standing under a star block and jumping bumps it, releases its pickup and leaves the block spent.
23. Green Valley engine: the Menace rolled into her from behind scatters her rings (she holds fewer than she was handed, loose rings in play); from the same start speed, 0.7s on the flat vs 0.7s down the long hill shows the downhill measurably faster.
24. GLOOM engine: holding the turn key with the Menace frozen turns the view (radians turned reported) and changes the centre of the rendered frame; walking up to the first door on its open axis slides it open.
25. Phantom Grand Prix engine: a hop with the wheel turned starts a drift, holding it charges a stage, and releasing it fires a boost that lifts the speed measurably above both the held speed and the plain top speed; zero console errors across all 25 checks.
26. Menace brain (behaviour, not state): (a) eight collision-course trials — the Menace running along an open corridor with a hunting ghost placed ahead of him on the same line, heading at him, every other ghost parked in the house — in which he must leave the line, double back, or end further away than he started, with no catch, in at least 6 of 8; (b) an AI-vs-AI soak (the possessed ghost on her own AI too, every flip survived through the hook) of at most 100 s of maze time in which he must eat at least 2 distinct power pellets before his second catch; zero console errors across all 26 checks.
27. Phantom Grand Prix physics proof: (a) a forced spin-out on the ghost's kart must be drawn as at least 8 distinct yaw frames in sequence stepping one way round over about two turns, by the sprite path, with the canvas transform at every kart draw carrying zero in-plane rotation and zero shear, and the heading unchanged; (b) two karts set overlapping at speed must separate to at least the sum of their contact radii within the step and stay apart, with the rammed kart shoved (gain along the normal, run up, yaw wobble) and neither kart spun; the frame convention (0° → 00, −90° → 04, 180° → 08, +90° → 12) is asserted; zero console errors across all 27 checks.

Screenshots of title, gameplay, the flip transition, Green Valley, Block Kingdom (banner and mid-level), GLOOM mid-corridor, Phantom Grand Prix mid-race, maze clear, and game over screens are saved into `screenshots/`. Since Round 6 the three fixed flips' frames (`valley.png`, `kingdom.png`, `grandprix.png`) are peak-action captures with both the ghost and the Menace in shot.

---

## Technical Specifications & IP Guardrails

- **Single Self-Contained Web Build:** Implemented in `index.html` with inline CSS, HTML5 Canvas 2D vector rendering, and procedural WebAudio synth. No external frameworks, build steps, or runtime dependencies.
- **Original IP:** 100% original code, original 19×21 maze layout with wrap tunnels, original character designs (vector sheet-ghosts), and original procedural WebAudio synthesizers.
