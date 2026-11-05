-- Steam-style reviews: one per visitor per game, recommend or not, optional text.
-- Totals live on games so cards can show "Very Positive" without reading reviews.
CREATE TABLE reviews (
  slug       TEXT NOT NULL,
  ip_hash    TEXT NOT NULL,
  up         INTEGER NOT NULL,                     -- 1 recommended, 0 not
  body       TEXT NOT NULL DEFAULT '',
  version    INTEGER,
  hidden     INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (slug, ip_hash)
);
CREATE INDEX idx_reviews_recent ON reviews (slug, hidden, created_at DESC);
ALTER TABLE games ADD COLUMN reviews_up INTEGER NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN reviews_total INTEGER NOT NULL DEFAULT 0;
