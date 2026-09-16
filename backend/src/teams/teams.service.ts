import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { unwrapSupabase } from '../common/supabase.util';
import { CompetitionTeamsService } from '../competition-teams/competition-teams.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';

const TEAM_SELECT = `
  *,
  competition:competitions(*),
  judge:users!teams_judge_id_fkey(id, name, email, club_id, club:clubs(*)),
  members:team_members(
    id,
    competitor:competitors(*, club:clubs(*))
  )
`;

@Injectable()
export class TeamsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly competitionTeamsService: CompetitionTeamsService,
  ) {}

  async findAll() {
    return unwrapSupabase(
      await this.supabase.db
        .from('teams')
        .select(TEAM_SELECT)
        .order('created_at', { ascending: false }),
    );
  }

  async findByCompetition(competitionId: string) {
    const { data: registrations } = await this.supabase.db
      .from('competition_teams')
      .select('team_id')
      .eq('competition_id', competitionId);

    const teamIds = (registrations ?? []).map((item) => item.team_id);

    if (!teamIds.length) {
      return [];
    }

    return unwrapSupabase(
      await this.supabase.db
        .from('teams')
        .select(TEAM_SELECT)
        .in('id', teamIds)
        .order('created_at'),
    );
  }

  async findJudgeTeams(judgeId: string, competitionId?: string) {
    let query = this.supabase.db
      .from('judge_assignments')
      .select(
        `
        *,
        competition:competitions(*),
        team:teams(
          *,
          members:team_members(
            id,
            competitor:competitors(*, club:clubs(*))
          )
        )
      `,
      )
      .eq('judge_id', judgeId);

    if (competitionId) {
      query = query.eq('competition_id', competitionId);
    }

    const assignments = unwrapSupabase(await query);
    const activeAssignments = assignments.filter((assignment) => {
      const competition = assignment.competition as { status?: string } | null;
      return competition?.status === 'active';
    });

    if (!activeAssignments.length) {
      throw new NotFoundException('Nema dodijeljenih timova za ovog suca');
    }

    return activeAssignments;
  }

  private async validateTeamMembers(competitorIds: string[], excludeTeamId?: string) {
    const uniqueIds = new Set(competitorIds);
    if (uniqueIds.size !== competitorIds.length) {
      throw new BadRequestException('Natjecatelji u timu moraju biti različiti');
    }

    const { data: competitors } = await this.supabase.db
      .from('competitors')
      .select('id')
      .in('id', competitorIds);

    if (!competitors || competitors.length !== competitorIds.length) {
      throw new BadRequestException('Jedan ili više natjecatelja ne postoji');
    }

    let membersQuery = this.supabase.db
      .from('team_members')
      .select('competitor_id, team_id')
      .in('competitor_id', competitorIds);

    if (excludeTeamId) {
      membersQuery = membersQuery.neq('team_id', excludeTeamId);
    }

    const { data: existingMembers } = await membersQuery;

    if (existingMembers?.length) {
      throw new BadRequestException(
        'Jedan ili više natjecatelja je već u drugom timu',
      );
    }
  }

  async create(dto: CreateTeamDto) {
    await this.validateTeamMembers(dto.competitor_ids);

    const { data: team, error: teamError } = await this.supabase.db
      .from('teams')
      .insert({
        name: dto.name ?? null,
      })
      .select()
      .single();

    if (teamError || !team) {
      throw new BadRequestException(teamError?.message ?? 'Greška pri kreiranju tima');
    }

    const members = dto.competitor_ids.map((competitor_id) => ({
      team_id: team.id,
      competitor_id,
    }));

    const { error: membersError } = await this.supabase.db
      .from('team_members')
      .insert(members);

    if (membersError) {
      await this.supabase.db.from('teams').delete().eq('id', team.id);
      throw new BadRequestException(membersError.message);
    }

    return this.findAll();
  }

  async update(id: string, dto: UpdateTeamDto) {
    const { data: existing, error } = await this.supabase.db
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !existing) {
      throw new NotFoundException('Tim nije pronađen');
    }

    if (dto.competitor_ids) {
      await this.validateTeamMembers(dto.competitor_ids, id);

      const { data: registrations } = await this.supabase.db
        .from('competition_teams')
        .select('competition_id')
        .eq('team_id', id);

      for (const registration of registrations ?? []) {
        await this.competitionTeamsService.assertCompetitorsNotOnCompetition(
          registration.competition_id,
          id,
          dto.competitor_ids,
        );
      }
    }

    if (dto.name !== undefined) {
      await this.supabase.db
        .from('teams')
        .update({ name: dto.name ?? existing.name })
        .eq('id', id);
    }

    if (dto.competitor_ids) {
      await this.supabase.db.from('team_members').delete().eq('team_id', id);

      await this.supabase.db.from('team_members').insert(
        dto.competitor_ids.map((competitor_id) => ({
          team_id: id,
          competition_id: existing.competition_id,
          competitor_id,
        })),
      );
    }

    return existing.competition_id
      ? this.findByCompetition(existing.competition_id)
      : this.findAll();
  }

  async remove(id: string) {
    const { data: existing } = await this.supabase.db
      .from('teams')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      throw new NotFoundException('Tim nije pronađen');
    }

    await this.supabase.db.from('teams').delete().eq('id', id);

    return { success: true };
  }
}
