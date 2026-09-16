import {
  CategoryResultRow,
  Competitor,
  CompetitorAgeCategory,
  CompetitionDetails,
  CompetitorRankOverride,
  Launch,
  LaunchCategory,
  TeamResultRow,
} from './models';

interface MemberCategoryTotal {
  total: number;
  attempts: string[];
}

function computeMemberCategoryTotal(
  competitorId: string,
  category: LaunchCategory,
  maxAttempts: number,
  launches: Launch[],
): MemberCategoryTotal {
  const competitorLaunches = launches.filter(
    (launch) => launch.competitor_id === competitorId && launch.category === category,
  );

  let total = 0;
  const attempts: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const launch = competitorLaunches.find((item) => item.attempt_number === attempt);

    if (!launch) {
      attempts.push('—');
    } else if (launch.failed) {
      attempts.push('Neuspjeh');
    } else {
      const time = Number(launch.duration_seconds);
      total += time;
      attempts.push(time.toFixed(3));
    }
  }

  return { total, attempts };
}

export function buildCategoryResultRows(
  competition: CompetitionDetails,
  category: LaunchCategory,
  launches: Launch[],
  competitorById: Map<string, Competitor>,
  ageCategory: CompetitorAgeCategory,
): CategoryResultRow[] {
  const maxAttempts = competition.launches_per_category;
  const rows = [...competitorById.entries()]
    .filter(([, competitor]) => competitor.age_category === ageCategory)
    .map(([competitorId, competitor]) => {
      const { total, attempts } = computeMemberCategoryTotal(
        competitorId,
        category,
        maxAttempts,
        launches,
      );

      return {
        competitorId,
        name: competitor.name,
        clubName: competitor.club?.name ?? null,
        ageCategory: competitor.age_category,
        attempts,
        total,
      };
    });

  return sortResultRows(rows, competition.rank_overrides ?? [], category, ageCategory);
}

export function buildTeamResultRows(
  competition: CompetitionDetails,
  category: LaunchCategory,
  launches: Launch[],
  ageCategory: CompetitorAgeCategory,
): TeamResultRow[] {
  const maxAttempts = competition.launches_per_category;

  const rows = competition.teams
    .map((team) => {
      const members = (team.members ?? []).filter(
        (member) => member.competitor.age_category === ageCategory,
      );

      if (!members.length) {
        return null;
      }

      let total = 0;
      const memberNames: string[] = [];

      for (const member of members) {
        const { total: memberTotal } = computeMemberCategoryTotal(
          member.competitor.id,
          category,
          maxAttempts,
          launches,
        );
        total += memberTotal;
        memberNames.push(member.competitor.name);
      }

      const clubName = members[0]?.competitor.club?.name ?? null;

      return {
        teamId: team.id,
        name: team.name || `Tim ${team.id.slice(0, 6)}`,
        clubName,
        members: memberNames.join(', '),
        total,
      };
    })
    .filter((row): row is TeamResultRow => row !== null);

  return rows.sort(
    (a, b) => a.total - b.total || a.name.localeCompare(b.name, 'hr'),
  );
}

export function sortResultRows(
  rows: CategoryResultRow[],
  overrides: CompetitorRankOverride[],
  category: LaunchCategory,
  ageCategory: CompetitorAgeCategory,
): CategoryResultRow[] {
  const overrideMap = new Map(
    overrides
      .filter(
        (item) =>
          item.category === category &&
          (item.age_category ?? ageCategory) === ageCategory,
      )
      .map((item) => [item.competitor_id, item.tie_break_order]),
  );

  return [...rows].sort((a, b) => {
    if (a.total !== b.total) {
      return a.total - b.total;
    }

    const orderA = overrideMap.get(a.competitorId);
    const orderB = overrideMap.get(b.competitorId);

    if (orderA !== undefined && orderB !== undefined && orderA !== orderB) {
      return orderA - orderB;
    }

    return a.name.localeCompare(b.name, 'hr');
  });
}

export function getTiedCompetitorIds(rows: CategoryResultRow[]): Set<string> {
  const totals = new Map<number, string[]>();

  for (const row of rows) {
    const group = totals.get(row.total) ?? [];
    group.push(row.competitorId);
    totals.set(row.total, group);
  }

  const tied = new Set<string>();
  for (const competitorIds of totals.values()) {
    if (competitorIds.length > 1) {
      competitorIds.forEach((id) => tied.add(id));
    }
  }

  return tied;
}

export function buildCompetitorLookup(competition: CompetitionDetails): Map<string, Competitor> {
  const competitorById = new Map<string, Competitor>();

  for (const team of competition.teams) {
    for (const member of team.members ?? []) {
      competitorById.set(member.competitor.id, member.competitor);
    }
  }

  return competitorById;
}

export function buildOverridesPayload(
  rows: CategoryResultRow[],
  category: LaunchCategory,
  tiedCompetitorIds: Set<string>,
): { competitor_id: string; tie_break_order: number }[] {
  const tiedRows = rows.filter((row) => tiedCompetitorIds.has(row.competitorId));

  return tiedRows.map((row, index) => ({
    competitor_id: row.competitorId,
    tie_break_order: index,
  }));
}
