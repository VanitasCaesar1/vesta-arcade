import { Hono } from "hono";
import type { Context } from "hono";
import type { AppEnv } from "../lib/env.ts";
import { daysAgo } from "../lib/util.ts";
import { validateSlug } from "../lib/manifest.ts";
import { api, VERSION } from "./api.ts";
import { APP_JS, FAVICON_SVG, fontFiles, STYLE } from "./assets.ts";
import { mascotSvg } from "./mascot.ts";
import { OG_PNG } from "./og.ts";
import { ARENA_OG_JPG, ARENA_SVG_OG_JPG } from "./arenaOg.ts";

let ogBytes: Uint8Array<ArrayBuffer> | null = null;
let arenaOgBytes: Uint8Array<ArrayBuffer> | null = null;
let arenaSvgOgBytes: Uint8Array<ArrayBuffer> | null = null;
import { isAdmin, tokenConfigured } from "./auth.ts";
import { type Game, feedbackReport, getChallenge, getGame, listAchievements, listComments, listUpdates, listGames, listVersions, loopData, madeWithCounts, topScores, type Sort } from "./db.ts";
import { DashboardPage, GameDashboardPage, LoginPage, type GameSummary } from "./admin.tsx";
import { DeveloperPage, EmbedPage, GamePage, HomePage, LibraryPage, NotFoundPage, UpdatesPage } from "./pages.tsx";
import { ArenaBoardPage, ArenaEmbedPage, ArenaPage, EntryPage, PromptGalleryPage } from "./arenaPages.tsx";
import { arenaNames, arenaPrompts, daily, entryPage, featuredChallenge, isArenaEntry, leaderboard, promptGallery, randomMatchup, votesLastHour, type ArenaKind } from "./arena.ts";
import { badgeSvg, coverSvg, escapeXml } from "./svg.ts";
import { REPO_URL } from "./layout.tsx";
import { recentReviews } from "./reviews.ts";

export const site = new Hono<AppEnv>();

const origin = (c: Context<AppEnv>) => new URL(c.req.url).origin;
const playOrigin = (c: Context<AppEnv>) => {
  try {
    return new URL(c.env.PLAY_URL).origin;
  } catch {
    return "";
  }
};
const arcade = (c: Context<AppEnv>) => c.env.ARCADE_NAME || "Vesta Arcade";

// Pages get a strict CSP: scripts only from this origin, frames only from the play origin.
site.use("*", async (c, next) => {
  await next();
  if (c.res.headers.has("x-vesta-origin")) {
    c.res.headers.delete("x-vesta-origin");
    return;
  }
  if (!(c.res.headers.get("content-type") ?? "").startsWith("text/html")) return;
  const embed = c.req.path.startsWith("/embed/");
  c.res.headers.set(
    "content-security-policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: ${playOrigin(c)}`.trim(),
      `frame-src ${playOrigin(c) || "'none'"}`,
      "connect-src 'self'",
      "base-uri 'none'",
      "form-action 'self'",
      `frame-ancestors ${embed ? "*" : "'none'"}`,
    ].join("; "),
  );
  c.res.headers.set("x-content-type-options", "nosniff");
  c.res.headers.set("referrer-policy", "strict-origin-when-cross-origin");
});

site.route("/api", api);

// Arcades on a custom domain: www.example.com redirects to example.com.
site.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  if (url.hostname.startsWith("www.") && c.env.ROLE !== "auto") {
    url.hostname = url.hostname.slice(4);
    return c.redirect(url.toString(), 301);
  }
  await next();
});

const FONT_HEADERS = { "content-type": "font/woff2", "cache-control": "public, max-age=31536000, immutable", "access-control-allow-origin": "*" };
site.get("/static/archivo.woff2", (c) => c.body(fontFiles().display, 200, FONT_HEADERS));
site.get("/static/geist.woff2", (c) => c.body(fontFiles().sans, 200, FONT_HEADERS));
site.get("/static/geist-mono.woff2", (c) => c.body(fontFiles().mono, 200, FONT_HEADERS));
site.get("/static/style.css", (c) => c.body(STYLE, 200, { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=86400" }));
site.get("/static/app.js", (c) => c.body(APP_JS, 200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=86400" }));
site.get("/favicon.svg", (c) => c.body(FAVICON_SVG(mascotSvg()), 200, { "content-type": "image/svg+xml", "cache-control": "public, max-age=604800" }));
site.get("/og.png", (c) => c.body((ogBytes ??= Uint8Array.from(atob(OG_PNG), (x) => x.charCodeAt(0))), 200, { "content-type": "image/png", "cache-control": "public, max-age=86400" }));
site.get("/mascot.svg", (c) => c.body(mascotSvg({ label: "Vesta" }), 200, { "content-type": "image/svg+xml", "cache-control": "public, max-age=604800" }));
site.get("/favicon.ico", (c) => c.redirect("/favicon.svg", 301));
site.get("/robots.txt", (c) => c.text(`User-agent: *\nDisallow: /admin\nDisallow: /api/\nAllow: /\n`));

site.get("/", async (c) => {
  const sortQ = c.req.query("sort");
  const sort: Sort = sortQ === "new" || sortQ === "top" || sortQ === "rated" ? sortQ : "trending";
  const q = c.req.query("q")?.trim().slice(0, 60) || undefined;
  const tool = c.req.query("made_with")?.slice(0, 32) || undefined;
  const [games, tools, loop, arenaRow, featured] = await Promise.all([
    listGames(c.env, { sort, tool, q }),
    madeWithCounts(c.env),
    loopData(c.env),
    arenaNames(c.env),
    featuredChallenge(c.env),
  ]);
  c.header("cache-control", "public, max-age=30");
  return c.html(<HomePage arcade={arcade(c)} siteUrl={origin(c)} games={games} sort={sort} tool={tool} tools={tools} loop={loop} q={q} open={c.env.OPEN_PUBLISHING === "1"} arena={arenaRow || undefined} featured={featured} playOrigin={playOrigin(c)} />);
});

async function loadGame(c: Context<AppEnv>) {
  let slug: string;
  try {
    slug = validateSlug(c.req.param("slug"));
  } catch {
    return null;
  }
  const game = await getGame(c.env, slug);
  if (!game || !game.version) return null;
  // Arena entries stay off the home page (they'd give the blind matchups away) but are playable by link.
  if (game.hidden && !(await isAdmin(c)) && !(await isArenaEntry(c.env, slug))) return null;
  return game;
}

const notFound = (c: Context<AppEnv>) => c.html(<NotFoundPage arcade={arcade(c)} siteUrl={origin(c)} />, 404);
const playSrc = (c: Context<AppEnv>, slug: string, n: number) => `${c.env.PLAY_URL.replace(/\/$/, "")}/${slug}/${n}/`;

/** "More like this": games sharing the most tags and AI tools, then the most played. */
function moreLikeThis(game: Game, all: Game[]): Game[] {
  const mine = new Set([...game.tags, ...game.madeWith].map((t) => t.toLowerCase()));
  return all
    .filter((o) => o.slug !== game.slug)
    .map((o) => ({ o, shared: [...o.tags, ...o.madeWith].filter((t) => mine.has(t.toLowerCase())).length }))
    .sort((a, b) => b.shared - a.shared || b.o.plays - a.o.plays)
    .slice(0, 3)
    .map((x) => x.o);
}

site.get("/g/:slug", async (c) => {
  const game = await loadGame(c);
  if (!game) return notFound(c);
  const [versions, comments, scores, challenge, others, reviews, achievements] = await Promise.all([
    listVersions(c.env, game.slug, 12),
    listComments(c.env, game.slug, { limit: 30 }),
    topScores(c.env, game.slug, 10),
    getChallenge(c.env, game.slug, c.req.query("c")),
    listGames(c.env, { limit: 40 }),
    recentReviews(c.env, game.slug),
    listAchievements(c.env, game.slug),
  ]);
  return c.html(
    <GamePage
      arcade={arcade(c)}
      siteUrl={origin(c)}
      game={game}
      playSrc={playSrc(c, game.slug, game.version!)}
      versions={versions}
      comments={comments}
      scores={scores}
      challenge={challenge}
      more={moreLikeThis(game, others)}
      reviews={reviews}
      achievements={achievements}
      reviewNotice={c.req.query("review")?.slice(0, 120)}
      feedback={c.req.query("feedback")?.slice(0, 120)}
    />,
  );
});

site.get("/arena/og.jpg", (c) =>
  c.body((arenaOgBytes ??= Uint8Array.from(atob(ARENA_OG_JPG), (x) => x.charCodeAt(0))), 200, { "content-type": "image/jpeg", "cache-control": "public, max-age=86400" }),
);

async function arenaRoute(c: Context<AppEnv>, kind: ArenaKind, dailyInfo?: { date: string; tomorrow: string | null; id: string }) {
  const promptId = dailyInfo?.id ?? c.req.query("p")?.slice(0, 60);
  const [m, votes, names, prompts, countRows, hot] = await Promise.all([
    randomMatchup(c.env, kind, promptId),
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM arena_votes").first<{ n: number }>(),
    arenaNames(c.env),
    arenaPrompts(c.env, kind),
    c.env.DB.prepare("SELECT prompt, COUNT(*) AS n FROM arena_entries WHERE hidden = 0 GROUP BY prompt").all<{ prompt: string; n: number }>(),
    votesLastHour(c.env),
  ]);
  const counts = Object.fromEntries(countRows.results.map((r) => [r.prompt, r.n]));
  // The daily page only ever shows today's prompt; with fewer than two drawings it asks for more instead.
  const matchup = dailyInfo && m && m.prompt.id !== dailyInfo.id ? null : m;
  c.header("cache-control", "no-store");
  return c.html(
    <ArenaPage
      arcade={arcade(c)}
      siteUrl={origin(c)}
      kind={kind}
      m={matchup}
      votes={votes?.n ?? 0}
      names={names}
      prompts={prompts}
      promptId={promptId}
      counts={counts}
      hot={hot}
      daily={dailyInfo ? { date: dailyInfo.date, tomorrow: dailyInfo.tomorrow } : null}
      submitted={c.req.query("submitted")?.slice(0, 200)}
      playOrigin={playOrigin(c)}
      playSrc={(g) => playSrc(c, g.slug, g.version!)}
    />,
  );
}

site.get("/arena/svg/og.jpg", (c) =>
  c.body((arenaSvgOgBytes ??= Uint8Array.from(atob(ARENA_SVG_OG_JPG), (x) => x.charCodeAt(0))), 200, { "content-type": "image/jpeg", "cache-control": "public, max-age=86400" }),
);
site.get("/arena", (c) => arenaRoute(c, "game"));
site.get("/arena/svg", (c) => arenaRoute(c, "svg"));
site.get("/arena/3d", (c) => arenaRoute(c, "3d"));
site.get("/arena/today", async (c) => {
  const d = await daily(c.env);
  if (!d.today) return c.redirect("/arena/svg", 302);
  return arenaRoute(c, "svg", { id: d.today.id, date: d.today.live_from, tomorrow: d.tomorrow?.prompt.replace(/^Generate an SVG of /i, "") ?? null });
});

site.get("/arena/svg/p/:id", async (c) => {
  const id = c.req.param("id");
  if (!/^[a-z0-9-]{1,60}$/.test(id)) return notFound(c);
  const g = await promptGallery(c.env, id);
  if (!g) return notFound(c);
  c.header("cache-control", "public, max-age=30");
  return c.html(<PromptGalleryPage arcade={arcade(c)} siteUrl={origin(c)} playOrigin={playOrigin(c)} prompt={g.prompt} entries={g.entries} submitted={c.req.query("submitted")?.slice(0, 200)} />);
});

site.get("/arena/e/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) return notFound(c);
  const d = await entryPage(c.env, slug);
  if (!d) return notFound(c);
  if (d.entry.kind === "game") return c.redirect(`/g/${slug}`, 302);
  c.header("cache-control", "public, max-age=30");
  return c.html(<EntryPage arcade={arcade(c)} siteUrl={origin(c)} playOrigin={playOrigin(c)} {...d} submitted={c.req.query("submitted")?.slice(0, 200)} />);
});

site.get("/arena/leaderboard", async (c) => {
  const [board, names] = await Promise.all([leaderboard(c.env), arenaNames(c.env)]);
  c.header("cache-control", "public, max-age=30");
  return c.html(<ArenaBoardPage arcade={arcade(c)} siteUrl={origin(c)} names={names} playOrigin={playOrigin(c)} {...board} />);
});

site.get("/updates", async (c) => {
  c.header("cache-control", "public, max-age=60");
  return c.html(<UpdatesPage arcade={arcade(c)} siteUrl={origin(c)} updates={await listUpdates(c.env)} />);
});

site.get("/shot/:slug/:i", async (c) => {
  let slug: string;
  try {
    slug = validateSlug(c.req.param("slug"));
  } catch {
    return c.notFound();
  }
  const row = await c.env.DB.prepare("SELECT screenshots FROM games WHERE slug = ? AND hidden = 0").bind(slug).first<{ screenshots: string }>();
  const key = row ? (JSON.parse(row.screenshots || "[]") as string[])[Number(c.req.param("i"))] : undefined;
  const obj = key ? await c.env.FILES.get(key) : null;
  if (!obj) return c.notFound();
  return c.body(obj.body, 200, { "content-type": obj.httpMetadata?.contentType ?? "image/png", "cache-control": "public, max-age=3600" });
});

site.get("/library", (c) => c.html(<LibraryPage arcade={arcade(c)} siteUrl={origin(c)} />));

site.get("/dev/:name", async (c) => {
  const name = decodeURIComponent(c.req.param("name")).slice(0, 60);
  const games = await listGames(c.env, { author: name, sort: "top" });
  if (!games.length) return notFound(c);
  c.header("cache-control", "public, max-age=60");
  return c.html(<DeveloperPage arcade={arcade(c)} siteUrl={origin(c)} name={games[0]!.author || name} games={games} />);
});

site.get("/embed/arena", async (c) => {
  const promptId = c.req.query("p")?.slice(0, 60);
  const m = await randomMatchup(c.env, "svg", promptId);
  c.header("cache-control", "no-store");
  return c.html(<ArenaEmbedPage arcade={arcade(c)} siteUrl={origin(c)} m={m} playOrigin={playOrigin(c)} promptId={promptId} />);
});

site.get("/embed/:slug", async (c) => {
  const game = await loadGame(c);
  if (!game) return notFound(c);
  return c.html(<EmbedPage arcade={arcade(c)} siteUrl={origin(c)} game={game} playSrc={playSrc(c, game.slug, game.version!)} />);
});

site.get("/cover/:slug", async (c) => {
  let slug: string;
  try {
    slug = validateSlug(c.req.param("slug"));
  } catch {
    return c.notFound();
  }
  const row = await c.env.DB.prepare("SELECT title, cover_key FROM games WHERE slug = ?").bind(slug).first<{ title: string; cover_key: string | null }>();
  if (!row) return c.notFound();
  const headers = { "cache-control": "public, max-age=3600", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'" };
  if (row.cover_key) {
    const obj = await c.env.FILES.get(row.cover_key);
    if (obj) return new Response(obj.body, { headers: { ...headers, "content-type": obj.httpMetadata?.contentType ?? "image/png" } });
  }
  return c.body(coverSvg(slug, row.title), 200, { ...headers, "content-type": "image/svg+xml" });
});

site.get("/badge/:slug", async (c) => {
  let slug: string;
  try {
    slug = validateSlug(c.req.param("slug").replace(/\.svg$/, ""));
  } catch {
    return c.notFound();
  }
  const row = await c.env.DB.prepare("SELECT title, plays FROM games WHERE slug = ?").bind(slug).first<{ title: string; plays: number }>();
  if (!row) return c.notFound();
  return c.body(badgeSvg(row.title.slice(0, 40), row.plays), 200, { "content-type": "image/svg+xml", "cache-control": "public, max-age=600" });
});

site.get("/feed.xml", async (c) => {
  const games = await listGames(c.env, { sort: "new", limit: 30 });
  const base = origin(c);
  const items = games
    .map(
      (g) => `<item><title>${escapeXml(g.title)}</title><link>${base}/g/${g.slug}</link><guid>${base}/g/${g.slug}</guid>` +
        `<pubDate>${new Date(g.createdAt * 1000).toUTCString()}</pubDate><description>${escapeXml(g.description)}</description></item>`,
    )
    .join("");
  return c.body(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(arcade(c))}</title><link>${base}</link>` +
      `<description>New games on ${escapeXml(arcade(c))}</description>${items}</channel></rss>`,
    200,
    { "content-type": "application/rss+xml; charset=utf-8" },
  );
});

site.get("/llms.txt", (c) => {
  const base = origin(c);
  return c.text(`# ${arcade(c)}

> A Vesta arcade: browser games made with AI coding agents, published from the terminal, with player feedback an agent can act on.

## Publish a game (for coding agents)

The game must be a folder with an index.html at its top level (a static build such as dist/ or build/, or plain HTML/JS).

- MCP (Claude Code, Cursor, Codex, any MCP client): \`claude mcp add vesta -- npx -y vesta-arcade mcp\`
  Tools: publish_game, get_feedback, list_games, set_cover.
- CLI: \`npx vesta-arcade publish [dir] --notes "what changed"\`. It saves the game's slug in vesta.json, so the next publish becomes a new version.
- ${c.env.OPEN_PUBLISHING === "1" ? `Anyone can publish here without an account: with no arcade configured, \`npx vesta-arcade publish\` (and publish_game) publish to ${base} and save a per-game key in ~/.config/vesta/keys.json. Community games are capped at 30 MB and 5 new games a day. ` : ""}The owner signs in once with \`npx vesta-arcade login ${base}\`.

## AI Arena

Models compete on the same prompt, judged blind by players: ${base}/arena (games) and ${base}/arena/svg (SVG drawings).
- Enter a game you built for an arena prompt: \`npx vesta-arcade publish --arena <prompt-id> --model "<model name>"\` (or publish_game with arena and model). Prompts and rules: https://github.com/VanitasCaesar1/vesta-arcade/blob/main/arena/PROMPTS.md
- Enter an SVG drawing: paste it at ${base}/arena/svg#submit, or start a new challenge there.

## Read player feedback

\`npx vesta-arcade feedback <slug>\` or the get_feedback MCP tool returns Markdown: errors with stack traces, how long sessions last, milestones, and what players wrote. Fix the top error first.

## Report progress from a game

Vesta injects window.vesta into every game. Call \`window.vesta?.milestone("reached-level-2")\` at key moments; the creator sees what share of plays reach each one. \`window.vesta?.error("message")\` reports a game-level problem. \`await window.vesta?.submitScore(score)\` at game over shows an arcade "enter your initials" box and puts the score on the game's high-score table (higher is better). After the player saves, the box offers a \`Challenge a friend\` link (\`/g/<slug>?c=<scoreId>\`) and \`window.vesta.shareUrl\` becomes that link, so read \`window.vesta.shareUrl\` when the player presses your own share button rather than caching it at load. A player who arrives through a challenge link sees the score to beat; \`window.vesta.challenge\` is \`{ name, score }\` or \`null\`. Saves in localStorage are kept per game automatically. \`window.vesta?.achievement("exit-vim", "Escape artist", "Quit vim in under a second")\` unlocks an achievement: the player sees a trophy toast once, and the game page shows what share of players unlocked each one (up to 50 per game).

## Limits

1,000 files and 100 MB per version, 25 MB per file. No executables or hidden files. The newest 3 versions are kept.

## API

- GET ${base}/api/games: public list (JSON)
- GET ${base}/api/games/{slug}: one game
- Admin endpoints take \`Authorization: Bearer <token>\`: PUT /api/games/{slug}, POST /api/games/{slug}/versions, PUT /api/games/{slug}/versions/{n}/files/{path}, POST /api/games/{slug}/versions/{n}/finalize, GET /api/games/{slug}/feedback?format=md

Source: ${REPO_URL}
`);
});

site.get("/admin", async (c) => {
  if (!(await isAdmin(c))) {
    return c.html(<LoginPage arcade={arcade(c)} siteUrl={origin(c)} error={c.req.query("error") === "1"} configured={tokenConfigured(c)} />);
  }
  const since = daysAgo(13);
  const [games, daily, errs, comments] = await Promise.all([
    listGames(c.env, { sort: "new", includeHidden: true, limit: 500 }),
    c.env.DB.prepare("SELECT slug, day, plays, sessions, seconds FROM daily_stats WHERE day >= ?").bind(since).all<{ slug: string; day: string; plays: number; sessions: number; seconds: number }>(),
    c.env.DB.prepare("SELECT e.slug, COUNT(*) AS n FROM errors e JOIN games g ON g.slug = e.slug AND e.version = g.current_version GROUP BY e.slug").all<{ slug: string; n: number }>(),
    c.env.DB.prepare("SELECT slug, COUNT(*) AS n FROM comments WHERE hidden = 0 GROUP BY slug").all<{ slug: string; n: number }>(),
  ]);
  const days = Array.from({ length: 14 }, (_, i) => daysAgo(13 - i));
  const summaries: GameSummary[] = games.map((g) => {
    const mine = daily.results.filter((d) => d.slug === g.slug);
    const sessions = mine.reduce((s, d) => s + d.sessions, 0);
    return {
      ...g,
      spark: days.map((day) => mine.find((d) => d.day === day)?.plays ?? 0),
      avgSeconds: sessions ? Math.round(mine.reduce((s, d) => s + d.seconds, 0) / sessions) : 0,
      errorCount: errs.results.find((e) => e.slug === g.slug)?.n ?? 0,
      commentCount: comments.results.find((e) => e.slug === g.slug)?.n ?? 0,
    };
  });
  return c.html(<DashboardPage arcade={arcade(c)} siteUrl={origin(c)} games={summaries} />);
});

site.get("/admin/g/:slug", async (c) => {
  if (!(await isAdmin(c))) return c.redirect("/admin");
  let slug: string;
  try {
    slug = validateSlug(c.req.param("slug"));
  } catch {
    return notFound(c);
  }
  const report = await feedbackReport(c.env, slug, 14);
  if (!report) return notFound(c);
  return c.html(<GameDashboardPage arcade={arcade(c)} siteUrl={origin(c)} report={report} />);
});

site.get("/random", async (c) => {
  const row = await c.env.DB.prepare("SELECT slug FROM games WHERE current_version IS NOT NULL AND hidden = 0 ORDER BY RANDOM() LIMIT 1").first<{ slug: string }>();
  c.header("cache-control", "no-store");
  return c.redirect(row ? `/g/${row.slug}?play=1` : "/", 302);
});

site.get("/__version", (c) => c.json({ vesta: VERSION }));

// When the arcade takes over a domain that already had a site (ORIGIN_FALLBACK=1),
// anything the arcade doesn't serve is passed through to that site, so old
// links like /download keep working.
const OWN_PREFIXES = ["/g/", "/api/", "/admin", "/embed/", "/cover/", "/badge/", "/static/", "/dev/", "/arena", "/library", "/updates", "/shot/"];
site.notFound(async (c) => {
  const path = new URL(c.req.url).pathname;
  if (c.env.ORIGIN_FALLBACK === "1" && (c.req.method === "GET" || c.req.method === "HEAD") && !OWN_PREFIXES.some((p) => path.startsWith(p))) {
    const upstream = await fetch(c.req.raw);
    // Copy, so headers are mutable, and mark it so the arcade's CSP isn't applied to someone else's site.
    const res = new Response(upstream.body, upstream);
    res.headers.set("x-vesta-origin", "1");
    return res;
  }
  return notFound(c);
});
