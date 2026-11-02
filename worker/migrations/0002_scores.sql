-- Arcade high scores: games call window.vesta.submitScore(n), players enter initials.
CREATE TABLE scores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL,
  version    INTEGER NOT NULL,
  name       TEXT NOT NULL,                        -- 1-3 characters, A-Z and 0-9
  score      REAL NOT NULL,
  ip_hash    TEXT NOT NULL,
  hidden     INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_scores_board ON scores (slug, hidden, score DESC);
CREATE INDEX idx_scores_ip ON scores (ip_hash, created_at);
