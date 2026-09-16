export type UserRole = 'admin' | 'judge';
export type CompetitionStatus = 'upcoming' | 'active' | 'finished';
export type LaunchCategory = 'padobran' | 'traka';
export type CompetitorAgeCategory = 'osnovna' | 'srednje';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  club_id: string | null;
}

export interface Club {
  id: string;
  name: string;
}

export interface Competitor {
  id: string;
  name: string;
  club_id: string;
  age_category: CompetitorAgeCategory;
  club?: Club;
}

export interface Judge {
  id: string;
  email: string;
  name: string;
  club_id: string;
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
  traka_window_seconds?: number;
  padobran_window_seconds?: number;
  traka_opened_at: string | null;
  padobran_opened_at: string | null;
}

export interface CompetitionTeam {
  id: string;
  competition_id: string;
  team_id: string;
  team?: Team;
  competition?: Competition;
}

export interface JudgeAssignment {
  id: string;
  competition_id: string;
  judge_id: string;
  team_id: string;
  competitor_id: string | null;
  competition?: Competition;
  judge?: Judge;
  team?: Team;
  competitor?: Competitor;
}

export interface TeamMember {
  id: string;
  competitor: Competitor;
}

export interface Team {
  id: string;
  competition_id: string | null;
  judge_id: string | null;
  name: string | null;
  judge?: Judge;
  members?: TeamMember[];
  competition?: Competition;
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
  competitor?: Competitor;
}

export interface CompetitionDetails extends Competition {
  teams: Team[];
  launches: Launch[];
  rank_overrides?: CompetitorRankOverride[];
}

export const CATEGORY_LABELS: Record<LaunchCategory, string> = {
  padobran: 'Padobran',
  traka: 'Traka',
};

export const COMPETITOR_AGE_LABELS: Record<CompetitorAgeCategory, string> = {
  osnovna: 'Osnovna',
  srednje: 'Srednje',
};

export const CATEGORY_MAX: Record<LaunchCategory, number> = {
  padobran: 300,
  traka: 180,
};

export const LAUNCH_CATEGORIES: LaunchCategory[] = ['traka', 'padobran'];

export const AGE_CATEGORIES: CompetitorAgeCategory[] = ['osnovna', 'srednje'];

export interface ResultViewKey {
  ageCategory: CompetitorAgeCategory;
  launchCategory: LaunchCategory;
}

export const RESULT_VIEWS: ResultViewKey[] = [
  { ageCategory: 'osnovna', launchCategory: 'traka' },
  { ageCategory: 'osnovna', launchCategory: 'padobran' },
  { ageCategory: 'srednje', launchCategory: 'traka' },
  { ageCategory: 'srednje', launchCategory: 'padobran' },
];

export function resultViewLabel(view: ResultViewKey): string {
  return `${COMPETITOR_AGE_LABELS[view.ageCategory]} – ${CATEGORY_LABELS[view.launchCategory]}`;
}

export function getOpenCategory(competition: Competition): LaunchCategory | null {
  for (const category of LAUNCH_CATEGORIES) {
    if (isCategoryOpen(competition, category)) {
      return category;
    }
  }

  return null;
}

export function isCategoryOpen(competition: Competition, category: LaunchCategory): boolean {
  return category === 'traka' ? competition.traka_open : competition.padobran_open;
}

export function getCategoryWindowSeconds(
  competition: Competition,
  category: LaunchCategory,
): number {
  const fallback = category === 'traka' ? 1800 : 2700;
  return (
    (category === 'traka'
      ? competition.traka_window_seconds
      : competition.padobran_window_seconds) ?? fallback
  );
}

export function getCategoryOpenedAt(
  competition: Competition,
  category: LaunchCategory,
): Date | null {
  const value =
    category === 'traka' ? competition.traka_opened_at : competition.padobran_opened_at;

  return value ? new Date(value) : null;
}

export function getCategoryClosesAt(
  competition: Competition,
  category: LaunchCategory,
): Date | null {
  const openedAt = getCategoryOpenedAt(competition, category);
  if (!openedAt) {
    return null;
  }

  return new Date(openedAt.getTime() + getCategoryWindowSeconds(competition, category) * 1000);
}

export function getCategoryRemainingMs(
  competition: Competition,
  category: LaunchCategory,
  now = Date.now(),
): number | null {
  const closesAt = getCategoryClosesAt(competition, category);
  if (!closesAt) {
    return null;
  }

  return Math.max(0, closesAt.getTime() - now);
}

export function formatDurationClock(totalMs: number): string {
  const totalSeconds = Math.ceil(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export interface CategoryResultRow {
  competitorId: string;
  name: string;
  clubName: string | null;
  ageCategory: CompetitorAgeCategory;
  attempts: string[];
  total: number;
}

export interface TeamResultRow {
  teamId: string;
  name: string;
  clubName: string | null;
  members: string;
  total: number;
}

export interface CompetitorRankOverride {
  id?: string;
  competition_id: string;
  category: LaunchCategory;
  competitor_id: string;
  tie_break_order: number;
}

export const STATUS_LABELS: Record<CompetitionStatus, string> = {
  upcoming: 'Nadolazeće',
  active: 'Aktivno',
  finished: 'Završeno',
};
