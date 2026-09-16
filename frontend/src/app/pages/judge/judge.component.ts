import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  CATEGORY_LABELS,
  CATEGORY_MAX,
  Competition,
  formatDurationClock,
  getCategoryRemainingMs,
  getOpenCategory,
  isCategoryOpen,
  JudgeAssignment,
  Launch,
  LaunchCategory,
  TeamMember,
} from '../../core/models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { SupabaseRealtimeService } from '../../core/services/supabase-realtime.service';

@Component({
  selector: 'app-judge',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1 class="page-title">Sudac – unos rezultata</h1>

    @if (loadFailed()) {
      <p class="muted">Dodjele nisu dostupne. Obratite se administratoru.</p>
    } @else if (!assignments().length) {
      <p class="muted">Nema dodijeljenih timova. Obratite se administratoru.</p>
    } @else {
      <section class="card" style="margin-bottom: 1rem">
        <label>
          Odaberi dodjelu
          <select
            [(ngModel)]="selectedAssignmentId"
            name="assignment"
            (ngModelChange)="onAssignmentChange()"
          >
            @for (item of assignments(); track item.id) {
              <option [value]="item.id">{{ assignmentLabel(item) }}</option>
            }
          </select>
        </label>
      </section>

      @if (assignment()) {
        <section class="card" style="margin-bottom: 1rem">
          <h2>{{ assignment()!.competition?.name }}</h2>
          <p class="muted">
            Tim: {{ assignment()!.team?.name || 'Bez naziva' }}
            · {{ assignmentScopeLabel(assignment()!) }}
          </p>
          @if (assignment()!.competition?.status !== 'active') {
            <p class="error">Natjecanje nije aktivno. Unos rezultata nije moguć.</p>
          } @else if (!activeCategory()) {
            <p class="error">Nijedna kategorija nije otvorena. Admin mora otvoriti kategoriju.</p>
          } @else {
            <p class="muted">
              Aktivna kategorija:
              <strong>{{ categoryLabels[activeCategory()!] }}</strong>
              (max let {{ categoryMax[activeCategory()!] }}s)
            </p>
            @if (categoryRemainingLabel()) {
              <p class="muted">Preostalo vrijeme kategorije: <strong>{{ categoryRemainingLabel() }}</strong></p>
            }
            @if (started()) {
              <p class="muted">Stoperica pokrenuta – rezultat će se prihvatiti i nakon isteka kategorije.</p>
            }
          }
        </section>

        @if (assignment()!.competition?.status === 'active' && (activeCategory() || started())) {
          @if (!availableCompetitors().length) {
            <section class="card">
              <p class="muted">
                Svi dodijeljeni natjecatelji su završili pokušaje za kategoriju
                {{ categoryLabels[activeCategory()!] }}.
              </p>
            </section>
          } @else {
            <section class="grid grid-2">
              <article class="card">
                <h2>Stoperica</h2>

                <label>
                  Natjecatelj
                  <select
                    [(ngModel)]="selectedCompetitorId"
                    name="competitor"
                    (ngModelChange)="onSelectionChange()"
                  >
                    @for (member of availableCompetitors(); track member.id) {
                      <option [value]="member.competitor.id">{{ member.competitor.name }}</option>
                    }
                  </select>
                </label>

                @if (nextAttemptNumber() !== null) {
                  <p class="muted">Pokušaj: <strong>{{ nextAttemptNumber() }}</strong> / {{ maxAttempts() }}</p>

                  <div class="stopwatch">{{ formattedTime() }}</div>

                  <div class="actions">
                    <button type="button" class="btn" (click)="start()" [disabled]="!canStartStopwatch() || started() || saving()">Start</button>
                    <button type="button" class="btn btn--secondary" (click)="stop()" [disabled]="!started() || saving()">Stop</button>
                    <button type="button" class="btn btn--danger" (click)="markFailed()" [disabled]="!started() || saving()">0 – Neuspjeh</button>
                  </div>
                } @else {
                  <p class="muted">Odaberite natjecatelja s preostalim pokušajima.</p>
                }
              </article>

              <article class="card">
                <h2>Dodijeljeni natjecatelji</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Ime</th>
                      <th>Klub</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (member of assignedMembers(); track member.id) {
                      <tr>
                        <td>{{ member.competitor.name }}</td>
                        <td>{{ member.competitor.club?.name }}</td>
                        <td>
                          @if (isCompetitorComplete(member.competitor.id)) {
                            <span class="muted">Završeno</span>
                          } @else {
                            <span>{{ competitorProgress(member.competitor.id) }}</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </article>
            </section>
          }
        }
      }
    }
  `,
})
export class JudgeComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly realtime = inject(SupabaseRealtimeService);
  private readonly notifications = inject(NotificationService);

  readonly categoryLabels = CATEGORY_LABELS;
  readonly categoryMax = CATEGORY_MAX;
  readonly assignments = signal<JudgeAssignment[]>([]);
  readonly assignment = signal<JudgeAssignment | null>(null);
  readonly launches = signal<Launch[]>([]);
  readonly loadFailed = signal(false);
  readonly running = signal(false);
  readonly started = signal(false);
  readonly saving = signal(false);
  readonly elapsedMs = signal(0);
  readonly now = signal(Date.now());

  selectedAssignmentId = '';
  selectedCompetitorId = '';

  private startedAt = 0;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private categoryTimerId: ReturnType<typeof setInterval> | null = null;
  private failed = false;
  private stopwatchSessionStartedAt: string | null = null;
  private sessionCategory: LaunchCategory | null = null;
  private competitionChannel: RealtimeChannel | null = null;

  readonly assignedMembers = computed(() => {
    const current = this.assignment();
    const members = current?.team?.members ?? [];

    if (!current) {
      return [];
    }

    if (current.competitor_id) {
      return members.filter((member) => member.competitor.id === current.competitor_id);
    }

    return members;
  });

  async ngOnInit(): Promise<void> {
    try {
      const token = this.auth.getToken() ?? '';
      const assignments = await this.api.get<JudgeAssignment[]>('/judge-assignments/my', token);
      this.assignments.set(assignments);
      this.selectedAssignmentId = assignments[0]?.id ?? '';
      await this.onAssignmentChange();
      this.categoryTimerId = setInterval(() => this.tickCategoryClock(), 1000);
    } catch (err) {
      this.loadFailed.set(true);
      this.notifications.error(err instanceof Error ? err.message : 'Dodjele nisu pronađene');
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.clearCategoryTimer();
    this.unsubscribeCompetition();
  }

  categoryRemainingLabel(): string | null {
    const competition = this.assignment()?.competition;
    const category = this.activeCategory();
    if (!competition || !category || !isCategoryOpen(competition, category)) {
      return null;
    }

    const remaining = getCategoryRemainingMs(competition, category, this.now());
    if (remaining === null) {
      return null;
    }

    if (remaining <= 0) {
      return '0:00';
    }

    return formatDurationClock(remaining);
  }

  canStartStopwatch(): boolean {
    if (this.started()) {
      return false;
    }

    const competition = this.assignment()?.competition;
    const category = this.activeCategory();
    if (!competition || !category || competition.status !== 'active') {
      return false;
    }

    if (!isCategoryOpen(competition, category)) {
      return false;
    }

    const remaining = getCategoryRemainingMs(competition, category, this.now());
    return remaining === null || remaining > 0;
  }

  assignmentLabel(item: JudgeAssignment): string {
    const teamName = item.team?.name || `Tim ${item.team_id.slice(0, 6)}`;
    const scope = this.assignmentScopeLabel(item);
    return `${item.competition?.name} – ${teamName} (${scope})`;
  }

  assignmentScopeLabel(item: JudgeAssignment): string {
    return item.competitor_id
      ? item.competitor?.name ?? 'Pojedinačni natjecatelj'
      : 'Cijeli tim';
  }

  activeCategory(): LaunchCategory | null {
    const competition = this.assignment()?.competition;
    if (!competition) {
      return null;
    }

    if (this.started() && this.sessionCategory) {
      return this.sessionCategory;
    }

    return getOpenCategory(competition);
  }

  maxAttempts(): number {
    return this.assignment()?.competition?.launches_per_category ?? 2;
  }

  availableCompetitors(): TeamMember[] {
    const category = this.activeCategory();
    if (!category) {
      return [];
    }

    return this.assignedMembers().filter(
      (member) => this.getCompletedAttempts(member.competitor.id, category) < this.maxAttempts(),
    );
  }

  nextAttemptNumber(): number | null {
    const category = this.activeCategory();
    if (!category || !this.selectedCompetitorId) {
      return null;
    }

    const completed = this.getCompletedAttempts(this.selectedCompetitorId, category);
    if (completed >= this.maxAttempts()) {
      return null;
    }

    return completed + 1;
  }

  isCompetitorComplete(competitorId: string): boolean {
    const category = this.activeCategory();
    if (!category) {
      return false;
    }

    return this.getCompletedAttempts(competitorId, category) >= this.maxAttempts();
  }

  competitorProgress(competitorId: string): string {
    const category = this.activeCategory();
    if (!category) {
      return '—';
    }

    const done = this.getCompletedAttempts(competitorId, category);
    return `${done}/${this.maxAttempts()}`;
  }

  async onAssignmentChange(): Promise<void> {
    const selected =
      this.assignments().find((item) => item.id === this.selectedAssignmentId) ?? null;
    this.assignment.set(selected);
    this.elapsedMs.set(0);
    this.failed = false;
    this.running.set(false);
    this.started.set(false);
    this.clearTimer();
    this.stopwatchSessionStartedAt = null;
    this.sessionCategory = null;
    this.unsubscribeCompetition();

    if (!selected?.team) {
      this.launches.set([]);
      return;
    }

    try {
      const token = this.auth.getToken() ?? '';
      const launches = await this.api.get<Launch[]>(`/launches/team/${selected.team_id}`, token);
      this.launches.set(launches);
    } catch (err) {
      this.notifications.error(err instanceof Error ? err.message : 'Rezultati nisu učitani');
      this.launches.set([]);
    }

    if (selected.competition_id) {
      this.subscribeToCompetition(selected.competition_id);
    }

    this.syncSelection();
  }

  onSelectionChange(): void {
    this.elapsedMs.set(0);
    this.failed = false;
    this.running.set(false);
    this.started.set(false);
    this.stopwatchSessionStartedAt = null;
    this.sessionCategory = null;
    this.clearTimer();
  }

  formattedTime(): string {
    const totalSeconds = this.elapsedMs() / 1000;
    return totalSeconds.toFixed(2);
  }

  start(): void {
    if (!this.canStartStopwatch()) {
      return;
    }

    this.failed = false;
    this.started.set(true);
    this.running.set(true);
    this.stopwatchSessionStartedAt = new Date().toISOString();
    this.sessionCategory = getOpenCategory(this.assignment()!.competition!) ?? null;
    this.startedAt = performance.now() - this.elapsedMs();
    this.clearTimer();
    this.timerId = setInterval(() => {
      this.elapsedMs.set(performance.now() - this.startedAt);
    }, 50);
  }

  async stop(): Promise<void> {
    this.running.set(false);
    this.clearTimer();
    this.elapsedMs.set(performance.now() - this.startedAt);
    await this.save();
  }

  async markFailed(): Promise<void> {
    this.running.set(false);
    this.clearTimer();
    this.failed = true;
    this.elapsedMs.set(0);
    await this.save();
  }

  async save(): Promise<void> {
    const current = this.assignment();
    const category = this.activeCategory();
    const attemptNumber = this.nextAttemptNumber();

    if (!current?.team || !category || !this.selectedCompetitorId || attemptNumber === null) {
      return;
    }

    const seconds = this.elapsedMs() / 1000;
    const max = CATEGORY_MAX[category];
    const failed = this.failed;
    const durationSeconds = failed ? 0 : Math.min(seconds, max);
    const wasCapped = !failed && seconds > max;

    this.saving.set(true);

    try {
      await this.api.post(
        '/launches',
        {
          competition_id: current.competition_id,
          team_id: current.team_id,
          competitor_id: this.selectedCompetitorId,
          category,
          attempt_number: attemptNumber,
          duration_seconds: Number(durationSeconds.toFixed(3)),
          failed,
          session_started_at: this.stopwatchSessionStartedAt ?? undefined,
        },
        this.auth.getToken() ?? '',
      );

      const token = this.auth.getToken() ?? '';
      const launches = await this.api.get<Launch[]>(`/launches/team/${current.team_id}`, token);
      this.launches.set(launches);

      this.notifications.success(
        wasCapped
          ? `Prekoračeno max vrijeme – zabilježeno ${max}s`
          : 'Rezultat spremljen',
      );
      this.elapsedMs.set(0);
      this.failed = false;
      this.started.set(false);
      this.stopwatchSessionStartedAt = null;
      this.sessionCategory = null;
      this.syncSelection();
    } catch (err) {
      this.notifications.error(err instanceof Error ? err.message : 'Spremanje nije uspjelo');
      this.started.set(false);
    } finally {
      this.saving.set(false);
    }
  }

  private getCompletedAttempts(competitorId: string, category: LaunchCategory): number {
    const teamId = this.assignment()?.team_id;
    if (!teamId) {
      return 0;
    }

    return this.launches().filter(
      (launch) =>
        launch.team_id === teamId &&
        launch.competitor_id === competitorId &&
        launch.category === category,
    ).length;
  }

  private syncSelection(): void {
    const available = this.availableCompetitors();
    const stillAvailable = available.some(
      (member) => member.competitor.id === this.selectedCompetitorId,
    );

    if (!stillAvailable) {
      this.selectedCompetitorId = available[0]?.competitor.id ?? '';
    }
  }

  private subscribeToCompetition(competitionId: string): void {
    this.competitionChannel = this.realtime.subscribeToCompetition(
      competitionId,
      (updated) => this.applyCompetitionUpdate(updated),
    );
  }

  private applyCompetitionUpdate(updated: Competition): void {
    this.assignment.update((current) => {
      if (!current || current.competition_id !== updated.id) {
        return current;
      }

      return {
        ...current,
        competition: { ...current.competition!, ...updated },
      };
    });

    this.assignments.update((items) =>
      items.map((item) =>
        item.competition_id === updated.id
          ? { ...item, competition: { ...item.competition!, ...updated } }
          : item,
      ),
    );

    this.syncSelection();
  }

  private unsubscribeCompetition(): void {
    if (this.competitionChannel) {
      this.realtime.unsubscribe(this.competitionChannel);
      this.competitionChannel = null;
    }
  }

  private async tickCategoryClock(): Promise<void> {
    this.now.set(Date.now());

    const competition = this.assignment()?.competition;
    const category = this.activeCategory();
    if (!competition || !category || !isCategoryOpen(competition, category)) {
      return;
    }

    const remaining = getCategoryRemainingMs(competition, category, this.now());
    if (remaining !== null && remaining <= 0 && !this.started()) {
      await this.refreshAssignmentCompetition();
    }
  }

  private async refreshAssignmentCompetition(): Promise<void> {
    const current = this.assignment();
    if (!current?.competition_id) {
      return;
    }

    try {
      const competition = await this.api.get<Competition>(
        `/competitions/${current.competition_id}`,
      );
      const launches = await this.api.get<Launch[]>(
        `/launches/team/${current.team_id}`,
        this.auth.getToken() ?? '',
      );
      this.launches.set(launches);
      this.applyCompetitionUpdate(competition);
    } catch {
      // Ignoriraj – sljedeći zahtjev će sinkronizirati stanje.
    }
  }

  private clearCategoryTimer(): void {
    if (this.categoryTimerId) {
      clearInterval(this.categoryTimerId);
      this.categoryTimerId = null;
    }
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
