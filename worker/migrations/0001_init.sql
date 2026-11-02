-- Vesta: one arcade, owned by whoever deployed it.
-- Raw events are never stored. Telemetry lands as daily totals and grouped
-- errors so the free 5 GB D1 database lasts for years.

CREATE TABLE games (
  slug              TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  author            TEXT NOT NULL DEFAULT '',
  made_with         TEXT NOT NULL DEFAULT '[]',   -- JSON array, e.g. ["Claude Code"]
  tags              TEXT NOT NULL DEFAULT '[]',   -- JSON array
  source_url        TEXT NOT NULL DEFAULT '',
  keyboard_required INTEGER NOT NULL DEFAULT 0,
  aspect            TEXT NOT NULL DEFAULT '16/9',
  cover_key         TEXT,
  current_version   INTEGER,                       -- NULL until the first version goes live
  plays             INTEGER NOT NULL DEFAULT 0,
  likes             INTEGER NOT NULL DEFAULT 0,
  hidden            INTEGER NOT NULL DEFAULT 0,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);
CREATE INDEX idx_games_updated ON games (updated_at DESC);

CREATE TABLE versions (
  slug        TEXT NOT NULL REFERENCES games(slug) ON DELETE CASCADE,
  n           INTEGER NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('uploading', 'live', 'pruned')),
  notes       TEXT NOT NULL DEFAULT '',
  manifest    TEXT NOT NULL,                       -- JSON [{"path": "...", "size": 123}]
  file_count  INTEGER NOT NULL,
  total_bytes INTEGER NOT NULL,
  plays       INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  live_at     INTEGER,
  PRIMARY KEY (slug, n)
);

CREATE TABLE daily_stats (
  slug     TEXT NOT NULL,
  day      TEXT NOT NULL,                          -- YYYY-MM-DD, UTC
  plays    INTEGER NOT NULL DEFAULT 0,
  sessions INTEGER NOT NULL DEFAULT 0,             -- sessions that reported an end
  seconds  INTEGER NOT NULL DEFAULT 0,             -- active seconds across those sessions
  errors   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (slug, day)
);

-- How long sessions last, per version. Buckets: 0 <10s, 1 <30s, 2 <60s, 3 <3m, 4 <10m, 5 10m+.
CREATE TABLE dropoff (
  slug    TEXT NOT NULL,
  version INTEGER NOT NULL,
  bucket  INTEGER NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (slug, version, bucket)
);

-- Errors grouped by game, version and fingerprint (message + location).
CREATE TABLE errors (
  slug        TEXT NOT NULL,
  version     INTEGER NOT NULL,
  fingerprint TEXT NOT NULL,
  kind        TEXT NOT NULL,                       -- error | rejection | console
  message     TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT '',
  line        INTEGER NOT NULL DEFAULT 0,
  col         INTEGER NOT NULL DEFAULT 0,
  stack       TEXT NOT NULL DEFAULT '',
  user_agent  TEXT NOT NULL DEFAULT '',
  count       INTEGER NOT NULL DEFAULT 0,
  first_seen  INTEGER NOT NULL,
  last_seen   INTEGER NOT NULL,
  PRIMARY KEY (slug, version, fingerprint)
);

-- Milestones a game reports with vesta.milestone("reached-level-2"): counted once per session.
CREATE TABLE milestones (
  slug    TEXT NOT NULL,
  version INTEGER NOT NULL,
  name    TEXT NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (slug, version, name)
);

CREATE TABLE comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL REFERENCES games(slug) ON DELETE CASCADE,
  version    INTEGER,
  name       TEXT NOT NULL DEFAULT '',
  body       TEXT NOT NULL,
  ip_hash    TEXT NOT NULL,
  hidden     INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_comments_game ON comments (slug, created_at DESC);
CREATE INDEX idx_comments_ip ON comments (ip_hash, created_at);

CREATE TABLE likes (
  slug       TEXT NOT NULL REFERENCES games(slug) ON DELETE CASCADE,
  ip_hash    TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (slug, ip_hash)
);
