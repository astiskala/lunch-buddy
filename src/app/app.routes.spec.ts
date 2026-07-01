import { routes } from './app.routes';
import { LoginPageComponent } from './features/login/login-page.component';
import { DashboardPageComponent } from './features/dashboard/dashboard-page.component';
import { authGuard } from './core/guards/auth.guard';
import { loginRedirectGuard } from './core/guards/login-redirect.guard';

describe('App Routes', () => {
  it('wires login route to the login page with redirect guard', () => {
    const loginRoute = routes.find(route => route.path === 'login');
    expect(loginRoute).toBeDefined();
    expect(loginRoute?.component).toBe(LoginPageComponent);
    expect(loginRoute?.canActivate).toEqual([loginRedirectGuard]);
  });

  it('lazy-loads dashboard route behind the auth guard', () => {
    const dashboardRoute = routes.find(route => route.path === 'dashboard');
    expect(dashboardRoute).toBeDefined();
    expect(typeof dashboardRoute?.loadComponent).toBe('function');
    expect(dashboardRoute?.canActivate).toContain(authGuard);
  });

  it('resolves the dashboard lazy-load component', async () => {
    const dashboardRoute = routes.find(route => route.path === 'dashboard');
    expect(dashboardRoute?.loadComponent).toBeDefined();

    const loadComponent = dashboardRoute?.loadComponent;
    expect(loadComponent).toBeDefined();
    if (!loadComponent) {
      throw new Error('Expected dashboard loadComponent to exist');
    }

    const component = await loadComponent();
    expect(component).toBe(DashboardPageComponent);
  });

  it('redirects the empty path to the dashboard', () => {
    const redirectRoute = routes.find(route => route.path === '');
    expect(redirectRoute).toBeDefined();
    expect(redirectRoute?.redirectTo).toBe('/dashboard');
    expect(redirectRoute?.pathMatch).toBe('full');
  });
});
