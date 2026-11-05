-- Store-page media: up to 6 screenshots per game, R2 keys in a JSON array.
ALTER TABLE games ADD COLUMN screenshots TEXT NOT NULL DEFAULT '[]';
