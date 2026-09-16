import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Competition, STATUS_LABELS } from '../../core/models';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="hero card">
      <h1 class="page-title">Natjecanja u raketarstvu</h1>
      <p class="muted">
        Pratite nadolazeća natjecanja, uživo rezultate i povijest prethodnih događaja.
      </p>
      <div class="actions">
        <a routerLink="/natjecanja" class="btn">Pogledaj natjecanja</a>
        <a routerLink="/povijest" class="btn btn--secondary">Povijest</a>
      </div>
    </section>

    <section class="grid grid-2" style="margin-top: 1rem">
      <article class="card">
        <h2>Aktivna natjecanja</h2>
        @if (loading()) {
          <p class="muted">Učitavanje...</p>
        } @else if (!active().length) {
          <p class="muted">Trenutno nema aktivnih natjecanja.</p>
        } @else {
          @for (item of active(); track item.id) {
            <p>
              <a [routerLink]="['/natjecanja', item.id]">{{ item.name }}</a>
            </p>
          }
        }
      </article>

      <article class="card">
        <h2>Nadolazeća natjecanja</h2>
        @if (!upcoming().length) {
          <p class="muted">Nema najavljenih natjecanja.</p>
        } @else {
          @for (item of upcoming(); track item.id) {
            <p>
              <strong>{{ item.name }}</strong>
              <span class="badge badge--upcoming">{{ statusLabels[item.status] }}</span>
            </p>
          }
        }
      </article>
    </section>
  `,
})
export class HomeComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly statusLabels = STATUS_LABELS;
  readonly loading = signal(true);
  readonly active = signal<Competition[]>([]);
  readonly upcoming = signal<Competition[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      const [active, upcoming] = await Promise.all([
        this.api.get<Competition[]>('/competitions?status=active'),
        this.api.get<Competition[]>('/competitions?status=upcoming'),
      ]);

      this.active.set(active);
      this.upcoming.set(upcoming);
    } finally {
      this.loading.set(false);
    }
  }
}
