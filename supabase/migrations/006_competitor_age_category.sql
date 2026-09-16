ALTER TABLE competitors
  ADD COLUMN IF NOT EXISTS age_category TEXT NOT NULL DEFAULT 'osnovna'
  CHECK (age_category IN ('osnovna', 'srednje'));

ALTER TABLE competitors
  ALTER COLUMN age_category DROP DEFAULT;
