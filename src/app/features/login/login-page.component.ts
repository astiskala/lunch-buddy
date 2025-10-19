import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LoggerService } from '../../core/services/logger.service';

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

  protected readonly apiKey = signal('');
  protected readonly errorMessage = signal('');
  protected readonly isSubmitting = signal(false);

  protected async onSubmit(): Promise<void> {
    if (!this.apiKey().trim()) {
      this.errorMessage.set('Please enter your API key');
      return;
    }

    // Basic validation - API keys are typically alphanumeric
    if (this.apiKey().length < 20 || !/^[a-zA-Z0-9]+$/.test(this.apiKey())) {
      this.errorMessage.set('API key appears to be invalid');
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    try {
      // Store the API key (trimmed)
      await this.authService.setApiKey(this.apiKey().trim());

      // Navigate to dashboard
      await this.router.navigate(['/']);
    } catch (error) {
      this.logger.error('LoginPageComponent: failed to persist API key', error);
      this.errorMessage.set('We could not save your API key. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected onApiKeyChange(value: string): void {
    this.apiKey.set(value);
    this.errorMessage.set('');
  }
}
