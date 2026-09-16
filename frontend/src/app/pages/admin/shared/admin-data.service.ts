import { Injectable, inject, signal } from '@angular/core';
import {
  ClubsApi,
  CompetitorsApi,
  CompetitionsApi,
  JudgesApi,
  TeamsApi,
} from '../../../core/api';
import {
  Club,
  Competition,
  Competitor,
  Judge,
  Team,
} from '../../../core/models';
import { NotificationService } from '../../../core/services/notification.service';

@Injectable()
export class AdminDataService {
  private readonly clubsApi = inject(ClubsApi);
  private readonly competitorsApi = inject(CompetitorsApi);
  private readonly judgesApi = inject(JudgesApi);
  private readonly competitionsApi = inject(CompetitionsApi);
  private readonly teamsApi = inject(TeamsApi);
  private readonly notifications = inject(NotificationService);

  readonly clubs = signal<Club[]>([]);
  readonly competitors = signal<Competitor[]>([]);
  readonly judges = signal<Judge[]>([]);
  readonly competitions = signal<Competition[]>([]);
  readonly teams = signal<Team[]>([]);

  notify(text: string, type: 'success' | 'error' = 'success'): void {
    if (type === 'error') {
      this.notifications.error(text);
      return;
    }
    this.notifications.success(text);
  }

  async reloadClubs(): Promise<void> {
    this.clubs.set(await this.clubsApi.list());
  }

  async reloadCompetitors(): Promise<void> {
    this.competitors.set(await this.competitorsApi.list());
  }

  async reloadJudges(): Promise<void> {
    this.judges.set(await this.judgesApi.list());
  }

  async reloadCompetitions(): Promise<void> {
    this.competitions.set(await this.competitionsApi.list());
  }

  async reloadTeams(): Promise<void> {
    try {
      this.teams.set(await this.teamsApi.list());
    } catch (err) {
      this.notify(
        err instanceof Error ? err.message : 'Greška pri učitavanju timova',
        'error',
      );
      this.teams.set([]);
    }
  }
}
