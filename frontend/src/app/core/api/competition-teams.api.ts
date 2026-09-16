import { Injectable, inject } from '@angular/core';
import { CompetitionTeam } from '../models';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class CompetitionTeamsApi {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private token(): string {
    return this.auth.getToken() ?? '';
  }

  listByCompetition(competitionId: string): Promise<CompetitionTeam[]> {
    return this.api.get<CompetitionTeam[]>(
      `/competition-teams?competition_id=${competitionId}`,
    );
  }

  register(competitionId: string, teamId: string): Promise<CompetitionTeam> {
    return this.api.post<CompetitionTeam>(
      '/competition-teams',
      { competition_id: competitionId, team_id: teamId },
      this.token(),
    );
  }

  remove(id: string): Promise<void> {
    return this.api.delete(`/competition-teams/${id}`, this.token());
  }
}
