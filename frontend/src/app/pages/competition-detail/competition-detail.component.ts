import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  CompetitionDetails,
  Competitor,
  COMPETITOR_AGE_LABELS,
  Launch,
  RESULT_VIEWS,
  ResultViewKey,
  STATUS_LABELS,
  resultViewLabel,
} from '../../core/models';
import {
  buildCategoryResultRows,
  buildCompetitorLookup,
  buildTeamResultRows,
} from '../../core/result-ranking.util';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { SupabaseRealtimeService } from '../../core/services/supabase-realtime.service';

@Component({
  selector: 'app-competition-detail',
  standalone: true,
  imports: [DecimalPipe],
  styles: [
    `
      .tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .tabs__btn {
        padding: 0.5rem 1rem;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc;
        cursor: pointer;
        font: inherit;
        color: #475569;
      }

      .tabs__btn--active {
        background: #2563eb;
        border-color: #2563eb;
        color: #fff;
      }

      .results-section {
        margin-bottom: 2rem;
      }
    `,
  ],
  template: `
    @if (competition()) {
      <header class="card" style="margin-bottom: 1rem">
        <h1 class="page-title">{{ competition()!.name }}</h1>
        <p class="muted">{{ competition()!.location || 'Lokacija TBA' }}</p>
        <span class="badge" [class]="'badge--' + competition()!.status">
          {{ statusLabels[competition()!.status] }}
        </span>
      </header>

      <section class="card" style="margin-bottom: 1rem">
        <h2>Timovi</h2>
        @if (!competition()!.teams.length) {
          <p class="muted">Timovi još nisu formirani.</p>
        } @else {
          @for (team of competition()!.teams; track team.id) {
            <div style="margin-bottom: 1rem">
              <h3>{{ team.name || 'Tim ' + team.id.slice(0, 6) }}</h3>
              <ul>
                @for (member of team.members || []; track member.id) {
                  <li>
                    {{ member.competitor.name }}
                    ({{ member.competitor.club?.name }},
                    {{ ageLabels[member.competitor.age_category] }})
                  </li>
                }
              </ul>
            </div>
          }
        }
      </section>

      <section class="card">
        <h2>Rezultati @if (competition()!.status === 'active') { (uživo) }</h2>

        <div class="tabs" role="tablist">
          @for (view of resultViews; track view.ageCategory + view.launchCategory) {
            <button
              type="button"
              role="tab"
              class="tabs__btn"
              [class.tabs__btn--active]="isActiveView(view)"
              [attr.aria-selected]="isActiveView(view)"
              (click)="activeResultView.set(view)"
            >
              {{ resultViewLabel(view) }}
            </button>
          }
        </div>

        <div class="results-section">
          <h3>Natjecatelji – {{ resultViewLabel(activeResultView()) }}</h3>
          @if (!categoryResultRows().length) {
            <p class="muted">Nema natjecatelja za odabranu kategoriju.</p>
          } @else {
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Natjecatelj</th>
                  @for (attempt of attemptNumbers(); track attempt) {
                    <th>Pokušaj {{ attempt }}</th>
                  }
                  <th>Ukupno (s)</th>
                </tr>
              </thead>
              <tbody>
                @for (row of categoryResultRows(); track row.competitorId; let rank = $index) {
                  <tr>
                    <td>{{ rank + 1 }}</td>
                    <td>
                      {{ row.name }}
                      @if (row.clubName) {
                        <span class="muted"> ({{ row.clubName }})</span>
                      }
                    </td>
                    @for (time of row.attempts; track $index) {
                      <td>{{ time }}</td>
                    }
                    <td><strong>{{ row.total | number: '1.3-3' }}</strong></td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

        <div class="results-section">
          <h3>Timovi – {{ resultViewLabel(activeResultView()) }}</h3>
          @if (!teamResultRows().length) {
            <p class="muted">Nema timova s natjecateljima u odabranoj kategoriji.</p>
          } @else {
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tim</th>
                  <th>Natjecatelji</th>
                  <th>Ukupno (s)</th>
                </tr>
              </thead>
              <tbody>
                @for (row of teamResultRows(); track row.teamId; let rank = $index) {
                  <tr>
                    <td>{{ rank + 1 }}</td>
                    <td>
                      {{ row.name }}
                      @if (row.clubName) {
                        <span class="muted"> ({{ row.clubName }})</span>
                      }
                    </td>
                    <td>{{ row.members }}</td>
                    <td><strong>{{ row.total | number: '1.3-3' }}</strong></td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </section>
    } @else if (loadFailed()) {
      <p class="muted">Natjecanje nije dostupno.</p>
    } @else {
      <p class="muted">Učitavanje...</p>
    }
  `,
})
export class CompetitionDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly realtime = inject(SupabaseRealtimeService);
  private readonly notifications = inject(NotificationService);

  readonly statusLabels = STATUS_LABELS;
  readonly ageLabels = COMPETITOR_AGE_LABELS;
  readonly resultViews = RESULT_VIEWS;
  readonly resultViewLabel = resultViewLabel;
  readonly activeResultView = signal<ResultViewKey>(RESULT_VIEWS[0]);
  readonly competition = signal<CompetitionDetails | null>(null);
  readonly launches = signal<Launch[]>([]);
  readonly loadFailed = signal(false);

  readonly attemptNumbers = computed(() => {
    const count = this.competition()?.launches_per_category ?? 2;
    return Array.from({ length: count }, (_, index) => index + 1);
  });

  readonly categoryResultRows = computed(() => {
    const competition = this.competition();
    const view = this.activeResultView();
    if (!competition) {
      return [];
    }

    return buildCategoryResultRows(
      competition,
      view.launchCategory,
      this.launches(),
      this.competitorById,
      view.ageCategory,
    );
  });

  readonly teamResultRows = computed(() => {
    const competition = this.competition();
    const view = this.activeResultView();
    if (!competition) {
      return [];
    }

    return buildTeamResultRows(
      competition,
      view.launchCategory,
      this.launches(),
      view.ageCategory,
    );
  });

  private channel: RealtimeChannel | null = null;
  private readonly competitorById = new Map<string, Competitor>();

  isActiveView(view: ResultViewKey): boolean {
    const active = this.activeResultView();
    return (
      active.ageCategory === view.ageCategory &&
      active.launchCategory === view.launchCategory
    );
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.loadFailed.set(true);
      this.notifications.error('Natjecanje nije pronađeno');
      return;
    }

    try {
      const data = await this.api.get<CompetitionDetails>(`/competitions/${id}`);
      this.competition.set(data);
      this.competitorById.clear();
      buildCompetitorLookup(data).forEach((value, key) => this.competitorById.set(key, value));
      this.launches.set((data.launches ?? []).map((launch) => this.enrichLaunch(launch)));

      const teamIds = (data.teams ?? []).map((team) => team.id);
      if (teamIds.length) {
        this.channel = this.realtime.subscribeToLaunches(teamIds, (launch) => {
          const enriched = this.enrichLaunch(launch);
          this.launches.update((items) => {
            const index = items.findIndex((item) => item.id === enriched.id);
            if (index >= 0) {
              const next = [...items];
              next[index] = enriched;
              return next;
            }
            return [...items, enriched];
          });
        });
      }
    } catch (err) {
      this.loadFailed.set(true);
      this.notifications.error(err instanceof Error ? err.message : 'Greška pri učitavanju');
    }
  }

  ngOnDestroy(): void {
    if (this.channel) {
      this.realtime.unsubscribe(this.channel);
    }
  }

  private enrichLaunch(launch: Launch): Launch {
    if (launch.competitor?.name) {
      return launch;
    }

    const competitor = this.competitorById.get(launch.competitor_id);
    return competitor ? { ...launch, competitor } : launch;
  }
}
