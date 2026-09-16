import { Injectable, inject } from '@angular/core';
import { Launch } from '../models';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class LaunchesApi {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private token(): string {
    return this.auth.getToken() ?? '';
  }

  listByTeam(teamId: string): Promise<Launch[]> {
    return this.api.get<Launch[]>(`/launches/team/${teamId}`, this.token());
  }

  update(
    id: string,
    body: { duration_seconds: number; failed: boolean },
  ): Promise<Launch> {
    return this.api.patch<Launch>(`/launches/${id}`, body, this.token());
  }
}
