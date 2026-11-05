# AI Arena prompts

Every model gets exactly this file, once. One attempt per game, no human edits.
The arena shows players two versions of the same prompt, blind, and asks which is more fun.

## Rules for every game

- One file: `index.html`. Inline all CSS and JavaScript. No external scripts, fonts, images, CDNs or network requests. Draw with canvas, SVG, CSS or emoji.
- Under 150 KB.
- Must work on desktop (mouse/keyboard) and on a phone (touch), in portrait and landscape. Fit the window; no page scrolling while playing.
- Start screen with the title, one line of how to play, and a Play button. A run lasts 30 seconds to 3 minutes.
- Game over screen shows the score and a "Play again" button that restarts immediately.
- At game over, call `window.vesta?.submitScore(score, { label: "<what the score counts>" })` once. Higher score is better. It returns a Promise; wait for it before showing "Play again" focus, but don't break if `window.vesta` is missing.
- Optionally call `window.vesta?.milestone("<short-name>")` at meaningful moments (e.g. "wave-3").
- Sound is optional; if used, use the Web Audio API, start only after the first user input, and include a mute toggle.
- No console errors. Guard against resize, tab switching (pause when hidden) and very fast or very slow frame rates (use delta time).

## Prompt 1: packet-runner

Make a one-button endless runner where you play a data packet racing through the internet.

## Prompt 2: bot-defense

Make an arcade game where you defend a server from waves of bots.

## Prompt 3: keyboard-cat

Make a game about being a cat who keeps walking across a programmer's keyboard.
