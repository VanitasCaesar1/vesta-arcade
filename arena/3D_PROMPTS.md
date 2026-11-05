# 3D Arena prompts

Every model gets exactly this file, once. One attempt per scene, no human edits.
Players open two scenes for the same prompt, blind, and pick the better one.

## Rules for every scene

- One file: `index.html`, with inline CSS and JavaScript in a `<script type="module">`.
- Use three.js from the arcade, nothing else external (no CDNs, no fonts, no textures, no models from the network):
  - `import * as THREE from "/lib/three/three.module.js";`
  - `import { OrbitControls } from "/lib/three/OrbitControls.js";` (optional)
- Build everything from code: geometry, procedural materials, canvas-generated textures, lights.
- Fill the window, handle resize and device pixel ratio (cap it at 2), and run smoothly on a laptop and a phone. Pause rendering when the tab is hidden.
- It must be interactive: at least orbit/drag to look around (mouse and touch), plus something to do or discover.
- Show a short hint on screen for the first few seconds (e.g. "Drag to look around").
- Optionally call `window.vesta?.milestone("<short-name>")` or `window.vesta?.achievement("<id>", "<name>")` when the player finds or does something.
- No console errors. Under 150 KB.

## Prompt 1: floating-island

Make a 3D scene of a floating island with a waterfall at sunset.

## Prompt 2: tiny-solar-system

Make a 3D scene of a tiny solar system you can explore.

## Prompt 3: debug-desk

Make a 3D scene of a programmer's desk late at night, with a rubber duck that helps you debug.
