# Blob — a three.js character prototype

A 3D interpretation of **Blob**, the player character from **Starquake** (ZX Spectrum, 1986). This is the latest user-approved walking / nervous-eyes demo, reorganised for ongoing development with Codex and Git.

## Run on your Mac

Install [Node.js](https://nodejs.org/) if necessary (v20+ recommended), then open Terminal in the project directory:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173/`). Drag to orbit the camera; scroll to zoom. Controls are on the right. An alternative requiring no Node tooling is `python3 -m http.server 8000`, then open `http://localhost:8000/`, although this version loads three.js from a CDN and thus requires internet.

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
