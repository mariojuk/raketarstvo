import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { unwrapSupabase } from '../common/supabase.util';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateJudgeAssignmentDto } from './dto/judge-assignment.dto';
import { CreateMemberJudgeAssignmentsDto } from './dto/create-member-judge-assignments.dto';

const ASSIGNMENT_SELECT = `
  *,
  competition:competitions(*),
  judge:users!judge_assignments_judge_id_fkey(id, name, email, club_id, club:clubs(*)),
  team:teams(
    *,
    members:team_members(
      id,
      competitor:competitors(*, club:clubs(*))
    )
  ),
  competitor:competitors(*, club:clubs(*))
`;

@Injectable()
export class JudgeAssignmentsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findByCompetition(competitionId: string) {
    return unwrapSupabase(
      await this.supabase.db
        .from('judge_assignments')
        .select(ASSIGNMENT_SELECT)
        .eq('competition_id', competitionId)
        .order('created_at'),
    );
  }

  async findForJudge(judgeId: string) {
    const assignments = unwrapSupabase(
      await this.supabase.db
        .from('judge_assignments')
        .select(ASSIGNMENT_SELECT)
        .eq('judge_id', judgeId)
        .order('created_at'),
    );

    return assignments.filter((assignment) => {
      const competition = assignment.competition as { status?: string } | null;
      return competition?.status === 'active';
    });
  }

  async create(dto: CreateJudgeAssignmentDto) {
    if (dto.competitor_id) {
      throw new BadRequestException(
        'Za pojedinačnu dodjelu suca svim natjecateljima koristite dodjelu po timu s popunjenim svim poljima',
      );
    }

    await this.validateAssignment(dto);

    return unwrapSupabase(
      await this.supabase.db
        .from('judge_assignments')
        .insert({
          competition_id: dto.competition_id,
          judge_id: dto.judge_id,
          team_id: dto.team_id,
          competitor_id: null,
        })
        .select(ASSIGNMENT_SELECT)
        .single(),
    );
  }

  async createMemberAssignments(dto: CreateMemberJudgeAssignmentsDto) {
    await this.validateMemberAssignments(dto);

    await this.supabase.db
      .from('judge_assignments')
      .delete()
      .eq('competition_id', dto.competition_id)
      .eq('team_id', dto.team_id)
      .not('competitor_id', 'is', null);

    const rows = dto.assignments.map((assignment) => ({
      competition_id: dto.competition_id,
      team_id: dto.team_id,
      judge_id: assignment.judge_id,
      competitor_id: assignment.competitor_id,
    }));

    return unwrapSupabase(
      await this.supabase.db
        .from('judge_assignments')
        .insert(rows)
        .select(ASSIGNMENT_SELECT),
    );
  }

  async remove(id: string) {
    const { data: existing } = await this.supabase.db
      .from('judge_assignments')
      .select('id, competition_id, team_id, competitor_id')
      .eq('id', id)
      .single();

    if (!existing) {
      throw new NotFoundException('Dodjela nije pronađena');
    }

    if (existing.competitor_id) {
      await this.supabase.db
        .from('judge_assignments')
        .delete()
        .eq('competition_id', existing.competition_id)
        .eq('team_id', existing.team_id)
        .not('competitor_id', 'is', null);
    } else {
      await this.supabase.db.from('judge_assignments').delete().eq('id', id);
    }

    return { success: true };
  }

  async ensureJudgeCanAccess(
    judgeId: string,
    teamId: string,
    competitorId?: string,
  ): Promise<void> {
    const { data: assignments } = await this.supabase.db
      .from('judge_assignments')
      .select('id, competitor_id, competition:competitions(status)')
      .eq('judge_id', judgeId)
      .eq('team_id', teamId);

    if (!assignments?.length) {
      throw new ForbiddenException('Nemate dodijeljen pristup ovom timu');
    }

    const activeAssignments = assignments.filter((assignment) => {
      const competition = assignment.competition as { status?: string } | null;
      return competition?.status === 'active';
    });

    if (!activeAssignments.length) {
      throw new ForbiddenException('Tim nije u aktivnom natjecanju');
    }

    if (competitorId) {
      const canJudgeMember = activeAssignments.some(
        (assignment) =>
          assignment.competitor_id === null ||
          assignment.competitor_id === competitorId,
      );

      if (!canJudgeMember) {
        throw new ForbiddenException('Nemate dodijeljen pristup ovom natjecatelju');
      }
    }

    await this.ensureJudgeNotSameClub(judgeId, teamId, competitorId);
  }

  private async validateAssignment(dto: CreateJudgeAssignmentDto) {
    const { data: registration } = await this.supabase.db
      .from('competition_teams')
      .select('id')
      .eq('competition_id', dto.competition_id)
      .eq('team_id', dto.team_id)
      .maybeSingle();

    if (!registration) {
      throw new BadRequestException('Tim mora biti registriran na natjecanje prije dodjele suca');
    }

    await this.ensureNoMemberAssignments(dto.competition_id, dto.team_id);

    const { data: judge } = await this.supabase.db
      .from('users')
      .select('id, role')
      .eq('id', dto.judge_id)
      .eq('role', 'judge')
      .single();

    if (!judge) {
      throw new NotFoundException('Sudac nije pronađen');
    }

    await this.ensureJudgeNotSameClub(dto.judge_id, dto.team_id);
  }

  private async validateMemberAssignments(dto: CreateMemberJudgeAssignmentsDto) {
    const { data: registration } = await this.supabase.db
      .from('competition_teams')
      .select('id')
      .eq('competition_id', dto.competition_id)
      .eq('team_id', dto.team_id)
      .maybeSingle();

    if (!registration) {
      throw new BadRequestException('Tim mora biti registriran na natjecanje prije dodjele suca');
    }

    await this.ensureNoTeamWideAssignment(dto.competition_id, dto.team_id);

    const { data: members } = await this.supabase.db
      .from('team_members')
      .select('competitor_id')
      .eq('team_id', dto.team_id);

    const memberIds = (members ?? []).map((member) => member.competitor_id);

    if (!memberIds.length) {
      throw new BadRequestException('Tim nema natjecatelja');
    }

    if (dto.assignments.length !== memberIds.length) {
      throw new BadRequestException('Morate dodijeliti suca svim natjecateljima u timu');
    }

    const assignedIds = new Set(dto.assignments.map((item) => item.competitor_id));

    if (
      assignedIds.size !== memberIds.length ||
      memberIds.some((memberId) => !assignedIds.has(memberId))
    ) {
      throw new BadRequestException('Morate dodijeliti suca svim natjecateljima u timu');
    }

    for (const assignment of dto.assignments) {
      const { data: judge } = await this.supabase.db
        .from('users')
        .select('id, role')
        .eq('id', assignment.judge_id)
        .eq('role', 'judge')
        .single();

      if (!judge) {
        throw new NotFoundException('Sudac nije pronađen');
      }

      const { data: member } = await this.supabase.db
        .from('team_members')
        .select('id')
        .eq('team_id', dto.team_id)
        .eq('competitor_id', assignment.competitor_id)
        .maybeSingle();

      if (!member) {
        throw new BadRequestException('Natjecatelj nije u odabranom timu');
      }

      await this.ensureJudgeNotSameClub(
        assignment.judge_id,
        dto.team_id,
        assignment.competitor_id,
      );
    }
  }

  private async ensureNoMemberAssignments(competitionId: string, teamId: string) {
    const { data: memberAssignments } = await this.supabase.db
      .from('judge_assignments')
      .select('id')
      .eq('competition_id', competitionId)
      .eq('team_id', teamId)
      .not('competitor_id', 'is', null)
      .limit(1);

    if (memberAssignments?.length) {
      throw new BadRequestException(
        'Tim već ima pojedinačne dodjele sudaca. Uklonite ih prije dodjele suca cijelom timu',
      );
    }
  }

  private async ensureNoTeamWideAssignment(competitionId: string, teamId: string) {
    const { data: teamAssignment } = await this.supabase.db
      .from('judge_assignments')
      .select('id')
      .eq('competition_id', competitionId)
      .eq('team_id', teamId)
      .is('competitor_id', null)
      .limit(1);

    if (teamAssignment?.length) {
      throw new BadRequestException(
        'Tim već ima suca za cijeli tim. Uklonite tu dodjelu prije pojedinačne dodjele',
      );
    }
  }

  private async ensureJudgeNotSameClub(
    judgeId: string,
    teamId: string,
    competitorId?: string,
  ) {
    const { data: judge } = await this.supabase.db
      .from('users')
      .select('club_id')
      .eq('id', judgeId)
      .single();

    if (!judge?.club_id) {
      return;
    }

    let membersQuery = this.supabase.db
      .from('team_members')
      .select('competitor_id, competitor:competitors(club_id)')
      .eq('team_id', teamId);

    if (competitorId) {
      membersQuery = membersQuery.eq('competitor_id', competitorId);
    }

    const { data: members } = await membersQuery;

    const sameClub = members?.some((member) => {
      const competitor = member.competitor as { club_id?: string } | null;
      return competitor?.club_id === judge.club_id;
    });

    if (sameClub) {
      throw new BadRequestException('Sudac ne smije suditi natjecatelja iz svog kluba');
    }
  }
}
