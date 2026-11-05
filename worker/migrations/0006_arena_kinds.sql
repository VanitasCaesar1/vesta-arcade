-- The arena covers more than games: SVG drawings now, other kinds later.
-- Community entries: anyone can submit their model's take on a prompt. The
-- model name is self-reported, so community votes rate the entry but never the
-- model; the model leaderboard counts only entries the arena ran itself.
ALTER TABLE arena_prompts ADD COLUMN kind TEXT NOT NULL DEFAULT 'game';
ALTER TABLE arena_entries ADD COLUMN kind TEXT NOT NULL DEFAULT 'game';
ALTER TABLE arena_entries ADD COLUMN file_key TEXT;                        -- R2 key, for SVG entries
ALTER TABLE arena_entries ADD COLUMN community INTEGER NOT NULL DEFAULT 0;
ALTER TABLE arena_entries ADD COLUMN author TEXT NOT NULL DEFAULT '';
ALTER TABLE arena_entries ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
ALTER TABLE arena_entries ADD COLUMN ip_hash TEXT;
CREATE INDEX idx_arena_entries_kind ON arena_entries (kind, prompt);
CREATE INDEX idx_arena_entries_ip ON arena_entries (ip_hash, created_at);

CREATE TABLE arena_model_ratings (
  model  TEXT NOT NULL,
  kind   TEXT NOT NULL,
  lab    TEXT NOT NULL DEFAULT '',
  rating REAL NOT NULL DEFAULT 1000,
  wins   INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  ties   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (model, kind)
);
INSERT INTO arena_model_ratings (model, kind, lab, rating, wins, losses, ties)
SELECT model, 'game', lab, rating, wins, losses, ties FROM arena_models;
