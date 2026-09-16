import { Injectable, inject } from '@angular/core';
import { Competition, CompetitionDetails, LaunchCategory } from '../models';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

export interface CompetitionCreatePayload {
  name: string;
  location?: string;
  status: Competition['status'];
  launches_per_category: number;
  traka_window_seconds: number;
  padobran_window_seconds: number;
}

export interface CompetitionUpdatePayload {
  name?: string;
  location?: string;
  status?: Competition['status'];
  launches_per_category?: number;
  traka_window_seconds?: number;
  padobran_window_seconds?: number;
  traka_open?: boolean;
  padobran_open?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CompetitionsApi {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private token(): string {
    return this.auth.getToken() ?? '';
  }

  list(): Promise<Competition[]> {
    return this.api.get<Competition[]>('/competitions');
  }

  getById(id: string): Promise<CompetitionDetails> {
    return this.api.get<CompetitionDetails>(`/competitions/${id}`);
  }

  create(body: CompetitionCreatePayload): Promise<Competition> {
    return this.api.post<Competition>('/competitions', body, this.token());
  }

  update(id: string, body: CompetitionUpdatePayload): Promise<Competition> {
    return this.api.patch<Competition>(`/competitions/${id}`, body, this.token());
  }

  remove(id: string): Promise<void> {
    return this.api.delete(`/competitions/${id}`, this.token());
  }

  setCategoryOpen(
    id: string,
    category: LaunchCategory,
    open: boolean,
  ): Promise<Competition> {
    const body =
      category === 'traka' ? { traka_open: open } : { padobran_open: open };
    return this.update(id, body);
  }

  activate(id: string): Promise<Competition> {
    return this.update(id, { status: 'active' });
  }

  finish(id: string): Promise<Competition> {
    return this.update(id, {
      status: 'finished',
      traka_open: false,
      padobran_open: false,
    });
  }
}
