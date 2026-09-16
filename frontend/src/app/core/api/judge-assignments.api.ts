import { Injectable, inject } from '@angular/core';
import { JudgeAssignment } from '../models';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class JudgeAssignmentsApi {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private token(): string {
    return this.auth.getToken() ?? '';
  }

  listByCompetition(competitionId: string): Promise<JudgeAssignment[]> {
    return this.api.get<JudgeAssignment[]>(
      `/judge-assignments?competition_id=${competitionId}`,
      this.token(),
    );
  }

  assignTeam(body: {
    competition_id: string;
    judge_id: string;
    team_id: string;
  }): Promise<JudgeAssignment> {
    return this.api.post<JudgeAssignment>(
      '/judge-assignments',
      body,
      this.token(),
    );
  }

  assignMembers(body: {
    competition_id: string;
    team_id: string;
    assignments: { competitor_id: string; judge_id: string }[];
  }): Promise<JudgeAssignment[]> {
    return this.api.post<JudgeAssignment[]>(
      '/judge-assignments/members',
      body,
      this.token(),
    );
  }

  remove(id: string): Promise<void> {
    return this.api.delete(`/judge-assignments/${id}`, this.token());
  }
}
