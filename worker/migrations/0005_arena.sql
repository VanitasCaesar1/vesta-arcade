-- AI Arena: different models build a game from the same prompt, in one attempt.
-- Players play two entries blind, vote for the more fun one, then see which
-- model made each. Ratings are Elo, updated on every vote.
CREATE TABLE arena_prompts (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  prompt     TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE arena_entries (
  slug       TEXT PRIMARY KEY,                     -- a normal game, usually hidden from the home page
  prompt     TEXT NOT NULL,
  model      TEXT NOT NULL,                        -- e.g. "Claude Opus 5.5"
  lab        TEXT NOT NULL DEFAULT '',             -- e.g. "Anthropic"
  rating     REAL NOT NULL DEFAULT 1000,
  wins       INTEGER NOT NULL DEFAULT 0,
  losses     INTEGER NOT NULL DEFAULT 0,
  ties       INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_arena_entries_prompt ON arena_entries (prompt);

CREATE TABLE arena_models (
  model  TEXT PRIMARY KEY,
  lab    TEXT NOT NULL DEFAULT '',
  rating REAL NOT NULL DEFAULT 1000,
  wins   INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  ties   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE arena_votes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt     TEXT NOT NULL,
  a          TEXT NOT NULL,
  b          TEXT NOT NULL,
  winner     TEXT NOT NULL CHECK (winner IN ('a', 'b', 'tie')),
  ip_hash    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_arena_votes_ip ON arena_votes (ip_hash, created_at);
