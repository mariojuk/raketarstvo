import { Component, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    @if (open()) {
      <div class="modal-backdrop" (click)="onBackdropClick()">
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          (click)="$event.stopPropagation()"
        >
          <header class="modal__header">
            <h2 [id]="titleId">{{ title() }}</h2>
            <button type="button" class="modal__close" (click)="closed.emit()" aria-label="Zatvori">
              ×
            </button>
          </header>
          <div class="modal__body">
            <ng-content />
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        background: rgba(15, 23, 42, 0.55);
      }

      .modal {
        width: min(520px, 100%);
        max-height: min(90vh, 720px);
        overflow: auto;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.2);
      }

      .modal__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 1.25rem;
        border-bottom: 1px solid #e2e8f0;
      }

      .modal__header h2 {
        margin: 0;
        font-size: 1.15rem;
      }

      .modal__close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: #64748b;
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
      }

      .modal__close:hover {
        background: #f1f5f9;
        color: #0f172a;
      }

      .modal__body {
        padding: 1.25rem;
      }
    `,
  ],
})
export class ModalComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly closeOnBackdrop = input(true);
  readonly closed = output<void>();

  readonly titleId = `modal-title-${Math.random().toString(36).slice(2, 9)}`;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.closed.emit();
    }
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop()) {
      this.closed.emit();
    }
  }
}
