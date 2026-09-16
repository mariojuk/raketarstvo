import type { LaunchCategory } from './types';

export interface CategoryWindowCompetition {
  traka_open: boolean;
  padobran_open: boolean;
  traka_window_seconds: number;
  padobran_window_seconds: number;
  traka_opened_at: string | null;
  padobran_opened_at: string | null;
}

export function getCategoryWindowSeconds(
  competition: CategoryWindowCompetition,
  category: LaunchCategory,
): number {
  return category === 'traka'
    ? competition.traka_window_seconds
    : competition.padobran_window_seconds;
}

export function getCategoryOpenedAt(
  competition: CategoryWindowCompetition,
  category: LaunchCategory,
): Date | null {
  const value =
    category === 'traka' ? competition.traka_opened_at : competition.padobran_opened_at;

  return value ? new Date(value) : null;
}

export function getCategoryClosesAt(
  competition: CategoryWindowCompetition,
  category: LaunchCategory,
): Date | null {
  const openedAt = getCategoryOpenedAt(competition, category);
  if (!openedAt) {
    return null;
  }

  return new Date(openedAt.getTime() + getCategoryWindowSeconds(competition, category) * 1000);
}

export function isSessionWithinCategoryWindow(
  competition: CategoryWindowCompetition,
  category: LaunchCategory,
  sessionStartedAt: string,
): boolean {
  const openedAt = getCategoryOpenedAt(competition, category);
  const closesAt = getCategoryClosesAt(competition, category);
  if (!openedAt || !closesAt) {
    return false;
  }

  const startedAt = new Date(sessionStartedAt);
  return startedAt >= openedAt && startedAt < closesAt;
}

export function isCategoryWindowExpired(
  competition: CategoryWindowCompetition,
  category: LaunchCategory,
  now = new Date(),
): boolean {
  const closesAt = getCategoryClosesAt(competition, category);
  if (!closesAt) {
    return false;
  }

  return now >= closesAt;
}
