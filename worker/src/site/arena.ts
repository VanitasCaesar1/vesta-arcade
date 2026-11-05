// AI Arena data: blind matchups between models that made something from the same prompt.
// Kinds: "game" (a published game, played in a frame) and "svg" (a drawing, shown as an image).
// Entries the arena ran itself rate their model; community entries (model self-reported)
// only rate themselves, so nobody can move the model leaderboard by uploading.
import type { Env } from "../lib/env.ts";
import { hmac, now, safeEqual } from "../lib/util.ts";
import { getGame, type Game } from "./db.ts";

export type ArenaKind = "game" | "svg";
export const ARENA_KINDS: ArenaKind[] = ["game", "svg"];

export interface ArenaPrompt {
  id: string;
  title: string;
  prompt: string;
  kind: ArenaKind;
}
export interface ArenaEntry {
  slug: string;
  prompt: string;
  model: string;
  lab: string;
  kind: ArenaKind;
  file_key: string | null;
  community: number;
  author: string;
  rating: number;
  wins: number;
  losses: number;
  ties: number;
}
export interface ArenaModel {
  model: string;
  kind: ArenaKind;
  lab: string;
  rating: number;
  wins: number;
  losses: number;
  ties: number;
}
export interface Side {
  slug: string;
  game?: Game;
  /** Path of the SVG on the play origin, e.g. /svg/svg-1a2b3c4d.svg */
  svg?: string;
}
export interface Matchup {
  kind: ArenaKind;
  prompt: ArenaPrompt;
  a: Side;
  b: Side;
  token: string;
}

const K = 24;
const TOKEN_TTL = 6 * 3600;
const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

export async function isArenaEntry(env: Env, slug: string): Promise<boolean> {
  return !!(await env.DB.prepare("SELECT 1 FROM arena_entries WHERE slug = ?").bind(slug).first());
}

export async function arenaPrompts(env: Env, kind?: ArenaKind): Promise<ArenaPrompt[]> {
  const q = kind
    ? env.DB.prepare("SELECT id, title, prompt, kind FROM arena_prompts WHERE kind = ? ORDER BY created_at").bind(kind)
    : env.DB.prepare("SELECT id, title, prompt, kind FROM arena_prompts ORDER BY kind, created_at");
  return (await q.all<ArenaPrompt>()).results;
}

/** A random prompt of this kind with two visible entries, preferring two different models, in random order. */
export async function randomMatchup(env: Env, kind: ArenaKind, promptId?: string): Promise<Matchup | null> {
  const { results } =
    kind === "game"
      ? await env.DB.prepare(
          `SELECT e.slug, e.prompt, e.model, e.file_key FROM arena_entries e JOIN games g ON g.slug = e.slug
           WHERE e.kind = 'game' AND e.hidden = 0 AND g.current_version IS NOT NULL`,
        ).all<{ slug: string; prompt: string; model: string; file_key: string | null }>()
      : await env.DB.prepare("SELECT slug, prompt, model, file_key FROM arena_entries WHERE kind = 'svg' AND hidden = 0 AND file_key IS NOT NULL").all<{
          slug: string;
          prompt: string;
          model: string;
          file_key: string | null;
        }>();
  const byPrompt = new Map<string, typeof results>();
  for (const r of results) byPrompt.set(r.prompt, [...(byPrompt.get(r.prompt) ?? []), r]);
  const eligible = [...byPrompt].filter(([, es]) => es.length >= 2).map(([p]) => p);
  if (!eligible.length) return null;
  const pid = promptId && eligible.includes(promptId) ? promptId : pick(eligible);
  const entries = byPrompt.get(pid)!;
  const first = pick(entries);
  const others = entries.filter((e) => e.slug !== first.slug);
  const differentModel = others.filter((e) => e.model !== first.model);
  const second = pick(differentModel.length ? differentModel : others);
  const [a, b] = Math.random() < 0.5 ? [first, second] : [second, first];
  const prompt = await env.DB.prepare("SELECT id, title, prompt, kind FROM arena_prompts WHERE id = ?").bind(pid).first<ArenaPrompt>();
  if (!prompt) return null;
  const side = async (e: typeof a): Promise<Side | null> => {
    if (kind === "svg") return { slug: e.slug, svg: `/${e.file_key}` };
    const game = await getGame(env, e.slug);
    return game ? { slug: e.slug, game } : null;
  };
  const [sa, sb] = await Promise.all([side(a), side(b)]);
  if (!sa || !sb) return null;
  return { kind, prompt, a: sa, b: sb, token: await signMatchup(env, pid, a.slug, b.slug) };
}

async function signMatchup(env: Env, prompt: string, a: string, b: string): Promise<string> {
  const exp = now() + TOKEN_TTL;
  const body = `${prompt}|${a}|${b}|${exp}`;
  return `${body}|${await hmac(env.ADMIN_TOKEN ?? "vesta", `arena:${body}`)}`;
}

export async function verifyMatchup(env: Env, token: unknown): Promise<{ prompt: string; a: string; b: string } | null> {
  if (typeof token !== "string" || token.length > 400) return null;
  const parts = token.split("|");
  if (parts.length !== 5) return null;
  const [prompt, a, b, exp, sig] = parts as [string, string, string, string, string];
  if (Number(exp) < now()) return null;
  const want = await hmac(env.ADMIN_TOKEN ?? "vesta", `arena:${prompt}|${a}|${b}|${exp}`);
  return safeEqual(sig, want) ? { prompt, a, b } : null;
}

const expected = (ra: number, rb: number) => 1 / (1 + 10 ** ((rb - ra) / 400));

const reveal = (e: ArenaEntry) => ({ model: e.model, lab: e.lab, slug: e.slug, community: !!e.community, author: e.author, kind: e.kind });

/** Records a vote and updates Elo for both entries, and for both models when neither entry is a community one. */
export async function recordVote(env: Env, m: { prompt: string; a: string; b: string }, winner: "a" | "b" | "tie", ipHash: string) {
  const { results } = await env.DB.prepare("SELECT * FROM arena_entries WHERE slug IN (?, ?)").bind(m.a, m.b).all<ArenaEntry>();
  const ea = results.find((r) => r.slug === m.a);
  const eb = results.find((r) => r.slug === m.b);
  if (!ea || !eb) return null;
  const sa = winner === "a" ? 1 : winner === "b" ? 0 : 0.5;
  const da = K * (sa - expected(ea.rating, eb.rating));
  const col = (side: "a" | "b") => (winner === "tie" ? "ties" : winner === side ? "wins" : "losses");
  const t = now();
  const stmts = [
    env.DB.prepare("INSERT INTO arena_votes (prompt, a, b, winner, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(m.prompt, m.a, m.b, winner, ipHash, t),
    env.DB.prepare(`UPDATE arena_entries SET rating = rating + ?, ${col("a")} = ${col("a")} + 1 WHERE slug = ?`).bind(da, m.a),
    env.DB.prepare(`UPDATE arena_entries SET rating = rating - ?, ${col("b")} = ${col("b")} + 1 WHERE slug = ?`).bind(da, m.b),
  ];
  if (!ea.community && !eb.community && ea.model !== eb.model) {
    const kind = ea.kind;
    const { results: models } = await env.DB.prepare("SELECT * FROM arena_model_ratings WHERE kind = ? AND model IN (?, ?)").bind(kind, ea.model, eb.model).all<ArenaModel>();
    const ma = models.find((x) => x.model === ea.model)?.rating ?? 1000;
    const mb = models.find((x) => x.model === eb.model)?.rating ?? 1000;
    const dm = K * (sa - expected(ma, mb));
    const upsert = (e: ArenaEntry, side: "a" | "b", delta: number) =>
      env.DB.prepare(
        `INSERT INTO arena_model_ratings (model, kind, lab, rating, ${col(side)}) VALUES (?, ?, ?, ?, 1)
         ON CONFLICT (model, kind) DO UPDATE SET rating = rating + ?, ${col(side)} = ${col(side)} + 1`,
      ).bind(e.model, kind, e.lab, 1000 + delta, delta);
    stmts.push(upsert(ea, "a", dm), upsert(eb, "b", -dm));
  }
  await env.DB.batch(stmts);
  return { a: reveal(ea), b: reveal(eb), winner };
}

export async function revealOnly(env: Env, a: string, b: string) {
  const { results } = await env.DB.prepare("SELECT * FROM arena_entries WHERE slug IN (?, ?)").bind(a, b).all<ArenaEntry>();
  const ea = results.find((r) => r.slug === a);
  const eb = results.find((r) => r.slug === b);
  return ea && eb ? { a: reveal(ea), b: reveal(eb) } : null;
}

export async function leaderboard(env: Env) {
  const [models, entries, prompts, votes] = await env.DB.batch<Record<string, unknown>>([
    env.DB.prepare("SELECT * FROM arena_model_ratings ORDER BY kind, rating DESC"),
    env.DB.prepare(
      `SELECT e.*, COALESCE(g.title, '') AS title FROM arena_entries e LEFT JOIN games g ON g.slug = e.slug
       WHERE e.hidden = 0 ORDER BY e.prompt, e.rating DESC`,
    ),
    env.DB.prepare("SELECT id, title, prompt, kind FROM arena_prompts ORDER BY kind, created_at"),
    env.DB.prepare("SELECT COUNT(*) AS n FROM arena_votes"),
  ]);
  return {
    models: (models?.results ?? []) as unknown as ArenaModel[],
    entries: (entries?.results ?? []) as unknown as (ArenaEntry & { title: string })[],
    prompts: (prompts?.results ?? []) as unknown as ArenaPrompt[],
    votes: Number((votes?.results[0] as { n?: number } | undefined)?.n ?? 0),
  };
}

/** "Claude and Gemini", "Claude, GPT and Gemini": model families the arena ran itself, for page copy. */
export async function arenaNames(env: Env): Promise<string> {
  const { results } = await env.DB.prepare("SELECT DISTINCT model FROM arena_entries WHERE community = 0 ORDER BY model").all<{ model: string }>();
  const names = [...new Set(results.map((r) => r.model.split(" ")[0]!))];
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// ---------- SVG entries ----------

export const MAX_SVG_BYTES = 100 * 1024;

/**
 * Accepts a standalone SVG and rejects anything that could run code or load from elsewhere.
 * SVGs are only ever shown through <img> (which runs no scripts) and served from the play
 * origin with a sandboxing CSP, so this is a second line of defence, not the only one.
 */
export function checkSvg(raw: string): string {
  const svg = raw.trim().replace(/^<\?xml[^>]*\?>\s*/i, "").replace(/^<!DOCTYPE[^>]*>\s*/i, "");
  if (new TextEncoder().encode(svg).length > MAX_SVG_BYTES) throw new Error("SVG must be under 100 KB");
  if (!/^<svg[\s>]/i.test(svg) || !/<\/svg>\s*$/i.test(svg)) throw new Error("Paste a single SVG: it should start with <svg and end with </svg>");
  const banned: [RegExp, string][] = [
    [/<script/i, "scripts"],
    [/<foreignObject/i, "foreignObject"],
    [/<(iframe|embed|object|image|use)\b[^>]*\b(x?link:)?href\s*=\s*["']?\s*(https?:|\/\/|data:text)/i, "external or embedded documents"],
    [/\son[a-z]+\s*=/i, "event handlers (onclick, onload…)"],
    [/javascript:/i, "javascript: links"],
    [/@import|url\(\s*["']?\s*(https?:|\/\/)/i, "external resources"],
    [/\b(x?link:)?href\s*=\s*["']\s*(https?:|\/\/)/i, "links to other sites"],
  ];
  for (const [re, what] of banned) if (re.test(svg)) throw new Error(`SVGs can't contain ${what}`);
  return svg;
}

export function svgSlug(): string {
  const b = crypto.getRandomValues(new Uint8Array(5));
  return "svg-" + Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

/** How everyone voted on this pair, in either order: picks per entry slug, ties and total. */
export async function crowd(env: Env, a: string, b: string): Promise<{ picks: Record<string, number>; ties: number; total: number }> {
  const { results } = await env.DB.prepare(
    "SELECT a, b, winner, COUNT(*) AS n FROM arena_votes WHERE (a = ? AND b = ?) OR (a = ? AND b = ?) GROUP BY a, b, winner",
  )
    .bind(a, b, b, a)
    .all<{ a: string; b: string; winner: "a" | "b" | "tie"; n: number }>();
  const picks: Record<string, number> = { [a]: 0, [b]: 0 };
  let ties = 0;
  for (const r of results) {
    if (r.winner === "tie") ties += r.n;
    else picks[r.winner === "a" ? r.a : r.b] = (picks[r.winner === "a" ? r.a : r.b] ?? 0) + r.n;
  }
  return { picks, ties, total: (picks[a] ?? 0) + (picks[b] ?? 0) + ties };
}
