import { Component, inject } from '@angular/core';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-notification-host',
  standalone: true,
  template: `
    <div class="notification-host" aria-live="polite" aria-atomic="false">
      @for (item of notifications.items(); track item.id) {
        <div class="notification" [class]="'notification--' + item.type" role="status">
          <p class="notification__message">{{ item.message }}</p>
          <button
            type="button"
            class="notification__close"
            (click)="notifications.dismiss(item.id)"
            aria-label="Zatvori obavijest"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .notification-host {
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 1100;
        display: grid;
        gap: 0.75rem;
        width: min(360px, calc(100vw - 2rem));
        pointer-events: none;
      }

      .notification {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.9rem 1rem;
        border-radius: 10px;
        background: #fff;
        box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
        border-left: 4px solid #2563eb;
        pointer-events: auto;
        animation: notification-in 0.2s ease-out;
      }

      .notification--success {
        border-left-color: #059669;
      }

      .notification--error {
        border-left-color: #dc2626;
      }

      .notification--info {
        border-left-color: #2563eb;
      }

      .notification__message {
        margin: 0;
        flex: 1;
        font-size: 0.92rem;
        line-height: 1.45;
        color: #0f172a;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .notification__close {
        flex-shrink: 0;
        width: 1.75rem;
        height: 1.75rem;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: #64748b;
        font-size: 1.25rem;
        line-height: 1;
        cursor: pointer;
      }

      .notification__close:hover {
        background: #f1f5f9;
        color: #0f172a;
      }

      @keyframes notification-in {
        from {
          opacity: 0;
          transform: translateX(12px);
        }

        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `,
  ],
})
export class NotificationHostComponent {
  readonly notifications = inject(NotificationService);
}
