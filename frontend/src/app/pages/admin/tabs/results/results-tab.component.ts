import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LaunchesApi, TeamsApi } from '../../../../core/api';
import {
  CATEGORY_LABELS,
  CATEGORY_MAX,
  Launch,
  Team,
} from '../../../../core/models';
import { AdminBusyService } from '../../shared/admin-busy.service';
import { AdminDataService } from '../../shared/admin-data.service';

@Component({
  selector: 'app-results-tab',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="card grid">
      <h2>Rezultati aktivnih natjecanja</h2>

      <label>Natjecanje
        <select
          [(ngModel)]="resultsCompetitionId"
          name="resultsCompetition"
          (ngModelChange)="onResultsCompetitionChange()"
        >
          <option value="">Odaberi natjecanje</option>
          @for (item of activeCompetitions(); track item.id) {
            <option [value]="item.id">{{ item.name }}</option>
          }
        </select>
      </label>

      <label>Tim
        <select
          [(ngModel)]="resultsTeamId"
          name="resultsTeam"
          (ngModelChange)="loadResultsLaunches()"
        >
          <option value="">Odaberi tim</option>
          @for (item of resultTeams(); track item.id) {
            <option [value]="item.id">
              {{ item.competition?.name }} – {{ item.name || 'Tim ' + item.id.slice(0, 6) }}
            </option>
          }
        </select>
      </label>

      @if (editingLaunchId()) {
        <form (ngSubmit)="saveLaunchEdit()" class="card" style="background: #f8fafc">
          <h3>Uredi rezultat</h3>
          <p class="muted">
            {{ launchEditLabel() }}
          </p>
          <label>
            Vrijeme (s)
            <input
              type="number"
              step="0.001"
              min="0"
              [(ngModel)]="launchEditForm.duration_seconds"
              name="launchDuration"
              [disabled]="launchEditForm.failed"
              required
            />
          </label>
          <label style="flex-direction: row; align-items: center; gap: 0.5rem">
            <input
              type="checkbox"
              [(ngModel)]="launchEditForm.failed"
              name="launchFailed"
              (ngModelChange)="onLaunchFailedToggle($event)"
            />
            Neuspjelo ispaljivanje (0)
          </label>
          <div class="actions">
            <button class="btn" type="submit" [disabled]="busy()">Spremi promjene</button>
            <button type="button" class="btn btn--secondary" (click)="cancelLaunchEdit()">Odustani</button>
          </div>
        </form>
      }

      @if (!resultsTeamId) {
        <p class="muted">Odaberite tim za prikaz rezultata.</p>
      } @else if (!resultsLaunches().length) {
        <p class="muted">Nema unesenih rezultata za odabrani tim.</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Natjecatelj</th>
              <th>Kategorija</th>
              <th>Pokušaj</th>
              <th>Vrijeme (s)</th>
              <th>Status</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            @for (item of resultsLaunches(); track item.id) {
              <tr [class.row-editing]="editingLaunchId() === item.id">
                <td>{{ item.competitor?.name }}</td>
                <td>{{ categoryLabels[item.category] }}</td>
                <td>{{ item.attempt_number }}</td>
                <td>{{ item.duration_seconds }}</td>
                <td>{{ item.failed ? 'Neuspjeh' : 'OK' }}</td>
                <td>
                  <button type="button" class="btn btn--secondary" (click)="startEditLaunch(item)">
                    Uredi
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
})
export class ResultsTabComponent {
  readonly data = inject(AdminDataService);
  private readonly busySvc = inject(AdminBusyService);
  private readonly launchesApi = inject(LaunchesApi);
  private readonly teamsApi = inject(TeamsApi);

  readonly busy = this.busySvc.busy;
  readonly categoryLabels = CATEGORY_LABELS;

  resultsCompetitionId = '';
  resultsTeamId = '';
  readonly resultTeams = signal<Team[]>([]);
  readonly resultsLaunches = signal<Launch[]>([]);
  readonly editingLaunchId = signal<string | null>(null);
  readonly launchEditLabel = signal('');
  launchEditForm = { duration_seconds: 0, failed: false };

  readonly activeCompetitions = computed(() =>
    this.data.competitions().filter((item) => item.status === 'active'),
  );

  async onResultsCompetitionChange(): Promise<void> {
    this.resultsTeamId = '';
    this.resultsLaunches.set([]);
    this.cancelLaunchEdit();

    if (!this.resultsCompetitionId) {
      this.resultTeams.set([]);
      return;
    }

    const teams = await this.teamsApi.listByCompetition(this.resultsCompetitionId);
    this.resultTeams.set(teams);

    if (teams.length) {
      this.resultsTeamId = teams[0].id;
      await this.loadResultsLaunches();
    }
  }

  async loadResultsLaunches(): Promise<void> {
    this.cancelLaunchEdit();

    if (!this.resultsTeamId) {
      this.resultsLaunches.set([]);
      return;
    }

    try {
      const launches = await this.launchesApi.listByTeam(this.resultsTeamId);
      this.resultsLaunches.set(launches);
    } catch (err) {
      this.data.notify(
        err instanceof Error ? err.message : 'Greška pri učitavanju',
        'error',
      );
      this.resultsLaunches.set([]);
    }
  }

  startEditLaunch(launch: Launch): void {
    this.editingLaunchId.set(launch.id);
    this.launchEditForm = {
      duration_seconds: launch.duration_seconds,
      failed: launch.failed,
    };
    this.launchEditLabel.set(
      `${launch.competitor?.name ?? 'Natjecatelj'} – ${this.categoryLabels[launch.category]}, pokušaj ${launch.attempt_number}`,
    );
  }

  cancelLaunchEdit(): void {
    this.editingLaunchId.set(null);
    this.launchEditForm = { duration_seconds: 0, failed: false };
    this.launchEditLabel.set('');
  }

  onLaunchFailedToggle(failed: boolean): void {
    if (failed) {
      this.launchEditForm.duration_seconds = 0;
    }
  }

  async saveLaunchEdit(): Promise<void> {
    const id = this.editingLaunchId();
    if (!id) {
      return;
    }

    const launch = this.resultsLaunches().find((item) => item.id === id);
    if (!launch) {
      return;
    }

    const max = CATEGORY_MAX[launch.category];
    const durationSeconds = this.launchEditForm.failed
      ? 0
      : Math.min(Number(this.launchEditForm.duration_seconds), max);

    try {
      await this.launchesApi.update(id, {
        duration_seconds: durationSeconds,
        failed: this.launchEditForm.failed,
      });
      this.data.notify('Rezultat ažuriran');
      this.cancelLaunchEdit();
      await this.loadResultsLaunches();
    } catch (err) {
      this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }
}
