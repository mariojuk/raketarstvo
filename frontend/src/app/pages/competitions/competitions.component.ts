import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Competition, STATUS_LABELS } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-competitions',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1 class="page-title">Natjecanja</h1>

    <div class="grid grid-2">
      @for (item of competitions(); track item.id) {
        <article class="card">
          <h2>{{ item.name }}</h2>
          <p class="muted">{{ item.location || 'Lokacija TBA' }}</p>
          <span class="badge" [class]="'badge--' + item.status">{{ statusLabels[item.status] }}</span>
          <div class="actions" style="margin-top: 0.75rem">
            <a [routerLink]="['/natjecanja', item.id]" class="btn">Detalji</a>
          </div>
        </article>
      }
    </div>
  `,
})
export class CompetitionsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);

  readonly statusLabels = STATUS_LABELS;
  readonly competitions = signal<Competition[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      const response = await this.api.get<Competition[]>('/competitions');
      this.competitions.set(response);
    } catch (err) {
      this.notifications.error(err instanceof Error ? err.message : 'Greška pri učitavanju');
    }
  }
}
