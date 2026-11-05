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
| News / updates | per-game changelog; global `/updates` feed | planned |
| Developer tools (SDK, analytics, crash reports) | CLI + MCP, telemetry, feedback report, alerts | done |
| 3D content | three.js served from the play origin, 3D arena | planned |
| Model / AI comparisons (Vesta-only) | blind arenas for games, SVG, 3D; daily challenge | done (3D planned) |
