# First prompt to paste into Codex

Please take over this repository as the ongoing development workspace for our three.js character Blob (from Starquake, ZX Spectrum, 1986).

1. Read `AGENTS.md` and `README.md` and inspect the working implementation, particularly the modular code and `reference/approved-standalone.html` (the known-good pre-refactor prototype).
2. Start the dev server, open the demo in a browser if browser automation is available, and check that the new module structure retains the approved look, walking gait, nervous gaze and all 11 slider defaults. Examine the character from several camera angles and during maximum heel-to-toe motion.
3. Fix **only parity bugs** introduced by extracting the modules. Do not redesign the model, default motion, materials or UI. Run `npm run check` and `npm test` and report any visual checks you couldn't perform.
4. If changes were needed and tests pass, create a separate Git commit with a descriptive message. Do not rewrite the baseline commit.
5. Summarise the structure and propose the next small improvement; do not implement unrelated features yet.

I am new to Blender but comfortable with software development and Git. Explain any new Blender-specific workflow plainly. Our main runtime target is three.js in a browser, not a Blender animation export.
