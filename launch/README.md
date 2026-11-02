# Launch plan

Two shots at the front page instead of one: the game first, then the tool.

Why this order: playful projects with a sharp premise are among the most upvoted Show HNs of 2026 ("A game where you build a GPU", 964 points; "SimCity, but with Permits", 941), while platform launches rarely place (no SaaS launch made the top 15 Show HNs of the last year). Hug of Death is playable in one click, it's about HN itself, and every play passes through a Vesta page that says "Made with Claude Code · Run your own arcade". So the game launch warms up the tool launch.

## Before anything goes public

- [ ] `npx vesta-cli setup` on your Cloudflare account (or `node cli/dist/cli.js setup` from the repo before the npm release)
- [ ] Optional: put the **arcade** on a custom domain (e.g. `arcade.vestapowered.in`, set in the Cloudflare dashboard under the `vesta` Worker → Domains). Keep the **play** Worker on `workers.dev`. Don't put it on another subdomain of the same domain, or the two become the same *site* and the cookie isolation gets weaker.
- [ ] Publish Hug of Death: `npx vesta-cli publish games/hug-of-death`. Check the cover image, then play it on a phone.
- [ ] Seed at least 5 more games so the arcade isn't empty: make 2–3 yourself with Claude Code (record one session end to end; that's the demo video), and ask Vibe Jam 2026 creators to publish theirs (the entry list is public).
- [ ] Replace the README's screenshots with ones from the live arcade, and add the live demo link near the top.
- [ ] Create the public GitHub repo `VanitasCaesar1/vesta-arcade` from this folder. It has no history from the old Vesta repo; keep it that way.
- [ ] `cd cli && npm publish` (the `vesta-cli` name was free on 2026-11-02). Test `npx vesta-cli setup` on a second Cloudflare account, or have a friend try it.
- [ ] Record the 60-second video ([demo-video.md](demo-video.md)) and a 15-second GIF of the publish → play → feedback loop for the README.
- [ ] Turn on Cloudflare's billing alerts, so a traffic spike never surprises you. The free plan just stops serving, it doesn't charge.

## Week 1: Show HN for the game

- Post: [show-hn-game.md](show-hn-game.md). Post on a weekday morning, US Eastern time, and stay around for the first 3 hours to answer every comment.
- Link straight to the game page on your arcade, not the repo.
- When it's on the front page, the hug of death will be real. Watch your arcade's dashboard, then post a follow-up comment with the real numbers (plays, errors, how far people got). People love that.
- Fix whatever the feedback report shows, and publish with notes. The changelog on the game page shows HN readers you listened.

## Week 2: Show HN for Vesta, and Product Hunt

- Show HN: [show-hn-vesta.md](show-hn-vesta.md). Use the game's numbers from week 1 as proof.
- Product Hunt on a different day: [product-hunt.md](product-hunt.md).
- X / Reddit / Discord: [social.md](social.md).

## After

- Weekly "games of the week" post from your arcade, tagging the creators.
- A Vesta jam about a month in. AI tool companies sponsor jams (Cursor and Bolt sponsored Vibe Jam 2026).
- Write up how the feedback loop changed a game: before and after error counts, drop-off, comments. This is the portfolio piece.
