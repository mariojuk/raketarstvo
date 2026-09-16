export type AdminTab =
  | 'clubs'
  | 'competitors'
  | 'judges'
  | 'competitions'
  | 'teams'
  | 'assignments'
  | 'ranking'
  | 'results';

export const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: 'clubs', label: 'Klubovi' },
  { id: 'competitors', label: 'Natjecatelji' },
  { id: 'judges', label: 'Suci' },
  { id: 'competitions', label: 'Natjecanja' },
  { id: 'teams', label: 'Timovi' },
  { id: 'assignments', label: 'Dodjela sudaca' },
  { id: 'ranking', label: 'Poredak' },
  { id: 'results', label: 'Rezultati' },
];
