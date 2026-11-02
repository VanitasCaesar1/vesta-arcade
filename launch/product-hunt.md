# Product Hunt

Launch at 12:01 am Pacific; the day's ranking runs midnight to midnight PT. Don't launch on the same day as the Show HN.

**Name:** Vesta

**Tagline (60 max):** Publish AI-made games from your editor, get crash reports back

**Topics:** Developer Tools · Games · Artificial Intelligence · Open Source

**Description (260 max):**
> Your own arcade for games made with Claude Code, Cursor or Codex. Your agent publishes in one command and gets a playable link. Then it reads back players' errors with stack traces, drop-off and comments, and fixes them. Open source, free on your Cloudflare account.

**Gallery (in this order):**
1. The 60-second video ([demo-video.md](demo-video.md))
2. The game page (`docs/img/game-page.png` from the live arcade)
3. The terminal: `npx vesta-cli publish` with the QR code
4. The feedback report open in Claude Code, with the agent fixing the top error
5. The creator dashboard
6. Hug of Death on a phone

**Maker comment:**
> Hey Product Hunt 👋 I'm Chakravarthi.
>
> AI coding agents made it easy to build a browser game in an afternoon. What's still missing is the part after: real players, and knowing what broke for them. So I built Vesta: an arcade you deploy to your own Cloudflare account (free plan) that your agent can publish to with one MCP tool call.
>
> The part I'm proudest of: every game gets a tiny script that catches crashes, failed asset loads, session length and milestones. Your agent can then call `get_feedback` and fix the top error itself. On the launch of my demo game, Hug of Death, that loop caught [X] within the first hour.
>
> It's MIT-licensed and needs no account with me. Try the game, then tell me what you'd want in the report.

**Before launch day:** line up people who will try it and leave a real comment, not just an upvote; comments carry weight. Reply to every comment in the first hours.
