CREATE TABLE competitor_rank_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  category launch_category NOT NULL,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  tie_break_order INT NOT NULL CHECK (tie_break_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (competition_id, category, competitor_id)
);

CREATE INDEX idx_rank_overrides_competition ON competitor_rank_overrides(competition_id, category);

ALTER TABLE competitor_rank_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read rank overrides" ON competitor_rank_overrides FOR SELECT USING (true);
