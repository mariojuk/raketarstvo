import { Component, input, output } from '@angular/core';

/** Shared section chrome: title + optional primary action + projected content. */
@Component({
  selector: 'app-admin-section',
  standalone: true,
  template: `
    <section class="card grid">
      <div class="section-header">
        <h2>{{ title() }}</h2>
        @if (actionLabel()) {
          <button
            type="button"
            class="btn"
            [disabled]="busy()"
            (click)="actionClick.emit()"
          >
            {{ actionLabel() }}
          </button>
        }
      </div>
      <ng-content />
    </section>
  `,
  styles: [
    `
      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .section-header h2 {
        margin: 0;
      }
    `,
  ],
})
export class AdminSectionComponent {
  readonly title = input.required<string>();
  readonly actionLabel = input<string | null>(null);
  readonly busy = input(false);
  readonly actionClick = output<void>();
}
