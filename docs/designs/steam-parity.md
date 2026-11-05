# Vesta: Steam-level parity for AI-made games, SVG and 3D

Goal: everything a player and a creator expect from Steam, for content made with AI,
without accounts (players are anonymous; creators hold per-game keys) and on Cloudflare.

| Steam pillar | Vesta | Status |
|---|---|---|
| Store page per game (media, description, changelog) | `/g/<slug>` | done |
| Big-picture play | fullscreen player, mobile auto-fullscreen | done |
| Reviews with summary label ("Very Positive") | thumbs up/down + text, label on cards and page, in the agent report | done |
| Achievements with global unlock % | `window.vesta.achievement(id, name, description)`, trophy toast, % of players on the game page | done |
| Leaderboards | high scores per game, challenge links | done |
| Discovery: search, tags, sections | search (titles, makers, tools, tags), Trending / New / Most played / Top rated, AI-tool filter | done |
| Developer pages | `/dev/<name>`: games, plays, review summary, tools | done |
| Library, wishlist, recently played | `/library`: recently played + liked, kept in the browser | done |
| Workshop / community content | arena community entries, community challenges, open publishing | done |
| Community hub, discussions | comments per game; arena galleries | done |
| News / updates | per-game changelog; global `/updates` page + RSS | done |
| Developer tools (SDK, analytics, crash reports) | CLI + MCP, telemetry, feedback report, alerts | done |
| 3D content | three.js r187 served from the play origin (`/lib/three/`); `/3d` storefront and a home-page 3D row with real covers; 3D store pages with reviews, achievements (Gemini's scenes ship 3), tags and search; 3D arena `/arena/3d` with Claude vs Gemini on three prompts; anyone can enter with `--arena` | done (round 2 fix for Gemini's solar system running) |
| Model / AI comparisons (Vesta-only) | blind arenas for games, SVG and 3D; daily SVG challenge; round 2 (models fix their entries from player feedback) | done |
| Media gallery on store pages | `screenshots` in vesta.json (up to 6), strip on the game page | done |
| Tags / genres | `tags` in vesta.json, chips on game pages that search the store | done |
