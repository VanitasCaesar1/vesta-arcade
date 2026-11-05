-- Crowd results per matchup ("62% of players picked A") read votes by pair.
CREATE INDEX idx_arena_votes_pair ON arena_votes (a, b);
