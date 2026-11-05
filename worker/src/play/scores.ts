// High scores, submitted from inside games by window.vesta.submitScore().
// Scores come from the player's browser, so they can be faked; the limits
// below keep the board readable, and the owner can hide any entry.
import type { Env } from "../lib/env.ts";
import { validateSlug } from "../lib/manifest.ts";
import { now, sha256 } from "../lib/util.ts";
import { isLive } from "./telemetry.ts";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function submitScore(req: Request, env: Env): Promise<Response> {
  let body: { g?: unknown; v?: unknown; score?: unknown; name?: unknown };
  try {
    const text = await req.text();
    if (text.length > 2048) return json({ error: "too large" }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "bad request" }, 400);
  }
  let slug: string;
  try {
    slug = validateSlug(body.g);
  } catch {
    return json({ error: "bad game" }, 400);
  }
  const version = Number(body.v);
  const score = Number(body.score);
  const name = String(body.name ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
  if (!Number.isSafeInteger(version) || !Number.isFinite(score) || Math.abs(score) > 1e12 || !name) return json({ error: "bad score" }, 400);
  if (!(await isLive(env, slug, version))) return json({ error: "game not live" }, 404);

  const ip = req.headers.get("cf-connecting-ip") ?? "local";
  const ipHash = (await sha256(`vesta-scores:${ip}`)).slice(0, 32);
  const t = now();
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM scores WHERE ip_hash = ? AND created_at > ?").bind(ipHash, t - 3600).first<{ n: number }>();
  if ((recent?.n ?? 0) >= 30) return json({ error: "slow down" }, 429);

  const inserted = await env.DB.prepare("INSERT INTO scores (slug, version, name, score, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(slug, version, name, score, ipHash, t)
    .run();
  const id = Number(inserted.meta.last_row_id);
  // Ranks place this run among other players' bests (one row per set of initials), so they read a bounded table.
  const [, rank, today, total] = await env.DB.batch<{ n: number }>([
    env.DB.prepare(
      `INSERT INTO best_scores (slug, name, score, score_id, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (slug, name) DO UPDATE SET score = excluded.score, score_id = excluded.score_id, created_at = excluded.created_at
       WHERE excluded.score > best_scores.score`,
    ).bind(slug, name, score, id, t),
    env.DB.prepare("SELECT COUNT(*) + 1 AS n FROM best_scores WHERE slug = ? AND name != ? AND score > ?").bind(slug, name, score),
    env.DB.prepare("SELECT COUNT(*) + 1 AS n FROM best_scores WHERE slug = ? AND name != ? AND score > ? AND created_at > ?").bind(slug, name, score, t - 86_400),
    env.DB.prepare("SELECT COUNT(*) AS n FROM best_scores WHERE slug = ?").bind(slug),
  ]);
  const n = (r: D1Result<{ n: number }> | undefined) => r?.results[0]?.n ?? 1;
  return json({ id, rank: n(rank), rankToday: n(today), total: n(total) });
}
