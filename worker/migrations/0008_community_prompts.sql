-- Community prompts: anyone can start an SVG challenge with their own drawing.
-- Reported prompts are hidden (with their entries) until the owner looks.
ALTER TABLE arena_prompts ADD COLUMN community INTEGER NOT NULL DEFAULT 0;
ALTER TABLE arena_prompts ADD COLUMN author TEXT NOT NULL DEFAULT '';
ALTER TABLE arena_prompts ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
ALTER TABLE arena_prompts ADD COLUMN ip_hash TEXT;
