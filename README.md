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

The project includes headless Playwright test coverage: the 10 Round 1 checks, the 3 Round 2 checks, the 2 Round 3 checks, the 4 Round 4 checks, and the 2 Round 5 pixel-level render checks (21 total checks).

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
20. GLOOM render sanity (the battery gets eyes): enters GLOOM through the bottom-left pellet, strafes and fires, and at ~4s of live corridor play reads the canvas pixels of the playfield (the view above GLOOM's status bar) in-page: at least 40 distinct colours (quantised to 32 levels per channel), no single colour over 55% of the region, the Menace's body yellow measurably present in the central corridor area (≥ 80 px) but never over 45% of it, the renderer's reported Menace rect inside the central area with body yellow, eye white and grin dark all present inside it (a figure, not a disc). A second sample ~5s later must pass the same thresholds with a strictly larger figure, and that frame is kept as `screenshots/gloom.png`. On the Round 4 build this check fails: the Menace was a frame-filling disc (yellow far over 45% of the central area) and the renderer reported no figure.
21. Render sanity for the other three flips: the same distinct-colour and dominance thresholds applied to a ~4s mid-play frame of Green Valley, Block Kingdom and Phantom Grand Prix; zero console errors across all 21 checks.

Screenshots of title, gameplay, the flip transition, Green Valley, Block Kingdom (banner and mid-level), GLOOM mid-corridor, Phantom Grand Prix mid-race, maze clear, and game over screens are saved into `screenshots/`. Since Round 6 the three fixed flips' frames (`valley.png`, `kingdom.png`, `grandprix.png`) are peak-action captures with both the ghost and the Menace in shot.

---

## Technical Specifications & IP Guardrails

- **Single Self-Contained Web Build:** Implemented in `index.html` with inline CSS, HTML5 Canvas 2D vector rendering, and procedural WebAudio synth. No external frameworks, build steps, or runtime dependencies.
- **Original IP:** 100% original code, original 19×21 maze layout with wrap tunnels, original character designs (vector sheet-ghosts), and original procedural WebAudio synthesizers.
