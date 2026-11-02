# Architecture

Vesta is two Cloudflare Workers built from one script, an R2 bucket and a D1 database. This page explains the design choices; the [README](../README.md) covers usage.

## Goals

1. **One command from an agent to a playable link.** No dashboard to click through, nothing to configure per game.
2. **Feedback an agent can act on.** Not page views: the errors players hit, where they stop, and what they said.
3. **Free and owned.** It runs in the creator's Cloudflare account, inside the free plan, with no service of ours in the middle.
4. **Safe to host untrusted JavaScript.** AI-written games can be buggy or hostile; neither should be able to touch the arcade.

## Request flow

```
Player                          site Worker (ROLE=site)                 play Worker (ROLE=play)
  │  GET /g/hug-of-death  ───▶  render page (Hono JSX) from D1
  │  ◀── HTML + strict CSP
  │  click ▶ Play
  │  iframe GET /hug-of-death/4/  ─────────────────────────────────▶  R2 g/hug-of-death/4/index.html
  │                                                                    HTMLRewriter: inject <script src=/__vesta/t.js>
  │  ◀───────────────────────────────────────────────────────────────  HTML (feedback script first in <head>)
  │  GET assets ───────────────────────────────────────────────────▶  R2, immutable cache headers
  │  sendBeacon /__vesta/e  ───────────────────────────────────────▶  validate, rate-limit, batch UPSERTs into D1
```

```
Agent / CLI                     site Worker
  PUT  /api/games/:slug                      upsert title, description, made-with…
  POST /api/games/:slug/versions             validate manifest → version n, status "uploading"
  PUT  /api/games/:slug/versions/n/files/*   one file per request, must match the manifest's path and size → R2
  POST /api/games/:slug/versions/n/finalize  list R2, compare to manifest → "live", prune to newest 3
  PUT  /api/games/:slug/cover                PNG/JPEG/WebP/GIF, 2 MB
  GET  /api/games/:slug/feedback?format=md   the agent report
```

## Why two origins

Every game's JavaScript runs on the play origin. The arcade's session cookie, its admin API and its pages live on the site origin. `*.workers.dev` is on the Public Suffix List, so `vesta.you.workers.dev` and `vesta-play.you.workers.dev` are different *sites*: cookies aren't shared, `SameSite=Strict` holds, and the browser isolates them in separate processes where it can.

On top of that:

- The arcade's CSP allows frames only from the play origin and scripts only from itself.
- The iframe is sandboxed: scripts, pointer lock, popups, forms and modals are allowed; top-level navigation is not, so a game can't redirect the arcade.
- Admin requests authenticated by cookie must also send `x-vesta-csrf: 1`, which a cross-site form can't.
- The admin token is compared in constant time; the session cookie is an HMAC of its expiry, keyed by the token, so rotating the token signs everyone out.

**What isn't isolated:** games on the same arcade share the play origin. The injected script namespaces `localStorage`, `sessionStorage` and `indexedDB.open` per game, which handles honest games. A deliberately hostile game could still read another game's saves. For a single-owner arcade that's acceptable (you published every game); a subdomain per game on a custom domain is on the roadmap for shared arcades.

## Uploads

The CLI sends the file list first. The server validates it (`worker/src/lib/manifest.ts`):

- `index.html` at the top level
- at most 1,000 files, 100 MB per version, 25 MB per file (a free-plan Worker accepts 100 MB request bodies)
- relative, clean UTF-8 paths with no `..`, backslashes or control characters
- no hidden files or folders (stops accidental `.env` and `.git/` leaks)
- no executables (`.exe`, `.sh`, `.dll`, `.apk`, …)

Each file is then uploaded by its own request, and accepted only if its path is in the manifest and its body is exactly the declared size. `finalize` lists the version's R2 prefix and refuses to go live until every file is present at the right size. Versions abandoned for a day are deleted on the next upload.

R2 keys are `g/<slug>/<version>/<path>`. The play Worker maps URLs to keys directly, with no database lookup per file, and serves everything except HTML with `immutable` caching, because the version number is in the path.

## The feedback script

`worker/src/play/client.ts`, about 200 lines of ES2017, injected as the first element of `<head>` so it catches errors from everything after it:

| Signal | How |
|---|---|
| Play | One `start` beacon when the game loads. Games load only after a click on the arcade page. |
| Active time | Counted only while the tab is visible; reported on `visibilitychange` and `pagehide`. |
| Errors | `error` (capture phase, so failed `<img>`/`<script>` loads count too), `unhandledrejection`, `console.error`, `window.vesta.error()`. At most 25 distinct per session. |
| Milestones | `window.vesta.milestone(name)`, once per name per session. |

Headless browsers, crawlers and the CLI's cover screenshots (`?vesta-preview=1`) send nothing.

## Data model

D1 holds totals, not events (`worker/migrations/0001_init.sql`):

- `daily_stats (slug, day)`: plays, timed sessions, active seconds and errors
- `dropoff (slug, version, bucket)`: a session-length histogram. Each session lives in exactly one bucket: when a later beacon moves its total into a longer bucket, the old bucket is decremented and the new one incremented.
- `errors (slug, version, fingerprint)`: count, first and last seen, latest stack and user agent. The fingerprint hashes kind, message (with digits masked), source and line.
- `milestones (slug, version, name)`: counts; the report divides by the version's plays.
- `comments`, `likes`: public feedback, rate-limited by a peppered IP hash.
- `scores`: high scores from `window.vesta.submitScore()`, posted to the play origin's `/__vesta/score`. Scores come from the browser, so they can be faked; they're rate-limited per IP and boards show the best score per set of initials.

Every beacon becomes a single `DB.batch()` of UPSERTs, run after the response is sent with `ctx.waitUntil`.

## Custom domains

`vesta setup --domain example.com` puts the site Worker on a domain in the same Cloudflare account. A host that already serves a site gets a Worker route, so DNS is untouched and `ORIGIN_FALLBACK=1` passes any path the arcade doesn't serve through to the old site (without the arcade's CSP). A host with no records gets a Workers custom domain. `www.` redirects to the bare domain. The play Worker always stays on `workers.dev`, so games remain on a separate site from the arcade.

## Rendering

The look comes from the original Vesta mascot, redrawn as SVG in `src/site/mascot.ts` with several expressions (deadpan, excited, delighted, game over). On the home page it follows the cursor and reacts when you go for a play button. Fonts (Archivo, Geist, Geist Mono, all OFL) and Phosphor icons (MIT) are vendored by `scripts/vendor-assets.mjs`, so pages load nothing from third parties.

Pages are rendered on the server with Hono's JSX: no client framework, no build step for the site, and link previews (Open Graph and Twitter cards) work because the HTML arrives complete. The only client script is `/static/app.js` (about 150 lines): play button, likes, share, embed, comments and dashboard actions. Covers fall back to a generated SVG tile; the CLI replaces it with a real screenshot the first time it publishes.

## Deploying

`npx vesta-cli setup` ships the Worker pre-bundled inside the npm package (`cli/dist/worker`). It runs wrangler to: sign in, create the R2 bucket and D1 database, deploy the play Worker, apply migrations, deploy the site Worker with the play Worker's URL, and set a random 256-bit `ADMIN_TOKEN` secret. Running it again upgrades the same Workers in place and keeps the token unless `--rotate-token` is passed.
