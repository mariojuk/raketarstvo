-- Scope tie-break overrides per age category (osnovna / srednje)
-- so each of the 4 views has independent ranking.

ALTER TABLE competitor_rank_overrides
  ADD COLUMN IF NOT EXISTS age_category TEXT NOT NULL DEFAULT 'osnovna'
  CHECK (age_category IN ('osnovna', 'srednje'));

ALTER TABLE competitor_rank_overrides
  DROP CONSTRAINT IF EXISTS competitor_rank_overrides_competition_id_category_competitor_id_key;

ALTER TABLE competitor_rank_overrides
  DROP CONSTRAINT IF EXISTS competitor_rank_overrides_unique;

ALTER TABLE competitor_rank_overrides
  ADD CONSTRAINT competitor_rank_overrides_unique
  UNIQUE (competition_id, category, age_category, competitor_id);

DROP INDEX IF EXISTS idx_rank_overrides_competition;

CREATE INDEX idx_rank_overrides_competition
  ON competitor_rank_overrides(competition_id, category, age_category);
