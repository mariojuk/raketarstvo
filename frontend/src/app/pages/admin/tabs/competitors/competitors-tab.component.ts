import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { CompetitorsApi } from '../../../../core/api';
import {
  COMPETITOR_AGE_LABELS,
  Competitor,
  CompetitorAgeCategory,
} from '../../../../core/models';
import { ModalComponent } from '../../../../shared/modal/modal.component';
import { AdminBusyService } from '../../shared/admin-busy.service';
import { AdminDataService } from '../../shared/admin-data.service';
import {
  confirmDelete,
  fieldErrorMessage,
  filterByQuery,
  showFieldError,
} from '../../shared/admin-form.utils';
import { AdminSectionComponent } from '../../shared/admin-section.component';

@Component({
  selector: 'app-competitors-tab',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, ModalComponent, AdminSectionComponent],
  template: `
    <app-admin-section
      title="Natjecatelji"
      actionLabel="Novi natjecatelj"
      [busy]="busy()"
      (actionClick)="openNewCompetitor()"
    >
      <label>
        Pretraži
        <input
          [ngModel]="competitorSearch()"
          (ngModelChange)="competitorSearch.set($event)"
          name="competitorSearch"
          placeholder="Ime ili klub..."
        />
      </label>
      <table>
        <thead><tr><th>Ime</th><th>Klub</th><th>Kategorija</th><th>Akcije</th></tr></thead>
        <tbody>
          @if (!filteredCompetitors().length) {
            <tr>
              <td colspan="4" class="muted">Nema rezultata pretrage.</td>
            </tr>
          } @else {
            @for (item of filteredCompetitors(); track item.id) {
              <tr>
                <td>{{ item.name }}</td>
                <td>{{ item.club?.name }}</td>
                <td>{{ competitorAgeLabels[item.age_category] }}</td>
                <td>
                  <div class="actions">
                    <button type="button" class="btn btn--secondary" (click)="startEditCompetitor(item)">Uredi</button>
                    <button type="button" class="btn btn--danger" [disabled]="busy()" (click)="deleteCompetitor(item.id)">Obriši</button>
                  </div>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </app-admin-section>

    <app-modal
      [open]="competitorModalOpen()"
      [title]="editingCompetitorId() ? 'Uredi natjecatelja' : 'Novi natjecatelj'"
      (closed)="cancelCompetitorEdit()"
    >
      <form [formGroup]="competitorForm" (ngSubmit)="saveCompetitor()">
        <label>
          Ime
          <input formControlName="name" />
          @if (showFieldError(competitorForm, 'name')) {
            <span class="error">{{ fieldErrorMessage(competitorForm, 'name') }}</span>
          }
        </label>
        <label>
          Klub
          <select formControlName="club_id">
            <option value="">Odaberi klub</option>
            @for (club of data.clubs(); track club.id) {
              <option [value]="club.id">{{ club.name }}</option>
            }
          </select>
          @if (showFieldError(competitorForm, 'club_id')) {
            <span class="error">{{ fieldErrorMessage(competitorForm, 'club_id') }}</span>
          }
        </label>
        <label>
          Kategorija
          <select formControlName="age_category">
            <option value="osnovna">{{ competitorAgeLabels.osnovna }}</option>
            <option value="srednje">{{ competitorAgeLabels.srednje }}</option>
          </select>
          @if (showFieldError(competitorForm, 'age_category')) {
            <span class="error">{{ fieldErrorMessage(competitorForm, 'age_category') }}</span>
          }
        </label>
        <div class="actions">
          <button class="btn" type="submit" [disabled]="busy()">
            {{ editingCompetitorId() ? 'Spremi promjene' : 'Dodaj natjecatelja' }}
          </button>
          <button type="button" class="btn btn--secondary" (click)="cancelCompetitorEdit()">Odustani</button>
        </div>
      </form>
    </app-modal>
  `,
})
export class CompetitorsTabComponent {
  readonly data = inject(AdminDataService);
  private readonly busySvc = inject(AdminBusyService);
  private readonly competitorsApi = inject(CompetitorsApi);
  private readonly fb = inject(FormBuilder);

  readonly busy = this.busySvc.busy;
  readonly showFieldError = showFieldError;
  readonly fieldErrorMessage = fieldErrorMessage;
  readonly competitorAgeLabels = COMPETITOR_AGE_LABELS;

  readonly competitorSearch = signal('');
  readonly editingCompetitorId = signal<string | null>(null);
  readonly competitorModalOpen = signal(false);

  readonly filteredCompetitors = computed(() =>
    filterByQuery(this.data.competitors(), this.competitorSearch(), (item) => [
      item.name,
      item.club?.name,
      COMPETITOR_AGE_LABELS[item.age_category],
    ]),
  );

  readonly competitorForm = this.fb.group({
    name: ['', Validators.required],
    club_id: ['', Validators.required],
    age_category: ['osnovna' as CompetitorAgeCategory, Validators.required],
  });

  openNewCompetitor(): void {
    this.editingCompetitorId.set(null);
    this.competitorForm.reset({ name: '', club_id: '', age_category: 'osnovna' });
    this.competitorModalOpen.set(true);
  }

  async saveCompetitor(): Promise<void> {
    if (this.competitorForm.invalid) {
      this.competitorForm.markAllAsTouched();
      return;
    }

    const payload = this.competitorForm.getRawValue() as {
      name: string;
      club_id: string;
      age_category: CompetitorAgeCategory;
    };

    await this.busySvc.run(async () => {
      try {
        const id = this.editingCompetitorId();
        if (id) {
          await this.competitorsApi.update(id, payload);
          this.data.notify('Natjecatelj ažuriran');
        } else {
          await this.competitorsApi.create(payload);
          this.data.notify('Natjecatelj dodan');
        }
        this.cancelCompetitorEdit();
        await this.data.reloadCompetitors();
      } catch (err) {
        this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
      }
    });
  }

  startEditCompetitor(item: Competitor): void {
    this.editingCompetitorId.set(item.id);
    this.competitorForm.reset({
      name: item.name,
      club_id: item.club_id,
      age_category: item.age_category,
    });
    this.competitorModalOpen.set(true);
  }

  cancelCompetitorEdit(): void {
    this.editingCompetitorId.set(null);
    this.competitorForm.reset({ name: '', club_id: '', age_category: 'osnovna' });
    this.competitorModalOpen.set(false);
  }

  async deleteCompetitor(id: string): Promise<void> {
    if (!confirmDelete('ovog natjecatelja')) {
      return;
    }

    await this.busySvc.run(async () => {
      try {
        if (this.editingCompetitorId() === id) {
          this.cancelCompetitorEdit();
        }
        await this.competitorsApi.remove(id);
        this.data.competitors.update((items) => items.filter((item) => item.id !== id));
        await this.data.reloadCompetitors();
        this.data.notify('Natjecatelj obrisan');
      } catch (err) {
        this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
      }
    });
  }
}
