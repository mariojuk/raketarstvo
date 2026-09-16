import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info';

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly items = signal<NotificationItem[]>([]);

  private counter = 0;

  show(message: string, type: NotificationType = 'success', durationMs = 5000): void {
    const id = `${Date.now()}-${++this.counter}`;

    this.items.update((items) => [...items, { id, message, type }]);

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error', 7000);
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  dismiss(id: string): void {
    this.items.update((items) => items.filter((item) => item.id !== id));
  }
}
