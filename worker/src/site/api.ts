import { Hono } from "hono";
import type { Context } from "hono";
import type { AppEnv, Env } from "../lib/env.ts";
import { ManifestError, validateManifest, validatePath, validateSlug, type ManifestFile } from "../lib/manifest.ts";
import { contentType, COVER_TYPES } from "../lib/mime.ts";
import { cleanList, cleanText, ipHash, now, safeEqual, sha256 } from "../lib/util.ts";
import { notify, validWebhook } from "../lib/notify.ts";
import { recount } from "./reviews.ts";
import type { MiddlewareHandler } from "hono";
import { bearer, endSession, isAdmin, requireAdmin, startSession, tokenConfigured } from "./auth.ts";
import { ARENA_KINDS, checkSvg, crowd, recordVote, revealOnly, svgSlug, verifyMatchup, type ArenaKind } from "./arena.ts";
import { feedbackReport, getGame, getGameRow, listGames, reportMarkdown, topScores, type Sort } from "./db.ts";

export const VERSION = "0.1.0";
const KEEP_VERSIONS = 3;
const MAX_COVER_BYTES = 2 * 1024 * 1024;
/** Limits for community games (open publishing). The owner's own games use the manifest limits. */
const COMMUNITY_MAX_BYTES = 30 * 1024 * 1024;
const COMMUNITY_NEW_GAMES_PER_DAY = 5;
const COMMUNITY_VERSIONS_PER_HOUR = 12;
const REPORTS_TO_HIDE = 3;

const keyHash = (key: string) => sha256(`vesta-game-key:${key}`);

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/, "") || "game"
  );
}

/**
 * Admin, or the holder of a community game's key acting on that game only.
 * Keys are random 32-byte secrets handed out once by POST /api/claim; only their hash is stored.
 */
const requireGameAccess: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = bearer(c);
  if (token && !(tokenConfigured(c) && safeEqual(token, c.env.ADMIN_TOKEN))) {
    let slug: string;
    try {
      slug = validateSlug(c.req.param("slug"));
    } catch {
      return c.json({ error: "bad slug" }, 400);
    }
    const row = await c.env.DB.prepare("SELECT owner_key_hash FROM games WHERE slug = ?").bind(slug).first<{ owner_key_hash: string | null }>();
    if (row?.owner_key_hash && safeEqual(row.owner_key_hash, await keyHash(token))) {
      c.set("gameKey" as never, true as never);
      return next();
    }
    return c.json({ error: "this key can't change that game" }, 401);
  }
  return requireAdmin(c, next);
};
const viaGameKey = (c: Context<AppEnv>) => !!c.get("gameKey" as never);

export const api = new Hono<AppEnv>();

api.onError((err, c) => {
  if (err instanceof ManifestError) return c.json({ error: err.message }, 400);
  console.error(err);
  return c.json({ error: "internal error" }, 500);
});
api.notFound((c) => c.json({ error: "not found" }, 404));

const siteUrl = (c: Context<AppEnv>) => new URL(c.req.url).origin;
const playBase = (env: Env, slug: string, n: number) => `${env.PLAY_URL.replace(/\/$/, "")}/${slug}/${n}/`;

function slugParam(c: Context<AppEnv>): string {
  return validateSlug(c.req.param("slug"));
}

// ---------- public ----------

api.get("/health", (c) => c.json({ ok: true, name: c.env.ARCADE_NAME, version: VERSION }));

api.get("/games", async (c) => {
  const sort = (["trending", "new", "top"].includes(c.req.query("sort") ?? "") ? c.req.query("sort") : "trending") as Sort;
  const games = await listGames(c.env, { sort, tool: c.req.query("made_with") || undefined, includeHidden: await isAdmin(c) });
  return c.json({ games: games.map((g) => ({ ...g, url: `${siteUrl(c)}/g/${g.slug}` })) });
});

// Open publishing: reserve a slug and get the key that publishes to it.
api.post("/claim", async (c) => {
  if (c.env.OPEN_PUBLISHING !== "1") {
    return c.json({ error: "This arcade only publishes its owner's games. Run your own, free: npx vesta-arcade setup" }, 403);
  }
  const input = await c.req.json<{ title?: unknown }>().catch(() => ({}) as { title?: unknown });
  const title = cleanText(input.title, 80) || "Untitled game";
  const ip = await ipHash(c.req.raw, c.env.ADMIN_TOKEN ?? "vesta");
  const t = now();
  const recent = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM games WHERE creator_ip_hash = ? AND created_at > ?").bind(ip, t - 86_400).first<{ n: number }>();
  if ((recent?.n ?? 0) >= COMMUNITY_NEW_GAMES_PER_DAY) {
    return c.json({ error: `You've published ${COMMUNITY_NEW_GAMES_PER_DAY} new games today. Update one of them, or try again tomorrow.` }, 429);
  }
  const base = slugify(title);
  const random = () => {
    const b = crypto.getRandomValues(new Uint8Array(3));
    return Array.from(b, (x) => x.toString(36).padStart(2, "0")).join("").slice(0, 4);
  };
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const key = btoa(String.fromCharCode(...keyBytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const hash = await keyHash(key);
  for (let i = 0; i < 6; i++) {
    const slug = i === 0 ? base : `${base.slice(0, 35)}-${random()}`;
    const res = await c.env.DB.prepare(
      `INSERT OR IGNORE INTO games (slug, title, owner_key_hash, creator_ip_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(slug, title, hash, ip, t, t)
      .run();
    if (res.meta.changes) return c.json({ slug, key, url: `${siteUrl(c)}/g/${slug}` }, 201);
  }
  return c.json({ error: "couldn't find a free name for this game; try another title" }, 409);
});

// Anyone can report a game. Enough distinct reports hide a community game until the owner reviews it.
api.post("/games/:slug/report", async (c) => {
  const slug = slugParam(c);
  const isForm = (c.req.header("content-type") ?? "").includes("form");
  const input = isForm ? Object.fromEntries((await c.req.formData().catch(() => new FormData())).entries()) : await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const row = await getGameRow(c.env, slug);
  if (!row) return c.json({ error: "not found" }, 404);
  const ip = await ipHash(c.req.raw, c.env.ADMIN_TOKEN ?? "vesta");
  await c.env.DB.prepare("INSERT OR IGNORE INTO reports (slug, ip_hash, reason, created_at) VALUES (?, ?, ?, ?)")
    .bind(slug, ip, cleanText((input as Record<string, unknown>).reason, 300), now())
    .run();
  const n = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM reports WHERE slug = ?").bind(slug).first<{ n: number }>();
  if (row.owner_key_hash && (n?.n ?? 0) >= REPORTS_TO_HIDE) await c.env.DB.prepare("UPDATE games SET hidden = 1 WHERE slug = ?").bind(slug).run();
  return isForm ? c.redirect(`/g/${slug}?feedback=${encodeURIComponent("Reported. Thanks, the arcade's owner will take a look.")}#feedback`, 303) : c.json({ ok: true });
});

// AI Arena: a vote on a matchup the server handed out (signed), at most a few per minute per visitor.
api.post("/arena/vote", async (c) => {
  const input = await c.req.json<{ m?: unknown; winner?: unknown }>().catch(() => ({}) as { m?: unknown; winner?: unknown });
  const m = await verifyMatchup(c.env, input.m);
  const winner = input.winner === "a" || input.winner === "b" || input.winner === "tie" ? input.winner : null;
  if (!m || !winner) return c.json({ error: "this matchup expired; load a new one" }, 400);
  const ip = await ipHash(c.req.raw, c.env.ADMIN_TOKEN ?? "vesta");
  const t = now();
  const [hour, same] = await c.env.DB.batch<{ n: number }>([
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM arena_votes WHERE ip_hash = ? AND created_at > ?").bind(ip, t - 3600),
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM arena_votes WHERE ip_hash = ? AND created_at > ? AND ((a = ? AND b = ?) OR (a = ? AND b = ?))").bind(ip, t - 86_400, m.a, m.b, m.b, m.a),
  ]);
  const counted = (hour?.results[0]?.n ?? 0) < 40 && (same?.results[0]?.n ?? 0) === 0;
  if (counted) {
    const reveal = await recordVote(c.env, m, winner, ip);
    if (!reveal) return c.json({ error: "not found" }, 404);
    return c.json({ ...reveal, counted: true, crowd: await crowd(c.env, m.a, m.b) });
  }
  return c.json({ ...(await revealOnly(c.env, m.a, m.b)), winner, counted: false, crowd: await crowd(c.env, m.a, m.b) });
});

const SUBMISSIONS_PER_DAY = 10;

// Community entries: anyone can add their model's drawing to an SVG prompt. The model name is self-reported.
api.post("/arena/submit", async (c) => {
  const form = await c.req.formData().catch(() => null);
  const get = (k: string) => String(form?.get(k) ?? "");
  let prompt = get("prompt");
  const back = (msg: string) => c.redirect(`/arena/svg?p=${encodeURIComponent(prompt)}&submitted=${encodeURIComponent(msg)}#submit`, 303);
  if (get("website")) return back("Thanks!");
  const ip0 = await ipHash(c.req.raw, c.env.ADMIN_TOKEN ?? "vesta");
  let newPrompt = "";
  if (prompt === "__new") {
    newPrompt = cleanText(get("new_prompt"), 140);
    if (newPrompt.length < 12) return back("Write the new prompt (at least a few words), e.g. \"Generate an SVG of a capybara running a startup\".");
    const started = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM arena_prompts WHERE ip_hash = ? AND created_at > ?").bind(ip0, now() - 86_400).first<{ n: number }>();
    if ((started?.n ?? 0) >= 3) return back("You've started 3 challenges today. Add drawings to existing ones, or come back tomorrow.");
  } else {
    const row = await c.env.DB.prepare("SELECT id FROM arena_prompts WHERE id = ? AND kind = 'svg' AND hidden = 0 AND (live_from IS NULL OR live_from <= date('now'))").bind(prompt).first();
    if (!row) return back("Pick a prompt first.");
  }
  const model = cleanText(get("model"), 60);
  if (!model) return back("Say which model made it, e.g. GPT-6 Luna or Llama 5.");
  let svg: string;
  try {
    svg = checkSvg(get("svg"));
  } catch (e) {
    return back((e as Error).message);
  }
  const ip = await ipHash(c.req.raw, c.env.ADMIN_TOKEN ?? "vesta");
  const t = now();
  const recent = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM arena_entries WHERE ip_hash = ? AND created_at > ?").bind(ip, t - 86_400).first<{ n: number }>();
  if ((recent?.n ?? 0) >= SUBMISSIONS_PER_DAY) return back(`That's ${SUBMISSIONS_PER_DAY} entries today. Come back tomorrow.`);
  const author = cleanText(get("author"), 40);
  if (newPrompt) {
    const base = newPrompt.toLowerCase().replace(/^generate an svg of (an? )?/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "") || "challenge";
    prompt = `${base}-${svgSlug().slice(4, 8)}`;
    await c.env.DB.prepare("INSERT INTO arena_prompts (id, title, prompt, kind, community, author, ip_hash, created_at) VALUES (?, ?, ?, 'svg', 1, ?, ?, ?)")
      .bind(prompt, newPrompt.slice(0, 80), newPrompt, author, ip, t)
      .run();
  }
  const slug = svgSlug();
  const key = `svg/${slug}.svg`;
  await c.env.FILES.put(key, svg, { httpMetadata: { contentType: "image/svg+xml" } });
  await c.env.DB.prepare(
    "INSERT INTO arena_entries (slug, prompt, model, lab, kind, file_key, community, author, ip_hash, created_at) VALUES (?, ?, ?, '', 'svg', ?, 1, ?, ?, ?)",
  )
    .bind(slug, prompt, model, key, author, ip, t)
    .run();
  if (newPrompt) {
    const msg = "Your challenge is live. Share it: once someone adds a second drawing, it shows up in blind matchups.";
    return c.redirect(`/arena/svg/p/${prompt}?submitted=${encodeURIComponent(msg)}`, 303);
  }
  const msg = "Your drawing is in the arena. It joins blind matchups now. Share it and see how it ranks.";
  return c.redirect(`/arena/e/${slug}?submitted=${encodeURIComponent(msg)}`, 303);
});

// Anyone can report an arena entry. Three distinct reports hide a community entry until the owner looks.
api.post("/arena/entries/:slug/report", async (c) => {
  const slug = c.req.param("slug");
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) return c.json({ error: "bad entry" }, 400);
  const row = await c.env.DB.prepare("SELECT community, prompt FROM arena_entries WHERE slug = ?").bind(slug).first<{ community: number; prompt: string }>();
  if (!row) return c.json({ error: "not found" }, 404);
  const ip = await ipHash(c.req.raw, c.env.ADMIN_TOKEN ?? "vesta");
  await c.env.DB.prepare("INSERT OR IGNORE INTO reports (slug, ip_hash, reason, created_at) VALUES (?, ?, 'arena entry', ?)").bind(slug, ip, now()).run();
  const n = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM reports WHERE slug = ?").bind(slug).first<{ n: number }>();
  if (row.community && (n?.n ?? 0) >= REPORTS_TO_HIDE) {
    await c.env.DB.prepare("UPDATE arena_entries SET hidden = 1 WHERE slug = ?").bind(slug).run();
    // A community challenge whose opening drawing gets hidden is hidden too, so a bad prompt can't stay up.
    await c.env.DB.prepare("UPDATE arena_prompts SET hidden = 1 WHERE id = ? AND community = 1 AND NOT EXISTS (SELECT 1 FROM arena_entries WHERE prompt = ? AND hidden = 0)").bind(row.prompt, row.prompt).run();
  }
  return c.json({ ok: true });
});

api.get("/games/:slug", async (c) => {
  const game = await getGame(c.env, slugParam(c));
  if (!game || (game.hidden && !(await isAdmin(c)))) return c.json({ error: "not found" }, 404);
  return c.json({ ...game, url: `${siteUrl(c)}/g/${game.slug}`, playUrl: game.version ? playBase(c.env, game.slug, game.version) : null });
});

api.get("/games/:slug/scores", async (c) => {
  const slug = slugParam(c);
  c.header("cache-control", "public, max-age=15");
  return c.json({ scores: await topScores(c.env, slug, Math.min(50, Math.max(1, Number(c.req.query("limit")) || 10))) });
});

api.post("/games/:slug/like", async (c) => {
  const slug = slugParam(c);
  const game = await getGame(c.env, slug);
  if (!game || !game.version) return c.json({ error: "not found" }, 404);
  const hash = await ipHash(c.req.raw, c.env.ADMIN_TOKEN ?? "vesta");
  const res = await c.env.DB.prepare("INSERT OR IGNORE INTO likes (slug, ip_hash, created_at) VALUES (?, ?, ?)").bind(slug, hash, now()).run();
  if (res.meta.changes) await c.env.DB.prepare("UPDATE games SET likes = likes + 1 WHERE slug = ?").bind(slug).run();
  return c.json({ likes: game.likes + (res.meta.changes ? 1 : 0), liked: true });
});

// Reviews: one per visitor per game. Posting again changes your review.
api.post("/games/:slug/review", async (c) => {
  const slug = slugParam(c);
  const form = await c.req.formData().catch(() => null);
  const get = (k: string) => String(form?.get(k) ?? "");
  const back = (msg: string) => c.redirect(`/g/${slug}?review=${encodeURIComponent(msg)}#reviews`, 303);
  if (get("website")) return back("Thanks!");
  const vote = get("vote");
  if (vote !== "up" && vote !== "down") return back("Pick Recommended or Not recommended.");
  const game = await getGame(c.env, slug);
  if (!game || !game.version || game.hidden) return back("Game not found.");
  const body = cleanText(get("body"), 1000);
  const ip = await ipHash(c.req.raw, c.env.ADMIN_TOKEN ?? "vesta");
  await c.env.DB.prepare(
    `INSERT INTO reviews (slug, ip_hash, up, body, version, created_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (slug, ip_hash) DO UPDATE SET up = excluded.up, body = excluded.body, version = excluded.version, created_at = excluded.created_at`,
  )
    .bind(slug, ip, vote === "up" ? 1 : 0, body, game.version, now())
    .run();
  await recount(c.env, slug);
  if (body) {
    const hook = await c.env.DB.prepare("SELECT webhook_url FROM games WHERE slug = ?").bind(slug).first<{ webhook_url: string | null }>();
    if (hook?.webhook_url) c.executionCtx.waitUntil(notify(hook.webhook_url, `${vote === "up" ? "👍" : "👎"} New review of **${game.title}**:\n> ${body.slice(0, 600).replace(/\n/g, "\n> ")}\n${siteUrl(c)}/g/${slug}#reviews`));
  }
  return back("Thanks for the review.");
});

api.post("/games/:slug/comments", async (c) => {
  const slug = slugParam(c);
  const isForm = (c.req.header("content-type") ?? "").includes("form");
  const input = isForm ? Object.fromEntries((await c.req.formData()).entries()) : await c.req.json<Record<string, unknown>>().catch(() => ({}) as Record<string, unknown>);
  const back = (msg: string, status: 400 | 404 | 429 = 400) =>
    isForm ? c.redirect(`/g/${slug}?feedback=${encodeURIComponent(msg)}#feedback`, 303) : c.json({ error: msg }, status);

  // Bots fill in every field; people never see this one.
  if (cleanText(input.website, 200)) return isForm ? c.redirect(`/g/${slug}#feedback`, 303) : c.json({ ok: true });
  const body = cleanText(input.body, 1000);
  const name = cleanText(input.name, 40);
  if (body.length < 2) return back("Write a little more first.");
  const game = await getGame(c.env, slug);
  if (!game || !game.version || game.hidden) return back("Game not found.", 404);

  const hash = await ipHash(c.req.raw, c.env.ADMIN_TOKEN ?? "vesta");
  const recent = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM comments WHERE ip_hash = ? AND created_at > ?")
    .bind(hash, now() - 3600)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= 6) return back("That's a lot of feedback. Try again in an hour.", 429);

  const row = await c.env.DB.prepare(
    "INSERT INTO comments (slug, version, name, body, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id, version, name, body, created_at",
  )
    .bind(slug, game.version, name, body, hash, now())
    .first();
  const hook = await c.env.DB.prepare("SELECT webhook_url FROM games WHERE slug = ?").bind(slug).first<{ webhook_url: string | null }>();
  if (hook?.webhook_url) {
    c.executionCtx.waitUntil(
      notify(hook.webhook_url, `💬 New comment on **${game.title}** v${game.version}${name ? ` from ${name}` : ""}:\n> ${body.slice(0, 600).replace(/\n/g, "\n> ")}\n${siteUrl(c)}/g/${slug}#feedback`),
    );
  }
  return isForm ? c.redirect(`/g/${slug}?feedback=sent#feedback`, 303) : c.json({ comment: row });
});

// ---------- session (dashboard sign-in) ----------

api.post("/session", async (c) => {
  if (!tokenConfigured(c)) return c.json({ error: "ADMIN_TOKEN is not set" }, 503);
  const form = await c.req.formData().catch(() => null);
  const token = String(form?.get("token") ?? "");
  if (!safeEqual(token, c.env.ADMIN_TOKEN)) return c.redirect("/admin?error=1", 303);
  await startSession(c);
  return c.redirect("/admin", 303);
});

api.post("/session/end", (c) => {
  endSession(c);
  return c.redirect("/", 303);
});

// ---------- admin ----------

const admin = new Hono<AppEnv>();

admin.get("/me", requireAdmin, (c) => c.json({ ok: true, arcade: c.env.ARCADE_NAME, siteUrl: siteUrl(c), playUrl: c.env.PLAY_URL, version: VERSION }));

admin.put("/games/:slug", requireGameAccess, async (c) => {
  const slug = slugParam(c);
  const input = await c.req.json<Record<string, unknown>>().catch(() => ({}) as Record<string, unknown>);
  const existing = await getGameRow(c.env, slug);
  if (!existing && viaGameKey(c)) return c.json({ error: "not found" }, 404);
  const pick = <T,>(key: string, clean: (v: unknown) => T, fallback: T): T => (key in input ? clean(input[key]) : fallback);

  const title = pick("title", (v) => cleanText(v, 80), existing?.title ?? "") || slug;
  const description = pick("description", (v) => cleanText(v, 2000), existing?.description ?? "");
  const author = pick("author", (v) => cleanText(v, 60), existing?.author ?? "");
  const madeWith = pick("madeWith", (v) => JSON.stringify(cleanList(v, 8, 32)), existing?.made_with ?? "[]");
  const tags = pick("tags", (v) => JSON.stringify(cleanList(v, 8, 24).map((t) => t.toLowerCase())), existing?.tags ?? "[]");
  const sourceUrl = pick("sourceUrl", (v) => {
    const s = cleanText(v, 300);
    return /^https:\/\//.test(s) ? s : "";
  }, existing?.source_url ?? "");
  const keyboard = pick("keyboardRequired", (v) => (v ? 1 : 0), existing?.keyboard_required ?? 0);
  const aspect = pick("aspect", (v) => (typeof v === "string" && /^\d{1,4}\/\d{1,4}$/.test(v) ? v : "16/9"), existing?.aspect ?? "16/9");
  const t = now();

  await c.env.DB.prepare(
    `INSERT INTO games (slug, title, description, author, made_with, tags, source_url, keyboard_required, aspect, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (slug) DO UPDATE SET title = excluded.title, description = excluded.description, author = excluded.author,
       made_with = excluded.made_with, tags = excluded.tags, source_url = excluded.source_url,
       keyboard_required = excluded.keyboard_required, aspect = excluded.aspect, updated_at = excluded.updated_at`,
  )
    .bind(slug, title, description, author, madeWith, tags, sourceUrl, keyboard, aspect, t, t)
    .run();
  return c.json({ game: await getGame(c.env, slug), created: !existing });
});

admin.delete("/games/:slug", requireGameAccess, async (c) => {
  const slug = slugParam(c);
  await deletePrefix(c.env, `g/${slug}/`);
  await deletePrefix(c.env, `c/${slug}/`);
  await c.env.DB.batch(
    ["comments", "likes", "scores", "best_scores", "reports", "arena_entries", "reviews", "achievements", "versions", "daily_stats", "dropoff", "errors", "milestones", "games"].map((t) =>
      c.env.DB.prepare(`DELETE FROM ${t} WHERE slug = ?`).bind(slug),
    ),
  );
  return c.json({ deleted: slug });
});

admin.post("/games/:slug/hide", requireAdmin, async (c) => {
  const slug = slugParam(c);
  const { hidden } = await c.req.json<{ hidden?: boolean }>().catch(() => ({ hidden: true }));
  await c.env.DB.prepare("UPDATE games SET hidden = ? WHERE slug = ?").bind(hidden ? 1 : 0, slug).run();
  return c.json({ slug, hidden: !!hidden });
});

admin.post("/games/:slug/versions", requireGameAccess, async (c) => {
  const slug = slugParam(c);
  if (!(await getGameRow(c.env, slug))) return c.json({ error: "create the game first with PUT /api/games/:slug" }, 404);
  const input = await c.req.json<{ files?: unknown; notes?: unknown }>().catch(() => ({}) as { files?: unknown; notes?: unknown });
  const { files, totalBytes } = validateManifest(input.files);
  if (viaGameKey(c)) {
    if (totalBytes > COMMUNITY_MAX_BYTES) return c.json({ error: `community games can be up to ${COMMUNITY_MAX_BYTES >> 20} MB` }, 413);
    const recent = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM versions WHERE slug = ? AND created_at > ?").bind(slug, now() - 3600).first<{ n: number }>();
    if ((recent?.n ?? 0) >= COMMUNITY_VERSIONS_PER_HOUR) return c.json({ error: "too many versions this hour; try again later" }, 429);
  }
  await cleanupStaleUploads(c.env, slug);

  const last = await c.env.DB.prepare("SELECT MAX(n) AS n FROM versions WHERE slug = ?").bind(slug).first<{ n: number | null }>();
  const n = (last?.n ?? 0) + 1;
  await c.env.DB.prepare(
    "INSERT INTO versions (slug, n, status, notes, manifest, file_count, total_bytes, created_at) VALUES (?, ?, 'uploading', ?, ?, ?, ?, ?)",
  )
    .bind(slug, n, cleanText(input.notes, 500), JSON.stringify(files), files.length, totalBytes, now())
    .run();
  return c.json({ version: n, uploadUrl: `${siteUrl(c)}/api/games/${slug}/versions/${n}/files/`, files: files.length, totalBytes }, 201);
});

async function uploadingVersion(env: Env, slug: string, n: number): Promise<ManifestFile[] | null> {
  const row = await env.DB.prepare("SELECT manifest FROM versions WHERE slug = ? AND n = ? AND status = 'uploading'").bind(slug, n).first<{ manifest: string }>();
  return row ? (JSON.parse(row.manifest) as ManifestFile[]) : null;
}

admin.put("/games/:slug/versions/:n/files/*", requireGameAccess, async (c) => {
  const slug = slugParam(c);
  const n = Number(c.req.param("n"));
  const marker = `/versions/${n}/files/`;
  const rawPath = new URL(c.req.url).pathname;
  const path = validatePath(decodeURIComponent(rawPath.slice(rawPath.indexOf(marker) + marker.length)));

  const manifest = await uploadingVersion(c.env, slug, n);
  if (!manifest) return c.json({ error: `version ${n} is not accepting uploads` }, 409);
  const entry = manifest.find((f) => f.path === path);
  if (!entry) return c.json({ error: `${path} is not in this version's file list` }, 400);

  const body = await c.req.arrayBuffer();
  if (body.byteLength !== entry.size) return c.json({ error: `${path}: expected ${entry.size} bytes, got ${body.byteLength}` }, 400);
  await c.env.FILES.put(`g/${slug}/${n}/${path}`, body, { httpMetadata: { contentType: contentType(path) } });
  return c.json({ path, size: body.byteLength });
});

admin.post("/games/:slug/versions/:n/finalize", requireGameAccess, async (c) => {
  const slug = slugParam(c);
  const n = Number(c.req.param("n"));
  const manifest = await uploadingVersion(c.env, slug, n);
  if (!manifest) return c.json({ error: `version ${n} is not waiting to be finalized` }, 409);

  const stored = new Map<string, number>();
  const prefix = `g/${slug}/${n}/`;
  let cursor: string | undefined;
  do {
    const page = await c.env.FILES.list({ prefix, cursor });
    for (const o of page.objects) stored.set(o.key.slice(prefix.length), o.size);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  const missing = manifest.filter((f) => stored.get(f.path) !== f.size).map((f) => f.path);
  if (missing.length) return c.json({ error: `${missing.length} files are missing or the wrong size`, missing: missing.slice(0, 50) }, 409);

  const t = now();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE versions SET status = 'live', live_at = ? WHERE slug = ? AND n = ?").bind(t, slug, n),
    c.env.DB.prepare("UPDATE games SET current_version = ?, updated_at = ? WHERE slug = ?").bind(n, t, slug),
  ]);

  // Keep the newest few versions so storage stays inside the free tier.
  const { results: old } = await c.env.DB.prepare("SELECT n FROM versions WHERE slug = ? AND status = 'live' ORDER BY n DESC LIMIT -1 OFFSET ?")
    .bind(slug, KEEP_VERSIONS)
    .all<{ n: number }>();
  for (const o of old) {
    await deletePrefix(c.env, `g/${slug}/${o.n}/`);
    await c.env.DB.prepare("UPDATE versions SET status = 'pruned' WHERE slug = ? AND n = ?").bind(slug, o.n).run();
  }
  return c.json({ version: n, url: `${siteUrl(c)}/g/${slug}`, playUrl: playBase(c.env, slug, n), pruned: old.map((o) => o.n) });
});

admin.put("/games/:slug/cover", requireGameAccess, async (c) => {
  const slug = slugParam(c);
  const row = await getGameRow(c.env, slug);
  if (!row) return c.json({ error: "not found" }, 404);
  const type = (c.req.header("content-type") ?? "").split(";")[0]!.trim();
  const ext = COVER_TYPES[type];
  if (!ext) return c.json({ error: "cover must be PNG, JPEG, WebP or GIF" }, 415);
  const body = await c.req.arrayBuffer();
  if (body.byteLength > MAX_COVER_BYTES) return c.json({ error: "cover must be under 2 MB" }, 413);
  if (body.byteLength === 0) return c.json({ error: "empty cover" }, 400);
  const key = `c/${slug}/${now()}.${ext}`;
  await c.env.FILES.put(key, body, { httpMetadata: { contentType: type } });
  if (row.cover_key) await c.env.FILES.delete(row.cover_key);
  await c.env.DB.prepare("UPDATE games SET cover_key = ?, updated_at = ? WHERE slug = ?").bind(key, now(), slug).run();
  return c.json({ cover: `${siteUrl(c)}/cover/${slug}` });
});

admin.get("/games/:slug/feedback", requireGameAccess, async (c) => {
  const days = Math.min(90, Math.max(1, Number(c.req.query("days")) || 14));
  const report = await feedbackReport(c.env, slugParam(c), days);
  if (!report) return c.json({ error: "not found" }, 404);
  if (c.req.query("format") === "md") return c.text(reportMarkdown(report, siteUrl(c)), 200, { "content-type": "text/markdown; charset=utf-8" });
  return c.json(report);
});

admin.post("/comments/:id/hide", requireAdmin, async (c) => {
  const { hidden } = await c.req.json<{ hidden?: boolean }>().catch(() => ({ hidden: true }));
  await c.env.DB.prepare("UPDATE comments SET hidden = ? WHERE id = ?").bind(hidden ? 1 : 0, Number(c.req.param("id"))).run();
  return c.json({ id: Number(c.req.param("id")), hidden: !!hidden });
});

// Enter a game into a game-arena prompt. Community games (published with a game key) enter as community
// entries with a self-reported model; they get their own rating and never move the model leaderboard.
// Creator alerts: new comments and new crashes go to this Discord or Slack webhook. An empty url turns them off.
admin.put("/games/:slug/webhook", requireGameAccess, async (c) => {
  const slug = slugParam(c);
  const { url } = await c.req.json<{ url?: unknown }>().catch(() => ({}) as { url?: unknown });
  const u = typeof url === "string" ? url.trim() : "";
  if (u && !validWebhook(u)) return c.json({ error: "use a Discord webhook (https://discord.com/api/webhooks/…) or a Slack one (https://hooks.slack.com/services/…)" }, 400);
  if (!(await getGameRow(c.env, slug))) return c.json({ error: "not found" }, 404);
  await c.env.DB.prepare("UPDATE games SET webhook_url = ? WHERE slug = ?").bind(u || null, slug).run();
  if (u) {
    const g = await getGameRow(c.env, slug);
    c.executionCtx.waitUntil(notify(u, `✅ Vesta alerts are on for **${g?.title ?? slug}**. New player comments and new crashes will show up here.`));
  }
  return c.json({ slug, alerts: !!u });
});

admin.post("/games/:slug/arena", requireGameAccess, async (c) => {
  const slug = slugParam(c);
  const input = await c.req.json<{ prompt?: unknown; model?: unknown }>().catch(() => ({}) as Record<string, unknown>);
  const promptId = typeof input.prompt === "string" ? input.prompt : "";
  const prompt = await c.env.DB.prepare("SELECT id FROM arena_prompts WHERE id = ? AND kind = 'game' AND hidden = 0 AND (live_from IS NULL OR live_from <= date('now'))").bind(promptId).first();
  if (!prompt) {
    const { results } = await c.env.DB.prepare("SELECT id FROM arena_prompts WHERE kind = 'game' AND hidden = 0 AND (live_from IS NULL OR live_from <= date('now'))").all<{ id: string }>();
    return c.json({ error: `unknown arena prompt "${promptId}". Game prompts: ${results.map((r) => r.id).join(", ")}` }, 400);
  }
  const model = cleanText(input.model, 60);
  if (!model) return c.json({ error: "say which model made the game, e.g. --model \"GPT-6 Luna\"" }, 400);
  const game = await getGameRow(c.env, slug);
  if (!game?.current_version) return c.json({ error: "publish the game first" }, 404);
  const existing = await c.env.DB.prepare("SELECT community FROM arena_entries WHERE slug = ?").bind(slug).first<{ community: number }>();
  if (existing && !existing.community) return c.json({ error: "this game is one of the arena's own entries" }, 409);
  await c.env.DB.prepare(
    `INSERT INTO arena_entries (slug, prompt, model, lab, kind, community, author, created_at) VALUES (?, ?, ?, '', 'game', 1, ?, ?)
     ON CONFLICT (slug) DO UPDATE SET prompt = excluded.prompt, model = excluded.model, author = excluded.author`,
  )
    .bind(slug, promptId, model, game.author ?? "", now())
    .run();
  return c.json({ slug, prompt: promptId, model, arena: `${siteUrl(c)}/arena?p=${promptId}` });
});

admin.put("/arena/prompts/:id", requireAdmin, async (c) => {
  const id = validateSlug(c.req.param("id"));
  const input = await c.req.json<{ title?: unknown; prompt?: unknown; kind?: unknown; live_from?: unknown }>().catch(() => ({}) as Record<string, unknown>);
  const kind: ArenaKind = ARENA_KINDS.includes(input.kind as ArenaKind) ? (input.kind as ArenaKind) : "game";
  const liveFrom = typeof input.live_from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.live_from) ? input.live_from : null;
  await c.env.DB.prepare(
    `INSERT INTO arena_prompts (id, title, prompt, kind, live_from, created_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET title = excluded.title, prompt = excluded.prompt, kind = excluded.kind, live_from = excluded.live_from`,
  )
    .bind(id, cleanText(input.title, 80) || id, cleanText(input.prompt, 2000), kind, liveFrom, now())
    .run();
  return c.json({ id });
});

admin.put("/arena/entries/:slug", requireAdmin, async (c) => {
  const slug = slugParam(c);
  const input = await c.req.json<{ prompt?: unknown; model?: unknown; lab?: unknown }>().catch(() => ({}) as Record<string, unknown>);
  const prompt = validateSlug(input.prompt);
  const model = cleanText(input.model, 60);
  if (!model) return c.json({ error: "model is required" }, 400);
  if (!(await getGameRow(c.env, slug))) return c.json({ error: "publish the game first" }, 404);
  await c.env.DB.prepare(
    `INSERT INTO arena_entries (slug, prompt, model, lab, created_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (slug) DO UPDATE SET prompt = excluded.prompt, model = excluded.model, lab = excluded.lab`,
  )
    .bind(slug, prompt, model, cleanText(input.lab, 40), now())
    .run();
  return c.json({ slug, prompt, model });
});

// Entries the arena ran itself (they rate their model). Re-posting the same slug replaces the drawing.
admin.post("/arena/svg", requireAdmin, async (c) => {
  const input = await c.req.json<{ prompt?: unknown; model?: unknown; lab?: unknown; svg?: unknown; slug?: unknown }>().catch(() => ({}) as Record<string, unknown>);
  const prompt = validateSlug(input.prompt);
  const model = cleanText(input.model, 60);
  if (!model) return c.json({ error: "model is required" }, 400);
  let svg: string;
  try {
    svg = checkSvg(String(input.svg ?? ""));
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
  const slug = typeof input.slug === "string" && /^svg-[a-f0-9]{10}$/.test(input.slug) ? input.slug : svgSlug();
  const key = `svg/${slug}.svg`;
  await c.env.FILES.put(key, svg, { httpMetadata: { contentType: "image/svg+xml" } });
  await c.env.DB.prepare(
    `INSERT INTO arena_entries (slug, prompt, model, lab, kind, file_key, community, created_at) VALUES (?, ?, ?, ?, 'svg', ?, 0, ?)
     ON CONFLICT (slug) DO UPDATE SET prompt = excluded.prompt, model = excluded.model, lab = excluded.lab, file_key = excluded.file_key`,
  )
    .bind(slug, prompt, model, cleanText(input.lab, 40), key, now())
    .run();
  return c.json({ slug, prompt, model });
});

admin.post("/arena/entries/:slug/hide", requireAdmin, async (c) => {
  const { hidden } = await c.req.json<{ hidden?: boolean }>().catch(() => ({ hidden: true }));
  await c.env.DB.prepare("UPDATE arena_entries SET hidden = ? WHERE slug = ?").bind(hidden ? 1 : 0, c.req.param("slug")).run();
  return c.json({ slug: c.req.param("slug"), hidden: !!hidden });
});

api.route("/", admin);

// ---------- storage helpers ----------

export async function deletePrefix(env: Env, prefix: string): Promise<void> {
  let cursor: string | undefined;
  do {
    const page = await env.FILES.list({ prefix, cursor });
    if (page.objects.length) await env.FILES.delete(page.objects.map((o) => o.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}

/** Uploads abandoned for a day are deleted, so half-finished versions don't pile up in R2. */
async function cleanupStaleUploads(env: Env, slug: string): Promise<void> {
  const { results } = await env.DB.prepare("SELECT n FROM versions WHERE slug = ? AND status = 'uploading' AND created_at < ?")
    .bind(slug, now() - 86_400)
    .all<{ n: number }>();
  for (const r of results) {
    await deletePrefix(env, `g/${slug}/${r.n}/`);
    await env.DB.prepare("DELETE FROM versions WHERE slug = ? AND n = ?").bind(slug, r.n).run();
  }
}
