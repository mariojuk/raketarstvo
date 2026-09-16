import { Injectable, inject } from '@angular/core';
import { Judge } from '../models';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

export interface JudgePayload {
  name: string;
  email: string;
  club_id: string;
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class JudgesApi {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private token(): string {
    return this.auth.getToken() ?? '';
  }

  list(): Promise<Judge[]> {
    return this.api.get<Judge[]>('/judges', this.token());
  }

  create(body: JudgePayload): Promise<Judge> {
    return this.api.post<Judge>('/judges', body, this.token());
  }

  update(id: string, body: JudgePayload): Promise<Judge> {
    return this.api.patch<Judge>(`/judges/${id}`, body, this.token());
  }

  remove(id: string): Promise<void> {
    return this.api.delete(`/judges/${id}`, this.token());
  }
}
