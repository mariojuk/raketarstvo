import { Injectable, inject } from '@angular/core';
import { Team } from '../models';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

export interface TeamPayload {
  name?: string;
  competitor_ids: string[];
}

@Injectable({ providedIn: 'root' })
export class TeamsApi {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private token(): string {
    return this.auth.getToken() ?? '';
  }

  list(): Promise<Team[]> {
    return this.api.get<Team[]>('/teams', this.token());
  }

  listByCompetition(competitionId: string): Promise<Team[]> {
    return this.api.get<Team[]>(`/teams/competition/${competitionId}`);
  }

  create(body: TeamPayload): Promise<Team> {
    return this.api.post<Team>('/teams', body, this.token());
  }

  update(id: string, body: TeamPayload): Promise<Team> {
    return this.api.patch<Team>(`/teams/${id}`, body, this.token());
  }

  remove(id: string): Promise<void> {
    return this.api.delete(`/teams/${id}`, this.token());
  }
}
