# The 60-second video

One continuous story: prompt → live link → a phone → a crash → the agent fixes it. Screen-record at 1080p, then speed up the waiting parts.

| Time | Screen | Caption / voice |
|---|---|---|
| 0–5s | Claude Code: "Make a browser game about surviving the HN hug of death. Then publish it to Vesta." | "One prompt." |
| 5–15s | Agent writes the game (sped up 10x), calls `publish_game` | "Claude writes it, then publishes it with one tool call." |
| 15–22s | Tool result with the link; click it; the arcade page; press ▶ | "A real link, on my own arcade, free on Cloudflare." |
| 22–30s | Phone: scan the QR code from the terminal, play for a few seconds | "It works on phones." |
| 30–40s | Gameplay at #1 on HN, servers melting (`?demo=fast` makes this easy) | (the game is the hook, so let it breathe) |
| 40–52s | Claude Code: "check the Vesta feedback and fix the top error". The report scrolls, the agent edits the file, publishes v2 | "Every crash players hit comes back to the agent. It fixes it and ships v2." |
| 52–60s | Game page changelog shows "v2: Fixed …"; end card: `npx vesta-cli setup` · github.com/VanitasCaesar1/vesta-arcade | "Vesta. Your own arcade for AI-made games. Open source." |

Tips:
- Plant a real bug for the fix scene (e.g. an undefined property on a rare path), play until it fires, then show the report.
- Keep the terminal font large and the theme dark, to match the arcade.
- Export a 15-second cut (prompt → link → report → fix) as a GIF for the README.
