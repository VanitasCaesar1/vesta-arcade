-- Achievements games unlock through window.vesta.achievement(id, name, description).
-- count = how many browsers unlocked it (each browser reports an achievement once).
CREATE TABLE achievements (
  slug        TEXT NOT NULL,
  id          TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  count       INTEGER NOT NULL DEFAULT 0,
  first_seen  INTEGER NOT NULL,
  PRIMARY KEY (slug, id)
);
CREATE INDEX idx_achievements_count ON achievements (slug, count DESC);
