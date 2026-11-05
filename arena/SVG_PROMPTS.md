# SVG Arena prompts

Every model gets exactly this file, once. One attempt per drawing, no human edits.
Players see two drawings of the same prompt, blind, and pick the better one.

## Rules for every drawing

- One standalone SVG file. Start with `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">`.
- No `<script>`, no event handlers, no external references (no `href`/`xlink:href` to URLs, no `<image>`, no `@import`, no web fonts). Everything inline.
- Under 100 KB.
- Animation is allowed with SMIL (`<animate>`, `<animateTransform>`) or CSS inside `<style>`, as long as it loops or settles and still looks good as a still frame.
- No text in the image unless the prompt asks for it.

## Prompt 1: pelican-bicycle

Generate an SVG of a pelican riding a bicycle.

## Prompt 2: robot-breakfast

Generate an SVG of a robot cooking breakfast in a tiny kitchen.

## Prompt 3: octopus-dj

Generate an SVG of an octopus DJing at a party.

## Prompt 4: isometric-city

Generate an SVG of an isometric city block at night.
