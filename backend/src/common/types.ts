export type UserRole = 'admin' | 'judge';
export type CompetitionStatus = 'upcoming' | 'active' | 'finished';
export type LaunchCategory = 'padobran' | 'traka';

export interface Club {
  id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  name: string;
  club_id: string | null;
  created_at: string;
}

export interface Competitor {
  id: string;
  name: string;
  club_id: string;
  created_at: string;
  club?: Club;
}

export interface Competition {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: CompetitionStatus;
  launches_per_category: number;
  traka_open: boolean;
  padobran_open: boolean;
  traka_window_seconds: number;
  padobran_window_seconds: number;
  traka_opened_at: string | null;
  padobran_opened_at: string | null;
  created_at: string;
}

export interface Team {
  id: string;
  competition_id: string;
  judge_id: string;
  name: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  competitor_id: string;
  competitor?: Competitor;
}

export interface Launch {
  id: string;
  competition_id: string;
  team_id: string;
  competitor_id: string;
  category: LaunchCategory;
  attempt_number: number;
  duration_seconds: number;
  failed: boolean;
  created_at: string;
  updated_at: string;
  competitor?: Competitor;
}

export const CATEGORY_MAX_SECONDS: Record<LaunchCategory, number> = {
  traka: 180,
  padobran: 300,
};
