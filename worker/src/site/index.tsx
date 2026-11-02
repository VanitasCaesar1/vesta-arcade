import { Hono } from "hono";
import type { Context } from "hono";
import type { AppEnv } from "../lib/env.ts";
import { daysAgo } from "../lib/util.ts";
import { validateSlug } from "../lib/manifest.ts";
import { api, VERSION } from "./api.ts";
import { APP_JS, FAVICON_SVG, fontFiles, STYLE } from "./assets.ts";
import { mascotSvg } from "./mascot.ts";
import { OG_PNG } from "./og.ts";

let ogBytes: Uint8Array<ArrayBuffer> | null = null;
import { isAdmin, tokenConfigured } from "./auth.ts";
import { feedbackReport, getGame, listComments, listGames, listVersions, madeWithCounts, topScores, type Sort } from "./db.ts";
import { DashboardPage, GameDashboardPage, LoginPage, type GameSummary } from "./admin.tsx";
import { EmbedPage, GamePage, HomePage, NotFoundPage } from "./pages.tsx";
import { badgeSvg, coverSvg, escapeXml } from "./svg.ts";
import { REPO_URL } from "./layout.tsx";

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
      "img-src 'self' data:",
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
  const sort: Sort = sortQ === "new" || sortQ === "top" ? sortQ : "trending";
  const tool = c.req.query("made_with")?.slice(0, 32) || undefined;
  const [games, tools] = await Promise.all([listGames(c.env, { sort, tool }), madeWithCounts(c.env)]);
  c.header("cache-control", "public, max-age=30");
  return c.html(<HomePage arcade={arcade(c)} siteUrl={origin(c)} games={games} sort={sort} tool={tool} tools={tools} />);
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
  if (game.hidden && !(await isAdmin(c))) return null;
  return game;
}

const notFound = (c: Context<AppEnv>) => c.html(<NotFoundPage arcade={arcade(c)} siteUrl={origin(c)} />, 404);
const playSrc = (c: Context<AppEnv>, slug: string, n: number) => `${c.env.PLAY_URL.replace(/\/$/, "")}/${slug}/${n}/`;

site.get("/g/:slug", async (c) => {
  const game = await loadGame(c);
  if (!game) return notFound(c);
  const [versions, comments, scores] = await Promise.all([
    listVersions(c.env, game.slug, 12),
    listComments(c.env, game.slug, { limit: 30 }),
    topScores(c.env, game.slug, 10),
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
      feedback={c.req.query("feedback")?.slice(0, 120)}
    />,
  );
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

- MCP (Claude Code, Cursor, Codex, any MCP client): \`claude mcp add vesta -- npx -y vesta-cli mcp\`
  Tools: publish_game, get_feedback, list_games, set_cover.
- CLI: \`npx vesta-cli publish [dir] --notes "what changed"\`. It saves the game's slug in vesta.json, so the next publish becomes a new version.
- The owner signs in once with \`npx vesta-cli login ${base}\`.

## Read player feedback

\`npx vesta-cli feedback <slug>\` or the get_feedback MCP tool returns Markdown: errors with stack traces, how long sessions last, milestones, and what players wrote. Fix the top error first.

## Report progress from a game

Vesta injects window.vesta into every game. Call \`window.vesta?.milestone("reached-level-2")\` at key moments; the creator sees what share of plays reach each one. \`window.vesta?.error("message")\` reports a game-level problem. \`await window.vesta?.submitScore(score)\` at game over shows an arcade "enter your initials" box and puts the score on the game's high-score table (higher is better). Saves in localStorage are kept per game automatically.

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
const OWN_PREFIXES = ["/g/", "/api/", "/admin", "/embed/", "/cover/", "/badge/", "/static/"];
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
