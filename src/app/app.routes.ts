import { Routes } from '@angular/router';
import { OauthSuccessComponent } from './pages/oauth-success/oauth-success.component';
import { authGuard } from './core/guards/auth.guard';
import { rootRedirectGuard } from './core/guards/root-redirect.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [rootRedirectGuard],
    loadComponent: () =>
      import('./landing/landing.component')
        .then((m) => m.LandingComponent),
  },

  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login.component')
        .then((m) => m.LoginComponent),
  },

  {
    path: 'register',
    loadComponent: () =>
      import('./auth/register/register.component')
        .then((m) => m.RegisterComponent),
  },

  {
    path: 'oauth-success',
    component: OauthSuccessComponent,
  },

  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./dashboard/dashboard.component')
        .then((m) => m.DashboardComponent),
  },
];
