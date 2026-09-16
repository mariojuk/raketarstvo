import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminTab, ADMIN_TABS } from './admin.types';
import { AdminBusyService } from './shared/admin-busy.service';
import { AdminDataService } from './shared/admin-data.service';
import { AssignmentsTabComponent } from './tabs/assignments/assignments-tab.component';
import { ClubsTabComponent } from './tabs/clubs/clubs-tab.component';
import { CompetitionsTabComponent } from './tabs/competitions/competitions-tab.component';
import { CompetitorsTabComponent } from './tabs/competitors/competitors-tab.component';
import { JudgesTabComponent } from './tabs/judges/judges-tab.component';
import { RankingTabComponent } from './tabs/ranking/ranking-tab.component';
import { ResultsTabComponent } from './tabs/results/results-tab.component';
import { TeamsTabComponent } from './tabs/teams/teams-tab.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  providers: [AdminBusyService, AdminDataService],
  imports: [
    ClubsTabComponent,
    CompetitorsTabComponent,
    JudgesTabComponent,
    CompetitionsTabComponent,
    TeamsTabComponent,
    AssignmentsTabComponent,
    RankingTabComponent,
    ResultsTabComponent,
  ],
  template: `
    <h1 class="page-title">Admin panel</h1>

    <div class="actions" style="margin-bottom: 1rem" role="tablist" aria-label="Admin sekcije">
      @for (tab of tabs; track tab.id) {
        <button
          type="button"
          class="btn"
          role="tab"
          [attr.aria-selected]="activeTab() === tab.id"
          [class.btn--secondary]="activeTab() !== tab.id"
          [disabled]="busy()"
          (click)="setActiveTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      }
    </div>

    @switch (activeTab()) {
      @case ('clubs') {
        <app-clubs-tab />
      }
      @case ('competitors') {
        <app-competitors-tab />
      }
      @case ('judges') {
        <app-judges-tab />
      }
      @case ('competitions') {
        <app-competitions-tab />
      }
      @case ('teams') {
        <app-teams-tab />
      }
      @case ('assignments') {
        <app-assignments-tab />
      }
      @case ('ranking') {
        <app-ranking-tab />
      }
      @case ('results') {
        <app-results-tab />
      }
    }
  `,
})
export class AdminComponent implements OnInit {
  private readonly data = inject(AdminDataService);
  private readonly busySvc = inject(AdminBusyService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly loadedTabs = new Set<AdminTab>();

  readonly tabs = ADMIN_TABS;
  readonly activeTab = signal<AdminTab>('clubs');
  readonly busy = this.busySvc.busy;

  async ngOnInit(): Promise<void> {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab && this.tabs.some((item) => item.id === tab)) {
      this.activeTab.set(tab as AdminTab);
    }

    await this.ensureTabData(this.activeTab());
  }

  async setActiveTab(tab: AdminTab): Promise<void> {
    this.activeTab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    await this.ensureTabData(tab);
  }

  private async ensureTabData(tab: AdminTab): Promise<void> {
    if (this.loadedTabs.has(tab)) {
      return;
    }

    try {
      switch (tab) {
        case 'clubs':
          await this.data.reloadClubs();
          break;
        case 'competitors':
          await Promise.all([this.data.reloadCompetitors(), this.data.reloadClubs()]);
          break;
        case 'judges':
          await Promise.all([this.data.reloadJudges(), this.data.reloadClubs()]);
          break;
        case 'competitions':
          await this.data.reloadCompetitions();
          break;
        case 'teams':
          await Promise.all([this.data.reloadTeams(), this.data.reloadCompetitors()]);
          break;
        case 'assignments':
          await Promise.all([
            this.data.reloadCompetitions(),
            this.data.reloadTeams(),
            this.data.reloadJudges(),
          ]);
          break;
        case 'ranking':
          await this.data.reloadCompetitions();
          break;
        case 'results':
          await this.data.reloadCompetitions();
          break;
      }

      this.loadedTabs.add(tab);
    } catch (err) {
      this.data.notify(
        err instanceof Error ? err.message : 'Greška pri učitavanju podataka',
        'error',
      );
    }
  }
}
