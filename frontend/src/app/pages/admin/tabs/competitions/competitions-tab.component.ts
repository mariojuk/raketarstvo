import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { CompetitionsApi } from '../../../../core/api';
import {
  Competition,
  formatDurationClock,
  getCategoryRemainingMs,
  LaunchCategory,
  STATUS_LABELS,
} from '../../../../core/models';
import { ModalComponent } from '../../../../shared/modal/modal.component';
import { AdminBusyService } from '../../shared/admin-busy.service';
import { AdminDataService } from '../../shared/admin-data.service';
import {
  confirmDelete,
  fieldErrorMessage,
  showFieldError,
} from '../../shared/admin-form.utils';
import { AdminSectionComponent } from '../../shared/admin-section.component';

@Component({
  selector: 'app-competitions-tab',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, ModalComponent, AdminSectionComponent],
  template: `
    <app-admin-section
      title="Natjecanja"
      actionLabel="Novo natjecanje"
      [busy]="busy()"
      (actionClick)="openNewCompetition()"
    >
      <table>
        <thead>
          <tr>
            <th>Naziv</th>
            <th>Status</th>
            <th>Ispaljivanja</th>
            <th>Traka</th>
            <th>Padobran</th>
            <th>Vrijeme ispaljivanja</th>
            <th>Akcije</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (item of data.competitions(); track item.id) {
            <tr>
              <td>{{ item.name }}</td>
              <td>{{ statusLabels[item.status] }}</td>
              <td>{{ item.launches_per_category }}</td>
              <td>
                @if (item.status === 'active') {
                  <button
                    type="button"
                    class="btn"
                    [disabled]="busy()"
                    [class.btn--secondary]="!item.traka_open"
                    (click)="toggleCategory(item.id, 'traka', !item.traka_open)"
                  >
                    {{ item.traka_open ? 'Zatvori' : 'Otvori' }}
                  </button>
                  @if (item.traka_open) {
                    <div class="muted">{{ categoryRemainingLabel(item, 'traka') }}</div>
                  }
                } @else {
                  <span class="muted">—</span>
                }
              </td>
              <td>
                @if (item.status === 'active') {
                  <button
                    type="button"
                    class="btn"
                    [disabled]="busy()"
                    [class.btn--secondary]="!item.padobran_open"
                    (click)="toggleCategory(item.id, 'padobran', !item.padobran_open)"
                  >
                    {{ item.padobran_open ? 'Zatvori' : 'Otvori' }}
                  </button>
                  @if (item.padobran_open) {
                    <div class="muted">{{ categoryRemainingLabel(item, 'padobran') }}</div>
                  }
                } @else {
                  <span class="muted">—</span>
                }
              </td>
              <td>{{ competitionWindowsLabel(item) }}</td>
              <td>
                <div class="actions">
                  <button type="button" class="btn btn--secondary" (click)="startEditCompetition(item)">
                    Uredi
                  </button>
                  @if (item.status === 'upcoming') {
                    <button type="button" class="btn" [disabled]="busy()" (click)="activateCompetition(item.id)">
                      Aktiviraj
                    </button>
                  } @else if (item.status === 'active') {
                    <button type="button" class="btn btn--danger" [disabled]="busy()" (click)="finishCompetition(item.id)">
                      Završi
                    </button>
                  }
                </div>
              </td>
              <td>
                <button type="button" class="btn btn--danger" [disabled]="busy()" (click)="deleteCompetition(item.id)">Obriši</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </app-admin-section>

    <app-modal
      [open]="competitionModalOpen()"
      [title]="editingCompetitionId() ? 'Uredi natjecanje' : 'Novo natjecanje'"
      (closed)="cancelCompetitionEdit()"
    >
      <form [formGroup]="competitionForm" (ngSubmit)="saveCompetition()">
        <label>
          Naziv
          <input formControlName="name" />
          @if (showFieldError(competitionForm, 'name')) {
            <span class="error">{{ fieldErrorMessage(competitionForm, 'name') }}</span>
          }
        </label>
        <label>Lokacija<input formControlName="location" /></label>
        @if (!editingCompetitionId()) {
          <label>
            Status
            <select formControlName="status">
              <option value="upcoming">Nadolazeće</option>
              <option value="active">Aktivno</option>
              <option value="finished">Završeno</option>
            </select>
          </label>
        }
        <label>
          Broj ispaljivanja po kategoriji
          <select formControlName="launches_per_category">
            <option [ngValue]="2">2</option>
            <option [ngValue]="3">3</option>
          </select>
          @if (showFieldError(competitionForm, 'launches_per_category')) {
            <span class="error">{{ fieldErrorMessage(competitionForm, 'launches_per_category') }}</span>
          }
        </label>
        <label>
          Trajanje kategorije Traka (min)
          <input type="number" min="1" formControlName="traka_window_minutes" />
          @if (showFieldError(competitionForm, 'traka_window_minutes')) {
            <span class="error">{{ fieldErrorMessage(competitionForm, 'traka_window_minutes') }}</span>
          }
        </label>
        <label>
          Trajanje kategorije Padobran (min)
          <input type="number" min="1" formControlName="padobran_window_minutes" />
          @if (showFieldError(competitionForm, 'padobran_window_minutes')) {
            <span class="error">{{ fieldErrorMessage(competitionForm, 'padobran_window_minutes') }}</span>
          }
        </label>
        <div class="actions">
          <button class="btn" type="submit" [disabled]="busy()">
            {{ editingCompetitionId() ? 'Spremi promjene' : 'Kreiraj natjecanje' }}
          </button>
          <button type="button" class="btn btn--secondary" (click)="cancelCompetitionEdit()">Odustani</button>
        </div>
      </form>
    </app-modal>
  `,
})
export class CompetitionsTabComponent implements OnInit, OnDestroy {
  readonly data = inject(AdminDataService);
  private readonly busySvc = inject(AdminBusyService);
  private readonly competitionsApi = inject(CompetitionsApi);
  private readonly fb = inject(FormBuilder);

  readonly busy = this.busySvc.busy;
  readonly showFieldError = showFieldError;
  readonly fieldErrorMessage = fieldErrorMessage;
  readonly statusLabels = STATUS_LABELS;

  readonly editingCompetitionId = signal<string | null>(null);
  readonly competitionModalOpen = signal(false);
  readonly now = signal(Date.now());

  private nowTimerId: ReturnType<typeof setInterval> | null = null;

  readonly competitionForm = this.fb.group({
    name: ['', Validators.required],
    location: [''],
    status: ['upcoming' as Competition['status']],
    launches_per_category: [2, Validators.required],
    traka_window_minutes: [30, [Validators.required, Validators.min(1)]],
    padobran_window_minutes: [45, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.nowTimerId = setInterval(() => this.now.set(Date.now()), 1000);
  }

  ngOnDestroy(): void {
    if (this.nowTimerId !== null) {
      clearInterval(this.nowTimerId);
      this.nowTimerId = null;
    }
  }

  openNewCompetition(): void {
    this.editingCompetitionId.set(null);
    this.competitionForm.reset({
      name: '',
      location: '',
      status: 'upcoming',
      launches_per_category: 2,
      traka_window_minutes: 30,
      padobran_window_minutes: 45,
    });
    this.competitionModalOpen.set(true);
  }

  startEditCompetition(competition: Competition): void {
    this.editingCompetitionId.set(competition.id);
    this.competitionForm.reset({
      name: competition.name,
      location: competition.location ?? '',
      status: competition.status,
      launches_per_category: competition.launches_per_category,
      traka_window_minutes: Math.round((competition.traka_window_seconds ?? 1800) / 60),
      padobran_window_minutes: Math.round((competition.padobran_window_seconds ?? 2700) / 60),
    });
    this.competitionModalOpen.set(true);
  }

  cancelCompetitionEdit(): void {
    this.editingCompetitionId.set(null);
    this.competitionForm.reset({
      name: '',
      location: '',
      status: 'upcoming',
      launches_per_category: 2,
      traka_window_minutes: 30,
      padobran_window_minutes: 45,
    });
    this.competitionModalOpen.set(false);
  }

  async saveCompetition(): Promise<void> {
    if (this.competitionForm.invalid) {
      this.competitionForm.markAllAsTouched();
      return;
    }

    const value = this.competitionForm.getRawValue();
    const payload = {
      name: value.name ?? '',
      location: value.location ?? '',
      launches_per_category: value.launches_per_category ?? 2,
      traka_window_seconds: (value.traka_window_minutes ?? 30) * 60,
      padobran_window_seconds: (value.padobran_window_minutes ?? 45) * 60,
    };

    await this.busySvc.run(async () => {
      try {
        const id = this.editingCompetitionId();
        if (id) {
          await this.competitionsApi.update(id, payload);
          this.data.notify('Natjecanje ažurirano');
        } else {
          await this.competitionsApi.create({
            ...payload,
            status: value.status ?? 'upcoming',
          });
          this.data.notify('Natjecanje kreirano');
        }

        this.cancelCompetitionEdit();
        await this.data.reloadCompetitions();
      } catch (err) {
        this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
      }
    });
  }

  async deleteCompetition(id: string): Promise<void> {
    if (!confirmDelete('ovo natjecanje')) {
      return;
    }

    await this.busySvc.run(async () => {
      try {
        if (this.editingCompetitionId() === id) {
          this.cancelCompetitionEdit();
        }
        await this.competitionsApi.remove(id);
        this.data.competitions.update((items) => items.filter((item) => item.id !== id));
        await this.data.reloadCompetitions();
        this.data.notify('Natjecanje obrisano');
      } catch (err) {
        this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
      }
    });
  }

  categoryRemainingLabel(competition: Competition, category: LaunchCategory): string {
    const remaining = getCategoryRemainingMs(competition, category, this.now());
    if (remaining === null) {
      return '';
    }

    if (remaining <= 0) {
      return 'Isteklo';
    }

    return `Preostalo: ${formatDurationClock(remaining)}`;
  }

  competitionWindowsLabel(competition: Competition): string {
    const trakaMinutes = Math.round((competition.traka_window_seconds ?? 1800) / 60);
    const padobranMinutes = Math.round((competition.padobran_window_seconds ?? 2700) / 60);
    return `Traka ${trakaMinutes} min · Padobran ${padobranMinutes} min`;
  }

  async toggleCategory(
    id: string,
    category: LaunchCategory,
    open: boolean,
  ): Promise<void> {
    await this.busySvc.run(async () => {
      try {
        await this.competitionsApi.setCategoryOpen(id, category, open);
        await this.data.reloadCompetitions();
        this.data.notify(
          open
            ? `Kategorija ${category === 'traka' ? 'Traka' : 'Padobran'} otvorena`
            : `Kategorija ${category === 'traka' ? 'Traka' : 'Padobran'} zatvorena`,
        );
      } catch (err) {
        this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
      }
    });
  }

  async activateCompetition(id: string): Promise<void> {
    await this.busySvc.run(async () => {
      try {
        await this.competitionsApi.activate(id);
        await this.data.reloadCompetitions();
        this.data.notify('Natjecanje aktivirano');
      } catch (err) {
        this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
      }
    });
  }

  async finishCompetition(id: string): Promise<void> {
    if (!window.confirm('Završiti ovo natjecanje? Status će postati „završeno“.')) {
      return;
    }

    await this.busySvc.run(async () => {
      try {
        await this.competitionsApi.finish(id);
        await this.data.reloadCompetitions();
        this.data.notify('Natjecanje završeno');
      } catch (err) {
        this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
      }
    });
  }
}
