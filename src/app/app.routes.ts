import { Routes } from '@angular/router';
import { LoginPageComponent } from './features/login/login-page.component';
import { authGuard } from './core/guards/auth.guard';
import { loginRedirectGuard } from './core/guards/login-redirect.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginPageComponent,
    canActivate: [loginRedirectGuard],
  },
  {
    path: 'dashboard',
    loadComponent: async () => {
      const dashboardPage =
        await import('./features/dashboard/dashboard-page.component');
      return dashboardPage.DashboardPageComponent;
    },
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
];
