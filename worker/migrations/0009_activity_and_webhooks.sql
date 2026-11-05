-- "Votes in the last hour" reads arena votes by time.
CREATE INDEX idx_arena_votes_time ON arena_votes (created_at);

-- Creator alerts: a game can post new comments and new errors to a Discord or Slack webhook.
ALTER TABLE games ADD COLUMN webhook_url TEXT;
