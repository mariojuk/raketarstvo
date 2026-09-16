import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CompetitionTeamsApi,
  JudgeAssignmentsApi,
} from '../../../../core/api';
import {
  CompetitionTeam,
  JudgeAssignment,
  STATUS_LABELS,
} from '../../../../core/models';
import { AdminBusyService } from '../../shared/admin-busy.service';
import { AdminDataService } from '../../shared/admin-data.service';
import { confirmDelete } from '../../shared/admin-form.utils';

@Component({
  selector: 'app-assignments-tab',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="card grid">
      <h2>Dodjela sudaca</h2>
      <p class="muted">
        Registrirajte timove na natjecanje, zatim dodijelite suca cijelom timu ili pojedinačnom natjecatelju.
        Rezultati tima dijele se na svim natjecanjima na kojima sudjeluje.
      </p>

      <label>Natjecanje
        <select
          [(ngModel)]="assignmentCompetitionId"
          name="assignmentCompetition"
          (ngModelChange)="onAssignmentCompetitionChange()"
        >
          <option value="">Odaberi natjecanje</option>
          @for (item of data.competitions(); track item.id) {
            <option [value]="item.id">
              {{ item.name }} ({{ statusLabels[item.status] }})
            </option>
          }
        </select>
      </label>

      @if (assignmentCompetitionId) {
        <div class="card" style="background: #f8fafc">
          <h3>Timovi na natjecanju</h3>
          <form (ngSubmit)="registerTeamOnCompetition()" class="actions">
            <label style="flex: 1">
              Dodaj tim
              <select [(ngModel)]="registerTeamId" name="registerTeam" required>
                <option value="">Odaberi tim</option>
                @for (team of availableTeamsForRegistration(); track team.id) {
                  <option [value]="team.id">
                    {{ team.name || 'Tim ' + team.id.slice(0, 6) }}
                  </option>
                }
              </select>
            </label>
            <button class="btn" type="submit" [disabled]="busy()">Registriraj</button>
          </form>

          @if (!competitionRegistrations().length) {
            <p class="muted">Nema registriranih timova.</p>
          } @else {
            <table>
              <thead>
                <tr><th>Tim</th><th>Natjecatelji</th><th>Akcije</th></tr>
              </thead>
              <tbody>
                @for (item of competitionRegistrations(); track item.id) {
                  <tr>
                    <td>{{ item.team?.name || 'Tim ' + item.team_id.slice(0, 6) }}</td>
                    <td>
                      @for (member of item.team?.members || []; track member.id) {
                        <div>{{ member.competitor.name }}</div>
                      }
                    </td>
                    <td>
                      <button type="button" class="btn btn--danger" [disabled]="busy()" (click)="unregisterTeam(item.id)">
                        Ukloni
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

        <div class="card" style="background: #f8fafc">
          <h3>Nova dodjela suca</h3>
          <form (ngSubmit)="createJudgeAssignment()" class="grid">
            <label>Tim
              <select
                [(ngModel)]="assignmentForm.team_id"
                name="assignmentTeam"
                (ngModelChange)="onAssignmentTeamChange()"
                required
              >
                <option value="">Odaberi tim</option>
                @for (item of competitionRegistrations(); track item.id) {
                  <option [value]="item.team_id">
                    {{ item.team?.name || 'Tim ' + item.team_id.slice(0, 6) }}
                  </option>
                }
              </select>
            </label>
            <label>Opseg
              <select
                [(ngModel)]="assignmentForm.scope"
                name="assignmentScope"
                (ngModelChange)="onAssignmentScopeChange()"
              >
                <option value="team">Cijeli tim</option>
                <option value="member">Pojedinačni natjecatelji</option>
              </select>
            </label>

            @if (assignmentForm.scope === 'team') {
              <label>Sudac
                <select [(ngModel)]="assignmentForm.judge_id" name="assignmentJudge" required>
                  <option value="">Odaberi suca</option>
                  @for (judge of data.judges(); track judge.id) {
                    <option [value]="judge.id">{{ judge.name }} ({{ judge.club?.name }})</option>
                  }
                </select>
              </label>
            } @else if (assignmentForm.team_id) {
              @if (assignmentTeamHasWholeTeamJudge()) {
                <p class="error">
                  Tim već ima suca za cijeli tim. Uklonite tu dodjelu prije pojedinačne dodjele.
                </p>
              } @else if (assignmentTeamMembers().length) {
                <div class="member-judge-grid">
                  <p class="muted">
                    Dodijelite suca svakom natjecatelju. Spremanje je moguće tek kad su sva polja popunjena.
                  </p>
                  <table>
                    <thead>
                      <tr>
                        <th>Natjecatelj</th>
                        <th>Sudac</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (member of assignmentTeamMembers(); track member.id) {
                        <tr>
                          <td>{{ member.competitor.name }}</td>
                          <td>
                            <select
                              [ngModel]="memberJudgeMap()[member.competitor.id]"
                              (ngModelChange)="setMemberJudge(member.competitor.id, $event)"
                              [name]="'memberJudge_' + member.competitor.id"
                              required
                            >
                              <option value="">Odaberi suca</option>
                              @for (judge of data.judges(); track judge.id) {
                                <option [value]="judge.id">
                                  {{ judge.name }} ({{ judge.club?.name }})
                                </option>
                              }
                            </select>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  @if (!canSubmitMemberAssignments()) {
                    <p class="muted">
                      Nedostaje sudac za
                      {{ missingMemberJudgeNames().join(', ') }}.
                    </p>
                  }
                </div>
              } @else {
                <p class="muted">Odabrani tim nema natjecatelja.</p>
              }
            }

            <div class="actions">
              <button
                class="btn"
                type="submit"
                [disabled]="busy() || (assignmentForm.scope === 'member' && !canSubmitMemberAssignments())"
              >
                @if (assignmentForm.scope === 'member') {
                  Spremi dodjele
                } @else {
                  Dodijeli suca
                }
              </button>
            </div>
          </form>
        </div>

        <h3>Postojeće dodjele</h3>
        @if (!judgeAssignments().length) {
          <p class="muted">Nema dodjela za ovo natjecanje.</p>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Sudac</th>
                <th>Tim</th>
                <th>Opseg</th>
                <th>Akcije</th>
              </tr>
            </thead>
            <tbody>
              @for (item of judgeAssignments(); track item.id) {
                <tr>
                  <td>{{ item.judge?.name }}</td>
                  <td>{{ item.team?.name || 'Tim ' + item.team_id.slice(0, 6) }}</td>
                  <td>
                    @if (item.competitor_id) {
                      {{ item.competitor?.name }}
                    } @else {
                      Cijeli tim
                    }
                  </td>
                  <td>
                    <button type="button" class="btn btn--danger" [disabled]="busy()" (click)="deleteJudgeAssignment(item.id)">
                      Obriši
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      }
    </section>
  `,
})
export class AssignmentsTabComponent {
  readonly data = inject(AdminDataService);
  private readonly busySvc = inject(AdminBusyService);
  private readonly competitionTeamsApi = inject(CompetitionTeamsApi);
  private readonly judgeAssignmentsApi = inject(JudgeAssignmentsApi);

  readonly busy = this.busySvc.busy;
  readonly statusLabels = STATUS_LABELS;

  readonly competitionRegistrations = signal<CompetitionTeam[]>([]);
  readonly judgeAssignments = signal<JudgeAssignment[]>([]);
  readonly memberJudgeMap = signal<Record<string, string>>({});

  assignmentCompetitionId = '';
  registerTeamId = '';
  assignmentForm = {
    judge_id: '',
    team_id: '',
    scope: 'team' as 'team' | 'member',
  };

  readonly availableTeamsForRegistration = computed(() => {
    const registered = new Set(this.competitionRegistrations().map((item) => item.team_id));
    return this.data.teams().filter((team) => !registered.has(team.id));
  });

  assignmentTeamMembers() {
    const registration = this.competitionRegistrations().find(
      (item) => item.team_id === this.assignmentForm.team_id,
    );
    return registration?.team?.members ?? [];
  }

  assignmentTeamHasWholeTeamJudge(): boolean {
    return this.judgeAssignments().some(
      (item) =>
        item.team_id === this.assignmentForm.team_id && item.competitor_id === null,
    );
  }

  canSubmitMemberAssignments(): boolean {
    if (
      this.assignmentForm.scope !== 'member' ||
      !this.assignmentForm.team_id ||
      this.assignmentTeamHasWholeTeamJudge()
    ) {
      return false;
    }

    const members = this.assignmentTeamMembers();
    if (!members.length) {
      return false;
    }

    const map = this.memberJudgeMap();
    return members.every((member) => Boolean(map[member.competitor.id]));
  }

  missingMemberJudgeNames(): string[] {
    return this.assignmentTeamMembers()
      .filter((member) => !this.memberJudgeMap()[member.competitor.id])
      .map((member) => member.competitor.name);
  }

  async onAssignmentCompetitionChange(): Promise<void> {
    this.registerTeamId = '';
    this.assignmentForm = {
      judge_id: '',
      team_id: '',
      scope: 'team',
    };
    this.memberJudgeMap.set({});
    this.competitionRegistrations.set([]);
    this.judgeAssignments.set([]);

    if (!this.assignmentCompetitionId) {
      return;
    }

    await this.loadAssignmentData();
  }

  async loadAssignmentData(): Promise<void> {
    if (!this.assignmentCompetitionId) {
      return;
    }

    try {
      const [registrations, assignments] = await Promise.all([
        this.competitionTeamsApi.listByCompetition(this.assignmentCompetitionId),
        this.judgeAssignmentsApi.listByCompetition(this.assignmentCompetitionId),
      ]);

      this.competitionRegistrations.set(registrations);
      this.judgeAssignments.set(assignments);
    } catch (err) {
      this.data.notify(
        err instanceof Error ? err.message : 'Greška pri učitavanju dodjela',
        'error',
      );
    }
  }

  async registerTeamOnCompetition(): Promise<void> {
    if (!this.assignmentCompetitionId || !this.registerTeamId) {
      return;
    }

    try {
      await this.competitionTeamsApi.register(
        this.assignmentCompetitionId,
        this.registerTeamId,
      );
      this.registerTeamId = '';
      await this.loadAssignmentData();
      this.data.notify('Tim registriran na natjecanje');
    } catch (err) {
      this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }

  async unregisterTeam(id: string): Promise<void> {
    if (!confirmDelete('ovaj tim s natjecanja')) {
      return;
    }

    await this.busySvc.run(async () => {
      try {
        await this.competitionTeamsApi.remove(id);
        await this.loadAssignmentData();
        this.data.notify('Tim uklonjen s natjecanja');
      } catch (err) {
        this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
      }
    });
  }

  onAssignmentTeamChange(): void {
    this.initMemberJudgeMap();
  }

  onAssignmentScopeChange(): void {
    if (this.assignmentForm.scope === 'member') {
      this.initMemberJudgeMap();
      return;
    }

    this.memberJudgeMap.set({});
  }

  setMemberJudge(competitorId: string, judgeId: string): void {
    this.memberJudgeMap.update((current) => ({
      ...current,
      [competitorId]: judgeId,
    }));
  }

  private initMemberJudgeMap(): void {
    const members = this.assignmentTeamMembers();
    const nextMap: Record<string, string> = {};

    for (const member of members) {
      nextMap[member.competitor.id] = '';
    }

    for (const assignment of this.judgeAssignments()) {
      if (
        assignment.team_id === this.assignmentForm.team_id &&
        assignment.competitor_id
      ) {
        nextMap[assignment.competitor_id] = assignment.judge_id;
      }
    }

    this.memberJudgeMap.set(nextMap);
  }

  async createJudgeAssignment(): Promise<void> {
    if (!this.assignmentCompetitionId) {
      return;
    }

    if (this.assignmentForm.scope === 'member' && !this.canSubmitMemberAssignments()) {
      this.data.notify('Dodijelite suca svim natjecateljima u timu prije spremanja', 'error');
      return;
    }

    try {
      const wasMemberScope = this.assignmentForm.scope === 'member';

      if (wasMemberScope) {
        const assignments = this.assignmentTeamMembers().map((member) => ({
          competitor_id: member.competitor.id,
          judge_id: this.memberJudgeMap()[member.competitor.id],
        }));

        await this.judgeAssignmentsApi.assignMembers({
          competition_id: this.assignmentCompetitionId,
          team_id: this.assignmentForm.team_id,
          assignments,
        });
      } else {
        await this.judgeAssignmentsApi.assignTeam({
          competition_id: this.assignmentCompetitionId,
          judge_id: this.assignmentForm.judge_id,
          team_id: this.assignmentForm.team_id,
        });
      }

      this.assignmentForm = {
        judge_id: '',
        team_id: '',
        scope: 'team',
      };
      this.memberJudgeMap.set({});
      await this.loadAssignmentData();
      this.data.notify(wasMemberScope ? 'Dodjele spremljene' : 'Sudac dodijeljen');
    } catch (err) {
      this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }

  async deleteJudgeAssignment(id: string): Promise<void> {
    if (!confirmDelete('ovu dodjelu suca')) {
      return;
    }

    await this.busySvc.run(async () => {
      try {
        await this.judgeAssignmentsApi.remove(id);
        await this.loadAssignmentData();
        this.data.notify('Dodjela uklonjena');
      } catch (err) {
        this.data.notify(err instanceof Error ? err.message : 'Greška', 'error');
      }
    });
  }
}
