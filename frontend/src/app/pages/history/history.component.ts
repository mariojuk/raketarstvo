import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Competition, STATUS_LABELS } from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1 class="page-title">Povijest natjecanja</h1>

    @if (!competitions().length) {
      <p class="muted">Nema završenih natjecanja.</p>
    } @else {
      <div class="card">
        <table>
          <thead>
            <tr>
              <th>Naziv</th>
              <th>Lokacija</th>
              <th>Datum</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (item of competitions(); track item.id) {
              <tr>
                <td>{{ item.name }}</td>
                <td>{{ item.location || '-' }}</td>
                <td>{{ item.start_date || '-' }}</td>
                <td><a [routerLink]="['/natjecanja', item.id]">Rezultati</a></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class HistoryComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);

  readonly statusLabels = STATUS_LABELS;
  readonly competitions = signal<Competition[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      const response = await this.api.get<Competition[]>('/competitions?status=finished');
      this.competitions.set(response);
    } catch (err) {
      this.notifications.error(err instanceof Error ? err.message : 'Greška pri učitavanju');
    }
  }
}
