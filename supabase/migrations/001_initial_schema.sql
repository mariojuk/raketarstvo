-- Raketarstvo natjecanja - inicijalna shema

CREATE TYPE user_role AS ENUM ('admin', 'judge');
CREATE TYPE competition_status AS ENUM ('upcoming', 'active', 'finished');
CREATE TYPE launch_category AS ENUM ('padobran', 'traka');

CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  name TEXT NOT NULL,
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE RESTRICT,
  age_category TEXT NOT NULL CHECK (age_category IN ('osnovna', 'srednje')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_date DATE,
  end_date DATE,
  status competition_status NOT NULL DEFAULT 'upcoming',
  launches_per_category INT NOT NULL DEFAULT 2 CHECK (launches_per_category IN (2, 3)),
  traka_open BOOLEAN NOT NULL DEFAULT false,
  padobran_open BOOLEAN NOT NULL DEFAULT false,
  traka_window_seconds INT NOT NULL DEFAULT 1800,
  padobran_window_seconds INT NOT NULL DEFAULT 2700,
  traka_opened_at TIMESTAMPTZ,
  padobran_opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
  judge_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE RESTRICT,
  UNIQUE (team_id, competitor_id),
  UNIQUE (competitor_id)
);

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

CREATE TABLE launches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE RESTRICT,
  category launch_category NOT NULL,
  attempt_number INT NOT NULL CHECK (attempt_number BETWEEN 1 AND 3),
  duration_seconds NUMERIC(10, 3) NOT NULL DEFAULT 0,
  failed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, competitor_id, category, attempt_number)
);

CREATE TABLE competitor_rank_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  category launch_category NOT NULL,
  age_category TEXT NOT NULL DEFAULT 'osnovna' CHECK (age_category IN ('osnovna', 'srednje')),
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  tie_break_order INT NOT NULL CHECK (tie_break_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (competition_id, category, age_category, competitor_id)
);

CREATE INDEX idx_competitions_status ON competitions(status);
CREATE INDEX idx_launches_competition ON launches(competition_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_competition_teams_competition ON competition_teams(competition_id);
CREATE INDEX idx_judge_assignments_judge ON judge_assignments(judge_id);
CREATE INDEX idx_rank_overrides_competition ON competitor_rank_overrides(competition_id, category, age_category);

ALTER TABLE launches REPLICA IDENTITY FULL;
ALTER TABLE competitions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE launches;
ALTER PUBLICATION supabase_realtime ADD TABLE competitions;

-- Javno citanje aktivnih natjecanja i rezultata
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_rank_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read clubs" ON clubs FOR SELECT USING (true);
CREATE POLICY "Public read competitors" ON competitors FOR SELECT USING (true);
CREATE POLICY "Public read competitions" ON competitions FOR SELECT USING (true);
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read team_members" ON team_members FOR SELECT USING (true);
CREATE POLICY "Public read competition_teams" ON competition_teams FOR SELECT USING (true);
CREATE POLICY "Public read judge_assignments" ON judge_assignments FOR SELECT USING (true);
CREATE POLICY "Public read rank overrides" ON competitor_rank_overrides FOR SELECT USING (true);
CREATE POLICY "Public read launches" ON launches FOR SELECT USING (true);

-- Seed default admin (lozinka: admin123 - promijeniti u produkciji)
INSERT INTO users (email, password_hash, role, name)
VALUES (
  'admin@raketarstvo.hr',
  '$2b$10$eg1q2VL4aXIOF.VulBX1qO0FgZ3EpvzsJkaX.4jwp4eR0d3w/Sv/W',
  'admin',
  'Administrator'
);
