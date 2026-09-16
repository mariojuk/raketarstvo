import { Injectable, inject } from '@angular/core';
import { Club } from '../models';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class ClubsApi {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private token(): string {
    return this.auth.getToken() ?? '';
  }

  list(): Promise<Club[]> {
    return this.api.get<Club[]>('/clubs', this.token());
  }

  create(body: { name: string }): Promise<Club> {
    return this.api.post<Club>('/clubs', body, this.token());
  }

  update(id: string, body: { name: string }): Promise<Club> {
    return this.api.patch<Club>(`/clubs/${id}`, body, this.token());
  }

  remove(id: string): Promise<void> {
    return this.api.delete(`/clubs/${id}`, this.token());
  }
}
