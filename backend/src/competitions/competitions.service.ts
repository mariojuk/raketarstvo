import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isCategoryWindowExpired } from '../common/category-window.util';
import { LaunchCategory } from '../common/types';
import { CompetitionTeamsService } from '../competition-teams/competition-teams.service';
import { RankingsService } from '../rankings/rankings.service';
import { unwrapSupabase } from '../common/supabase.util';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCompetitionDto, UpdateCompetitionDto } from './dto/competition.dto';

const TEAM_SELECT = `
  *,
  members:team_members(
    id,
    competitor_id,
    competitor:competitors(*, club:clubs(*))
  )
`;

@Injectable()
export class CompetitionsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly competitionTeamsService: CompetitionTeamsService,
    private readonly rankingsService: RankingsService,
  ) {}

  async findAll(status?: string) {
    let query = this.supabase.db.from('competitions').select('*').order('start_date', {
      ascending: false,
    });

    if (status) {
      query = query.eq('status', status);
    }

    const competitions = unwrapSupabase(await query);

    return Promise.all(competitions.map((item) => this.syncCategoryState(item.id)));
  }

  async findOne(id: string) {
    return this.syncCategoryState(id);
  }

  private async getCompetitionRaw(id: string) {
    const { data, error } = await this.supabase.db
      .from('competitions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Natjecanje nije pronađeno');
    }

    return data;
  }

  async findOneWithDetails(id: string) {
    const competition = await this.findOne(id);
    const teamIds = await this.competitionTeamsService.getTeamIdsForCompetition(id);

    if (!teamIds.length) {
      return {
        ...competition,
        teams: [],
        launches: [],
        rank_overrides: [],
      };
    }

    const [teamsResult, launchesResult, rankOverrides] = await Promise.all([
      this.supabase.db
        .from('teams')
        .select(TEAM_SELECT)
        .in('id', teamIds)
        .order('created_at'),
      this.supabase.db
        .from('launches')
        .select('*, competitor:competitors(*, club:clubs(*))')
        .in('team_id', teamIds)
        .order('created_at'),
      this.rankingsService.findByCompetition(id),
    ]);

    return {
      ...competition,
      teams: teamsResult.data ?? [],
      launches: launchesResult.data ?? [],
      rank_overrides: rankOverrides,
    };
  }

  async create(dto: CreateCompetitionDto) {
    return unwrapSupabase(
      await this.supabase.db.from('competitions').insert(dto).select().single(),
    );
  }

  async update(id: string, dto: UpdateCompetitionDto) {
    const existing = await this.syncCategoryState(id);

    if (dto.traka_open === true || dto.padobran_open === true) {
      if (existing.status !== 'active') {
        throw new BadRequestException(
          'Kategorije se mogu otvoriti samo za aktivno natjecanje',
        );
      }
    }

    const payload: Record<string, unknown> = { ...dto };

    if (dto.traka_open === true) {
      payload['traka_opened_at'] = new Date().toISOString();
    }

    if (dto.traka_open === false && existing.traka_open) {
      await this.finalizeCategory(id, 'traka', existing);
      payload['traka_opened_at'] = null;
    }

    if (dto.padobran_open === true) {
      payload['padobran_opened_at'] = new Date().toISOString();
    }

    if (dto.padobran_open === false && existing.padobran_open) {
      await this.finalizeCategory(id, 'padobran', existing);
      payload['padobran_opened_at'] = null;
    }

    if (dto.status === 'finished') {
      if (existing.traka_open) {
        await this.finalizeCategory(id, 'traka', existing);
      }

      if (existing.padobran_open) {
        await this.finalizeCategory(id, 'padobran', existing);
      }

      payload['traka_open'] = false;
      payload['padobran_open'] = false;
      payload['traka_opened_at'] = null;
      payload['padobran_opened_at'] = null;
    }

    return unwrapSupabase(
      await this.supabase.db.from('competitions').update(payload).eq('id', id).select().single(),
    );
  }

  async remove(id: string) {
    return unwrapSupabase(await this.supabase.db.from('competitions').delete().eq('id', id));
  }

  async syncCategoryState(id: string) {
    const data = await this.getCompetitionRaw(id);
    const updates: Record<string, unknown> = {};

    if (data.traka_open && isCategoryWindowExpired(data, 'traka')) {
      await this.finalizeCategory(id, 'traka', data);
      updates['traka_open'] = false;
      updates['traka_opened_at'] = null;
    }

    if (data.padobran_open && isCategoryWindowExpired(data, 'padobran')) {
      await this.finalizeCategory(id, 'padobran', data);
      updates['padobran_open'] = false;
      updates['padobran_opened_at'] = null;
    }

    if (!Object.keys(updates).length) {
      return data;
    }

    return unwrapSupabase(
      await this.supabase.db
        .from('competitions')
        .update(updates)
        .eq('id', id)
        .select()
        .single(),
    );
  }

  async finalizeCategory(
    competitionId: string,
    category: LaunchCategory,
    competitionData?: Awaited<ReturnType<CompetitionsService['getCompetitionRaw']>>,
  ) {
    const competition = competitionData ?? (await this.getCompetitionRaw(competitionId));
    const teamIds = await this.competitionTeamsService.getTeamIdsForCompetition(competitionId);

    if (!teamIds.length) {
      return;
    }

    const { data: teams } = await this.supabase.db
      .from('teams')
      .select('id, members:team_members(competitor_id)')
      .in('id', teamIds);

    const now = new Date().toISOString();
    const payloads: Record<string, unknown>[] = [];

    for (const team of teams ?? []) {
      const members = team.members as { competitor_id: string }[] | undefined;

      for (const member of members ?? []) {
        const { data: existingLaunches } = await this.supabase.db
          .from('launches')
          .select('attempt_number')
          .eq('team_id', team.id)
          .eq('competitor_id', member.competitor_id)
          .eq('category', category);

        const existingAttempts = new Set(
          (existingLaunches ?? []).map((launch) => launch.attempt_number),
        );

        for (
          let attempt = 1;
          attempt <= competition.launches_per_category;
          attempt++
        ) {
          if (existingAttempts.has(attempt)) {
            continue;
          }

          payloads.push({
            competition_id: competitionId,
            team_id: team.id,
            competitor_id: member.competitor_id,
            category,
            attempt_number: attempt,
            duration_seconds: 0,
            failed: true,
            updated_at: now,
          });
        }
      }
    }

    if (!payloads.length) {
      return;
    }

    const { error } = await this.supabase.db.from('launches').upsert(payloads, {
      onConflict: 'team_id,competitor_id,category,attempt_number',
    });

    if (error) {
      throw new BadRequestException(error.message);
    }
  }
}
