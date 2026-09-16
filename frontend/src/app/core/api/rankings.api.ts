import { Injectable, inject } from '@angular/core';
import {
  CompetitorAgeCategory,
  CompetitorRankOverride,
  LaunchCategory,
} from '../models';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RankingsApi {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private token(): string {
    return this.auth.getToken() ?? '';
  }

  save(body: {
    competition_id: string;
    category: LaunchCategory;
    age_category: CompetitorAgeCategory;
    overrides: { competitor_id: string; tie_break_order: number }[];
  }): Promise<CompetitorRankOverride[]> {
    return this.api.put<CompetitorRankOverride[]>(
      '/rankings',
      body,
      this.token(),
    );
  }
}
