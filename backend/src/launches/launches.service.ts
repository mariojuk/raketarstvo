import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isSessionWithinCategoryWindow } from '../common/category-window.util';
import { unwrapSupabase } from '../common/supabase.util';
import { CATEGORY_MAX_SECONDS, LaunchCategory, User } from '../common/types';
import { CompetitionsService } from '../competitions/competitions.service';
import { JudgeAssignmentsService } from '../judge-assignments/judge-assignments.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SaveLaunchDto } from './dto/launch.dto';
import { UpdateLaunchDto } from './dto/update-launch.dto';

@Injectable()
export class LaunchesService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly judgeAssignmentsService: JudgeAssignmentsService,
    private readonly competitionsService: CompetitionsService,
  ) {}

  async findByCompetition(competitionId: string) {
    return unwrapSupabase(
      await this.supabase.db
        .from('launches')
        .select('*, competitor:competitors(*, club:clubs(*))')
        .eq('competition_id', competitionId)
        .order('created_at'),
    );
  }

  async findByTeam(teamId: string, user: User) {
    if (user.role === 'judge') {
      await this.judgeAssignmentsService.ensureJudgeCanAccess(user.id, teamId);
    }

    return unwrapSupabase(
      await this.supabase.db
        .from('launches')
        .select('*, competitor:competitors(*, club:clubs(*))')
        .eq('team_id', teamId)
        .order('created_at'),
    );
  }

  async save(dto: SaveLaunchDto, user: User) {
    if (user.role === 'judge') {
      await this.judgeAssignmentsService.ensureJudgeCanAccess(
        user.id,
        dto.team_id,
        dto.competitor_id,
      );

      const { data: registration } = await this.supabase.db
        .from('competition_teams')
        .select('id')
        .eq('competition_id', dto.competition_id)
        .eq('team_id', dto.team_id)
        .maybeSingle();

      if (!registration) {
        throw new BadRequestException('Tim nije registriran na odabrano natjecanje');
      }

      const { data: assignment } = await this.supabase.db
        .from('judge_assignments')
        .select('id')
        .eq('judge_id', user.id)
        .eq('competition_id', dto.competition_id)
        .eq('team_id', dto.team_id)
        .or(`competitor_id.is.null,competitor_id.eq.${dto.competitor_id}`)
        .maybeSingle();

      if (!assignment) {
        throw new BadRequestException('Nemate dodjelu za ovo natjecanje i tim');
      }
    }

    const competition = await this.competitionsService.syncCategoryState(dto.competition_id);

    if (competition.status !== 'active' && !dto.session_started_at) {
      throw new BadRequestException('Rezultati se mogu unositi samo za aktivno natjecanje');
    }

    const categoryOpen = this.isCategoryOpen(competition, dto.category);
    const sessionValid =
      Boolean(dto.session_started_at) &&
      isSessionWithinCategoryWindow(competition, dto.category, dto.session_started_at!);

    if (!categoryOpen && !sessionValid) {
      throw new BadRequestException(
        `Kategorija ${dto.category} trenutno nije otvorena za unos rezultata`,
      );
    }

    if (dto.attempt_number > competition.launches_per_category) {
      throw new BadRequestException(
        `Dozvoljeno je najviše ${competition.launches_per_category} ispaljivanja po kategoriji`,
      );
    }

    const maxSeconds = CATEGORY_MAX_SECONDS[dto.category];
    let failed = dto.failed;
    let durationSeconds = dto.duration_seconds;

    if (!failed && durationSeconds > maxSeconds) {
      durationSeconds = maxSeconds;
    }

    const { data: member } = await this.supabase.db
      .from('team_members')
      .select('id')
      .eq('team_id', dto.team_id)
      .eq('competitor_id', dto.competitor_id)
      .maybeSingle();

    if (!member) {
      throw new BadRequestException('Natjecatelj nije u odabranom timu');
    }

    const { data: existingLaunches } = await this.supabase.db
      .from('launches')
      .select('attempt_number')
      .eq('team_id', dto.team_id)
      .eq('competitor_id', dto.competitor_id)
      .eq('category', dto.category);

    const completedCount = existingLaunches?.length ?? 0;
    const nextAttempt = completedCount + 1;

    if (user.role === 'judge') {
      if (completedCount >= competition.launches_per_category) {
        throw new BadRequestException(
          'Svi pokušaji za ovu kategoriju su već uneseni',
        );
      }

      if (dto.attempt_number !== nextAttempt) {
        throw new BadRequestException(
          `Sljedeći pokušaj za ovu kategoriju je ${nextAttempt}`,
        );
      }
    }

    const payload = {
      competition_id: dto.competition_id,
      team_id: dto.team_id,
      competitor_id: dto.competitor_id,
      category: dto.category,
      attempt_number: dto.attempt_number,
      duration_seconds: failed ? 0 : durationSeconds,
      failed,
      updated_at: new Date().toISOString(),
    };

    const query =
      user.role === 'judge'
        ? this.supabase.db.from('launches').insert(payload)
        : this.supabase.db.from('launches').upsert(payload, {
            onConflict: 'team_id,competitor_id,category,attempt_number',
          });

    const { data, error } = await query
      .select('*, competitor:competitors(*, club:clubs(*))')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async update(id: string, dto: UpdateLaunchDto, user: User) {
    const { data: launch, error } = await this.supabase.db
      .from('launches')
      .select('*, competition:competitions(*)')
      .eq('id', id)
      .single();

    if (error || !launch) {
      throw new NotFoundException('Rezultat nije pronađen');
    }

    const competition = launch.competition as {
      status: string;
      traka_open?: boolean;
      padobran_open?: boolean;
    };

    if (competition.status !== 'active') {
      throw new BadRequestException(
        'Rezultati se mogu uređivati samo za aktivno natjecanje',
      );
    }

    const maxSeconds = CATEGORY_MAX_SECONDS[launch.category as LaunchCategory];
    let durationSeconds = dto.failed ? 0 : dto.duration_seconds;

    if (!dto.failed && durationSeconds > maxSeconds) {
      durationSeconds = maxSeconds;
    }

    return unwrapSupabase(
      await this.supabase.db
        .from('launches')
        .update({
          duration_seconds: durationSeconds,
          failed: dto.failed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, competitor:competitors(*, club:clubs(*))')
        .single(),
    );
  }

  private isCategoryOpen(
    competition: { traka_open?: boolean; padobran_open?: boolean },
    category: LaunchCategory,
  ): boolean {
    return category === 'traka'
      ? Boolean(competition.traka_open)
      : Boolean(competition.padobran_open);
  }
}
