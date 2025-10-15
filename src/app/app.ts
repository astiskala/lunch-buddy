import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly title = signal('Lunch Buddy');

  constructor() {
    void this.setupAuthNavigation();
  }

  private async setupAuthNavigation(): Promise<void> {
    let isDestroyed = false;
    let subscription: import('rxjs').Subscription | null = null;

    this.destroyRef.onDestroy(() => {
      isDestroyed = true;
      subscription?.unsubscribe();
    });

    try {
      await this.authService.ready();
    } catch (error) {
      console.error('App: failed to determine auth state during startup', error);
    }

    if (isDestroyed) {
      return;
    }

    this.ensureRouteForAuthState(this.router.url, { replaceUrl: true });

    subscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.ensureRouteForAuthState(event.urlAfterRedirects, { replaceUrl: false });
      });
  }

  private ensureRouteForAuthState(url: string, options: { replaceUrl: boolean }): void {
    const hasKey = this.authService.hasApiKey();

    if (!hasKey && !this.isLoginUrl(url)) {
      void this.router.navigateByUrl('/login', { replaceUrl: options.replaceUrl });
      return;
    }

    if (hasKey && this.isLoginUrl(url)) {
      void this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    }
  }

  private isLoginUrl(url: string): boolean {
    return url === '/login' || url.startsWith('/login?');
  }
}
