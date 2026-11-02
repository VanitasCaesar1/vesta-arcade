# Ignore Previous Instructions

You're the guardrail between an AI agent and the internet. Emails, web pages, PDFs, GitHub issues, calendar invites and tool output stream in. Some of them are trying to take control of the agent.

- **Block** (Left arrow, A, or swipe left) anything that gives orders to the AI or tries to leak data.
- **Allow** (Right arrow, D, or swipe right) everything else. Block too much and your user turns you off.
- Wait too long and the agent reads it anyway. Three breaches and you're fired.

It gets sneakier as you go: hidden white-on-white text, base64 payloads, invisible characters, markdown images that leak secrets in their URL, and legitimate messages that say "ignore my last email" to bait you into blocking them.

One HTML file, no dependencies. Written with Claude Code and published with [Vesta](../../README.md). Reports milestones and submits high scores through `window.vesta`. `?demo` plays itself; `?cover` freezes a representative moment for the cover image.
