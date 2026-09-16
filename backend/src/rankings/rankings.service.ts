import { BadRequestException, Injectable } from '@nestjs/common';
import { LaunchCategory } from '../common/types';
import { CompetitionTeamsService } from '../competition-teams/competition-teams.service';
import { unwrapSupabase } from '../common/supabase.util';
import { SupabaseService } from '../supabase/supabase.service';
import { SaveRankOverridesDto } from './dto/rank-override.dto';

@Injectable()
export class RankingsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly competitionTeamsService: CompetitionTeamsService,
  ) {}

  async findByCompetition(competitionId: string, category?: LaunchCategory) {
    let query = this.supabase.db
      .from('competitor_rank_overrides')
      .select('*')
      .eq('competition_id', competitionId)
      .order('tie_break_order');

    if (category) {
      query = query.eq('category', category);
    }

    return unwrapSupabase(await query);
  }

  async save(dto: SaveRankOverridesDto) {
    if (!dto.overrides.length) {
      await this.supabase.db
        .from('competitor_rank_overrides')
        .delete()
        .eq('competition_id', dto.competition_id)
        .eq('category', dto.category);

      return [];
    }

    const teamIds = await this.competitionTeamsService.getTeamIdsForCompetition(
      dto.competition_id,
    );

    if (!teamIds.length) {
      throw new BadRequestException('Natjecanje nema registriranih timova');
    }

    const competitorIds = dto.overrides.map((item) => item.competitor_id);
    const { data: launches } = await this.supabase.db
      .from('launches')
      .select('competitor_id, duration_seconds, failed')
      .in('team_id', teamIds)
      .eq('category', dto.category)
      .in('competitor_id', competitorIds);

    const totals = new Map<string, number>();
    for (const launch of launches ?? []) {
      if (launch.failed) {
        continue;
      }

      const current = totals.get(launch.competitor_id) ?? 0;
      totals.set(launch.competitor_id, current + Number(launch.duration_seconds));
    }

    const uniqueTotals = new Set(
      dto.overrides.map((item) => totals.get(item.competitor_id) ?? 0),
    );

    if (uniqueTotals.size > 1) {
      throw new BadRequestException(
        'Ručni poredak moguće je postaviti samo među natjecateljima s istim ukupnim rezultatom',
      );
    }

    await this.supabase.db
      .from('competitor_rank_overrides')
      .delete()
      .eq('competition_id', dto.competition_id)
      .eq('category', dto.category)
      .in('competitor_id', competitorIds);

    const rows = dto.overrides.map((item) => ({
      competition_id: dto.competition_id,
      category: dto.category,
      competitor_id: item.competitor_id,
      tie_break_order: item.tie_break_order,
    }));

    return unwrapSupabase(
      await this.supabase.db.from('competitor_rank_overrides').insert(rows).select(),
    );
  }
}
