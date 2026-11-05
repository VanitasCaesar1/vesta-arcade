// AI Arena data: blind matchups between models that built a game from the same prompt.
import type { Env } from "../lib/env.ts";
import { hmac, now, safeEqual } from "../lib/util.ts";
import { getGame, type Game } from "./db.ts";

export interface ArenaPrompt {
  id: string;
  title: string;
  prompt: string;
}
export interface ArenaEntry {
  slug: string;
  prompt: string;
  model: string;
  lab: string;
  rating: number;
  wins: number;
  losses: number;
  ties: number;
}
export interface ArenaModel {
  model: string;
  lab: string;
  rating: number;
  wins: number;
  losses: number;
  ties: number;
}
export interface Matchup {
  prompt: ArenaPrompt;
  a: Game;
  b: Game;
  token: string;
}

const K = 24;
const TOKEN_TTL = 6 * 3600;
const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

export async function isArenaEntry(env: Env, slug: string): Promise<boolean> {
  return !!(await env.DB.prepare("SELECT 1 FROM arena_entries WHERE slug = ?").bind(slug).first());
}

/** A random prompt with at least two live entries from different models, and two of them in random order. */
export async function randomMatchup(env: Env, promptId?: string): Promise<Matchup | null> {
  const { results } = await env.DB.prepare(
    `SELECT e.slug, e.prompt, e.model FROM arena_entries e JOIN games g ON g.slug = e.slug WHERE g.current_version IS NOT NULL`,
  ).all<{ slug: string; prompt: string; model: string }>();
  const byPrompt = new Map<string, typeof results>();
  for (const r of results) byPrompt.set(r.prompt, [...(byPrompt.get(r.prompt) ?? []), r]);
  const eligible = [...byPrompt].filter(([, es]) => new Set(es.map((e) => e.model)).size >= 2).map(([p]) => p);
  if (!eligible.length) return null;
  const pid = promptId && eligible.includes(promptId) ? promptId : pick(eligible);
  const entries = byPrompt.get(pid)!;
  const first = pick(entries);
  const second = pick(entries.filter((e) => e.model !== first.model));
  const [a, b] = Math.random() < 0.5 ? [first, second] : [second, first];
  const [prompt, ga, gb] = await Promise.all([
    env.DB.prepare("SELECT id, title, prompt FROM arena_prompts WHERE id = ?").bind(pid).first<ArenaPrompt>(),
    getGame(env, a.slug),
    getGame(env, b.slug),
  ]);
  if (!prompt || !ga || !gb) return null;
  return { prompt, a: ga, b: gb, token: await signMatchup(env, pid, a.slug, b.slug) };
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

/** Records a vote and updates Elo for both entries and both models. Returns the reveal. */
export async function recordVote(env: Env, m: { prompt: string; a: string; b: string }, winner: "a" | "b" | "tie", ipHash: string) {
  const { results } = await env.DB.prepare("SELECT * FROM arena_entries WHERE slug IN (?, ?)").bind(m.a, m.b).all<ArenaEntry>();
  const ea = results.find((r) => r.slug === m.a);
  const eb = results.find((r) => r.slug === m.b);
  if (!ea || !eb) return null;
  const { results: models } = await env.DB.prepare("SELECT * FROM arena_models WHERE model IN (?, ?)").bind(ea.model, eb.model).all<ArenaModel>();
  const ma = models.find((x) => x.model === ea.model) ?? { model: ea.model, lab: ea.lab, rating: 1000, wins: 0, losses: 0, ties: 0 };
  const mb = models.find((x) => x.model === eb.model) ?? { model: eb.model, lab: eb.lab, rating: 1000, wins: 0, losses: 0, ties: 0 };
  const sa = winner === "a" ? 1 : winner === "b" ? 0 : 0.5;
  const da = K * (sa - expected(ea.rating, eb.rating));
  const dm = K * (sa - expected(ma.rating, mb.rating));
  const col = (side: "a" | "b") => (winner === "tie" ? "ties" : winner === side ? "wins" : "losses");
  const t = now();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO arena_votes (prompt, a, b, winner, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(m.prompt, m.a, m.b, winner, ipHash, t),
    env.DB.prepare(`UPDATE arena_entries SET rating = rating + ?, ${col("a")} = ${col("a")} + 1 WHERE slug = ?`).bind(da, m.a),
    env.DB.prepare(`UPDATE arena_entries SET rating = rating - ?, ${col("b")} = ${col("b")} + 1 WHERE slug = ?`).bind(da, m.b),
    env.DB.prepare(
      `INSERT INTO arena_models (model, lab, rating, ${col("a")}) VALUES (?, ?, ?, 1)
       ON CONFLICT (model) DO UPDATE SET rating = rating + ?, ${col("a")} = ${col("a")} + 1`,
    ).bind(ma.model, ma.lab, 1000 + dm, dm),
    env.DB.prepare(
      `INSERT INTO arena_models (model, lab, rating, ${col("b")}) VALUES (?, ?, ?, 1)
       ON CONFLICT (model) DO UPDATE SET rating = rating - ?, ${col("b")} = ${col("b")} + 1`,
    ).bind(mb.model, mb.lab, 1000 - dm, dm),
  ]);
  return { a: { model: ea.model, lab: ea.lab, slug: ea.slug }, b: { model: eb.model, lab: eb.lab, slug: eb.slug }, winner };
}

export async function leaderboard(env: Env) {
  const [models, entries, prompts, votes] = await env.DB.batch<Record<string, unknown>>([
    env.DB.prepare("SELECT * FROM arena_models ORDER BY rating DESC"),
    env.DB.prepare("SELECT e.*, g.title FROM arena_entries e JOIN games g ON g.slug = e.slug ORDER BY e.prompt, e.rating DESC"),
    env.DB.prepare("SELECT id, title, prompt FROM arena_prompts ORDER BY created_at"),
    env.DB.prepare("SELECT COUNT(*) AS n FROM arena_votes"),
  ]);
  return {
    models: (models?.results ?? []) as unknown as ArenaModel[],
    entries: (entries?.results ?? []) as unknown as (ArenaEntry & { title: string })[],
    prompts: (prompts?.results ?? []) as unknown as ArenaPrompt[],
    votes: Number((votes?.results[0] as { n?: number } | undefined)?.n ?? 0),
  };
}

/** "Claude and Gemini", "Claude, GPT and Gemini": the model families that have entries, for page copy. */
export async function arenaNames(env: Env): Promise<string> {
  const { results } = await env.DB.prepare("SELECT DISTINCT model FROM arena_entries ORDER BY model").all<{ model: string }>();
  const names = [...new Set(results.map((r) => r.model.split(" ")[0]!))];
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
