-- Registracija timova na natjecanja i dodjela sudaca

CREATE TABLE competition_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (competition_id, team_id)
);

CREATE TABLE judge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX judge_assignments_whole_team_unique
  ON judge_assignments (competition_id, judge_id, team_id)
  WHERE competitor_id IS NULL;

CREATE UNIQUE INDEX judge_assignments_member_unique
  ON judge_assignments (competition_id, judge_id, team_id, competitor_id)
  WHERE competitor_id IS NOT NULL;

CREATE INDEX idx_competition_teams_competition ON competition_teams(competition_id);
CREATE INDEX idx_competition_teams_team ON competition_teams(team_id);
CREATE INDEX idx_judge_assignments_judge ON judge_assignments(judge_id);
CREATE INDEX idx_judge_assignments_competition ON judge_assignments(competition_id);

INSERT INTO competition_teams (competition_id, team_id)
SELECT competition_id, id
FROM teams
WHERE competition_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO judge_assignments (competition_id, judge_id, team_id, competitor_id)
SELECT competition_id, judge_id, id, NULL
FROM teams
WHERE competition_id IS NOT NULL
  AND judge_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM judge_assignments ja
    WHERE ja.competition_id = teams.competition_id
      AND ja.judge_id = teams.judge_id
      AND ja.team_id = teams.id
      AND ja.competitor_id IS NULL
  );

ALTER TABLE competition_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read competition_teams" ON competition_teams FOR SELECT USING (true);
CREATE POLICY "Public read judge_assignments" ON judge_assignments FOR SELECT USING (true);
