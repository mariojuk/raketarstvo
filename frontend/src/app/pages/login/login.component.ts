import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="card" style="max-width: 420px; margin: 0 auto">
      <h1 class="page-title">Prijava</h1>
      <p class="muted">Admini i suci se prijavljuju emailom i lozinkom.</p>

      <form (ngSubmit)="submit()">
        <label>
          Email
          <input type="email" [(ngModel)]="email" name="email" required />
        </label>
        <label>
          Lozinka
          <input type="password" [(ngModel)]="password" name="password" required />
        </label>

        <button class="btn" type="submit" [disabled]="loading()">
          {{ loading() ? 'Prijava...' : 'Prijavi se' }}
        </button>
      </form>
    </section>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  email = '';
  password = '';
  readonly loading = signal(false);

  async submit(): Promise<void> {
    this.loading.set(true);

    try {
      await this.auth.login(this.email, this.password);
      const role = this.auth.user()?.role;

      if (role === 'admin') {
        await this.router.navigate(['/admin']);
      } else if (role === 'judge') {
        await this.router.navigate(['/sudac']);
      } else {
        await this.router.navigate(['/']);
      }
    } catch (err) {
      this.notifications.error(err instanceof Error ? err.message : 'Prijava nije uspjela');
    } finally {
      this.loading.set(false);
    }
  }
}
