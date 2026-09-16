import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TeamsApi } from '../../../../core/api';
import { COMPETITOR_AGE_LABELS, Team } from '../../../../core/models';
import { ModalComponent } from '../../../../shared/modal/modal.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../../shared/searchable-select/searchable-select.component';
import { AdminBusyService } from '../../shared/admin-busy.service';
import { AdminDataService } from '../../shared/admin-data.service';
import {
  confirmDelete,
  fieldErrorMessage,
  showFieldError,
} from '../../shared/admin-form.utils';
import { AdminSectionComponent } from '../../shared/admin-section.component';

@Component({
  selector: 'app-teams-tab',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    SearchableSelectComponent,
    AdminSectionComponent,
  ],
  template: `
    <app-admin-section
      title="Timovi"
      actionLabel="Novi tim"
      [busy]="busy()"
      (actionClick)="openNewTeam()"
    >
      @if (!data.teams().length) {
        <p class="muted">Još nema kreiranih timova.</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Naziv</th>
              <th>Natjecatelji</th>
              <th>Natjecanje</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            @for (team of data.teams(); track team.id) {
              <tr>
                <td>{{ team.name || 'Tim ' + team.id.slice(0, 6) }}</td>
                <td>
                  @for (member of team.members || []; track member.id) {
                    <div>{{ member.competitor.name }} ({{ member.competitor.club?.name }})</div>
                  }
                </td>
                <td>{{ team.competition?.name || '—' }}</td>
                <td>
                  <div class="actions">
                    <button type="button" class="btn btn--secondary" (click)="startEditTeam(team)">Uredi</button>
                    <button type="button" class="btn btn--danger" [disabled]="busy()" (click)="deleteTeam(team.id)">Obriši</button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </app-admin-section>

    <app-modal
      [open]="teamModalOpen()"
      [title]="editingTeamId() ? 'Uredi tim' : 'Novi tim'"
      (closed)="cancelTeamEdit()"
    >
      <form [formGroup]="teamForm" (ngSubmit)="saveTeam()">
        <label>Naziv tima<input formControlName="name" /></label>
        <label>
          Natjecatelj 1
          <app-searchable-select
            formControlName="competitor1"
            [options]="competitorOptions()"
            placeholder="Pretraži i odaberi natjecatelja..."
            [required]="true"
          />
          @if (showFieldError(teamForm, 'competitor1')) {
            <span class="error">{{ fieldErrorMessage(teamForm, 'competitor1') }}</span>
          }
        </label>
        <label>
          Natjecatelj 2
          <app-searchable-select
            formControlName="competitor2"
            [options]="competitorOptions()"
            placeholder="Pretraži i odaberi natjecatelja..."
            [required]="true"
          />
          @if (showFieldError(teamForm, 'competitor2')) {
            <span class="error">{{ fieldErrorMessage(teamForm, 'competitor2') }}</span>
          }
        </label>
        <label>
          Natjecatelj 3 (opcionalno)
          <app-searchable-select
            formControlName="competitor3"
            [options]="competitorOptions()"
            placeholder="Pretraži i odaberi natjecatelja..."
            emptyLabel="Bez trećeg"
            [allowEmpty]="true"
          />
        </label>
        <div class="actions">
          <button class="btn" type="submit" [disabled]="busy()">
            {{ editingTeamId() ? 'Spremi promjene' : 'Kreiraj tim' }}
          </button>
          <button type="button" class="btn btn--secondary" (click)="cancelTeamEdit()">Odustani</button>
        </div>
      </form>
    </app-modal>
  `,
})
export class TeamsTabComponent {
  readonly data = inject(AdminDataService);
  private readonly busySvc = inject(AdminBusyService);
  private readonly teamsApi = inject(TeamsApi);
  private readonly fb = inject(FormBuilder);

  readonly busy = this.busySvc.busy;
  readonly showFieldError = showFieldError;
  readonly fieldErrorMessage = fieldErrorMessage;

  readonly editingTeamId = signal<string | null>(null);
  readonly teamModalOpen = signal(false);

  readonly competitorOptions = computed<SearchableSelectOption[]>(() =>
    this.data.competitors().map((item) => ({
      value: item.id,
      label: `${item.name} (${item.club?.name ?? 'Bez kluba'}, ${COMPETITOR_AGE_LABELS[item.age_category]})`,
    })),
  );

  readonly teamForm = this.fb.group({
    name: [''],
    competitor1: ['', Validators.required],
    competitor2: ['', Validators.required],
    competitor3: [''],
  });

  openNewTeam(): void {
    this.editingTeamId.set(null);
    this.teamForm.reset({
      name: '',
      competitor1: '',
      competitor2: '',
      competitor3: '',
    });
    this.teamModalOpen.set(true);
  }

  startEditTeam(team: Team): void {
    const members = team.members ?? [];
    this.editingTeamId.set(team.id);
    this.teamForm.reset({
      name: team.name ?? '',
      competitor1: members[0]?.competitor.id ?? '',
      competitor2: members[1]?.competitor.id ?? '',
      competitor3: members[2]?.competitor.id ?? '',
    });
    this.teamModalOpen.set(true);
  }

  cancelTeamEdit(): void {
    this.editingTeamId.set(null);
    this.teamForm.reset({
      name: '',
      competitor1: '',
      competitor2: '',
      competitor3: '',
    });
    this.teamModalOpen.set(false);
  }

  async saveTeam(): Promise<void> {
    if (this.teamForm.invalid) {
      this.teamForm.markAllAsTouched();
      return;
    }

    const value = this.teamForm.getRawValue();
    const competitor_ids = [value.competitor1, value.competitor2]
      .concat(value.competitor3 ? [value.competitor3] : [])
      .filter(Boolean) as string[];

    await this.busySvc.run(async () => {
      try {
        const payload = {
          name: value.name || undefined,
          competitor_ids,
        };

        const id = this.editingTeamId();
        if (id) {
          await this.teamsApi.update(id, payload);
          this.data.notify('Tim ažuriran');
        } else {
          await this.teamsApi.create(payload);
          this.data.notify('Tim spremljen');
        }

        this.cancelTeamEdit();
        await this.data.reloadTeams();
      } catch (err) {
        this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
      }
    });
  }

  async deleteTeam(id: string): Promise<void> {
    if (!confirmDelete('ovaj tim')) {
      return;
    }

    await this.busySvc.run(async () => {
      try {
        if (this.editingTeamId() === id) {
          this.cancelTeamEdit();
        }
        await this.teamsApi.remove(id);
        this.data.teams.update((items) => items.filter((item) => item.id !== id));
        await this.data.reloadTeams();
        this.data.notify('Tim obrisan');
      } catch (err) {
        this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
      }
    });
  }
}
