-- Cisti timovi bez natjecanja pri kreiranju

ALTER TABLE teams ALTER COLUMN competition_id DROP NOT NULL;

ALTER TABLE team_members ALTER COLUMN competition_id DROP NOT NULL;

DROP INDEX IF EXISTS team_members_competition_competitor_unique;

CREATE UNIQUE INDEX IF NOT EXISTS team_members_competition_competitor_unique
  ON team_members (competition_id, competitor_id)
  WHERE competition_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS team_members_competitor_unique
  ON team_members (competitor_id);
