import { Injectable, signal } from '@angular/core';

@Injectable()
export class AdminBusyService {
  readonly busy = signal(false);

  async run(action: () => Promise<void>): Promise<void> {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);
    try {
      await action();
    } finally {
      this.busy.set(false);
    }
  }
}
