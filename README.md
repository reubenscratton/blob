# Blob — a three.js character prototype

A 3D interpretation of **Blob**, the player character from **Starquake** (ZX Spectrum, 1986). This is the latest user-approved walking / nervous-eyes demo, reorganised for ongoing development with Codex and Git.

## Run on your Mac

Install [Node.js](https://nodejs.org/) if necessary (v20+ recommended), then open Terminal in the project directory:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173/`). Drag to orbit the camera; scroll to zoom. Controls are on the right. An alternative requiring no Node tooling is `python3 -m http.server 8000`, then open `http://localhost:8000/`, although this version loads three.js from a CDN and thus requires internet.

## Experimental playground

Open `http://localhost:5173/playground.html` after starting Vite, or follow **Open keyboard playground** in the character viewer. Use **Left/Right arrows** or **A/D** to move and **Space** to jump. A jump lifts his feet twice his standing height above the floor over a one-second arc. Horizontal control stays active in the air, with his walk paused and feet tipped down slightly. Tap again after landing for another jump; holding Space does not repeat. Reversing direction makes Blob pivot through 180° in 0.18 seconds before walking again. Releasing the keys settles him into a grounded stand; eyes stay active. Reset playground restores the starting position and camera. Losing focus clears held keys.

The flat test lane has solid end limits and a following side-on camera. The camera is pulled back for a wider view; Blob walks at 16 world units per second, with stride timing matched to ground speed. The floor blends four generated red-and-black cooled-lava tiles with matching bump relief. The exposed sides use three upright variants with predominantly vertical channels and an uneven pointed rock skirt, inspired by the original Starquake formations. Tile selection, mirroring and offsets break up repetition; the top also rotates tiles. Its walkable top stays flat. See `assets/textures/cooled-lava-prompt.md` and `assets/textures/cooled-lava-variants-prompts.md` for the generation prompts. Background structures are scenery. Gameplay uses X horizontally and Y vertically, with Z depth locked; a parent transform adapts the approved Z-up character without changing the GLB. Platform collisions are future work; jumps currently land on the flat test lane. The original viewer and all its animation controls remain at `/`.

- `src/PlayerMotion.js` — movement limits and timed direction changes
- `src/PlaygroundCharacter.js` — approved gait/eyes adapted to a movable character root
- `src/playground.js` — test level, keyboard input, lighting and follow camera
- `src/LavaFloor.js` — textured cooled-lava platform and decorative rock skirt
- `src/LavaMaterial.js` — deterministic tile variation and border blending for color and bump relief

## Code layout

- `index.html` — user interface and sliders (all user-approved defaults are set here)
- `src/main.js` — scene, rendering, UI and frame loop
- `src/BlobCharacter.js` — model loading setup, hip/antenna attachments, continuous leg geometry metadata
- `src/WalkAnimator.js` — planted-foot gait stages and foot trajectory
- `src/EyeAnimator.js` — eye patch deformation, occasional blink, nervous gaze and return to centre
- `assets/blob.glb` — approved white-gloss model (v0.6; continuous legs)
- `tools/build_blob.py` — optional Python generator for model geometry
- `reference/original-sprite.png` — source sprite supplied by the user
- `reference/approved-defaults.png` — screenshot of approved animation settings
- `reference/approved-standalone.html` — archived pre-refactor viewer as a regression reference (it expects `blob_v06.glb` in its own directory; for standalone use copy `assets/blob.glb` alongside it with that name)
- `AGENTS.md` — long-lived Codex instructions, like `CLAUDE.md`
- `CODEX_START_PROMPT.md` — ready-to-paste initial task for Codex

## Test and Git

```bash
npm run check  # JavaScript syntax checks
npm test       # baseline guards plus gait/eye parity against the approved archive
```

A baseline Git commit is included. Before large experiments, create a feature branch or commit the current working state. Keep the visual behaviour of the approved reference intact unless the task requires changing it.

## Visual regression checklist

- Look at Blob from front, side and behind: **both feet remain visible**.
- Maximum stride: feet remain attached to continuous legs, with no stretching/shearing or gaps.
- Heel touches down before sole; toe stays planted as heel rises; no bunny-hop.
- Rounded, tilted mask remains black, large white eyes and black pupils are correctly positioned.
- Nervous pupils dart quickly and recentre, with occasional blinks; antennae gently flop.

## Notes

Vite resolves three.js and its loaders from the pinned npm dependency (0.167.1, matching the approved demo). When serving without Vite, the `importmap` in `index.html` loads that same version from jsDelivr. Model coordinates use +Z up and −Y forward, unlike many conventional Y-up three.js projects. This is intentional.
