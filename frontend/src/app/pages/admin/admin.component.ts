import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../shared/searchable-select/searchable-select.component';
import { ModalComponent } from '../../shared/modal/modal.component';
import {
  CATEGORY_LABELS,
  CATEGORY_MAX,
  CategoryResultRow,
  Club,
  COMPETITOR_AGE_LABELS,
  Competition,
  CompetitionDetails,
  Competitor,
  CompetitorAgeCategory,
  CompetitorRankOverride,
  CompetitionTeam,
  Judge,
  JudgeAssignment,
  AGE_CATEGORIES,
  LAUNCH_CATEGORIES,
  Launch,
  LaunchCategory,
  STATUS_LABELS,
  Team,
  formatDurationClock,
  getCategoryRemainingMs,
  resultViewLabel,
} from '../../core/models';
import {
  buildCategoryResultRows,
  buildCompetitorLookup,
  buildTeamResultRows,
  getTiedCompetitorIds,
} from '../../core/result-ranking.util';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

type AdminTab =
  | 'clubs'
  | 'competitors'
  | 'judges'
  | 'competitions'
  | 'teams'
  | 'assignments'
  | 'ranking'
  | 'results';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [DecimalPipe, FormsModule, SearchableSelectComponent, ModalComponent],
  template: `
    <h1 class="page-title">Admin panel</h1>

    <div class="actions" style="margin-bottom: 1rem">
      @for (tab of tabs; track tab.id) {
        <button
          type="button"
          class="btn"
          [class.btn--secondary]="activeTab() !== tab.id"
          (click)="activeTab.set(tab.id)"
        >
          {{ tab.label }}
        </button>
      }
    </div>

    @switch (activeTab()) {
      @case ('clubs') {
        <section class="card grid">
          <h2>{{ editingClubId() ? 'Uredi klub' : 'Novi klub' }}</h2>
          <form (ngSubmit)="saveClub()">
            <label>Naziv kluba<input [(ngModel)]="clubForm.name" name="clubName" required /></label>
            <div class="actions">
              <button class="btn" type="submit">
                {{ editingClubId() ? 'Spremi promjene' : 'Dodaj klub' }}
              </button>
              @if (editingClubId()) {
                <button type="button" class="btn btn--secondary" (click)="cancelClubEdit()">Odustani</button>
              }
            </div>
          </form>
          <table>
            <thead><tr><th>Naziv</th><th>Akcije</th></tr></thead>
            <tbody>
              @for (club of clubs(); track club.id) {
                <tr [class.row-editing]="editingClubId() === club.id">
                  <td>{{ club.name }}</td>
                  <td>
                    <div class="actions">
                      <button type="button" class="btn btn--secondary" (click)="startEditClub(club)">Uredi</button>
                      <button type="button" class="btn btn--danger" (click)="deleteClub(club.id)">Obriši</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }
      @case ('competitors') {
        <section class="card grid">
          <div class="section-header">
            <h2>Natjecatelji</h2>
            <button type="button" class="btn" (click)="openNewCompetitor()">Novi natjecatelj</button>
          </div>
          <label>
            Pretraži
            <input
              [ngModel]="competitorSearch()"
              (ngModelChange)="competitorSearch.set($event)"
              name="competitorSearch"
              placeholder="Ime ili klub..."
            />
          </label>
          <table>
            <thead><tr><th>Ime</th><th>Klub</th><th>Kategorija</th><th>Akcije</th></tr></thead>
            <tbody>
              @if (!filteredCompetitors().length) {
                <tr>
                  <td colspan="4" class="muted">Nema rezultata pretrage.</td>
                </tr>
              } @else {
                @for (item of filteredCompetitors(); track item.id) {
                  <tr>
                    <td>{{ item.name }}</td>
                    <td>{{ item.club?.name }}</td>
                    <td>{{ competitorAgeLabels[item.age_category] }}</td>
                    <td>
                      <div class="actions">
                        <button type="button" class="btn btn--secondary" (click)="startEditCompetitor(item)">Uredi</button>
                        <button type="button" class="btn btn--danger" (click)="deleteCompetitor(item.id)">Obriši</button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </section>
      }
      @case ('judges') {
        <section class="card grid">
          <h2>{{ editingJudgeId() ? 'Uredi suca' : 'Novi sudac' }}</h2>
          <form (ngSubmit)="saveJudge()">
            <label>Ime<input [(ngModel)]="judgeForm.name" name="judgeName" required /></label>
            <label>Email<input type="email" [(ngModel)]="judgeForm.email" name="judgeEmail" required /></label>
            <label>
              Lozinka
              <input
                type="password"
                [(ngModel)]="judgeForm.password"
                name="judgePass"
                [required]="!editingJudgeId()"
                [placeholder]="editingJudgeId() ? 'Ostavi prazno ako ne mijenjaš' : ''"
              />
            </label>
            <label>Klub
              <select [(ngModel)]="judgeForm.club_id" name="judgeClub" required>
                <option value="">Odaberi klub</option>
                @for (club of clubs(); track club.id) {
                  <option [value]="club.id">{{ club.name }}</option>
                }
              </select>
            </label>
            <div class="actions">
              <button class="btn" type="submit">
                {{ editingJudgeId() ? 'Spremi promjene' : 'Dodaj suca' }}
              </button>
              @if (editingJudgeId()) {
                <button type="button" class="btn btn--secondary" (click)="cancelJudgeEdit()">Odustani</button>
              }
            </div>
          </form>
          <label>
            Pretraži
            <input
              [ngModel]="judgeSearch()"
              (ngModelChange)="judgeSearch.set($event)"
              name="judgeSearch"
              placeholder="Ime, email ili klub..."
            />
          </label>
          <table>
            <thead><tr><th>Ime</th><th>Email</th><th>Klub</th><th>Akcije</th></tr></thead>
            <tbody>
              @if (!filteredJudges().length) {
                <tr>
                  <td colspan="4" class="muted">Nema rezultata pretrage.</td>
                </tr>
              } @else {
                @for (item of filteredJudges(); track item.id) {
                  <tr [class.row-editing]="editingJudgeId() === item.id">
                    <td>{{ item.name }}</td>
                    <td>{{ item.email }}</td>
                    <td>{{ item.club?.name }}</td>
                    <td>
                      <div class="actions">
                        <button type="button" class="btn btn--secondary" (click)="startEditJudge(item)">Uredi</button>
                        <button type="button" class="btn btn--danger" (click)="deleteJudge(item.id)">Obriši</button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </section>
      }
      @case ('competitions') {
        <section class="card grid">
          <div class="section-header">
            <h2>Natjecanja</h2>
            <button type="button" class="btn" (click)="openNewCompetition()">Novo natjecanje</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Naziv</th>
                <th>Status</th>
                <th>Ispaljivanja</th>
                <th>Traka</th>
                <th>Padobran</th>
                <th>Vrijeme ispaljivanja</th>
                <th>Akcije</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (item of competitions(); track item.id) {
                <tr>
                  <td>{{ item.name }}</td>
                  <td>{{ statusLabels[item.status] }}</td>
                  <td>{{ item.launches_per_category }}</td>
                  <td>
                    @if (item.status === 'active') {
                      <button
                        type="button"
                        class="btn"
                        [class.btn--secondary]="!item.traka_open"
                        (click)="toggleCategory(item.id, 'traka', !item.traka_open)"
                      >
                        {{ item.traka_open ? 'Zatvori' : 'Otvori' }}
                      </button>
                      @if (item.traka_open) {
                        <div class="muted">{{ categoryRemainingLabel(item, 'traka') }}</div>
                      }
                    } @else {
                      <span class="muted">—</span>
                    }
                  </td>
                  <td>
                    @if (item.status === 'active') {
                      <button
                        type="button"
                        class="btn"
                        [class.btn--secondary]="!item.padobran_open"
                        (click)="toggleCategory(item.id, 'padobran', !item.padobran_open)"
                      >
                        {{ item.padobran_open ? 'Zatvori' : 'Otvori' }}
                      </button>
                      @if (item.padobran_open) {
                        <div class="muted">{{ categoryRemainingLabel(item, 'padobran') }}</div>
                      }
                    } @else {
                      <span class="muted">—</span>
                    }
                  </td>
                  <td>{{ competitionWindowsLabel(item) }}</td>
                  <td>
                    <div class="actions">
                      <button type="button" class="btn btn--secondary" (click)="startEditCompetition(item)">
                        Uredi
                      </button>
                      @if (item.status === 'upcoming') {
                        <button type="button" class="btn" (click)="activateCompetition(item.id)">
                          Aktiviraj
                        </button>
                      } @else if (item.status === 'active') {
                        <button type="button" class="btn btn--danger" (click)="finishCompetition(item.id)">
                          Završi
                        </button>
                      }
                    </div>
                  </td>
                  <td>
                    <button type="button" class="btn btn--danger" (click)="deleteCompetition(item.id)">Obriši</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }
      @case ('teams') {
        <section class="card grid">
          <div class="section-header">
            <h2>Timovi</h2>
            <button type="button" class="btn" (click)="openNewTeam()">Novi tim</button>
          </div>
          @if (!savedTeams().length) {
            <p class="muted">Još nema kreiranih timova.</p>
          } @else {
            <table>
              <thead>
                <tr>
                  <th>Naziv</th>
                  <th>Natjecatelji</th>
                  <th>Natjecanje</th>
                  <th>Akcije</th>
                </tr>
              </thead>
              <tbody>
                @for (team of savedTeams(); track team.id) {
                  <tr>
                    <td>{{ team.name || 'Tim ' + team.id.slice(0, 6) }}</td>
                    <td>
                      @for (member of team.members || []; track member.id) {
                        <div>{{ member.competitor.name }} ({{ member.competitor.club?.name }})</div>
                      }
                    </td>
                    <td>{{ team.competition?.name || '—' }}</td>
                    <td>
                      <div class="actions">
                        <button type="button" class="btn btn--secondary" (click)="startEditTeam(team)">Uredi</button>
                        <button type="button" class="btn btn--danger" (click)="deleteTeam(team.id)">Obriši</button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      }
      @case ('assignments') {
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
              @for (item of competitions(); track item.id) {
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
                <button class="btn" type="submit">Registriraj</button>
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
                          <button type="button" class="btn btn--danger" (click)="unregisterTeam(item.id)">
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
                      @for (judge of judges(); track judge.id) {
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
                                  @for (judge of judges(); track judge.id) {
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
                    [disabled]="assignmentForm.scope === 'member' && !canSubmitMemberAssignments()"
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
                        <button type="button" class="btn btn--danger" (click)="deleteJudgeAssignment(item.id)">
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
      }
      @case ('ranking') {
        <section class="card grid">
          <h2>Poredak – izjednačeni rezultati</h2>
          <p class="muted">
            Kad natjecatelji imaju isti ukupni rezultat, možete ručno promijeniti poredak strelicama gore/dolje.
          </p>

          <label>Natjecanje
            <select
              [(ngModel)]="rankingCompetitionId"
              name="rankingCompetition"
              (ngModelChange)="onRankingCompetitionChange()"
            >
              <option value="">Odaberi natjecanje</option>
              @for (item of competitions(); track item.id) {
                <option [value]="item.id">{{ item.name }} ({{ statusLabels[item.status] }})</option>
              }
            </select>
          </label>

          @if (rankingCompetitionId) {
            <label>Dobna kategorija
              <select
                [(ngModel)]="rankingAgeCategory"
                name="rankingAgeCategory"
              >
                @for (age of ageCategories; track age) {
                  <option [value]="age">{{ competitorAgeLabels[age] }}</option>
                }
              </select>
            </label>
            <label>Kategorija ispaljivanja
              <select
                [(ngModel)]="rankingCategory"
                name="rankingCategory"
              >
                @for (category of launchCategories; track category) {
                  <option [value]="category">{{ categoryLabels[category] }}</option>
                }
              </select>
            </label>
            <p class="muted">
              Prikaz: {{ resultViewLabel({ ageCategory: rankingAgeCategory, launchCategory: rankingCategory }) }}
            </p>

            @if (!rankingRows().length) {
              <p class="muted">Nema natjecatelja za prikaz poretka.</p>
            } @else {
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Natjecatelj</th>
                    <th>Ukupno (s)</th>
                    <th>Poredak</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of rankingRows(); track row.competitorId; let rank = $index) {
                    <tr>
                      <td>{{ rank + 1 }}</td>
                      <td>
                        {{ row.name }}
                        @if (row.clubName) {
                          <span class="muted"> ({{ row.clubName }})</span>
                        }
                        @if (rankingTiedIds().has(row.competitorId)) {
                          <span class="badge badge--upcoming">Izjednačeno</span>
                        }
                      </td>
                      <td>{{ row.total | number: '1.3-3' }}</td>
                      <td>
                        @if (rankingTiedIds().has(row.competitorId)) {
                          <div class="actions">
                            <button
                              type="button"
                              class="btn btn--secondary"
                              [disabled]="!canMoveRanking(row.competitorId, 'up')"
                              (click)="moveRanking(row.competitorId, 'up')"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              class="btn btn--secondary"
                              [disabled]="!canMoveRanking(row.competitorId, 'down')"
                              (click)="moveRanking(row.competitorId, 'down')"
                            >
                              ↓
                            </button>
                          </div>
                        } @else {
                          <span class="muted">—</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }

            <h3>Timovi – {{ resultViewLabel({ ageCategory: rankingAgeCategory, launchCategory: rankingCategory }) }}</h3>
            @if (!rankingTeamRows().length) {
              <p class="muted">Nema timova za odabranu kategoriju.</p>
            } @else {
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tim</th>
                    <th>Natjecatelji</th>
                    <th>Ukupno (s)</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of rankingTeamRows(); track row.teamId; let rank = $index) {
                    <tr>
                      <td>{{ rank + 1 }}</td>
                      <td>{{ row.name }}</td>
                      <td>{{ row.members }}</td>
                      <td>{{ row.total | number: '1.3-3' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          }
        </section>
      }
      @case ('results') {
        <section class="card grid">
          <h2>Rezultati aktivnih natjecanja</h2>

          <label>Natjecanje
            <select
              [(ngModel)]="resultsCompetitionId"
              name="resultsCompetition"
              (ngModelChange)="onResultsCompetitionChange()"
            >
              <option value="">Odaberi natjecanje</option>
              @for (item of activeCompetitions(); track item.id) {
                <option [value]="item.id">{{ item.name }}</option>
              }
            </select>
          </label>

          <label>Tim
            <select
              [(ngModel)]="resultsTeamId"
              name="resultsTeam"
              (ngModelChange)="loadResultsLaunches()"
            >
              <option value="">Odaberi tim</option>
              @for (item of resultTeams(); track item.id) {
                <option [value]="item.id">
                  {{ item.competition?.name }} – {{ item.name || 'Tim ' + item.id.slice(0, 6) }}
                </option>
              }
            </select>
          </label>

          @if (editingLaunchId()) {
            <form (ngSubmit)="saveLaunchEdit()" class="card" style="background: #f8fafc">
              <h3>Uredi rezultat</h3>
              <p class="muted">
                {{ launchEditLabel() }}
              </p>
              <label>
                Vrijeme (s)
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  [(ngModel)]="launchEditForm.duration_seconds"
                  name="launchDuration"
                  [disabled]="launchEditForm.failed"
                  required
                />
              </label>
              <label style="flex-direction: row; align-items: center; gap: 0.5rem">
                <input
                  type="checkbox"
                  [(ngModel)]="launchEditForm.failed"
                  name="launchFailed"
                  (ngModelChange)="onLaunchFailedToggle($event)"
                />
                Neuspjelo ispaljivanje (0)
              </label>
              <div class="actions">
                <button class="btn" type="submit">Spremi promjene</button>
                <button type="button" class="btn btn--secondary" (click)="cancelLaunchEdit()">Odustani</button>
              </div>
            </form>
          }

          @if (!resultsTeamId) {
            <p class="muted">Odaberite tim za prikaz rezultata.</p>
          } @else if (!resultsLaunches().length) {
            <p class="muted">Nema unesenih rezultata za odabrani tim.</p>
          } @else {
            <table>
              <thead>
                <tr>
                  <th>Natjecatelj</th>
                  <th>Kategorija</th>
                  <th>Pokušaj</th>
                  <th>Vrijeme (s)</th>
                  <th>Status</th>
                  <th>Akcije</th>
                </tr>
              </thead>
              <tbody>
                @for (item of resultsLaunches(); track item.id) {
                  <tr [class.row-editing]="editingLaunchId() === item.id">
                    <td>{{ item.competitor?.name }}</td>
                    <td>{{ categoryLabels[item.category] }}</td>
                    <td>{{ item.attempt_number }}</td>
                    <td>{{ item.duration_seconds }}</td>
                    <td>{{ item.failed ? 'Neuspjeh' : 'OK' }}</td>
                    <td>
                      <button type="button" class="btn btn--secondary" (click)="startEditLaunch(item)">
                        Uredi
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      }
    }

    <app-modal
      [open]="competitorModalOpen()"
      [title]="editingCompetitorId() ? 'Uredi natjecatelja' : 'Novi natjecatelj'"
      (closed)="cancelCompetitorEdit()"
    >
      <form (ngSubmit)="saveCompetitor()">
        <label>Ime<input [(ngModel)]="competitorForm.name" name="compName" required /></label>
        <label>Klub
          <select [(ngModel)]="competitorForm.club_id" name="compClub" required>
            <option value="">Odaberi klub</option>
            @for (club of clubs(); track club.id) {
              <option [value]="club.id">{{ club.name }}</option>
            }
          </select>
        </label>
        <label>Kategorija
          <select [(ngModel)]="competitorForm.age_category" name="compAgeCategory" required>
            <option value="osnovna">{{ competitorAgeLabels.osnovna }}</option>
            <option value="srednje">{{ competitorAgeLabels.srednje }}</option>
          </select>
        </label>
        <div class="actions">
          <button class="btn" type="submit">
            {{ editingCompetitorId() ? 'Spremi promjene' : 'Dodaj natjecatelja' }}
          </button>
          <button type="button" class="btn btn--secondary" (click)="cancelCompetitorEdit()">Odustani</button>
        </div>
      </form>
    </app-modal>

    <app-modal
      [open]="competitionModalOpen()"
      [title]="editingCompetitionId() ? 'Uredi natjecanje' : 'Novo natjecanje'"
      (closed)="cancelCompetitionEdit()"
    >
      <form (ngSubmit)="saveCompetition()">
        <label>Naziv<input [(ngModel)]="competitionForm.name" name="competitionName" required /></label>
        <label>Lokacija<input [(ngModel)]="competitionForm.location" name="competitionLocation" /></label>
        @if (!editingCompetitionId()) {
          <label>Status
            <select [(ngModel)]="competitionForm.status" name="competitionStatus">
              <option value="upcoming">Nadolazeće</option>
              <option value="active">Aktivno</option>
              <option value="finished">Završeno</option>
            </select>
          </label>
        }
        <label>Broj ispaljivanja po kategoriji
          <select [(ngModel)]="competitionForm.launches_per_category" name="launchesPerCategory">
            <option [ngValue]="2">2</option>
            <option [ngValue]="3">3</option>
          </select>
        </label>
        <label>Trajanje kategorije Traka (min)
          <input
            type="number"
            min="1"
            [(ngModel)]="competitionForm.traka_window_minutes"
            name="trakaWindowMinutes"
            required
          />
        </label>
        <label>Trajanje kategorije Padobran (min)
          <input
            type="number"
            min="1"
            [(ngModel)]="competitionForm.padobran_window_minutes"
            name="padobranWindowMinutes"
            required
          />
        </label>
        <div class="actions">
          <button class="btn" type="submit">
            {{ editingCompetitionId() ? 'Spremi promjene' : 'Kreiraj natjecanje' }}
          </button>
          <button type="button" class="btn btn--secondary" (click)="cancelCompetitionEdit()">Odustani</button>
        </div>
      </form>
    </app-modal>

    <app-modal
      [open]="teamModalOpen()"
      [title]="editingTeamId() ? 'Uredi tim' : 'Novi tim'"
      (closed)="cancelTeamEdit()"
    >
      <form (ngSubmit)="saveTeam()">
        <label>Naziv tima<input [(ngModel)]="teamForm.name" name="teamName" /></label>
        <label>Natjecatelj 1
          <app-searchable-select
            [(ngModel)]="teamForm.competitor1"
            name="comp1"
            [options]="competitorOptions()"
            placeholder="Pretraži i odaberi natjecatelja..."
            [required]="true"
          />
        </label>
        <label>Natjecatelj 2
          <app-searchable-select
            [(ngModel)]="teamForm.competitor2"
            name="comp2"
            [options]="competitorOptions()"
            placeholder="Pretraži i odaberi natjecatelja..."
            [required]="true"
          />
        </label>
        <label>Natjecatelj 3 (opcionalno)
          <app-searchable-select
            [(ngModel)]="teamForm.competitor3"
            name="comp3"
            [options]="competitorOptions()"
            placeholder="Pretraži i odaberi natjecatelja..."
            emptyLabel="Bez trećeg"
            [allowEmpty]="true"
          />
        </label>
        <div class="actions">
          <button class="btn" type="submit">
            {{ editingTeamId() ? 'Spremi promjene' : 'Kreiraj tim' }}
          </button>
          <button type="button" class="btn btn--secondary" (click)="cancelTeamEdit()">Odustani</button>
        </div>
      </form>
    </app-modal>
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
export class AdminComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);

  readonly statusLabels = STATUS_LABELS;
  readonly categoryLabels = CATEGORY_LABELS;
  readonly competitorAgeLabels = COMPETITOR_AGE_LABELS;
  readonly tabs: { id: AdminTab; label: string }[] = [
    { id: 'clubs', label: 'Klubovi' },
    { id: 'competitors', label: 'Natjecatelji' },
    { id: 'judges', label: 'Suci' },
    { id: 'competitions', label: 'Natjecanja' },
    { id: 'teams', label: 'Timovi' },
    { id: 'assignments', label: 'Dodjela sudaca' },
    { id: 'ranking', label: 'Poredak' },
    { id: 'results', label: 'Rezultati' },
  ];

  readonly activeTab = signal<AdminTab>('clubs');
  readonly clubs = signal<Club[]>([]);
  readonly competitors = signal<Competitor[]>([]);
  readonly judges = signal<Judge[]>([]);
  readonly competitions = signal<Competition[]>([]);
  readonly savedTeams = signal<Team[]>([]);
  readonly competitorSearch = signal('');
  readonly judgeSearch = signal('');
  readonly editingClubId = signal<string | null>(null);
  readonly editingCompetitorId = signal<string | null>(null);
  readonly editingJudgeId = signal<string | null>(null);
  readonly editingCompetitionId = signal<string | null>(null);
  readonly editingTeamId = signal<string | null>(null);
  readonly competitorModalOpen = signal(false);
  readonly competitionModalOpen = signal(false);
  readonly teamModalOpen = signal(false);
  readonly resultTeams = signal<Team[]>([]);
  readonly resultsLaunches = signal<Launch[]>([]);
  readonly competitionRegistrations = signal<CompetitionTeam[]>([]);
  readonly judgeAssignments = signal<JudgeAssignment[]>([]);
  readonly editingLaunchId = signal<string | null>(null);
  readonly launchEditLabel = signal('');

  readonly launchCategories = LAUNCH_CATEGORIES;
  readonly ageCategories = AGE_CATEGORIES;
  readonly resultViewLabel = resultViewLabel;
  readonly rankingCompetition = signal<CompetitionDetails | null>(null);
  readonly rankingLaunches = signal<Launch[]>([]);

  rankingCompetitionId = '';
  rankingAgeCategory: CompetitorAgeCategory = 'osnovna';
  rankingCategory: LaunchCategory = 'traka';

  private readonly rankingCompetitorById = new Map<string, Competitor>();

  readonly rankingRows = computed(() => {
    const competition = this.rankingCompetition();
    if (!competition) {
      return [] as CategoryResultRow[];
    }

    return buildCategoryResultRows(
      competition,
      this.rankingCategory,
      this.rankingLaunches(),
      this.rankingCompetitorById,
      this.rankingAgeCategory,
    );
  });

  readonly rankingTeamRows = computed(() => {
    const competition = this.rankingCompetition();
    if (!competition) {
      return [];
    }

    return buildTeamResultRows(
      competition,
      this.rankingCategory,
      this.rankingLaunches(),
      this.rankingAgeCategory,
    );
  });

  readonly rankingTiedIds = computed(() => getTiedCompetitorIds(this.rankingRows()));

  resultsCompetitionId = '';
  resultsTeamId = '';
  assignmentCompetitionId = '';
  registerTeamId = '';
  assignmentForm = {
    judge_id: '',
    team_id: '',
    scope: 'team' as 'team' | 'member',
  };
  readonly memberJudgeMap = signal<Record<string, string>>({});
  launchEditForm = { duration_seconds: 0, failed: false };

  readonly activeCompetitions = computed(() =>
    this.competitions().filter((item) => item.status === 'active'),
  );

  readonly availableTeamsForRegistration = computed(() => {
    const registered = new Set(this.competitionRegistrations().map((item) => item.team_id));
    return this.savedTeams().filter((team) => !registered.has(team.id));
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

  readonly judgeOptions = computed<SearchableSelectOption[]>(() =>
    this.judges().map((item) => ({
      value: item.id,
      label: `${item.name} (${item.club?.name ?? 'Bez kluba'})`,
    })),
  );

  readonly competitorOptions = computed<SearchableSelectOption[]>(() =>
    this.competitors().map((item) => ({
      value: item.id,
      label: `${item.name} (${item.club?.name ?? 'Bez kluba'}, ${COMPETITOR_AGE_LABELS[item.age_category]})`,
    })),
  );

  readonly filteredCompetitors = computed(() =>
    this.filterByQuery(this.competitors(), this.competitorSearch(), (item) => [
      item.name,
      item.club?.name,
      COMPETITOR_AGE_LABELS[item.age_category],
    ]),
  );

  readonly filteredJudges = computed(() =>
    this.filterByQuery(this.judges(), this.judgeSearch(), (item) => [
      item.name,
      item.email,
      item.club?.name,
    ]),
  );

  clubForm = { name: '' };
  competitorForm = { name: '', club_id: '', age_category: 'osnovna' as CompetitorAgeCategory };
  judgeForm = { name: '', email: '', password: '', club_id: '' };
  competitionForm = {
    name: '',
    location: '',
    status: 'upcoming' as Competition['status'],
    launches_per_category: 2,
    traka_window_minutes: 30,
    padobran_window_minutes: 45,
  };
  teamForm = {
    name: '',
    competitor1: '',
    competitor2: '',
    competitor3: '',
  };

  readonly now = signal(Date.now());

  async ngOnInit(): Promise<void> {
    await this.reloadAll();
    await this.loadAllTeams();
    setInterval(() => this.now.set(Date.now()), 1000);
  }

  private token(): string {
    return this.auth.getToken() ?? '';
  }

  private async reloadAll(): Promise<void> {
    const token = this.token();
    const [clubs, competitors, judges, competitions] = await Promise.all([
      this.api.get<Club[]>('/clubs', token),
      this.api.get<Competitor[]>('/competitors'),
      this.api.get<Judge[]>('/judges', token),
      this.api.get<Competition[]>('/competitions'),
    ]);

    this.clubs.set(clubs);
    this.competitors.set(competitors);
    this.judges.set(judges);
    this.competitions.set(competitions);
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
        this.api.get<CompetitionTeam[]>(
          `/competition-teams?competition_id=${this.assignmentCompetitionId}`,
        ),
        this.api.get<JudgeAssignment[]>(
          `/judge-assignments?competition_id=${this.assignmentCompetitionId}`,
          this.token(),
        ),
      ]);

      this.competitionRegistrations.set(registrations);
      this.judgeAssignments.set(assignments);
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška pri učitavanju dodjela', 'error');
    }
  }

  async registerTeamOnCompetition(): Promise<void> {
    if (!this.assignmentCompetitionId || !this.registerTeamId) {
      return;
    }

    try {
      await this.api.post(
        '/competition-teams',
        {
          competition_id: this.assignmentCompetitionId,
          team_id: this.registerTeamId,
        },
        this.token(),
      );
      this.registerTeamId = '';
      await this.loadAssignmentData();
      this.notify('Tim registriran na natjecanje');
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }

  async unregisterTeam(id: string): Promise<void> {
    try {
      await this.api.delete(`/competition-teams/${id}`, this.token());
      await this.loadAssignmentData();
      this.notify('Tim uklonjen s natjecanja');
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
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
      this.notify('Dodijelite suca svim natjecateljima u timu prije spremanja', 'error');
      return;
    }

    try {
      const wasMemberScope = this.assignmentForm.scope === 'member';

      if (wasMemberScope) {
        const assignments = this.assignmentTeamMembers().map((member) => ({
          competitor_id: member.competitor.id,
          judge_id: this.memberJudgeMap()[member.competitor.id],
        }));

        await this.api.post(
          '/judge-assignments/members',
          {
            competition_id: this.assignmentCompetitionId,
            team_id: this.assignmentForm.team_id,
            assignments,
          },
          this.token(),
        );
      } else {
        await this.api.post(
          '/judge-assignments',
          {
            competition_id: this.assignmentCompetitionId,
            judge_id: this.assignmentForm.judge_id,
            team_id: this.assignmentForm.team_id,
          },
          this.token(),
        );
      }

      this.assignmentForm = {
        judge_id: '',
        team_id: '',
        scope: 'team',
      };
      this.memberJudgeMap.set({});
      await this.loadAssignmentData();
      this.notify(wasMemberScope ? 'Dodjele spremljene' : 'Sudac dodijeljen');
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }

  async deleteJudgeAssignment(id: string): Promise<void> {
    try {
      await this.api.delete(`/judge-assignments/${id}`, this.token());
      await this.loadAssignmentData();
      this.notify('Dodjela uklonjena');
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }

  async onRankingCompetitionChange(): Promise<void> {
    this.rankingCompetition.set(null);
    this.rankingLaunches.set([]);
    this.rankingCompetitorById.clear();

    if (!this.rankingCompetitionId) {
      return;
    }

    await this.loadRankingData();
  }

  async loadRankingData(): Promise<void> {
    if (!this.rankingCompetitionId) {
      return;
    }

    try {
      const data = await this.api.get<CompetitionDetails>(
        `/competitions/${this.rankingCompetitionId}`,
      );
      this.rankingCompetition.set(data);
      this.rankingLaunches.set(data.launches ?? []);
      this.rankingCompetitorById.clear();
      buildCompetitorLookup(data).forEach((value, key) =>
        this.rankingCompetitorById.set(key, value),
      );
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška pri učitavanju poretka', 'error');
    }
  }

  canMoveRanking(competitorId: string, direction: 'up' | 'down'): boolean {
    const rows = this.rankingRows();
    const tied = this.rankingTiedIds();
    if (!tied.has(competitorId)) {
      return false;
    }

    const tiedRows = rows.filter((row) => tied.has(row.competitorId));
    const index = tiedRows.findIndex((row) => row.competitorId === competitorId);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    return swapIndex >= 0 && swapIndex < tiedRows.length;
  }

  async moveRanking(competitorId: string, direction: 'up' | 'down'): Promise<void> {
    const competition = this.rankingCompetition();
    if (!competition || !this.canMoveRanking(competitorId, direction)) {
      return;
    }

    const rows = this.rankingRows();
    const tied = this.rankingTiedIds();
    const tiedRows = rows.filter((row) => tied.has(row.competitorId));
    const index = tiedRows.findIndex((row) => row.competitorId === competitorId);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...tiedRows];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];

    try {
      const overrides = reordered.map((row, order) => ({
        competitor_id: row.competitorId,
        tie_break_order: order,
      }));

      const saved = await this.api.put<CompetitorRankOverride[]>(
        '/rankings',
        {
          competition_id: competition.id,
          category: this.rankingCategory,
          overrides,
        },
        this.token(),
      );

      const otherOverrides = (competition.rank_overrides ?? []).filter(
        (item) => item.category !== this.rankingCategory,
      );
      this.rankingCompetition.set({
        ...competition,
        rank_overrides: [...otherOverrides, ...saved],
      });
      this.notify('Poredak ažuriran');
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }

  async onResultsCompetitionChange(): Promise<void> {
    this.resultsTeamId = '';
    this.resultsLaunches.set([]);
    this.cancelLaunchEdit();

    if (!this.resultsCompetitionId) {
      this.resultTeams.set([]);
      return;
    }

    const teams = await this.api.get<Team[]>(
      `/teams/competition/${this.resultsCompetitionId}`,
    );
    this.resultTeams.set(teams);

    if (teams.length) {
      this.resultsTeamId = teams[0].id;
      await this.loadResultsLaunches();
    }
  }

  async loadResultsLaunches(): Promise<void> {
    this.cancelLaunchEdit();

    if (!this.resultsTeamId) {
      this.resultsLaunches.set([]);
      return;
    }

    try {
      const launches = await this.api.get<Launch[]>(
        `/launches/team/${this.resultsTeamId}`,
        this.token(),
      );
      this.resultsLaunches.set(launches);
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška pri učitavanju', 'error');
      this.resultsLaunches.set([]);
    }
  }

  startEditLaunch(launch: Launch): void {
    this.editingLaunchId.set(launch.id);
    this.launchEditForm = {
      duration_seconds: launch.duration_seconds,
      failed: launch.failed,
    };
    this.launchEditLabel.set(
      `${launch.competitor?.name ?? 'Natjecatelj'} – ${this.categoryLabels[launch.category]}, pokušaj ${launch.attempt_number}`,
    );
  }

  cancelLaunchEdit(): void {
    this.editingLaunchId.set(null);
    this.launchEditForm = { duration_seconds: 0, failed: false };
    this.launchEditLabel.set('');
  }

  onLaunchFailedToggle(failed: boolean): void {
    if (failed) {
      this.launchEditForm.duration_seconds = 0;
    }
  }

  async saveLaunchEdit(): Promise<void> {
    const id = this.editingLaunchId();
    if (!id) {
      return;
    }

    const launch = this.resultsLaunches().find((item) => item.id === id);
    if (!launch) {
      return;
    }

    const max = CATEGORY_MAX[launch.category];
    const durationSeconds = this.launchEditForm.failed
      ? 0
      : Math.min(Number(this.launchEditForm.duration_seconds), max);

    try {
      await this.api.patch(
        `/launches/${id}`,
        {
          duration_seconds: durationSeconds,
          failed: this.launchEditForm.failed,
        },
        this.token(),
      );
      this.notify('Rezultat ažuriran');
      this.cancelLaunchEdit();
      await this.loadResultsLaunches();
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }

  private notify(text: string, type: 'success' | 'error' = 'success'): void {
    if (type === 'error') {
      this.notifications.error(text);
      return;
    }

    this.notifications.success(text);
  }

  private filterByQuery<T>(
    items: T[],
    query: string,
    fields: (item: T) => (string | undefined | null)[],
  ): T[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return items;
    }

    return items.filter((item) =>
      fields(item).some((value) => (value ?? '').toLowerCase().includes(normalized)),
    );
  }

  async saveClub(): Promise<void> {
    try {
      const id = this.editingClubId();
      if (id) {
        await this.api.patch(`/clubs/${id}`, this.clubForm, this.token());
        this.notify('Klub ažuriran');
      } else {
        await this.api.post('/clubs', this.clubForm, this.token());
        this.notify('Klub dodan');
      }
      this.cancelClubEdit();
      await this.reloadAll();
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }

  startEditClub(club: Club): void {
    this.editingClubId.set(club.id);
    this.clubForm = { name: club.name };
  }

  cancelClubEdit(): void {
    this.editingClubId.set(null);
    this.clubForm = { name: '' };
  }

  async deleteClub(id: string): Promise<void> {
    try {
      if (this.editingClubId() === id) {
        this.cancelClubEdit();
      }
      await this.api.delete(`/clubs/${id}`, this.token());
      await this.reloadAll();
      this.notify('Klub obrisan');
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }

  openNewCompetitor(): void {
    this.editingCompetitorId.set(null);
    this.competitorForm = { name: '', club_id: '', age_category: 'osnovna' };
    this.competitorModalOpen.set(true);
  }

  async saveCompetitor(): Promise<void> {
    try {
      const id = this.editingCompetitorId();
      if (id) {
        await this.api.patch(`/competitors/${id}`, this.competitorForm, this.token());
        this.notify('Natjecatelj ažuriran');
      } else {
        await this.api.post('/competitors', this.competitorForm, this.token());
        this.notify('Natjecatelj dodan');
      }
      this.cancelCompetitorEdit();
      await this.reloadAll();
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }

  startEditCompetitor(item: Competitor): void {
    this.editingCompetitorId.set(item.id);
    this.competitorForm = {
      name: item.name,
      club_id: item.club_id,
      age_category: item.age_category,
    };
    this.competitorModalOpen.set(true);
  }

  cancelCompetitorEdit(): void {
    this.editingCompetitorId.set(null);
    this.competitorForm = { name: '', club_id: '', age_category: 'osnovna' };
    this.competitorModalOpen.set(false);
  }

  async deleteCompetitor(id: string): Promise<void> {
    try {
      if (this.editingCompetitorId() === id) {
        this.cancelCompetitorEdit();
      }
      await this.api.delete(`/competitors/${id}`, this.token());
      await this.reloadAll();
      this.notify('Natjecatelj obrisan');
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }

  async saveJudge(): Promise<void> {
    try {
      const id = this.editingJudgeId();
      const payload: Record<string, string> = {
        name: this.judgeForm.name,
        email: this.judgeForm.email,
        club_id: this.judgeForm.club_id,
      };

      if (this.judgeForm.password.trim()) {
        payload['password'] = this.judgeForm.password;
      } else if (!id) {
        this.notify('Lozinka je obavezna za novog suca', 'error');
        return;
      }

      if (id) {
        await this.api.patch(`/judges/${id}`, payload, this.token());
        this.notify('Sudac ažuriran');
      } else {
        await this.api.post('/judges', payload, this.token());
        this.notify('Sudac dodan');
      }
      this.cancelJudgeEdit();
      await this.reloadAll();
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }

  startEditJudge(item: Judge): void {
    this.editingJudgeId.set(item.id);
    this.judgeForm = {
      name: item.name,
      email: item.email,
      password: '',
      club_id: item.club_id,
    };
  }

  cancelJudgeEdit(): void {
    this.editingJudgeId.set(null);
    this.judgeForm = { name: '', email: '', password: '', club_id: '' };
  }

  async deleteJudge(id: string): Promise<void> {
    try {
      if (this.editingJudgeId() === id) {
        this.cancelJudgeEdit();
      }
      await this.api.delete(`/judges/${id}`, this.token());
      await this.reloadAll();
      this.notify('Sudac obrisan');
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }

  openNewCompetition(): void {
    this.editingCompetitionId.set(null);
    this.competitionForm = {
      name: '',
      location: '',
      status: 'upcoming',
      launches_per_category: 2,
      traka_window_minutes: 30,
      padobran_window_minutes: 45,
    };
    this.competitionModalOpen.set(true);
  }

  startEditCompetition(competition: Competition): void {
    this.editingCompetitionId.set(competition.id);
    this.competitionForm = {
      name: competition.name,
      location: competition.location ?? '',
      status: competition.status,
      launches_per_category: competition.launches_per_category,
      traka_window_minutes: Math.round((competition.traka_window_seconds ?? 1800) / 60),
      padobran_window_minutes: Math.round((competition.padobran_window_seconds ?? 2700) / 60),
    };
    this.competitionModalOpen.set(true);
  }

  cancelCompetitionEdit(): void {
    this.editingCompetitionId.set(null);
    this.competitionForm = {
      name: '',
      location: '',
      status: 'upcoming',
      launches_per_category: 2,
      traka_window_minutes: 30,
      padobran_window_minutes: 45,
    };
    this.competitionModalOpen.set(false);
  }

  async saveCompetition(): Promise<void> {
    try {
      const payload = {
        name: this.competitionForm.name,
        location: this.competitionForm.location,
        launches_per_category: this.competitionForm.launches_per_category,
        traka_window_seconds: this.competitionForm.traka_window_minutes * 60,
        padobran_window_seconds: this.competitionForm.padobran_window_minutes * 60,
      };

      const id = this.editingCompetitionId();
      if (id) {
        await this.api.patch(`/competitions/${id}`, payload, this.token());
        this.notify('Natjecanje ažurirano');
      } else {
        await this.api.post(
          '/competitions',
          {
            ...payload,
            status: this.competitionForm.status,
          },
          this.token(),
        );
        this.notify('Natjecanje kreirano');
      }

      this.cancelCompetitionEdit();
      await this.reloadAll();
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }

  async deleteCompetition(id: string): Promise<void> {
    if (this.editingCompetitionId() === id) {
      this.cancelCompetitionEdit();
    }
    await this.api.delete(`/competitions/${id}`, this.token());
    await this.reloadAll();
  }

  categoryRemainingLabel(competition: Competition, category: LaunchCategory): string {
    const remaining = getCategoryRemainingMs(competition, category, this.now());
    if (remaining === null) {
      return '';
    }

    if (remaining <= 0) {
      return 'Isteklo';
    }

    return `Preostalo: ${formatDurationClock(remaining)}`;
  }

  competitionWindowsLabel(competition: Competition): string {
    const trakaMinutes = Math.round((competition.traka_window_seconds ?? 1800) / 60);
    const padobranMinutes = Math.round((competition.padobran_window_seconds ?? 2700) / 60);
    return `Traka ${trakaMinutes} min · Padobran ${padobranMinutes} min`;
  }

  async toggleCategory(
    id: string,
    category: LaunchCategory,
    open: boolean,
  ): Promise<void> {
    try {
      const payload =
        category === 'traka' ? { traka_open: open } : { padobran_open: open };

      await this.api.patch(`/competitions/${id}`, payload, this.token());
      await this.reloadAll();
      this.notify(
        open
          ? `Kategorija ${category === 'traka' ? 'Traka' : 'Padobran'} otvorena`
          : `Kategorija ${category === 'traka' ? 'Traka' : 'Padobran'} zatvorena`,
      );
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }

  async activateCompetition(id: string): Promise<void> {
    try {
      await this.api.patch(`/competitions/${id}`, { status: 'active' }, this.token());
      await this.reloadAll();
      this.notify('Natjecanje aktivirano');
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }

  async finishCompetition(id: string): Promise<void> {
    try {
      await this.api.patch(
        `/competitions/${id}`,
        { status: 'finished', traka_open: false, padobran_open: false },
        this.token(),
      );
      await this.reloadAll();
      this.notify('Natjecanje završeno');
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }

  async loadAllTeams(): Promise<void> {
    try {
      const teams = await this.api.get<Team[]>('/teams', this.token());
      this.savedTeams.set(teams);
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška pri učitavanju timova', 'error');
      this.savedTeams.set([]);
    }
  }

  openNewTeam(): void {
    this.editingTeamId.set(null);
    this.teamForm = {
      name: '',
      competitor1: '',
      competitor2: '',
      competitor3: '',
    };
    this.teamModalOpen.set(true);
  }

  startEditTeam(team: Team): void {
    const members = team.members ?? [];
    this.editingTeamId.set(team.id);
    this.teamForm = {
      name: team.name ?? '',
      competitor1: members[0]?.competitor.id ?? '',
      competitor2: members[1]?.competitor.id ?? '',
      competitor3: members[2]?.competitor.id ?? '',
    };
    this.teamModalOpen.set(true);
  }

  cancelTeamEdit(): void {
    this.editingTeamId.set(null);
    this.teamForm = {
      name: '',
      competitor1: '',
      competitor2: '',
      competitor3: '',
    };
    this.teamModalOpen.set(false);
  }

  async saveTeam(): Promise<void> {
    const competitor_ids = [this.teamForm.competitor1, this.teamForm.competitor2]
      .concat(this.teamForm.competitor3 ? [this.teamForm.competitor3] : [])
      .filter(Boolean);

    try {
      const payload = {
        name: this.teamForm.name || undefined,
        competitor_ids,
      };

      const id = this.editingTeamId();
      if (id) {
        await this.api.patch(`/teams/${id}`, payload, this.token());
        this.notify('Tim ažuriran');
      } else {
        await this.api.post('/teams', payload, this.token());
        this.notify('Tim spremljen');
      }

      this.cancelTeamEdit();
      await this.loadAllTeams();
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }

  async deleteTeam(id: string): Promise<void> {
    try {
      if (this.editingTeamId() === id) {
        this.cancelTeamEdit();
      }
      await this.api.delete(`/teams/${id}`, this.token());
      await this.loadAllTeams();
      this.notify('Tim obrisan');
    } catch (err) {
      this.notify(err instanceof Error ? err.message : 'Greška', 'error');
    }
  }
}
