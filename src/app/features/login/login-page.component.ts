import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LoggerService } from '../../core/services/logger.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NgOptimizedImage],
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);

  private static readonly MIN_API_KEY_LENGTH = 20;
  private static readonly MIN_MOCK_API_KEY_LENGTH = 11;
  private static readonly MOCK_API_HOST = 'alpha.lunchmoney.dev';
  private static readonly LOCAL_API_HOSTS = ['localhost', '127.0.0.1'];

  protected readonly apiKey = signal(this.authService.getApiKey() ?? '');
  protected readonly errorMessage = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly isApiKeyValid = computed(() => {
    const value = this.apiKey().trim();
    if (!value) {
      return false;
    }

    if (this.isMockApiBase()) {
      return (
        value.length >= LoginPageComponent.MIN_MOCK_API_KEY_LENGTH &&
        !/\s/.test(value)
      );
    }

    return (
      value.length >= LoginPageComponent.MIN_API_KEY_LENGTH &&
      /^[a-zA-Z0-9]+$/.test(value)
    );
  });
  protected readonly canSubmit = computed(
    () => this.isApiKeyValid() && !this.isSubmitting()
  );

  protected async onSubmit(): Promise<void> {
    const trimmedApiKey = this.apiKey().trim();
    if (!trimmedApiKey) {
      this.errorMessage.set('Please enter your API key');
      return;
    }

    // Basic validation - API keys are typically alphanumeric
    if (!this.isApiKeyValid()) {
      this.errorMessage.set('API key appears to be invalid');
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    try {
      // Store the API key (trimmed)
      this.authService.setApiKey(trimmedApiKey);

      // Navigate to dashboard
      await this.router.navigate(['/']);
    } catch (error: unknown) {
      this.logger.error('LoginPageComponent: failed to persist API key', error);
      this.errorMessage.set(
        'We could not save your API key. Please try again.'
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected onApiKeyChange(value: string): void {
    this.apiKey.set(value);
    this.errorMessage.set('');
  }

  private isMockApiBase(): boolean {
    const apiBase = environment.lunchmoneyApiBase;
    if (apiBase.includes(LoginPageComponent.MOCK_API_HOST)) {
      return true;
    }

    if (apiBase.startsWith('/')) {
      return true;
    }

    return LoginPageComponent.LOCAL_API_HOSTS.some(host =>
      apiBase.includes(host)
    );
  }
}
