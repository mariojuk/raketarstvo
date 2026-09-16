import { Injectable, inject } from '@angular/core';
import { Competitor, CompetitorAgeCategory } from '../models';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

export interface CompetitorPayload {
  name: string;
  club_id: string;
  age_category: CompetitorAgeCategory;
}

@Injectable({ providedIn: 'root' })
export class CompetitorsApi {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private token(): string {
    return this.auth.getToken() ?? '';
  }

  list(): Promise<Competitor[]> {
    return this.api.get<Competitor[]>('/competitors');
  }

  create(body: CompetitorPayload): Promise<Competitor> {
    return this.api.post<Competitor>('/competitors', body, this.token());
  }

  update(id: string, body: CompetitorPayload): Promise<Competitor> {
    return this.api.patch<Competitor>(`/competitors/${id}`, body, this.token());
  }

  remove(id: string): Promise<void> {
    return this.api.delete(`/competitors/${id}`, this.token());
  }
}
