import { Routes } from '@angular/router';
import { adminGuard, judgeGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'natjecanja',
    loadComponent: () =>
      import('./pages/competitions/competitions.component').then(
        (m) => m.CompetitionsComponent,
      ),
  },
  {
    path: 'natjecanja/:id',
    loadComponent: () =>
      import('./pages/competition-detail/competition-detail.component').then(
        (m) => m.CompetitionDetailComponent,
      ),
  },
  {
    path: 'povijest',
    loadComponent: () =>
      import('./pages/history/history.component').then((m) => m.HistoryComponent),
  },
  {
    path: 'prijava',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin/admin.component').then((m) => m.AdminComponent),
  },
  {
    path: 'sudac',
    canActivate: [judgeGuard],
    loadComponent: () =>
      import('./pages/judge/judge.component').then((m) => m.JudgeComponent),
  },
  { path: '**', redirectTo: '' },
];
