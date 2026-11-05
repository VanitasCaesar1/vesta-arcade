-- Open publishing: anyone can publish a game to an arcade that turns it on
-- (OPEN_PUBLISHING=1), without an arcade of their own. Each such "community"
-- game gets a secret key; only its hash is stored. Games the owner publishes
-- with the admin token keep owner_key_hash NULL.
ALTER TABLE games ADD COLUMN owner_key_hash TEXT;
ALTER TABLE games ADD COLUMN creator_ip_hash TEXT;
CREATE INDEX idx_games_creator ON games (creator_ip_hash, created_at);

-- One report per visitor per game. Three distinct reports hide a community game
-- until the owner looks at it.
CREATE TABLE reports (
  slug       TEXT NOT NULL,
  ip_hash    TEXT NOT NULL,
  reason     TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (slug, ip_hash)
);
