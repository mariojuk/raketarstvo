-- Natjecatelj ne smije biti prijavljen na isto natjecanje kroz vise timova

CREATE OR REPLACE FUNCTION prevent_duplicate_competitor_on_competition()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM team_members tm_new
    JOIN team_members tm_existing ON tm_existing.competitor_id = tm_new.competitor_id
    JOIN competition_teams ct_existing ON ct_existing.team_id = tm_existing.team_id
    WHERE tm_new.team_id = NEW.team_id
      AND ct_existing.competition_id = NEW.competition_id
      AND ct_existing.team_id <> NEW.team_id
  ) THEN
    RAISE EXCEPTION 'Natjecatelj je već prijavljen na ovo natjecanje';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS competition_teams_no_duplicate_competitor ON competition_teams;

CREATE TRIGGER competition_teams_no_duplicate_competitor
  BEFORE INSERT ON competition_teams
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_competitor_on_competition();

CREATE OR REPLACE FUNCTION prevent_competitor_on_competition_twice_via_members()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM competition_teams ct_this
    JOIN competition_teams ct_other
      ON ct_other.competition_id = ct_this.competition_id
      AND ct_other.team_id <> ct_this.team_id
    JOIN team_members tm_other
      ON tm_other.team_id = ct_other.team_id
      AND tm_other.competitor_id = NEW.competitor_id
    WHERE ct_this.team_id = NEW.team_id
  ) THEN
    RAISE EXCEPTION 'Natjecatelj je već prijavljen na ovo natjecanje';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS team_members_no_duplicate_on_competition ON team_members;

CREATE TRIGGER team_members_no_duplicate_on_competition
  BEFORE INSERT ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION prevent_competitor_on_competition_twice_via_members();
