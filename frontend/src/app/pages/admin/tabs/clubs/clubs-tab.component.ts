import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClubsApi } from '../../../../core/api';
import { Club } from '../../../../core/models';
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
  selector: 'app-clubs-tab',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, AdminSectionComponent],
  template: `
    <app-admin-section
      title="Klubovi"
      actionLabel="Novi klub"
      [busy]="busy()"
      (actionClick)="openNewClub()"
    >
      <table>
        <thead><tr><th>Naziv</th><th>Akcije</th></tr></thead>
        <tbody>
          @for (club of data.clubs(); track club.id) {
            <tr>
              <td>{{ club.name }}</td>
              <td>
                <div class="actions">
                  <button type="button" class="btn btn--secondary" (click)="startEditClub(club)">Uredi</button>
                  <button type="button" class="btn btn--danger" [disabled]="busy()" (click)="deleteClub(club.id)">Obriši</button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </app-admin-section>

    <app-modal
      [open]="clubModalOpen()"
      [title]="editingClubId() ? 'Uredi klub' : 'Novi klub'"
      (closed)="cancelClubEdit()"
    >
      <form [formGroup]="clubForm" (ngSubmit)="saveClub()">
        <label>
          Naziv kluba
          <input formControlName="name" />
          @if (showFieldError(clubForm, 'name')) {
            <span class="error">{{ fieldErrorMessage(clubForm, 'name') }}</span>
          }
        </label>
        <div class="actions">
          <button class="btn" type="submit" [disabled]="busy()">
            {{ editingClubId() ? 'Spremi promjene' : 'Dodaj klub' }}
          </button>
          <button type="button" class="btn btn--secondary" (click)="cancelClubEdit()">Odustani</button>
        </div>
      </form>
    </app-modal>
  `,
})
export class ClubsTabComponent {
  readonly data = inject(AdminDataService);
  private readonly busySvc = inject(AdminBusyService);
  private readonly clubsApi = inject(ClubsApi);
  private readonly fb = inject(FormBuilder);

  readonly busy = this.busySvc.busy;
  readonly showFieldError = showFieldError;
  readonly fieldErrorMessage = fieldErrorMessage;

  readonly editingClubId = signal<string | null>(null);
  readonly clubModalOpen = signal(false);

  readonly clubForm = this.fb.group({
    name: ['', Validators.required],
  });

  openNewClub(): void {
    this.editingClubId.set(null);
    this.clubForm.reset({ name: '' });
    this.clubModalOpen.set(true);
  }

  async saveClub(): Promise<void> {
    if (this.clubForm.invalid) {
      this.clubForm.markAllAsTouched();
      return;
    }

    const payload = this.clubForm.getRawValue() as { name: string };

    await this.busySvc.run(async () => {
      try {
        const id = this.editingClubId();
        if (id) {
          await this.clubsApi.update(id, payload);
          this.data.notify('Klub ažuriran');
        } else {
          await this.clubsApi.create(payload);
          this.data.notify('Klub dodan');
        }
        this.cancelClubEdit();
        await this.data.reloadClubs();
      } catch (err) {
        this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
      }
    });
  }

  startEditClub(club: Club): void {
    this.editingClubId.set(club.id);
    this.clubForm.reset({ name: club.name });
    this.clubModalOpen.set(true);
  }

  cancelClubEdit(): void {
    this.editingClubId.set(null);
    this.clubForm.reset({ name: '' });
    this.clubModalOpen.set(false);
  }

  async deleteClub(id: string): Promise<void> {
    if (!confirmDelete('ovaj klub')) {
      return;
    }

    await this.busySvc.run(async () => {
      try {
        if (this.editingClubId() === id) {
          this.cancelClubEdit();
        }
        await this.clubsApi.remove(id);
        this.data.clubs.update((items) => items.filter((item) => item.id !== id));
        await Promise.all([this.data.reloadClubs(), this.data.reloadCompetitors()]);
        this.data.notify('Klub obrisan');
      } catch (err) {
        this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
      }
    });
  }
}
