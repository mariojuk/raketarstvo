import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CompetitionsApi, RankingsApi } from '../../../../core/api';
import {
  AGE_CATEGORIES,
  CATEGORY_LABELS,
  CategoryResultRow,
  COMPETITOR_AGE_LABELS,
  CompetitionDetails,
  Competitor,
  CompetitorAgeCategory,
  LAUNCH_CATEGORIES,
  Launch,
  LaunchCategory,
  resultViewLabel,
  STATUS_LABELS,
} from '../../../../core/models';
import {
  buildCategoryResultRows,
  buildCompetitorLookup,
  buildTeamResultRows,
  getTiedCompetitorIds,
} from '../../../../core/result-ranking.util';
import { AdminBusyService } from '../../shared/admin-busy.service';
import { AdminDataService } from '../../shared/admin-data.service';

@Component({
  selector: 'app-ranking-tab',
  standalone: true,
  imports: [DecimalPipe, FormsModule],
  template: `
    <section class="card grid">
      <h2>Poredak – izjednačeni rezultati</h2>
      <p class="muted">
        Kad natjecatelji imaju isti ukupni rezultat, možete ručno promijeniti poredak strelicama gore/dolje.
      </p>

      <label>Natjecanje
        <select
          [(ngModel)]="rankingCompetitionId"
          name="rankingCompetition"
          (ngModelChange)="onRankingCompetitionChange()"
        >
          <option value="">Odaberi natjecanje</option>
          @for (item of data.competitions(); track item.id) {
            <option [value]="item.id">{{ item.name }} ({{ statusLabels[item.status] }})</option>
          }
        </select>
      </label>

      @if (rankingCompetitionId) {
        <label>Dobna kategorija
          <select
            [ngModel]="rankingAgeCategory()"
            (ngModelChange)="rankingAgeCategory.set($any($event))"
            name="rankingAgeCategory"
          >
            @for (age of ageCategories; track age) {
              <option [value]="age">{{ competitorAgeLabels[age] }}</option>
            }
          </select>
        </label>
        <label>Kategorija ispaljivanja
          <select
            [ngModel]="rankingCategory()"
            (ngModelChange)="rankingCategory.set($any($event))"
            name="rankingCategory"
          >
            @for (category of launchCategories; track category) {
              <option [value]="category">{{ categoryLabels[category] }}</option>
            }
          </select>
        </label>
        <p class="muted">
          Prikaz: {{ resultViewLabel({ ageCategory: rankingAgeCategory(), launchCategory: rankingCategory() }) }}
        </p>

        @if (!rankingRows().length) {
          <p class="muted">Nema natjecatelja za prikaz poretka.</p>
        } @else {
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Natjecatelj</th>
                <th>Ukupno (s)</th>
                <th>Poredak</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rankingRows(); track row.competitorId; let rank = $index) {
                <tr>
                  <td>{{ rank + 1 }}</td>
                  <td>
                    {{ row.name }}
                    @if (row.clubName) {
                      <span class="muted"> ({{ row.clubName }})</span>
                    }
                    @if (rankingTiedIds().has(row.competitorId)) {
                      <span class="badge badge--upcoming">Izjednačeno</span>
                    }
                  </td>
                  <td>{{ row.total | number: '1.3-3' }}</td>
                  <td>
                    @if (rankingTiedIds().has(row.competitorId)) {
                      <div class="actions">
                        <button
                          type="button"
                          class="btn btn--secondary"
                          aria-label="Pomakni gore u poretku"
                          [disabled]="busy() || !canMoveRanking(row.competitorId, 'up')"
                          (click)="moveRanking(row.competitorId, 'up')"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          class="btn btn--secondary"
                          aria-label="Pomakni dolje u poretku"
                          [disabled]="busy() || !canMoveRanking(row.competitorId, 'down')"
                          (click)="moveRanking(row.competitorId, 'down')"
                        >
                          ↓
                        </button>
                      </div>
                    } @else {
                      <span class="muted">—</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }

        <h3>Timovi – {{ resultViewLabel({ ageCategory: rankingAgeCategory(), launchCategory: rankingCategory() }) }}</h3>
        @if (!rankingTeamRows().length) {
          <p class="muted">Nema timova za odabranu kategoriju.</p>
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
              @for (row of rankingTeamRows(); track row.teamId; let rank = $index) {
                <tr>
                  <td>{{ rank + 1 }}</td>
                  <td>{{ row.name }}</td>
                  <td>{{ row.members }}</td>
                  <td>{{ row.total | number: '1.3-3' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      }
    </section>
  `,
})
export class RankingTabComponent {
  readonly data = inject(AdminDataService);
  private readonly busySvc = inject(AdminBusyService);
  private readonly competitionsApi = inject(CompetitionsApi);
  private readonly rankingsApi = inject(RankingsApi);

  readonly busy = this.busySvc.busy;
  readonly statusLabels = STATUS_LABELS;
  readonly categoryLabels = CATEGORY_LABELS;
  readonly competitorAgeLabels = COMPETITOR_AGE_LABELS;
  readonly launchCategories = LAUNCH_CATEGORIES;
  readonly ageCategories = AGE_CATEGORIES;
  readonly resultViewLabel = resultViewLabel;

  rankingCompetitionId = '';
  readonly rankingCompetition = signal<CompetitionDetails | null>(null);
  readonly rankingLaunches = signal<Launch[]>([]);
  readonly rankingAgeCategory = signal<CompetitorAgeCategory>('osnovna');
  readonly rankingCategory = signal<LaunchCategory>('traka');

  private readonly rankingCompetitorById = new Map<string, Competitor>();

  readonly rankingRows = computed(() => {
    const competition = this.rankingCompetition();
    if (!competition) {
      return [] as CategoryResultRow[];
    }

    return buildCategoryResultRows(
      competition,
      this.rankingCategory(),
      this.rankingLaunches(),
      this.rankingCompetitorById,
      this.rankingAgeCategory(),
    );
  });

  readonly rankingTeamRows = computed(() => {
    const competition = this.rankingCompetition();
    if (!competition) {
      return [];
    }

    return buildTeamResultRows(
      competition,
      this.rankingCategory(),
      this.rankingLaunches(),
      this.rankingAgeCategory(),
    );
  });

  readonly rankingTiedIds = computed(() => getTiedCompetitorIds(this.rankingRows()));

  async onRankingCompetitionChange(): Promise<void> {
    this.rankingCompetition.set(null);
    this.rankingLaunches.set([]);
    this.rankingCompetitorById.clear();

    if (!this.rankingCompetitionId) {
      return;
    }

    await this.loadRankingData();
  }

  async loadRankingData(): Promise<void> {
    if (!this.rankingCompetitionId) {
      return;
    }

    try {
      const data = await this.competitionsApi.getById(this.rankingCompetitionId);
      this.rankingCompetition.set(data);
      this.rankingLaunches.set(data.launches ?? []);
      this.rankingCompetitorById.clear();
      buildCompetitorLookup(data).forEach((value, key) =>
        this.rankingCompetitorById.set(key, value),
      );
    } catch (err) {
      this.data.notify(
        err instanceof Error ? err.message : 'Greška pri učitavanju poretka',
        'error',
      );
    }
  }

  canMoveRanking(competitorId: string, direction: 'up' | 'down'): boolean {
    const rows = this.rankingRows();
    const tied = this.rankingTiedIds();
    if (!tied.has(competitorId)) {
      return false;
    }

    const tiedRows = rows.filter((row) => tied.has(row.competitorId));
    const index = tiedRows.findIndex((row) => row.competitorId === competitorId);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    return swapIndex >= 0 && swapIndex < tiedRows.length;
  }

  async moveRanking(competitorId: string, direction: 'up' | 'down'): Promise<void> {
    const competition = this.rankingCompetition();
    if (!competition || !this.canMoveRanking(competitorId, direction)) {
      return;
    }

    const rows = this.rankingRows();
    const tied = this.rankingTiedIds();
    const tiedRows = rows.filter((row) => tied.has(row.competitorId));
    const index = tiedRows.findIndex((row) => row.competitorId === competitorId);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...tiedRows];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];

    await this.busySvc.run(async () => {
      try {
        const overrides = reordered.map((row, order) => ({
          competitor_id: row.competitorId,
          tie_break_order: order,
        }));

        const saved = await this.rankingsApi.save({
          competition_id: competition.id,
          category: this.rankingCategory(),
          age_category: this.rankingAgeCategory(),
          overrides,
        });

        const otherOverrides = (competition.rank_overrides ?? []).filter(
          (item) =>
            !(
              item.category === this.rankingCategory() &&
              (item.age_category ?? this.rankingAgeCategory()) ===
                this.rankingAgeCategory()
            ),
        );
        this.rankingCompetition.set({
          ...competition,
          rank_overrides: [...otherOverrides, ...saved],
        });
        this.data.notify('Poredak ažuriran');
      } catch (err) {
        this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
      }
    });
  }
}
