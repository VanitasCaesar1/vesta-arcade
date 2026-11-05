// Steam-style review summaries. Thresholds follow Steam's published scale.
import type { Env } from "../lib/env.ts";

export interface ReviewRow {
  up: number;
  body: string;
  version: number | null;
  created_at: number;
}

export function reviewLabel(up: number, total: number): { label: string; tone: "pos" | "mixed" | "neg" | "none" } {
  if (total < 1) return { label: "No reviews yet", tone: "none" };
  const pct = (up / total) * 100;
  if (total < 10) return { label: `${total} user ${total === 1 ? "review" : "reviews"}`, tone: pct >= 70 ? "pos" : pct >= 40 ? "mixed" : "neg" };
  if (pct >= 95 && total >= 500) return { label: "Overwhelmingly Positive", tone: "pos" };
  if (pct >= 80 && total >= 50) return { label: "Very Positive", tone: "pos" };
  if (pct >= 80) return { label: "Positive", tone: "pos" };
  if (pct >= 70) return { label: "Mostly Positive", tone: "pos" };
  if (pct >= 40) return { label: "Mixed", tone: "mixed" };
  if (pct >= 20) return { label: "Mostly Negative", tone: "neg" };
  if (total >= 500) return { label: "Overwhelmingly Negative", tone: "neg" };
  if (total >= 50) return { label: "Very Negative", tone: "neg" };
  return { label: "Negative", tone: "neg" };
}

export async function recentReviews(env: Env, slug: string, limit = 12): Promise<ReviewRow[]> {
  const { results } = await env.DB.prepare(
    "SELECT up, body, version, created_at FROM reviews WHERE slug = ? AND hidden = 0 AND body != '' ORDER BY created_at DESC LIMIT ?",
  )
    .bind(slug, limit)
    .all<ReviewRow>();
  return results;
}

/** Recounts a game's totals from its reviews, so changing your mind never drifts the numbers. */
export async function recount(env: Env, slug: string): Promise<void> {
  await env.DB.prepare(
    `UPDATE games SET
       reviews_up = (SELECT COUNT(*) FROM reviews WHERE slug = ? AND hidden = 0 AND up = 1),
       reviews_total = (SELECT COUNT(*) FROM reviews WHERE slug = ? AND hidden = 0)
     WHERE slug = ?`,
  )
    .bind(slug, slug, slug)
    .run();
}
