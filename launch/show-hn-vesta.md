# Show HN: Vesta

## Title (pick one)

1. **Show HN: Vesta – open-source itch.io for AI-made games, free on Cloudflare**
2. Show HN: Publish games from Claude Code and get players' stack traces back
3. Show HN: I built a self-hosted arcade where players' crashes go back to your agent

Option 1 says what it is in terms people already know. Option 2 leads with the hook. Use option 2 if week 1 went well and people remember the game.

## URL

`https://github.com/VanitasCaesar1/vesta-arcade` (the README does the selling; about 40% of the most upvoted Show HNs of the past year linked straight to GitHub)

## First comment

> Hi HN. Last week I posted Hug of Death here, a game about surviving the front page. This is the thing it runs on.
>
> Coding agents make it easy to build a browser game in an afternoon. The hard part is what comes after: you share a link, and you never find out that it crashed on Safari or that half the players quit in ten seconds.
>
> Vesta is a small arcade you deploy to your own Cloudflare account with `npx vesta-arcade setup`. It uses two Workers, R2 and D1, and fits the free plan. Your agent publishes with one MCP tool call (or `npx vesta-arcade publish`) and gets a link. Each game gets a tiny injected script that records uncaught errors with stacks, failed asset loads, how long the tab stays visible, and milestones the game reports. Then `get_feedback` gives the agent all of that plus players' comments as one Markdown report, and you can say "fix the top error and publish again".
>
> From the Hug of Death launch: [N] plays, [N] distinct errors (the top one was [X], fixed in v[N]), and [N]% of players reached #1.
>
> Some details HN might care about:
> - Games are served from a separate origin (`workers.dev` is on the Public Suffix List, so it's a separate site), inside a sandboxed iframe, under a strict CSP. A game can't read the arcade's cookies or redirect the page.
> - Nothing is stored per event: telemetry becomes daily totals, a session-length histogram and errors grouped by fingerprint. No cookies, no fingerprinting.
> - Uploads are validated against a manifest first: no `.env` or `.git/` leaks, no executables, and a version only goes live when every file has arrived at the declared size.
> - The pages are server-rendered with Hono JSX; the only client JS is about 150 lines.
>
> It's MIT. I'd love to hear what you'd want from the feedback report.

## Likely questions

- **Why not itch.io?** itch requires an "AI generated" tag, and much of its community dislikes AI-made work. Vesta is yours, and its point is the feedback loop, not the storefront.
- **Why Cloudflare only?** The free plan covers everything (Workers, R2, D1, workers.dev subdomains on the Public Suffix List). The Worker is plain fetch handlers plus Hono, so porting to another runtime with S3 and SQLite is a weekend.
- **Is the telemetry creepy?** It records errors, visible time and milestones. It stores totals, not events, and no cookies or IP addresses (IPs are hashed with a per-arcade secret only for like and spam limits). Everything lives in your own D1.
- **Multi-tenant?** Not yet. It's single-owner by design for now. A subdomain per game for shared arcades is on the roadmap.
