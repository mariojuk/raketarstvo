-- Natjecatelj: max 1 tim po natjecanju. Sudac: moze suditi vise timova.

ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_competition_id_judge_id_key;

ALTER TABLE team_members ADD COLUMN IF NOT EXISTS competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE;

UPDATE team_members tm
SET competition_id = t.competition_id
FROM teams t
WHERE t.id = tm.team_id AND tm.competition_id IS NULL;

ALTER TABLE team_members ALTER COLUMN competition_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS team_members_competition_competitor_unique
  ON team_members (competition_id, competitor_id);
