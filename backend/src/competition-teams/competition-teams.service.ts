import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { unwrapSupabase } from '../common/supabase.util';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterCompetitionTeamDto } from './dto/competition-team.dto';

const REGISTRATION_SELECT = `
  *,
  competition:competitions(*),
  team:teams(
    *,
    members:team_members(
      id,
      competitor:competitors(*, club:clubs(*))
    )
  )
`;

@Injectable()
export class CompetitionTeamsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findByCompetition(competitionId: string) {
    return unwrapSupabase(
      await this.supabase.db
        .from('competition_teams')
        .select(REGISTRATION_SELECT)
        .eq('competition_id', competitionId)
        .order('created_at'),
    );
  }

  async register(dto: RegisterCompetitionTeamDto) {
    const { data: competition } = await this.supabase.db
      .from('competitions')
      .select('id')
      .eq('id', dto.competition_id)
      .single();

    if (!competition) {
      throw new NotFoundException('Natjecanje nije pronađeno');
    }

    const { data: team } = await this.supabase.db
      .from('teams')
      .select('id')
      .eq('id', dto.team_id)
      .single();

    if (!team) {
      throw new NotFoundException('Tim nije pronađen');
    }

    const { data: existing } = await this.supabase.db
      .from('competition_teams')
      .select('id')
      .eq('competition_id', dto.competition_id)
      .eq('team_id', dto.team_id)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException('Tim je već registriran na ovo natjecanje');
    }

    const { data: members } = await this.supabase.db
      .from('team_members')
      .select('competitor_id')
      .eq('team_id', dto.team_id);

    const competitorIds = (members ?? []).map((member) => member.competitor_id);
    await this.assertCompetitorsNotOnCompetition(
      dto.competition_id,
      dto.team_id,
      competitorIds,
    );

    return unwrapSupabase(
      await this.supabase.db
        .from('competition_teams')
        .insert(dto)
        .select(REGISTRATION_SELECT)
        .single(),
    );
  }

  async remove(id: string) {
    const { data: existing } = await this.supabase.db
      .from('competition_teams')
      .select('id, competition_id, team_id')
      .eq('id', id)
      .single();

    if (!existing) {
      throw new NotFoundException('Registracija nije pronađena');
    }

    await this.supabase.db
      .from('judge_assignments')
      .delete()
      .eq('competition_id', existing.competition_id)
      .eq('team_id', existing.team_id);

    await this.supabase.db.from('competition_teams').delete().eq('id', id);

    return { success: true };
  }

  async getTeamIdsForCompetition(competitionId: string): Promise<string[]> {
    const { data } = await this.supabase.db
      .from('competition_teams')
      .select('team_id')
      .eq('competition_id', competitionId);

    return (data ?? []).map((item) => item.team_id);
  }

  async assertCompetitorsNotOnCompetition(
    competitionId: string,
    teamId: string,
    competitorIds: string[],
  ): Promise<void> {
    if (!competitorIds.length) {
      return;
    }

    const { data: registrations } = await this.supabase.db
      .from('competition_teams')
      .select('team_id')
      .eq('competition_id', competitionId);

    const otherTeamIds = (registrations ?? [])
      .map((item) => item.team_id)
      .filter((id) => id !== teamId);

    if (!otherTeamIds.length) {
      return;
    }

    const { data: conflicts } = await this.supabase.db
      .from('team_members')
      .select(
        'competitor_id, competitor:competitors(name), team:teams(name)',
      )
      .in('team_id', otherTeamIds)
      .in('competitor_id', competitorIds);

    if (!conflicts?.length) {
      return;
    }

    const details = conflicts
      .map((item) => {
        const competitor = item.competitor as { name?: string } | null;
        const team = item.team as { name?: string } | null;
        return `${competitor?.name ?? 'Natjecatelj'} (tim: ${team?.name ?? '—'})`;
      })
      .join(', ');

    throw new BadRequestException(
      `Natjecatelj je već prijavljen na ovo natjecanje: ${details}`,
    );
  }
}
