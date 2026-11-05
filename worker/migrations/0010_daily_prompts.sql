-- Daily challenges: a prompt can be scheduled to go live on a date (UTC, YYYY-MM-DD).
-- Until then it's invisible everywhere: matchups, lists, galleries and submissions.
ALTER TABLE arena_prompts ADD COLUMN live_from TEXT;
CREATE INDEX idx_arena_prompts_live ON arena_prompts (live_from);
