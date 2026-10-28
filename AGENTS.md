# Codex instructions — Starquake Blob

## Mission
Develop an animated 3D incarnation of Blob, the playable character from *Starquake* (ZX Spectrum, 1986), as a reusable three.js character for a future web game. Preserve the current approved look and walk rather than redesigning it.

## Current baseline
- `assets/blob.glb` is the **approved v0.6 continuous-leg model**, and `reference/approved-standalone.html` is an archival copy of the **last user-approved working demo** (nervous eye glances + approved slider defaults). Do not overwrite these casually.
- `src/main.js`, `src/BlobCharacter.js`, `src/WalkAnimator.js`, `src/EyeAnimator.js` modularise that demo. The goal is functional parity first. Compare against `reference/approved-standalone.html` after any refactor.
- +Z is up, the character faces −Y, and the face is pitched up 30 degrees *as a whole*. Pupils are centred in neutral pose; gaze offsets are relative to the pitched eye frame.
- The leg/foot meshes MUST remain continuous visually: avoid splitting them in a way that exposes a seam. The previous successful solution smoothly blended rotations over a narrow ankle region. Legs must render from all camera angles (`frustumCulled=false` on dynamically deformed leg meshes).
- The character has a white glossy (not fully metallic) sphere/body/feet/antennae, very black matte mask and pupils, matte-white eye patches, large flat feet, short rounded moth-like club antennae whose roots do not separate from the sphere, and a smooth round-cornered mask, NOT the rejected rectangular-mask variant.

## Animation personality and constraints
- Blob is nervous and timid, not confident. Eyes move in quick saccades (~0.12 s), briefly focus on random targets, return to neutral, and occasionally blink. Small body yaw follows attention.
- The walk is a long, purposeful hip-driven stride, not a paddling motion or bunny-hop. Heel-strike → flat planted foot → heel lifts during toe-off → swing. Minimal body bounce. Preserve step direction (forward = −Y).
- User-approved defaults: speed 2.00x, step length 2.50, lift 0.22, stance 62%, heel 23°, toe-off 28°, hip accent 0.10, bounce 0.010, antenna flop 12°, eye curiosity 100%, body glance 12°.
- Retain the UI controls, their ranges, and approved default values unless explicitly asked to change them.

## Working conventions
- Make minimal, well-isolated changes. Avoid regressions in gait, model visibility, facial pitch, and eye behavior.
- For animation changes, inspect the relevant modules and compare behavior with archival standalone before rewriting kinematics.
- Run `npm test` and `npm run check` when editing JS or assets; if dependencies are missing, report it explicitly.
- For visual changes, actually run the viewer and check front, side, rear, and oblique angles, maximum stride, toe-off, and blink/glance. Don't claim a visual test unless performed.
- Prefer small commits with meaningful messages. Don't rewrite Git history or commit generated temporary files. Seek user's consent before destructive changes.
- No new framework or large dependency without a reason. Current app is a lightweight three.js ES-module site served with Vite.
- `tools/build_blob.py` can regenerate the GLB; it requires Python numpy, scipy, scikit-image and trimesh. Rebuilding may change the mesh: do so only for deliberate geometry changes and validate the result.

## Suggested work style
When asked for a change: inspect the narrowest set of files, state the change you intend, implement it, run relevant checks, visually verify when possible, and report what changed and what remains unverified. Keep `README.md` updated for user-visible workflows.
