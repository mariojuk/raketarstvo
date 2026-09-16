import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { JudgesApi } from '../../../../core/api';
import { Judge } from '../../../../core/models';
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
  selector: 'app-judges-tab',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, ModalComponent, AdminSectionComponent],
  template: `
    <app-admin-section
      title="Suci"
      actionLabel="Novi sudac"
      [busy]="busy()"
      (actionClick)="openNewJudge()"
    >
      <label>
        Pretraži
        <input
          [ngModel]="judgeSearch()"
          (ngModelChange)="judgeSearch.set($event)"
          name="judgeSearch"
          placeholder="Ime, email ili klub..."
        />
      </label>
      <table>
        <thead><tr><th>Ime</th><th>Email</th><th>Klub</th><th>Akcije</th></tr></thead>
        <tbody>
          @if (!filteredJudges().length) {
            <tr>
              <td colspan="4" class="muted">Nema rezultata pretrage.</td>
            </tr>
          } @else {
            @for (item of filteredJudges(); track item.id) {
              <tr>
                <td>{{ item.name }}</td>
                <td>{{ item.email }}</td>
                <td>{{ item.club?.name }}</td>
                <td>
                  <div class="actions">
                    <button type="button" class="btn btn--secondary" (click)="startEditJudge(item)">Uredi</button>
                    <button type="button" class="btn btn--danger" [disabled]="busy()" (click)="deleteJudge(item.id)">Obriši</button>
                  </div>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </app-admin-section>

    <app-modal
      [open]="judgeModalOpen()"
      [title]="editingJudgeId() ? 'Uredi suca' : 'Novi sudac'"
      (closed)="cancelJudgeEdit()"
    >
      <form [formGroup]="judgeForm" (ngSubmit)="saveJudge()">
        <label>
          Ime
          <input formControlName="name" />
          @if (showFieldError(judgeForm, 'name')) {
            <span class="error">{{ fieldErrorMessage(judgeForm, 'name') }}</span>
          }
        </label>
        <label>
          Email
          <input type="email" formControlName="email" />
          @if (showFieldError(judgeForm, 'email')) {
            <span class="error">{{ fieldErrorMessage(judgeForm, 'email') }}</span>
          }
        </label>
        <label>
          Lozinka
          <input
            type="password"
            formControlName="password"
            [placeholder]="editingJudgeId() ? 'Ostavi prazno ako ne mijenjaš' : ''"
          />
          @if (showFieldError(judgeForm, 'password')) {
            <span class="error">{{ fieldErrorMessage(judgeForm, 'password') }}</span>
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
          @if (showFieldError(judgeForm, 'club_id')) {
            <span class="error">{{ fieldErrorMessage(judgeForm, 'club_id') }}</span>
          }
        </label>
        <div class="actions">
          <button class="btn" type="submit" [disabled]="busy()">
            {{ editingJudgeId() ? 'Spremi promjene' : 'Dodaj suca' }}
          </button>
          <button type="button" class="btn btn--secondary" (click)="cancelJudgeEdit()">Odustani</button>
        </div>
      </form>
    </app-modal>
  `,
})
export class JudgesTabComponent {
  readonly data = inject(AdminDataService);
  private readonly busySvc = inject(AdminBusyService);
  private readonly judgesApi = inject(JudgesApi);
  private readonly fb = inject(FormBuilder);

  readonly busy = this.busySvc.busy;
  readonly showFieldError = showFieldError;
  readonly fieldErrorMessage = fieldErrorMessage;

  readonly judgeSearch = signal('');
  readonly editingJudgeId = signal<string | null>(null);
  readonly judgeModalOpen = signal(false);

  readonly filteredJudges = computed(() =>
    filterByQuery(this.data.judges(), this.judgeSearch(), (item) => [
      item.name,
      item.email,
      item.club?.name,
    ]),
  );

  readonly judgeForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    club_id: ['', Validators.required],
  });

  private setJudgePasswordValidators(isNew: boolean): void {
    const passwordControl = this.judgeForm.get('password');
    if (!passwordControl) {
      return;
    }

    if (isNew) {
      passwordControl.setValidators([Validators.required, Validators.minLength(6)]);
    } else {
      passwordControl.clearValidators();
    }

    passwordControl.updateValueAndValidity();
  }

  openNewJudge(): void {
    this.editingJudgeId.set(null);
    this.setJudgePasswordValidators(true);
    this.judgeForm.reset({ name: '', email: '', password: '', club_id: '' });
    this.judgeModalOpen.set(true);
  }

  async saveJudge(): Promise<void> {
    if (this.judgeForm.invalid) {
      this.judgeForm.markAllAsTouched();
      return;
    }

    const value = this.judgeForm.getRawValue();
    const id = this.editingJudgeId();
    const payload: { name: string; email: string; club_id: string; password?: string } = {
      name: value.name ?? '',
      email: value.email ?? '',
      club_id: value.club_id ?? '',
    };

    if (value.password?.trim()) {
      payload.password = value.password;
    } else if (!id) {
      this.data.notify('Lozinka je obavezna za novog suca', 'error');
      return;
    }

    await this.busySvc.run(async () => {
      try {
        if (id) {
          await this.judgesApi.update(id, payload);
          this.data.notify('Sudac ažuriran');
        } else {
          await this.judgesApi.create(payload);
          this.data.notify('Sudac dodan');
        }
        this.cancelJudgeEdit();
        await this.data.reloadJudges();
      } catch (err) {
        this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
      }
    });
  }

  startEditJudge(item: Judge): void {
    this.editingJudgeId.set(item.id);
    this.setJudgePasswordValidators(false);
    this.judgeForm.reset({
      name: item.name,
      email: item.email,
      password: '',
      club_id: item.club_id,
    });
    this.judgeModalOpen.set(true);
  }

  cancelJudgeEdit(): void {
    this.editingJudgeId.set(null);
    this.setJudgePasswordValidators(false);
    this.judgeForm.reset({ name: '', email: '', password: '', club_id: '' });
    this.judgeModalOpen.set(false);
  }

  async deleteJudge(id: string): Promise<void> {
    if (!confirmDelete('ovog suca')) {
      return;
    }

    await this.busySvc.run(async () => {
      try {
        if (this.editingJudgeId() === id) {
          this.cancelJudgeEdit();
        }
        await this.judgesApi.remove(id);
        this.data.judges.update((items) => items.filter((item) => item.id !== id));
        await this.data.reloadJudges();
        this.data.notify('Sudac obrisan');
      } catch (err) {
        this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
      }
    });
  }
}
