// Turns beacons from the injected script into daily totals and grouped errors.
import type { Env } from "../lib/env.ts";
import { validateSlug } from "../lib/manifest.ts";
import { now, sessionBucket, sha256, today } from "../lib/util.ts";

const MAX_BODY = 32 * 1024;
const PER_MINUTE = 120;

// Best-effort limits. Each Worker isolate has its own copy, which is enough to
// stop one tab in a loop from flooding the database.
const hits = new Map<string, { minute: number; n: number }>();
const liveVersions = new Map<string, { live: boolean; until: number }>();

type Event =
  | { t: "start" }
  | { t: "time"; s: number; prev: number; total: number }
  | { t: "err"; k: string; m: string; src: string; l: number; c: number; st: string }
  | { t: "ms"; n: string };

function limited(req: Request): boolean {
  const ip = req.headers.get("cf-connecting-ip") ?? "local";
  const minute = Math.floor(Date.now() / 60_000);
  const h = hits.get(ip);
  if (!h || h.minute !== minute) {
    if (hits.size > 10_000) hits.clear();
    hits.set(ip, { minute, n: 1 });
    return false;
  }
  return ++h.n > PER_MINUTE;
}

export async function isLive(env: Env, slug: string, version: number): Promise<boolean> {
  const key = `${slug}/${version}`;
  const cached = liveVersions.get(key);
  if (cached && cached.until > Date.now()) return cached.live;
  const row = await env.DB.prepare("SELECT 1 FROM versions WHERE slug = ? AND n = ? AND status = 'live'").bind(slug, version).first();
  if (liveVersions.size > 5_000) liveVersions.clear();
  liveVersions.set(key, { live: !!row, until: Date.now() + 60_000 });
  return !!row;
}

const ok = () => new Response(null, { status: 204, headers: { "access-control-allow-origin": "*" } });

export async function ingest(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (limited(req)) return new Response(null, { status: 429 });
  const text = await req.text();
  if (text.length > MAX_BODY) return new Response(null, { status: 413 });

  let body: { g?: unknown; v?: unknown; ev?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  let slug: string;
  try {
    slug = validateSlug(body.g);
  } catch {
    return new Response(null, { status: 400 });
  }
  const version = Number(body.v);
  if (!Number.isSafeInteger(version) || version < 1 || !Array.isArray(body.ev)) return new Response(null, { status: 400 });
  if (!(await isLive(env, slug, version))) return ok();

  const day = today();
  const t = now();
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 200);
  const stmts: D1PreparedStatement[] = [];
  const upsertDay = (column: "plays" | "sessions" | "seconds" | "errors", by: number) =>
    env.DB.prepare(
      `INSERT INTO daily_stats (slug, day, ${column}) VALUES (?, ?, ?)
       ON CONFLICT (slug, day) DO UPDATE SET ${column} = ${column} + excluded.${column}`,
    ).bind(slug, day, by);
  const bumpBucket = (bucket: number, by: number) =>
    env.DB.prepare(
      `INSERT INTO dropoff (slug, version, bucket, count) VALUES (?, ?, ?, ?)
       ON CONFLICT (slug, version, bucket) DO UPDATE SET count = MAX(0, count + excluded.count)`,
    ).bind(slug, version, bucket, by);

  for (const raw of (body.ev as Event[]).slice(0, 20)) {
    if (!raw || typeof raw !== "object") continue;
    switch (raw.t) {
      case "start":
        stmts.push(upsertDay("plays", 1));
        stmts.push(env.DB.prepare("UPDATE games SET plays = plays + 1 WHERE slug = ?").bind(slug));
        stmts.push(env.DB.prepare("UPDATE versions SET plays = plays + 1 WHERE slug = ? AND n = ?").bind(slug, version));
        break;
      case "time": {
        const s = clampInt(raw.s, 0, 6 * 3600);
        const prev = clampInt(raw.prev, 0, 24 * 3600);
        const total = clampInt(raw.total, 0, 24 * 3600);
        if (s === 0 || total < prev) break;
        stmts.push(upsertDay("seconds", s));
        // Each session sits in exactly one length bucket: move it as the session grows.
        if (prev === 0) {
          stmts.push(upsertDay("sessions", 1));
          stmts.push(bumpBucket(sessionBucket(total), 1));
        } else if (sessionBucket(prev) !== sessionBucket(total)) {
          stmts.push(bumpBucket(sessionBucket(prev), -1));
          stmts.push(bumpBucket(sessionBucket(total), 1));
        }
        break;
      }
      case "err": {
        const kind = ["error", "rejection", "console", "resource", "game"].includes(raw.k) ? raw.k : "error";
        const message = str(raw.m, 500) || "Unknown error";
        const source = str(raw.src, 300);
        const line = clampInt(raw.l, 0, 10_000_000);
        const col = clampInt(raw.c, 0, 10_000_000);
        // Group by what the error is and where, ignoring numbers that change every time.
        const fingerprint = (await sha256(`${kind}|${message.replace(/\d+/g, "#")}|${source}|${line}`)).slice(0, 24);
        stmts.push(
          env.DB.prepare(
            `INSERT INTO errors (slug, version, fingerprint, kind, message, source, line, col, stack, user_agent, count, first_seen, last_seen)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
             ON CONFLICT (slug, version, fingerprint) DO UPDATE SET count = count + 1, last_seen = excluded.last_seen,
               stack = excluded.stack, user_agent = excluded.user_agent`,
          ).bind(slug, version, fingerprint, kind, message, source, line, col, str(raw.st, 4000), ua, t, t),
        );
        stmts.push(upsertDay("errors", 1));
        break;
      }
      case "ms": {
        const name = str(raw.n, 48).replace(/[^\w .:/-]/g, "");
        if (!name) break;
        stmts.push(
          env.DB.prepare(
            `INSERT INTO milestones (slug, version, name, count) VALUES (?, ?, ?, 1)
             ON CONFLICT (slug, version, name) DO UPDATE SET count = count + 1`,
          ).bind(slug, version, name),
        );
        break;
      }
    }
  }
  if (stmts.length) ctx.waitUntil(env.DB.batch(stmts).then(() => undefined, (e) => console.error("telemetry write failed", e)));
  return ok();
}

function clampInt(v: unknown, min: number, max: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}
