-- The high-score board keeps one row per player (set of initials) per game, so a
-- game page reads at most a handful of rows instead of grouping every score ever
-- submitted. `scores` keeps the raw history; challenge links point at its ids.
CREATE TABLE best_scores (
  slug       TEXT NOT NULL,
  name       TEXT NOT NULL,
  score      REAL NOT NULL,
  score_id   INTEGER NOT NULL,                     -- the scores row that set it
  created_at INTEGER NOT NULL,
  PRIMARY KEY (slug, name)
);
CREATE INDEX idx_best_board ON best_scores (slug, score DESC);

INSERT INTO best_scores (slug, name, score, score_id, created_at)
SELECT s.slug, s.name, s.score, s.id, s.created_at FROM scores s
WHERE s.hidden = 0 AND s.id = (
  SELECT s2.id FROM scores s2 WHERE s2.slug = s.slug AND s2.name = s.name AND s2.hidden = 0
  ORDER BY s2.score DESC, s2.created_at ASC LIMIT 1
);
